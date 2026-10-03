'use client';
import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, result, allows } from '../identity/client';
import { Feedback } from '../identity/feedback';
import { Icon } from '../../components/icons/material-symbol';
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

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCreating(false);
        setIsCompleting(false);
        setIsRescheduling(false);
        setIsCanceling(false);
        setSelectedActivity(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  return (
    <div className="commercial-activities">
      <div className="app-header" style={{ borderBottom: 'none', paddingInline: 0 }}>
        <div>
          <h2>Atividades Comerciais</h2>
          <span className="device">{items.length} atividades</span>
        </div>
        <div className="actions">
          {canManage && !isCreating && (
            <button
              onClick={() => {
                setIsCreating(true);
                setSelectedActivity(null);
              }}
            >
              Nova Atividade
            </button>
          )}
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
      <div className="filter-bar" role="tablist" aria-label="Filtro de atividades">
        <button
          role="tab"
          aria-selected={tabFilter === 'PENDING'}
          aria-current={tabFilter === 'PENDING' ? 'true' : undefined}
          style={
            tabFilter === 'PENDING'
              ? { background: 'var(--brand-primary)', color: '#fff' }
              : { background: 'var(--color-surface)', color: 'var(--text-primary)' }
          }
          onClick={() => setTabFilter('PENDING')}
        >
          Pendentes
        </button>
        <button
          role="tab"
          aria-selected={tabFilter === 'OVERDUE'}
          aria-current={tabFilter === 'OVERDUE' ? 'true' : undefined}
          style={
            tabFilter === 'OVERDUE'
              ? { background: 'var(--status-danger)', color: '#fff' }
              : { background: 'var(--color-surface)', color: 'var(--text-primary)' }
          }
          onClick={() => setTabFilter('OVERDUE')}
        >
          Atrasadas
        </button>
        <button
          role="tab"
          aria-selected={tabFilter === 'ALL'}
          aria-current={tabFilter === 'ALL' ? 'true' : undefined}
          style={
            tabFilter === 'ALL'
              ? { background: 'var(--brand-primary)', color: '#fff' }
              : { background: 'var(--color-surface)', color: 'var(--text-primary)' }
          }
          onClick={() => setTabFilter('ALL')}
        >
          Todas
        </button>
      </div>

      {/* CREATE ACTIVITY FORM */}
      {isCreating && (
        <section
          className="auth-card"
          style={{ maxWidth: '100%', marginBottom: '1.5rem' }}
          aria-labelledby="create-activity-title"
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
            }}
          >
            <h3 id="create-activity-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Icon name="add" size={20} /> Agendar Nova Atividade
            </h3>
            <button
              type="button"
              className="btn btn--subtle"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '2rem',
                height: '2rem',
                padding: 0,
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f1f5f9',
                color: '#475569',
                cursor: 'pointer',
              }}
              onClick={() => setIsCreating(false)}
              aria-label="Fechar"
            >
              <Icon name="close" size={18} />
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
                      e.target.value as 'CALL' | 'MESSAGE' | 'MEETING' | 'VISIT' | 'EMAIL' | 'TASK',
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
                gap: '1rem',
                justifyContent: 'flex-end',
                marginTop: '1.5rem',
              }}
            >
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setIsCreating(false)}
              >
                Cancelar
              </button>
              <button type="submit" className="btn btn--primary" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Salvando…' : 'Agendar Atividade'}
              </button>
            </div>
          </form>
        </section>
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
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
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
                  <tr key={act.id} style={isOverdue ? { background: '#fff5f5' } : undefined}>
                    <td>
                      <span className="badge">{ACTIVITY_TYPE_LABELS[act.type] ?? act.type}</span>
                    </td>
                    <td>
                      <strong>{act.subject}</strong>
                      {act.description && (
                        <p
                          style={{
                            margin: 0,
                            fontSize: '0.8125rem',
                            color: 'var(--text-secondary)',
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
                            color: 'var(--brand-primary)',
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
                          <strong>{act.customer.legalName}</strong>
                        </div>
                      )}
                      {act.opportunity && (
                        <span
                          style={{
                            fontSize: '0.8125rem',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          [{act.opportunity.code}] {act.opportunity.title}
                        </span>
                      )}
                      {!act.customer && !act.opportunity && '—'}
                    </td>
                    <td>
                      <span
                        style={
                          isOverdue ? { color: 'var(--status-danger)', fontWeight: 600 } : undefined
                        }
                      >
                        {new Date(act.dueAt).toLocaleString('pt-BR')}
                      </span>
                      {isOverdue && (
                        <div>
                          <span
                            className="badge badge-cancelado"
                            style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}
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
                    <td>{act.assignee?.name ?? '—'}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {canManage && act.status === 'OPEN' && (
                        <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                          <button
                            style={{
                              padding: '0.25rem 0.5rem',
                              fontSize: '0.8125rem',
                              background: 'var(--status-success)',
                              borderColor: 'var(--status-success)',
                            }}
                            onClick={() => {
                              setSelectedActivity(act);
                              setIsCompleting(true);
                            }}
                          >
                            Concluir
                          </button>
                          <button
                            style={{
                              padding: '0.25rem 0.5rem',
                              fontSize: '0.8125rem',
                              background: 'var(--color-surface)',
                              color: 'var(--text-primary)',
                              borderColor: 'var(--color-border)',
                            }}
                            onClick={() => {
                              setSelectedActivity(act);
                              setRescheduleDueAt(new Date(act.dueAt).toISOString().slice(0, 16));
                              setIsRescheduling(true);
                            }}
                          >
                            Reagendar
                          </button>
                          <button
                            style={{
                              padding: '0.25rem 0.5rem',
                              fontSize: '0.8125rem',
                              background: '#fff',
                              color: 'var(--status-danger)',
                              border: '1px solid #fca5a5',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                            onClick={() => {
                              setSelectedActivity(act);
                              setIsCanceling(true);
                            }}
                          >
                            Cancelar
                          </button>
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
          <p style={{ textAlign: 'center', padding: '2rem' }}>
            {activitiesQuery.isPending ? 'Carregando atividades…' : 'Nenhuma atividade encontrada.'}
          </p>
        ) : (
          items.map((act) => {
            const isOverdue = act.status === 'OPEN' && new Date(act.dueAt).getTime() < Date.now();
            return (
              <div
                key={act.id}
                className="auth-card"
                style={{
                  maxWidth: '100%',
                  padding: '1rem',
                  borderLeft: isOverdue ? '4px solid var(--status-danger)' : undefined,
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

                <h4 style={{ margin: '0.5rem 0 0.25rem 0' }}>{act.subject}</h4>
                {act.description && (
                  <p
                    style={{
                      margin: '0 0 0.5rem 0',
                      fontSize: '0.875rem',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {act.description}
                  </p>
                )}

                <div
                  style={{
                    fontSize: '0.8125rem',
                    color: 'var(--text-secondary)',
                    display: 'grid',
                    gap: '0.25rem',
                    marginBlock: '0.5rem',
                  }}
                >
                  {act.customer && (
                    <div>
                      Cliente: <strong>{act.customer.legalName}</strong>
                    </div>
                  )}
                  {act.opportunity && (
                    <div>
                      Oportunidade: [{act.opportunity.code}] {act.opportunity.title}
                    </div>
                  )}
                  <div>
                    Vencimento:{' '}
                    <strong style={isOverdue ? { color: 'var(--status-danger)' } : undefined}>
                      {new Date(act.dueAt).toLocaleString('pt-BR')}
                      {isOverdue && ' (Atrasada)'}
                    </strong>
                  </div>
                  <div>Responsável: {act.assignee?.name ?? '—'}</div>
                </div>

                {act.resultCode && (
                  <div
                    style={{
                      background: 'var(--color-canvas)',
                      padding: '0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8125rem',
                      marginTop: '0.5rem',
                    }}
                  >
                    <strong>Resultado:</strong> {act.resultCode}
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
                    <button
                      style={{
                        padding: '0.5rem',
                        fontSize: '0.8125rem',
                        background: 'var(--status-success)',
                        borderColor: 'var(--status-success)',
                      }}
                      onClick={() => {
                        setSelectedActivity(act);
                        setIsCompleting(true);
                      }}
                    >
                      Concluir
                    </button>
                    <button
                      style={{
                        padding: '0.5rem',
                        fontSize: '0.8125rem',
                        background: 'var(--color-surface)',
                        color: 'var(--text-primary)',
                        borderColor: 'var(--color-border)',
                      }}
                      onClick={() => {
                        setSelectedActivity(act);
                        setRescheduleDueAt(new Date(act.dueAt).toISOString().slice(0, 16));
                        setIsRescheduling(true);
                      }}
                    >
                      Reagendar
                    </button>
                    <button
                      style={{
                        padding: '0.5rem',
                        fontSize: '0.8125rem',
                        background: '#fff',
                        color: 'var(--status-danger)',
                        border: '1px solid #fca5a5',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        setSelectedActivity(act);
                        setIsCanceling(true);
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* COMPLETE MODAL */}
      {isCompleting && selectedActivity && (
        <div
          role="dialog"
          aria-labelledby="complete-modal-title"
          aria-modal="true"
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsCompleting(false);
              setSelectedActivity(null);
            }
          }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1050,
            padding: '1rem',
          }}
        >
          <div
            className="modal-card"
            style={{
              backgroundColor: '#fff',
              padding: '1.5rem',
              borderRadius: '12px',
              maxWidth: '520px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              border: '1px solid #d9e2de',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3
                id="complete-modal-title"
                style={{
                  margin: 0,
                  fontSize: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Icon name="check_circle" size={20} /> Concluir Atividade
              </h3>
              <button
                type="button"
                className="btn btn--subtle"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '2rem',
                  height: '2rem',
                  padding: 0,
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  setIsCompleting(false);
                  setSelectedActivity(null);
                }}
                aria-label="Fechar"
              >
                <Icon name="close" size={18} />
              </button>
            </div>
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.875rem' }}>
              Atividade: <strong>{selectedActivity.subject}</strong>
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
                marginTop: '1rem',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '1rem',
              }}
            >
              <legend>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
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
                gap: '1rem',
                justifyContent: 'flex-end',
                marginTop: '1.5rem',
              }}
            >
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => {
                  setIsCompleting(false);
                  setSelectedActivity(null);
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={completeMutation.isPending}
                className="btn btn--primary"
              >
                {completeMutation.isPending ? 'Concluindo…' : 'Confirmar Conclusão'}
              </button>
            </div>
          </form>
          </div>
        </div>
      )}

      {/* RESCHEDULE MODAL */}
      {isRescheduling && selectedActivity && (
        <div
          role="dialog"
          aria-labelledby="reschedule-modal-title"
          aria-modal="true"
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsRescheduling(false);
              setSelectedActivity(null);
            }
          }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1050,
            padding: '1rem',
          }}
        >
          <div
            className="modal-card"
            style={{
              backgroundColor: '#fff',
              padding: '1.5rem',
              borderRadius: '12px',
              maxWidth: '480px',
              width: '90%',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              border: '1px solid #d9e2de',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3
                id="reschedule-modal-title"
                style={{
                  margin: 0,
                  fontSize: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Icon name="schedule" size={20} /> Reagendar Atividade
              </h3>
              <button
                type="button"
                className="btn btn--subtle"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '2rem',
                  height: '2rem',
                  padding: 0,
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  setIsRescheduling(false);
                  setSelectedActivity(null);
                }}
                aria-label="Fechar"
              >
                <Icon name="close" size={18} />
              </button>
            </div>
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.875rem' }}>
              Atividade: <strong>{selectedActivity.subject}</strong>
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                rescheduleMutation.mutate();
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
                Nova Data e Hora *
                <input
                  type="datetime-local"
                  required
                  value={rescheduleDueAt}
                  onChange={(e) => setRescheduleDueAt(e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
                Motivo do Reagendamento
                <textarea
                  rows={3}
                  value={rescheduleNotes}
                  onChange={(e) => setRescheduleNotes(e.target.value)}
                  placeholder="ex: Cliente indisponível hoje, pediu para ligar na quinta"
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </label>

              <div
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                  justifyContent: 'flex-end',
                  marginTop: '0.5rem',
                }}
              >
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => {
                    setIsRescheduling(false);
                    setSelectedActivity(null);
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={rescheduleMutation.isPending}
                  className="btn btn--primary"
                >
                  {rescheduleMutation.isPending ? 'Salvando…' : 'Confirmar Reagendamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CANCEL MODAL */}
      {isCanceling && selectedActivity && (
        <div
          role="dialog"
          aria-labelledby="cancel-modal-title"
          aria-modal="true"
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsCanceling(false);
              setSelectedActivity(null);
            }
          }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1050,
            padding: '1rem',
          }}
        >
          <div
            className="modal-card"
            style={{
              backgroundColor: '#fff',
              padding: '1.5rem',
              borderRadius: '12px',
              maxWidth: '440px',
              width: '90%',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              border: '1px solid #fecaca',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3
                id="cancel-modal-title"
                style={{
                  color: 'var(--status-danger)',
                  margin: 0,
                  fontSize: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Icon name="warning" size={20} /> Cancelar Atividade
              </h3>
              <button
                type="button"
                className="btn btn--subtle"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '2rem',
                  height: '2rem',
                  padding: 0,
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  setIsCanceling(false);
                  setSelectedActivity(null);
                }}
                aria-label="Fechar"
              >
                <Icon name="close" size={18} />
              </button>
            </div>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              Tem certeza de que deseja cancelar a atividade{' '}
              <strong>&ldquo;{selectedActivity.subject}&rdquo;</strong>?
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
              Esta ação atualizará o status da atividade para Cancelada de forma auditável.
            </p>

            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                justifyContent: 'flex-end',
                marginTop: '0.5rem',
              }}
            >
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => {
                  setIsCanceling(false);
                  setSelectedActivity(null);
                }}
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={cancelMutation.isPending}
                className="btn btn--danger"
                onClick={() => cancelMutation.mutate()}
              >
                {cancelMutation.isPending ? 'Cancelando…' : 'Confirmar Cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
