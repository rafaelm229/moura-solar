import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  AttentionItemSeverity,
  AttentionItemStatus,
  AutomationExecutionStatus,
  AutomationRuleStatus,
  CreateAttentionItemDto,
  CreateAutomationRuleDto,
  CreateGoalDto,
  CreateNotificationDto,
  EvaluateEventDto,
  NotificationChannel,
  NotificationStatus,
  UpdateAttentionItemStatusDto,
  UpdateNotificationPreferenceDto,
} from './automations.dto';

@Injectable()
export class AutomationsService {
  constructor(private readonly db: PrismaService) {}

  // ==========================================
  // CENTRAL DE ATENÇÃO (ATTENTION ITEMS)
  // ==========================================

  async createOrDeduplicateAttentionItem(organizationId: string, dto: CreateAttentionItemDto) {
    const existing = await this.db.attentionItem.findUnique({
      where: {
        organizationId_deduplicationKey: {
          organizationId,
          deduplicationKey: dto.deduplicationKey,
        },
      },
    });

    if (existing) {
      // Re-trigger / update existing: increment occurrence count and refresh lastOccurredAt
      return this.db.attentionItem.update({
        where: { id: existing.id },
        data: {
          occurrenceCount: { increment: 1 },
          lastOccurredAt: new Date(),
          // If was closed/discarded, reopen it
          status:
            existing.status === AttentionItemStatus.RESOLVED ||
            existing.status === AttentionItemStatus.DISCARDED
              ? AttentionItemStatus.OPEN
              : existing.status,
          resolvedAt:
            existing.status === AttentionItemStatus.RESOLVED ||
            existing.status === AttentionItemStatus.DISCARDED
              ? null
              : existing.resolvedAt,
          resolvedById:
            existing.status === AttentionItemStatus.RESOLVED ||
            existing.status === AttentionItemStatus.DISCARDED
              ? null
              : existing.resolvedById,
          resolutionReason:
            existing.status === AttentionItemStatus.RESOLVED ||
            existing.status === AttentionItemStatus.DISCARDED
              ? null
              : existing.resolutionReason,
          title: dto.title ?? existing.title,
          description: dto.description ?? existing.description,
          severity: dto.severity ?? existing.severity,
          dueAt: dto.dueAt ? new Date(dto.dueAt) : existing.dueAt,
          assigneeId: dto.assigneeId ?? existing.assigneeId,
          teamId: dto.teamId ?? existing.teamId,
        },
        include: {
          assignee: { select: { id: true, name: true, email: true } },
          team: { select: { id: true, name: true } },
          resolvedBy: { select: { id: true, name: true } },
        },
      });
    }

    return this.db.attentionItem.create({
      data: {
        organizationId,
        sourceType: dto.sourceType,
        sourceId: dto.sourceId,
        kind: dto.kind,
        severity: dto.severity ?? AttentionItemSeverity.MEDIUM,
        title: dto.title,
        description: dto.description,
        reasonCode: dto.reasonCode,
        deduplicationKey: dto.deduplicationKey,
        status: AttentionItemStatus.OPEN,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        assigneeId: dto.assigneeId ?? null,
        teamId: dto.teamId ?? null,
        occurrenceCount: 1,
        lastOccurredAt: new Date(),
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        team: { select: { id: true, name: true } },
        resolvedBy: { select: { id: true, name: true } },
      },
    });
  }

  async listAttentionItems(
    organizationId: string,
    filters: {
      status?: string;
      severity?: string;
      kind?: string;
      sourceType?: string;
      assigneeId?: string;
      teamId?: string;
      search?: string;
    },
  ) {
    const where: Prisma.AttentionItemWhereInput = {
      organizationId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.severity ? { severity: filters.severity } : {}),
      ...(filters.kind ? { kind: filters.kind } : {}),
      ...(filters.sourceType ? { sourceType: filters.sourceType } : {}),
      ...(filters.assigneeId ? { assigneeId: filters.assigneeId } : {}),
      ...(filters.teamId ? { teamId: filters.teamId } : {}),
      ...(filters.search
        ? {
            OR: [
              { title: { contains: filters.search, mode: 'insensitive' } },
              { description: { contains: filters.search, mode: 'insensitive' } },
              { reasonCode: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    return this.db.attentionItem.findMany({
      where,
      orderBy: [{ dueAt: 'asc' }, { severity: 'desc' }, { lastOccurredAt: 'desc' }],
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        team: { select: { id: true, name: true } },
        resolvedBy: { select: { id: true, name: true } },
      },
    });
  }

  async getAttentionItem(organizationId: string, id: string) {
    const item = await this.db.attentionItem.findFirst({
      where: { id, organizationId },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        team: { select: { id: true, name: true } },
        resolvedBy: { select: { id: true, name: true } },
      },
    });

    if (!item) {
      throw new NotFoundException(`Item de atenção não encontrado: ${id}`);
    }

    return item;
  }

  async updateAttentionItem(organizationId: string, id: string, dto: UpdateAttentionItemStatusDto) {
    await this.getAttentionItem(organizationId, id);

    return this.db.attentionItem.update({
      where: { id },
      data: {
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.assigneeId !== undefined ? { assigneeId: dto.assigneeId } : {}),
        ...(dto.teamId !== undefined ? { teamId: dto.teamId } : {}),
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        team: { select: { id: true, name: true } },
        resolvedBy: { select: { id: true, name: true } },
      },
    });
  }

  async resolveAttentionItem(organizationId: string, userId: string, id: string, reason: string) {
    if (!reason || reason.trim().length < 3) {
      throw new BadRequestException(
        'A resolução de um item exige justificativa formal com ao menos 3 caracteres.',
      );
    }

    await this.getAttentionItem(organizationId, id);

    return this.db.attentionItem.update({
      where: { id },
      data: {
        status: AttentionItemStatus.RESOLVED,
        resolvedAt: new Date(),
        resolvedById: userId,
        resolutionReason: reason.trim(),
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        team: { select: { id: true, name: true } },
        resolvedBy: { select: { id: true, name: true } },
      },
    });
  }

  async discardAttentionItem(organizationId: string, userId: string, id: string, reason: string) {
    if (!reason || reason.trim().length < 3) {
      throw new BadRequestException(
        'O descarte de um item de atenção exige justificativa formal com ao menos 3 caracteres.',
      );
    }

    await this.getAttentionItem(organizationId, id);

    return this.db.attentionItem.update({
      where: { id },
      data: {
        status: AttentionItemStatus.DISCARDED,
        resolvedAt: new Date(),
        resolvedById: userId,
        resolutionReason: reason.trim(),
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        team: { select: { id: true, name: true } },
        resolvedBy: { select: { id: true, name: true } },
      },
    });
  }

  // ==========================================
  // MOTOR DE REGRAS E EXECUÇÕES (AUTOMATION ENGINE)
  // ==========================================

  async createRuleVersion(organizationId: string, userId: string, dto: CreateAutomationRuleDto) {
    // Determine version: get max existing version for this ruleKey
    const highest = await this.db.automationRuleVersion.findFirst({
      where: { organizationId, ruleKey: dto.ruleKey },
      orderBy: { version: 'desc' },
    });

    const nextVersion = (highest?.version ?? 0) + 1;

    // If there was an active version, set it to PAUSED
    if (highest && highest.status === AutomationRuleStatus.ACTIVE) {
      await this.db.automationRuleVersion.update({
        where: { id: highest.id },
        data: { status: AutomationRuleStatus.PAUSED },
      });
    }

    return this.db.automationRuleVersion.create({
      data: {
        organizationId,
        ruleKey: dto.ruleKey,
        version: nextVersion,
        name: dto.name,
        description: dto.description,
        status: AutomationRuleStatus.ACTIVE,
        triggerEvent: dto.triggerEvent,
        conditions: dto.conditions ?? {},
        actions: dto.actions ?? [],
        validFrom: dto.validFrom ? new Date(dto.validFrom) : new Date(),
        validTo: dto.validTo ? new Date(dto.validTo) : null,
        timezone: dto.timezone ?? 'America/Sao_Paulo',
        createdBy: userId,
      },
    });
  }

  async listRules(organizationId: string, status?: string) {
    return this.db.automationRuleVersion.findMany({
      where: {
        organizationId,
        ...(status ? { status } : {}),
      },
      orderBy: [{ ruleKey: 'asc' }, { version: 'desc' }],
    });
  }

  async getRule(organizationId: string, id: string) {
    const rule = await this.db.automationRuleVersion.findFirst({
      where: { id, organizationId },
      include: {
        executions: {
          orderBy: { startedAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!rule) {
      throw new NotFoundException(`Regra de automação não encontrada: ${id}`);
    }

    return rule;
  }

  async updateRuleStatus(organizationId: string, id: string, status: string) {
    await this.getRule(organizationId, id);

    return this.db.automationRuleVersion.update({
      where: { id },
      data: { status },
    });
  }

  async evaluateEvent(organizationId: string, dto: EvaluateEventDto) {
    // Check idempotency first (SPEC-012 Princípio 4 & Critério 1)
    const existingExecution = await this.db.automationExecution.findFirst({
      where: {
        organizationId,
        OR: [
          { idempotencyKey: dto.idempotencyKey },
          { idempotencyKey: { startsWith: `${dto.idempotencyKey}-` } },
        ],
      },
    });

    if (existingExecution) {
      return {
        idempotent: true,
        execution: existingExecution,
        status: 'IDEMPOTENT_IGNORED',
        message: 'Evento já avaliado com esta chave de idempotência.',
      };
    }

    const now = new Date();
    // Find active rule versions for this trigger event
    const activeRules = await this.db.automationRuleVersion.findMany({
      where: {
        organizationId,
        triggerEvent: dto.eventName,
        status: AutomationRuleStatus.ACTIVE,
        validFrom: { lte: now },
        OR: [{ validTo: null }, { validTo: { gte: now } }],
      },
    });

    const executionResults = [];

    for (const rule of activeRules) {
      const startedAt = new Date();
      let executionStatus = AutomationExecutionStatus.COMPLETED;
      let resultSummary = '';
      let errorCode: string | null = null;

      try {
        // Execute rule actions
        const actions = Array.isArray(rule.actions) ? rule.actions : [];
        const actionsExecuted = [];

        for (const action of actions as Array<{ type: string; params?: any }>) {
          if (action.type === 'CREATE_ATTENTION_ITEM') {
            const itemParams = action.params || {};
            const deduplicationKey =
              itemParams.deduplicationKey ||
              `${rule.ruleKey}-${dto.payload.sourceId || dto.idempotencyKey}`;

            const item = await this.createOrDeduplicateAttentionItem(organizationId, {
              sourceType: itemParams.sourceType || 'SYSTEM',
              sourceId: dto.payload.sourceId || dto.idempotencyKey,
              kind: itemParams.kind || 'ALERT',
              severity: itemParams.severity || AttentionItemSeverity.MEDIUM,
              title: itemParams.title || `Alerta: ${rule.name}`,
              description:
                itemParams.description || `Gerado automaticamente pelo evento ${dto.eventName}`,
              reasonCode: itemParams.reasonCode || rule.ruleKey,
              deduplicationKey,
              dueAt: itemParams.dueAt,
              assigneeId: dto.payload.assigneeId || itemParams.assigneeId,
              teamId: dto.payload.teamId || itemParams.teamId,
            });
            actionsExecuted.push(`CREATE_ATTENTION_ITEM:${item.id}`);
          } else if (action.type === 'SEND_NOTIFICATION') {
            const notifParams = action.params || {};
            const recipientId = dto.payload.recipientId || notifParams.recipientId;
            if (recipientId) {
              const notif = await this.createNotification(organizationId, {
                recipientId,
                channel: notifParams.channel || NotificationChannel.INTERNAL,
                subject: notifParams.subject || `Notificação: ${rule.name}`,
                body: notifParams.body || `Atualização referente ao evento ${dto.eventName}.`,
                payload: dto.payload,
                idempotencyKey: `${dto.idempotencyKey}-notif-${rule.id}`,
              });
              actionsExecuted.push(`SEND_NOTIFICATION:${notif.id}`);
            }
          }
        }

        resultSummary = `Executadas com sucesso ${actionsExecuted.length} ações: [${actionsExecuted.join(', ')}]`;
      } catch (err: any) {
        executionStatus = AutomationExecutionStatus.FAILED;
        errorCode = err.message || 'ACTION_EXECUTION_ERROR';
        resultSummary = `Falha na execução da regra: ${err.message}`;
      }

      const execution = await this.db.automationExecution.create({
        data: {
          organizationId,
          ruleVersionId: rule.id,
          eventId: dto.eventId ?? null,
          idempotencyKey: `${dto.idempotencyKey}-${rule.id}`,
          status: executionStatus,
          attempt: 1,
          startedAt,
          finishedAt: new Date(),
          inputReference: JSON.stringify(dto.payload).slice(0, 1000),
          resultSummary,
          errorCode,
          traceId: dto.traceId ?? null,
        },
      });

      executionResults.push(execution);
    }

    return {
      idempotent: false,
      rulesMatched: activeRules.length,
      executions: executionResults,
    };
  }

  async listExecutions(
    organizationId: string,
    filters: { ruleVersionId?: string; status?: string; limit?: number },
  ) {
    return this.db.automationExecution.findMany({
      where: {
        organizationId,
        ...(filters.ruleVersionId ? { ruleVersionId: filters.ruleVersionId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      },
      include: {
        ruleVersion: { select: { id: true, name: true, ruleKey: true, version: true } },
      },
      orderBy: { startedAt: 'desc' },
      take: filters.limit ?? 50,
    });
  }

  async reprocessExecution(organizationId: string, executionId: string) {
    const execution = await this.db.automationExecution.findFirst({
      where: { id: executionId, organizationId },
      include: { ruleVersion: true },
    });

    if (!execution) {
      throw new NotFoundException(`Execução de automação não encontrada: ${executionId}`);
    }

    // Attempt reprocess
    const startedAt = new Date();
    let status = AutomationExecutionStatus.COMPLETED;
    let resultSummary = 'Reprocessado com sucesso.';
    let errorCode: string | null = null;

    try {
      // Re-run execution logic
      const rule = execution.ruleVersion;
      const actions = Array.isArray(rule.actions) ? rule.actions : [];
      let inputData: any = {};
      try {
        inputData = execution.inputReference ? JSON.parse(execution.inputReference) : {};
      } catch {
        inputData = {};
      }

      for (const action of actions as Array<{ type: string; params?: any }>) {
        if (action.type === 'CREATE_ATTENTION_ITEM') {
          const itemParams = action.params || {};
          const deduplicationKey =
            itemParams.deduplicationKey ||
            `${rule.ruleKey}-${inputData.sourceId || execution.idempotencyKey}-reprocess`;

          await this.createOrDeduplicateAttentionItem(organizationId, {
            sourceType: itemParams.sourceType || 'SYSTEM',
            sourceId: inputData.sourceId || execution.idempotencyKey,
            kind: itemParams.kind || 'ALERT',
            severity: itemParams.severity || AttentionItemSeverity.MEDIUM,
            title: itemParams.title || `Alerta Reprocessado: ${rule.name}`,
            description: itemParams.description || `Reprocessado da execução ${execution.id}`,
            reasonCode: itemParams.reasonCode || rule.ruleKey,
            deduplicationKey,
            assigneeId: inputData.assigneeId || itemParams.assigneeId,
            teamId: inputData.teamId || itemParams.teamId,
          });
        }
      }
    } catch (err: any) {
      status = AutomationExecutionStatus.FAILED;
      errorCode = err.message || 'REPROCESS_FAILED';
      resultSummary = `Falha ao reprocessar: ${err.message}`;
    }

    return this.db.automationExecution.update({
      where: { id: executionId },
      data: {
        attempt: { increment: 1 },
        status,
        startedAt,
        finishedAt: new Date(),
        resultSummary,
        errorCode,
      },
    });
  }

  // ==========================================
  // NOTIFICAÇÕES & PREFERÊNCIAS
  // ==========================================

  private isQuietHours(
    preference?: {
      quietHoursStart: string | null;
      quietHoursEnd: string | null;
      timezone: string;
    } | null,
  ): boolean {
    if (!preference || !preference.quietHoursStart || !preference.quietHoursEnd) {
      return false;
    }

    try {
      const now = new Date();
      // Formatter for HH:MM in timezone
      const formatter = new Intl.DateTimeFormat('pt-BR', {
        timeZone: preference.timezone || 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const currentTimeStr = formatter.format(now); // e.g. "23:15"

      const start = preference.quietHoursStart;
      const end = preference.quietHoursEnd;

      if (start <= end) {
        // e.g. 01:00 to 06:00
        return currentTimeStr >= start && currentTimeStr <= end;
      } else {
        // e.g. 22:00 to 07:00 (spans midnight)
        return currentTimeStr >= start || currentTimeStr <= end;
      }
    } catch {
      return false;
    }
  }

  async createNotification(organizationId: string, dto: CreateNotificationDto) {
    if (dto.idempotencyKey) {
      const existing = await this.db.notification.findFirst({
        where: {
          organizationId,
          idempotencyKey: dto.idempotencyKey,
        },
      });
      if (existing) {
        return existing;
      }
    }

    // Check user preferences
    const pref = await this.db.notificationPreference.findFirst({
      where: {
        organizationId,
        userId: dto.recipientId,
        channel: dto.channel ?? NotificationChannel.INTERNAL,
      },
    });

    if (pref && !pref.enabled) {
      // If silenced by preference, don't deliver external channels
      if (dto.channel !== NotificationChannel.INTERNAL) {
        return this.db.notification.create({
          data: {
            organizationId,
            recipientId: dto.recipientId,
            channel: dto.channel ?? NotificationChannel.INTERNAL,
            subject: dto.subject,
            body: dto.body,
            payload: dto.payload ?? Prisma.DbNull,
            status: NotificationStatus.ARCHIVED,
            scheduledAt: new Date(),
            idempotencyKey: dto.idempotencyKey ?? null,
          },
        });
      }
    }

    let scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : new Date();
    if (this.isQuietHours(pref)) {
      // Scheduled for later or kept internal
      scheduledAt = new Date(Date.now() + 6 * 60 * 60 * 1000); // 6 hours delay during quiet hours
    }

    return this.db.notification.create({
      data: {
        organizationId,
        recipientId: dto.recipientId,
        channel: dto.channel ?? NotificationChannel.INTERNAL,
        subject: dto.subject,
        body: dto.body,
        payload: dto.payload ?? Prisma.DbNull,
        status: NotificationStatus.UNREAD,
        scheduledAt,
        idempotencyKey: dto.idempotencyKey ?? null,
      },
    });
  }

  async listNotifications(organizationId: string, userId: string, status?: string) {
    return this.db.notification.findMany({
      where: {
        organizationId,
        recipientId: userId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getUnreadCount(organizationId: string, userId: string) {
    const count = await this.db.notification.count({
      where: {
        organizationId,
        recipientId: userId,
        status: NotificationStatus.UNREAD,
      },
    });

    return { count };
  }

  async markAsRead(organizationId: string, userId: string, notificationId: string) {
    const notif = await this.db.notification.findFirst({
      where: { id: notificationId, organizationId, recipientId: userId },
    });

    if (!notif) {
      throw new NotFoundException(`Notificação não encontrada: ${notificationId}`);
    }

    return this.db.notification.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(organizationId: string, userId: string) {
    const result = await this.db.notification.updateMany({
      where: {
        organizationId,
        recipientId: userId,
        status: NotificationStatus.UNREAD,
      },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });

    return { updatedCount: result.count };
  }

  async getPreferences(organizationId: string, userId: string) {
    return this.db.notificationPreference.findMany({
      where: { organizationId, userId },
      orderBy: [{ category: 'asc' }, { channel: 'asc' }],
    });
  }

  async upsertPreference(
    organizationId: string,
    userId: string,
    dto: UpdateNotificationPreferenceDto,
  ) {
    return this.db.notificationPreference.upsert({
      where: {
        organizationId_userId_category_channel: {
          organizationId,
          userId,
          category: dto.category,
          channel: dto.channel,
        },
      },
      update: {
        enabled: dto.enabled,
        quietHoursStart: dto.quietHoursStart ?? null,
        quietHoursEnd: dto.quietHoursEnd ?? null,
        timezone: dto.timezone ?? 'America/Sao_Paulo',
      },
      create: {
        organizationId,
        userId,
        category: dto.category,
        channel: dto.channel,
        enabled: dto.enabled,
        quietHoursStart: dto.quietHoursStart ?? null,
        quietHoursEnd: dto.quietHoursEnd ?? null,
        timezone: dto.timezone ?? 'America/Sao_Paulo',
      },
    });
  }

  // ==========================================
  // METAS E INDICADORES (GOALS & METRICS)
  // ==========================================

  async createGoal(organizationId: string, userId: string, dto: CreateGoalDto) {
    // Check if goal for metricKey and scope already exists
    const existing = await this.db.goalVersion.findFirst({
      where: {
        organizationId,
        metricKey: dto.metricKey,
        scopeType: dto.scopeType ?? 'ORGANIZATION',
        scopeId: dto.scopeId ?? null,
      },
      orderBy: { version: 'desc' },
    });

    const nextVersion = (existing?.version ?? 0) + 1;

    // Archive previous active goal
    if (existing && existing.status === 'ACTIVE') {
      await this.db.goalVersion.update({
        where: { id: existing.id },
        data: { status: 'ARCHIVED' },
      });
    }

    return this.db.goalVersion.create({
      data: {
        organizationId,
        metricKey: dto.metricKey,
        name: dto.name,
        scopeType: dto.scopeType ?? 'ORGANIZATION',
        scopeId: dto.scopeId ?? null,
        periodStart: new Date(dto.periodStart),
        periodEnd: new Date(dto.periodEnd),
        targetValue: new Prisma.Decimal(dto.targetValue),
        currentValue: new Prisma.Decimal(0),
        unit: dto.unit ?? 'BRL',
        version: nextVersion,
        status: 'ACTIVE',
        createdBy: userId,
      },
    });
  }

  async listGoals(organizationId: string, status?: string) {
    const goals = await this.db.goalVersion.findMany({
      where: {
        organizationId,
        ...(status ? { status } : {}),
      },
      orderBy: [{ metricKey: 'asc' }, { version: 'desc' }],
    });

    return goals.map((goal) => {
      const target = Number(goal.targetValue) || 1;
      const current = Number(goal.currentValue) || 0;
      const progressPercent = Math.min(Math.round((current / target) * 100 * 10) / 10, 100);

      return {
        ...goal,
        progressPercent,
      };
    });
  }

  async getIndicators(organizationId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Run parallel queries across domain tables
    const [
      opportunitiesCount,
      opportunitiesWon,
      proposalsCount,
      proposalsAccepted,
      proposalsTotalValue,
      receivablesData,
      payablesData,
      openTicketsCount,
      criticalTicketsCount,
      activeIncidentsCount,
      stockItemsCount,
      attentionItemsStats,
      executionsCount,
    ] = await Promise.all([
      // Opportunities total
      this.db.opportunity.count({ where: { organizationId } }),
      // Opportunities won
      this.db.opportunity.count({ where: { organizationId, state: 'GANHO' } }),
      // Proposals total
      this.db.proposal.count({ where: { organizationId } }),
      // Proposals accepted
      this.db.proposalVersion.count({ where: { organizationId, status: 'ACCEPTED' } }),
      // Proposals total value (accepted)
      this.db.proposalVersion.aggregate({
        where: { organizationId, status: 'ACCEPTED' },
        _sum: { finalPrice: true },
      }),
      // Receivables aggregation
      this.db.receivable.aggregate({
        where: { organizationId },
        _sum: { originalAmount: true, paidAmount: true, outstandingAmount: true },
      }),
      // Payables aggregation
      this.db.payable.aggregate({
        where: { organizationId },
        _sum: { originalAmount: true, paidAmount: true, outstandingAmount: true },
      }),
      // Tickets open
      this.db.supportTicket.count({
        where: {
          organizationId,
          status: { in: ['OPEN', 'IN_TRIAGE', 'IN_PROGRESS', 'SCHEDULED'] },
        },
      }),
      // Tickets critical
      this.db.supportTicket.count({
        where: {
          organizationId,
          priority: 'CRITICAL',
          status: { in: ['OPEN', 'IN_TRIAGE', 'IN_PROGRESS'] },
        },
      }),
      // Connectivity incidents active
      this.db.connectivityIncident.count({
        where: {
          organizationId,
          restoredAt: null,
        },
      }),
      // Stock catalog items
      this.db.catalogItem.count({ where: { organizationId } }),
      // Attention items counts
      this.db.attentionItem.groupBy({
        by: ['severity'],
        where: { organizationId, status: AttentionItemStatus.OPEN },
        _count: { _all: true },
      }),
      // Executions in last 24 hours
      this.db.automationExecution.count({
        where: {
          organizationId,
          startedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    const oppConversionRate =
      opportunitiesCount > 0
        ? Math.round((opportunitiesWon / opportunitiesCount) * 100 * 10) / 10
        : 0;

    const proposalAcceptanceRate =
      proposalsCount > 0 ? Math.round((proposalsAccepted / proposalsCount) * 100 * 10) / 10 : 0;

    const totalReceivable = Number(receivablesData._sum.originalAmount ?? 0);
    const totalReceived = Number(receivablesData._sum.paidAmount ?? 0);
    const outstandingReceivable = Number(receivablesData._sum.outstandingAmount ?? 0);

    const totalPayable = Number(payablesData._sum.originalAmount ?? 0);
    const totalPaid = Number(payablesData._sum.paidAmount ?? 0);
    const outstandingPayable = Number(payablesData._sum.outstandingAmount ?? 0);

    const openAttentionItems = attentionItemsStats.reduce((sum, item) => sum + item._count._all, 0);
    const criticalAttentionItems =
      attentionItemsStats.find((item) => item.severity === AttentionItemSeverity.CRITICAL)?._count
        ._all ?? 0;

    return {
      commercial: {
        totalOpportunities: opportunitiesCount,
        wonOpportunities: opportunitiesWon,
        conversionRatePercent: oppConversionRate,
        totalProposals: proposalsCount,
        acceptedProposals: proposalsAccepted,
        proposalAcceptanceRatePercent: proposalAcceptanceRate,
        acceptedProposalsTotalValue: Number(proposalsTotalValue._sum.finalPrice ?? 0),
      },
      financial: {
        totalReceivable,
        totalReceived,
        outstandingReceivable,
        totalPayable,
        totalPaid,
        outstandingPayable,
        netCashflowBalance: totalReceived - totalPaid,
      },
      operations: {
        catalogItemsCount: stockItemsCount,
      },
      afterSales: {
        openTicketsCount,
        criticalTicketsCount,
        activeConnectivityIncidentsCount: activeIncidentsCount,
      },
      attention: {
        openItemsCount: openAttentionItems,
        criticalItemsCount: criticalAttentionItems,
      },
      observability: {
        executionsLast24h: executionsCount,
        calculatedAt: now.toISOString(),
      },
    };
  }

  async recalculateProjections(organizationId: string) {
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Calculate current monthly sales
    const salesAgg = await this.db.proposalVersion.aggregate({
      where: {
        organizationId,
        status: 'ACCEPTED',
        createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
      },
      _sum: { finalPrice: true },
    });

    const monthlySales = Number(salesAgg._sum.finalPrice ?? 0);

    // Calculate monthly receivables paid
    const recAgg = await this.db.receivable.aggregate({
      where: {
        organizationId,
        status: 'PAID',
        updatedAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
      },
      _sum: { paidAmount: true },
    });

    const monthlyRevenue = Number(recAgg._sum.paidAmount ?? 0);

    // Upsert projections
    const p1 = await this.db.metricProjection.upsert({
      where: {
        organizationId_metricKey_period: {
          organizationId,
          metricKey: 'SALES_MONTHLY_TOTAL',
          period,
        },
      },
      update: {
        value: new Prisma.Decimal(monthlySales),
        calculatedAt: now,
        revision: { increment: 1 },
      },
      create: {
        organizationId,
        metricKey: 'SALES_MONTHLY_TOTAL',
        period,
        value: new Prisma.Decimal(monthlySales),
        calculatedAt: now,
        revision: 1,
      },
    });

    const p2 = await this.db.metricProjection.upsert({
      where: {
        organizationId_metricKey_period: {
          organizationId,
          metricKey: 'REVENUE_MONTHLY_TOTAL',
          period,
        },
      },
      update: {
        value: new Prisma.Decimal(monthlyRevenue),
        calculatedAt: now,
        revision: { increment: 1 },
      },
      create: {
        organizationId,
        metricKey: 'REVENUE_MONTHLY_TOTAL',
        period,
        value: new Prisma.Decimal(monthlyRevenue),
        calculatedAt: now,
        revision: 1,
      },
    });

    return [p1, p2];
  }
}
