'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, result } from '../identity/client';

export interface AttentionItemView {
  id: string;
  sourceType: string;
  sourceId: string;
  kind: string;
  severity: string;
  title: string;
  description?: string | null;
  reasonCode: string;
  status: string;
  dueAt?: string | null;
  assigneeId?: string | null;
  teamId?: string | null;
  resolvedAt?: string | null;
  resolvedById?: string | null;
  resolutionReason?: string | null;
  deduplicationKey: string;
  occurrenceCount: number;
  lastOccurredAt: string;
  createdAt: string;
  assignee?: { id: string; name: string; email: string } | null;
  team?: { id: string; name: string } | null;
  resolvedBy?: { id: string; name: string } | null;
}

export interface AutomationRuleView {
  id: string;
  ruleKey: string;
  version: number;
  name: string;
  description?: string | null;
  status: string;
  triggerEvent: string;
  conditions: Record<string, unknown>;
  actions: Record<string, unknown>[];
  validFrom: string;
  validTo?: string | null;
  timezone: string;
  createdBy: string;
  createdAt: string;
}

export interface AutomationExecutionView {
  id: string;
  ruleVersionId: string;
  eventId?: string | null;
  idempotencyKey: string;
  status: string;
  attempt: number;
  startedAt: string;
  finishedAt?: string | null;
  inputReference?: string | null;
  resultSummary?: string | null;
  errorCode?: string | null;
  traceId?: string | null;
  ruleVersion?: { id: string; name: string; ruleKey: string; version: number } | null;
}

export interface NotificationItemView {
  id: string;
  recipientId: string;
  channel: string;
  category: string;
  severity: string;
  subject: string;
  body: string;
  actionUrl?: string | null;
  status: string;
  readAt?: string | null;
  scheduledFor?: string | null;
  createdAt: string;
}

export interface NotificationPreferenceView {
  id: string;
  userId: string;
  channel: string;
  category: string;
  enabled: boolean;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
}

export interface GoalView {
  id: string;
  metricKey: string;
  name: string;
  scopeType: string;
  scopeId?: string | null;
  periodStart: string;
  periodEnd: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  version: number;
  status: string;
  progressPercent: number;
  createdAt: string;
}

export interface IndicatorsSummaryView {
  commercial: {
    wonOpportunitiesValue: number;
    wonOpportunitiesCount: number;
    acceptedProposalsValue: number;
    acceptedProposalsCount: number;
  };
  financial: {
    overdueReceivablesValue: number;
    overdueReceivablesCount: number;
    pendingPayablesValue: number;
    pendingPayablesCount: number;
  };
  operations: {
    completedWorkOrdersCount: number;
    completedProjectsCount: number;
  };
  afterSales: {
    openTicketsCount: number;
    resolvedTicketsCount: number;
    activeIncidentsCount: number;
  };
}

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return String((err as { message: unknown }).message);
  }
  return fallback;
}

export function AutomationsManagement() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    'attention' | 'indicators' | 'rules' | 'notifications'
  >('attention');
  const [feedback, setFeedback] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  // Filter states
  const [attentionStatusFilter, setAttentionStatusFilter] = useState('ALL');
  const [attentionSeverityFilter, setAttentionSeverityFilter] = useState('ALL');

  // Modals state
  const [isNewAttentionItemOpen, setIsNewAttentionItemOpen] = useState(false);
  const [selectedAttentionItemForResolution, setSelectedAttentionItemForResolution] =
    useState<AttentionItemView | null>(null);
  const [selectedAttentionItemForDiscard, setSelectedAttentionItemForDiscard] =
    useState<AttentionItemView | null>(null);
  const [resolutionReasonText, setResolutionReasonText] = useState('');

  const [isNewRuleOpen, setIsNewRuleOpen] = useState(false);
  const [isNewGoalOpen, setIsNewGoalOpen] = useState(false);

  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);

  // Queries
  const attentionItemsQuery = useQuery({
    queryKey: ['automations', 'attention-items', attentionStatusFilter, attentionSeverityFilter],
    queryFn: async () => {
      const res = await result(
        api.GET('/api/v1/automations/attention-items', {
          params: {
            query: {
              status: attentionStatusFilter === 'ALL' ? undefined : attentionStatusFilter,
              severity: attentionSeverityFilter === 'ALL' ? undefined : attentionSeverityFilter,
            },
          },
        }),
      );
      return (res as unknown as AttentionItemView[]) || [];
    },
  });

  const rulesQuery = useQuery({
    queryKey: ['automations', 'rules'],
    queryFn: async () => {
      const res = await result(api.GET('/api/v1/automations/rules'));
      return (res as unknown as AutomationRuleView[]) || [];
    },
  });

  const executionsQuery = useQuery({
    queryKey: ['automations', 'executions'],
    queryFn: async () => {
      const res = await result(api.GET('/api/v1/automations/executions'));
      return (res as unknown as AutomationExecutionView[]) || [];
    },
  });

  const indicatorsQuery = useQuery({
    queryKey: ['automations', 'indicators'],
    queryFn: async () => {
      const res = await result(api.GET('/api/v1/automations/indicators'));
      return (res as unknown as IndicatorsSummaryView) || null;
    },
  });

  const goalsQuery = useQuery({
    queryKey: ['automations', 'goals'],
    queryFn: async () => {
      const res = await result(api.GET('/api/v1/automations/goals'));
      return (res as unknown as GoalView[]) || [];
    },
  });

  const notificationsQuery = useQuery({
    queryKey: ['automations', 'notifications'],
    queryFn: async () => {
      const res = await result(api.GET('/api/v1/automations/notifications'));
      return (res as unknown as NotificationItemView[]) || [];
    },
  });

  const unreadCountQuery = useQuery({
    queryKey: ['automations', 'notifications', 'unread-count'],
    queryFn: async () => {
      const res = await result(api.GET('/api/v1/automations/notifications/unread-count'));
      return (res as unknown as { count: number })?.count || 0;
    },
  });

  useQuery({
    queryKey: ['automations', 'notification-preferences'],
    queryFn: async () => {
      const res = await result(api.GET('/api/v1/automations/notification-preferences'));
      return (res as unknown as NotificationPreferenceView[]) || [];
    },
  });

  // Forms
  const [attentionForm, setAttentionForm] = useState<{
    title: string;
    description: string;
    sourceType: string;
    sourceId: string;
    kind: 'TASK' | 'ALERT' | 'APPROVAL' | 'SLA_RISK' | 'EXPIRING';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    reasonCode: string;
    deduplicationKey: string;
    dueAt: string;
  }>({
    title: '',
    description: '',
    sourceType: 'COMMERCIAL',
    sourceId: '',
    kind: 'ALERT',
    severity: 'MEDIUM',
    reasonCode: 'FOLLOW_UP_REQUIRED',
    deduplicationKey: '',
    dueAt: '',
  });

  const [ruleForm, setRuleForm] = useState({
    ruleKey: '',
    name: '',
    description: '',
    triggerEvent: 'opportunity.won',
    conditions: '{"amountGreaterThan": 10000}',
    actions: '[{"type": "CREATE_ATTENTION_ITEM", "params": {"severity": "HIGH"}}]',
    timezone: 'America/Sao_Paulo',
  });

  const [goalForm, setGoalForm] = useState<{
    metricKey: string;
    name: string;
    scopeType: 'ORGANIZATION' | 'TEAM' | 'USER';
    periodStart: string;
    periodEnd: string;
    targetValue: number;
    unit: 'BRL' | 'COUNT' | 'PERCENT' | 'KWH';
  }>({
    metricKey: 'SALES_VALUE',
    name: 'Meta Comercial do Trimestre',
    scopeType: 'ORGANIZATION',
    periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .slice(0, 10),
    periodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
      .toISOString()
      .slice(0, 10),
    targetValue: 500000,
    unit: 'BRL',
  });

  const [preferenceForm, setPreferenceForm] = useState<{
    channel: 'INTERNAL' | 'EMAIL' | 'PUSH';
    category: 'COMMERCIAL' | 'OPERATIONAL' | 'FINANCIAL' | 'SYSTEM';
    enabled: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
  }>({
    channel: 'INTERNAL',
    category: 'OPERATIONAL',
    enabled: true,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
  });

  // Mutations
  const createAttentionItemMutation = useMutation({
    mutationFn: async () =>
      result(
        api.POST('/api/v1/automations/attention-items', {
          body: {
            title: attentionForm.title,
            description: attentionForm.description || undefined,
            sourceType: attentionForm.sourceType,
            sourceId: attentionForm.sourceId || '00000000-0000-0000-0000-000000000000',
            kind: attentionForm.kind,
            severity: attentionForm.severity,
            reasonCode: attentionForm.reasonCode,
            deduplicationKey:
              attentionForm.deduplicationKey ||
              `manual-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            dueAt: attentionForm.dueAt ? new Date(attentionForm.dueAt).toISOString() : undefined,
          },
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations', 'attention-items'] });
      setIsNewAttentionItemOpen(false);
      setFeedback({ message: 'Item de atenção registrado com sucesso!', type: 'success' });
    },
    onError: (err: unknown) => {
      setFeedback({
        message: getErrorMessage(err, 'Erro ao registrar item de atenção'),
        type: 'error',
      });
    },
  });

  const resolveAttentionItemMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) =>
      result(
        api.POST('/api/v1/automations/attention-items/{id}/resolve', {
          params: { path: { id } },
          body: { resolutionReason: reason },
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations', 'attention-items'] });
      setSelectedAttentionItemForResolution(null);
      setResolutionReasonText('');
      setFeedback({ message: 'Item resolvido com sucesso!', type: 'success' });
    },
    onError: (err: unknown) => {
      setFeedback({ message: getErrorMessage(err, 'Erro ao resolver item'), type: 'error' });
    },
  });

  const discardAttentionItemMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) =>
      result(
        api.POST('/api/v1/automations/attention-items/{id}/discard', {
          params: { path: { id } },
          body: { resolutionReason: reason },
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations', 'attention-items'] });
      setSelectedAttentionItemForDiscard(null);
      setResolutionReasonText('');
      setFeedback({ message: 'Item descartado com sucesso!', type: 'info' });
    },
    onError: (err: unknown) => {
      setFeedback({ message: getErrorMessage(err, 'Erro ao descartar item'), type: 'error' });
    },
  });

  const createRuleMutation = useMutation({
    mutationFn: async () => {
      let cond = {};
      let act: Record<string, unknown>[] = [];
      try {
        cond = JSON.parse(ruleForm.conditions);
      } catch {
        throw new Error('Condições devem ser um JSON válido');
      }
      try {
        act = JSON.parse(ruleForm.actions);
      } catch {
        throw new Error('Ações devem ser um array JSON válido');
      }
      return result(
        api.POST('/api/v1/automations/rules', {
          body: {
            ruleKey: ruleForm.ruleKey,
            name: ruleForm.name,
            description: ruleForm.description || undefined,
            triggerEvent: ruleForm.triggerEvent,
            conditions: cond,
            actions: act,
            timezone: ruleForm.timezone,
          },
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations', 'rules'] });
      setIsNewRuleOpen(false);
      setFeedback({ message: 'Nova versão de regra publicada!', type: 'success' });
    },
    onError: (err: unknown) => {
      setFeedback({ message: getErrorMessage(err, 'Erro ao criar regra'), type: 'error' });
    },
  });

  const reprocessExecutionMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) =>
      result(
        api.POST('/api/v1/automations/executions/{id}/reprocess', {
          params: { path: { id } },
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations', 'executions'] });
      setFeedback({ message: 'Execução reprocessada com sucesso!', type: 'success' });
    },
    onError: (err: unknown) => {
      setFeedback({ message: getErrorMessage(err, 'Erro ao reprocessar execução'), type: 'error' });
    },
  });

  const recalculateProjectionsMutation = useMutation({
    mutationFn: async () => result(api.POST('/api/v1/automations/projections/recalculate')),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations', 'indicators'] });
      setFeedback({ message: 'Projeções e indicadores recalculados!', type: 'success' });
    },
    onError: (err: unknown) => {
      setFeedback({
        message: getErrorMessage(err, 'Erro ao recalcular indicadores'),
        type: 'error',
      });
    },
  });

  const createGoalMutation = useMutation({
    mutationFn: async () =>
      result(
        api.POST('/api/v1/automations/goals', {
          body: {
            metricKey: goalForm.metricKey,
            name: goalForm.name,
            scopeType: goalForm.scopeType,
            periodStart: new Date(goalForm.periodStart).toISOString(),
            periodEnd: new Date(goalForm.periodEnd).toISOString(),
            targetValue: Number(goalForm.targetValue),
            unit: goalForm.unit,
          },
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations', 'goals'] });
      setIsNewGoalOpen(false);
      setFeedback({ message: 'Nova meta cadastrada!', type: 'success' });
    },
    onError: (err: unknown) => {
      setFeedback({ message: getErrorMessage(err, 'Erro ao criar meta'), type: 'error' });
    },
  });

  const markNotificationReadMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) =>
      result(
        api.PATCH('/api/v1/automations/notifications/{id}/read', {
          params: { path: { id } },
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations', 'notifications'] });
      queryClient.invalidateQueries({ queryKey: ['automations', 'notifications', 'unread-count'] });
    },
  });

  const markAllNotificationsReadMutation = useMutation({
    mutationFn: async () => result(api.POST('/api/v1/automations/notifications/mark-all-read')),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations', 'notifications'] });
      queryClient.invalidateQueries({ queryKey: ['automations', 'notifications', 'unread-count'] });
      setFeedback({ message: 'Todas as notificações marcadas como lidas!', type: 'success' });
    },
  });

  const savePreferencesMutation = useMutation({
    mutationFn: async () =>
      result(
        api.PUT('/api/v1/automations/notification-preferences', {
          body: {
            channel: preferenceForm.channel,
            category: preferenceForm.category,
            enabled: preferenceForm.enabled,
            quietHoursStart: preferenceForm.quietHoursStart || undefined,
            quietHoursEnd: preferenceForm.quietHoursEnd || undefined,
            timezone: 'America/Sao_Paulo',
          },
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations', 'notification-preferences'] });
      setIsPreferencesOpen(false);
      setFeedback({ message: 'Preferências de notificação salvas com sucesso!', type: 'success' });
    },
    onError: (err: unknown) => {
      setFeedback({ message: getErrorMessage(err, 'Erro ao salvar preferências'), type: 'error' });
    },
  });

  const attentionItems = attentionItemsQuery.data || [];
  const rules = rulesQuery.data || [];
  const executions = executionsQuery.data || [];
  const indicators = indicatorsQuery.data;
  const goals = goalsQuery.data || [];
  const notifications = notificationsQuery.data || [];
  const unreadCount = unreadCountQuery.data || 0;

  // Summaries
  const pendingCriticalCount = attentionItems.filter(
    (i) => i.severity === 'CRITICAL' && (i.status === 'PENDING' || i.status === 'IN_PROGRESS'),
  ).length;
  const inProgressCount = attentionItems.filter((i) => i.status === 'IN_PROGRESS').length;
  const reincidentCount = attentionItems.filter((i) => i.occurrenceCount > 1).length;
  const resolvedCount = attentionItems.filter((i) => i.status === 'RESOLVED').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#102a23' }}>
            Gestão & Automações
          </h2>
          <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.875rem' }}>
            Central de atenção operacional, motor de regras, metas com projeções e notificações.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {activeTab === 'attention' && (
            <button
              onClick={() => setIsNewAttentionItemOpen(true)}
              style={{
                background: '#087443',
                color: '#ffffff',
                border: 'none',
                padding: '0.6rem 1.25rem',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              + Novo Item de Atenção
            </button>
          )}

          {activeTab === 'indicators' && (
            <>
              <button
                onClick={() => recalculateProjectionsMutation.mutate()}
                disabled={recalculateProjectionsMutation.isPending}
                style={{
                  background: '#ffffff',
                  color: '#087443',
                  border: '1px solid #087443',
                  padding: '0.6rem 1rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                {recalculateProjectionsMutation.isPending
                  ? 'Recalculando…'
                  : 'Recalcular Projeções'}
              </button>
              <button
                onClick={() => setIsNewGoalOpen(true)}
                style={{
                  background: '#087443',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.6rem 1.25rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                + Nova Meta
              </button>
            </>
          )}

          {activeTab === 'rules' && (
            <button
              onClick={() => setIsNewRuleOpen(true)}
              style={{
                background: '#087443',
                color: '#ffffff',
                border: 'none',
                padding: '0.6rem 1.25rem',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              + Nova Regra
            </button>
          )}

          {activeTab === 'notifications' && (
            <>
              <button
                onClick={() => setIsPreferencesOpen(true)}
                style={{
                  background: '#ffffff',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  padding: '0.6rem 1rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                Horário Silencioso
              </button>
              <button
                onClick={() => markAllNotificationsReadMutation.mutate()}
                disabled={unreadCount === 0 || markAllNotificationsReadMutation.isPending}
                style={{
                  background: '#ffffff',
                  color: '#087443',
                  border: '1px solid #087443',
                  padding: '0.6rem 1rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: unreadCount > 0 ? 'pointer' : 'not-allowed',
                  opacity: unreadCount > 0 ? 1 : 0.6,
                }}
              >
                Marcar Todas Lidas
              </button>
            </>
          )}
        </div>
      </div>

      {feedback && (
        <div
          role="status"
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: '8px',
            backgroundColor:
              feedback.type === 'error'
                ? '#fee2e2'
                : feedback.type === 'info'
                  ? '#e0f2fe'
                  : '#dcfce7',
            border: `1px solid ${
              feedback.type === 'error'
                ? '#ef4444'
                : feedback.type === 'info'
                  ? '#38bdf8'
                  : '#22c55e'
            }`,
            color:
              feedback.type === 'error'
                ? '#991b1b'
                : feedback.type === 'info'
                  ? '#0369a1'
                  : '#166534',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '0.5rem',
          overflowX: 'auto',
        }}
      >
        <button
          onClick={() => setActiveTab('attention')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            border: activeTab === 'attention' ? 'none' : '1px solid #e2e8f0',
            background: activeTab === 'attention' ? '#087443' : '#f8fafc',
            color: activeTab === 'attention' ? '#ffffff' : '#64748b',
            fontWeight: activeTab === 'attention' ? 600 : 500,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <span>Central de Atenção</span>
          {pendingCriticalCount > 0 && (
            <span
              style={{
                background: activeTab === 'attention' ? '#ef4444' : '#fee2e2',
                color: activeTab === 'attention' ? '#ffffff' : '#b91c1c',
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '0.1rem 0.4rem',
                borderRadius: '9999px',
              }}
            >
              {pendingCriticalCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('indicators')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            border: activeTab === 'indicators' ? 'none' : '1px solid #e2e8f0',
            background: activeTab === 'indicators' ? '#087443' : '#f8fafc',
            color: activeTab === 'indicators' ? '#ffffff' : '#64748b',
            fontWeight: activeTab === 'indicators' ? 600 : 500,
            fontSize: '0.875rem',
            cursor: 'pointer',
          }}
        >
          Metas & Indicadores
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            border: activeTab === 'rules' ? 'none' : '1px solid #e2e8f0',
            background: activeTab === 'rules' ? '#087443' : '#f8fafc',
            color: activeTab === 'rules' ? '#ffffff' : '#64748b',
            fontWeight: activeTab === 'rules' ? 600 : 500,
            fontSize: '0.875rem',
            cursor: 'pointer',
          }}
        >
          Motor de Automações
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            border: activeTab === 'notifications' ? 'none' : '1px solid #e2e8f0',
            background: activeTab === 'notifications' ? '#087443' : '#f8fafc',
            color: activeTab === 'notifications' ? '#ffffff' : '#64748b',
            fontWeight: activeTab === 'notifications' ? 600 : 500,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <span>Notificações</span>
          {unreadCount > 0 && (
            <span
              style={{
                background: activeTab === 'notifications' ? '#FFD400' : '#fef3c7',
                color: '#102a23',
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '0.1rem 0.4rem',
                borderRadius: '9999px',
              }}
            >
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: CENTRAL DE ATENÇÃO */}
      {activeTab === 'attention' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* KPI Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
            }}
          >
            <div
              style={{
                background: '#f8fafc',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div
                style={{
                  fontSize: '0.8rem',
                  color: '#64748b',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                }}
              >
                Pendências Críticas
              </div>
              <div
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: '#dc2626',
                  marginTop: '0.25rem',
                }}
              >
                {pendingCriticalCount}
              </div>
            </div>

            <div
              style={{
                background: '#f8fafc',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div
                style={{
                  fontSize: '0.8rem',
                  color: '#64748b',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                }}
              >
                Em Tratamento
              </div>
              <div
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: '#0284c7',
                  marginTop: '0.25rem',
                }}
              >
                {inProgressCount}
              </div>
            </div>

            <div
              style={{
                background: '#f8fafc',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div
                style={{
                  fontSize: '0.8rem',
                  color: '#64748b',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                }}
              >
                Alertas Reincidentes
              </div>
              <div
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: '#b45309',
                  marginTop: '0.25rem',
                }}
              >
                {reincidentCount}
              </div>
            </div>

            <div
              style={{
                background: '#f8fafc',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div
                style={{
                  fontSize: '0.8rem',
                  color: '#64748b',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                }}
              >
                Resolvidos
              </div>
              <div
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: '#15803d',
                  marginTop: '0.25rem',
                }}
              >
                {resolvedCount}
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              alignItems: 'center',
              flexWrap: 'wrap',
              background: '#f8fafc',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>
                Status:
              </label>
              <select
                value={attentionStatusFilter}
                onChange={(e) => setAttentionStatusFilter(e.target.value)}
                style={{
                  padding: '0.4rem 0.6rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '0.875rem',
                  color: '#0f172a',
                }}
              >
                <option value="ALL">Todos</option>
                <option value="PENDING">Pendente</option>
                <option value="IN_PROGRESS">Em Andamento</option>
                <option value="WAITING_EXTERNAL">Aguardando Terceiros</option>
                <option value="RESOLVED">Resolvido</option>
                <option value="DISCARDED">Descartado</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>
                Severidade:
              </label>
              <select
                value={attentionSeverityFilter}
                onChange={(e) => setAttentionSeverityFilter(e.target.value)}
                style={{
                  padding: '0.4rem 0.6rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '0.875rem',
                  color: '#0f172a',
                }}
              >
                <option value="ALL">Todas</option>
                <option value="CRITICAL">Crítica</option>
                <option value="HIGH">Alta</option>
                <option value="MEDIUM">Média</option>
                <option value="LOW">Baixa</option>
              </select>
            </div>
          </div>

          {/* Attention Items Table */}
          <div
            className="table-wrapper"
            style={{
              overflowX: 'auto',
              background: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
            }}
          >
            <table
              className="data-table"
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '0.875rem',
              }}
            >
              <thead>
                <tr
                  style={{
                    background: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    color: '#475569',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                  }}
                >
                  <th style={{ padding: '0.75rem' }}>Severidade</th>
                  <th style={{ padding: '0.75rem' }}>Título & Motivo</th>
                  <th style={{ padding: '0.75rem' }}>Origem</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>Ocorrências</th>
                  <th style={{ padding: '0.75rem' }}>Prazo Limite</th>
                  <th style={{ padding: '0.75rem' }}>Status</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {attentionItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}
                    >
                      Nenhum item de atenção localizado para estes filtros.
                    </td>
                  </tr>
                ) : (
                  attentionItems.map((item) => {
                    const isResolvedOrDiscarded =
                      item.status === 'RESOLVED' || item.status === 'DISCARDED';
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.75rem' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background:
                                item.severity === 'CRITICAL'
                                  ? '#fee2e2'
                                  : item.severity === 'HIGH'
                                    ? '#ffedd5'
                                    : item.severity === 'MEDIUM'
                                      ? '#fef3c7'
                                      : '#f1f5f9',
                              color:
                                item.severity === 'CRITICAL'
                                  ? '#b91c1c'
                                  : item.severity === 'HIGH'
                                    ? '#c2410c'
                                    : item.severity === 'MEDIUM'
                                      ? '#b45309'
                                      : '#475569',
                            }}
                          >
                            {item.severity}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.title}</div>
                          {item.description && (
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {item.description}
                            </div>
                          )}
                          <div
                            style={{
                              fontSize: '0.7rem',
                              color: '#94a3b8',
                              fontFamily: 'monospace',
                              marginTop: '0.1rem',
                            }}
                          >
                            {item.reasonCode}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <span
                            style={{
                              padding: '0.2rem 0.4rem',
                              background: '#f1f5f9',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              color: '#475569',
                            }}
                          >
                            {item.sourceType}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          {item.occurrenceCount > 1 ? (
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '0.15rem 0.4rem',
                                borderRadius: '9999px',
                                background: '#fef3c7',
                                color: '#b45309',
                                fontWeight: 700,
                                fontSize: '0.75rem',
                              }}
                            >
                              {item.occurrenceCount}x
                            </span>
                          ) : (
                            <span style={{ color: '#64748b', fontSize: '0.8rem' }}>1</span>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem', color: '#64748b', fontSize: '0.8rem' }}>
                          {item.dueAt ? new Date(item.dueAt).toLocaleDateString('pt-BR') : '—'}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              background:
                                item.status === 'RESOLVED'
                                  ? '#dcfce7'
                                  : item.status === 'DISCARDED'
                                    ? '#f1f5f9'
                                    : item.status === 'IN_PROGRESS'
                                      ? '#e0f2fe'
                                      : '#fef3c7',
                              color:
                                item.status === 'RESOLVED'
                                  ? '#15803d'
                                  : item.status === 'DISCARDED'
                                    ? '#64748b'
                                    : item.status === 'IN_PROGRESS'
                                      ? '#0369a1'
                                      : '#b45309',
                            }}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          {!isResolvedOrDiscarded ? (
                            <div
                              style={{
                                display: 'flex',
                                gap: '0.4rem',
                                justifyContent: 'flex-end',
                              }}
                            >
                              <button
                                onClick={() => {
                                  setSelectedAttentionItemForResolution(item);
                                  setResolutionReasonText('');
                                }}
                                style={{
                                  background: '#087443',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '4px',
                                  padding: '0.35rem 0.6rem',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                Resolver
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedAttentionItemForDiscard(item);
                                  setResolutionReasonText('');
                                }}
                                style={{
                                  background: '#ffffff',
                                  color: '#dc2626',
                                  border: '1px solid #fca5a5',
                                  borderRadius: '4px',
                                  padding: '0.35rem 0.6rem',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                Descartar
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                              {item.resolutionReason || 'Finalizado'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: METAS & INDICADORES */}
      {activeTab === 'indicators' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Executive Indicators Grid */}
          <div>
            <h3
              style={{ fontSize: '1.1rem', fontWeight: 700, color: '#102a23', margin: '0 0 1rem' }}
            >
              Painel Executivo em Tempo Real
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1rem',
              }}
            >
              <div
                style={{
                  background: '#f8fafc',
                  padding: '1.25rem',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div
                  style={{
                    fontSize: '0.8rem',
                    color: '#64748b',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                  }}
                >
                  Vendas Ganhas (Pipeline)
                </div>
                <div
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: '#087443',
                    marginTop: '0.35rem',
                  }}
                >
                  {indicators
                    ? Number(indicators.commercial.wonOpportunitiesValue).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })
                    : 'R$ 0,00'}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                  {indicators?.commercial.wonOpportunitiesCount || 0} oportunidades ganhas
                </div>
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  padding: '1.25rem',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div
                  style={{
                    fontSize: '0.8rem',
                    color: '#64748b',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                  }}
                >
                  Propostas Aceitas
                </div>
                <div
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: '#0284c7',
                    marginTop: '0.35rem',
                  }}
                >
                  {indicators
                    ? Number(indicators.commercial.acceptedProposalsValue).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })
                    : 'R$ 0,00'}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                  {indicators?.commercial.acceptedProposalsCount || 0} contratos fechados
                </div>
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  padding: '1.25rem',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div
                  style={{
                    fontSize: '0.8rem',
                    color: '#64748b',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                  }}
                >
                  Inadimplência / A Receber Vencido
                </div>
                <div
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: '#dc2626',
                    marginTop: '0.35rem',
                  }}
                >
                  {indicators
                    ? Number(indicators.financial.overdueReceivablesValue).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })
                    : 'R$ 0,00'}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                  {indicators?.financial.overdueReceivablesCount || 0} títulos pendentes
                </div>
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  padding: '1.25rem',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div
                  style={{
                    fontSize: '0.8rem',
                    color: '#64748b',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                  }}
                >
                  Instalações & Obras Concluídas
                </div>
                <div
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: '#15803d',
                    marginTop: '0.35rem',
                  }}
                >
                  {indicators?.operations.completedProjectsCount || 0}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                  {indicators?.operations.completedWorkOrdersCount || 0} ordens de serviço
                  finalizadas
                </div>
              </div>
            </div>
          </div>

          {/* Goals List */}
          <div>
            <h3
              style={{ fontSize: '1.1rem', fontWeight: 700, color: '#102a23', margin: '0 0 1rem' }}
            >
              Metas & Acompanhamento de Metas
            </h3>
            {goals.length === 0 ? (
              <div
                style={{
                  background: '#ffffff',
                  padding: '2rem',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  textAlign: 'center',
                  color: '#64748b',
                }}
              >
                Nenhuma meta cadastrada no momento. Clique em &quot;+ Nova Meta&quot; acima para
                registrar.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {goals.map((goal) => {
                  const percent = Math.min(goal.progressPercent || 0, 100);
                  return (
                    <div
                      key={goal.id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '1.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>
                            {goal.name}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            Escopo: {goal.scopeType} • Métrica: {goal.metricKey} • Versão{' '}
                            {goal.version}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#087443' }}>
                            {percent}%
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div
                        style={{
                          width: '100%',
                          height: '8px',
                          background: '#e2e8f0',
                          borderRadius: '9999px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${percent}%`,
                            height: '100%',
                            background:
                              percent >= 100 ? '#15803d' : percent >= 50 ? '#087443' : '#d97706',
                            borderRadius: '9999px',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.8rem',
                          color: '#64748b',
                        }}
                      >
                        <span>
                          Atual:{' '}
                          {goal.unit === 'BRL'
                            ? Number(goal.currentValue).toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              })
                            : `${goal.currentValue} ${goal.unit}`}
                        </span>
                        <span>
                          Alvo:{' '}
                          {goal.unit === 'BRL'
                            ? Number(goal.targetValue).toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              })
                            : `${goal.targetValue} ${goal.unit}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: MOTOR DE REGRAS & EXECUÇÕES */}
      {activeTab === 'rules' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Rules Section */}
          <div>
            <h3
              style={{ fontSize: '1.1rem', fontWeight: 700, color: '#102a23', margin: '0 0 1rem' }}
            >
              Catálogo de Regras Versionadas
            </h3>
            {rules.length === 0 ? (
              <div
                style={{
                  background: '#ffffff',
                  padding: '2rem',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  textAlign: 'center',
                  color: '#64748b',
                }}
              >
                Nenhuma regra cadastrada. Clique em &quot;+ Nova Regra&quot; para criar uma regra de
                automação.
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '1rem',
                }}
              >
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{rule.name}</div>
                        <div
                          style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#64748b' }}
                        >
                          {rule.ruleKey} (v{rule.version})
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          background: rule.status === 'ACTIVE' ? '#dcfce7' : '#f1f5f9',
                          color: rule.status === 'ACTIVE' ? '#15803d' : '#64748b',
                        }}
                      >
                        {rule.status}
                      </span>
                    </div>

                    {rule.description && (
                      <p style={{ fontSize: '0.8rem', color: '#475569', margin: 0 }}>
                        {rule.description}
                      </p>
                    )}

                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: '#64748b',
                        marginTop: '0.5rem',
                        borderTop: '1px solid #f1f5f9',
                        paddingTop: '0.5rem',
                      }}
                    >
                      Gatilho: <strong style={{ color: '#0f172a' }}>{rule.triggerEvent}</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Execution Logs Table */}
          <div>
            <h3
              style={{ fontSize: '1.1rem', fontWeight: 700, color: '#102a23', margin: '0 0 1rem' }}
            >
              Logs de Execuções e Idempotência
            </h3>
            <div
              className="table-wrapper"
              style={{
                overflowX: 'auto',
                background: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              <table
                className="data-table"
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  textAlign: 'left',
                  fontSize: '0.875rem',
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: '#f8fafc',
                      borderBottom: '1px solid #e2e8f0',
                      color: '#475569',
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                    }}
                  >
                    <th style={{ padding: '0.75rem' }}>Data/Hora</th>
                    <th style={{ padding: '0.75rem' }}>Regra</th>
                    <th style={{ padding: '0.75rem' }}>Chave Idempotência</th>
                    <th style={{ padding: '0.75rem' }}>Tentativa</th>
                    <th style={{ padding: '0.75rem' }}>Status</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {executions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}
                      >
                        Nenhuma execução de automação registrada até o momento.
                      </td>
                    </tr>
                  ) : (
                    executions.map((exec) => (
                      <tr key={exec.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.75rem', color: '#64748b', fontSize: '0.8rem' }}>
                          {new Date(exec.startedAt).toLocaleString('pt-BR')}
                        </td>
                        <td style={{ padding: '0.75rem', fontWeight: 600, color: '#0f172a' }}>
                          {exec.ruleVersion?.name || exec.ruleVersionId}
                        </td>
                        <td
                          style={{
                            padding: '0.75rem',
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            color: '#475569',
                          }}
                        >
                          {exec.idempotencyKey}
                        </td>
                        <td style={{ padding: '0.75rem', color: '#64748b' }}>#{exec.attempt}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background:
                                exec.status === 'SUCCESS'
                                  ? '#dcfce7'
                                  : exec.status === 'FAILED'
                                    ? '#fee2e2'
                                    : '#fef3c7',
                              color:
                                exec.status === 'SUCCESS'
                                  ? '#15803d'
                                  : exec.status === 'FAILED'
                                    ? '#b91c1c'
                                    : '#b45309',
                            }}
                          >
                            {exec.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          {exec.status === 'FAILED' && (
                            <button
                              onClick={() => reprocessExecutionMutation.mutate({ id: exec.id })}
                              disabled={reprocessExecutionMutation.isPending}
                              style={{
                                background: '#087443',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '0.35rem 0.6rem',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Reprocessar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: NOTIFICAÇÕES */}
      {activeTab === 'notifications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {notifications.length === 0 ? (
            <div
              style={{
                background: '#ffffff',
                padding: '2.5rem',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                textAlign: 'center',
                color: '#64748b',
              }}
            >
              Nenhuma notificação registrada na sua caixa de entrada.
            </div>
          ) : (
            notifications.map((notif) => {
              const isUnread = notif.status === 'UNREAD';
              return (
                <div
                  key={notif.id}
                  style={{
                    background: isUnread ? '#f0fdf4' : '#ffffff',
                    border: `1px solid ${isUnread ? '#bbf7d0' : '#e2e8f0'}`,
                    borderRadius: '8px',
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    {isUnread && (
                      <div
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: '#087443',
                          marginTop: '0.4rem',
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>
                          {notif.subject}
                        </span>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px',
                            background: '#f1f5f9',
                            color: '#475569',
                          }}
                        >
                          {notif.category}
                        </span>
                      </div>
                      <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem', color: '#475569' }}>
                        {notif.body}
                      </p>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.4rem' }}>
                        {new Date(notif.createdAt).toLocaleString('pt-BR')}
                      </div>
                    </div>
                  </div>

                  {isUnread && (
                    <button
                      onClick={() => markNotificationReadMutation.mutate({ id: notif.id })}
                      disabled={markNotificationReadMutation.isPending}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '4px',
                        padding: '0.35rem 0.6rem',
                        fontSize: '0.75rem',
                        color: '#475569',
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Marcar Lida
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* MODAL: NOVO ITEM DE ATENÇÃO */}
      {isNewAttentionItemOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '8px',
              padding: '1.5rem',
              maxWidth: '550px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              border: '1px solid #e2e8f0',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h3
              style={{ margin: '0 0 1rem', fontSize: '1.25rem', fontWeight: 700, color: '#102a23' }}
            >
              Novo Item de Atenção
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createAttentionItemMutation.mutate();
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: '0.25rem',
                  }}
                >
                  Título
                </label>
                <input
                  type="text"
                  required
                  value={attentionForm.title}
                  onChange={(e) => setAttentionForm({ ...attentionForm, title: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                  }}
                  placeholder="Ex: Proposta aguardando documentação do cliente"
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: '0.25rem',
                  }}
                >
                  Descrição Detalhada
                </label>
                <textarea
                  rows={3}
                  value={attentionForm.description}
                  onChange={(e) =>
                    setAttentionForm({ ...attentionForm, description: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                  }}
                  placeholder="Detalhes adicionais sobre o bloqueio ou ação necessária..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      marginBottom: '0.25rem',
                    }}
                  >
                    Origem
                  </label>
                  <select
                    value={attentionForm.sourceType}
                    onChange={(e) =>
                      setAttentionForm({ ...attentionForm, sourceType: e.target.value })
                    }
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                    }}
                  >
                    <option value="COMMERCIAL">Comercial</option>
                    <option value="ENGINEERING">Engenharia</option>
                    <option value="FINANCIAL">Financeiro</option>
                    <option value="AFTER_SALES">Pós-Venda</option>
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      marginBottom: '0.25rem',
                    }}
                  >
                    Severidade
                  </label>
                  <select
                    value={attentionForm.severity}
                    onChange={(e) =>
                      setAttentionForm({
                        ...attentionForm,
                        severity: e.target.value as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
                      })
                    }
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                    }}
                  >
                    <option value="LOW">Baixa</option>
                    <option value="MEDIUM">Média</option>
                    <option value="HIGH">Alta</option>
                    <option value="CRITICAL">Crítica</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: '0.25rem',
                  }}
                >
                  Código do Motivo
                </label>
                <input
                  type="text"
                  required
                  value={attentionForm.reasonCode}
                  onChange={(e) =>
                    setAttentionForm({ ...attentionForm, reasonCode: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                  }}
                  placeholder="EX: SLA_EXCEEDED, MISSING_DOCUMENT"
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: '0.25rem',
                  }}
                >
                  Prazo Limite
                </label>
                <input
                  type="date"
                  value={attentionForm.dueAt}
                  onChange={(e) => setAttentionForm({ ...attentionForm, dueAt: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  marginTop: '0.5rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsNewAttentionItemOpen(false)}
                  style={{
                    background: '#ffffff',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createAttentionItemMutation.isPending}
                  style={{
                    background: '#087443',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.5rem 1.25rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {createAttentionItemMutation.isPending ? 'Salvando…' : 'Salvar Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESOLVER ITEM COM JUSTIFICATIVA OBRIGATÓRIA */}
      {selectedAttentionItemForResolution && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '8px',
              padding: '1.5rem',
              maxWidth: '500px',
              width: '100%',
              border: '1px solid #e2e8f0',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h3
              style={{
                margin: '0 0 0.5rem',
                fontSize: '1.25rem',
                fontWeight: 700,
                color: '#102a23',
              }}
            >
              Resolver Item de Atenção
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 0 1rem' }}>
              Justifique formalmente a resolução de{' '}
              <strong>{selectedAttentionItemForResolution.title}</strong>.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (resolutionReasonText.trim().length < 3) {
                  setFeedback({
                    message: 'A justificativa deve conter no mínimo 3 caracteres.',
                    type: 'error',
                  });
                  return;
                }
                resolveAttentionItemMutation.mutate({
                  id: selectedAttentionItemForResolution.id,
                  reason: resolutionReasonText.trim(),
                });
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: '0.25rem',
                  }}
                >
                  Justificativa de Resolução (Obrigatória)
                </label>
                <textarea
                  required
                  rows={3}
                  value={resolutionReasonText}
                  onChange={(e) => setResolutionReasonText(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                  }}
                  placeholder="Ex: Documento recebido do cliente e anexado ao processo."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setSelectedAttentionItemForResolution(null)}
                  style={{
                    background: '#ffffff',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={resolveAttentionItemMutation.isPending}
                  style={{
                    background: '#087443',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.5rem 1.25rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {resolveAttentionItemMutation.isPending ? 'Resolvendo…' : 'Confirmar Resolução'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DESCARTAR ITEM COM JUSTIFICATIVA OBRIGATÓRIA */}
      {selectedAttentionItemForDiscard && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '8px',
              padding: '1.5rem',
              maxWidth: '500px',
              width: '100%',
              border: '1px solid #e2e8f0',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h3
              style={{
                margin: '0 0 0.5rem',
                fontSize: '1.25rem',
                fontWeight: 700,
                color: '#dc2626',
              }}
            >
              Descartar Item de Atenção
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 0 1rem' }}>
              Informe o motivo para descarte de{' '}
              <strong>{selectedAttentionItemForDiscard.title}</strong>.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (resolutionReasonText.trim().length < 3) {
                  setFeedback({
                    message: 'O motivo deve conter no mínimo 3 caracteres.',
                    type: 'error',
                  });
                  return;
                }
                discardAttentionItemMutation.mutate({
                  id: selectedAttentionItemForDiscard.id,
                  reason: resolutionReasonText.trim(),
                });
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: '0.25rem',
                  }}
                >
                  Motivo do Descarte (Obrigatório)
                </label>
                <textarea
                  required
                  rows={3}
                  value={resolutionReasonText}
                  onChange={(e) => setResolutionReasonText(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                  }}
                  placeholder="Ex: Alerta gerado por duplicidade de sistema ou teste."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setSelectedAttentionItemForDiscard(null)}
                  style={{
                    background: '#ffffff',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={discardAttentionItemMutation.isPending}
                  style={{
                    background: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.5rem 1.25rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {discardAttentionItemMutation.isPending ? 'Descartando…' : 'Confirmar Descarte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVA REGRA */}
      {isNewRuleOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '8px',
              padding: '1.5rem',
              maxWidth: '550px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              border: '1px solid #e2e8f0',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h3
              style={{ margin: '0 0 1rem', fontSize: '1.25rem', fontWeight: 700, color: '#102a23' }}
            >
              Nova Regra de Automação
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createRuleMutation.mutate();
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: '0.25rem',
                  }}
                >
                  Chave da Regra (Key única)
                </label>
                <input
                  type="text"
                  required
                  value={ruleForm.ruleKey}
                  onChange={(e) => setRuleForm({ ...ruleForm, ruleKey: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                  }}
                  placeholder="EX: NOTIFY_OVERDUE_RECEIVABLE"
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: '0.25rem',
                  }}
                >
                  Nome da Regra
                </label>
                <input
                  type="text"
                  required
                  value={ruleForm.name}
                  onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                  }}
                  placeholder="Ex: Alerta de Inadimplência Superior a 5 Dias"
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: '0.25rem',
                  }}
                >
                  Evento Disparador (Trigger)
                </label>
                <input
                  type="text"
                  required
                  value={ruleForm.triggerEvent}
                  onChange={(e) => setRuleForm({ ...ruleForm, triggerEvent: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                  }}
                  placeholder="Ex: financial.receivable_overdue"
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: '0.25rem',
                  }}
                >
                  Condições (JSON)
                </label>
                <textarea
                  rows={3}
                  value={ruleForm.conditions}
                  onChange={(e) => setRuleForm({ ...ruleForm, conditions: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: '0.25rem',
                  }}
                >
                  Ações (Array JSON)
                </label>
                <textarea
                  rows={3}
                  value={ruleForm.actions}
                  onChange={(e) => setRuleForm({ ...ruleForm, actions: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsNewRuleOpen(false)}
                  style={{
                    background: '#ffffff',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createRuleMutation.isPending}
                  style={{
                    background: '#087443',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.5rem 1.25rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {createRuleMutation.isPending ? 'Salvando…' : 'Salvar Regra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVA META */}
      {isNewGoalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '8px',
              padding: '1.5rem',
              maxWidth: '500px',
              width: '100%',
              border: '1px solid #e2e8f0',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h3
              style={{ margin: '0 0 1rem', fontSize: '1.25rem', fontWeight: 700, color: '#102a23' }}
            >
              Cadastrar Nova Meta
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createGoalMutation.mutate();
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: '0.25rem',
                  }}
                >
                  Nome da Meta
                </label>
                <input
                  type="text"
                  required
                  value={goalForm.name}
                  onChange={(e) => setGoalForm({ ...goalForm, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                  }}
                  placeholder="Ex: Meta de Vendas Mensal"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      marginBottom: '0.25rem',
                    }}
                  >
                    Métrica
                  </label>
                  <select
                    value={goalForm.metricKey}
                    onChange={(e) => setGoalForm({ ...goalForm, metricKey: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                    }}
                  >
                    <option value="SALES_VALUE">Volume de Vendas (R$)</option>
                    <option value="PROPOSALS_ACCEPTED">Propostas Aceitas</option>
                    <option value="INSTALLATIONS_COUNT">Instalações Entregues</option>
                    <option value="SUPPORT_SLA_PERCENT">SLA Suporte (%)</option>
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      marginBottom: '0.25rem',
                    }}
                  >
                    Unidade
                  </label>
                  <select
                    value={goalForm.unit}
                    onChange={(e) =>
                      setGoalForm({
                        ...goalForm,
                        unit: e.target.value as 'BRL' | 'COUNT' | 'PERCENT' | 'KWH',
                      })
                    }
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                    }}
                  >
                    <option value="BRL">Reais (R$)</option>
                    <option value="COUNT">Quantidade</option>
                    <option value="PERCENT">Percentual (%)</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: '0.25rem',
                  }}
                >
                  Valor Alvo
                </label>
                <input
                  type="number"
                  required
                  value={goalForm.targetValue}
                  onChange={(e) =>
                    setGoalForm({ ...goalForm, targetValue: Number(e.target.value) })
                  }
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      marginBottom: '0.25rem',
                    }}
                  >
                    Data Início
                  </label>
                  <input
                    type="date"
                    required
                    value={goalForm.periodStart}
                    onChange={(e) => setGoalForm({ ...goalForm, periodStart: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      marginBottom: '0.25rem',
                    }}
                  >
                    Data Fim
                  </label>
                  <input
                    type="date"
                    required
                    value={goalForm.periodEnd}
                    onChange={(e) => setGoalForm({ ...goalForm, periodEnd: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsNewGoalOpen(false)}
                  style={{
                    background: '#ffffff',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createGoalMutation.isPending}
                  style={{
                    background: '#087443',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.5rem 1.25rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {createGoalMutation.isPending ? 'Salvando…' : 'Salvar Meta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PREFERÊNCIAS / HORÁRIO SILENCIOSO */}
      {isPreferencesOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '8px',
              padding: '1.5rem',
              maxWidth: '450px',
              width: '100%',
              border: '1px solid #e2e8f0',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h3
              style={{
                margin: '0 0 0.5rem',
                fontSize: '1.25rem',
                fontWeight: 700,
                color: '#102a23',
              }}
            >
              Horário Silencioso & Preferências
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1rem' }}>
              Defina a janela de repouso na qual notificações operacionais não urgentes serão
              pausadas.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                savePreferencesMutation.mutate();
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      marginBottom: '0.25rem',
                    }}
                  >
                    Início Silêncio
                  </label>
                  <input
                    type="time"
                    value={preferenceForm.quietHoursStart}
                    onChange={(e) =>
                      setPreferenceForm({ ...preferenceForm, quietHoursStart: e.target.value })
                    }
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      marginBottom: '0.25rem',
                    }}
                  >
                    Fim Silêncio
                  </label>
                  <input
                    type="time"
                    value={preferenceForm.quietHoursEnd}
                    onChange={(e) =>
                      setPreferenceForm({ ...preferenceForm, quietHoursEnd: e.target.value })
                    }
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="enabledNotif"
                  checked={preferenceForm.enabled}
                  onChange={(e) =>
                    setPreferenceForm({ ...preferenceForm, enabled: e.target.checked })
                  }
                />
                <label htmlFor="enabledNotif" style={{ fontSize: '0.875rem', color: '#0f172a' }}>
                  Receber notificações internas ativas
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsPreferencesOpen(false)}
                  style={{
                    background: '#ffffff',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savePreferencesMutation.isPending}
                  style={{
                    background: '#087443',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.5rem 1.25rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {savePreferencesMutation.isPending ? 'Salvando…' : 'Salvar Preferências'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
