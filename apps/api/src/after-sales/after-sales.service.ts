import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  AcceptServiceVisitQuoteDto,
  ClaimStatus,
  CreateMonitoringSystemDto,
  CreateServiceVisitQuoteDto,
  CreateSupportInteractionDto,
  CreateSupportTicketDto,
  CreateWarrantyClaimDto,
  CreateWarrantyCoverageDto,
  InteractionKind,
  RecordConnectivityIncidentDto,
  RecordMonitoringReadingDto,
  RestoreConnectivityIncidentDto,
  TicketCoverage,
  TicketPriority,
  TicketStatus,
  TriageSupportTicketDto,
  UpdateSupportTicketStatusDto,
  UpdateWarrantyClaimDto,
} from './after-sales.dto';

@Injectable()
export class AfterSalesService {
  constructor(private readonly db: PrismaService) {}

  // ==========================================
  // TICKETS / CHAMADOS
  // ==========================================

  private calculateSlaDueAt(priority: TicketPriority = TicketPriority.MEDIUM): Date {
    const now = new Date();
    switch (priority) {
      case TicketPriority.CRITICAL:
        return new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours
      case TicketPriority.HIGH:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
      case TicketPriority.LOW:
        return new Date(now.getTime() + 72 * 60 * 60 * 1000); // 72 hours
      case TicketPriority.MEDIUM:
      default:
        return new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours
    }
  }

  async createSupportTicket(organizationId: string, authorId: string, dto: CreateSupportTicketDto) {
    const customer = await this.db.customer.findFirst({
      where: { id: dto.customerId, organizationId },
    });
    if (!customer) {
      throw new NotFoundException('Cliente não encontrado.');
    }

    if (dto.projectId) {
      const project = await this.db.operationalProject.findFirst({
        where: { id: dto.projectId, organizationId },
      });
      if (!project) {
        throw new NotFoundException('Projeto operacional não encontrado.');
      }
    }

    const currentYear = new Date().getFullYear();
    const count = await this.db.supportTicket.count({
      where: { organizationId },
    });
    const ticketNumber = `TK-${currentYear}-${(count + 1).toString().padStart(4, '0')}`;

    const priority = dto.priority || TicketPriority.MEDIUM;
    const slaDueAt = this.calculateSlaDueAt(priority);

    return this.db.$transaction(async (tx: Prisma.TransactionClient) => {
      const ticket = await tx.supportTicket.create({
        data: {
          organizationId,
          ticketNumber,
          customerId: dto.customerId,
          projectId: dto.projectId,
          type: dto.type,
          priority,
          channel: dto.channel || 'WHATSAPP',
          title: dto.title,
          description: dto.description,
          probableCoverage: dto.probableCoverage || TicketCoverage.PENDING,
          slaDueAt,
          status: TicketStatus.OPEN,
        },
      });

      await tx.supportInteraction.create({
        data: {
          organizationId,
          ticketId: ticket.id,
          kind: InteractionKind.NOTE,
          visibility: 'INTERNAL',
          body: `Chamado registrado via canal ${ticket.channel}. Prioridade: ${priority}. SLA previsto: ${slaDueAt.toISOString()}.`,
          authorId,
        },
      });

      return tx.supportTicket.findUniqueOrThrow({
        where: { id: ticket.id },
        include: {
          customer: true,
          project: true,
          assignedTo: true,
          assignedTeam: true,
          interactions: { orderBy: { occurredAt: 'asc' }, include: { author: true } },
          warrantyClaims: true,
          serviceVisitQuotes: true,
        },
      });
    });
  }

  async listSupportTickets(
    organizationId: string,
    filters: {
      status?: string;
      priority?: string;
      customerId?: string;
      projectId?: string;
      search?: string;
    },
  ) {
    const where: any = { organizationId };

    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.priority) {
      where.priority = filters.priority;
    }
    if (filters.customerId) {
      where.customerId = filters.customerId;
    }
    if (filters.projectId) {
      where.projectId = filters.projectId;
    }
    if (filters.search) {
      where.OR = [
        { ticketNumber: { contains: filters.search, mode: 'insensitive' } },
        { title: { contains: filters.search, mode: 'insensitive' } },
        { customer: { legalName: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    return this.db.supportTicket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        project: true,
        assignedTo: true,
        assignedTeam: true,
        interactions: { orderBy: { occurredAt: 'asc' }, include: { author: true } },
        warrantyClaims: true,
        serviceVisitQuotes: true,
      },
    });
  }

  async getSupportTicket(organizationId: string, id: string) {
    const ticket = await this.db.supportTicket.findFirst({
      where: { id, organizationId },
      include: {
        customer: true,
        project: true,
        assignedTo: true,
        assignedTeam: true,
        interactions: { orderBy: { occurredAt: 'asc' }, include: { author: true } },
        warrantyClaims: { include: { coverage: true, supplier: true } },
        serviceVisitQuotes: { include: { workOrder: true, receivable: true } },
        connectivityIncidents: true,
      },
    });
    if (!ticket) {
      throw new NotFoundException('Chamado não encontrado.');
    }
    return ticket;
  }

  async triageTicket(
    organizationId: string,
    actorId: string,
    id: string,
    dto: TriageSupportTicketDto,
  ) {
    const ticket = await this.getSupportTicket(organizationId, id);

    return this.db.$transaction(async (tx: Prisma.TransactionClient) => {
      const updateData: any = {
        version: ticket.version + 1,
      };

      if (dto.confirmedCoverage) updateData.confirmedCoverage = dto.confirmedCoverage;
      if (dto.rootCause !== undefined) updateData.rootCause = dto.rootCause;
      if (dto.assignedToId !== undefined) updateData.assignedToId = dto.assignedToId;
      if (dto.assignedTeamId !== undefined) updateData.assignedTeamId = dto.assignedTeamId;
      if (dto.priority) {
        updateData.priority = dto.priority;
        updateData.slaDueAt = this.calculateSlaDueAt(dto.priority);
      }

      if (ticket.status === TicketStatus.OPEN) {
        updateData.status = TicketStatus.IN_TRIAGE;
      }

      const updated = await tx.supportTicket.update({
        where: { id: ticket.id },
        data: updateData,
      });

      const rootCauseText = dto.rootCause ? ` Causa: ${dto.rootCause}.` : '';
      const coverageText = dto.confirmedCoverage
        ? ` Cobertura confirmada: ${dto.confirmedCoverage}.`
        : '';

      await tx.supportInteraction.create({
        data: {
          organizationId,
          ticketId: ticket.id,
          kind: InteractionKind.STATUS_CHANGE,
          visibility: 'INTERNAL',
          body: `Triagem técnica registrada.${coverageText}${rootCauseText}`,
          authorId: actorId,
        },
      });

      return tx.supportTicket.findUniqueOrThrow({
        where: { id: ticket.id },
        include: {
          customer: true,
          project: true,
          assignedTo: true,
          assignedTeam: true,
          interactions: { orderBy: { occurredAt: 'asc' }, include: { author: true } },
          warrantyClaims: true,
          serviceVisitQuotes: true,
        },
      });
    });
  }

  async updateTicketStatus(
    organizationId: string,
    actorId: string,
    id: string,
    dto: UpdateSupportTicketStatusDto,
  ) {
    const ticket = await this.getSupportTicket(organizationId, id);

    return this.db.$transaction(async (tx: Prisma.TransactionClient) => {
      const updateData: any = {
        status: dto.status,
        version: ticket.version + 1,
      };

      if (dto.resolutionSummary !== undefined) {
        updateData.resolutionSummary = dto.resolutionSummary;
      }
      if (dto.satisfactionRating !== undefined) {
        updateData.satisfactionRating = dto.satisfactionRating;
      }

      if (dto.status === TicketStatus.RESOLVED && !ticket.resolvedAt) {
        updateData.resolvedAt = new Date();
      }
      if (dto.status === TicketStatus.CLOSED && !ticket.closedAt) {
        updateData.closedAt = new Date();
      }

      await tx.supportTicket.update({
        where: { id: ticket.id },
        data: updateData,
      });

      const summaryNote = dto.resolutionSummary ? ` Resolução: ${dto.resolutionSummary}.` : '';
      const ratingNote = dto.satisfactionRating
        ? ` Nota de satisfação: ${dto.satisfactionRating}/5.`
        : '';

      await tx.supportInteraction.create({
        data: {
          organizationId,
          ticketId: ticket.id,
          kind: InteractionKind.STATUS_CHANGE,
          visibility: 'INTERNAL',
          body: `Status do chamado alterado para ${dto.status}.${summaryNote}${ratingNote}`,
          authorId: actorId,
        },
      });

      return tx.supportTicket.findUniqueOrThrow({
        where: { id: ticket.id },
        include: {
          customer: true,
          project: true,
          assignedTo: true,
          assignedTeam: true,
          interactions: { orderBy: { occurredAt: 'asc' }, include: { author: true } },
          warrantyClaims: true,
          serviceVisitQuotes: true,
        },
      });
    });
  }

  async addInteraction(
    organizationId: string,
    authorId: string,
    ticketId: string,
    dto: CreateSupportInteractionDto,
  ) {
    const ticket = await this.getSupportTicket(organizationId, ticketId);

    return this.db.$transaction(async (tx: Prisma.TransactionClient) => {
      const interaction = await tx.supportInteraction.create({
        data: {
          organizationId,
          ticketId: ticket.id,
          kind: dto.kind,
          visibility: dto.visibility || 'INTERNAL',
          body: dto.body,
          attachmentUrl: dto.attachmentUrl,
          authorId,
        },
        include: { author: true },
      });

      // Update first response time if this is first message or guidance
      if (
        !ticket.firstResponseAt &&
        (dto.kind === InteractionKind.MESSAGE || dto.kind === InteractionKind.REMOTE_GUIDANCE)
      ) {
        await tx.supportTicket.update({
          where: { id: ticket.id },
          data: { firstResponseAt: new Date() },
        });
      }

      return interaction;
    });
  }

  // ==========================================
  // TERMOS DE GARANTIA & RMA
  // ==========================================

  async createWarrantyCoverage(
    organizationId: string,
    projectId: string,
    dto: CreateWarrantyCoverageDto,
  ) {
    const project = await this.db.operationalProject.findFirst({
      where: { id: projectId, organizationId },
    });
    if (!project) {
      throw new NotFoundException('Projeto operacional não encontrado.');
    }

    return this.db.warrantyCoverage.create({
      data: {
        organizationId,
        projectId,
        kind: dto.kind,
        providerType: dto.providerType,
        providerName: dto.providerName,
        itemModel: dto.itemModel,
        serialNumber: dto.serialNumber,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        terms: dto.terms,
        status: 'ACTIVE',
      },
    });
  }

  async listWarrantyCoverages(organizationId: string, projectId: string) {
    return this.db.warrantyCoverage.findMany({
      where: { organizationId, projectId },
      orderBy: { endsAt: 'asc' },
      include: { claims: true },
    });
  }

  async createWarrantyClaim(organizationId: string, ticketId: string, dto: CreateWarrantyClaimDto) {
    const ticket = await this.getSupportTicket(organizationId, ticketId);
    const coverage = await this.db.warrantyCoverage.findFirst({
      where: { id: dto.coverageId, organizationId },
    });
    if (!coverage) {
      throw new NotFoundException('Termo de garantia não encontrado.');
    }

    return this.db.warrantyClaim.create({
      data: {
        organizationId,
        ticketId: ticket.id,
        coverageId: coverage.id,
        supplierId: dto.supplierId,
        failureDescription: dto.failureDescription,
        protocolNumber: dto.protocolNumber,
        status: ClaimStatus.DRAFT,
      },
      include: { coverage: true, supplier: true },
    });
  }

  async updateWarrantyClaim(organizationId: string, id: string, dto: UpdateWarrantyClaimDto) {
    const claim = await this.db.warrantyClaim.findFirst({
      where: { id, organizationId },
    });
    if (!claim) {
      throw new NotFoundException('Sinistro de garantia não encontrado.');
    }

    const updateData: any = {
      status: dto.status,
    };
    if (dto.rmaCode !== undefined) updateData.rmaCode = dto.rmaCode;
    if (dto.replacementSerial !== undefined) updateData.replacementSerial = dto.replacementSerial;
    if (dto.costsReimbursed !== undefined) updateData.costsReimbursed = dto.costsReimbursed;

    if (
      (dto.status === ClaimStatus.APPROVED ||
        dto.status === ClaimStatus.RMA ||
        dto.status === ClaimStatus.REPLACED ||
        dto.status === ClaimStatus.CLOSED) &&
      !claim.decidedAt
    ) {
      updateData.decidedAt = new Date();
    }

    return this.db.warrantyClaim.update({
      where: { id },
      data: updateData,
      include: { coverage: true, supplier: true },
    });
  }

  // ==========================================
  // ORÇAMENTO DE VISITAS COBRADAS
  // ==========================================

  async createServiceVisitQuote(
    organizationId: string,
    ticketId: string,
    dto: CreateServiceVisitQuoteDto,
  ) {
    const ticket = await this.getSupportTicket(organizationId, ticketId);

    const labor = Number(dto.laborAmount || 0);
    const displacement = Number(dto.displacementAmount || 0);
    const materials = Number(dto.materialsAmount || 0);
    const discount = Number(dto.discountAmount || 0);
    const totalAmount = Math.max(0, labor + displacement + materials - discount);

    const currentYear = new Date().getFullYear();
    const count = await this.db.serviceVisitQuote.count({
      where: { organizationId },
    });
    const quoteNumber = `ORC-${currentYear}-${(count + 1).toString().padStart(4, '0')}`;

    return this.db.serviceVisitQuote.create({
      data: {
        organizationId,
        ticketId: ticket.id,
        quoteNumber,
        laborAmount: labor,
        displacementAmount: displacement,
        materialsAmount: materials,
        discountAmount: discount,
        totalAmount,
        validUntil: new Date(dto.validUntil),
        notes: dto.notes,
        status: 'DRAFT',
      },
    });
  }

  async acceptServiceVisitQuote(
    organizationId: string,
    actorId: string,
    id: string,
    dto: AcceptServiceVisitQuoteDto,
  ) {
    const quote = await this.db.serviceVisitQuote.findFirst({
      where: { id, organizationId },
      include: {
        ticket: {
          include: {
            customer: {
              include: {
                opportunities: {
                  include: {
                    operationalProject: true,
                    paymentPlans: true,
                  },
                },
              },
            },
            project: {
              include: {
                opportunity: {
                  include: {
                    paymentPlans: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!quote) {
      throw new NotFoundException('Orçamento de visita não encontrado.');
    }

    if (quote.status === 'ACCEPTED') {
      throw new BadRequestException('Orçamento já foi aceito anteriormente.');
    }

    // Resolve project and opportunity for automatic WorkOrder and Receivable provisioning
    let project = quote.ticket.project;
    let opportunityId: string | null = project?.opportunityId || null;

    if (!project && quote.ticket.customer?.opportunities?.length) {
      for (const opp of quote.ticket.customer.opportunities) {
        if (opp.operationalProject) {
          project = opp.operationalProject as any;
          opportunityId = opp.id;
          break;
        }
      }
    }

    return this.db.$transaction(async (tx: Prisma.TransactionClient) => {
      let createdWorkOrderId: string | null = null;
      let createdReceivableId: string | null = null;

      // 1. Provision M8 WorkOrder (Ordem de Serviço)
      if (project) {
        const woCount = await tx.workOrder.count({ where: { organizationId } });
        const woCode = `OS-VISITA-${(woCount + 1).toString().padStart(4, '0')}`;

        const workOrder = await tx.workOrder.create({
          data: {
            organizationId,
            projectId: project.id,
            code: woCode,
            title: `Visita Técnica - Chamado ${quote.ticket.ticketNumber}`,
            state: 'ASSIGNED',
            scheduledDate: new Date(),
          },
        });
        createdWorkOrderId = workOrder.id;

        // If ticket didn't have project, attach it
        if (!quote.ticket.projectId) {
          await tx.supportTicket.update({
            where: { id: quote.ticketId },
            data: { projectId: project.id },
          });
        }
      }

      // 2. Provision M6 Receivable (Contas a Receber)
      if (opportunityId) {
        let paymentPlan = await tx.paymentPlan.findFirst({
          where: { opportunityId, organizationId },
        });

        if (!paymentPlan) {
          paymentPlan = await tx.paymentPlan.create({
            data: {
              organizationId,
              opportunityId,
              totalAmount: quote.totalAmount,
              installmentCount: 1,
              paymentMethod: 'PIX',
              status: 'ACTIVE',
              notes: 'Visita Técnica Pós-Venda',
            },
          });
        }

        const installmentCount = await tx.receivable.count({
          where: { paymentPlanId: paymentPlan.id },
        });

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 15); // 15 days due date

        const receivable = await tx.receivable.create({
          data: {
            organizationId,
            opportunityId,
            paymentPlanId: paymentPlan.id,
            installmentNumber: installmentCount + 1,
            title: `Visita Técnica - Orçamento ${quote.quoteNumber}`,
            originalAmount: quote.totalAmount,
            outstandingAmount: quote.totalAmount,
            paidAmount: 0,
            dueDate,
            status: 'OPEN',
          },
        });
        createdReceivableId = receivable.id;
      }

      // 3. Update quote status and link records
      const updatedQuote = await tx.serviceVisitQuote.update({
        where: { id: quote.id },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
          acceptedBy: dto.acceptedBy,
          acceptanceEvidence: dto.acceptanceEvidence,
          workOrderId: createdWorkOrderId,
          receivableId: createdReceivableId,
        },
        include: {
          workOrder: true,
          receivable: true,
        },
      });

      // 4. Record interaction on the ticket
      const osText = createdWorkOrderId ? ' OS de visita gerada em campo.' : '';
      const finText = createdReceivableId ? ' Título a receber gerado no financeiro.' : '';
      await tx.supportInteraction.create({
        data: {
          organizationId,
          ticketId: quote.ticketId,
          kind: InteractionKind.STATUS_CHANGE,
          visibility: 'INTERNAL',
          body: `Orçamento ${quote.quoteNumber} (R$ ${Number(quote.totalAmount).toFixed(2)}) aceito por ${dto.acceptedBy}.${osText}${finText}`,
          authorId: actorId,
        },
      });

      return updatedQuote;
    });
  }

  // ==========================================
  // MONITORAMENTO & TELEMETRIA
  // ==========================================

  async createMonitoringSystem(
    organizationId: string,
    projectId: string,
    dto: CreateMonitoringSystemDto,
  ) {
    const project = await this.db.operationalProject.findFirst({
      where: { id: projectId, organizationId },
    });
    if (!project) {
      throw new NotFoundException('Projeto operacional não encontrado.');
    }

    return this.db.monitoringSystem.upsert({
      where: { projectId },
      update: {
        provider: dto.provider,
        externalPlantId: dto.externalPlantId,
        connectionType: dto.connectionType || 'WIFI',
        inverterModel: dto.inverterModel,
        notes: dto.notes,
        status: 'ACTIVE',
      },
      create: {
        organizationId,
        projectId,
        provider: dto.provider,
        externalPlantId: dto.externalPlantId,
        connectionType: dto.connectionType || 'WIFI',
        inverterModel: dto.inverterModel,
        notes: dto.notes,
        status: 'ACTIVE',
      },
      include: {
        project: true,
        readings: { orderBy: { period: 'desc' } },
        incidents: { orderBy: { detectedAt: 'desc' } },
      },
    });
  }

  async getMonitoringSystem(organizationId: string, projectId: string) {
    const system = await this.db.monitoringSystem.findFirst({
      where: { projectId, organizationId },
      include: {
        project: true,
        readings: { orderBy: { period: 'desc' }, include: { validatedBy: true } },
        incidents: { orderBy: { detectedAt: 'desc' }, include: { ticket: true } },
      },
    });
    if (!system) {
      throw new NotFoundException('Sistema de monitoramento não configurado para este projeto.');
    }
    return system;
  }

  async recordMonitoringReading(
    organizationId: string,
    monitoringSystemId: string,
    validatedById: string,
    dto: RecordMonitoringReadingDto,
  ) {
    const system = await this.db.monitoringSystem.findFirst({
      where: { id: monitoringSystemId, organizationId },
    });
    if (!system) {
      throw new NotFoundException('Sistema de monitoramento não encontrado.');
    }

    // SPEC-011 Principle 1: "Ausência de telemetria NÃO significa geração zero"
    // If realizedGenerationKwh is omitted or null, persist as null and keep ratio null.
    const realizedKwh =
      dto.realizedGenerationKwh !== undefined && dto.realizedGenerationKwh !== null
        ? Number(dto.realizedGenerationKwh)
        : null;

    let performanceRatio: number | null = null;
    if (realizedKwh !== null && Number(dto.expectedGenerationKwh) > 0) {
      performanceRatio = Number(
        ((realizedKwh / Number(dto.expectedGenerationKwh)) * 100).toFixed(2),
      );
    }

    return this.db.$transaction(async (tx: Prisma.TransactionClient) => {
      const reading = await tx.monitoringReading.upsert({
        where: {
          monitoringSystemId_period: {
            monitoringSystemId,
            period: dto.period,
          },
        },
        update: {
          expectedGenerationKwh: dto.expectedGenerationKwh,
          realizedGenerationKwh: realizedKwh,
          performanceRatio,
          source: dto.source || 'INFORMADA',
          notes: dto.notes,
          validatedById,
        },
        create: {
          organizationId,
          monitoringSystemId,
          period: dto.period,
          expectedGenerationKwh: dto.expectedGenerationKwh,
          realizedGenerationKwh: realizedKwh,
          performanceRatio,
          source: dto.source || 'INFORMADA',
          notes: dto.notes,
          validatedById,
        },
      });

      if (realizedKwh !== null) {
        await tx.monitoringSystem.update({
          where: { id: monitoringSystemId },
          data: { lastTelemetryAt: new Date() },
        });
      }

      return reading;
    });
  }

  async recordConnectivityIncident(
    organizationId: string,
    actorId: string,
    monitoringSystemId: string,
    dto: RecordConnectivityIncidentDto,
  ) {
    const system = await this.db.monitoringSystem.findFirst({
      where: { id: monitoringSystemId, organizationId },
    });
    if (!system) {
      throw new NotFoundException('Sistema de monitoramento não encontrado.');
    }

    return this.db.$transaction(async (tx: Prisma.TransactionClient) => {
      const incident = await tx.connectivityIncident.create({
        data: {
          organizationId,
          monitoringSystemId,
          ticketId: dto.ticketId,
          reason: dto.reason,
          customerNetworkChanged: dto.customerNetworkChanged ?? false,
          detectedAt: new Date(),
          detectionSource: 'MANUAL',
        },
      });

      await tx.monitoringSystem.update({
        where: { id: monitoringSystemId },
        data: { status: 'NO_TELEMETRY' },
      });

      if (dto.ticketId) {
        await tx.supportInteraction.create({
          data: {
            organizationId,
            ticketId: dto.ticketId,
            kind: InteractionKind.EVIDENCE,
            visibility: 'INTERNAL',
            body: `Incidente de conectividade registrado no inversor. Causa: ${dto.reason || 'Perda de sinal Wi-Fi'}.`,
            authorId: actorId,
          },
        });
      }

      return incident;
    });
  }

  async restoreConnectivityIncident(
    organizationId: string,
    actorId: string,
    incidentId: string,
    dto: RestoreConnectivityIncidentDto,
  ) {
    const incident = await this.db.connectivityIncident.findFirst({
      where: { id: incidentId, organizationId },
      include: { monitoringSystem: true },
    });
    if (!incident) {
      throw new NotFoundException('Incidente de conectividade não encontrado.');
    }

    return this.db.$transaction(async (tx: Prisma.TransactionClient) => {
      const updatedIncident = await tx.connectivityIncident.update({
        where: { id: incidentId },
        data: {
          restoredAt: new Date(),
          resolutionMethod: dto.resolutionMethod,
        },
      });

      await tx.monitoringSystem.update({
        where: { id: incident.monitoringSystemId },
        data: {
          status: 'ACTIVE',
          lastTelemetryAt: new Date(),
        },
      });

      if (incident.ticketId) {
        await tx.supportInteraction.create({
          data: {
            organizationId,
            ticketId: incident.ticketId,
            kind: InteractionKind.STATUS_CHANGE,
            visibility: 'INTERNAL',
            body: `Conectividade Wi-Fi restabelecida com sucesso. Procedimento: ${dto.resolutionMethod}.`,
            authorId: actorId,
          },
        });
      }

      return updatedIncident;
    });
  }
}
