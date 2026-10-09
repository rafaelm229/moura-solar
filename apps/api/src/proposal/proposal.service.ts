import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PdfService } from './pdf.service';
import { StorageService } from './storage.service';
import {
  CreateProposalDto,
  UpdateProposalDraftDto,
  RecordProposalDeliveryDto,
  RecordProposalAcceptanceDto,
  RecordProposalRejectionDto,
} from './proposal.dto';
import { createHash, randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../database/audit.service';
import type {
  ActivityCreatedEventV1,
  ProposalAcceptedEventV1,
  ProposalCreatedEventV1,
  ProposalDeliveredEventV1,
  ProposalRejectedEventV1,
  ProposalVersionCreatedEventV1,
} from '@moura-solar/contracts';

const proposalStatusLabels: Record<string, string> = {
  DRAFT: 'rascunho',
  PENDING_APPROVAL: 'aguardando aprovação',
  APPROVED: 'aprovada para geração',
  GENERATING: 'em geração',
  READY: 'pronta para envio',
  SENT: 'enviada ao cliente',
  VIEWED: 'visualizada pelo cliente',
  ACCEPTED: 'aceita',
  REJECTED: 'recusada',
  EXPIRED: 'vencida',
  SUPERSEDED: 'substituída',
  CANCELED: 'cancelada',
  GENERATION_FAILED: 'falha ao gerar o documento',
};

@Injectable()
export class ProposalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
    private readonly storageService: StorageService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async createProposal(
    organizationId: string,
    userId: string,
    dto: CreateProposalDto,
    correlationId: string,
  ) {
    // 1. Fetch Opportunity
    const opportunity = await this.prisma.opportunity.findFirst({
      where: { id: dto.opportunityId, organizationId },
      include: {
        customer: {
          include: {
            contacts: true,
            addresses: true,
          },
        },
        utilityUnit: true,
        owner: true,
      },
    });

    if (!opportunity) {
      throw new NotFoundException('Oportunidade não encontrada');
    }

    // 2. Fetch DesignVersion
    const designVersion = await this.prisma.designVersion.findFirst({
      where: { id: dto.designVersionId, organizationId },
      include: {
        design: true,
        pricing: true,
        items: {
          include: { catalogItem: true },
        },
        additionalCosts: true,
      },
    });

    if (!designVersion) {
      throw new NotFoundException('Versão de dimensionamento não encontrada');
    }

    // SPEC-006: Only APPROVED design versions can be converted to official proposal
    if (designVersion.status !== 'APPROVED') {
      throw new UnprocessableEntityException(
        'Apenas dimensionamentos com status APROVADO podem ser convertidos em proposta comercial oficial',
      );
    }

    if (!designVersion.pricing) {
      throw new UnprocessableEntityException(
        'O dimensionamento selecionado não possui cálculo de precificação associado',
      );
    }

    // 3. Fetch Readings for energy diagnostic
    const readings = opportunity.utilityUnitId
      ? await this.prisma.energyReading.findMany({
          where: { utilityUnitId: opportunity.utilityUnitId, organizationId },
          orderBy: { referenceMonth: 'asc' },
        })
      : [];

    const validMonthsCount = readings.length;
    const historyIsIncomplete = validMonthsCount < 12;
    const totalKwh = readings.reduce((sum, r) => sum + Number(r.consumptionKwh), 0);
    const averageMonthlyConsumptionKwh =
      validMonthsCount > 0
        ? totalKwh / validMonthsCount
        : Number(designVersion.targetConsumptionKwh);
    const annualizedConsumptionKwh = averageMonthlyConsumptionKwh * 12;

    // 4. Group modules and inverters descriptions
    const modules = designVersion.items.filter((i) => i.category === 'MODULE');
    const inverters = designVersion.items.filter((i) => i.category === 'INVERTER');

    const modulesDescription =
      modules.length > 0
        ? modules
            .map((m) => `${Number(m.quantity)}x ${m.catalogItem?.name ?? m.description}`)
            .join(' + ')
        : `${Math.round(Number(designVersion.dcPowerKwp) * 1.8)} módulos fotovoltaicos monocristalinos de fabricantes classificados como nível 1`;

    const invertersDescription =
      inverters.length > 0
        ? inverters
            .map((inv) => `${Number(inv.quantity)}x ${inv.catalogItem?.name ?? inv.description}`)
            .join(' + ')
        : `Inversor solar de ${designVersion.acPowerKw.toFixed(1)} kW conectado à rede e homologado`;

    // 5. Build Snapshots
    const tariff = 0.95; // Default reference tariff
    const estimatedMonthlySavingsBrl = Math.round(
      Number(designVersion.estimatedMonthlyGenerationKwh) * tariff,
    );
    const estimatedAnnualSavingsBrl = estimatedMonthlySavingsBrl * 12;

    const primaryPhone =
      opportunity.customer.contacts.find((c) => c.type === 'PHONE' || c.type === 'WHATSAPP')
        ?.value ?? null;
    const primaryEmail =
      opportunity.customer.contacts.find((c) => c.type === 'EMAIL')?.value ?? null;
    const primaryAddr = opportunity.customer.addresses[0] ?? null;

    const customerSnapshot = {
      id: opportunity.customer.id,
      legalName: opportunity.customer.legalName,
      taxId: opportunity.customer.taxId,
      phone: primaryPhone,
      email: primaryEmail,
      address: primaryAddr?.street ? `${primaryAddr.street}, ${primaryAddr.number ?? 'S/N'}` : null,
      city: primaryAddr?.city ?? null,
      state: primaryAddr?.state ?? null,
    };

    const utilityUnitSnapshot = {
      id: opportunity.utilityUnit?.id ?? null,
      code: opportunity.utilityUnit?.externalCode ?? 'NÃO INFORMADA',
      distributor: opportunity.utilityUnit?.distributorName ?? 'Distribuidora Local',
      connectionType: opportunity.utilityUnit?.connectionType ?? 'BIPHASIC',
      voltage: opportunity.utilityUnit?.voltage ?? '220V',
    };

    const technicalSnapshot = {
      dcPowerKwp: Number(designVersion.dcPowerKwp),
      acPowerKw: Number(designVersion.acPowerKw),
      estimatedMonthlyGenerationKwh: Number(designVersion.estimatedMonthlyGenerationKwh),
      estimatedAnnualGenerationKwh: Number(designVersion.estimatedAnnualGenerationKwh),
      systemType: designVersion.systemType,
      modulesDescription,
      invertersDescription,
      energyDiagnostic: {
        averageMonthlyConsumptionKwh,
        annualizedConsumptionKwh,
        validMonthsCount,
        historyIsIncomplete,
      },
    };

    const commercialSnapshot = {
      finalPrice: Number(designVersion.pricing.finalPrice),
      estimatedMonthlySavingsBrl,
      estimatedAnnualSavingsBrl,
      scopeItems: [
        'Projeto de Engenharia e Responsabilidade Técnica (ART/TRT)',
        'Homologação junto à concessionária de energia até aprovação e troca do medidor',
        'Fornecimento de módulos, inversores, estruturas de fixação e cabeamento solar',
        'Montagem eletromecânica completa por equipe certificada em NR-10 e NR-35',
        'Comissionamento, testes elétricos de conformidade e ativação do sistema',
        'Configuração do aplicativo de monitoramento de geração solar em tempo real',
      ],
    };

    // Calculate content hash of snapshot
    const contentHash = createHash('sha256')
      .update(
        JSON.stringify({
          customerSnapshot,
          utilityUnitSnapshot,
          technicalSnapshot,
          commercialSnapshot,
          finalPrice: Number(designVersion.pricing.finalPrice),
        }),
      )
      .digest('hex');

    // 6. Persist Proposal and ProposalVersion (v1) with transactional code generation and retry
    const validityDays = dto.validityDays ?? 10;
    let attempts = 0;
    let created: { proposal: any; version: any };

    while (true) {
      try {
        created = await this.prisma.$transaction(async (tx) => {
          const count = await tx.proposal.count({ where: { organizationId } });
          const code = `PROP-${(count + 1).toString().padStart(4, '0')}`;

          const prop = await tx.proposal.create({
            data: {
              organizationId,
              opportunityId: opportunity.id,
              code,
            },
          });

          const version = await tx.proposalVersion.create({
            data: {
              organizationId,
              proposalId: prop.id,
              versionNumber: 1,
              designVersionId: designVersion.id,
              status: 'DRAFT',
              customerSnapshot,
              utilityUnitSnapshot,
              technicalSnapshot,
              commercialSnapshot,
              validityDays,
              currency: 'BRL',
              finalPrice: designVersion.pricing!.finalPrice,
              paymentConditions: (dto.paymentConditions as any) ?? {
                standard: 'À vista com 5% de desconto ou Financiamento Solar Bancário em até 84x',
              },
              observations: dto.observations,
              contentHash,
              createdById: userId,
            },
          });

          await this.audit.record(
            {
              organizationId,
              actorId: userId,
              action: 'PROPOSAL_CREATED',
              entityId: prop.id,
            },
            tx,
          );

          const event: ProposalCreatedEventV1 = {
            eventId: randomUUID(),
            eventType: 'PROPOSAL_CREATED',
            schemaVersion: 1,
            occurredAt: prop.createdAt.toISOString(),
            organizationId,
            aggregateId: prop.id,
            producer: 'proposal',
            correlationId,
            payload: {
              proposalId: prop.id,
              proposalVersionId: version.id,
              opportunityId: opportunity.id,
            },
          };

          await tx.integrationOutbox.create({
            data: {
              id: event.eventId,
              organizationId: event.organizationId,
              eventType: event.eventType,
              schemaVersion: event.schemaVersion,
              aggregateType: 'Proposal',
              aggregateId: event.aggregateId,
              producer: event.producer,
              correlationId: event.correlationId,
              occurredAt: prop.createdAt,
              payload: event.payload,
              dedupeKey: `PROPOSAL_CREATED:${prop.id}`,
            },
          });

          return { proposal: prop, version };
        });
        break;
      } catch (err: any) {
        if (err.code === 'P2002' && attempts < 5) {
          attempts++;
          continue;
        }
        throw err;
      }
    }

    // 7. Generate and store PDF immediately so the document is READY
    await this.generatePdf(organizationId, created.version.id);

    return this.getProposal(organizationId, created.proposal.id);
  }

  async getProposal(organizationId: string, proposalId: string) {
    const proposal = await this.prisma.proposal.findFirst({
      where: { id: proposalId, organizationId },
      include: {
        opportunity: {
          include: {
            customer: true,
            utilityUnit: true,
            owner: true,
          },
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: {
            documents: true,
            deliveries: {
              include: { sentBy: true },
              orderBy: { sentAt: 'desc' },
            },
            acceptance: {
              include: { recordedBy: true },
            },
            designVersion: true,
          },
        },
      },
    });

    if (!proposal) {
      throw new NotFoundException('Proposta comercial não encontrada');
    }

    return proposal;
  }

  async listProposals(organizationId: string, opportunityId?: string) {
    return this.prisma.proposal.findMany({
      where: {
        organizationId,
        ...(opportunityId ? { opportunityId } : {}),
      },
      include: {
        opportunity: {
          include: {
            customer: true,
            owner: true,
          },
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: {
            documents: true,
            deliveries: {
              include: { sentBy: true },
              orderBy: { sentAt: 'desc' },
            },
            acceptance: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateDraft(organizationId: string, versionId: string, dto: UpdateProposalDraftDto) {
    const version = await this.prisma.proposalVersion.findFirst({
      where: { id: versionId, organizationId },
    });

    if (!version) {
      throw new NotFoundException('Versão da proposta não encontrada');
    }

    if (version.status !== 'DRAFT') {
      throw new UnprocessableEntityException(
        'Apenas propostas em status RASCUNHO (DRAFT) podem ter condições editadas',
      );
    }

    if (version.version !== dto.expectedVersion) {
      throw new ConflictException(
        'A versão da proposta foi modificada simultaneamente por outro usuário',
      );
    }

    const updated = await this.prisma.proposalVersion.update({
      where: { id: versionId },
      data: {
        validityDays: dto.validityDays ?? version.validityDays,
        paymentConditions: (dto.paymentConditions as any) ?? version.paymentConditions,
        observations: dto.observations !== undefined ? dto.observations : version.observations,
        version: { increment: 1 },
      },
    });

    // Re-generate PDF with updated draft terms
    await this.generatePdf(organizationId, versionId);

    return updated;
  }

  async generatePdf(organizationId: string, versionId: string) {
    const version = await this.prisma.proposalVersion.findFirst({
      where: { id: versionId, organizationId },
      include: {
        proposal: {
          include: {
            opportunity: {
              include: {
                customer: true,
                utilityUnit: true,
                owner: true,
              },
            },
          },
        },
      },
    });

    if (!version) {
      throw new NotFoundException('Versão de proposta não encontrada');
    }

    const customerSnapshot = version.customerSnapshot as any;
    const utilityUnitSnapshot = version.utilityUnitSnapshot as any;
    const technicalSnapshot = version.technicalSnapshot as any;
    const commercialSnapshot = version.commercialSnapshot as any;

    const issueDate = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date());
    const validUntilDate = version.validUntil
      ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(
          new Date(version.validUntil),
        )
      : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(
          new Date(Date.now() + version.validityDays * 86400000),
        );

    // Build PDF payload
    const pdfData = {
      proposalCode: version.proposal.code,
      versionNumber: version.versionNumber,
      issueDate,
      validUntil: validUntilDate,
      sellerName: version.proposal.opportunity.owner.name,
      sellerEmail: version.proposal.opportunity.owner.email,
      customer: {
        legalName: customerSnapshot.legalName,
        taxId: customerSnapshot.taxId,
        email: customerSnapshot.email,
        phone: customerSnapshot.phone,
        address: customerSnapshot.address,
        city: customerSnapshot.city,
        state: customerSnapshot.state,
      },
      utilityUnit: {
        code: utilityUnitSnapshot.code,
        distributor: utilityUnitSnapshot.distributor,
        connectionType: utilityUnitSnapshot.connectionType,
        voltage: utilityUnitSnapshot.voltage,
      },
      energyDiagnostic: technicalSnapshot.energyDiagnostic ?? {
        averageMonthlyConsumptionKwh: 500,
        annualizedConsumptionKwh: 6000,
        validMonthsCount: 12,
        historyIsIncomplete: false,
      },
      technicalSolution: {
        dcPowerKwp: technicalSnapshot.dcPowerKwp,
        acPowerKw: technicalSnapshot.acPowerKw,
        estimatedMonthlyGenerationKwh: technicalSnapshot.estimatedMonthlyGenerationKwh,
        estimatedAnnualGenerationKwh: technicalSnapshot.estimatedAnnualGenerationKwh,
        systemType: technicalSnapshot.systemType ?? 'ON_GRID',
        modulesDescription: technicalSnapshot.modulesDescription,
        invertersDescription: technicalSnapshot.invertersDescription,
      },
      economicBenefit: {
        estimatedMonthlySavingsBrl: commercialSnapshot.estimatedMonthlySavingsBrl ?? 0,
        estimatedAnnualSavingsBrl: commercialSnapshot.estimatedAnnualSavingsBrl ?? 0,
      },
      scopeItems: commercialSnapshot.scopeItems ?? [],
      investment: {
        finalPriceBrl: Number(version.finalPrice),
        paymentConditionsNotes:
          (version.paymentConditions as any)?.standard ??
          'À vista com desconto especial ou Financiamento Solar Bancário em até 84 parcelas.',
      },
    };

    const generated = await this.pdfService.generateProposalPdf(pdfData);

    const bucket = this.config.get<string>('S3_BUCKET') ?? 'moura-solar-proposals';
    const key = `proposals/${version.proposalId}/${version.id}/proposta-${version.proposal.code}-v${version.versionNumber}.pdf`;

    await this.storageService.upload(bucket, key, generated.buffer, 'application/pdf');

    // Register / update document record
    const doc = await this.prisma.proposalDocument.upsert({
      where: {
        id:
          (
            await this.prisma.proposalDocument.findFirst({
              where: { proposalVersionId: version.id },
            })
          )?.id ?? '00000000-0000-0000-0000-000000000000',
      },
      create: {
        organizationId,
        proposalVersionId: version.id,
        type: 'PDF_PROPOSAL',
        fileName: `proposta-${version.proposal.code}-v${version.versionNumber}.pdf`,
        fileSize: generated.fileSize,
        mimeType: 'application/pdf',
        s3Bucket: bucket,
        s3Key: key,
        contentHash: generated.contentHash,
        generationStatus: 'READY',
      },
      update: {
        fileSize: generated.fileSize,
        contentHash: generated.contentHash,
        generationStatus: 'READY',
        generatedAt: new Date(),
      },
    });

    if (version.status === 'DRAFT') {
      await this.prisma.proposalVersion.update({
        where: { id: version.id },
        data: { status: 'READY' },
      });
    }

    return doc;
  }

  async recordDelivery(
    organizationId: string,
    versionId: string,
    userId: string,
    dto: RecordProposalDeliveryDto,
    correlationId: string,
  ) {
    const version = await this.prisma.proposalVersion.findFirst({
      where: { id: versionId, organizationId },
      include: {
        proposal: {
          include: {
            opportunity: true,
          },
        },
        documents: true,
      },
    });

    if (!version) {
      throw new NotFoundException('Versão da proposta não encontrada');
    }

    // SPEC-006 item 20: Delivery requires ready document
    if (version.documents.length === 0) {
      throw new UnprocessableEntityException(
        'Não é possível registrar envio sem documento PDF gerado e pronto',
      );
    }

    const sentAt = new Date();
    const validUntil = new Date(sentAt.getTime() + version.validityDays * 86400000);

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Record delivery
      const delivery = await tx.proposalDelivery.create({
        data: {
          organizationId,
          proposalVersionId: version.id,
          channel: dto.channel,
          recipient: dto.recipient,
          status: 'SENT',
          sentById: userId,
          sentAt,
          notes: dto.notes,
        },
      });

      // 2. Update version status and explicit validUntil if not set
      const updatedVersion = await tx.proposalVersion.update({
        where: { id: version.id },
        data: {
          status: 'SENT',
          validUntil: version.validUntil ?? validUntil,
        },
      });

      // 3. Advance opportunity to PROPOSTA_APRESENTADA (Gate B) if applicable
      const opp = version.proposal.opportunity;
      if (
        opp.state === 'NOVO' ||
        opp.state === 'NOVA' ||
        opp.state === 'CONTATO_INICIAL' ||
        opp.state === 'QUALIFICACAO' ||
        opp.state === 'VISITA_TECNICA' ||
        opp.state === 'DIMENSIONAMENTO'
      ) {
        await tx.opportunity.update({
          where: { id: opp.id },
          data: {
            state: 'PROPOSTA_APRESENTADA',
            version: { increment: 1 },
          },
        });

        await tx.opportunityTransition.create({
          data: {
            opportunityId: opp.id,
            fromState: opp.state,
            toState: 'PROPOSTA_APRESENTADA',
            command: 'REGISTRAR_ENVIO_PROPOSTA',
            actorId: userId,
            justification: `Proposta ${version.proposal.code} v${version.versionNumber} enviada via ${dto.channel}`,
          },
        });
      }

      // 4. Create automatic follow-up activity
      const followUpDueAt = new Date(sentAt.getTime() + 2 * 86400000); // 2 days
      const followUpActivity = await tx.activity.create({
        data: {
          organizationId,
          opportunityId: opp.id,
          customerId: opp.customerId,
          type: 'FOLLOW_UP',
          subject: `Acompanhar proposta ${version.proposal.code}, versão ${version.versionNumber}`,
          description: `Acompanhar análise da proposta comercial enviada via ${dto.channel} ao cliente. Validade: ${new Intl.DateTimeFormat('pt-BR').format(validUntil)}.`,
          assigneeUserId: opp.ownerUserId,
          dueAt: followUpDueAt,
          status: 'OPEN',
        },
      });

      // 5. Audit event
      const deliveryAudit = await this.audit.record(
        {
          organizationId,
          actorId: userId,
          action: 'PROPOSAL_DELIVERED',
          entityId: version.proposal.id,
        },
        tx,
      );

      const event: ProposalDeliveredEventV1 = {
        eventId: randomUUID(),
        eventType: 'PROPOSAL_DELIVERED',
        schemaVersion: 1,
        occurredAt: delivery.sentAt.toISOString(),
        organizationId,
        aggregateId: version.proposal.id,
        producer: 'proposal',
        correlationId,
        payload: {
          proposalId: version.proposal.id,
          proposalVersionId: version.id,
          deliveryId: delivery.id,
          opportunityId: opp.id,
        },
      };

      await tx.integrationOutbox.create({
        data: {
          id: event.eventId,
          organizationId: event.organizationId,
          eventType: event.eventType,
          schemaVersion: event.schemaVersion,
          aggregateType: 'Proposal',
          aggregateId: event.aggregateId,
          producer: event.producer,
          correlationId: event.correlationId,
          occurredAt: delivery.sentAt,
          payload: event.payload,
          dedupeKey: `PROPOSAL_DELIVERED:${delivery.id}`,
        },
      });

      const activityEvent: ActivityCreatedEventV1 = {
        eventId: randomUUID(),
        eventType: 'ACTIVITY_CREATED',
        schemaVersion: 1,
        occurredAt: deliveryAudit.createdAt.toISOString(),
        organizationId,
        aggregateId: followUpActivity.id,
        producer: 'crm',
        correlationId,
        payload: {
          activityId: followUpActivity.id,
          auditEventId: deliveryAudit.id,
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
          occurredAt: deliveryAudit.createdAt,
          payload: activityEvent.payload,
          dedupeKey: `ACTIVITY_CREATED:${deliveryAudit.id}:${followUpActivity.id}`,
        },
      });

      return { delivery, version: updatedVersion };
    });

    return result;
  }

  async recordAcceptance(
    organizationId: string,
    versionId: string,
    userId: string,
    dto: RecordProposalAcceptanceDto,
    correlationId: string,
  ) {
    const acceptedAt = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Fetch version and check inside transaction to prevent TOCTOU race conditions
      const version = await tx.proposalVersion.findFirst({
        where: { id: versionId, organizationId },
        include: {
          proposal: {
            include: {
              opportunity: true,
            },
          },
        },
      });

      if (!version) {
        throw new NotFoundException('Versão de proposta não encontrada');
      }

      // SPEC-006 item 19: Only ONE version can be accepted per opportunity
      const existingAccepted = await tx.proposal.findFirst({
        where: {
          opportunityId: version.proposal.opportunityId,
          acceptedVersionId: { not: null },
        },
      });

      if (existingAccepted) {
        throw new ConflictException(
          'Esta oportunidade já possui uma proposta comercial aceita formalmente',
        );
      }

      // SPEC-006: Version must be SENT or VIEWED to be accepted
      if (version.status !== 'SENT' && version.status !== 'VIEWED') {
        throw new UnprocessableEntityException(
          `O aceite só pode ser registrado depois que a proposta for enviada ao cliente. Situação atual: ${proposalStatusLabels[version.status] ?? 'indisponível'}.`,
        );
      }

      // Check expiration
      if (version.validUntil && new Date(version.validUntil).getTime() < Date.now()) {
        throw new UnprocessableEntityException(
          `Esta proposta expirou em ${new Intl.DateTimeFormat('pt-BR').format(new Date(version.validUntil))} e não pode ser aceita sem renovação`,
        );
      }

      // 2. Record Acceptance
      const acceptance = await tx.proposalAcceptance.create({
        data: {
          organizationId,
          proposalVersionId: version.id,
          method: dto.method,
          acceptedByName: dto.acceptedByName,
          acceptedAt,
          recordedById: userId,
          notes: dto.notes,
        },
      });

      // 3. Mark this version ACCEPTED
      await tx.proposalVersion.update({
        where: { id: version.id },
        data: { status: 'ACCEPTED' },
      });

      // 4. Update proposal acceptedVersionId
      await tx.proposal.update({
        where: { id: version.proposalId },
        data: { acceptedVersionId: version.id },
      });

      // 5. Mark all other open versions of the proposal as SUPERSEDED
      await tx.proposalVersion.updateMany({
        where: {
          proposalId: version.proposalId,
          id: { not: version.id },
          status: { in: ['DRAFT', 'READY', 'SENT', 'VIEWED'] },
        },
        data: { status: 'SUPERSEDED' },
      });

      // 6. Advance Opportunity state to CONTRATACAO
      const opp = version.proposal.opportunity;
      await tx.opportunity.update({
        where: { id: opp.id },
        data: {
          state: 'CONTRATACAO',
          version: { increment: 1 },
        },
      });

      await tx.opportunityTransition.create({
        data: {
          opportunityId: opp.id,
          fromState: opp.state,
          toState: 'CONTRATACAO',
          command: 'ACEITAR_PROPOSTA_COMERCIAL',
          actorId: userId,
          justification: `Proposta ${version.proposal.code} v${version.versionNumber} aceita por ${dto.acceptedByName} via ${dto.method}`,
        },
      });

      // 7. Create contract formalization activity
      await tx.activity.create({
        data: {
          organizationId,
          opportunityId: opp.id,
          customerId: opp.customerId,
          type: 'MEETING',
          subject: `Formalização Contratual: Proposta ${version.proposal.code}`,
          description: `Elaboração e coleta de assinaturas do contrato para o sistema fotovoltaico de R$ ${Number(version.finalPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Aceite registrado por ${dto.acceptedByName}.`,
          assigneeUserId: opp.ownerUserId,
          dueAt: new Date(acceptedAt.getTime() + 2 * 86400000),
          status: 'OPEN',
        },
      });

      // 8. Audit event
      await this.audit.record(
        {
          organizationId,
          actorId: userId,
          action: 'PROPOSAL_ACCEPTED',
          entityId: version.proposalId,
        },
        tx,
      );

      const eventId = randomUUID();
      const event: ProposalAcceptedEventV1 = {
        eventId,
        eventType: 'PROPOSAL_ACCEPTED',
        schemaVersion: 1,
        occurredAt: acceptedAt.toISOString(),
        organizationId,
        aggregateId: version.proposalId,
        producer: 'proposal',
        correlationId,
        payload: {
          acceptanceId: acceptance.id,
          proposalVersionId: version.id,
          opportunityId: opp.id,
        },
      };

      await tx.integrationOutbox.create({
        data: {
          id: event.eventId,
          organizationId: event.organizationId,
          eventType: event.eventType,
          schemaVersion: event.schemaVersion,
          aggregateType: 'Proposal',
          aggregateId: event.aggregateId,
          producer: event.producer,
          correlationId: event.correlationId,
          occurredAt: acceptedAt,
          payload: event.payload,
          dedupeKey: `PROPOSAL_ACCEPTED:${acceptance.id}`,
        },
      });

      return acceptance;
    });

    return result;
  }

  async recordRejection(
    organizationId: string,
    versionId: string,
    userId: string,
    dto: RecordProposalRejectionDto,
    correlationId: string,
  ) {
    const version = await this.prisma.proposalVersion.findFirst({
      where: { id: versionId, organizationId },
      include: { proposal: { select: { opportunityId: true } } },
    });

    if (!version) {
      throw new NotFoundException('Versão de proposta não encontrada');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.proposalVersion.update({
        where: { id: version.id },
        data: {
          status: 'REJECTED',
          observations: version.observations
            ? `${version.observations} | Recusa: ${dto.reason}`
            : `Recusa: ${dto.reason}`,
        },
      });

      const rejection = await this.audit.record(
        {
          organizationId,
          actorId: userId,
          action: 'PROPOSAL_REJECTED',
          entityId: version.proposalId,
          traceId: correlationId,
        },
        tx,
      );

      const event: ProposalRejectedEventV1 = {
        eventId: randomUUID(),
        eventType: 'PROPOSAL_REJECTED',
        schemaVersion: 1,
        occurredAt: rejection.createdAt.toISOString(),
        organizationId,
        aggregateId: version.proposalId,
        producer: 'proposal',
        correlationId,
        payload: {
          rejectionId: rejection.id,
          proposalId: version.proposalId,
          proposalVersionId: version.id,
          opportunityId: version.proposal.opportunityId,
        },
      };

      await tx.integrationOutbox.create({
        data: {
          id: event.eventId,
          organizationId: event.organizationId,
          eventType: event.eventType,
          schemaVersion: event.schemaVersion,
          aggregateType: 'Proposal',
          aggregateId: event.aggregateId,
          producer: event.producer,
          correlationId: event.correlationId,
          occurredAt: rejection.createdAt,
          payload: event.payload,
          dedupeKey: `PROPOSAL_REJECTED:${rejection.id}`,
        },
      });

      return updated;
    });

    return result;
  }

  async createNextVersion(
    organizationId: string,
    versionId: string,
    userId: string,
    correlationId: string,
  ) {
    const baseVersion = await this.prisma.proposalVersion.findFirst({
      where: { id: versionId, organizationId },
      include: { proposal: true },
    });

    if (!baseVersion) {
      throw new NotFoundException('Versão base da proposta não encontrada');
    }

    let attempts = 0;
    let nextVersion: any;

    while (true) {
      try {
        nextVersion = await this.prisma.$transaction(async (tx) => {
          const maxVersion = await tx.proposalVersion.findFirst({
            where: { proposalId: baseVersion.proposalId },
            orderBy: { versionNumber: 'desc' },
          });
          const nextNumber = (maxVersion?.versionNumber ?? baseVersion.versionNumber) + 1;

          const created = await tx.proposalVersion.create({
            data: {
              organizationId,
              proposalId: baseVersion.proposalId,
              versionNumber: nextNumber,
              designVersionId: baseVersion.designVersionId,
              basedOnVersionId: baseVersion.id,
              status: 'DRAFT',
              customerSnapshot: baseVersion.customerSnapshot as any,
              utilityUnitSnapshot: baseVersion.utilityUnitSnapshot as any,
              technicalSnapshot: baseVersion.technicalSnapshot as any,
              commercialSnapshot: baseVersion.commercialSnapshot as any,
              validityDays: baseVersion.validityDays,
              currency: baseVersion.currency,
              finalPrice: baseVersion.finalPrice,
              paymentConditions: baseVersion.paymentConditions as any,
              observations: baseVersion.observations,
              contentHash: baseVersion.contentHash,
              createdById: userId,
            },
          });

          await this.audit.record(
            {
              organizationId,
              actorId: userId,
              action: 'PROPOSAL_VERSION_CREATED',
              entityId: baseVersion.proposalId,
            },
            tx,
          );

          const event: ProposalVersionCreatedEventV1 = {
            eventId: randomUUID(),
            eventType: 'PROPOSAL_VERSION_CREATED',
            schemaVersion: 1,
            occurredAt: created.createdAt.toISOString(),
            organizationId,
            aggregateId: baseVersion.proposalId,
            producer: 'proposal',
            correlationId,
            payload: {
              proposalId: baseVersion.proposalId,
              proposalVersionId: created.id,
              basedOnVersionId: baseVersion.id,
              opportunityId: baseVersion.proposal.opportunityId,
            },
          };

          await tx.integrationOutbox.create({
            data: {
              id: event.eventId,
              organizationId: event.organizationId,
              eventType: event.eventType,
              schemaVersion: event.schemaVersion,
              aggregateType: 'Proposal',
              aggregateId: event.aggregateId,
              producer: event.producer,
              correlationId: event.correlationId,
              occurredAt: created.createdAt,
              payload: event.payload,
              dedupeKey: `PROPOSAL_VERSION_CREATED:${created.id}`,
            },
          });

          return created;
        });
        break;
      } catch (err: any) {
        if (err.code === 'P2002' && attempts < 5) {
          attempts++;
          continue;
        }
        throw err;
      }
    }

    // Generate PDF for the new version
    await this.generatePdf(organizationId, nextVersion.id);

    return this.getProposal(organizationId, baseVersion.proposalId);
  }

  async getPdfBuffer(organizationId: string, versionId: string) {
    const version = await this.prisma.proposalVersion.findFirst({
      where: { id: versionId, organizationId },
      include: {
        documents: true,
        proposal: true,
      },
    });

    if (!version) {
      throw new NotFoundException('Versão de proposta não encontrada');
    }

    let doc = version.documents.find((d) => d.generationStatus === 'READY');
    if (!doc) {
      // Auto-generate if missing
      doc = await this.generatePdf(organizationId, versionId);
    }

    const buffer = await this.storageService.download(doc.s3Bucket, doc.s3Key);
    return {
      buffer,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
      contentHash: doc.contentHash,
    };
  }
}
