import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  ActivityCanceledEventV1,
  ActivityCompletedEventV1,
  ActivityCreatedEventV1,
  ActivityRescheduledEventV1,
  CustomerArchivedEventV1,
  CustomerCreatedEventV1,
  CustomerRestoredEventV1,
  CustomerUpdatedEventV1,
  OpportunityCreatedEventV1,
  OpportunityLostEventV1,
  OpportunityQualifiedEventV1,
  OpportunityReopenedEventV1,
  OpportunityUpdatedEventV1,
  UtilityUnitCreatedEventV1,
  UtilityUnitUpdatedEventV1,
} from '@moura-solar/contracts';
import { Prisma } from '@prisma/client';
import { IdentityStore } from '../identity/identity.store';
import { canAccess } from '../identity/identity.policy';
import { fail } from '../identity/security';
import type { ContextDto } from '../identity/identity.dto';
import type {
  AddAddressDto,
  AddContactDto,
  CompleteActivityDto,
  CreateAndLinkUtilityUnitDto,
  CreateActivityDto,
  CreateCustomerDto,
  CreateOpportunityDto,
  CreateUtilityUnitDto,
  DuplicateCheckQueryDto,
  DuplicateMatchDto,
  LoseOpportunityDto,
  QualifyOpportunityDto,
  ReopenOpportunityDto,
  RescheduleActivityDto,
  UpdateCustomerDto,
  UpdateOpportunityDto,
  UpdateUtilityUnitDto,
} from './commercial.dto';

function normalizeDigits(value?: string | null): string {
  return value ? value.replace(/\D/g, '') : '';
}

function normalizeEmail(value?: string | null): string {
  return value ? value.trim().toLowerCase() : '';
}

@Injectable()
export class CommercialService {
  constructor(private readonly store: IdentityStore) {}

  private async createUtilityUnitInTransaction(
    tx: Prisma.TransactionClient,
    actor: ContextDto,
    customerId: string,
    dto: CreateUtilityUnitDto,
    traceId: string,
  ) {
    const customer = await tx.customer.findFirst({
      where: { id: customerId, organizationId: actor.organizationId },
    });
    if (!customer) fail('CUSTOMER_NOT_FOUND', 'Cliente não encontrado.', 404);

    if (dto.addressId) {
      const address = await tx.address.findFirst({ where: { id: dto.addressId, customerId } });
      if (!address) fail('ADDRESS_NOT_FOUND', 'Endereço não encontrado para este cliente.', 404);
    }

    const extCode = dto.externalCode?.trim();
    if (extCode) {
      const existing = await tx.utilityUnit.findFirst({
        where: {
          organizationId: actor.organizationId,
          distributorName: dto.distributorName.trim(),
          externalCode: extCode,
          status: 'ACTIVE',
        },
      });
      if (existing) {
        fail(
          'UTILITY_UNIT_ALREADY_EXISTS',
          `Unidade consumidora com código ${extCode} já cadastrada para esta concessionária.`,
          409,
        );
      }
    }

    const unit = await tx.utilityUnit.create({
      data: {
        organizationId: actor.organizationId,
        customerId,
        addressId: dto.addressId || null,
        distributorName: dto.distributorName.trim(),
        externalCode: extCode || null,
        consumerClass: dto.consumerClass || 'RESIDENTIAL',
        tariffMode: dto.tariffMode || 'CONVENTIONAL',
        connectionType: dto.connectionType || 'BIPHASIC',
        voltage: dto.voltage || '220V',
        status: 'ACTIVE',
        version: 1,
      },
    });

    await this.store.audit(tx, 'commercial.utility_unit_created', actor, unit.id, traceId);

    const event: UtilityUnitCreatedEventV1 = {
      eventId: randomUUID(),
      eventType: 'UTILITY_UNIT_CREATED',
      schemaVersion: 1,
      occurredAt: unit.createdAt.toISOString(),
      organizationId: actor.organizationId,
      aggregateId: unit.id,
      producer: 'crm',
      correlationId: traceId,
      payload: {
        utilityUnitId: unit.id,
        customerId: unit.customerId,
        ...(unit.addressId ? { addressId: unit.addressId } : {}),
      },
    };

    await tx.integrationOutbox.create({
      data: {
        id: event.eventId,
        organizationId: event.organizationId,
        eventType: event.eventType,
        schemaVersion: event.schemaVersion,
        aggregateType: 'UtilityUnit',
        aggregateId: event.aggregateId,
        producer: event.producer,
        correlationId: event.correlationId,
        occurredAt: unit.createdAt,
        payload: event.payload,
        dedupeKey: `UTILITY_UNIT_CREATED:${unit.id}`,
      },
    });
    return unit;
  }

  private async assertCanCreateAndLinkUtilityUnit(
    tx: Prisma.TransactionClient,
    actor: ContextDto,
    opportunity: { id: string; organizationId: string; ownerUserId: string },
  ) {
    const owner = await tx.membership.findFirst({
      where: {
        organizationId: actor.organizationId,
        userId: opportunity.ownerUserId,
        status: 'active',
      },
      select: { id: true, teams: { select: { teamId: true } } },
    });
    const resource = {
      organizationId: opportunity.organizationId,
      ownerId: owner?.id,
      teamIds: owner?.teams.map(({ teamId }) => teamId),
    };
    for (const permission of ['consumer_units:manage', 'opportunities:update']) {
      if (!canAccess(actor, permission, resource)) {
        fail(
          'ACCESS_DENIED',
          'Você não tem permissão neste contexto para criar e vincular a UC.',
          403,
        );
      }
    }
  }

  // ---------------------------------------------------------------------------
  // DUPLICATE DETECTION
  // ---------------------------------------------------------------------------

  async checkDuplicates(
    organizationId: string,
    query: DuplicateCheckQueryDto,
  ): Promise<DuplicateMatchDto[]> {
    const matches: DuplicateMatchDto[] = [];
    const normalizedTaxId = normalizeDigits(query.taxId);
    const normalizedMail = normalizeEmail(query.email);
    const normalizedTel = normalizeDigits(query.phone);

    // 1. Strong Match: Tax ID (CPF / CNPJ)
    if (normalizedTaxId && normalizedTaxId.length >= 11) {
      const existing = await this.store.db.customer.findFirst({
        where: {
          organizationId,
          taxId: normalizedTaxId,
          status: 'ACTIVE',
        },
      });
      if (existing) {
        matches.push({
          strength: 'STRONG',
          reason: `Mesmo CPF/CNPJ já cadastrado para ${existing.legalName}`,
          customerId: existing.id,
          customerName: existing.legalName,
          taxId: existing.taxId ?? undefined,
        });
      }
    }

    // 2. Strong Match: E-mail
    if (normalizedMail) {
      const existingContact = await this.store.db.customerContact.findFirst({
        where: {
          customer: { organizationId, status: 'ACTIVE' },
          type: 'EMAIL',
          normalizedValue: normalizedMail,
        },
        include: { customer: true },
      });
      if (existingContact && !matches.some((m) => m.customerId === existingContact.customerId)) {
        matches.push({
          strength: 'STRONG',
          reason: `Mesmo e-mail de contato para ${existingContact.customer.legalName}`,
          customerId: existingContact.customer.id,
          customerName: existingContact.customer.legalName,
          taxId: existingContact.customer.taxId ?? undefined,
        });
      }
    }

    // 3. Strong Match: Utility Unit externalCode
    if (query.externalCode?.trim()) {
      const code = query.externalCode.trim();
      const existingUnit = await this.store.db.utilityUnit.findFirst({
        where: {
          organizationId,
          externalCode: code,
          status: 'ACTIVE',
        },
        include: { customer: true },
      });
      if (existingUnit && !matches.some((m) => m.customerId === existingUnit.customerId)) {
        matches.push({
          strength: 'STRONG',
          reason: `Mesmo código de Unidade Consumidora (${code}) para ${existingUnit.customer.legalName}`,
          customerId: existingUnit.customer.id,
          customerName: existingUnit.customer.legalName,
          taxId: existingUnit.customer.taxId ?? undefined,
        });
      }
    }

    // 4. Moderate Match: Phone
    if (normalizedTel && normalizedTel.length >= 8) {
      const existingPhone = await this.store.db.customerContact.findFirst({
        where: {
          customer: { organizationId, status: 'ACTIVE' },
          type: { in: ['PHONE', 'WHATSAPP'] },
          normalizedValue: { contains: normalizedTel.slice(-8) },
        },
        include: { customer: true },
      });
      if (existingPhone && !matches.some((m) => m.customerId === existingPhone.customerId)) {
        matches.push({
          strength: 'MODERATE',
          reason: `Telefone coincidente com ${existingPhone.customer.legalName}`,
          customerId: existingPhone.customer.id,
          customerName: existingPhone.customer.legalName,
          taxId: existingPhone.customer.taxId ?? undefined,
        });
      }
    }

    // 5. Moderate Match: Name
    if (query.name && query.name.trim().length >= 3) {
      const name = query.name.trim();
      const existingByName = await this.store.db.customer.findFirst({
        where: {
          organizationId,
          status: 'ACTIVE',
          legalName: { contains: name, mode: 'insensitive' },
        },
      });
      if (existingByName && !matches.some((m) => m.customerId === existingByName.id)) {
        matches.push({
          strength: 'MODERATE',
          reason: `Nome similar a ${existingByName.legalName}`,
          customerId: existingByName.id,
          customerName: existingByName.legalName,
          taxId: existingByName.taxId ?? undefined,
        });
      }
    }

    return matches;
  }

  // ---------------------------------------------------------------------------
  // CUSTOMERS
  // ---------------------------------------------------------------------------

  async listCustomers(
    actor: ContextDto,
    params: { search?: string; status?: string; skip?: number; take?: number },
  ) {
    const where: Prisma.CustomerWhereInput = {
      organizationId: actor.organizationId,
    };

    if (params.status && params.status !== 'ALL') {
      where.status = params.status;
    } else if (!params.status) {
      where.status = 'ACTIVE';
    }

    if (params.search?.trim()) {
      const term = params.search.trim();
      where.OR = [
        { legalName: { contains: term, mode: 'insensitive' } },
        { tradeName: { contains: term, mode: 'insensitive' } },
        { taxId: { contains: normalizeDigits(term) } },
        { contacts: { some: { value: { contains: term, mode: 'insensitive' } } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.store.db.customer.findMany({
        where,
        include: {
          contacts: { where: { isPrimary: true }, take: 2 },
          addresses: { where: { isPrimary: true }, take: 1 },
          _count: { select: { opportunities: true, utilityUnits: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: params.skip ?? 0,
        take: params.take ?? 50,
      }),
      this.store.db.customer.count({ where }),
    ]);

    return { items, total };
  }

  async getCustomer(actor: ContextDto, customerId: string) {
    const customer = await this.store.db.customer.findFirst({
      where: { id: customerId, organizationId: actor.organizationId },
      include: {
        contacts: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] },
        addresses: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] },
        utilityUnits: { orderBy: { createdAt: 'desc' } },
        opportunities: {
          orderBy: { createdAt: 'desc' },
          include: {
            owner: { select: { id: true, name: true, email: true } },
            activities: {
              where: { status: 'OPEN' },
              orderBy: { dueAt: 'asc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!customer) fail('CUSTOMER_NOT_FOUND', 'Cliente não encontrado.', 404);
    return customer;
  }

  async createCustomer(actor: ContextDto, dto: CreateCustomerDto, traceId: string) {
    const normalizedTaxId = normalizeDigits(dto.taxId);
    const normalizedEmail = normalizeEmail(dto.email);
    const normalizedPhone = normalizeDigits(dto.phone);

    // Duplicate check
    const duplicates = await this.checkDuplicates(actor.organizationId, {
      taxId: normalizedTaxId || undefined,
      email: normalizedEmail || undefined,
      phone: normalizedPhone || undefined,
      name: dto.legalName,
    });

    const hasStrong = duplicates.some((d) => d.strength === 'STRONG');
    if (hasStrong && !dto.overrideDuplicate) {
      fail(
        'CUSTOMER_POSSIBLE_DUPLICATE',
        'Possível duplicidade identificada. Confirme para prosseguir com exceção.',
        409,
        { duplicates },
      );
    }

    return this.store.transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: {
          organizationId: actor.organizationId,
          kind: dto.kind,
          legalName: dto.legalName.trim(),
          tradeName: dto.tradeName?.trim() || null,
          taxId: normalizedTaxId || null,
          stateRegistration: dto.stateRegistration?.trim() || null,
          notes: dto.notes?.trim() || null,
          status: 'ACTIVE',
          version: 1,
        },
      });

      if (dto.phone?.trim()) {
        await tx.customerContact.create({
          data: {
            customerId: customer.id,
            type: 'PHONE',
            value: dto.phone.trim(),
            normalizedValue: normalizedPhone,
            isPrimary: true,
          },
        });
      }

      if (dto.email?.trim()) {
        await tx.customerContact.create({
          data: {
            customerId: customer.id,
            type: 'EMAIL',
            value: dto.email.trim(),
            normalizedValue: normalizedEmail,
            isPrimary: true,
          },
        });
      }

      if (dto.street?.trim() && dto.city?.trim() && dto.state?.trim()) {
        await tx.address.create({
          data: {
            customerId: customer.id,
            postalCode: normalizeDigits(dto.postalCode),
            street: dto.street.trim(),
            number: dto.number?.trim() || 'SN',
            complement: dto.complement?.trim() || null,
            district: dto.district?.trim() || null,
            city: dto.city.trim(),
            state: dto.state.trim().toUpperCase(),
            country: 'BR',
            isPrimary: true,
          },
        });
      }

      await this.store.audit(tx, 'commercial.customer_created', actor, customer.id, traceId);

      const event: CustomerCreatedEventV1 = {
        eventId: randomUUID(),
        eventType: 'CUSTOMER_CREATED',
        schemaVersion: 1,
        occurredAt: customer.createdAt.toISOString(),
        organizationId: actor.organizationId,
        aggregateId: customer.id,
        producer: 'customer',
        correlationId: traceId,
        payload: { customerId: customer.id },
      };

      await tx.integrationOutbox.create({
        data: {
          id: event.eventId,
          organizationId: event.organizationId,
          eventType: event.eventType,
          schemaVersion: event.schemaVersion,
          aggregateType: 'Customer',
          aggregateId: event.aggregateId,
          producer: event.producer,
          correlationId: event.correlationId,
          occurredAt: customer.createdAt,
          payload: event.payload,
          dedupeKey: `CUSTOMER_CREATED:${customer.id}`,
        },
      });
      return customer;
    });
  }

  async updateCustomer(
    actor: ContextDto,
    customerId: string,
    dto: UpdateCustomerDto,
    traceId: string,
  ) {
    return this.store.transaction(async (tx) => {
      const existing = await tx.customer.findFirst({
        where: { id: customerId, organizationId: actor.organizationId },
      });
      if (!existing) fail('CUSTOMER_NOT_FOUND', 'Cliente não encontrado.', 404);

      if (existing.version !== dto.expectedVersion) {
        fail(
          'CONCURRENT_MODIFICATION',
          'O cliente foi alterado por outro usuário. Recarregue os dados e tente novamente.',
          409,
        );
      }

      const updated = await tx.customer.update({
        where: { id: customerId },
        data: {
          legalName: dto.legalName !== undefined ? dto.legalName.trim() : undefined,
          tradeName: dto.tradeName !== undefined ? dto.tradeName.trim() || null : undefined,
          taxId: dto.taxId !== undefined ? normalizeDigits(dto.taxId) || null : undefined,
          notes: dto.notes !== undefined ? dto.notes.trim() || null : undefined,
          version: { increment: 1 },
        },
      });

      const audit = await this.store.audit(
        tx,
        'commercial.customer_updated',
        actor,
        customerId,
        traceId,
      );
      const event: CustomerUpdatedEventV1 = {
        eventId: randomUUID(),
        eventType: 'CUSTOMER_UPDATED',
        schemaVersion: 1,
        occurredAt: audit.createdAt.toISOString(),
        organizationId: actor.organizationId,
        aggregateId: customerId,
        producer: 'crm',
        correlationId: traceId,
        payload: { customerId, auditEventId: audit.id },
      };
      await tx.integrationOutbox.create({
        data: {
          id: event.eventId,
          organizationId: event.organizationId,
          eventType: event.eventType,
          schemaVersion: event.schemaVersion,
          aggregateType: 'Customer',
          aggregateId: event.aggregateId,
          producer: event.producer,
          correlationId: event.correlationId,
          occurredAt: audit.createdAt,
          payload: event.payload,
          dedupeKey: `CUSTOMER_UPDATED:${audit.id}`,
        },
      });
      return updated;
    });
  }

  async archiveCustomer(
    actor: ContextDto,
    customerId: string,
    expectedVersion: number,
    traceId: string,
  ) {
    return this.store.transaction(async (tx) => {
      const customer = await tx.customer.findFirst({
        where: { id: customerId, organizationId: actor.organizationId },
        include: {
          opportunities: {
            where: { state: { notIn: ['VENDIDO', 'PERDIDO', 'CANCELADO'] } },
          },
        },
      });

      if (!customer) fail('CUSTOMER_NOT_FOUND', 'Cliente não encontrado.', 404);
      if (customer.version !== expectedVersion) {
        fail('CONCURRENT_MODIFICATION', 'O registro foi alterado por outro usuário.', 409);
      }
      if (customer.opportunities.length > 0) {
        fail(
          'CUSTOMER_HAS_ACTIVE_OPPORTUNITIES',
          'Não é possível arquivar cliente com oportunidades comerciais ativas.',
          422,
        );
      }

      const updated = await tx.customer.update({
        where: { id: customerId },
        data: {
          status: 'ARCHIVED',
          archivedAt: new Date(),
          version: { increment: 1 },
        },
      });

      const audit = await this.store.audit(
        tx,
        'commercial.customer_archived',
        actor,
        customerId,
        traceId,
      );
      const event: CustomerArchivedEventV1 = {
        eventId: randomUUID(),
        eventType: 'CUSTOMER_ARCHIVED',
        schemaVersion: 1,
        occurredAt: audit.createdAt.toISOString(),
        organizationId: actor.organizationId,
        aggregateId: customerId,
        producer: 'crm',
        correlationId: traceId,
        payload: { customerId, auditEventId: audit.id },
      };
      await tx.integrationOutbox.create({
        data: {
          id: event.eventId,
          organizationId: event.organizationId,
          eventType: event.eventType,
          schemaVersion: event.schemaVersion,
          aggregateType: 'Customer',
          aggregateId: event.aggregateId,
          producer: event.producer,
          correlationId: event.correlationId,
          occurredAt: audit.createdAt,
          payload: event.payload,
          dedupeKey: `CUSTOMER_ARCHIVED:${audit.id}`,
        },
      });
      return updated;
    });
  }

  async restoreCustomer(
    actor: ContextDto,
    customerId: string,
    expectedVersion: number,
    traceId: string,
  ) {
    return this.store.transaction(async (tx) => {
      const customer = await tx.customer.findFirst({
        where: { id: customerId, organizationId: actor.organizationId },
      });
      if (!customer) fail('CUSTOMER_NOT_FOUND', 'Cliente não encontrado.', 404);
      if (customer.version !== expectedVersion) {
        fail('CONCURRENT_MODIFICATION', 'O registro foi alterado por outro usuário.', 409);
      }

      const updated = await tx.customer.update({
        where: { id: customerId },
        data: {
          status: 'ACTIVE',
          archivedAt: null,
          version: { increment: 1 },
        },
      });

      const audit = await this.store.audit(
        tx,
        'commercial.customer_restored',
        actor,
        customerId,
        traceId,
      );
      const event: CustomerRestoredEventV1 = {
        eventId: randomUUID(),
        eventType: 'CUSTOMER_RESTORED',
        schemaVersion: 1,
        occurredAt: audit.createdAt.toISOString(),
        organizationId: actor.organizationId,
        aggregateId: customerId,
        producer: 'crm',
        correlationId: traceId,
        payload: { customerId, auditEventId: audit.id },
      };
      await tx.integrationOutbox.create({
        data: {
          id: event.eventId,
          organizationId: event.organizationId,
          eventType: event.eventType,
          schemaVersion: event.schemaVersion,
          aggregateType: 'Customer',
          aggregateId: event.aggregateId,
          producer: event.producer,
          correlationId: event.correlationId,
          occurredAt: audit.createdAt,
          payload: event.payload,
          dedupeKey: `CUSTOMER_RESTORED:${audit.id}`,
        },
      });
      return updated;
    });
  }

  async addContact(actor: ContextDto, customerId: string, dto: AddContactDto, traceId: string) {
    const customer = await this.store.db.customer.findFirst({
      where: { id: customerId, organizationId: actor.organizationId },
    });
    if (!customer) fail('CUSTOMER_NOT_FOUND', 'Cliente não encontrado.', 404);

    const normalizedValue =
      dto.type === 'EMAIL' ? normalizeEmail(dto.value) : normalizeDigits(dto.value);

    return this.store.transaction(async (tx) => {
      if (dto.isPrimary) {
        await tx.customerContact.updateMany({
          where: { customerId, type: dto.type },
          data: { isPrimary: false },
        });
      }

      const contact = await tx.customerContact.create({
        data: {
          customerId,
          type: dto.type,
          value: dto.value.trim(),
          normalizedValue,
          label: dto.label?.trim() || null,
          isPrimary: !!dto.isPrimary,
        },
      });

      await this.store.audit(tx, 'commercial.contact_added', actor, customerId, traceId);
      return contact;
    });
  }

  async deleteContact(actor: ContextDto, customerId: string, contactId: string, traceId: string) {
    return this.store.transaction(async (tx) => {
      const contact = await tx.customerContact.findFirst({
        where: { id: contactId, customerId, customer: { organizationId: actor.organizationId } },
      });
      if (!contact) fail('CONTACT_NOT_FOUND', 'Contato não encontrado.', 404);

      await tx.customerContact.delete({ where: { id: contactId } });
      await this.store.audit(tx, 'commercial.contact_deleted', actor, customerId, traceId);
      return { success: true };
    });
  }

  async addAddress(actor: ContextDto, customerId: string, dto: AddAddressDto, traceId: string) {
    const customer = await this.store.db.customer.findFirst({
      where: { id: customerId, organizationId: actor.organizationId },
    });
    if (!customer) fail('CUSTOMER_NOT_FOUND', 'Cliente não encontrado.', 404);

    return this.store.transaction(async (tx) => {
      if (dto.isPrimary) {
        await tx.address.updateMany({
          where: { customerId },
          data: { isPrimary: false },
        });
      }

      const address = await tx.address.create({
        data: {
          customerId,
          postalCode: normalizeDigits(dto.postalCode),
          street: dto.street.trim(),
          number: dto.number.trim(),
          complement: dto.complement?.trim() || null,
          district: dto.district?.trim() || null,
          city: dto.city.trim(),
          state: dto.state.trim().toUpperCase(),
          country: 'BR',
          isPrimary: !!dto.isPrimary,
        },
      });

      await this.store.audit(tx, 'commercial.address_added', actor, customerId, traceId);
      return address;
    });
  }

  // ---------------------------------------------------------------------------
  // UTILITY UNITS
  // ---------------------------------------------------------------------------

  async listUtilityUnits(actor: ContextDto, customerId: string) {
    return this.store.db.utilityUnit.findMany({
      where: { customerId, organizationId: actor.organizationId },
      include: { address: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createUtilityUnit(
    actor: ContextDto,
    customerId: string,
    dto: CreateUtilityUnitDto,
    traceId: string,
  ) {
    return this.store.transaction((tx) =>
      this.createUtilityUnitInTransaction(tx, actor, customerId, dto, traceId),
    );
  }

  async createAndLinkUtilityUnit(
    actor: ContextDto,
    opportunityId: string,
    dto: CreateAndLinkUtilityUnitDto,
    idempotencyKey: string,
    traceId: string,
  ) {
    const checkContext = async (tx: Prisma.TransactionClient) => {
      const opportunity = await tx.opportunity.findFirst({
        where: { id: opportunityId, organizationId: actor.organizationId },
      });
      if (!opportunity) fail('OPPORTUNITY_NOT_FOUND', 'Oportunidade não encontrada.', 404);
      await this.assertCanCreateAndLinkUtilityUnit(tx, actor, opportunity);
      return opportunity;
    };

    await this.store.transaction(checkContext);
    return this.store.command(
      actor,
      idempotencyKey,
      { opportunityId, ...dto },
      'consumer_units:manage',
      async (tx) => {
        const opportunity = await tx.opportunity.findFirst({
          where: { id: opportunityId, organizationId: actor.organizationId },
        });
        if (!opportunity) fail('OPPORTUNITY_NOT_FOUND', 'Oportunidade não encontrada.', 404);
        await this.assertCanCreateAndLinkUtilityUnit(tx, actor, opportunity);
        if (opportunity.version !== dto.expectedVersion) {
          fail('CONCURRENT_MODIFICATION', 'A oportunidade foi alterada por outro usuário.', 409);
        }

        const unit = await this.createUtilityUnitInTransaction(
          tx,
          actor,
          opportunity.customerId,
          dto,
          traceId,
        );
        const updated = await tx.opportunity.updateMany({
          where: {
            id: opportunity.id,
            organizationId: actor.organizationId,
            version: dto.expectedVersion,
          },
          data: { utilityUnitId: unit.id, version: { increment: 1 } },
        });
        if (!updated.count) {
          fail('CONCURRENT_MODIFICATION', 'A oportunidade foi alterada por outro usuário.', 409);
        }

        await this.store.audit(
          tx,
          'commercial.opportunity_updated',
          actor,
          opportunity.id,
          traceId,
        );
        return {
          id: unit.id,
          organizationId: unit.organizationId,
          customerId: unit.customerId,
          distributorName: unit.distributorName,
          externalCode: unit.externalCode,
          consumerClass: unit.consumerClass,
          tariffMode: unit.tariffMode,
          connectionType: unit.connectionType,
          voltage: unit.voltage,
          addressId: unit.addressId,
          version: unit.version,
          createdAt: unit.createdAt.toISOString(),
          updatedAt: unit.updatedAt.toISOString(),
        };
      },
      false,
    );
  }

  async updateUtilityUnit(
    actor: ContextDto,
    utilityUnitId: string,
    dto: UpdateUtilityUnitDto,
    traceId: string,
  ) {
    return this.store.transaction(async (tx) => {
      const existing = await tx.utilityUnit.findFirst({
        where: { id: utilityUnitId, organizationId: actor.organizationId },
      });
      if (!existing) fail('UTILITY_UNIT_NOT_FOUND', 'Unidade consumidora não encontrada.', 404);
      if (existing.version !== dto.expectedVersion) {
        fail(
          'CONCURRENT_MODIFICATION',
          'A unidade consumidora foi alterada por outro usuário.',
          409,
        );
      }

      const updated = await tx.utilityUnit.update({
        where: { id: utilityUnitId },
        data: {
          distributorName: dto.distributorName?.trim(),
          externalCode: dto.externalCode?.trim() || null,
          consumerClass: dto.consumerClass,
          tariffMode: dto.tariffMode,
          connectionType: dto.connectionType,
          voltage: dto.voltage,
          version: { increment: 1 },
        },
      });

      const audit = await this.store.audit(
        tx,
        'commercial.utility_unit_updated',
        actor,
        utilityUnitId,
        traceId,
      );
      const event: UtilityUnitUpdatedEventV1 = {
        eventId: randomUUID(),
        eventType: 'UTILITY_UNIT_UPDATED',
        schemaVersion: 1,
        occurredAt: audit.createdAt.toISOString(),
        organizationId: actor.organizationId,
        aggregateId: utilityUnitId,
        producer: 'crm',
        correlationId: traceId,
        payload: {
          utilityUnitId,
          customerId: updated.customerId,
          auditEventId: audit.id,
        },
      };
      await tx.integrationOutbox.create({
        data: {
          id: event.eventId,
          organizationId: event.organizationId,
          eventType: event.eventType,
          schemaVersion: event.schemaVersion,
          aggregateType: 'UtilityUnit',
          aggregateId: event.aggregateId,
          producer: event.producer,
          correlationId: event.correlationId,
          occurredAt: audit.createdAt,
          payload: event.payload,
          dedupeKey: `UTILITY_UNIT_UPDATED:${audit.id}`,
        },
      });
      return updated;
    });
  }

  // ---------------------------------------------------------------------------
  // OPPORTUNITIES
  // ---------------------------------------------------------------------------

  async listOpportunities(
    actor: ContextDto,
    params: {
      state?: string;
      ownerUserId?: string;
      customerId?: string;
      search?: string;
      skip?: number;
      take?: number;
    },
  ) {
    const where: Prisma.OpportunityWhereInput = {
      organizationId: actor.organizationId,
    };

    if (params.state) where.state = params.state;
    if (params.customerId) where.customerId = params.customerId;
    if (params.ownerUserId) where.ownerUserId = params.ownerUserId;

    if (params.search?.trim()) {
      const term = params.search.trim();
      where.OR = [
        { code: { contains: term, mode: 'insensitive' } },
        { title: { contains: term, mode: 'insensitive' } },
        { customer: { legalName: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.store.db.opportunity.findMany({
        where,
        include: {
          customer: { select: { id: true, legalName: true, tradeName: true } },
          utilityUnit: { select: { id: true, distributorName: true, externalCode: true } },
          owner: { select: { id: true, name: true, email: true } },
          activities: {
            where: { status: 'OPEN' },
            orderBy: { dueAt: 'asc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: params.skip ?? 0,
        take: params.take ?? 50,
      }),
      this.store.db.opportunity.count({ where }),
    ]);

    return { items, total };
  }

  async getOpportunity(actor: ContextDto, opportunityId: string) {
    const opp = await this.store.db.opportunity.findFirst({
      where: { id: opportunityId, organizationId: actor.organizationId },
      include: {
        customer: {
          include: {
            contacts: true,
            addresses: true,
          },
        },
        utilityUnit: true,
        owner: { select: { id: true, name: true, email: true } },
        activities: { orderBy: { dueAt: 'asc' } },
        transitions: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!opp) fail('OPPORTUNITY_NOT_FOUND', 'Oportunidade não encontrada.', 404);
    return opp;
  }

  async createOpportunity(actor: ContextDto, dto: CreateOpportunityDto, traceId: string) {
    return this.store.transaction(async (tx) => {
      const customer = await tx.customer.findFirst({
        where: { id: dto.customerId, organizationId: actor.organizationId },
      });
      if (!customer) fail('CUSTOMER_NOT_FOUND', 'Cliente não encontrado.', 404);

      if (dto.utilityUnitId) {
        const unit = await tx.utilityUnit.findFirst({
          where: {
            id: dto.utilityUnitId,
            organizationId: actor.organizationId,
            customerId: dto.customerId,
          },
        });
        if (!unit) fail('UTILITY_UNIT_NOT_FOUND', 'Unidade consumidora não encontrada.', 404);
      }

      // Generate human-readable sequential code: OPT-0001, OPT-0002...
      const count = await tx.opportunity.count({
        where: { organizationId: actor.organizationId },
      });
      const code = `OPT-${(count + 1).toString().padStart(4, '0')}`;
      const ownerId = dto.ownerUserId || actor.userId;

      const opp = await tx.opportunity.create({
        data: {
          organizationId: actor.organizationId,
          customerId: dto.customerId,
          utilityUnitId: dto.utilityUnitId || null,
          code,
          title: dto.title.trim(),
          ownerUserId: ownerId,
          source: dto.source || 'INBOUND',
          projectType: dto.projectType || 'ON_GRID',
          needSummary: dto.needSummary.trim(),
          estimatedConsumption:
            dto.estimatedConsumption !== undefined
              ? new Prisma.Decimal(dto.estimatedConsumption)
              : null,
          priority: dto.priority || 'WARM',
          state: 'NOVO',
          expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : null,
          version: 1,
        },
      });

      // FV1.3 rule: Oportunidade e primeira atividade criadas na mesma transação
      const firstActivity = await tx.activity.create({
        data: {
          organizationId: actor.organizationId,
          opportunityId: opp.id,
          customerId: dto.customerId,
          type: dto.firstActivity.type,
          subject: dto.firstActivity.subject.trim(),
          description: dto.firstActivity.description?.trim() || null,
          assigneeUserId: ownerId,
          dueAt: new Date(dto.firstActivity.dueAt),
          status: 'OPEN',
          version: 1,
        },
      });

      // Record state transition
      await tx.opportunityTransition.create({
        data: {
          opportunityId: opp.id,
          fromState: '',
          toState: 'NOVO',
          command: 'create',
          actorId: actor.userId,
          justification: 'Criação da oportunidade',
        },
      });

      const audit = await this.store.audit(
        tx,
        'commercial.opportunity_created',
        actor,
        opp.id,
        traceId,
      );

      const event: OpportunityCreatedEventV1 = {
        eventId: randomUUID(),
        eventType: 'OPPORTUNITY_CREATED',
        schemaVersion: 1,
        occurredAt: opp.createdAt.toISOString(),
        organizationId: actor.organizationId,
        aggregateId: opp.id,
        producer: 'crm',
        correlationId: traceId,
        payload: {
          opportunityId: opp.id,
          customerId: opp.customerId,
          ...(opp.utilityUnitId ? { utilityUnitId: opp.utilityUnitId } : {}),
        },
      };

      await tx.integrationOutbox.create({
        data: {
          id: event.eventId,
          organizationId: event.organizationId,
          eventType: event.eventType,
          schemaVersion: event.schemaVersion,
          aggregateType: 'Opportunity',
          aggregateId: event.aggregateId,
          producer: event.producer,
          correlationId: event.correlationId,
          occurredAt: opp.createdAt,
          payload: event.payload,
          dedupeKey: `OPPORTUNITY_CREATED:${opp.id}`,
        },
      });

      const activityEvent: ActivityCreatedEventV1 = {
        eventId: randomUUID(),
        eventType: 'ACTIVITY_CREATED',
        schemaVersion: 1,
        occurredAt: audit.createdAt.toISOString(),
        organizationId: actor.organizationId,
        aggregateId: firstActivity.id,
        producer: 'crm',
        correlationId: traceId,
        payload: {
          activityId: firstActivity.id,
          auditEventId: audit.id,
          customerId: opp.customerId,
          opportunityId: opp.id,
        },
      };
      await tx.integrationOutbox.create({
        data: {
          id: activityEvent.eventId,
          organizationId: activityEvent.organizationId,
          eventType: activityEvent.eventType,
          schemaVersion: activityEvent.schemaVersion,
          aggregateType: 'Activity',
          aggregateId: activityEvent.aggregateId,
          producer: activityEvent.producer,
          correlationId: activityEvent.correlationId,
          occurredAt: audit.createdAt,
          payload: activityEvent.payload,
          dedupeKey: `ACTIVITY_CREATED:${audit.id}:${firstActivity.id}`,
        },
      });
      return opp;
    });
  }

  async updateOpportunity(
    actor: ContextDto,
    opportunityId: string,
    dto: UpdateOpportunityDto,
    traceId: string,
  ) {
    return this.store.transaction(async (tx) => {
      const opp = await tx.opportunity.findFirst({
        where: { id: opportunityId, organizationId: actor.organizationId },
      });
      if (!opp) fail('OPPORTUNITY_NOT_FOUND', 'Oportunidade não encontrada.', 404);
      if (opp.version !== dto.expectedVersion) {
        fail('CONCURRENT_MODIFICATION', 'A oportunidade foi alterada por outro usuário.', 409);
      }

      if (dto.utilityUnitId) {
        const unit = await tx.utilityUnit.findFirst({
          where: {
            id: dto.utilityUnitId,
            organizationId: actor.organizationId,
            customerId: opp.customerId,
          },
        });
        if (!unit) fail('UTILITY_UNIT_NOT_FOUND', 'Unidade consumidora não encontrada.', 404);
      }

      const updated = await tx.opportunity.update({
        where: { id: opportunityId },
        data: {
          title: dto.title !== undefined ? dto.title.trim() : undefined,
          needSummary: dto.needSummary !== undefined ? dto.needSummary.trim() : undefined,
          estimatedConsumption:
            dto.estimatedConsumption !== undefined
              ? new Prisma.Decimal(dto.estimatedConsumption)
              : undefined,
          priority: dto.priority !== undefined ? dto.priority : undefined,
          expectedCloseDate:
            dto.expectedCloseDate !== undefined
              ? dto.expectedCloseDate
                ? new Date(dto.expectedCloseDate)
                : null
              : undefined,
          ownerUserId: dto.ownerUserId !== undefined ? dto.ownerUserId : undefined,
          utilityUnitId: dto.utilityUnitId !== undefined ? dto.utilityUnitId : undefined,
          version: { increment: 1 },
        },
      });

      const audit = await this.store.audit(
        tx,
        'commercial.opportunity_updated',
        actor,
        opportunityId,
        traceId,
      );
      const event: OpportunityUpdatedEventV1 = {
        eventId: randomUUID(),
        eventType: 'OPPORTUNITY_UPDATED',
        schemaVersion: 1,
        occurredAt: audit.createdAt.toISOString(),
        organizationId: actor.organizationId,
        aggregateId: opportunityId,
        producer: 'crm',
        correlationId: traceId,
        payload: {
          opportunityId,
          customerId: updated.customerId,
          auditEventId: audit.id,
        },
      };
      await tx.integrationOutbox.create({
        data: {
          id: event.eventId,
          organizationId: event.organizationId,
          eventType: event.eventType,
          schemaVersion: event.schemaVersion,
          aggregateType: 'Opportunity',
          aggregateId: event.aggregateId,
          producer: event.producer,
          correlationId: event.correlationId,
          occurredAt: audit.createdAt,
          payload: event.payload,
          dedupeKey: `OPPORTUNITY_UPDATED:${audit.id}`,
        },
      });
      return updated;
    });
  }

  async qualifyOpportunity(
    actor: ContextDto,
    opportunityId: string,
    dto: QualifyOpportunityDto,
    traceId: string,
  ) {
    return this.store.transaction(async (tx) => {
      const opp = await tx.opportunity.findFirst({
        where: { id: opportunityId, organizationId: actor.organizationId },
        include: {
          customer: { include: { contacts: true } },
          activities: { where: { status: 'OPEN' } },
        },
      });

      if (!opp) fail('OPPORTUNITY_NOT_FOUND', 'Oportunidade não encontrada.', 404);
      if (opp.version !== dto.expectedVersion) {
        fail('CONCURRENT_MODIFICATION', 'A oportunidade foi alterada por outro usuário.', 409);
      }
      if (opp.state !== 'NOVO') {
        fail(
          'OPPORTUNITY_INVALID_TRANSITION',
          `Transição inválida: não é possível qualificar oportunidade no estado "${opp.state}".`,
          409,
        );
      }

      // Gate A validations:
      if (!dto.confirmedNeedSummary?.trim()) {
        fail('OPPORTUNITY_QUALIFICATION_INCOMPLETE', 'O resumo de necessidade é obrigatório.', 422);
      }
      if (!opp.customer.contacts || opp.customer.contacts.length === 0) {
        fail(
          'OPPORTUNITY_QUALIFICATION_INCOMPLETE',
          'O cliente deve possuir ao menos um canal de contato válido para qualificação.',
          422,
        );
      }
      if (opp.activities.length === 0 && !dto.nextActivity) {
        fail(
          'OPPORTUNITY_QUALIFICATION_INCOMPLETE',
          'A qualificação exige uma próxima atividade programada.',
          422,
        );
      }

      const updated = await tx.opportunity.update({
        where: { id: opportunityId },
        data: {
          state: 'QUALIFICADO',
          needSummary: dto.confirmedNeedSummary.trim(),
          estimatedConsumption:
            dto.estimatedConsumption !== undefined
              ? new Prisma.Decimal(dto.estimatedConsumption)
              : opp.estimatedConsumption,
          version: { increment: 1 },
        },
      });

      let nextActivityId: string | undefined;
      if (dto.nextActivity) {
        const nextActivity = await tx.activity.create({
          data: {
            organizationId: actor.organizationId,
            opportunityId: opp.id,
            customerId: opp.customerId,
            type: dto.nextActivity.type,
            subject: dto.nextActivity.subject.trim(),
            description: dto.nextActivity.description?.trim() || null,
            assigneeUserId: opp.ownerUserId,
            dueAt: new Date(dto.nextActivity.dueAt),
            status: 'OPEN',
            version: 1,
          },
        });
        nextActivityId = nextActivity.id;
      }

      const transition = await tx.opportunityTransition.create({
        data: {
          opportunityId: opp.id,
          fromState: 'NOVO',
          toState: 'QUALIFICADO',
          command: 'qualify',
          actorId: actor.userId,
          justification: 'Qualificação comercial concluída (Gate A atendido)',
        },
      });

      const audit = await this.store.audit(
        tx,
        'commercial.opportunity_qualified',
        actor,
        opportunityId,
        traceId,
      );

      const event: OpportunityQualifiedEventV1 = {
        eventId: randomUUID(),
        eventType: 'OPPORTUNITY_QUALIFIED',
        schemaVersion: 1,
        occurredAt: transition.createdAt.toISOString(),
        organizationId: actor.organizationId,
        aggregateId: opp.id,
        producer: 'crm',
        correlationId: traceId,
        payload: {
          opportunityId: opp.id,
          transitionId: transition.id,
          customerId: opp.customerId,
          fromState: 'NOVO',
          toState: 'QUALIFICADO',
        },
      };

      await tx.integrationOutbox.create({
        data: {
          id: event.eventId,
          organizationId: event.organizationId,
          eventType: event.eventType,
          schemaVersion: event.schemaVersion,
          aggregateType: 'Opportunity',
          aggregateId: event.aggregateId,
          producer: event.producer,
          correlationId: event.correlationId,
          occurredAt: transition.createdAt,
          payload: event.payload,
          dedupeKey: `OPPORTUNITY_QUALIFIED:${transition.id}`,
        },
      });

      if (nextActivityId) {
        const activityEvent: ActivityCreatedEventV1 = {
          eventId: randomUUID(),
          eventType: 'ACTIVITY_CREATED',
          schemaVersion: 1,
          occurredAt: audit.createdAt.toISOString(),
          organizationId: actor.organizationId,
          aggregateId: nextActivityId,
          producer: 'crm',
          correlationId: traceId,
          payload: {
            activityId: nextActivityId,
            auditEventId: audit.id,
            customerId: opp.customerId,
            opportunityId: opp.id,
          },
        };
        await tx.integrationOutbox.create({
          data: {
            id: activityEvent.eventId,
            organizationId: activityEvent.organizationId,
            eventType: activityEvent.eventType,
            schemaVersion: activityEvent.schemaVersion,
            aggregateType: 'Activity',
            aggregateId: activityEvent.aggregateId,
            producer: activityEvent.producer,
            correlationId: activityEvent.correlationId,
            occurredAt: audit.createdAt,
            payload: activityEvent.payload,
            dedupeKey: `ACTIVITY_CREATED:${audit.id}:${nextActivityId}`,
          },
        });
      }

      return updated;
    });
  }

  async loseOpportunity(
    actor: ContextDto,
    opportunityId: string,
    dto: LoseOpportunityDto,
    traceId: string,
  ) {
    if (!dto.lossReason?.trim()) {
      fail('OPPORTUNITY_LOSS_REASON_REQUIRED', 'O motivo da perda é obrigatório.', 422);
    }

    return this.store.transaction(async (tx) => {
      const opp = await tx.opportunity.findFirst({
        where: { id: opportunityId, organizationId: actor.organizationId },
      });
      if (!opp) fail('OPPORTUNITY_NOT_FOUND', 'Oportunidade não encontrada.', 404);
      if (opp.version !== dto.expectedVersion) {
        fail('CONCURRENT_MODIFICATION', 'A oportunidade foi alterada por outro usuário.', 409);
      }
      if (['PERDIDO', 'CANCELADO', 'VENDIDO'].includes(opp.state)) {
        fail('OPPORTUNITY_INVALID_TRANSITION', `Oportunidade já encerrada em "${opp.state}".`, 409);
      }

      const previousState = opp.state;
      const updated = await tx.opportunity.update({
        where: { id: opportunityId },
        data: {
          state: 'PERDIDO',
          lossReason: dto.lossReason.trim(),
          lossNotes: dto.lossNotes?.trim() || null,
          lostAt: new Date(),
          version: { increment: 1 },
        },
      });

      // Cancel pending activities
      await tx.activity.updateMany({
        where: { opportunityId, status: 'OPEN' },
        data: { status: 'CANCELED' },
      });

      const transition = await tx.opportunityTransition.create({
        data: {
          opportunityId,
          fromState: previousState,
          toState: 'PERDIDO',
          command: 'lose',
          actorId: actor.userId,
          justification: dto.lossReason.trim(),
        },
      });

      await this.store.audit(tx, 'commercial.opportunity_lost', actor, opportunityId, traceId);

      const event: OpportunityLostEventV1 = {
        eventId: randomUUID(),
        eventType: 'OPPORTUNITY_LOST',
        schemaVersion: 1,
        occurredAt: transition.createdAt.toISOString(),
        organizationId: actor.organizationId,
        aggregateId: opportunityId,
        producer: 'crm',
        correlationId: traceId,
        payload: {
          opportunityId,
          transitionId: transition.id,
          fromState: previousState,
          toState: 'PERDIDO',
        },
      };

      await tx.integrationOutbox.create({
        data: {
          id: event.eventId,
          organizationId: event.organizationId,
          eventType: event.eventType,
          schemaVersion: event.schemaVersion,
          aggregateType: 'Opportunity',
          aggregateId: event.aggregateId,
          producer: event.producer,
          correlationId: event.correlationId,
          occurredAt: transition.createdAt,
          payload: event.payload,
          dedupeKey: `OPPORTUNITY_LOST:${transition.id}`,
        },
      });

      return updated;
    });
  }

  async reopenOpportunity(
    actor: ContextDto,
    opportunityId: string,
    dto: ReopenOpportunityDto,
    traceId: string,
  ) {
    if (!dto.justification?.trim()) {
      fail('REOPEN_JUSTIFICATION_REQUIRED', 'A justificativa de reabertura é obrigatória.', 422);
    }

    return this.store.transaction(async (tx) => {
      const opp = await tx.opportunity.findFirst({
        where: { id: opportunityId, organizationId: actor.organizationId },
      });
      if (!opp) fail('OPPORTUNITY_NOT_FOUND', 'Oportunidade não encontrada.', 404);
      if (opp.version !== dto.expectedVersion) {
        fail('CONCURRENT_MODIFICATION', 'A oportunidade foi alterada por outro usuário.', 409);
      }
      if (!['PERDIDO', 'CANCELADO'].includes(opp.state)) {
        fail(
          'OPPORTUNITY_INVALID_TRANSITION',
          'Somente oportunidades perdidas ou canceladas podem ser reabertas.',
          409,
        );
      }

      const previousState = opp.state;
      const updated = await tx.opportunity.update({
        where: { id: opportunityId },
        data: {
          state: 'NOVO',
          lossReason: null,
          lossNotes: null,
          lostAt: null,
          version: { increment: 1 },
        },
      });

      const transition = await tx.opportunityTransition.create({
        data: {
          opportunityId,
          fromState: previousState,
          toState: 'NOVO',
          command: 'reopen',
          actorId: actor.userId,
          justification: dto.justification.trim(),
        },
      });

      await this.store.audit(tx, 'commercial.opportunity_reopened', actor, opportunityId, traceId);

      const event: OpportunityReopenedEventV1 = {
        eventId: randomUUID(),
        eventType: 'OPPORTUNITY_REOPENED',
        schemaVersion: 1,
        occurredAt: transition.createdAt.toISOString(),
        organizationId: actor.organizationId,
        aggregateId: opportunityId,
        producer: 'crm',
        correlationId: traceId,
        payload: {
          opportunityId,
          transitionId: transition.id,
          fromState: previousState as 'PERDIDO' | 'CANCELADO',
          toState: 'NOVO',
        },
      };

      await tx.integrationOutbox.create({
        data: {
          id: event.eventId,
          organizationId: event.organizationId,
          eventType: event.eventType,
          schemaVersion: event.schemaVersion,
          aggregateType: 'Opportunity',
          aggregateId: event.aggregateId,
          producer: event.producer,
          correlationId: event.correlationId,
          occurredAt: transition.createdAt,
          payload: event.payload,
          dedupeKey: `OPPORTUNITY_REOPENED:${transition.id}`,
        },
      });

      return updated;
    });
  }

  // ---------------------------------------------------------------------------
  // ACTIVITIES
  // ---------------------------------------------------------------------------

  async listActivities(
    actor: ContextDto,
    params: {
      status?: string;
      assigneeUserId?: string;
      opportunityId?: string;
      customerId?: string;
      dueFrom?: string;
      dueTo?: string;
      overdue?: boolean;
    },
  ) {
    const where: Prisma.ActivityWhereInput = {
      organizationId: actor.organizationId,
    };

    if (params.status) where.status = params.status;
    if (params.assigneeUserId) where.assigneeUserId = params.assigneeUserId;
    if (params.opportunityId) where.opportunityId = params.opportunityId;
    if (params.customerId) where.customerId = params.customerId;

    if (params.dueFrom || params.dueTo) {
      where.dueAt = {};
      if (params.dueFrom) where.dueAt.gte = new Date(params.dueFrom);
      if (params.dueTo) where.dueAt.lte = new Date(params.dueTo);
    } else if (params.overdue) {
      where.dueAt = { lt: new Date() };
      where.status = 'OPEN';
    }

    return this.store.db.activity.findMany({
      where,
      include: {
        customer: { select: { id: true, legalName: true } },
        opportunity: { select: { id: true, code: true, title: true, state: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
      orderBy: { dueAt: 'asc' },
    });
  }

  async createActivity(actor: ContextDto, dto: CreateActivityDto, traceId: string) {
    const assignee = dto.assigneeUserId || actor.userId;

    return this.store.transaction(async (tx) => {
      const activity = await tx.activity.create({
        data: {
          organizationId: actor.organizationId,
          opportunityId: dto.opportunityId || null,
          customerId: dto.customerId || null,
          type: dto.type,
          subject: dto.subject.trim(),
          description: dto.description?.trim() || null,
          assigneeUserId: assignee,
          dueAt: new Date(dto.dueAt),
          status: 'OPEN',
          version: 1,
        },
      });

      const audit = await this.store.audit(
        tx,
        'commercial.activity_created',
        actor,
        activity.id,
        traceId,
      );
      const event: ActivityCreatedEventV1 = {
        eventId: randomUUID(),
        eventType: 'ACTIVITY_CREATED',
        schemaVersion: 1,
        occurredAt: audit.createdAt.toISOString(),
        organizationId: actor.organizationId,
        aggregateId: activity.id,
        producer: 'crm',
        correlationId: traceId,
        payload: {
          activityId: activity.id,
          auditEventId: audit.id,
          ...(activity.customerId ? { customerId: activity.customerId } : {}),
          ...(activity.opportunityId ? { opportunityId: activity.opportunityId } : {}),
        },
      };
      await tx.integrationOutbox.create({
        data: {
          id: event.eventId,
          organizationId: event.organizationId,
          eventType: event.eventType,
          schemaVersion: event.schemaVersion,
          aggregateType: 'Activity',
          aggregateId: event.aggregateId,
          producer: event.producer,
          correlationId: event.correlationId,
          occurredAt: audit.createdAt,
          payload: event.payload,
          dedupeKey: `ACTIVITY_CREATED:${audit.id}`,
        },
      });
      return activity;
    });
  }

  async completeActivity(
    actor: ContextDto,
    activityId: string,
    dto: CompleteActivityDto,
    traceId: string,
  ) {
    if (!dto.resultCode?.trim()) {
      fail('ACTIVITY_RESULT_REQUIRED', 'O código do resultado é obrigatório ao concluir.', 422);
    }

    return this.store.transaction(async (tx) => {
      const activity = await tx.activity.findFirst({
        where: { id: activityId, organizationId: actor.organizationId },
      });
      if (!activity) fail('ACTIVITY_NOT_FOUND', 'Atividade não encontrada.', 404);
      if (activity.version !== dto.expectedVersion) {
        fail('CONCURRENT_MODIFICATION', 'A atividade foi alterada por outro usuário.', 409);
      }
      if (activity.status !== 'OPEN') {
        fail('ACTIVITY_ALREADY_CLOSED', 'Atividade já finalizada ou cancelada.', 422);
      }

      const completed = await tx.activity.update({
        where: { id: activityId },
        data: {
          status: 'COMPLETED',
          resultCode: dto.resultCode.trim(),
          resultNotes: dto.resultNotes?.trim() || null,
          completedAt: new Date(),
          version: { increment: 1 },
        },
      });

      let nextActivityId: string | undefined;
      if (dto.nextActivity) {
        const nextActivity = await tx.activity.create({
          data: {
            organizationId: actor.organizationId,
            opportunityId: activity.opportunityId,
            customerId: activity.customerId,
            type: dto.nextActivity.type,
            subject: dto.nextActivity.subject.trim(),
            description: dto.nextActivity.description?.trim() || null,
            assigneeUserId: activity.assigneeUserId,
            dueAt: new Date(dto.nextActivity.dueAt),
            previousActivityId: activity.id,
            status: 'OPEN',
            version: 1,
          },
        });
        nextActivityId = nextActivity.id;
      }

      const audit = await this.store.audit(
        tx,
        'commercial.activity_completed',
        actor,
        activityId,
        traceId,
      );
      const event: ActivityCompletedEventV1 = {
        eventId: randomUUID(),
        eventType: 'ACTIVITY_COMPLETED',
        schemaVersion: 1,
        occurredAt: audit.createdAt.toISOString(),
        organizationId: actor.organizationId,
        aggregateId: activityId,
        producer: 'crm',
        correlationId: traceId,
        payload: {
          activityId,
          auditEventId: audit.id,
          ...(activity.customerId ? { customerId: activity.customerId } : {}),
          ...(activity.opportunityId ? { opportunityId: activity.opportunityId } : {}),
          ...(nextActivityId ? { nextActivityId } : {}),
        },
      };
      await tx.integrationOutbox.create({
        data: {
          id: event.eventId,
          organizationId: event.organizationId,
          eventType: event.eventType,
          schemaVersion: event.schemaVersion,
          aggregateType: 'Activity',
          aggregateId: event.aggregateId,
          producer: event.producer,
          correlationId: event.correlationId,
          occurredAt: audit.createdAt,
          payload: event.payload,
          dedupeKey: `ACTIVITY_COMPLETED:${audit.id}`,
        },
      });
      return completed;
    });
  }

  async rescheduleActivity(
    actor: ContextDto,
    activityId: string,
    dto: RescheduleActivityDto,
    traceId: string,
  ) {
    return this.store.transaction(async (tx) => {
      const activity = await tx.activity.findFirst({
        where: { id: activityId, organizationId: actor.organizationId },
      });
      if (!activity) fail('ACTIVITY_NOT_FOUND', 'Atividade não encontrada.', 404);
      if (activity.version !== dto.expectedVersion) {
        fail('CONCURRENT_MODIFICATION', 'A atividade foi alterada por outro usuário.', 409);
      }
      if (activity.status !== 'OPEN') {
        fail('ACTIVITY_ALREADY_CLOSED', 'Atividade não está aberta para reagendamento.', 422);
      }

      const updated = await tx.activity.update({
        where: { id: activityId },
        data: {
          dueAt: new Date(dto.dueAt),
          description: dto.notes
            ? `${activity.description ?? ''}\n[Reagendado]: ${dto.notes.trim()}`.trim()
            : activity.description,
          version: { increment: 1 },
        },
      });

      const audit = await this.store.audit(
        tx,
        'commercial.activity_rescheduled',
        actor,
        activityId,
        traceId,
      );
      const event: ActivityRescheduledEventV1 = {
        eventId: randomUUID(),
        eventType: 'ACTIVITY_RESCHEDULED',
        schemaVersion: 1,
        occurredAt: audit.createdAt.toISOString(),
        organizationId: actor.organizationId,
        aggregateId: activityId,
        producer: 'crm',
        correlationId: traceId,
        payload: {
          activityId,
          auditEventId: audit.id,
          ...(activity.customerId ? { customerId: activity.customerId } : {}),
          ...(activity.opportunityId ? { opportunityId: activity.opportunityId } : {}),
        },
      };
      await tx.integrationOutbox.create({
        data: {
          id: event.eventId,
          organizationId: event.organizationId,
          eventType: event.eventType,
          schemaVersion: event.schemaVersion,
          aggregateType: 'Activity',
          aggregateId: event.aggregateId,
          producer: event.producer,
          correlationId: event.correlationId,
          occurredAt: audit.createdAt,
          payload: event.payload,
          dedupeKey: `ACTIVITY_RESCHEDULED:${audit.id}`,
        },
      });
      return updated;
    });
  }

  async cancelActivity(
    actor: ContextDto,
    activityId: string,
    expectedVersion: number,
    traceId: string,
  ) {
    return this.store.transaction(async (tx) => {
      const activity = await tx.activity.findFirst({
        where: { id: activityId, organizationId: actor.organizationId },
      });
      if (!activity) fail('ACTIVITY_NOT_FOUND', 'Atividade não encontrada.', 404);
      if (activity.version !== expectedVersion) {
        fail('CONCURRENT_MODIFICATION', 'A atividade foi alterada por outro usuário.', 409);
      }
      if (activity.status !== 'OPEN') {
        fail('ACTIVITY_ALREADY_CLOSED', 'Atividade não está aberta para cancelamento.', 422);
      }

      const updated = await tx.activity.update({
        where: { id: activityId },
        data: {
          status: 'CANCELED',
          version: { increment: 1 },
        },
      });

      const audit = await this.store.audit(
        tx,
        'commercial.activity_canceled',
        actor,
        activityId,
        traceId,
      );
      const event: ActivityCanceledEventV1 = {
        eventId: randomUUID(),
        eventType: 'ACTIVITY_CANCELED',
        schemaVersion: 1,
        occurredAt: audit.createdAt.toISOString(),
        organizationId: actor.organizationId,
        aggregateId: activityId,
        producer: 'crm',
        correlationId: traceId,
        payload: {
          activityId,
          auditEventId: audit.id,
          ...(activity.customerId ? { customerId: activity.customerId } : {}),
          ...(activity.opportunityId ? { opportunityId: activity.opportunityId } : {}),
        },
      };
      await tx.integrationOutbox.create({
        data: {
          id: event.eventId,
          organizationId: event.organizationId,
          eventType: event.eventType,
          schemaVersion: event.schemaVersion,
          aggregateType: 'Activity',
          aggregateId: event.aggregateId,
          producer: event.producer,
          correlationId: event.correlationId,
          occurredAt: audit.createdAt,
          payload: event.payload,
          dedupeKey: `ACTIVITY_CANCELED:${audit.id}`,
        },
      });
      return updated;
    });
  }
}
