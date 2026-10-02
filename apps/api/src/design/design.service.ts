import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IdentityStore, Tx } from '../identity/identity.store';
import { fail } from '../identity/security';
import type { ContextDto } from '../identity/identity.dto';
import type {
  AdditionalCostViewDto,
  ApproveDesignVersionDto,
  CatalogItemViewDto,
  ConsumptionSummaryViewDto,
  CreateCatalogItemDto,
  CreateDesignDto,
  CreateEnergyReadingDto,
  CreateSurveyDto,
  DesignItemInputDto,
  DesignItemViewDto,
  DesignSuggestionViewDto,
  DesignVersionViewDto,
  DesignViewDto,
  EnergyReadingViewDto,
  PricingViewDto,
  SuggestDesignDto,
  SurveyViewDto,
  UpdateCatalogItemDto,
  UpdateDesignVersionDto,
} from './design.dto';

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

@Injectable()
export class DesignService {
  constructor(private readonly store: IdentityStore) {}

  // ---------------------------------------------------------------------------
  // 1. HISTÓRICO DE CONSUMO (ENERGY READINGS)
  // ---------------------------------------------------------------------------

  async getReadings(
    context: ContextDto,
    utilityUnitId: string,
  ): Promise<ConsumptionSummaryViewDto> {
    const uc = await this.store.db.utilityUnit.findFirst({
      where: { id: utilityUnitId, organizationId: context.organizationId },
    });
    if (!uc) {
      fail('UTILITY_UNIT_NOT_FOUND', 'Unidade consumidora não encontrada.', 404);
    }

    const readings = await this.store.db.energyReading.findMany({
      where: { utilityUnitId, organizationId: context.organizationId, status: 'ACTIVE' },
      orderBy: { referenceMonth: 'desc' },
      take: 12,
    });

    const readingViews: EnergyReadingViewDto[] = readings.map((r) => ({
      id: r.id,
      utilityUnitId: r.utilityUnitId,
      referenceMonth: r.referenceMonth,
      consumptionKwh: Number(r.consumptionKwh),
      injectedKwh: r.injectedKwh ? Number(r.injectedKwh) : null,
      billedAmount: r.billedAmount ? Number(r.billedAmount) : null,
      source: r.source,
      status: r.status,
      notes: r.notes,
      createdAt: r.createdAt.toISOString(),
    }));

    const validMonthsCount = readingViews.length;
    const sumKwh = readingViews.reduce((acc, curr) => acc + curr.consumptionKwh, 0);
    const averageMonthlyConsumptionKwh =
      validMonthsCount > 0 ? round2(sumKwh / validMonthsCount) : 0;
    const annualizedConsumptionKwh = round2(averageMonthlyConsumptionKwh * 12);
    const hasIncompleteHistory = validMonthsCount < 12;

    return {
      readings: readingViews,
      validMonthsCount,
      hasIncompleteHistory,
      averageMonthlyConsumptionKwh,
      annualizedConsumptionKwh,
      targetConsumptionKwh: averageMonthlyConsumptionKwh,
    };
  }

  async createOrUpdateReading(
    context: ContextDto,
    utilityUnitId: string,
    dto: CreateEnergyReadingDto,
    traceId = 'system',
  ): Promise<EnergyReadingViewDto> {
    const uc = await this.store.db.utilityUnit.findFirst({
      where: { id: utilityUnitId, organizationId: context.organizationId },
    });
    if (!uc) {
      fail('UTILITY_UNIT_NOT_FOUND', 'Unidade consumidora não encontrada.', 404);
    }

    return this.store.transaction(async (tx) => {
      const reading = await tx.energyReading.upsert({
        where: {
          utilityUnitId_referenceMonth: {
            utilityUnitId,
            referenceMonth: dto.referenceMonth,
          },
        },
        create: {
          organizationId: context.organizationId,
          utilityUnitId,
          referenceMonth: dto.referenceMonth,
          consumptionKwh: dto.consumptionKwh,
          injectedKwh: dto.injectedKwh ?? null,
          billedAmount: dto.billedAmount ?? null,
          source: dto.source ?? 'MANUAL',
          status: 'ACTIVE',
          notes: dto.notes ?? null,
        },
        update: {
          consumptionKwh: dto.consumptionKwh,
          injectedKwh: dto.injectedKwh ?? null,
          billedAmount: dto.billedAmount ?? null,
          source: dto.source ?? 'MANUAL',
          status: 'ACTIVE',
          notes: dto.notes ?? null,
        },
      });

      await this.store.audit(
        tx,
        'COMMERCIAL_ENERGY_READING_RECORDED',
        { organizationId: context.organizationId, id: context.id },
        reading.id,
        traceId,
      );

      return {
        id: reading.id,
        utilityUnitId: reading.utilityUnitId,
        referenceMonth: reading.referenceMonth,
        consumptionKwh: Number(reading.consumptionKwh),
        injectedKwh: reading.injectedKwh ? Number(reading.injectedKwh) : null,
        billedAmount: reading.billedAmount ? Number(reading.billedAmount) : null,
        source: reading.source,
        status: reading.status,
        notes: reading.notes,
        createdAt: reading.createdAt.toISOString(),
      };
    });
  }

  async deleteReading(
    context: ContextDto,
    utilityUnitId: string,
    readingId: string,
    traceId = 'system',
  ): Promise<{ success: boolean }> {
    const reading = await this.store.db.energyReading.findFirst({
      where: { id: readingId, utilityUnitId, organizationId: context.organizationId },
    });
    if (!reading) {
      fail('READING_NOT_FOUND', 'Leitura de consumo não encontrada.', 404);
    }

    await this.store.transaction(async (tx) => {
      await tx.energyReading.delete({ where: { id: readingId } });
      await this.store.audit(
        tx,
        'COMMERCIAL_ENERGY_READING_DELETED',
        { organizationId: context.organizationId, id: context.id },
        readingId,
        traceId,
      );
    });

    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // 2. LEVANTAMENTO TÉCNICO (SURVEY)
  // ---------------------------------------------------------------------------

  async getSurveys(context: ContextDto, opportunityId: string): Promise<SurveyViewDto[]> {
    const surveys = await this.store.db.survey.findMany({
      where: { opportunityId, organizationId: context.organizationId },
      orderBy: { createdAt: 'desc' },
    });

    return surveys.map((s) => ({
      id: s.id,
      opportunityId: s.opportunityId,
      utilityUnitId: s.utilityUnitId,
      type: s.type,
      status: s.status,
      tariffPerKwh: Number(s.tariffPerKwh),
      connectionType: s.connectionType,
      voltage: s.voltage,
      roofType: s.roofType,
      shadingKnown: s.shadingKnown,
      notes: s.notes,
      assumptions: s.assumptions as Record<string, unknown> | null,
      completedById: s.completedById,
      completedAt: s.completedAt ? s.completedAt.toISOString() : null,
      version: s.version,
      createdAt: s.createdAt.toISOString(),
    }));
  }

  async createOrUpdateSurvey(
    context: ContextDto,
    opportunityId: string,
    dto: CreateSurveyDto,
    traceId = 'system',
  ): Promise<SurveyViewDto> {
    const opt = await this.store.db.opportunity.findFirst({
      where: { id: opportunityId, organizationId: context.organizationId },
    });
    if (!opt) {
      fail('OPPORTUNITY_NOT_FOUND', 'Oportunidade não encontrada.', 404);
    }

    return this.store.transaction(async (tx) => {
      let survey = await tx.survey.findFirst({
        where: { opportunityId, organizationId: context.organizationId, status: 'DRAFT' },
      });

      const assumptions = {
        plannedAdditionalLoadKwh: dto.plannedAdditionalLoadKwh ?? 0,
        recordedBy: context.name,
      };

      if (!survey) {
        survey = await tx.survey.create({
          data: {
            organizationId: context.organizationId,
            opportunityId,
            utilityUnitId: dto.utilityUnitId ?? opt.utilityUnitId,
            type: dto.type ?? 'REMOTE',
            status: 'DRAFT',
            tariffPerKwh: dto.tariffPerKwh,
            connectionType: dto.connectionType ?? 'BIPHASIC',
            voltage: dto.voltage ?? '220V',
            roofType: dto.roofType ?? null,
            shadingKnown: dto.shadingKnown ?? false,
            notes: dto.notes ?? null,
            assumptions,
          },
        });
      } else {
        survey = await tx.survey.update({
          where: { id: survey.id },
          data: {
            utilityUnitId: dto.utilityUnitId ?? survey.utilityUnitId,
            type: dto.type ?? survey.type,
            tariffPerKwh: dto.tariffPerKwh,
            connectionType: dto.connectionType ?? survey.connectionType,
            voltage: dto.voltage ?? survey.voltage,
            roofType: dto.roofType !== undefined ? dto.roofType : survey.roofType,
            shadingKnown: dto.shadingKnown !== undefined ? dto.shadingKnown : survey.shadingKnown,
            notes: dto.notes !== undefined ? dto.notes : survey.notes,
            assumptions,
            version: { increment: 1 },
          },
        });
      }

      await this.store.audit(
        tx,
        'SURVEY_RECORDED',
        { organizationId: context.organizationId, id: context.id },
        survey.id,
        traceId,
      );

      return {
        id: survey.id,
        opportunityId: survey.opportunityId,
        utilityUnitId: survey.utilityUnitId,
        type: survey.type,
        status: survey.status,
        tariffPerKwh: Number(survey.tariffPerKwh),
        connectionType: survey.connectionType,
        voltage: survey.voltage,
        roofType: survey.roofType,
        shadingKnown: survey.shadingKnown,
        notes: survey.notes,
        assumptions: survey.assumptions as Record<string, unknown> | null,
        completedById: survey.completedById,
        completedAt: survey.completedAt ? survey.completedAt.toISOString() : null,
        version: survey.version,
        createdAt: survey.createdAt.toISOString(),
      };
    });
  }

  async completeSurvey(
    context: ContextDto,
    surveyId: string,
    traceId = 'system',
  ): Promise<SurveyViewDto> {
    const survey = await this.store.db.survey.findFirst({
      where: { id: surveyId, organizationId: context.organizationId },
    });
    if (!survey) {
      fail('SURVEY_NOT_FOUND', 'Levantamento não encontrado.', 404);
    }
    if (survey.status === 'COMPLETED') {
      fail('SURVEY_ALREADY_COMPLETED', 'Levantamento já está concluído.', 422);
    }

    return this.store.transaction(async (tx) => {
      const updated = await tx.survey.update({
        where: { id: surveyId },
        data: {
          status: 'COMPLETED',
          completedById: context.userId,
          completedAt: new Date(),
          version: { increment: 1 },
        },
      });

      await this.store.audit(
        tx,
        'SURVEY_COMPLETED',
        { organizationId: context.organizationId, id: context.id },
        surveyId,
        traceId,
      );

      return {
        id: updated.id,
        opportunityId: updated.opportunityId,
        utilityUnitId: updated.utilityUnitId,
        type: updated.type,
        status: updated.status,
        tariffPerKwh: Number(updated.tariffPerKwh),
        connectionType: updated.connectionType,
        voltage: updated.voltage,
        roofType: updated.roofType,
        shadingKnown: updated.shadingKnown,
        notes: updated.notes,
        assumptions: updated.assumptions as Record<string, unknown> | null,
        completedById: updated.completedById,
        completedAt: updated.completedAt ? updated.completedAt.toISOString() : null,
        version: updated.version,
        createdAt: updated.createdAt.toISOString(),
      };
    });
  }

  // ---------------------------------------------------------------------------
  // 3. CATÁLOGO DE MATERIAIS E SERVIÇOS (CATALOG)
  // ---------------------------------------------------------------------------

  async listCatalog(
    context: ContextDto,
    query?: { category?: string; kind?: string; status?: string },
  ): Promise<CatalogItemViewDto[]> {
    await this.ensureInitialCatalogSeeded(context.organizationId);

    const where: Prisma.CatalogItemWhereInput = {
      organizationId: context.organizationId,
    };
    if (query?.category) where.category = query.category;
    if (query?.kind) where.kind = query.kind;
    if (query?.status) where.status = query.status;

    const items = await this.store.db.catalogItem.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    return items.map((i) => ({
      id: i.id,
      sku: i.sku,
      kind: i.kind,
      category: i.category,
      name: i.name,
      manufacturer: i.manufacturer,
      model: i.model,
      unitOfMeasure: i.unitOfMeasure,
      powerRatingWp: i.powerRatingWp ? Number(i.powerRatingWp) : null,
      powerRatingKw: i.powerRatingKw ? Number(i.powerRatingKw) : null,
      referenceCost: Number(i.referenceCost),
      referencePrice: i.referencePrice ? Number(i.referencePrice) : null,
      status: i.status,
      version: i.version,
    }));
  }

  async createCatalogItem(
    context: ContextDto,
    dto: CreateCatalogItemDto,
    traceId = 'system',
  ): Promise<CatalogItemViewDto> {
    const existing = await this.store.db.catalogItem.findUnique({
      where: {
        organizationId_sku: {
          organizationId: context.organizationId,
          sku: dto.sku,
        },
      },
    });
    if (existing) {
      fail('CATALOG_SKU_CONFLICT', `O SKU "${dto.sku}" já está em uso nesta organização.`, 409);
    }

    return this.store.transaction(async (tx) => {
      const item = await tx.catalogItem.create({
        data: {
          organizationId: context.organizationId,
          sku: dto.sku,
          kind: dto.kind,
          category: dto.category,
          name: dto.name,
          manufacturer: dto.manufacturer ?? null,
          model: dto.model ?? null,
          unitOfMeasure: dto.unitOfMeasure ?? 'UN',
          powerRatingWp: dto.powerRatingWp ?? null,
          powerRatingKw: dto.powerRatingKw ?? null,
          referenceCost: dto.referenceCost,
          referencePrice: dto.referencePrice ?? null,
          status: 'ACTIVE',
        },
      });

      await this.store.audit(
        tx,
        'CATALOG_ITEM_CREATED',
        { organizationId: context.organizationId, id: context.id },
        item.id,
        traceId,
      );

      return {
        id: item.id,
        sku: item.sku,
        kind: item.kind,
        category: item.category,
        name: item.name,
        manufacturer: item.manufacturer,
        model: item.model,
        unitOfMeasure: item.unitOfMeasure,
        powerRatingWp: item.powerRatingWp ? Number(item.powerRatingWp) : null,
        powerRatingKw: item.powerRatingKw ? Number(item.powerRatingKw) : null,
        referenceCost: Number(item.referenceCost),
        referencePrice: item.referencePrice ? Number(item.referencePrice) : null,
        status: item.status,
        version: item.version,
      };
    });
  }

  async updateCatalogItem(
    context: ContextDto,
    id: string,
    dto: UpdateCatalogItemDto,
    traceId = 'system',
  ): Promise<CatalogItemViewDto> {
    const item = await this.store.db.catalogItem.findFirst({
      where: { id, organizationId: context.organizationId },
    });
    if (!item) {
      fail('CATALOG_ITEM_NOT_FOUND', 'Item de catálogo não encontrado.', 404);
    }
    if (dto.expectedVersion !== undefined && item.version !== dto.expectedVersion) {
      fail(
        'CONCURRENCY_CONFLICT',
        `O item de catálogo foi alterado por outro usuário (versão atual: ${item.version}, esperada: ${dto.expectedVersion}).`,
        409,
      );
    }

    return this.store.transaction(async (tx) => {
      const updated = await tx.catalogItem.update({
        where: { id },
        data: {
          sku: dto.sku !== undefined ? dto.sku : item.sku,
          kind: dto.kind !== undefined ? (dto.kind as any) : item.kind,
          category: dto.category !== undefined ? (dto.category as any) : item.category,
          name: dto.name !== undefined ? dto.name : item.name,
          manufacturer: dto.manufacturer !== undefined ? dto.manufacturer : item.manufacturer,
          model: dto.model !== undefined ? dto.model : item.model,
          unitOfMeasure: dto.unitOfMeasure !== undefined ? dto.unitOfMeasure : item.unitOfMeasure,
          powerRatingWp: dto.powerRatingWp !== undefined ? dto.powerRatingWp : item.powerRatingWp,
          powerRatingKw: dto.powerRatingKw !== undefined ? dto.powerRatingKw : item.powerRatingKw,
          referenceCost: dto.referenceCost !== undefined ? dto.referenceCost : item.referenceCost,
          referencePrice:
            dto.referencePrice !== undefined ? dto.referencePrice : item.referencePrice,
          status: dto.status !== undefined ? (dto.status as any) : item.status,
          version: { increment: 1 },
        },
      });

      await this.store.audit(
        tx,
        'CATALOG_ITEM_UPDATED',
        { organizationId: context.organizationId, id: context.id },
        id,
        traceId,
      );

      return {
        id: updated.id,
        sku: updated.sku,
        kind: updated.kind,
        category: updated.category,
        name: updated.name,
        manufacturer: updated.manufacturer,
        model: updated.model,
        unitOfMeasure: updated.unitOfMeasure,
        powerRatingWp: updated.powerRatingWp ? Number(updated.powerRatingWp) : null,
        powerRatingKw: updated.powerRatingKw ? Number(updated.powerRatingKw) : null,
        referenceCost: Number(updated.referenceCost),
        referencePrice: updated.referencePrice ? Number(updated.referencePrice) : null,
        status: updated.status,
        version: updated.version,
      };
    });
  }

  private async ensureInitialCatalogSeeded(organizationId: string): Promise<void> {
    const count = await this.store.db.catalogItem.count({ where: { organizationId } });
    if (count > 0) return;

    const standardItems = [
      {
        sku: 'MOD-LONGI-630W',
        kind: 'MATERIAL',
        category: 'MODULE',
        name: 'Módulo Fotovoltaico Longi 630W N-Type Bifacial',
        manufacturer: 'Longi Solar',
        model: 'Hi-MO X6',
        unitOfMeasure: 'UN',
        powerRatingWp: 630,
        powerRatingKw: null,
        referenceCost: 650.0,
        referencePrice: 850.0,
      },
      {
        sku: 'MOD-CANADIAN-600W',
        kind: 'MATERIAL',
        category: 'MODULE',
        name: 'Módulo Fotovoltaico Canadian 600W TOPBiHiKu6',
        manufacturer: 'Canadian Solar',
        model: 'TOPBiHiKu6',
        unitOfMeasure: 'UN',
        powerRatingWp: 600,
        powerRatingKw: null,
        referenceCost: 610.0,
        referencePrice: 800.0,
      },
      {
        sku: 'INV-GROWATT-5K',
        kind: 'MATERIAL',
        category: 'INVERTER',
        name: 'Inversor Solar Growatt 5kW Monofásico 220V',
        manufacturer: 'Growatt',
        model: 'MIN 5000TL-X',
        unitOfMeasure: 'UN',
        powerRatingWp: null,
        powerRatingKw: 5.0,
        referenceCost: 3200.0,
        referencePrice: 4200.0,
      },
      {
        sku: 'INV-DEYE-10K',
        kind: 'MATERIAL',
        category: 'INVERTER',
        name: 'Inversor Solar Deye 10kW Trifásico 220V/380V',
        manufacturer: 'Deye',
        model: 'SUN-10K-G05',
        unitOfMeasure: 'UN',
        powerRatingWp: null,
        powerRatingKw: 10.0,
        referenceCost: 5800.0,
        referencePrice: 7500.0,
      },
      {
        sku: 'INV-SUNGROW-15K',
        kind: 'MATERIAL',
        category: 'INVERTER',
        name: 'Inversor Solar Sungrow 15kW Trifásico',
        manufacturer: 'Sungrow',
        model: 'SG15RT',
        unitOfMeasure: 'UN',
        powerRatingWp: null,
        powerRatingKw: 15.0,
        referenceCost: 7900.0,
        referencePrice: 9900.0,
      },
      {
        sku: 'EST-FIBROCIMENTO',
        kind: 'MATERIAL',
        category: 'STRUCTURE',
        name: 'Estrutura de Fixação em Fibrocimento',
        manufacturer: 'SolarGroup',
        model: 'Parafuso Estrutural',
        unitOfMeasure: 'UN',
        powerRatingWp: null,
        powerRatingKw: null,
        referenceCost: 85.0,
        referencePrice: 120.0,
      },
      {
        sku: 'CAB-SOLAR-6MM',
        kind: 'MATERIAL',
        category: 'CABLE_ELECTRICAL',
        name: 'Cabo Solar 6mm² Preto/Vermelho 1.8kV CC',
        manufacturer: 'Prysmian',
        model: 'Solar Cable',
        unitOfMeasure: 'M',
        powerRatingWp: null,
        powerRatingKw: null,
        referenceCost: 6.5,
        referencePrice: 9.0,
      },
      {
        sku: 'SRV-INSTALACAO',
        kind: 'SERVICE',
        category: 'SERVICE_INSTALLATION',
        name: 'Instalação e Montagem Eletromecânica Completa',
        manufacturer: null,
        model: null,
        unitOfMeasure: 'KWp',
        powerRatingWp: null,
        powerRatingKw: null,
        referenceCost: 250.0,
        referencePrice: 350.0,
      },
      {
        sku: 'SRV-HOMOLOGACAO-ART',
        kind: 'SERVICE',
        category: 'SERVICE_ENGINEERING',
        name: 'Projeto Executivo, ART e Parecer de Acesso na Concessionária',
        manufacturer: null,
        model: null,
        unitOfMeasure: 'PROJETO',
        powerRatingWp: null,
        powerRatingKw: null,
        referenceCost: 1200.0,
        referencePrice: 1600.0,
      },
    ];

    for (const item of standardItems) {
      await this.store.db.catalogItem.create({
        data: {
          organizationId,
          ...item,
          status: 'ACTIVE',
        },
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 4. DIMENSIONAMENTO TÉCNICO E SUGESTÃO ASSISTIDA (SPEC-005)
  // ---------------------------------------------------------------------------

  async suggestDesign(
    context: ContextDto,
    dto: SuggestDesignDto,
  ): Promise<DesignSuggestionViewDto> {
    await this.ensureInitialCatalogSeeded(context.organizationId);

    const specificYield = dto.specificYield ?? 135.0; // kWh/kWp/mês
    const targetMonthlyGenerationKwh = dto.targetMonthlyGenerationKwh;

    // 1. Potência DC preliminar necessária: kWp = kWh / Yield
    const rawDcPowerKwp = targetMonthlyGenerationKwh / specificYield;

    // 2. Módulos sugeridos: busca módulo ativo no catálogo
    const activeModule = await this.store.db.catalogItem.findFirst({
      where: { organizationId: context.organizationId, category: 'MODULE', status: 'ACTIVE' },
      orderBy: { referenceCost: 'asc' },
    });
    const modulePowerWp = dto.preferredModulePowerWp ?? Number(activeModule?.powerRatingWp ?? 630);
    const suggestedModuleQuantity = Math.max(1, Math.ceil((rawDcPowerKwp * 1000) / modulePowerWp));
    const suggestedDcPowerKwp = round3((suggestedModuleQuantity * modulePowerWp) / 1000);

    // 3. Inversor sugerido: relação DC/AC típica entre 1.15 e 1.30 (overload de 20-30%)
    const targetInverterKw = suggestedDcPowerKwp / 1.25;
    const inverters = await this.store.db.catalogItem.findMany({
      where: { organizationId: context.organizationId, category: 'INVERTER', status: 'ACTIVE' },
      orderBy: { powerRatingKw: 'asc' },
    });

    let selectedInverter = inverters.find((inv) => Number(inv.powerRatingKw) >= targetInverterKw);
    if (!selectedInverter && inverters.length > 0) {
      selectedInverter = inverters[inverters.length - 1]; // maior disponível
    }

    const suggestedInverterPowerKw = Number(
      selectedInverter?.powerRatingKw ?? Math.max(3, round2(targetInverterKw)),
    );
    const suggestedInverterQuantity = 1;
    const dcAcRatio = round2(
      suggestedDcPowerKwp / (suggestedInverterPowerKw * suggestedInverterQuantity),
    );

    const estimatedMonthlyGenerationKwh = round2(suggestedDcPowerKwp * specificYield);
    const estimatedAnnualGenerationKwh = round2(estimatedMonthlyGenerationKwh * 12);

    return {
      targetMonthlyGenerationKwh,
      specificYield,
      suggestedDcPowerKwp,
      suggestedModuleQuantity,
      suggestedModulePowerWp: modulePowerWp,
      suggestedModuleSku: activeModule?.sku ?? null,
      suggestedInverterPowerKw,
      suggestedInverterQuantity,
      suggestedInverterSku: selectedInverter?.sku ?? null,
      dcAcRatio,
      estimatedMonthlyGenerationKwh,
      estimatedAnnualGenerationKwh,
      classification: 'ESTIMATED',
    };
  }

  // ---------------------------------------------------------------------------
  // 5. GESTÃO DE DESIGN E VERSÕES (SPEC-005)
  // ---------------------------------------------------------------------------

  async getDesigns(context: ContextDto, opportunityId: string): Promise<DesignViewDto[]> {
    const designs = await this.store.db.design.findMany({
      where: { opportunityId, organizationId: context.organizationId },
      include: {
        versions: {
          include: {
            items: true,
            additionalCosts: true,
            pricing: true,
          },
          orderBy: { versionNumber: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return designs.map((d) => this.mapDesignToView(d));
  }

  async getDesign(context: ContextDto, id: string): Promise<DesignViewDto> {
    const design = await this.store.db.design.findFirst({
      where: { id, organizationId: context.organizationId },
      include: {
        versions: {
          include: {
            items: true,
            additionalCosts: true,
            pricing: true,
          },
          orderBy: { versionNumber: 'desc' },
        },
      },
    });
    if (!design) {
      fail('DESIGN_NOT_FOUND', 'Dimensionamento não encontrado.', 404);
    }
    return this.mapDesignToView(design);
  }

  async createDesign(
    context: ContextDto,
    opportunityId: string,
    dto: CreateDesignDto,
    traceId = 'system',
  ): Promise<DesignViewDto> {
    const opt = await this.store.db.opportunity.findFirst({
      where: { id: opportunityId, organizationId: context.organizationId },
    });
    if (!opt) {
      fail('OPPORTUNITY_NOT_FOUND', 'Oportunidade não encontrada.', 404);
    }

    const suggestion = await this.suggestDesign(context, {
      targetMonthlyGenerationKwh: dto.targetMonthlyGenerationKwh,
      specificYield: dto.specificYield,
    });

    // Itens sugeridos para popular a versão inicial
    const activeModule = await this.store.db.catalogItem.findFirst({
      where: { organizationId: context.organizationId, category: 'MODULE', status: 'ACTIVE' },
    });
    const activeInverter = await this.store.db.catalogItem.findFirst({
      where: { organizationId: context.organizationId, category: 'INVERTER', status: 'ACTIVE' },
    });
    const activeStructure = await this.store.db.catalogItem.findFirst({
      where: { organizationId: context.organizationId, category: 'STRUCTURE', status: 'ACTIVE' },
    });
    const activeService = await this.store.db.catalogItem.findFirst({
      where: {
        organizationId: context.organizationId,
        category: 'SERVICE_INSTALLATION',
        status: 'ACTIVE',
      },
    });

    const itemsToCreate: DesignItemInputDto[] = [];
    if (activeModule) {
      itemsToCreate.push({
        catalogItemId: activeModule.id,
        kind: 'MATERIAL',
        category: 'MODULE',
        description: activeModule.name,
        unitOfMeasure: activeModule.unitOfMeasure,
        quantity: suggestion.suggestedModuleQuantity,
        unitCost: Number(activeModule.referenceCost),
        costSource: 'CATALOG',
      });
    }
    if (activeInverter) {
      itemsToCreate.push({
        catalogItemId: activeInverter.id,
        kind: 'MATERIAL',
        category: 'INVERTER',
        description: activeInverter.name,
        unitOfMeasure: activeInverter.unitOfMeasure,
        quantity: suggestion.suggestedInverterQuantity,
        unitCost: Number(activeInverter.referenceCost),
        costSource: 'CATALOG',
      });
    }
    if (activeStructure) {
      itemsToCreate.push({
        catalogItemId: activeStructure.id,
        kind: 'MATERIAL',
        category: 'STRUCTURE',
        description: activeStructure.name,
        unitOfMeasure: activeStructure.unitOfMeasure,
        quantity: suggestion.suggestedModuleQuantity,
        unitCost: Number(activeStructure.referenceCost),
        costSource: 'CATALOG',
      });
    }
    if (activeService) {
      itemsToCreate.push({
        catalogItemId: activeService.id,
        kind: 'SERVICE',
        category: 'SERVICE_INSTALLATION',
        description: activeService.name,
        unitOfMeasure: activeService.unitOfMeasure,
        quantity: suggestion.suggestedDcPowerKwp,
        unitCost: Number(activeService.referenceCost),
        costSource: 'CATALOG',
      });
    }

    return this.store.transaction(async (tx) => {
      const design = await tx.design.create({
        data: {
          organizationId: context.organizationId,
          opportunityId,
          name: dto.name ?? 'Dimensionamento Padrão',
        },
      });

      const assumptions = {
        suggestion,
        targetConsumptionKwh: dto.targetMonthlyGenerationKwh,
        specificYield: suggestion.specificYield,
        classification: 'ESTIMATED',
        createdAt: new Date().toISOString(),
      };

      const version = await tx.designVersion.create({
        data: {
          organizationId: context.organizationId,
          designId: design.id,
          versionNumber: 1,
          status: 'DRAFT',
          systemType: dto.systemType ?? 'ON_GRID',
          targetMonthlyGenerationKwh: dto.targetMonthlyGenerationKwh,
          targetConsumptionKwh: dto.targetMonthlyGenerationKwh,
          dcPowerKwp: suggestion.suggestedDcPowerKwp,
          acPowerKw: suggestion.suggestedInverterPowerKw,
          estimatedMonthlyGenerationKwh: suggestion.estimatedMonthlyGenerationKwh,
          estimatedAnnualGenerationKwh: suggestion.estimatedAnnualGenerationKwh,
          specificYield: suggestion.specificYield,
          calculationVersion: 'v1.0-simplified',
          assumptionsSnapshot: assumptions as unknown as Prisma.InputJsonValue,
        },
      });

      // Criação dos itens
      for (const item of itemsToCreate) {
        await tx.designItem.create({
          data: {
            organizationId: context.organizationId,
            designVersionId: version.id,
            catalogItemId: item.catalogItemId ?? null,
            kind: item.kind,
            category: item.category,
            description: item.description,
            unitOfMeasure: item.unitOfMeasure,
            quantity: item.quantity,
            unitCost: item.unitCost,
            totalCost: round2(item.quantity * item.unitCost),
            costSource: item.costSource ?? 'CATALOG',
          },
        });
      }

      // Adiciona custo de engenharia/ART inicial
      await tx.additionalCost.create({
        data: {
          organizationId: context.organizationId,
          designVersionId: version.id,
          category: 'ENGINEERING_ART',
          description: 'Homologação e ART do projeto elétrico',
          amount: 1200.0,
          commercialTreatment: 'INCLUDED_IN_PRICE',
        },
      });

      // Recálculo financeiro inicial
      await this.recalculatePricing(tx, context.organizationId, version.id, 35.0, 0);

      await this.store.audit(
        tx,
        'DESIGN_CREATED',
        { organizationId: context.organizationId, id: context.id },
        design.id,
        traceId,
      );

      const completeDesign = await tx.design.findUniqueOrThrow({
        where: { id: design.id },
        include: {
          versions: {
            include: {
              items: true,
              additionalCosts: true,
              pricing: true,
            },
            orderBy: { versionNumber: 'desc' },
          },
        },
      });

      return this.mapDesignToView(completeDesign);
    });
  }

  async createDesignVersion(
    context: ContextDto,
    designId: string,
    basedOnVersionId?: string,
    traceId = 'system',
  ): Promise<DesignVersionViewDto> {
    const design = await this.store.db.design.findFirst({
      where: { id: designId, organizationId: context.organizationId },
      include: { versions: { orderBy: { versionNumber: 'desc' } } },
    });
    if (!design) {
      fail('DESIGN_NOT_FOUND', 'Dimensionamento não encontrado.', 404);
    }
    if (design.versions.length === 0 || !design.versions[0]) {
      fail('DESIGN_NO_VERSIONS', 'Nenhuma versão existente no dimensionamento.', 422);
    }

    const latestVersion = design.versions[0];
    const sourceVersionId = basedOnVersionId ?? latestVersion.id;

    const sourceVersion = await this.store.db.designVersion.findUnique({
      where: { id: sourceVersionId },
      include: { items: true, additionalCosts: true, pricing: true },
    });
    if (!sourceVersion) {
      fail('SOURCE_VERSION_NOT_FOUND', 'Versão de origem não encontrada.', 404);
    }

    const nextVersionNumber = latestVersion.versionNumber + 1;

    return this.store.transaction(async (tx) => {
      const newVersion = await tx.designVersion.create({
        data: {
          organizationId: context.organizationId,
          designId,
          versionNumber: nextVersionNumber,
          basedOnVersionId: sourceVersion.id,
          status: 'DRAFT',
          systemType: sourceVersion.systemType,
          targetMonthlyGenerationKwh: sourceVersion.targetMonthlyGenerationKwh,
          targetConsumptionKwh: sourceVersion.targetConsumptionKwh,
          dcPowerKwp: sourceVersion.dcPowerKwp,
          acPowerKw: sourceVersion.acPowerKw,
          estimatedMonthlyGenerationKwh: sourceVersion.estimatedMonthlyGenerationKwh,
          estimatedAnnualGenerationKwh: sourceVersion.estimatedAnnualGenerationKwh,
          specificYield: sourceVersion.specificYield,
          calculationVersion: sourceVersion.calculationVersion,
          assumptionsSnapshot: sourceVersion.assumptionsSnapshot as Prisma.InputJsonValue,
        },
      });

      // Copia itens
      for (const item of sourceVersion.items) {
        await tx.designItem.create({
          data: {
            organizationId: context.organizationId,
            designVersionId: newVersion.id,
            catalogItemId: item.catalogItemId,
            kind: item.kind,
            category: item.category,
            description: item.description,
            unitOfMeasure: item.unitOfMeasure,
            quantity: item.quantity,
            unitCost: item.unitCost,
            totalCost: item.totalCost,
            costSource: item.costSource,
            isOptional: item.isOptional,
            justification: item.justification,
          },
        });
      }

      // Copia custos adicionais
      for (const cost of sourceVersion.additionalCosts) {
        await tx.additionalCost.create({
          data: {
            organizationId: context.organizationId,
            designVersionId: newVersion.id,
            category: cost.category,
            description: cost.description,
            amount: cost.amount,
            commercialTreatment: cost.commercialTreatment,
            justification: cost.justification,
          },
        });
      }

      // Copia pricing
      const markup = sourceVersion.pricing ? Number(sourceVersion.pricing.markupPercent) : 35.0;
      const discount = sourceVersion.pricing ? Number(sourceVersion.pricing.discountAmount) : 0;
      await this.recalculatePricing(tx, context.organizationId, newVersion.id, markup, discount);

      await this.store.audit(
        tx,
        'DESIGN_VERSION_CREATED',
        { organizationId: context.organizationId, id: context.id },
        newVersion.id,
        traceId,
      );

      const created = await tx.designVersion.findUniqueOrThrow({
        where: { id: newVersion.id },
        include: { items: true, additionalCosts: true, pricing: true },
      });

      return this.mapVersionToView(created);
    });
  }

  async updateDesignVersion(
    context: ContextDto,
    versionId: string,
    dto: UpdateDesignVersionDto,
    traceId = 'system',
  ): Promise<DesignVersionViewDto> {
    const version = await this.store.db.designVersion.findFirst({
      where: { id: versionId, organizationId: context.organizationId },
    });
    if (!version) {
      fail('DESIGN_VERSION_NOT_FOUND', 'Versão de dimensionamento não encontrada.', 404);
    }
    if (version.status !== 'DRAFT') {
      fail(
        'DESIGN_VERSION_IMMUTABLE',
        'Versões aprovadas ou arquivadas são imutáveis. Crie uma nova versão para alterar parâmetros.',
        422,
      );
    }

    // Calcula nova potência DC e AC a partir dos itens informados
    let totalDcWp = 0;
    let totalAcKw = 0;

    for (const item of dto.items) {
      if (item.category === 'MODULE') {
        // Tenta pegar potência do catálogo se catalogItemId existir
        let pWp = 0;
        if (item.catalogItemId) {
          const cat = await this.store.db.catalogItem.findUnique({
            where: { id: item.catalogItemId },
          });
          if (cat?.powerRatingWp) pWp = Number(cat.powerRatingWp);
        }
        if (pWp === 0) {
          const match = item.description.match(/(\d{3,4})\s*W/i);
          pWp = match ? Number(match[1]) : 600;
        }
        totalDcWp += item.quantity * pWp;
      } else if (item.category === 'INVERTER') {
        let pKw = 0;
        if (item.catalogItemId) {
          const cat = await this.store.db.catalogItem.findUnique({
            where: { id: item.catalogItemId },
          });
          if (cat?.powerRatingKw) pKw = Number(cat.powerRatingKw);
        }
        if (pKw === 0) {
          const match = item.description.match(/(\d+(?:\.\d+)?)\s*kW/i);
          pKw = match ? Number(match[1]) : 5.0;
        }
        totalAcKw += item.quantity * pKw;
      }
    }

    const dcPowerKwp = round3(totalDcWp / 1000);
    const acPowerKw = round3(totalAcKw);
    const specificYield = dto.specificYield ?? Number(version.specificYield);
    const estimatedMonthlyGenerationKwh = round2(dcPowerKwp * specificYield);
    const estimatedAnnualGenerationKwh = round2(estimatedMonthlyGenerationKwh * 12);
    const targetMonthlyGenerationKwh =
      dto.targetMonthlyGenerationKwh ?? Number(version.targetMonthlyGenerationKwh);
    const targetConsumptionKwh = dto.targetConsumptionKwh ?? Number(version.targetConsumptionKwh);

    return this.store.transaction(async (tx) => {
      // 1. Atualiza versão técnica
      await tx.designVersion.update({
        where: { id: versionId },
        data: {
          targetMonthlyGenerationKwh,
          targetConsumptionKwh,
          specificYield,
          dcPowerKwp,
          acPowerKw,
          estimatedMonthlyGenerationKwh,
          estimatedAnnualGenerationKwh,
        },
      });

      // 2. Substitui itens
      await tx.designItem.deleteMany({ where: { designVersionId: versionId } });
      for (const item of dto.items) {
        await tx.designItem.create({
          data: {
            organizationId: context.organizationId,
            designVersionId: versionId,
            catalogItemId: item.catalogItemId ?? null,
            kind: item.kind,
            category: item.category,
            description: item.description,
            unitOfMeasure: item.unitOfMeasure,
            quantity: item.quantity,
            unitCost: item.unitCost,
            totalCost: round2(item.quantity * item.unitCost),
            costSource: item.costSource ?? 'CATALOG',
            isOptional: item.isOptional ?? false,
            justification: item.justification ?? null,
          },
        });
      }

      // 3. Substitui custos adicionais
      if (dto.additionalCosts !== undefined) {
        await tx.additionalCost.deleteMany({ where: { designVersionId: versionId } });
        for (const cost of dto.additionalCosts) {
          await tx.additionalCost.create({
            data: {
              organizationId: context.organizationId,
              designVersionId: versionId,
              category: cost.category,
              description: cost.description,
              amount: cost.amount,
              commercialTreatment: cost.commercialTreatment ?? 'INCLUDED_IN_PRICE',
              justification: cost.justification ?? null,
            },
          });
        }
      }

      // 4. Recalcula precificação (markup e margem)
      await this.recalculatePricing(
        tx,
        context.organizationId,
        versionId,
        dto.markupPercent,
        dto.discountAmount ?? 0,
        dto.contingencyAmount ?? 0,
      );

      await this.store.audit(
        tx,
        'DESIGN_VERSION_UPDATED',
        { organizationId: context.organizationId, id: context.id },
        versionId,
        traceId,
      );

      const updated = await tx.designVersion.findUniqueOrThrow({
        where: { id: versionId },
        include: { items: true, additionalCosts: true, pricing: true },
      });

      return this.mapVersionToView(updated);
    });
  }

  async approveDesignVersion(
    context: ContextDto,
    versionId: string,
    dto: ApproveDesignVersionDto,
    traceId = 'system',
  ): Promise<DesignVersionViewDto> {
    const version = await this.store.db.designVersion.findFirst({
      where: { id: versionId, organizationId: context.organizationId },
      include: { pricing: true, items: true },
    });
    if (!version) {
      fail('DESIGN_VERSION_NOT_FOUND', 'Versão de dimensionamento não encontrada.', 404);
    }
    if (version.status === 'APPROVED') {
      fail('DESIGN_ALREADY_APPROVED', 'Esta versão já foi aprovada.', 422);
    }

    // Validação técnica mínima
    if (Number(version.dcPowerKwp) <= 0) {
      fail(
        'DESIGN_NO_MODULES',
        'O dimensionamento precisa conter módulos com potência DC maior que zero.',
        422,
      );
    }
    if (Number(version.acPowerKw) <= 0) {
      fail(
        'DESIGN_NO_INVERTER',
        'O dimensionamento precisa conter inversores com potência AC maior que zero.',
        422,
      );
    }
    if (!version.pricing || Number(version.pricing.finalPrice) <= 0) {
      fail('DESIGN_INVALID_PRICE', 'O preço final calculado deve ser maior que zero.', 422);
    }

    // Regra de Alçada de Margem (SPEC-005 item 9 e 16):
    // Margem mínima padrão da organização: 20%. Margens abaixo exigem justificativa de exceção explícita.
    const grossMarginPercent = Number(version.pricing.grossMarginPercent);
    const MINIMUM_MARGIN_THRESHOLD = 20.0;

    if (grossMarginPercent < MINIMUM_MARGIN_THRESHOLD && !dto.overrideLowMarginReason) {
      fail(
        'LOW_MARGIN_APPROVAL_REQUIRED',
        `A margem bruta de ${grossMarginPercent.toFixed(1)}% está abaixo do limite mínimo da alçada (20.0%). É obrigatório informar justificativa em "overrideLowMarginReason".`,
        422,
        {
          currentMargin: grossMarginPercent,
          requiredThreshold: MINIMUM_MARGIN_THRESHOLD,
        },
      );
    }

    return this.store.transaction(async (tx) => {
      // 1. Marca versões anteriores aprovadas deste design como SUPERSEDED
      await tx.designVersion.updateMany({
        where: { designId: version.designId, status: 'APPROVED' },
        data: { status: 'SUPERSEDED' },
      });

      // 2. Congela esta versão como APPROVED
      const approved = await tx.designVersion.update({
        where: { id: versionId },
        data: {
          status: 'APPROVED',
          approvedById: context.userId,
          approvedAt: new Date(),
          justification: dto.justification ?? dto.overrideLowMarginReason ?? null,
        },
        include: { items: true, additionalCosts: true, pricing: true },
      });

      await this.store.audit(
        tx,
        'DESIGN_VERSION_APPROVED',
        { organizationId: context.organizationId, id: context.id },
        versionId,
        traceId,
      );

      return this.mapVersionToView(approved);
    });
  }

  // ---------------------------------------------------------------------------
  // 6. MOTOR DE CÁLCULO DE CUSTOS, MARKUP E MARGEM (SPEC-005 ITENS 7 E 8)
  // ---------------------------------------------------------------------------

  private async recalculatePricing(
    tx: Tx,
    organizationId: string,
    designVersionId: string,
    markupPercent: number,
    discountAmount = 0,
    contingencyAmount = 0,
  ): Promise<void> {
    const items = await tx.designItem.findMany({ where: { designVersionId } });
    const additionalCosts = await tx.additionalCost.findMany({
      where: { designVersionId, commercialTreatment: 'INCLUDED_IN_PRICE' },
    });

    let directMaterialCost = 0;
    let directServiceCost = 0;

    for (const item of items) {
      const itemCost = Number(item.totalCost);
      if (item.kind === 'MATERIAL') {
        directMaterialCost += itemCost;
      } else {
        directServiceCost += itemCost;
      }
    }

    const additionalCost = additionalCosts.reduce((acc, curr) => acc + Number(curr.amount), 0);
    const baseCost = directMaterialCost + directServiceCost + additionalCost;
    const totalEstimatedCost = round2(baseCost + contingencyAmount);

    // Markup sobre custo: Preço Antes do Desconto = Custo Total * (1 + markup / 100)
    const priceBeforeDiscount = round2(totalEstimatedCost * (1 + markupPercent / 100));

    // Preço Final = Preço Antes do Desconto - Desconto
    const finalPrice = round2(Math.max(0, priceBeforeDiscount - discountAmount));

    // Margem Bruta sobre preço: Margem = Preço Final - Custo Total
    const grossMarginAmount = round2(finalPrice - totalEstimatedCost);
    const grossMarginPercent = finalPrice > 0 ? round2((grossMarginAmount / finalPrice) * 100) : 0;

    await tx.pricingCalculation.upsert({
      where: { designVersionId },
      create: {
        organizationId,
        designVersionId,
        directMaterialCost: round2(directMaterialCost),
        directServiceCost: round2(directServiceCost),
        additionalCost: round2(additionalCost),
        contingencyAmount: round2(contingencyAmount),
        totalEstimatedCost,
        markupPercent: round2(markupPercent),
        priceBeforeDiscount,
        discountAmount: round2(discountAmount),
        finalPrice,
        grossMarginAmount,
        grossMarginPercent,
        status: 'DRAFT',
      },
      update: {
        directMaterialCost: round2(directMaterialCost),
        directServiceCost: round2(directServiceCost),
        additionalCost: round2(additionalCost),
        contingencyAmount: round2(contingencyAmount),
        totalEstimatedCost,
        markupPercent: round2(markupPercent),
        priceBeforeDiscount,
        discountAmount: round2(discountAmount),
        finalPrice,
        grossMarginAmount,
        grossMarginPercent,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // HELPERS DE SERIALIZAÇÃO DE VIEW
  // ---------------------------------------------------------------------------

  private mapDesignToView(design: {
    id: string;
    opportunityId: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    versions: Array<any>;
  }): DesignViewDto {
    const versionViews = design.versions.map((v) => this.mapVersionToView(v));
    const currentVersionNumber =
      versionViews.length > 0 && versionViews[0] ? versionViews[0].versionNumber : 1;

    return {
      id: design.id,
      opportunityId: design.opportunityId,
      name: design.name,
      currentVersionNumber,
      versions: versionViews,
      createdAt: design.createdAt.toISOString(),
      updatedAt: design.updatedAt.toISOString(),
    };
  }

  private mapVersionToView(v: {
    id: string;
    designId: string;
    versionNumber: number;
    basedOnVersionId: string | null;
    status: string;
    systemType: string;
    targetMonthlyGenerationKwh: Prisma.Decimal;
    targetConsumptionKwh: Prisma.Decimal;
    dcPowerKwp: Prisma.Decimal;
    acPowerKw: Prisma.Decimal;
    estimatedMonthlyGenerationKwh: Prisma.Decimal;
    estimatedAnnualGenerationKwh: Prisma.Decimal;
    specificYield: Prisma.Decimal;
    calculationVersion: string;
    assumptionsSnapshot: Prisma.JsonValue;
    approvedById: string | null;
    approvedAt: Date | null;
    justification: string | null;
    createdAt: Date;
    items?: Array<any>;
    additionalCosts?: Array<any>;
    pricing?: any | null;
  }): DesignVersionViewDto {
    const targetKwh = Number(v.targetConsumptionKwh);
    const genKwh = Number(v.estimatedMonthlyGenerationKwh);
    const coveragePercent = targetKwh > 0 ? round2((genKwh / targetKwh) * 100) : 100;

    const items: DesignItemViewDto[] = (v.items ?? []).map((i) => ({
      id: i.id,
      catalogItemId: i.catalogItemId,
      kind: i.kind,
      category: i.category,
      description: i.description,
      unitOfMeasure: i.unitOfMeasure,
      quantity: Number(i.quantity),
      unitCost: Number(i.unitCost),
      totalCost: Number(i.totalCost),
      costSource: i.costSource,
      isOptional: i.isOptional,
      justification: i.justification,
    }));

    const additionalCosts: AdditionalCostViewDto[] = (v.additionalCosts ?? []).map((c) => ({
      id: c.id,
      category: c.category,
      description: c.description,
      amount: Number(c.amount),
      commercialTreatment: c.commercialTreatment,
      justification: c.justification,
    }));

    const pricing: PricingViewDto | null = v.pricing
      ? {
          directMaterialCost: Number(v.pricing.directMaterialCost),
          directServiceCost: Number(v.pricing.directServiceCost),
          additionalCost: Number(v.pricing.additionalCost),
          contingencyAmount: Number(v.pricing.contingencyAmount),
          totalEstimatedCost: Number(v.pricing.totalEstimatedCost),
          markupPercent: Number(v.pricing.markupPercent),
          priceBeforeDiscount: Number(v.pricing.priceBeforeDiscount),
          discountAmount: Number(v.pricing.discountAmount),
          finalPrice: Number(v.pricing.finalPrice),
          grossMarginAmount: Number(v.pricing.grossMarginAmount),
          grossMarginPercent: Number(v.pricing.grossMarginPercent),
          status: v.pricing.status,
        }
      : null;

    return {
      id: v.id,
      designId: v.designId,
      versionNumber: v.versionNumber,
      basedOnVersionId: v.basedOnVersionId,
      status: v.status,
      systemType: v.systemType,
      targetMonthlyGenerationKwh: Number(v.targetMonthlyGenerationKwh),
      targetConsumptionKwh: Number(v.targetConsumptionKwh),
      dcPowerKwp: Number(v.dcPowerKwp),
      acPowerKw: Number(v.acPowerKw),
      estimatedMonthlyGenerationKwh: Number(v.estimatedMonthlyGenerationKwh),
      estimatedAnnualGenerationKwh: Number(v.estimatedAnnualGenerationKwh),
      coveragePercent,
      specificYield: Number(v.specificYield),
      calculationVersion: v.calculationVersion,
      assumptionsSnapshot: v.assumptionsSnapshot as Record<string, unknown>,
      approvedById: v.approvedById,
      approvedAt: v.approvedAt ? v.approvedAt.toISOString() : null,
      justification: v.justification,
      items,
      additionalCosts,
      pricing,
      createdAt: v.createdAt.toISOString(),
    };
  }
}
