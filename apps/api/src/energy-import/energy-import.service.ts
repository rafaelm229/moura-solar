import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { customerScope, documentScope } from '../dossier/dossier-policy';
import { IdentityStore } from '../identity/identity.store';
import type { ContextDto } from '../identity/identity.dto';
import { fail } from '../identity/security';
import type { CreateEnergyBillImportDto, EnergyBillImportViewDto } from './energy-import.dto';

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
            select: { id: true },
          });
          if (!opportunity)
            fail('OPPORTUNITY_NOT_FOUND', 'Oportunidade não encontrada neste cliente.', 404);
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
      });
      if (!record) fail('ENERGY_IMPORT_NOT_FOUND', 'Importação não encontrada.', 404);
      return toView(record);
    });
  }
}
