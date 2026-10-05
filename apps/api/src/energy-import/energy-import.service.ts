import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { customerScope, documentScope } from '../dossier/dossier-policy';
import { IdentityStore } from '../identity/identity.store';
import type { ContextDto } from '../identity/identity.dto';
import { fail, hash } from '../identity/security';
import type {
  ConfirmEnergyBillImportDto,
  CreateEnergyBillImportDto,
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
            dedupeKey: `energy-bill-import:${record.id}:queued`,
            payload: { importId: record.id, documentVersionId: record.documentVersionId },
          },
        });
        await this.store.audit(tx, 'ENERGY_BILL_IMPORT_QUEUED', actor, record.id, traceId);
        return { ...toView(record) } as Prisma.InputJsonObject;
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
        },
      });
      if (!record) fail('ENERGY_IMPORT_NOT_FOUND', 'Importação não encontrada.', 404);
      const view = toView(record);
      if (record.reviews[0]) view.latestReview = toLatestReview(record.reviews[0]);
      if (record.application)
        view.applicationReceipt = record.application.receipt as Record<string, unknown>;
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
        if (!record.utilityUnitId)
          fail('UTILITY_UNIT_REQUIRED', 'Selecione uma unidade consumidora antes da revisão.', 422);

        const utilityUnit = await tx.utilityUnit.findFirst({
          where: {
            id: record.utilityUnitId,
            organizationId: actor.organizationId,
            customerId: record.customerId,
          },
        });
        if (!utilityUnit)
          fail('UTILITY_UNIT_NOT_FOUND', 'Unidade consumidora não encontrada neste cliente.', 404);
        await tx.$queryRaw`SELECT "id" FROM "utility_units" WHERE "id" = ${utilityUnit.id}::uuid FOR SHARE`;

        const months = normalizeMonths(dto.months);
        if (new Set(months.map((month) => month.referenceMonth)).size !== months.length)
          fail('INVALID_REVIEW', 'Cada mês pode aparecer uma única vez na revisão.', 422);
        const currentReadings = await tx.energyReading.findMany({
          where: {
            utilityUnitId: utilityUnit.id,
            organizationId: actor.organizationId,
            status: 'ACTIVE',
            referenceMonth: { in: months.map((month) => month.referenceMonth) },
          },
        });
        const activeByMonth = new Map(
          currentReadings.map((reading) => [reading.referenceMonth, reading]),
        );
        const readingVersions: Record<string, number | null> = {};
        const historicalReadings = await tx.energyReading.findMany({
          where: {
            utilityUnitId: utilityUnit.id,
            organizationId: actor.organizationId,
            referenceMonth: { in: months.map((month) => month.referenceMonth) },
          },
          select: { referenceMonth: true, version: true },
        });
        const latestVersions: Record<string, number | null> = {};
        for (const reading of historicalReadings)
          latestVersions[reading.referenceMonth] = Math.max(
            latestVersions[reading.referenceMonth] ?? 0,
            reading.version,
          );

        for (const month of months) {
          const active = activeByMonth.get(month.referenceMonth);
          readingVersions[month.referenceMonth] = active?.version ?? null;
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

        const decisions = { source: 'MANUAL', months } satisfies Prisma.InputJsonObject;
        const baseVersions = {
          utilityUnitVersion: utilityUnit.version,
          readings: readingVersions,
          latestVersions,
        } satisfies Prisma.InputJsonObject;
        const digest = hash(
          JSON.stringify({ utilityUnitId: utilityUnit.id, decisions, baseVersions }),
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
        } as Prisma.InputJsonObject;
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
        } as Prisma.InputJsonObject;
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
        if (!record.utilityUnitId)
          fail(
            'UTILITY_UNIT_REQUIRED',
            'Selecione uma unidade consumidora antes de confirmar.',
            422,
          );

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

        const utilityUnit = await tx.utilityUnit.findFirst({
          where: {
            id: record.utilityUnitId,
            organizationId: actor.organizationId,
            customerId: record.customerId,
          },
        });
        if (!utilityUnit)
          fail('UTILITY_UNIT_NOT_FOUND', 'Unidade consumidora não encontrada neste cliente.', 404);
        await tx.$queryRaw`SELECT "id" FROM "utility_units" WHERE "id" = ${utilityUnit.id}::uuid FOR UPDATE`;

        const decisions = review.decisions as {
          source: string;
          months: ReturnType<typeof normalizeMonths>;
        };
        if (decisions.source !== 'MANUAL' || !Array.isArray(decisions.months))
          fail('INVALID_REVIEW', 'Formato de revisão inválido.', 409);
        const baseVersions = review.baseVersions as {
          utilityUnitVersion: number;
          readings: Record<string, number | null>;
          latestVersions: Record<string, number | null>;
        };
        if (utilityUnit.version !== baseVersions.utilityUnitVersion)
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
          data: { status: 'APPLIED', version: { increment: 1 }, appliedAt },
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
