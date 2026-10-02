import { describe, expect, it, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { AutomationsService } from '../src/automations/automations.service';
import {
  AttentionItemSeverity,
  AttentionItemStatus,
  AutomationExecutionStatus,
  AutomationRuleStatus,
  NotificationChannel,
  NotificationStatus,
} from '../src/automations/automations.dto';

describe('SPEC-012 Automations, Notifications & Indicators Unit Tests', () => {
  let service: AutomationsService;
  let fakeDb: any;
  let attentionItemsStore: any[];
  let rulesStore: any[];
  let executionsStore: any[];
  let notificationsStore: any[];
  let preferencesStore: any[];
  let goalsStore: any[];

  beforeEach(() => {
    attentionItemsStore = [];
    rulesStore = [];
    executionsStore = [];
    notificationsStore = [];
    preferencesStore = [];
    goalsStore = [];

    fakeDb = {
      attentionItem: {
        findUnique: async ({ where }: any) => {
          const key = where.organizationId_deduplicationKey;
          return (
            attentionItemsStore.find(
              (i) =>
                i.organizationId === key.organizationId &&
                i.deduplicationKey === key.deduplicationKey,
            ) || null
          );
        },
        findFirst: async ({ where }: any) => {
          return (
            attentionItemsStore.find(
              (i) => i.id === where.id && i.organizationId === where.organizationId,
            ) || null
          );
        },
        create: async ({ data }: any) => {
          const item = { id: `att-${attentionItemsStore.length + 1}`, ...data };
          attentionItemsStore.push(item);
          return item;
        },
        update: async ({ where, data }: any) => {
          const idx = attentionItemsStore.findIndex((i) => i.id === where.id);
          if (idx === -1) throw new Error('Not found');
          const existing = attentionItemsStore[idx];
          const updated = {
            ...existing,
            ...data,
            occurrenceCount: data.occurrenceCount?.increment
              ? existing.occurrenceCount + 1
              : (data.occurrenceCount ?? existing.occurrenceCount),
          };
          attentionItemsStore[idx] = updated;
          return updated;
        },
        findMany: async ({ where }: any) => {
          return attentionItemsStore.filter(
            (i) =>
              i.organizationId === where.organizationId &&
              (!where.status || i.status === where.status) &&
              (!where.severity || i.severity === where.severity),
          );
        },
        groupBy: async () => [
          { severity: 'CRITICAL', _count: { _all: 1 } },
          { severity: 'MEDIUM', _count: { _all: 2 } },
        ],
      },
      automationRuleVersion: {
        findFirst: async ({ where, orderBy }: any) => {
          const matched = rulesStore.filter(
            (r) =>
              r.organizationId === where.organizationId &&
              (!where.ruleKey || r.ruleKey === where.ruleKey),
          );
          if (orderBy?.version === 'desc') {
            matched.sort((a, b) => b.version - a.version);
          }
          return matched[0] || null;
        },
        findMany: async ({ where }: any) => {
          return rulesStore.filter(
            (r) =>
              r.organizationId === where.organizationId &&
              (!where.triggerEvent || r.triggerEvent === where.triggerEvent) &&
              (!where.status || r.status === where.status),
          );
        },
        create: async ({ data }: any) => {
          const rule = { id: `rule-${rulesStore.length + 1}`, ...data };
          rulesStore.push(rule);
          return rule;
        },
        update: async ({ where, data }: any) => {
          const idx = rulesStore.findIndex((r) => r.id === where.id);
          rulesStore[idx] = { ...rulesStore[idx], ...data };
          return rulesStore[idx];
        },
      },
      automationExecution: {
        findUnique: async ({ where }: any) => {
          const key = where.organizationId_idempotencyKey;
          return (
            executionsStore.find(
              (e) =>
                e.organizationId === key.organizationId && e.idempotencyKey === key.idempotencyKey,
            ) || null
          );
        },
        findFirst: async ({ where }: any) => {
          return (
            executionsStore.find((e) => {
              if (where.id && e.id !== where.id) return false;
              if (where.organizationId && e.organizationId !== where.organizationId) return false;
              if (where.OR) {
                return where.OR.some((cond: any) => {
                  if (cond.idempotencyKey && e.idempotencyKey === cond.idempotencyKey) return true;
                  if (
                    cond.idempotencyKey?.startsWith &&
                    e.idempotencyKey.startsWith(cond.idempotencyKey.startsWith)
                  ) {
                    return true;
                  }
                  return false;
                });
              }
              return true;
            }) || null
          );
        },
        create: async ({ data }: any) => {
          const exec = { id: `exec-${executionsStore.length + 1}`, ...data };
          executionsStore.push(exec);
          return exec;
        },
        update: async ({ where, data }: any) => {
          const idx = executionsStore.findIndex((e) => e.id === where.id);
          executionsStore[idx] = {
            ...executionsStore[idx],
            ...data,
            attempt: data.attempt?.increment
              ? executionsStore[idx].attempt + 1
              : (data.attempt ?? executionsStore[idx].attempt),
          };
          return executionsStore[idx];
        },
        count: async () => 5,
        findMany: async () => executionsStore,
      },
      notification: {
        findFirst: async ({ where }: any) => {
          return (
            notificationsStore.find(
              (n) =>
                n.organizationId === where.organizationId &&
                (!where.id || n.id === where.id) &&
                (!where.recipientId || n.recipientId === where.recipientId) &&
                (!where.idempotencyKey || n.idempotencyKey === where.idempotencyKey),
            ) || null
          );
        },
        create: async ({ data }: any) => {
          const notif = {
            id: `notif-${notificationsStore.length + 1}`,
            createdAt: new Date(),
            ...data,
          };
          notificationsStore.push(notif);
          return notif;
        },
        count: async ({ where }: any) => {
          return notificationsStore.filter(
            (n) =>
              n.organizationId === where.organizationId &&
              n.recipientId === where.recipientId &&
              (!where.status || n.status === where.status),
          ).length;
        },
        update: async ({ where, data }: any) => {
          const idx = notificationsStore.findIndex((n) => n.id === where.id);
          notificationsStore[idx] = { ...notificationsStore[idx], ...data };
          return notificationsStore[idx];
        },
        updateMany: async ({ where, data }: any) => {
          let count = 0;
          notificationsStore.forEach((n, idx) => {
            if (
              n.organizationId === where.organizationId &&
              n.recipientId === where.recipientId &&
              (!where.status || n.status === where.status)
            ) {
              notificationsStore[idx] = { ...n, ...data };
              count++;
            }
          });
          return { count };
        },
        findMany: async ({ where }: any) => {
          return notificationsStore.filter(
            (n) =>
              n.organizationId === where.organizationId &&
              n.recipientId === where.recipientId &&
              (!where.status || n.status === where.status),
          );
        },
      },
      notificationPreference: {
        findFirst: async ({ where }: any) => {
          return (
            preferencesStore.find(
              (p) =>
                p.organizationId === where.organizationId &&
                p.userId === where.userId &&
                p.channel === where.channel,
            ) || null
          );
        },
        findMany: async ({ where }: any) => {
          return preferencesStore.filter(
            (p) => p.organizationId === where.organizationId && p.userId === where.userId,
          );
        },
        upsert: async ({ create, update }: any) => {
          const idx = preferencesStore.findIndex(
            (p) =>
              p.organizationId === create.organizationId &&
              p.userId === create.userId &&
              p.category === create.category &&
              p.channel === create.channel,
          );
          if (idx >= 0) {
            preferencesStore[idx] = { ...preferencesStore[idx], ...update };
            return preferencesStore[idx];
          }
          const item = { id: `pref-${preferencesStore.length + 1}`, ...create };
          preferencesStore.push(item);
          return item;
        },
      },
      goalVersion: {
        findFirst: async ({ where, orderBy }: any) => {
          const matched = goalsStore.filter(
            (g) =>
              g.organizationId === where.organizationId &&
              g.metricKey === where.metricKey &&
              g.scopeType === where.scopeType,
          );
          if (orderBy?.version === 'desc') {
            matched.sort((a, b) => b.version - a.version);
          }
          return matched[0] || null;
        },
        create: async ({ data }: any) => {
          const goal = { id: `goal-${goalsStore.length + 1}`, ...data };
          goalsStore.push(goal);
          return goal;
        },
        update: async ({ where, data }: any) => {
          const idx = goalsStore.findIndex((g) => g.id === where.id);
          goalsStore[idx] = { ...goalsStore[idx], ...data };
          return goalsStore[idx];
        },
        findMany: async ({ where }: any) => {
          return goalsStore.filter((g) => g.organizationId === where.organizationId);
        },
      },
      metricProjection: {
        upsert: async ({ create, update }: any) => ({ ...create, ...update }),
      },
      opportunity: {
        count: async ({ where }: any) => (where.state === 'GANHO' ? 8 : 20),
      },
      proposal: {
        count: async () => 15,
      },
      proposalVersion: {
        count: async () => 10,
        aggregate: async () => ({ _sum: { finalPrice: 450000.0 } }),
      },
      receivable: {
        aggregate: async () => ({
          _sum: { originalAmount: 500000, paidAmount: 350000, outstandingAmount: 150000 },
        }),
      },
      payable: {
        aggregate: async () => ({
          _sum: { originalAmount: 200000, paidAmount: 180000, outstandingAmount: 20000 },
        }),
      },
      supportTicket: {
        count: async ({ where }: any) => (where.priority === 'CRITICAL' ? 1 : 4),
      },
      connectivityIncident: {
        count: async () => 0,
      },
      catalogItem: {
        count: async () => 45,
      },
    };

    service = new AutomationsService(fakeDb);
  });

  // ==========================================
  // CENTRAL DE ATENÇÃO
  // ==========================================

  describe('Central de Atenção (Deduplicação e Resolução Justificada)', () => {
    it('creates attention item with occurrenceCount = 1', async () => {
      const item = await service.createOrDeduplicateAttentionItem('org-1', {
        sourceType: 'OPPORTUNITY',
        sourceId: 'opp-10',
        kind: 'ALERT',
        severity: AttentionItemSeverity.HIGH,
        title: 'Oportunidade estagnada',
        description: 'Sem contato há mais de 10 dias',
        reasonCode: 'COMMERCIAL_INACTIVITY_10D',
        deduplicationKey: 'opp-inactivity-opp-10',
      });

      expect(item.id).toBeDefined();
      expect(item.status).toBe(AttentionItemStatus.OPEN);
      expect(item.occurrenceCount).toBe(1);
    });

    it('deduplicates recurring alerts and increments occurrenceCount', async () => {
      await service.createOrDeduplicateAttentionItem('org-1', {
        sourceType: 'OPPORTUNITY',
        sourceId: 'opp-10',
        kind: 'ALERT',
        severity: AttentionItemSeverity.HIGH,
        title: 'Oportunidade estagnada',
        reasonCode: 'COMMERCIAL_INACTIVITY_10D',
        deduplicationKey: 'opp-inactivity-opp-10',
      });

      const updated = await service.createOrDeduplicateAttentionItem('org-1', {
        sourceType: 'OPPORTUNITY',
        sourceId: 'opp-10',
        kind: 'ALERT',
        severity: AttentionItemSeverity.CRITICAL,
        title: 'Oportunidade estagnada CRITICA',
        reasonCode: 'COMMERCIAL_INACTIVITY_10D',
        deduplicationKey: 'opp-inactivity-opp-10',
      });

      expect(updated.occurrenceCount).toBe(2);
      expect(updated.severity).toBe(AttentionItemSeverity.CRITICAL);
      expect(attentionItemsStore.length).toBe(1); // No duplicated records!
    });

    it('re-opens resolved attention item if issue re-occurs', async () => {
      const item = await service.createOrDeduplicateAttentionItem('org-1', {
        sourceType: 'AFTER_SALES',
        sourceId: 'ticket-1',
        kind: 'ALERT',
        title: 'Falha de telemetria',
        reasonCode: 'TELEMETRY_OFFLINE',
        deduplicationKey: 'telemetry-offline-ticket-1',
      });

      // Resolve it with justification
      await service.resolveAttentionItem(
        'org-1',
        'user-1',
        item.id,
        'Inversor foi reconectado ao Wi-Fi pelo cliente.',
      );

      expect(attentionItemsStore[0].status).toBe(AttentionItemStatus.RESOLVED);
      expect(attentionItemsStore[0].resolutionReason).toBe(
        'Inversor foi reconectado ao Wi-Fi pelo cliente.',
      );

      // Same alert occurs again
      const reopened = await service.createOrDeduplicateAttentionItem('org-1', {
        sourceType: 'AFTER_SALES',
        sourceId: 'ticket-1',
        kind: 'ALERT',
        title: 'Falha de telemetria recorrente',
        reasonCode: 'TELEMETRY_OFFLINE',
        deduplicationKey: 'telemetry-offline-ticket-1',
      });

      expect(reopened.status).toBe(AttentionItemStatus.OPEN);
      expect(reopened.occurrenceCount).toBe(2);
      expect(reopened.resolutionReason).toBeNull();
    });

    it('requires formal resolution reason and rejects empty justification', async () => {
      const item = await service.createOrDeduplicateAttentionItem('org-1', {
        sourceType: 'FINANCIAL',
        sourceId: 'rec-1',
        kind: 'ALERT',
        title: 'Parcela vencida há 5 dias',
        reasonCode: 'OVERDUE_INSTALLMENT',
        deduplicationKey: 'rec-overdue-rec-1',
      });

      await expect(service.resolveAttentionItem('org-1', 'user-1', item.id, '  ')).rejects.toThrow(
        BadRequestException,
      );

      await expect(service.discardAttentionItem('org-1', 'user-1', item.id, 'ok')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ==========================================
  // MOTOR DE REGRAS E IDEMPOTÊNCIA
  // ==========================================

  describe('Motor de Automações & Idempotência', () => {
    it('creates versioned automation rules and supersedes previous version', async () => {
      const v1 = await service.createRuleVersion('org-1', 'user-1', {
        ruleKey: 'RULE_OVERDUE_ALERT',
        name: 'Alerta de Inadimplência',
        triggerEvent: 'INSTALLMENT_OVERDUE',
      });

      expect(v1.version).toBe(1);
      expect(v1.status).toBe(AutomationRuleStatus.ACTIVE);

      const v2 = await service.createRuleVersion('org-1', 'user-1', {
        ruleKey: 'RULE_OVERDUE_ALERT',
        name: 'Alerta de Inadimplência v2',
        triggerEvent: 'INSTALLMENT_OVERDUE',
      });

      expect(v2.version).toBe(2);
      expect(v2.status).toBe(AutomationRuleStatus.ACTIVE);
      // Previous v1 is now PAUSED
      expect(rulesStore[0].status).toBe(AutomationRuleStatus.PAUSED);
    });

    it('guarantees execution idempotency and prevents duplicate actions (Critério 1)', async () => {
      // Create active rule that triggers attention item
      await service.createRuleVersion('org-1', 'user-1', {
        ruleKey: 'RULE_LOW_STOCK',
        name: 'Estoque Baixo',
        triggerEvent: 'STOCK_LEVEL_LOW',
        actions: [{ type: 'CREATE_ATTENTION_ITEM', params: { severity: 'HIGH' } }],
      });

      // First evaluation
      const res1 = await service.evaluateEvent('org-1', {
        eventName: 'STOCK_LEVEL_LOW',
        idempotencyKey: 'evt-stock-item-123-20261002',
        payload: { sourceId: 'item-123', sku: 'CABO-SOLAR-6MM' },
      });

      expect(res1.idempotent).toBe(false);
      expect(res1.rulesMatched).toBe(1);
      expect(executionsStore.length).toBe(1);

      // Re-delivery of the exact same event / idempotency key
      const res2 = await service.evaluateEvent('org-1', {
        eventName: 'STOCK_LEVEL_LOW',
        idempotencyKey: 'evt-stock-item-123-20261002',
        payload: { sourceId: 'item-123', sku: 'CABO-SOLAR-6MM' },
      });

      expect(res2.idempotent).toBe(true);
      expect(res2.status).toBe('IDEMPOTENT_IGNORED');
      expect(executionsStore.length).toBe(1); // No new execution created!
    });
  });

  // ==========================================
  // NOTIFICAÇÕES & PREFERÊNCIAS
  // ==========================================

  describe('Notificações e Preferências', () => {
    it('creates internal notifications and calculates unread count', async () => {
      await service.createNotification('org-1', {
        recipientId: 'user-1',
        subject: 'Novo Projeto Atribuído',
        body: 'Você foi atribuído ao projeto PRJ-2026-0001.',
      });

      const unread = await service.getUnreadCount('org-1', 'user-1');
      expect(unread.count).toBe(1);

      const notifs = await service.listNotifications('org-1', 'user-1');
      expect(notifs.length).toBe(1);

      await service.markAsRead('org-1', 'user-1', notifs[0]!.id);
      const afterRead = await service.getUnreadCount('org-1', 'user-1');
      expect(afterRead.count).toBe(0);
    });

    it('archives external notifications when user preference disables category/channel', async () => {
      // User disables commercial emails
      await service.upsertPreference('org-1', 'user-2', {
        category: 'COMMERCIAL',
        channel: NotificationChannel.EMAIL,
        enabled: false,
      });

      const notif = await service.createNotification('org-1', {
        recipientId: 'user-2',
        channel: NotificationChannel.EMAIL,
        subject: 'Oportunidade Quente',
        body: 'Nova oportunidade recebida',
      });

      expect(notif.status).toBe(NotificationStatus.ARCHIVED);
    });
  });

  // ==========================================
  // METAS E INDICADORES CALCULADOS
  // ==========================================

  describe('Metas e Indicadores Calculados (SPEC-012 Princípio 2)', () => {
    it('creates and versions goals without overwriting past versions', async () => {
      const g1 = await service.createGoal('org-1', 'user-1', {
        metricKey: 'SALES_VALUE',
        name: 'Meta Vendas Q3',
        periodStart: '2026-07-01',
        periodEnd: '2026-09-30',
        targetValue: 1000000,
        unit: 'BRL',
      });

      expect(g1.version).toBe(1);
      expect(g1.status).toBe('ACTIVE');

      const g2 = await service.createGoal('org-1', 'user-1', {
        metricKey: 'SALES_VALUE',
        name: 'Meta Vendas Q4',
        periodStart: '2026-10-01',
        periodEnd: '2026-12-31',
        targetValue: 1500000,
        unit: 'BRL',
      });

      expect(g2.version).toBe(2);
      expect(goalsStore[0].status).toBe('ARCHIVED'); // Previous version preserved and archived
    });

    it('calculates aggregated indicators across all domain modules', async () => {
      const indicators = await service.getIndicators('org-1');

      expect(indicators.commercial.totalOpportunities).toBe(20);
      expect(indicators.commercial.wonOpportunities).toBe(8);
      expect(indicators.commercial.conversionRatePercent).toBe(40);
      expect(indicators.commercial.acceptedProposalsTotalValue).toBe(450000);

      expect(indicators.financial.totalReceivable).toBe(500000);
      expect(indicators.financial.totalReceived).toBe(350000);
      expect(indicators.financial.netCashflowBalance).toBe(170000); // 350000 - 180000

      expect(indicators.afterSales.openTicketsCount).toBe(4);
      expect(indicators.afterSales.criticalTicketsCount).toBe(1);

      expect(indicators.attention.openItemsCount).toBe(3);
      expect(indicators.attention.criticalItemsCount).toBe(1);
    });
  });
});
