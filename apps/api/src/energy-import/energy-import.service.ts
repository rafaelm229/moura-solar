import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { customerScope, documentScope } from '../dossier/dossier-policy';
import { IdentityStore } from '../identity/identity.store';
import type { ContextDto } from '../identity/identity.dto';
import { fail, hash } from '../identity/security';
import type {
  ConfirmEnergyBillImportDto,
  CreateEnergyBillImportDto,
  ExtractionAttemptViewDto,
  ExtractionCandidateViewDto,
  ProviderConfidenceViewDto,
  EnergyBillImportLifecycleDto,
  EnergyBillImportReceiptDto,
  EnergyBillImportViewDto,
  ImportMonthDecisionDto,
  ReviewEnergyBillImportDto,
} from './energy-import.dto';

type ReviewRecord = {
  id: string;
  revision: number;
  digest: string;
  decisions: Prisma.JsonValue;
  createdAt: Date;
};

const normalizeMonths = (months: ImportMonthDecisionDto[]) =>
  [...months]
    .map((month) => ({
      referenceMonth: month.referenceMonth,
      decision: month.decision,
      expectedReadingVersion: month.expectedReadingVersion ?? null,
      consumptionKwh: month.consumptionKwh ?? null,
      injectedKwh: month.injectedKwh ?? null,
      billedAmount: month.billedAmount ?? null,
      reason: month.reason?.trim() || null,
      ...(month.evidence && Object.values(month.evidence).some(Boolean)
        ? {
            evidence: Object.fromEntries(
              Object.entries(month.evidence).filter(([, candidateId]) => !!candidateId),
            ),
          }
        : {}),
    }))
    .sort((left, right) => left.referenceMonth.localeCompare(right.referenceMonth));

const toLatestReview = (review: ReviewRecord) => ({
  id: review.id,
  revision: review.revision,
  digest: review.digest,
  months: review.decisions,
  createdAt: review.createdAt.toISOString(),
});

const toView = (record: {
  id: string;
  organizationId: string;
  customerId: string;
  utilityUnitId: string | null;
  opportunityId: string | null;
  documentVersionId: string;
  status: string;
  version: number;
  createdAt: Date;
  appliedAt: Date | null;
}): EnergyBillImportViewDto => ({
  id: record.id,
  organizationId: record.organizationId,
  customerId: record.customerId,
  utilityUnitId: record.utilityUnitId,
  opportunityId: record.opportunityId,
  documentVersionId: record.documentVersionId,
  status: record.status,
  version: record.version,
  createdAt: record.createdAt.toISOString(),
  appliedAt: record.appliedAt?.toISOString() ?? null,
});

@Injectable()
export class EnergyImportService {
  constructor(private readonly store: IdentityStore) {}

  async create(
    actor: ContextDto,
    customerId: string,
    dto: CreateEnergyBillImportDto,
    idempotencyKey: string,
    traceId: string,
  ): Promise<EnergyBillImportViewDto> {
    const result = await this.store.command(
      actor,
      idempotencyKey,
      { customerId, ...dto },
      'energy_imports:create',
      async (tx) => {
        await this.store.authorize(tx, actor, 'customers:read', false);
        await this.store.authorize(tx, actor, 'documents:read', false);
        const customer = await tx.customer.findFirst({
          where: { id: customerId, AND: [customerScope(actor, 'customers:read')] },
          select: { id: true },
        });
        if (!customer) fail('CUSTOMER_NOT_FOUND', 'Cliente não encontrado.', 404);

        const documentVersion = await tx.dossierDocumentVersion.findFirst({
          where: {
            id: dto.documentVersionId,
            document: {
              customerId,
              status: 'ACTIVE',
              AND: [documentScope(actor, 'documents:read')],
            },
          },
          select: {
            id: true,
            sha256: true,
            persistenceState: true,
            storedObject: { select: { verified: true, scanResult: true } },
          },
        });
        if (!documentVersion)
          fail('DOCUMENT_NOT_FOUND', 'Documento não encontrado neste contexto.', 404);
        if (
          documentVersion.persistenceState !== 'READY' ||
          !documentVersion.storedObject?.verified ||
          documentVersion.storedObject.scanResult !== 'CLEAN'
        )
          fail('DOCUMENT_NOT_READY', 'Aguarde o documento ficar disponível no dossiê.', 422);

        if (dto.utilityUnitId) {
          await this.store.authorize(tx, actor, 'consumer_units:read', false);
          const utilityUnit = await tx.utilityUnit.findFirst({
            where: {
              id: dto.utilityUnitId,
              organizationId: actor.organizationId,
              customerId,
            },
            select: { id: true },
          });
          if (!utilityUnit)
            fail(
              'UTILITY_UNIT_NOT_FOUND',
              'Unidade consumidora não encontrada neste cliente.',
              404,
            );
        }

        if (dto.opportunityId) {
          await this.store.authorize(tx, actor, 'opportunities:read', false);
          const organizationRead = actor.grants.some(
            (grant) => grant.permission === 'opportunities:read' && grant.scope === 'organization',
          );
          const ownRead = actor.grants.some(
            (grant) => grant.permission === 'opportunities:read' && grant.scope === 'own',
          );
          if (!organizationRead && !ownRead)
            fail('ACCESS_DENIED', 'Você não pode vincular esta oportunidade.', 403);
          const opportunity = await tx.opportunity.findFirst({
            where: {
              id: dto.opportunityId,
              organizationId: actor.organizationId,
              customerId,
              ...(organizationRead ? {} : { ownerUserId: actor.userId }),
            },
            select: { id: true, utilityUnitId: true },
          });
          if (!opportunity)
            fail('OPPORTUNITY_NOT_FOUND', 'Oportunidade não encontrada neste cliente.', 404);
          if (
            dto.utilityUnitId &&
            opportunity.utilityUnitId &&
            opportunity.utilityUnitId !== dto.utilityUnitId
          )
            fail(
              'OPPORTUNITY_UTILITY_UNIT_MISMATCH',
              'A oportunidade já está vinculada a outra unidade consumidora.',
              409,
            );
        }

        const duplicate = await tx.energyBillImport.findFirst({
          where: {
            organizationId: actor.organizationId,
            customerId,
            documentVersion: { sha256: documentVersion.sha256 },
          },
          orderBy: { createdAt: 'asc' },
          select: { id: true, status: true },
        });
        if (duplicate)
          fail(
            'DUPLICATE_DOCUMENT',
            'Esta conta já foi importada. Abra a importação existente para continuar.',
            409,
            { existingImportId: duplicate.id, status: duplicate.status },
          );

        const record = await tx.energyBillImport.create({
          data: {
            organizationId: actor.organizationId,
            customerId,
            utilityUnitId: dto.utilityUnitId,
            opportunityId: dto.opportunityId,
            documentVersionId: dto.documentVersionId,
            status: 'QUEUED',
            version: 1,
            createdById: actor.userId,
          },
        });
        await tx.importOutbox.create({
          data: {
            organizationId: actor.organizationId,
            importId: record.id,
            eventType: 'ENERGY_BILL_IMPORT_QUEUED',
            correlationId: traceId,
            dedupeKey: `energy-bill-import:${record.id}:queued`,
            payload: { importId: record.id, documentVersionId: record.documentVersionId },
          },
        });
        await this.store.audit(tx, 'ENERGY_BILL_IMPORT_QUEUED', actor, record.id, traceId);
        return { ...toView(record) } as unknown as Prisma.InputJsonObject;
      },
    );
    return result as unknown as EnergyBillImportViewDto;
  }

  async get(actor: ContextDto, importId: string): Promise<EnergyBillImportViewDto> {
    return this.store.transaction(async (tx) => {
      await this.store.authorize(tx, actor, 'energy_imports:read');
      await this.store.authorize(tx, actor, 'customers:read', false);
      await this.store.authorize(tx, actor, 'documents:read', false);
      const record = await tx.energyBillImport.findFirst({
        where: {
          id: importId,
          organizationId: actor.organizationId,
          customer: { AND: [customerScope(actor, 'customers:read')] },
          documentVersion: {
            document: { AND: [documentScope(actor, 'documents:read')] },
          },
        },
        include: {
          reviews: { orderBy: { revision: 'desc' }, take: 1 },
          application: true,
          extractionAttempts: { orderBy: { attemptNumber: 'desc' } },
          candidates: {
            where: { attemptId: { not: null } },
            orderBy: { createdAt: 'asc' },
          },
        },
      });
      if (!record) fail('ENERGY_IMPORT_NOT_FOUND', 'Importação não encontrada.', 404);
      const view = toView(record);
      if (record.reviews[0]) view.latestReview = toLatestReview(record.reviews[0]);
      if (record.application)
        view.applicationReceipt = record.application.receipt as Record<string, unknown>;
      view.attempts = record.extractionAttempts.map((attempt): ExtractionAttemptViewDto => ({
        id: attempt.id,
        attemptNumber: attempt.attemptNumber,
        status: attempt.status,
        adapterName: attempt.adapterName,
        modelName: attempt.modelName,
        modelVersion: attempt.modelVersion,
        externalOperationId: attempt.externalOperationId,
        errorCode: attempt.errorCode,
        retryable: attempt.retryable,
        startedAt: attempt.startedAt.toISOString(),
        finishedAt: attempt.finishedAt?.toISOString() ?? null,
        chargedPages: attempt.chargedPages,
        estimatedCost: attempt.estimatedCost?.toString() ?? null,
        actualCost: attempt.actualCost?.toString() ?? null,
        currency: attempt.currency,
      }));
      view.candidates = record.candidates.map((candidate): ExtractionCandidateViewDto => ({
        id: candidate.id,
        attemptId: candidate.attemptId!,
        field: candidate.field,
        rawValue: candidate.rawValue,
        normalizedValue: candidate.normalizedValue,
        unit: candidate.unit,
        page: candidate.page,
        region: candidate.region as Record<string, unknown> | null,
        providerConfidence: candidate.providerConfidence as ProviderConfidenceViewDto | null,
        qualitySignals: candidate.qualitySignals as Record<string, unknown>,
        systemValidation: candidate.systemValidation as Record<string, unknown>,
      }));
      return view;
    });
  }

  async review(
    actor: ContextDto,
    importId: string,
    dto: ReviewEnergyBillImportDto,
    idempotencyKey: string,
    traceId: string,
  ): Promise<EnergyBillImportViewDto> {
    const result = await this.store.command(
      actor,
      idempotencyKey,
      { importId, ...dto },
      'energy_imports:review',
      async (tx) => {
        const record = await tx.energyBillImport.findFirst({
          where: {
            id: importId,
            organizationId: actor.organizationId,
            customer: { AND: [customerScope(actor, 'customers:read')] },
            documentVersion: {
              document: { AND: [documentScope(actor, 'documents:read')] },
            },
          },
        });
        if (!record) fail('ENERGY_IMPORT_NOT_FOUND', 'Importação não encontrada.', 404);
        if (record.status !== 'QUEUED' && record.status !== 'REVIEW_REQUIRED')
          fail('IMPORT_NOT_REVIEWABLE', 'Esta importação não pode ser revisada neste estado.', 409);
        if (record.version !== dto.expectedVersion)
          fail('CONCURRENT_MODIFICATION', 'A importação mudou. Atualize e revise novamente.', 409);
        let utilityUnit: Awaited<ReturnType<typeof tx.utilityUnit.findFirst>> = null;
        if (record.utilityUnitId) {
          if (dto.newUtilityUnit)
            fail('INVALID_REVIEW', 'A revisão já está vinculada a uma unidade consumidora.', 422);
          utilityUnit = await tx.utilityUnit.findFirst({
            where: {
              id: record.utilityUnitId,
              organizationId: actor.organizationId,
              customerId: record.customerId,
            },
          });
          if (!utilityUnit)
            fail(
              'UTILITY_UNIT_NOT_FOUND',
              'Unidade consumidora não encontrada neste cliente.',
              404,
            );
          await tx.$queryRaw`SELECT "id" FROM "utility_units" WHERE "id" = ${utilityUnit.id}::uuid FOR SHARE`;
        } else {
          await this.store.authorize(tx, actor, 'consumer_units:manage', false);
          if (!dto.newUtilityUnit)
            fail('UTILITY_UNIT_REQUIRED', 'Informe os dados da nova unidade consumidora.', 422);
          if (dto.months.some((month) => month.decision !== 'INSERT'))
            fail(
              'INVALID_REVIEW',
              'Uma unidade nova aceita somente meses com decisão de inclusão.',
              422,
            );
          const distributorName = dto.newUtilityUnit.distributorName.trim();
          const externalCode = dto.newUtilityUnit.externalCode?.trim();
          if (externalCode) {
            const duplicate = await tx.utilityUnit.findFirst({
              where: {
                organizationId: actor.organizationId,
                distributorName,
                externalCode,
                status: 'ACTIVE',
              },
            });
            if (duplicate)
              fail(
                'UTILITY_UNIT_ALREADY_EXISTS',
                'Já existe uma unidade com esse código para a distribuidora.',
                409,
              );
          }
        }

        const months = normalizeMonths(dto.months);
        if (new Set(months.map((month) => month.referenceMonth)).size !== months.length)
          fail('INVALID_REVIEW', 'Cada mês pode aparecer uma única vez na revisão.', 422);
        const evidenceMappings = {
          referenceMonthCandidateId: ['bill.referenceMonth', 'history.referenceMonth'],
          consumptionKwhCandidateId: ['bill.consumptionKwh', 'history.consumptionKwh'],
          injectedKwhCandidateId: ['bill.injectedKwh', 'history.injectedKwh'],
          billedAmountCandidateId: ['bill.billedAmount'],
        } as const;
        const evidenceReferences = months.flatMap((month) =>
          Object.entries(evidenceMappings).flatMap(([key]) => {
            const candidateId = (month.evidence as Record<string, string> | undefined)?.[key];
            return candidateId ? [{ month, key, candidateId }] : [];
          }),
        );
        const evidenceIds = evidenceReferences.map((item) => item.candidateId);
        if (new Set(evidenceIds).size !== evidenceIds.length)
          fail(
            'INVALID_REVIEW_EVIDENCE',
            'Cada candidato pode ser usado uma vez por revisão.',
            422,
          );
        if (evidenceIds.length) {
          const candidates = await tx.extractionCandidate.findMany({
            where: {
              importId,
              id: { in: evidenceIds },
              attemptId: { not: null },
              attempt: { is: { importId } },
            },
            select: { id: true, field: true, normalizedValue: true },
          });
          const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
          for (const evidence of evidenceReferences) {
            const candidate = candidateById.get(evidence.candidateId);
            const expectedFields = evidenceMappings[evidence.key as keyof typeof evidenceMappings];
            if (
              !candidate ||
              !(expectedFields as readonly string[]).includes(candidate.field) ||
              !candidate.normalizedValue ||
              (evidence.key === 'referenceMonthCandidateId' &&
                candidate.normalizedValue !== evidence.month.referenceMonth)
            )
              fail(
                'INVALID_REVIEW_EVIDENCE',
                'O candidato selecionado não pertence à importação ou ao campo revisado.',
                422,
              );
          }
        }
        const currentReadings = utilityUnit
          ? await tx.energyReading.findMany({
              where: {
                utilityUnitId: utilityUnit.id,
                organizationId: actor.organizationId,
                status: 'ACTIVE',
                referenceMonth: { in: months.map((month) => month.referenceMonth) },
              },
            })
          : [];
        const activeByMonth = new Map(
          currentReadings.map((reading) => [reading.referenceMonth, reading]),
        );
        const readingVersions: Record<string, number | null> = {};
        const historicalReadings = utilityUnit
          ? await tx.energyReading.findMany({
              where: {
                utilityUnitId: utilityUnit.id,
                organizationId: actor.organizationId,
                referenceMonth: { in: months.map((month) => month.referenceMonth) },
              },
              select: { referenceMonth: true, version: true },
            })
          : [];
        const latestVersions: Record<string, number | null> = {};
        for (const reading of historicalReadings)
          latestVersions[reading.referenceMonth] = Math.max(
            latestVersions[reading.referenceMonth] ?? 0,
            reading.version,
          );

        for (const month of months) {
          const active = activeByMonth.get(month.referenceMonth);
          readingVersions[month.referenceMonth] = active?.version ?? null;
          if (!utilityUnit && (month.expectedReadingVersion != null || !month.consumptionKwh))
            fail(
              'UNRESOLVED_CONFLICT',
              'Uma unidade nova exige consumo informado em cada mês incluído.',
              422,
            );
          if (month.decision === 'INSERT') {
            if (active || month.expectedReadingVersion != null || !month.consumptionKwh)
              fail(
                'UNRESOLVED_CONFLICT',
                'Novo mês exige ausência de leitura e consumo informado.',
                422,
              );
          } else if (month.decision === 'REPLACE') {
            if (
              !active ||
              month.expectedReadingVersion !== active.version ||
              !month.consumptionKwh ||
              !month.reason
            )
              fail(
                'UNRESOLVED_CONFLICT',
                'Substituição exige leitura atual, versão e justificativa.',
                422,
              );
          } else if (!active || month.expectedReadingVersion !== active.version) {
            fail(
              'UNRESOLVED_CONFLICT',
              'Manter exige uma leitura atual e versão correspondente.',
              422,
            );
          }
        }

        const decisions = {
          source: 'MANUAL',
          months,
          ...(dto.newUtilityUnit
            ? {
                newUtilityUnit: {
                  distributorName: dto.newUtilityUnit.distributorName.trim(),
                  externalCode: dto.newUtilityUnit.externalCode?.trim() || null,
                  consumerClass: dto.newUtilityUnit.consumerClass.trim(),
                  tariffMode: dto.newUtilityUnit.tariffMode.trim(),
                  connectionType: dto.newUtilityUnit.connectionType.trim(),
                  voltage: dto.newUtilityUnit.voltage.trim(),
                },
              }
            : {}),
        } satisfies Prisma.InputJsonObject;
        const baseVersions = {
          utilityUnitVersion: utilityUnit?.version ?? null,
          readings: readingVersions,
          latestVersions,
        } satisfies Prisma.InputJsonObject;
        const digest = hash(
          JSON.stringify({ utilityUnitId: utilityUnit?.id ?? null, decisions, baseVersions }),
        );
        const revision =
          (await tx.importReview.aggregate({ where: { importId }, _max: { revision: true } }))._max
            .revision ?? 0;
        const nextRevision = revision + 1;
        const createdReview = await tx.importReview.create({
          data: {
            organizationId: actor.organizationId,
            importId,
            revision: nextRevision,
            reviewedById: actor.userId,
            digest,
            decisions,
            baseVersions,
          },
        });
        const candidateRows = months.flatMap((month) =>
          [
            ['bill.consumptionKwh', month.consumptionKwh, 'kWh'],
            ['bill.injectedKwh', month.injectedKwh, 'kWh'],
            ['bill.billedAmount', month.billedAmount, 'BRL'],
          ]
            .filter((entry): entry is [string, string, string] => typeof entry[1] === 'string')
            .map(([field, value, unit]) => ({
              importId,
              source: 'MANUAL',
              field: `${field}:${month.referenceMonth}`,
              rawValue: value,
              normalizedValue: value,
              unit,
              qualitySignals: { source: 'MANUAL_ENTRY' },
              systemValidation: { valid: true },
            })),
        );
        if (candidateRows.length) await tx.extractionCandidate.createMany({ data: candidateRows });

        const updated = await tx.energyBillImport.updateMany({
          where: {
            id: importId,
            organizationId: actor.organizationId,
            version: dto.expectedVersion,
            status: record.status,
          },
          data: { status: 'REVIEW_REQUIRED', version: { increment: 1 } },
        });
        if (updated.count !== 1)
          fail('CONCURRENT_MODIFICATION', 'A importação mudou. Atualize e revise novamente.', 409);
        await this.store.audit(tx, 'ENERGY_BILL_IMPORT_REVIEWED', actor, importId, traceId);
        return {
          ...toView({ ...record, status: 'REVIEW_REQUIRED', version: record.version + 1 }),
          latestReview: toLatestReview(createdReview),
        } as unknown as Prisma.InputJsonObject;
      },
    );
    return result as unknown as EnergyBillImportViewDto;
  }

  async cancel(
    actor: ContextDto,
    importId: string,
    dto: EnergyBillImportLifecycleDto,
    idempotencyKey: string,
    traceId: string,
  ): Promise<EnergyBillImportViewDto> {
    const result = await this.store.command(
      actor,
      idempotencyKey,
      { importId, ...dto },
      'energy_imports:cancel',
      async (tx) => {
        await this.store.authorize(tx, actor, 'customers:read', false);
        await this.store.authorize(tx, actor, 'documents:read', false);
        const record = await tx.energyBillImport.findFirst({
          where: {
            id: importId,
            organizationId: actor.organizationId,
            customer: { AND: [customerScope(actor, 'customers:read')] },
            documentVersion: { document: { AND: [documentScope(actor, 'documents:read')] } },
          },
        });
        if (!record) fail('ENERGY_IMPORT_NOT_FOUND', 'Importação não encontrada.', 404);
        if (record.version !== dto.expectedVersion)
          fail('CONCURRENT_MODIFICATION', 'A importação mudou. Atualize antes de cancelar.', 409);
        if (!['QUEUED', 'REVIEW_REQUIRED', 'FAILED'].includes(record.status))
          fail(
            'IMPORT_NOT_CANCELLABLE',
            'O estado atual da importação não pode ser cancelado.',
            409,
          );

        const nextVersion = record.version + 1;
        const updated = await tx.energyBillImport.updateMany({
          where: { id: record.id, version: dto.expectedVersion },
          data: { status: 'CANCELED', cancellationRequestedAt: new Date(), version: nextVersion },
        });
        if (updated.count !== 1)
          fail('CONCURRENT_MODIFICATION', 'A importação mudou. Atualize antes de cancelar.', 409);
        await tx.importOutbox.updateMany({
          where: { importId, status: { in: ['PENDING', 'PROCESSING'] } },
          data: { status: 'CANCELED', leaseOwner: null, leaseUntil: null },
        });
        await tx.extractionAttempt.updateMany({
          where: { importId, status: { in: ['CLAIMED', 'SUBMITTING', 'SUBMITTED'] } },
          data: { status: 'CANCELED', retryable: false, finishedAt: new Date() },
        });
        await tx.energyImportTransition.create({
          data: {
            organizationId: actor.organizationId,
            importId,
            actorId: actor.userId,
            action: 'CANCEL',
            fromStatus: record.status,
            toStatus: 'CANCELED',
            version: nextVersion,
            reason: dto.reason.trim(),
          },
        });
        await this.store.audit(tx, 'ENERGY_BILL_IMPORT_CANCELED', actor, importId, traceId);
        return {
          ...toView({ ...record, status: 'CANCELED', version: nextVersion }),
        } as unknown as Prisma.InputJsonObject;
      },
    );
    return result as unknown as EnergyBillImportViewDto;
  }

  async retry(
    actor: ContextDto,
    importId: string,
    dto: EnergyBillImportLifecycleDto,
    idempotencyKey: string,
    traceId: string,
  ): Promise<EnergyBillImportViewDto> {
    const result = await this.store.command(
      actor,
      idempotencyKey,
      { importId, ...dto },
      'energy_imports:retry',
      async (tx) => {
        await this.store.authorize(tx, actor, 'customers:read', false);
        await this.store.authorize(tx, actor, 'documents:read', false);
        const record = await tx.energyBillImport.findFirst({
          where: {
            id: importId,
            organizationId: actor.organizationId,
            customer: { AND: [customerScope(actor, 'customers:read')] },
            documentVersion: { document: { AND: [documentScope(actor, 'documents:read')] } },
          },
          include: {
            documentVersion: {
              select: {
                id: true,
                persistenceState: true,
                storedObject: { select: { verified: true, scanResult: true } },
              },
            },
          },
        });
        if (!record) fail('ENERGY_IMPORT_NOT_FOUND', 'Importação não encontrada.', 404);
        if (record.version !== dto.expectedVersion)
          fail('CONCURRENT_MODIFICATION', 'A importação mudou. Atualize antes de repetir.', 409);
        if (record.status !== 'FAILED')
          fail('IMPORT_NOT_RETRYABLE', 'Somente uma importação FAILED pode ser repetida.', 409);
        if (
          record.documentVersion.persistenceState !== 'READY' ||
          !record.documentVersion.storedObject?.verified ||
          record.documentVersion.storedObject.scanResult !== 'CLEAN'
        )
          fail('DOCUMENT_NOT_READY', 'O documento original não está mais disponível.', 422);

        const nextVersion = record.version + 1;
        const updated = await tx.energyBillImport.updateMany({
          where: { id: record.id, version: dto.expectedVersion, status: 'FAILED' },
          data: { status: 'QUEUED', cancellationRequestedAt: null, version: nextVersion },
        });
        if (updated.count !== 1)
          fail('CONCURRENT_MODIFICATION', 'A importação mudou. Atualize antes de repetir.', 409);
        await tx.importOutbox.create({
          data: {
            organizationId: actor.organizationId,
            importId,
            eventType: 'ENERGY_BILL_IMPORT_QUEUED',
            correlationId: traceId,
            dedupeKey: `energy-bill-import:${importId}:retry:${nextVersion}`,
            payload: { importId, documentVersionId: record.documentVersionId },
          },
        });
        await tx.energyImportTransition.create({
          data: {
            organizationId: actor.organizationId,
            importId,
            actorId: actor.userId,
            action: 'RETRY',
            fromStatus: 'FAILED',
            toStatus: 'QUEUED',
            version: nextVersion,
            reason: dto.reason.trim(),
          },
        });
        await this.store.audit(tx, 'ENERGY_BILL_IMPORT_RETRIED', actor, importId, traceId);
        return {
          ...toView({ ...record, status: 'QUEUED', version: nextVersion }),
        } as unknown as Prisma.InputJsonObject;
      },
    );
    return result as unknown as EnergyBillImportViewDto;
  }

  async confirm(
    actor: ContextDto,
    importId: string,
    dto: ConfirmEnergyBillImportDto,
    idempotencyKey: string,
    traceId: string,
  ): Promise<EnergyBillImportReceiptDto> {
    const result = await this.store.command(
      actor,
      idempotencyKey,
      { importId, ...dto },
      'energy_imports:confirm',
      async (tx) => {
        await this.store.authorize(tx, actor, 'customers:read', false);
        await this.store.authorize(tx, actor, 'documents:read', false);
        const record = await tx.energyBillImport.findFirst({
          where: {
            id: importId,
            organizationId: actor.organizationId,
            customer: { AND: [customerScope(actor, 'customers:read')] },
            documentVersion: {
              document: { AND: [documentScope(actor, 'documents:read')] },
            },
          },
        });
        if (!record) fail('ENERGY_IMPORT_NOT_FOUND', 'Importação não encontrada.', 404);

        const priorApplication = await tx.importApplication.findUnique({
          where: { importId },
        });
        if (priorApplication) {
          if (
            priorApplication.reviewId === dto.reviewId &&
            priorApplication.payloadHash === dto.reviewDigest
          )
            return priorApplication.receipt as Prisma.InputJsonObject;
          fail('IMPORT_ALREADY_APPLIED', 'Esta importação já foi aplicada com outra revisão.', 409);
        }
        if (record.status !== 'REVIEW_REQUIRED' || record.version !== dto.expectedVersion)
          fail('CONCURRENT_MODIFICATION', 'A importação mudou. Atualize antes de confirmar.', 409);

        const review = await tx.importReview.findFirst({
          where: {
            id: dto.reviewId,
            importId,
            organizationId: actor.organizationId,
          },
        });
        if (!review || review.digest !== dto.reviewDigest)
          fail(
            'REVIEW_DIGEST_MISMATCH',
            'A revisão mudou. Reabra a revisão antes de confirmar.',
            409,
          );

        const documentVersion = await tx.dossierDocumentVersion.findFirst({
          where: {
            id: record.documentVersionId,
            persistenceState: 'READY',
            document: {
              customerId: record.customerId,
              status: 'ACTIVE',
              AND: [documentScope(actor, 'documents:read')],
            },
          },
          select: {
            id: true,
            documentId: true,
            storedObject: { select: { verified: true, scanResult: true } },
          },
        });
        if (
          !documentVersion ||
          !documentVersion.storedObject?.verified ||
          documentVersion.storedObject.scanResult !== 'CLEAN'
        )
          fail('DOCUMENT_NOT_READY', 'O documento não está mais disponível para confirmação.', 422);

        const decisions = review.decisions as {
          source: string;
          months: ReturnType<typeof normalizeMonths>;
          newUtilityUnit?: {
            distributorName: string;
            externalCode: string | null;
            consumerClass: string;
            tariffMode: string;
            connectionType: string;
            voltage: string;
          };
        };
        if (decisions.source !== 'MANUAL' || !Array.isArray(decisions.months))
          fail('INVALID_REVIEW', 'Formato de revisão inválido.', 409);
        let utilityUnitId = record.utilityUnitId;
        if (!utilityUnitId) {
          const details = decisions.newUtilityUnit;
          if (!details)
            fail('UTILITY_UNIT_REQUIRED', 'A revisão não contém os dados da nova UC.', 409);
          await this.store.authorize(tx, actor, 'consumer_units:manage', false);
          if (decisions.months.some((month) => month.decision !== 'INSERT'))
            fail('INVALID_REVIEW', 'Uma unidade nova aceita somente meses incluídos.', 409);
          if (details.externalCode) {
            const duplicate = await tx.utilityUnit.findFirst({
              where: {
                organizationId: actor.organizationId,
                distributorName: details.distributorName,
                externalCode: details.externalCode,
                status: 'ACTIVE',
              },
            });
            if (duplicate)
              fail(
                'UTILITY_UNIT_ALREADY_EXISTS',
                'Já existe uma unidade com esse código para a distribuidora.',
                409,
              );
          }
          const createdUnit = await tx.utilityUnit.create({
            data: {
              organizationId: actor.organizationId,
              customerId: record.customerId,
              distributorName: details.distributorName,
              externalCode: details.externalCode,
              consumerClass: details.consumerClass,
              tariffMode: details.tariffMode,
              connectionType: details.connectionType,
              voltage: details.voltage,
              status: 'ACTIVE',
              version: 1,
            },
          });
          utilityUnitId = createdUnit.id;
          await this.store.audit(
            tx,
            'commercial.utility_unit_created',
            actor,
            createdUnit.id,
            traceId,
          );
        } else if (decisions.newUtilityUnit) {
          fail('INVALID_REVIEW', 'A revisão não pode criar outra unidade consumidora.', 409);
        }
        const utilityUnit = await tx.utilityUnit.findFirst({
          where: {
            id: utilityUnitId,
            organizationId: actor.organizationId,
            customerId: record.customerId,
          },
        });
        if (!utilityUnit)
          fail('UTILITY_UNIT_NOT_FOUND', 'Unidade consumidora não encontrada neste cliente.', 404);
        await tx.$queryRaw`SELECT "id" FROM "utility_units" WHERE "id" = ${utilityUnit.id}::uuid FOR UPDATE`;

        const baseVersions = review.baseVersions as {
          utilityUnitVersion: number | null;
          readings: Record<string, number | null>;
          latestVersions: Record<string, number | null>;
        };
        if (
          baseVersions.utilityUnitVersion != null &&
          utilityUnit.version !== baseVersions.utilityUnitVersion
        )
          fail('CONCURRENT_MODIFICATION', 'Os dados da unidade mudaram desde a revisão.', 409);

        const monthNames = decisions.months.map((month) => month.referenceMonth);
        const activeReadings = await tx.energyReading.findMany({
          where: {
            utilityUnitId: utilityUnit.id,
            organizationId: actor.organizationId,
            referenceMonth: { in: monthNames },
            status: 'ACTIVE',
          },
        });
        const activeByMonth = new Map(
          activeReadings.map((reading) => [reading.referenceMonth, reading]),
        );
        const historicalReadings = await tx.energyReading.findMany({
          where: {
            utilityUnitId: utilityUnit.id,
            organizationId: actor.organizationId,
            referenceMonth: { in: monthNames },
          },
          select: { referenceMonth: true, version: true },
        });
        const latestVersionByMonth = new Map<string, number>();
        for (const reading of historicalReadings)
          latestVersionByMonth.set(
            reading.referenceMonth,
            Math.max(latestVersionByMonth.get(reading.referenceMonth) ?? 0, reading.version),
          );
        const readingChanges: Array<{
          referenceMonth: string;
          readingId: string;
          version: number;
        }> = [];

        for (const month of decisions.months) {
          const current = activeByMonth.get(month.referenceMonth);
          const expectedBase = baseVersions.readings[month.referenceMonth] ?? null;
          const expectedLatest = baseVersions.latestVersions[month.referenceMonth] ?? null;
          const expectedDecision = month.expectedReadingVersion ?? null;
          if (
            (current?.version ?? null) !== expectedBase ||
            (latestVersionByMonth.get(month.referenceMonth) ?? null) !== expectedLatest ||
            expectedDecision !== expectedBase
          )
            fail(
              'CONCURRENT_MODIFICATION',
              `A leitura de ${month.referenceMonth} mudou após a revisão.`,
              409,
            );
          if (month.decision === 'KEEP') continue;
          if (!month.consumptionKwh)
            fail('INVALID_REVIEW', 'Informe o consumo validado para cada mês aplicado.', 422);
          if (month.decision === 'INSERT' && current)
            fail(
              'CONCURRENT_MODIFICATION',
              `Já existe uma leitura para ${month.referenceMonth}.`,
              409,
            );
          if (month.decision === 'REPLACE' && (!current || !month.reason))
            fail(
              'CONCURRENT_MODIFICATION',
              `A leitura de ${month.referenceMonth} não pode ser substituída.`,
              409,
            );

          let version = (latestVersionByMonth.get(month.referenceMonth) ?? 0) + 1;
          let previousValues: Prisma.InputJsonObject | undefined;
          if (current) {
            const superseded = await tx.energyReading.updateMany({
              where: {
                id: current.id,
                utilityUnitId: utilityUnit.id,
                status: 'ACTIVE',
                version: current.version,
              },
              data: { status: 'SUPERSEDED' },
            });
            if (superseded.count !== 1)
              fail('CONCURRENT_MODIFICATION', `A leitura de ${month.referenceMonth} mudou.`, 409);
            previousValues = {
              consumptionKwh: current.consumptionKwh.toString(),
              injectedKwh: current.injectedKwh?.toString() ?? null,
              billedAmount: current.billedAmount?.toString() ?? null,
              version: current.version,
            };
          }

          const reading = await tx.energyReading.create({
            data: {
              organizationId: actor.organizationId,
              utilityUnitId: utilityUnit.id,
              referenceMonth: month.referenceMonth,
              consumptionKwh: new Prisma.Decimal(month.consumptionKwh),
              injectedKwh: month.injectedKwh == null ? null : new Prisma.Decimal(month.injectedKwh),
              billedAmount:
                month.billedAmount == null ? null : new Prisma.Decimal(month.billedAmount),
              source: 'IMPORT',
              status: 'ACTIVE',
              version,
              correctionReason: month.decision === 'REPLACE' ? month.reason : null,
              sourceImportId: record.id,
              sourceReviewId: review.id,
            },
          });
          await tx.energyReadingRevision.create({
            data: {
              organizationId: actor.organizationId,
              utilityUnitId: utilityUnit.id,
              readingId: reading.id,
              version,
              source: 'IMPORT',
              sourceImportId: record.id,
              sourceReviewId: review.id,
              documentVersionId: record.documentVersionId,
              authorId: actor.userId,
              previousValues,
              currentValues: {
                consumptionKwh: reading.consumptionKwh.toString(),
                injectedKwh: reading.injectedKwh?.toString() ?? null,
                billedAmount: reading.billedAmount?.toString() ?? null,
              },
              reason: month.reason ?? null,
            },
          });
          await this.store.audit(
            tx,
            'COMMERCIAL_ENERGY_READING_IMPORTED',
            actor,
            reading.id,
            traceId,
          );
          readingChanges.push({
            referenceMonth: month.referenceMonth,
            readingId: reading.id,
            version,
          });
        }

        const existingLinks = await tx.documentUtilityUnitLink.findMany({
          where: { documentId: documentVersion.documentId },
          select: { utilityUnitId: true },
        });
        if (existingLinks.some((link) => link.utilityUnitId !== utilityUnit.id))
          fail(
            'DOCUMENT_LINK_CONFLICT',
            'O documento já está vinculado a outra unidade consumidora.',
            409,
          );
        await tx.documentUtilityUnitLink.createMany({
          data: [{ documentId: documentVersion.documentId, utilityUnitId: utilityUnit.id }],
          skipDuplicates: true,
        });

        const appliedAt = new Date();
        const receipt: Prisma.InputJsonObject = {
          status: 'APPLIED',
          importId: record.id,
          reviewId: review.id,
          reviewDigest: review.digest,
          appliedAt: appliedAt.toISOString(),
          utilityUnitId: utilityUnit.id,
          readingChanges,
          warnings: [],
        };
        const updated = await tx.energyBillImport.updateMany({
          where: {
            id: record.id,
            organizationId: actor.organizationId,
            status: 'REVIEW_REQUIRED',
            version: dto.expectedVersion,
          },
          data: {
            utilityUnitId: utilityUnit.id,
            status: 'APPLIED',
            version: { increment: 1 },
            appliedAt,
          },
        });
        if (updated.count !== 1)
          fail('CONCURRENT_MODIFICATION', 'A importação mudou antes de concluir.', 409);
        await tx.importApplication.create({
          data: {
            organizationId: actor.organizationId,
            importId: record.id,
            reviewId: review.id,
            payloadHash: review.digest,
            idempotencyKey,
            receipt,
            committedAt: appliedAt,
          },
        });
        await tx.importOutbox.create({
          data: {
            organizationId: actor.organizationId,
            importId: record.id,
            eventType: 'ENERGY_BILL_IMPORT_APPLIED',
            correlationId: traceId,
            dedupeKey: `energy-bill-import:${record.id}:applied`,
            payload: { importId: record.id, reviewId: review.id },
          },
        });
        await this.store.audit(tx, 'ENERGY_BILL_IMPORT_APPLIED', actor, record.id, traceId);
        return receipt;
      },
    );

    return result as unknown as EnergyBillImportReceiptDto;
  }
}
