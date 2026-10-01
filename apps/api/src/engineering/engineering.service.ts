import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../database/audit.service';
import {
  CreateExecutiveDesignDto,
  CreateOperationalProjectDto,
  CreateWorkOrderDto,
  ExecutiveDesignStatus,
  ProjectOperationalState,
  RecordCustomerHandoverDto,
  UpdateChecklistItemDto,
  UpdateHomologationDto,
  UpdateOperationalProjectDto,
  UpdateWorkOrderStateDto,
  WorkOrderState,
} from './engineering.dto';

const STANDARD_CHECKLIST = [
  {
    section: 'PREPARATION',
    itemCode: 'EPI-01',
    title: 'Conferência de EPIs, trava-quedas e ferramentas da equipe',
    responseType: 'CHECK',
  },
  {
    section: 'SAFETY_ARRIVAL',
    itemCode: 'SAFE-01',
    title: 'Inspeção de segurança do telhado/estrutura e registro de fotos antes',
    responseType: 'PHOTO',
  },
  {
    section: 'EQUIPMENT',
    itemCode: 'EQP-01',
    title: 'Conferência física de painéis, inversor e números de série com nota fiscal',
    responseType: 'CHECK',
  },
  {
    section: 'EXECUTION',
    itemCode: 'EXEC-01',
    title: 'Fixação mecânica da estrutura, trilhos e inclinação dos módulos',
    responseType: 'CHECK',
  },
  {
    section: 'EXECUTION',
    itemCode: 'EXEC-02',
    title: 'Cabeamento CC/CA, aterramento e conexão de quadros de proteção (Stringbox)',
    responseType: 'CHECK',
  },
  {
    section: 'COMMISSIONING',
    itemCode: 'COMM-01',
    title: 'Medição elétrica de tensão de circuito aberto (Voc) e polaridade das strings',
    responseType: 'MEASUREMENT',
  },
  {
    section: 'COMMISSIONING',
    itemCode: 'COMM-02',
    title: 'Inicialização do inversor, configuração de parâmetros e teste de geração',
    responseType: 'CHECK',
  },
  {
    section: 'DELIVERY',
    itemCode: 'DELIV-01',
    title: 'Limpeza do local, fotos pós-obra e orientação ao cliente',
    responseType: 'PHOTO',
  },
];

@Injectable()
export class EngineeringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ==========================================
  // OPERATIONAL PROJECTS
  // ==========================================

  async createOperationalProject(
    organizationId: string,
    userId: string,
    dto: CreateOperationalProjectDto,
  ) {
    const opp = await this.prisma.opportunity.findFirst({
      where: { id: dto.opportunityId, organizationId },
      include: { customer: true, utilityUnit: true },
    });
    if (!opp) throw new NotFoundException('Oportunidade comercial não encontrada');

    const existing = await this.prisma.operationalProject.findFirst({
      where: {
        organizationId,
        OR: [{ opportunityId: dto.opportunityId }, { code: dto.code.trim().toUpperCase() }],
      },
    });
    if (existing) {
      if (existing.opportunityId === dto.opportunityId) {
        throw new ConflictException('Já existe um projeto operacional para esta oportunidade');
      }
      throw new ConflictException(`Código de projeto ${dto.code} já está em uso`);
    }

    const distributorName = opp.utilityUnit?.distributorName || 'Distribuidora Local';

    const project = await this.prisma.$transaction(async (tx) => {
      const created = await tx.operationalProject.create({
        data: {
          organizationId,
          opportunityId: dto.opportunityId,
          code: dto.code.trim().toUpperCase(),
          title: dto.title.trim(),
          engineerUserId: dto.engineerUserId || undefined,
          nominalPowerKw: dto.nominalPowerKw ? new Prisma.Decimal(dto.nominalPowerKw) : undefined,
          estimatedMonthlyGenerationKwh: dto.estimatedMonthlyGenerationKwh
            ? new Prisma.Decimal(dto.estimatedMonthlyGenerationKwh)
            : undefined,
          artNumber: dto.artNumber?.trim() || undefined,
          notes: dto.notes?.trim() || undefined,
          state: ProjectOperationalState.PREPARATION,
          homologation: {
            create: {
              organizationId,
              distributor: distributorName,
              stage: 'PREPARING',
            },
          },
        },
        include: {
          opportunity: { include: { customer: true, utilityUnit: true } },
          homologation: true,
          engineerUser: { select: { id: true, name: true, email: true } },
        },
      });

      return created;
    });

    await this.audit.record({
      organizationId,
      actorId: userId,
      action: 'EngineeringStarted',
      entityId: project.id,
      traceId: project.code,
    });

    return project;
  }

  async listOperationalProjects(
    organizationId: string,
    filter?: { state?: string; search?: string },
  ) {
    const where: Prisma.OperationalProjectWhereInput = { organizationId };

    if (filter?.state) {
      where.state = filter.state;
    }
    if (filter?.search) {
      const term = filter.search.trim().toLowerCase();
      where.OR = [
        { code: { contains: term, mode: 'insensitive' } },
        { title: { contains: term, mode: 'insensitive' } },
        { opportunity: { customer: { legalName: { contains: term, mode: 'insensitive' } } } },
      ];
    }

    return this.prisma.operationalProject.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        opportunity: {
          select: {
            id: true,
            code: true,
            title: true,
            state: true,
            customer: { select: { id: true, legalName: true, taxId: true } },
          },
        },
        engineerUser: { select: { id: true, name: true, email: true } },
        homologation: true,
        executiveDesigns: { select: { id: true, versionNumber: true, status: true } },
        workOrders: {
          select: { id: true, code: true, state: true, scheduledDate: true },
        },
        handover: true,
      },
    });
  }

  async getOperationalProject(organizationId: string, id: string) {
    const project = await this.prisma.operationalProject.findFirst({
      where: { id, organizationId },
      include: {
        opportunity: {
          include: {
            customer: true,
            utilityUnit: true,
            contracts: { select: { id: true, code: true, state: true } },
            stockReservation: {
              include: { items: { include: { catalogItem: true, location: true } } },
            },
          },
        },
        engineerUser: { select: { id: true, name: true, email: true } },
        executiveDesigns: {
          orderBy: { versionNumber: 'desc' },
          include: { approvedBy: { select: { id: true, name: true, email: true } } },
        },
        homologation: true,
        workOrders: {
          orderBy: { createdAt: 'desc' },
          include: {
            assignedLeader: { select: { id: true, name: true, email: true } },
            assignedTeam: true,
            checklistItems: { orderBy: { itemCode: 'asc' } },
          },
        },
        handover: {
          include: { receivedBy: { select: { id: true, name: true, email: true } } },
        },
      },
    });

    if (!project) throw new NotFoundException('Projeto operacional não encontrado');
    return project;
  }

  async updateOperationalProject(
    organizationId: string,
    userId: string,
    id: string,
    dto: UpdateOperationalProjectDto,
  ) {
    const project = await this.prisma.operationalProject.findFirst({
      where: { id, organizationId },
      include: { executiveDesigns: true, opportunity: true },
    });
    if (!project) throw new NotFoundException('Projeto operacional não encontrado');

    // Gate verification: transitioning to READY_TO_SCHEDULE or SCHEDULED
    if (
      dto.state &&
      [ProjectOperationalState.READY_TO_SCHEDULE, ProjectOperationalState.SCHEDULED].includes(
        dto.state,
      )
    ) {
      const hasApprovedDesign = project.executiveDesigns.some((d) => d.status === 'APPROVED');
      if (!hasApprovedDesign) {
        throw new UnprocessableEntityException(
          'Gate de Engenharia pendente: O projeto precisa de ao menos uma versão de projeto executivo APROVADA antes de ser liberado para agendamento.',
        );
      }
    }

    const updated = await this.prisma.operationalProject.update({
      where: { id },
      data: {
        state: dto.state || undefined,
        engineerUserId: dto.engineerUserId || undefined,
        artNumber: dto.artNumber !== undefined ? dto.artNumber.trim() || null : undefined,
        notes: dto.notes !== undefined ? dto.notes.trim() || null : undefined,
      },
      include: {
        opportunity: { include: { customer: true } },
        engineerUser: { select: { id: true, name: true, email: true } },
      },
    });

    await this.audit.record({
      organizationId,
      actorId: userId,
      action: 'OperationalProjectUpdated',
      entityId: id,
      traceId: updated.code,
    });

    return updated;
  }

  // ==========================================
  // EXECUTIVE DESIGN
  // ==========================================

  async createExecutiveDesign(
    organizationId: string,
    userId: string,
    projectId: string,
    dto: CreateExecutiveDesignDto,
  ) {
    const project = await this.prisma.operationalProject.findFirst({
      where: { id: projectId, organizationId },
    });
    if (!project) throw new NotFoundException('Projeto operacional não encontrado');

    const lastVersion = await this.prisma.executiveDesign.findFirst({
      where: { projectId },
      orderBy: { versionNumber: 'desc' },
    });

    const nextVersion = (lastVersion?.versionNumber || 0) + 1;

    const design = await this.prisma.executiveDesign.create({
      data: {
        organizationId,
        projectId,
        versionNumber: nextVersion,
        status: ExecutiveDesignStatus.DRAFT,
        stringsCount: dto.stringsCount,
        modulesPerString: dto.modulesPerString,
        mpptCount: dto.mpptCount,
        tiltDegrees: dto.tiltDegrees ? new Prisma.Decimal(dto.tiltDegrees) : undefined,
        azimuthDegrees: dto.azimuthDegrees ? new Prisma.Decimal(dto.azimuthDegrees) : undefined,
        cableGaugeMm: dto.cableGaugeMm ? new Prisma.Decimal(dto.cableGaugeMm) : undefined,
        diagramUrl: dto.diagramUrl || undefined,
        notes: dto.notes?.trim() || undefined,
      },
    });

    // Update project state to ENGINEERING if in PREPARATION
    if (project.state === ProjectOperationalState.PREPARATION) {
      await this.prisma.operationalProject.update({
        where: { id: projectId },
        data: { state: ProjectOperationalState.ENGINEERING },
      });
    }

    return design;
  }

  async approveExecutiveDesign(
    organizationId: string,
    userId: string,
    projectId: string,
    designId: string,
  ) {
    const design = await this.prisma.executiveDesign.findFirst({
      where: { id: designId, projectId, organizationId },
    });
    if (!design) throw new NotFoundException('Versão de projeto executivo não encontrada');

    const approved = await this.prisma.$transaction(async (tx) => {
      // Supersede other approved designs for this project
      await tx.executiveDesign.updateMany({
        where: { projectId, status: ExecutiveDesignStatus.APPROVED },
        data: { status: ExecutiveDesignStatus.SUPERSEDED },
      });

      // Mark this design as APPROVED
      const updated = await tx.executiveDesign.update({
        where: { id: designId },
        data: {
          status: ExecutiveDesignStatus.APPROVED,
          approvedById: userId,
          approvedAt: new Date(),
        },
      });

      // Advance project to HOMOLOGATION or READY_TO_SCHEDULE
      await tx.operationalProject.update({
        where: { id: projectId },
        data: { state: ProjectOperationalState.HOMOLOGATION },
      });

      return updated;
    });

    await this.audit.record({
      organizationId,
      actorId: userId,
      action: 'EngineeringApproved',
      entityId: designId,
      traceId: `PRJ-${projectId}-V${design.versionNumber}`,
    });

    return approved;
  }

  // ==========================================
  // HOMOLOGATION
  // ==========================================

  async updateHomologation(
    organizationId: string,
    userId: string,
    projectId: string,
    dto: UpdateHomologationDto,
  ) {
    const project = await this.prisma.operationalProject.findFirst({
      where: { id: projectId, organizationId },
      include: { homologation: true },
    });
    if (!project) throw new NotFoundException('Projeto operacional não encontrado');

    const submittedAt = dto.stage === 'SUBMITTED' ? new Date() : undefined;
    const approvedAt = dto.stage === 'APPROVED' ? new Date() : undefined;
    const meterExchangedAt = dto.stage === 'METER_EXCHANGED' ? new Date() : undefined;

    const homologation = await this.prisma.homologationProcess.upsert({
      where: { projectId },
      create: {
        organizationId,
        projectId,
        distributor: dto.distributor.trim(),
        protocolNumber: dto.protocolNumber?.trim() || undefined,
        stage: dto.stage,
        deadlineAt: dto.deadlineAt ? new Date(dto.deadlineAt) : undefined,
        submittedAt,
        approvedAt,
        meterExchangedAt,
        notes: dto.notes?.trim() || undefined,
      },
      update: {
        distributor: dto.distributor.trim(),
        protocolNumber:
          dto.protocolNumber !== undefined ? dto.protocolNumber.trim() || null : undefined,
        stage: dto.stage,
        deadlineAt: dto.deadlineAt ? new Date(dto.deadlineAt) : undefined,
        submittedAt: submittedAt || undefined,
        approvedAt: approvedAt || undefined,
        meterExchangedAt: meterExchangedAt || undefined,
        notes: dto.notes !== undefined ? dto.notes.trim() || null : undefined,
      },
    });

    // If homologation approved, advance project state to SUPPLY or READY_TO_SCHEDULE
    if (dto.stage === 'APPROVED' && project.state === ProjectOperationalState.HOMOLOGATION) {
      await this.prisma.operationalProject.update({
        where: { id: projectId },
        data: { state: ProjectOperationalState.READY_TO_SCHEDULE },
      });
    }

    const action =
      dto.stage === 'APPROVED'
        ? 'HomologationApproved'
        : dto.stage === 'METER_EXCHANGED'
          ? 'MeterExchangeCompleted'
          : 'HomologationSubmitted';

    await this.audit.record({
      organizationId,
      actorId: userId,
      action,
      entityId: homologation.id,
      traceId: homologation.protocolNumber || project.code,
    });

    return homologation;
  }

  // ==========================================
  // WORK ORDERS & FIELD EXECUTION
  // ==========================================

  async createWorkOrder(
    organizationId: string,
    userId: string,
    projectId: string,
    dto: CreateWorkOrderDto,
  ) {
    const project = await this.prisma.operationalProject.findFirst({
      where: { id: projectId, organizationId },
    });
    if (!project) throw new NotFoundException('Projeto operacional não encontrado');

    const existingCode = await this.prisma.workOrder.findFirst({
      where: { organizationId, code: dto.code.trim().toUpperCase() },
    });
    if (existingCode) {
      throw new ConflictException(`Código de Ordem de Serviço ${dto.code} já existe`);
    }

    const checklistItemsToCreate =
      dto.checklistItems && dto.checklistItems.length > 0 ? dto.checklistItems : STANDARD_CHECKLIST;

    const workOrder = await this.prisma.$transaction(async (tx) => {
      const wo = await tx.workOrder.create({
        data: {
          organizationId,
          projectId,
          code: dto.code.trim().toUpperCase(),
          title: dto.title.trim(),
          state: WorkOrderState.READY,
          scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : undefined,
          scheduledEndDate: dto.scheduledEndDate ? new Date(dto.scheduledEndDate) : undefined,
          assignedLeaderId: dto.assignedLeaderId || undefined,
          assignedTeamId: dto.assignedTeamId || undefined,
          vehiclePlate: dto.vehiclePlate?.trim() || undefined,
          checklistItems: {
            create: checklistItemsToCreate.map((item) => ({
              organizationId,
              section: item.section,
              itemCode: item.itemCode,
              title: item.title,
              responseType: item.responseType || 'CHECK',
              status: 'PENDING',
            })),
          },
        },
        include: {
          checklistItems: { orderBy: { itemCode: 'asc' } },
          assignedLeader: { select: { id: true, name: true, email: true } },
          assignedTeam: true,
        },
      });

      // If project was READY_TO_SCHEDULE, move to SCHEDULED
      if (
        project.state === ProjectOperationalState.READY_TO_SCHEDULE ||
        project.state === ProjectOperationalState.PREPARATION
      ) {
        await tx.operationalProject.update({
          where: { id: projectId },
          data: { state: ProjectOperationalState.SCHEDULED },
        });
      }

      return wo;
    });

    await this.audit.record({
      organizationId,
      actorId: userId,
      action: 'InstallationScheduled',
      entityId: workOrder.id,
      traceId: workOrder.code,
    });

    return workOrder;
  }

  async listWorkOrders(
    organizationId: string,
    filter?: { state?: string; leaderId?: string; projectId?: string },
  ) {
    const where: Prisma.WorkOrderWhereInput = { organizationId };

    if (filter?.state) where.state = filter.state;
    if (filter?.leaderId) where.assignedLeaderId = filter.leaderId;
    if (filter?.projectId) where.projectId = filter.projectId;

    return this.prisma.workOrder.findMany({
      where,
      orderBy: { scheduledDate: 'asc' },
      include: {
        project: {
          select: {
            id: true,
            code: true,
            title: true,
            opportunity: {
              select: {
                id: true,
                code: true,
                customer: { select: { id: true, legalName: true } },
              },
            },
          },
        },
        assignedLeader: { select: { id: true, name: true, email: true } },
        assignedTeam: true,
        checklistItems: true,
      },
    });
  }

  async getWorkOrder(organizationId: string, id: string) {
    const wo = await this.prisma.workOrder.findFirst({
      where: { id, organizationId },
      include: {
        project: {
          include: {
            opportunity: {
              include: {
                customer: true,
                utilityUnit: true,
                stockReservation: {
                  include: { items: { include: { catalogItem: true, location: true } } },
                },
              },
            },
            executiveDesigns: { where: { status: 'APPROVED' } },
            handover: true,
          },
        },
        assignedLeader: { select: { id: true, name: true, email: true } },
        assignedTeam: true,
        checklistItems: { orderBy: { itemCode: 'asc' } },
      },
    });

    if (!wo) throw new NotFoundException('Ordem de serviço não encontrada');
    return wo;
  }

  async updateWorkOrderState(
    organizationId: string,
    userId: string,
    workOrderId: string,
    dto: UpdateWorkOrderStateDto,
  ) {
    const wo = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId, organizationId },
      include: { checklistItems: true, project: true },
    });
    if (!wo) throw new NotFoundException('Ordem de serviço não encontrada');

    if (dto.state === WorkOrderState.PAUSED && !dto.pauseReason) {
      throw new BadRequestException('Motivo da pausa é obrigatório');
    }

    const startedAt =
      dto.state === WorkOrderState.IN_PROGRESS && !wo.startedAt ? new Date() : undefined;
    const completedAt = dto.state === WorkOrderState.COMPLETED ? new Date() : undefined;

    const updated = await this.prisma.$transaction(async (tx) => {
      const res = await tx.workOrder.update({
        where: { id: workOrderId },
        data: {
          state: dto.state,
          pauseReason: dto.pauseReason || undefined,
          pauseNotes: dto.pauseNotes || undefined,
          startedAt: startedAt || undefined,
          completedAt: completedAt || undefined,
        },
        include: { checklistItems: true },
      });

      // Update project state dynamically
      if (dto.state === WorkOrderState.IN_PROGRESS) {
        await tx.operationalProject.update({
          where: { id: wo.projectId },
          data: { state: ProjectOperationalState.INSTALLING },
        });
      } else if (dto.state === WorkOrderState.COMPLETED) {
        await tx.operationalProject.update({
          where: { id: wo.projectId },
          data: { state: ProjectOperationalState.COMMISSIONING },
        });
      }

      return res;
    });

    const action =
      dto.state === WorkOrderState.IN_PROGRESS
        ? 'WorkOrderStarted'
        : dto.state === WorkOrderState.PAUSED
          ? 'WorkOrderPaused'
          : dto.state === WorkOrderState.COMPLETED
            ? 'InstallationCompleted'
            : 'WorkOrderUpdated';

    await this.audit.record({
      organizationId,
      actorId: userId,
      action,
      entityId: workOrderId,
      traceId: wo.code,
    });

    return updated;
  }

  async updateChecklistItem(
    organizationId: string,
    userId: string,
    itemId: string,
    dto: UpdateChecklistItemDto,
  ) {
    const item = await this.prisma.workOrderChecklistItem.findFirst({
      where: { id: itemId, organizationId },
    });
    if (!item) throw new NotFoundException('Item de checklist não encontrado');

    const updated = await this.prisma.workOrderChecklistItem.update({
      where: { id: itemId },
      data: {
        status: dto.status,
        measurementValue: dto.measurementValue
          ? new Prisma.Decimal(dto.measurementValue)
          : undefined,
        notes: dto.notes !== undefined ? dto.notes.trim() || null : undefined,
        photoUrl: dto.photoUrl !== undefined ? dto.photoUrl.trim() || null : undefined,
        checkedById: userId,
        checkedAt: new Date(),
      },
    });

    return updated;
  }

  // ==========================================
  // CUSTOMER HANDOVER & ACCEPTANCE
  // ==========================================

  async recordCustomerHandover(
    organizationId: string,
    userId: string,
    projectId: string,
    dto: RecordCustomerHandoverDto,
  ) {
    const project = await this.prisma.operationalProject.findFirst({
      where: { id: projectId, organizationId },
      include: { opportunity: true },
    });
    if (!project) throw new NotFoundException('Projeto operacional não encontrado');

    const handover = await this.prisma.$transaction(async (tx) => {
      const created = await tx.customerHandover.upsert({
        where: { projectId },
        create: {
          organizationId,
          projectId,
          clientName: dto.clientName.trim(),
          clientDocument: dto.clientDocument?.trim() || undefined,
          generationVerifiedKw: dto.generationVerifiedKw
            ? new Prisma.Decimal(dto.generationVerifiedKw)
            : undefined,
          satisfactionRating: dto.satisfactionRating || 5,
          signatureData: dto.signatureData || 'CONFIRMED_VIA_TOUCH',
          receivedById: userId,
          notes: dto.notes?.trim() || undefined,
        },
        update: {
          clientName: dto.clientName.trim(),
          clientDocument:
            dto.clientDocument !== undefined ? dto.clientDocument.trim() || null : undefined,
          generationVerifiedKw: dto.generationVerifiedKw
            ? new Prisma.Decimal(dto.generationVerifiedKw)
            : undefined,
          satisfactionRating: dto.satisfactionRating || undefined,
          signatureData: dto.signatureData || undefined,
          receivedById: userId,
          notes: dto.notes !== undefined ? dto.notes.trim() || null : undefined,
        },
      });

      // Update project state to DELIVERY
      await tx.operationalProject.update({
        where: { id: projectId },
        data: { state: ProjectOperationalState.DELIVERY },
      });

      // If opportunity is in EXECUCAO or CONTRATACAO, transition to ENTREGUE
      if (['CONTRATACAO', 'EXECUCAO'].includes(project.opportunity.state)) {
        await tx.opportunity.update({
          where: { id: project.opportunityId },
          data: { state: 'ENTREGUE', version: { increment: 1 } },
        });

        await tx.opportunityTransition.create({
          data: {
            opportunityId: project.opportunityId,
            fromState: project.opportunity.state,
            toState: 'ENTREGUE',
            command: 'DELIVERY_HANDOVER',
            justification:
              'Instalação física concluída e aceite do cliente registrado com geração verificada',
            actorId: userId,
          },
        });
      }

      return created;
    });

    await this.audit.record({
      organizationId,
      actorId: userId,
      action: 'CustomerAcceptanceRecorded',
      entityId: handover.id,
      traceId: project.code,
    });

    return handover;
  }
}
