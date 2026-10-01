'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, result, allows } from '../identity/client';
import { Feedback } from '../identity/feedback';
import { Button } from '../../ui/Button';
import type { Schemas } from '@moura-solar/api-client';

type Activity = Schemas['ActivityViewDto'];

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  CALL: 'Ligação',
  MESSAGE: 'WhatsApp / Mensagem',
  MEETING: 'Reunião',
  VISIT: 'Visita Técnica',
  EMAIL: 'E-mail',
  TASK: 'Tarefa Interna',
};

const RESULT_CODE_PRESETS = [
  { code: 'CONTATO_EFETUADO', label: 'Contato Efetivado com Sucesso' },
  { code: 'SEM_RESPOSTA', label: 'Sem Resposta / Não Atendeu' },
  { code: 'REUNIAO_REALIZADA', label: 'Reunião Realizada' },
  { code: 'VISITA_REALIZADA', label: 'Visita Técnica Concluída' },
  { code: 'PROPOSTA_APRESENTADA', label: 'Proposta Apresentada' },
  { code: 'REAGENDAMENTO_SOLICITADO', label: 'Cliente Solicitou Reagendamento' },
  { code: 'OUTRO', label: 'Outro Resultado' },
];

export function Activities() {
  const queryClient = useQueryClient();
  const [tabFilter, setTabFilter] = useState<'PENDING' | 'OVERDUE' | 'ALL'>('PENDING');
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  // Modal states
  const [isCreating, setIsCreating] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

  // Create form state
  const [newType, setNewType] = useState<
    'CALL' | 'MESSAGE' | 'MEETING' | 'VISIT' | 'EMAIL' | 'TASK'
  >('CALL');
  const [newSubject, setNewSubject] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDueAt, setNewDueAt] = useState(
    new Date(Date.now() + 86400000).toISOString().slice(0, 16),
  );
  const [newCustomerId, setNewCustomerId] = useState('');
  const [newOpportunityId, setNewOpportunityId] = useState('');

  // Complete form state
  const [completeResultCode, setCompleteResultCode] = useState('CONTATO_EFETUADO');
  const [completeCustomResult, setCompleteCustomResult] = useState('');
  const [completeNotes, setCompleteNotes] = useState('');
  const [hasFollowUp, setHasFollowUp] = useState(false);
  const [followUpType, setFollowUpType] = useState<
    'CALL' | 'MESSAGE' | 'MEETING' | 'VISIT' | 'EMAIL' | 'TASK'
  >('CALL');
  const [followUpSubject, setFollowUpSubject] = useState('');
  const [followUpDueAt, setFollowUpDueAt] = useState(
    new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 16),
  );

  // Reschedule form state
  const [rescheduleDueAt, setRescheduleDueAt] = useState('');
  const [rescheduleNotes, setRescheduleNotes] = useState('');

  // Context for permissions
  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => result(api.GET('/api/v1/identity/me')),
  });
  const canManage = me.data ? allows(me.data, 'activities:manage', false) : false;

  const activitiesQuery = useQuery({
    queryKey: ['activities', tabFilter],
    queryFn: () =>
      result(
        api.GET('/api/v1/activities', {
          params: {
            query: {
              status: tabFilter === 'ALL' ? undefined : 'OPEN',
              overdue: tabFilter === 'OVERDUE' ? 'true' : undefined,
            },
          },
        }),
      ),
  });

  const customersList = useQuery({
    queryKey: ['customers', 'ACTIVE'],
    queryFn: () =>
      result(
        api.GET('/api/v1/customers', {
          params: { query: { status: 'ACTIVE', take: '100' } },
        }),
      ),
    enabled: isCreating,
  });

  const oppsList = useQuery({
    queryKey: ['opportunities', 'ALL'],
    queryFn: () =>
      result(
        api.GET('/api/v1/opportunities', {
          params: { query: { take: '100' } },
        }),
      ),
    enabled: isCreating,
  });

  const createMutation = useMutation({
    mutationFn: async () =>
      result(
        api.POST('/api/v1/activities', {
          body: {
            type: newType,
            subject: newSubject,
            description: newDescription || undefined,
            dueAt: new Date(newDueAt).toISOString(),
            customerId: newCustomerId || undefined,
            opportunityId: newOpportunityId || undefined,
          },
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      setIsCreating(false);
      resetCreateForm();
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedActivity) return;
      const resultCode = completeResultCode === 'OUTRO' ? completeCustomResult : completeResultCode;

      return result(
        api.POST('/api/v1/activities/{activityId}/complete', {
          params: { path: { activityId: selectedActivity.id } },
          body: {
            expectedVersion: selectedActivity.version,
            resultCode,
            resultNotes: completeNotes || undefined,
            nextActivity: hasFollowUp
              ? {
                  type: followUpType,
                  subject: followUpSubject,
                  dueAt: new Date(followUpDueAt).toISOString(),
                }
              : undefined,
          },
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      setIsCompleting(false);
      setSelectedActivity(null);
      resetCompleteForm();
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: async () => {
      if (!selectedActivity) return;
      return result(
        api.POST('/api/v1/activities/{activityId}/reschedule', {
          params: { path: { activityId: selectedActivity.id } },
          body: {
            expectedVersion: selectedActivity.version,
            dueAt: new Date(rescheduleDueAt).toISOString(),
            notes: rescheduleNotes || undefined,
          },
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      setIsRescheduling(false);
      setSelectedActivity(null);
      resetRescheduleForm();
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!selectedActivity) return;
      return result(
        api.POST('/api/v1/activities/{activityId}/cancel', {
          params: { path: { activityId: selectedActivity.id } },
          body: {
            expectedVersion: selectedActivity.version,
          },
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      setIsCanceling(false);
      setSelectedActivity(null);
    },
  });

  function resetCreateForm() {
    setNewType('CALL');
    setNewSubject('');
    setNewDescription('');
    setNewDueAt(new Date(Date.now() + 86400000).toISOString().slice(0, 16));
    setNewCustomerId('');
    setNewOpportunityId('');
  }

  function resetCompleteForm() {
    setCompleteResultCode('CONTATO_EFETUADO');
    setCompleteCustomResult('');
    setCompleteNotes('');
    setHasFollowUp(false);
    setFollowUpSubject('');
  }

  function resetRescheduleForm() {
    setRescheduleDueAt('');
    setRescheduleNotes('');
  }

  const items = activitiesQuery.data ?? [];
  const customers = customersList.data?.items ?? [];
  const opps = oppsList.data?.items ?? [];

  const pendingCount = items.filter((a) => a.status === 'OPEN').length;
  const overdueCount = items.filter(
    (a) => a.status === 'OPEN' && new Date(a.dueAt).getTime() < Date.now(),
  ).length;
  const completedCount = items.filter((a) => a.status === 'COMPLETED').length;

  return (
    <div className="commercial-activities">
      {/* TOOLBAR */}
      <div className="comm-toolbar">
        <div className="comm-toolbar__title-group">
          <h2 className="comm-toolbar__title">Atividades Comerciais</h2>
          <span className="comm-toolbar__count">{items.length} atividades</span>
        </div>
        <div className="comm-toolbar__actions">
          {canManage && !isCreating && (
            <Button
              variant="primary"
              onClick={() => {
                setIsCreating(true);
                setSelectedActivity(null);
              }}
            >
              + Nova Atividade
            </Button>
          )}
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="comm-kpi-grid">
        <div className="comm-kpi-card">
          <div className="comm-kpi-card__label">Total Registradas</div>
          <div className="comm-kpi-card__value">{items.length}</div>
          <div className="comm-kpi-card__subtext">Volume de tarefas</div>
        </div>
        <div className="comm-kpi-card">
          <div className="comm-kpi-card__label">Pendentes</div>
          <div className="comm-kpi-card__value" style={{ color: 'var(--brand-solar, #ffd400)' }}>
            {pendingCount}
          </div>
          <div className="comm-kpi-card__subtext">Aguardando ação</div>
        </div>
        <div className="comm-kpi-card">
          <div className="comm-kpi-card__label">Atrasadas</div>
          <div className="comm-kpi-card__value" style={{ color: '#EF4444' }}>
            {overdueCount}
          </div>
          <div className="comm-kpi-card__subtext">Prazo expirado</div>
        </div>
        <div className="comm-kpi-card">
          <div className="comm-kpi-card__label">Concluídas</div>
          <div className="comm-kpi-card__value" style={{ color: '#10B981' }}>
            {completedCount}
          </div>
          <div className="comm-kpi-card__subtext">Finalizadas</div>
        </div>
      </div>

      <Feedback
        error={
          activitiesQuery.error ||
          createMutation.error ||
          completeMutation.error ||
          rescheduleMutation.error ||
          cancelMutation.error
        }
      />

      {/* FILTER TABS */}
      <div className="comm-tabs-nav" role="tablist" aria-label="Filtro de atividades">
        <button
          role="tab"
          aria-selected={tabFilter === 'PENDING'}
          aria-current={tabFilter === 'PENDING' ? 'true' : undefined}
          className={`comm-tab-btn ${tabFilter === 'PENDING' ? 'comm-tab-btn--active' : ''}`}
          onClick={() => setTabFilter('PENDING')}
        >
          Pendentes
        </button>
        <button
          role="tab"
          aria-selected={tabFilter === 'OVERDUE'}
          aria-current={tabFilter === 'OVERDUE' ? 'true' : undefined}
          className={`comm-tab-btn ${tabFilter === 'OVERDUE' ? 'comm-tab-btn--active' : ''}`}
          onClick={() => setTabFilter('OVERDUE')}
        >
          Atrasadas
        </button>
        <button
          role="tab"
          aria-selected={tabFilter === 'ALL'}
          aria-current={tabFilter === 'ALL' ? 'true' : undefined}
          className={`comm-tab-btn ${tabFilter === 'ALL' ? 'comm-tab-btn--active' : ''}`}
          onClick={() => setTabFilter('ALL')}
        >
          Todas
        </button>
      </div>

      {/* CREATE ACTIVITY MODAL */}
      {isCreating && (
        <div className="comm-modal-overlay">
          <section
            className="comm-modal-box"
            style={{ maxWidth: '640px' }}
            aria-labelledby="create-activity-title"
            role="dialog"
            aria-modal="true"
          >
            <div className="comm-modal-header">
              <h3 id="create-activity-title" className="comm-modal-title">
                Agendar Nova Atividade
              </h3>
              <button
                type="button"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary, #9ba49e)',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                }}
                onClick={() => setIsCreating(false)}
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate();
              }}
            >
              <div className="form-grid">
                <label>
                  Tipo de Atividade *
                  <select
                    value={newType}
                    onChange={(e) =>
                      setNewType(
                        e.target.value as
                          'CALL' | 'MESSAGE' | 'MEETING' | 'VISIT' | 'EMAIL' | 'TASK',
                      )
                    }
                  >
                    <option value="CALL">Ligação</option>
                    <option value="MESSAGE">WhatsApp / Mensagem</option>
                    <option value="MEETING">Reunião</option>
                    <option value="VISIT">Visita Técnica</option>
                    <option value="TASK">Tarefa Interna</option>
                  </select>
                </label>

                <label>
                  Data e Hora Limite (Vencimento) *
                  <input
                    type="datetime-local"
                    required
                    value={newDueAt}
                    onChange={(e) => setNewDueAt(e.target.value)}
                  />
                </label>

                <label style={{ gridColumn: '1 / -1' }}>
                  Assunto / Objetivo *
                  <input
                    type="text"
                    required
                    placeholder="ex: Primeiro contato para qualificação técnica"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                  />
                </label>

                <label>
                  Cliente Vinculado (Opcional)
                  <select value={newCustomerId} onChange={(e) => setNewCustomerId(e.target.value)}>
                    <option value="">Nenhum cliente selecionado</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.legalName} {c.taxId ? `(${c.taxId})` : ''}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Oportunidade Vinculada (Opcional)
                  <select
                    value={newOpportunityId}
                    onChange={(e) => setNewOpportunityId(e.target.value)}
                  >
                    <option value="">Nenhuma oportunidade selecionada</option>
                    {opps.map((o) => (
                      <option key={o.id} value={o.id}>
                        [{o.code}] {o.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={{ gridColumn: '1 / -1' }}>
                  Descrição Detalhada / Instruções
                  <textarea
                    rows={3}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Orientações e contexto para a execução da atividade"
                  />
                </label>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  justifyContent: 'flex-end',
                  marginTop: '0.5rem',
                }}
              >
                <Button type="button" variant="secondary" onClick={() => setIsCreating(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Salvando…' : 'Agendar Atividade'}
                </Button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* ACTIVITIES TABLE (DESKTOP) */}
      <div className="table-wrapper desktop-only">
        <table className="data-table">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Assunto</th>
              <th>Cliente / Oportunidade</th>
              <th>Vencimento</th>
              <th>Status</th>
              <th>Responsável</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    textAlign: 'center',
                    padding: '2.5rem',
                    color: 'var(--text-secondary, #9ba49e)',
                  }}
                >
                  {activitiesQuery.isPending
                    ? 'Carregando atividades…'
                    : 'Nenhuma atividade encontrada para este filtro.'}
                </td>
              </tr>
            ) : (
              items.map((act) => {
                const isOverdue =
                  act.status === 'OPEN' && new Date(act.dueAt).getTime() < Date.now();
                return (
                  <tr
                    key={act.id}
                    style={isOverdue ? { background: 'rgba(239, 68, 68, 0.08)' } : undefined}
                  >
                    <td>
                      <span className="badge">{ACTIVITY_TYPE_LABELS[act.type] ?? act.type}</span>
                    </td>
                    <td>
                      <strong style={{ color: 'var(--text-primary, #f5f7f5)' }}>
                        {act.subject}
                      </strong>
                      {act.description && (
                        <p
                          style={{
                            margin: '0.2rem 0 0 0',
                            fontSize: '0.8125rem',
                            color: 'var(--text-secondary, #9ba49e)',
                          }}
                        >
                          {act.description}
                        </p>
                      )}
                      {act.resultCode && (
                        <p
                          style={{
                            margin: '0.25rem 0 0 0',
                            fontSize: '0.8125rem',
                            color: 'var(--brand-solar, #ffd400)',
                          }}
                        >
                          <strong>Resultado:</strong> {act.resultCode}
                          {act.resultNotes ? ` — ${act.resultNotes}` : ''}
                        </p>
                      )}
                    </td>
                    <td>
                      {act.customer && (
                        <div>
                          <strong style={{ color: 'var(--text-primary, #f5f7f5)' }}>
                            {act.customer.legalName}
                          </strong>
                        </div>
                      )}
                      {act.opportunity && (
                        <span
                          style={{
                            fontSize: '0.8125rem',
                            color: 'var(--text-secondary, #9ba49e)',
                          }}
                        >
                          [{act.opportunity.code}] {act.opportunity.title}
                        </span>
                      )}
                      {!act.customer && !act.opportunity && (
                        <span style={{ color: 'var(--text-disabled, #626a65)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <span
                        style={
                          isOverdue
                            ? { color: '#EF4444', fontWeight: 600 }
                            : { color: 'var(--text-primary, #f5f7f5)' }
                        }
                      >
                        {new Date(act.dueAt).toLocaleString('pt-BR')}
                      </span>
                      {isOverdue && (
                        <div>
                          <span
                            className="badge badge-cancelado"
                            style={{
                              fontSize: '0.7rem',
                              padding: '0.1rem 0.4rem',
                              marginTop: '0.25rem',
                              display: 'inline-block',
                            }}
                          >
                            Atrasada
                          </span>
                        </div>
                      )}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          act.status === 'OPEN'
                            ? 'badge-novo'
                            : act.status === 'COMPLETED'
                              ? 'badge-ativo'
                              : 'badge-cancelado'
                        }`}
                      >
                        {act.status === 'OPEN'
                          ? 'Pendente'
                          : act.status === 'COMPLETED'
                            ? 'Concluída'
                            : 'Cancelada'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-primary, #f5f7f5)' }}>
                      {act.assignee?.name ?? '—'}
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {canManage && act.status === 'OPEN' && (
                        <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                          <Button
                            variant="primary"
                            size="compact"
                            onClick={() => {
                              setSelectedActivity(act);
                              setIsCompleting(true);
                            }}
                          >
                            Concluir
                          </Button>
                          <Button
                            variant="secondary"
                            size="compact"
                            onClick={() => {
                              setSelectedActivity(act);
                              setRescheduleDueAt(new Date(act.dueAt).toISOString().slice(0, 16));
                              setIsRescheduling(true);
                            }}
                          >
                            Reagendar
                          </Button>
                          <Button
                            variant="danger"
                            size="compact"
                            onClick={() => {
                              setSelectedActivity(act);
                              setIsCanceling(true);
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ACTIVITIES CARDS (MOBILE) */}
      <div className="mobile-cards mobile-only" style={{ display: 'grid', gap: '1rem' }}>
        {items.length === 0 ? (
          <p
            style={{
              textAlign: 'center',
              padding: '2rem',
              color: 'var(--text-secondary, #9ba49e)',
            }}
          >
            {activitiesQuery.isPending ? 'Carregando atividades…' : 'Nenhuma atividade encontrada.'}
          </p>
        ) : (
          items.map((act) => {
            const isOverdue = act.status === 'OPEN' && new Date(act.dueAt).getTime() < Date.now();
            return (
              <div
                key={act.id}
                className="comm-detail-card"
                style={{
                  padding: '1.25rem',
                  borderLeft: isOverdue ? '4px solid #EF4444' : '1px solid #29302b',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '0.5rem',
                  }}
                >
                  <span className="badge">{ACTIVITY_TYPE_LABELS[act.type] ?? act.type}</span>
                  <span
                    className={`badge ${
                      act.status === 'OPEN'
                        ? 'badge-novo'
                        : act.status === 'COMPLETED'
                          ? 'badge-ativo'
                          : 'badge-cancelado'
                    }`}
                  >
                    {act.status === 'OPEN'
                      ? 'Pendente'
                      : act.status === 'COMPLETED'
                        ? 'Concluída'
                        : 'Cancelada'}
                  </span>
                </div>

                <h4
                  style={{
                    margin: '0.75rem 0 0.25rem 0',
                    color: 'var(--text-primary, #f5f7f5)',
                  }}
                >
                  {act.subject}
                </h4>
                {act.description && (
                  <p
                    style={{
                      margin: '0 0 0.5rem 0',
                      fontSize: '0.875rem',
                      color: 'var(--text-secondary, #9ba49e)',
                    }}
                  >
                    {act.description}
                  </p>
                )}

                <div
                  style={{
                    fontSize: '0.8125rem',
                    color: 'var(--text-secondary, #9ba49e)',
                    display: 'grid',
                    gap: '0.25rem',
                    marginBlock: '0.5rem',
                  }}
                >
                  {act.customer && (
                    <div>
                      Cliente:{' '}
                      <strong style={{ color: 'var(--text-primary, #f5f7f5)' }}>
                        {act.customer.legalName}
                      </strong>
                    </div>
                  )}
                  {act.opportunity && (
                    <div>
                      Oportunidade: [{act.opportunity.code}] {act.opportunity.title}
                    </div>
                  )}
                  <div>
                    Vencimento:{' '}
                    <strong
                      style={
                        isOverdue ? { color: '#EF4444' } : { color: 'var(--text-primary, #f5f7f5)' }
                      }
                    >
                      {new Date(act.dueAt).toLocaleString('pt-BR')}
                      {isOverdue && ' (Atrasada)'}
                    </strong>
                  </div>
                  <div>Responsável: {act.assignee?.name ?? '—'}</div>
                </div>

                {act.resultCode && (
                  <div
                    style={{
                      background: 'rgba(255, 212, 0, 0.08)',
                      border: '1px solid rgba(255, 212, 0, 0.2)',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      fontSize: '0.8125rem',
                      marginTop: '0.5rem',
                      color: 'var(--text-primary, #f5f7f5)',
                    }}
                  >
                    <strong style={{ color: 'var(--brand-solar, #ffd400)' }}>Resultado:</strong>{' '}
                    {act.resultCode}
                    {act.resultNotes ? ` — ${act.resultNotes}` : ''}
                  </div>
                )}

                {canManage && act.status === 'OPEN' && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '0.5rem',
                      marginTop: '1rem',
                    }}
                  >
                    <Button
                      variant="primary"
                      size="compact"
                      onClick={() => {
                        setSelectedActivity(act);
                        setIsCompleting(true);
                      }}
                    >
                      Concluir
                    </Button>
                    <Button
                      variant="secondary"
                      size="compact"
                      onClick={() => {
                        setSelectedActivity(act);
                        setRescheduleDueAt(new Date(act.dueAt).toISOString().slice(0, 16));
                        setIsRescheduling(true);
                      }}
                    >
                      Reagendar
                    </Button>
                    <Button
                      variant="danger"
                      size="compact"
                      onClick={() => {
                        setSelectedActivity(act);
                        setIsCanceling(true);
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* COMPLETE MODAL */}
      {isCompleting && selectedActivity && (
        <div className="comm-modal-overlay">
          <section
            role="dialog"
            aria-labelledby="complete-modal-title"
            aria-modal="true"
            className="comm-modal-box"
          >
            <div className="comm-modal-header">
              <h3 id="complete-modal-title" className="comm-modal-title">
                Concluir Atividade
              </h3>
              <button
                type="button"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary, #9ba49e)',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  setIsCompleting(false);
                  setSelectedActivity(null);
                }}
              >
                ✕
              </button>
            </div>
            <p
              style={{
                color: 'var(--text-secondary, #9ba49e)',
                margin: 0,
              }}
            >
              Atividade:{' '}
              <strong style={{ color: 'var(--text-primary, #f5f7f5)' }}>
                {selectedActivity.subject}
              </strong>
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                completeMutation.mutate();
              }}
            >
              <label>
                Código do Resultado *
                <select
                  value={completeResultCode}
                  onChange={(e) => setCompleteResultCode(e.target.value)}
                >
                  {RESULT_CODE_PRESETS.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>

              {completeResultCode === 'OUTRO' && (
                <label>
                  Especifique o Resultado *
                  <input
                    type="text"
                    required
                    value={completeCustomResult}
                    onChange={(e) => setCompleteCustomResult(e.target.value)}
                    placeholder="ex: Contato adiado para próxima semana"
                  />
                </label>
              )}

              <label>
                Anotações / Resumo da Conversa
                <textarea
                  rows={3}
                  value={completeNotes}
                  onChange={(e) => setCompleteNotes(e.target.value)}
                  placeholder="Detalhes relevantes acordados com o cliente"
                />
              </label>

              <fieldset
                style={{
                  margin: 0,
                  border: '1px solid var(--border-default, #29302b)',
                  borderRadius: 'var(--radius-md, 8px)',
                  padding: '1rem',
                  background: 'var(--surface-elevated, #1c211d)',
                }}
              >
                <legend style={{ padding: '0 0.5rem', color: 'var(--text-primary, #f5f7f5)' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      margin: 0,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={hasFollowUp}
                      onChange={(e) => setHasFollowUp(e.target.checked)}
                      style={{ width: 'auto' }}
                    />
                    <strong>Agendar próxima atividade de acompanhamento</strong>
                  </label>
                </legend>

                {hasFollowUp && (
                  <div className="form-grid" style={{ marginTop: '0.75rem' }}>
                    <label>
                      Tipo
                      <select
                        value={followUpType}
                        onChange={(e) =>
                          setFollowUpType(
                            e.target.value as
                              'CALL' | 'MESSAGE' | 'MEETING' | 'VISIT' | 'EMAIL' | 'TASK',
                          )
                        }
                      >
                        <option value="CALL">Ligação</option>
                        <option value="MESSAGE">WhatsApp / Mensagem</option>
                        <option value="MEETING">Reunião</option>
                        <option value="VISIT">Visita Técnica</option>
                        <option value="TASK">Tarefa Interna</option>
                      </select>
                    </label>

                    <label>
                      Data e Hora
                      <input
                        type="datetime-local"
                        required={hasFollowUp}
                        value={followUpDueAt}
                        onChange={(e) => setFollowUpDueAt(e.target.value)}
                      />
                    </label>

                    <label style={{ gridColumn: '1 / -1' }}>
                      Assunto do Acompanhamento *
                      <input
                        type="text"
                        required={hasFollowUp}
                        placeholder="ex: Enviar proposta comercial personalizada"
                        value={followUpSubject}
                        onChange={(e) => setFollowUpSubject(e.target.value)}
                      />
                    </label>
                  </div>
                )}
              </fieldset>

              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  justifyContent: 'flex-end',
                  marginTop: '0.5rem',
                }}
              >
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setIsCompleting(false);
                    setSelectedActivity(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" disabled={completeMutation.isPending}>
                  {completeMutation.isPending ? 'Concluindo…' : 'Confirmar Conclusão'}
                </Button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* RESCHEDULE MODAL */}
      {isRescheduling && selectedActivity && (
        <div className="comm-modal-overlay">
          <section
            role="dialog"
            aria-labelledby="reschedule-modal-title"
            aria-modal="true"
            className="comm-modal-box"
          >
            <div className="comm-modal-header">
              <h3 id="reschedule-modal-title" className="comm-modal-title">
                Reagendar Atividade
              </h3>
              <button
                type="button"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary, #9ba49e)',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  setIsRescheduling(false);
                  setSelectedActivity(null);
                }}
              >
                ✕
              </button>
            </div>
            <p
              style={{
                color: 'var(--text-secondary, #9ba49e)',
                margin: 0,
              }}
            >
              Atividade:{' '}
              <strong style={{ color: 'var(--text-primary, #f5f7f5)' }}>
                {selectedActivity.subject}
              </strong>
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                rescheduleMutation.mutate();
              }}
            >
              <label>
                Nova Data e Hora *
                <input
                  type="datetime-local"
                  required
                  value={rescheduleDueAt}
                  onChange={(e) => setRescheduleDueAt(e.target.value)}
                />
              </label>

              <label>
                Motivo do Reagendamento
                <textarea
                  rows={3}
                  value={rescheduleNotes}
                  onChange={(e) => setRescheduleNotes(e.target.value)}
                  placeholder="ex: Cliente indisponível hoje, pediu para ligar na quinta"
                />
              </label>

              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  justifyContent: 'flex-end',
                  marginTop: '0.5rem',
                }}
              >
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setIsRescheduling(false);
                    setSelectedActivity(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" disabled={rescheduleMutation.isPending}>
                  {rescheduleMutation.isPending ? 'Salvando…' : 'Confirmar Reagendamento'}
                </Button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* CANCEL MODAL */}
      {isCanceling && selectedActivity && (
        <div className="comm-modal-overlay">
          <section
            role="dialog"
            aria-labelledby="cancel-modal-title"
            aria-modal="true"
            className="comm-modal-box"
          >
            <div className="comm-modal-header">
              <h3
                id="cancel-modal-title"
                className="comm-modal-title"
                style={{ color: 'var(--status-danger, #ef4444)' }}
              >
                Cancelar Atividade
              </h3>
              <button
                type="button"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary, #9ba49e)',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  setIsCanceling(false);
                  setSelectedActivity(null);
                }}
              >
                ✕
              </button>
            </div>
            <p style={{ marginTop: '0.5rem', color: 'var(--text-primary, #f5f7f5)' }}>
              Tem certeza de que deseja cancelar a atividade{' '}
              <strong style={{ color: 'var(--brand-solar, #ffd400)' }}>
                &ldquo;{selectedActivity.subject}&rdquo;
              </strong>
              ?
            </p>
            <p
              style={{
                color: 'var(--text-secondary, #9ba49e)',
                fontSize: '0.875rem',
                margin: 0,
              }}
            >
              Esta ação atualizará o status da atividade para Cancelada de forma auditável.
            </p>

            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                justifyContent: 'flex-end',
                marginTop: '1rem',
              }}
            >
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsCanceling(false);
                  setSelectedActivity(null);
                }}
              >
                Voltar
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate()}
              >
                {cancelMutation.isPending ? 'Cancelando…' : 'Confirmar Cancelamento'}
              </Button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
