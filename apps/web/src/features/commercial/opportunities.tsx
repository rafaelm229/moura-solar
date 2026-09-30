'use client';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, result, allows } from '../identity/client';
import { Feedback } from '../identity/feedback';
import { EnergyReadings } from '../design/consumption';
import { TechnicalSurvey } from '../design/survey';
import { SolarDesigner } from '../design/solar-designer';
import { Proposals } from '../proposal/proposals';
import type { Schemas } from '@moura-solar/api-client';

type Opportunity = Schemas['OpportunityViewDto'];

interface OpportunitiesProps {
  initialCustomerId?: string;
  onCreated?: () => void;
}

export function Opportunities({ initialCustomerId, onCreated }: OpportunitiesProps = {}) {
  const queryClient = useQueryClient();
  const [stateFilter, setStateFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [oppTab, setOppTab] = useState<'commercial' | 'consumption' | 'design' | 'proposals'>(
    'commercial',
  );
  const [isCreating, setIsCreating] = useState(!!initialCustomerId);

  // Creation form state
  const [formCustomerId, setFormCustomerId] = useState(initialCustomerId ?? '');
  const [formTitle, setFormTitle] = useState('');
  const [formNeedSummary, setFormNeedSummary] = useState('');
  const [formEstimatedConsumption, setFormEstimatedConsumption] = useState('');
  const [formPriority, setFormPriority] = useState<'WARM' | 'COLD' | 'HOT'>('WARM');
  const [formActType, setFormActType] = useState<
    'CALL' | 'MESSAGE' | 'MEETING' | 'VISIT' | 'EMAIL' | 'TASK'
  >('CALL');
  const [formActSubject, setFormActSubject] = useState('');
  const [formActDue, setFormActDue] = useState(
    new Date(Date.now() + 86400000).toISOString().slice(0, 16),
  );

  // Transition modals
  const [isQualifying, setIsQualifying] = useState(false);
  const [qualifySummary, setQualifySummary] = useState('');
  const [isLosing, setIsLosing] = useState(false);
  const [lossReason, setLossReason] = useState('PRECO_ELEVADO');
  const [lossNotes, setLossNotes] = useState('');
  const [isReopening, setIsReopening] = useState(false);
  const [reopenJustification, setReopenJustification] = useState('');

  useEffect(() => {
    if (initialCustomerId) {
      setFormCustomerId(initialCustomerId);
      setIsCreating(true);
    }
  }, [initialCustomerId]);

  // Context for permissions
  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => result(api.GET('/api/v1/identity/me')),
  });
  const canReopen = me.data ? allows(me.data, 'opportunities:reopen', false) : false;

  const oppsQuery = useQuery({
    queryKey: ['opportunities', stateFilter, search],
    queryFn: () =>
      result(
        api.GET('/api/v1/opportunities', {
          params: {
            query: {
              state: stateFilter || undefined,
              search: search || undefined,
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
  });

  const detailQuery = useQuery({
    queryKey: ['opportunity', selectedOpp?.id],
    queryFn: () =>
      result(
        api.GET('/api/v1/opportunities/{opportunityId}', {
          params: { path: { opportunityId: selectedOpp!.id } },
        }),
      ),
    enabled: !!selectedOpp?.id,
  });

  const createMutation = useMutation({
    mutationFn: async () =>
      result(
        api.POST('/api/v1/opportunities', {
          body: {
            customerId: formCustomerId,
            title: formTitle,
            source: 'INBOUND',
            projectType: 'ON_GRID',
            needSummary: formNeedSummary,
            estimatedConsumption: formEstimatedConsumption
              ? parseFloat(formEstimatedConsumption)
              : undefined,
            priority: formPriority,
            firstActivity: {
              type: formActType,
              subject: formActSubject,
              dueAt: new Date(formActDue).toISOString(),
            },
          },
        }),
      ),
    onSuccess: (opp) => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      setIsCreating(false);
      resetForm();
      setSelectedOpp(opp as unknown as Opportunity);
      onCreated?.();
    },
  });

  const qualifyMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOpp) return;
      return result(
        api.POST('/api/v1/opportunities/{opportunityId}/qualify', {
          params: { path: { opportunityId: selectedOpp.id } },
          body: {
            expectedVersion: selectedOpp.version,
            confirmedNeedSummary: qualifySummary || selectedOpp.needSummary,
          },
        }),
      );
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['opportunity', selectedOpp?.id] });
      setIsQualifying(false);
      setSelectedOpp(updated as unknown as Opportunity);
    },
  });

  const loseMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOpp) return;
      return result(
        api.POST('/api/v1/opportunities/{opportunityId}/lose', {
          params: { path: { opportunityId: selectedOpp.id } },
          body: {
            expectedVersion: selectedOpp.version,
            lossReason,
            lossNotes: lossNotes || undefined,
          },
        }),
      );
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['opportunity', selectedOpp?.id] });
      setIsLosing(false);
      setSelectedOpp(updated as unknown as Opportunity);
    },
  });

  const reopenMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOpp) return;
      return result(
        api.POST('/api/v1/opportunities/{opportunityId}/reopen', {
          params: { path: { opportunityId: selectedOpp.id } },
          body: {
            expectedVersion: selectedOpp.version,
            justification: reopenJustification,
          },
        }),
      );
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['opportunity', selectedOpp?.id] });
      setIsReopening(false);
      setSelectedOpp(updated as unknown as Opportunity);
    },
  });

  function resetForm() {
    setFormCustomerId('');
    setFormTitle('');
    setFormNeedSummary('');
    setFormEstimatedConsumption('');
    setFormPriority('WARM');
    setFormActSubject('');
  }

  const items = oppsQuery.data?.items ?? [];
  const customers = customersList.data?.items ?? [];

  return (
    <div className="commercial-opportunities">
      <div className="app-header" style={{ borderBottom: 'none', paddingInline: 0 }}>
        <div>
          <h2>Oportunidades</h2>
          <span className="device">{items.length} negociações</span>
        </div>
        <div className="actions">
          {!isCreating && (
            <button
              onClick={() => {
                setIsCreating(true);
                setSelectedOpp(null);
              }}
            >
              + Nova Oportunidade
            </button>
          )}
        </div>
      </div>

      <div className="filter-bar">
        <input
          type="search"
          placeholder="Buscar por código, título ou cliente…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Buscar oportunidades"
        />
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          aria-label="Filtrar por estado do funil"
        >
          <option value="">Todos os estágios</option>
          <option value="NOVO">Novo</option>
          <option value="QUALIFICADO">Qualificado</option>
          <option value="LEVANTAMENTO">Levantamento</option>
          <option value="DIMENSIONAMENTO">Dimensionamento</option>
          <option value="PROPOSTA">Proposta</option>
          <option value="NEGOCIACAO">Negociação</option>
          <option value="CONTRATACAO">Contratação</option>
          <option value="VENDIDO">Vendido</option>
          <option value="PERDIDO">Perdido</option>
          <option value="CANCELADO">Cancelado</option>
        </select>
      </div>

      {isCreating && (
        <section className="panel" aria-label="Cadastro de nova oportunidade">
          <h3>Nova Oportunidade</h3>
          <p className="device">
            A oportunidade é criada em conjunto com sua primeira atividade comercial obrigatória.
          </p>
          <Feedback error={createMutation.error} />

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
          >
            <div className="form-grid">
              <label>
                Cliente *
                <select
                  required
                  value={formCustomerId}
                  onChange={(e) => setFormCustomerId(e.target.value)}
                >
                  <option value="">Selecione o cliente…</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.legalName} {c.taxId ? `(${c.taxId})` : ''}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Título da Negociação *
                <input
                  type="text"
                  required
                  placeholder="ex: Sistema Residencial 5 kWp"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </label>

              <label>
                Consumo Médio Estimado (kWh/mês)
                <input
                  type="number"
                  placeholder="ex: 550"
                  value={formEstimatedConsumption}
                  onChange={(e) => setFormEstimatedConsumption(e.target.value)}
                />
              </label>

              <label>
                Temperatura / Prioridade
                <select
                  value={formPriority}
                  onChange={(e) => setFormPriority(e.target.value as 'WARM' | 'COLD' | 'HOT')}
                >
                  <option value="WARM">Morno (Padrão)</option>
                  <option value="HOT">Quente</option>
                  <option value="COLD">Frio</option>
                </select>
              </label>

              <label style={{ gridColumn: '1 / -1' }}>
                Resumo da Necessidade *
                <input
                  type="text"
                  required
                  placeholder="ex: Reduzir conta de luz de R$ 600 para taxa mínima"
                  value={formNeedSummary}
                  onChange={(e) => setFormNeedSummary(e.target.value)}
                />
              </label>
            </div>

            <fieldset
              style={{
                marginTop: '1rem',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '1rem',
              }}
            >
              <legend>
                <strong>Primeira Atividade Obrigatória (Gate de Entrada)</strong>
              </legend>
              <div className="form-grid">
                <label>
                  Tipo de Atividade
                  <select
                    value={formActType}
                    onChange={(e) =>
                      setFormActType(
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
                  Assunto da Atividade *
                  <input
                    type="text"
                    required
                    placeholder="ex: Contatar cliente para coletar fatura de energia"
                    value={formActSubject}
                    onChange={(e) => setFormActSubject(e.target.value)}
                  />
                </label>

                <label>
                  Data e Hora do Agendamento *
                  <input
                    type="datetime-local"
                    required
                    value={formActDue}
                    onChange={(e) => setFormActDue(e.target.value)}
                  />
                </label>
              </div>
            </fieldset>

            <div className="actions" style={{ marginTop: '1rem' }}>
              <button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Salvando…' : 'Criar Oportunidade'}
              </button>
              <button
                type="button"
                style={{ background: 'var(--color-surface)', color: 'var(--text-primary)' }}
                onClick={() => setIsCreating(false)}
              >
                Cancelar
              </button>
            </div>
          </form>
        </section>
      )}

      {selectedOpp && (
        <section className="panel" aria-label="Detalhes da oportunidade">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <div>
              <h3>
                [{selectedOpp.code}] {selectedOpp.title}
              </h3>
              <p className="device">
                Estágio da esteira:{' '}
                <span className={`badge badge-${selectedOpp.state.toLowerCase()}`}>
                  {selectedOpp.state}
                </span>{' '}
                | Versão: {selectedOpp.version}
              </p>
            </div>
            <button
              style={{ background: 'var(--color-surface)', color: 'var(--text-primary)' }}
              onClick={() => setSelectedOpp(null)}
            >
              Fechar
            </button>
          </div>

          {/* Sub Navigation Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              marginBlock: '1rem',
              borderBottom: '1px solid var(--color-border)',
              paddingBottom: '0.5rem',
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              aria-current={oppTab === 'commercial' ? 'page' : undefined}
              style={{
                background:
                  oppTab === 'commercial' ? 'var(--brand-primary)' : 'var(--color-surface)',
                color: oppTab === 'commercial' ? 'var(--color-surface)' : 'var(--text-primary)',
              }}
              onClick={() => setOppTab('commercial')}
            >
              📋 Dados Comerciais
            </button>
            <button
              type="button"
              aria-current={oppTab === 'consumption' ? 'page' : undefined}
              style={{
                background:
                  oppTab === 'consumption' ? 'var(--brand-primary)' : 'var(--color-surface)',
                color: oppTab === 'consumption' ? 'var(--color-surface)' : 'var(--text-primary)',
              }}
              onClick={() => setOppTab('consumption')}
            >
              ⚡ Consumo & Vistoria
            </button>
            <button
              type="button"
              aria-current={oppTab === 'design' ? 'page' : undefined}
              style={{
                background: oppTab === 'design' ? 'var(--brand-primary)' : 'var(--color-surface)',
                color: oppTab === 'design' ? 'var(--color-surface)' : 'var(--text-primary)',
              }}
              onClick={() => setOppTab('design')}
            >
              ☀️ Dimensionamento & Custos
            </button>
            <button
              type="button"
              aria-current={oppTab === 'proposals' ? 'page' : undefined}
              style={{
                background:
                  oppTab === 'proposals' ? 'var(--brand-primary)' : 'var(--color-surface)',
                color: oppTab === 'proposals' ? 'var(--color-surface)' : 'var(--text-primary)',
              }}
              onClick={() => setOppTab('proposals')}
            >
              📄 Propostas Comerciais
            </button>
          </div>

          {oppTab === 'commercial' && (
            <div style={{ marginTop: '1rem' }}>
              <p>
                <strong>Necessidade:</strong> {selectedOpp.needSummary}
              </p>
              {selectedOpp.estimatedConsumption && (
                <p>
                  <strong>Consumo estimado:</strong> {selectedOpp.estimatedConsumption} kWh/mês
                </p>
              )}

              {/* Stepper Commands */}
              <div className="actions" style={{ marginBlock: '1rem' }}>
                {selectedOpp.state === 'NOVO' && (
                  <button
                    onClick={() => {
                      setQualifySummary(selectedOpp.needSummary);
                      setIsQualifying(true);
                    }}
                  >
                    ✔ Qualificar Oportunidade (Gate A)
                  </button>
                )}

                {!['PERDIDO', 'CANCELADO', 'VENDIDO'].includes(selectedOpp.state) && (
                  <button
                    style={{
                      background: 'var(--color-surface)',
                      color: 'var(--status-danger)',
                      borderColor: 'var(--status-danger)',
                    }}
                    onClick={() => setIsLosing(true)}
                  >
                    Registrar Perda
                  </button>
                )}

                {['PERDIDO', 'CANCELADO'].includes(selectedOpp.state) && canReopen && (
                  <button onClick={() => setIsReopening(true)}>↺ Reabrir Oportunidade</button>
                )}
              </div>

              {isQualifying && (
                <div className="notice" style={{ marginBlock: '1rem' }}>
                  <h4>Qualificação Comercial (Gate A)</h4>
                  <p className="device">
                    Confirme que a necessidade foi identificada e os contatos do cliente estão
                    completos.
                  </p>
                  <Feedback error={qualifyMutation.error} />
                  <label>
                    Resumo Confirmado da Necessidade *
                    <input
                      type="text"
                      required
                      value={qualifySummary}
                      onChange={(e) => setQualifySummary(e.target.value)}
                    />
                  </label>
                  <div className="actions">
                    <button
                      onClick={() => qualifyMutation.mutate()}
                      disabled={qualifyMutation.isPending}
                    >
                      Confirmar Qualificação
                    </button>
                    <button
                      type="button"
                      style={{ background: 'var(--color-surface)', color: 'var(--text-primary)' }}
                      onClick={() => setIsQualifying(false)}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {isLosing && (
                <div className="notice error" style={{ marginBlock: '1rem' }}>
                  <h4>Registrar Perda Comercial</h4>
                  <Feedback error={loseMutation.error} />
                  <label>
                    Motivo da Perda *
                    <select value={lossReason} onChange={(e) => setLossReason(e.target.value)}>
                      <option value="PRECO_ELEVADO">Preço elevado</option>
                      <option value="CONCORRENTE">Perdido para concorrente</option>
                      <option value="DESISTENCIA">Desistência do cliente</option>
                      <option value="INVIABILIDADE_TECNICA">Inviabilidade técnica</option>
                      <option value="FINANCIAMENTO_RECUSADO">Financiamento recusado</option>
                    </select>
                  </label>
                  <label>
                    Observações
                    <input
                      type="text"
                      placeholder="Detalhes adicionais…"
                      value={lossNotes}
                      onChange={(e) => setLossNotes(e.target.value)}
                    />
                  </label>
                  <div className="actions">
                    <button onClick={() => loseMutation.mutate()} disabled={loseMutation.isPending}>
                      Confirmar Perda
                    </button>
                    <button
                      type="button"
                      style={{ background: 'var(--color-surface)', color: 'var(--text-primary)' }}
                      onClick={() => setIsLosing(false)}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {isReopening && (
                <div className="notice" style={{ marginBlock: '1rem' }}>
                  <h4>Reabertura de Oportunidade</h4>
                  <Feedback error={reopenMutation.error} />
                  <label>
                    Justificativa de Reabertura *
                    <input
                      type="text"
                      required
                      placeholder="Informe o motivo da reabertura…"
                      value={reopenJustification}
                      onChange={(e) => setReopenJustification(e.target.value)}
                    />
                  </label>
                  <div className="actions">
                    <button
                      onClick={() => reopenMutation.mutate()}
                      disabled={reopenMutation.isPending}
                    >
                      Confirmar Reabertura
                    </button>
                    <button
                      type="button"
                      style={{ background: 'var(--color-surface)', color: 'var(--text-primary)' }}
                      onClick={() => setIsReopening(false)}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {detailQuery.data && (
                <div style={{ marginTop: '1.5rem' }}>
                  <h4>Histórico de Transições da Esteira</h4>
                  <div className="timeline">
                    {detailQuery.data.transitions?.map((t) => (
                      <div key={t.id} className="timeline-item">
                        <strong>
                          {t.fromState ? `${t.fromState} → ` : ''}
                          {t.toState}
                        </strong>{' '}
                        <span className="device">
                          ({t.reason}) — {new Date(t.createdAt).toLocaleString()}
                        </span>
                        {t.notes && <div>{t.notes}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {oppTab === 'consumption' && (
            <div style={{ marginTop: '1rem' }}>
              <EnergyReadings
                opportunityId={selectedOpp.id}
                customerId={selectedOpp.customerId}
                utilityUnitId={detailQuery.data?.utilityUnitId ?? selectedOpp.utilityUnitId}
                opportunityVersion={detailQuery.data?.version ?? selectedOpp.version}
                onUtilityUnitLinked={() => {
                  queryClient.invalidateQueries({ queryKey: ['opportunity', selectedOpp.id] });
                  queryClient.invalidateQueries({ queryKey: ['opportunities'] });
                }}
              />
              <div style={{ marginTop: '1.5rem' }}>
                <TechnicalSurvey opportunityId={selectedOpp.id} />
              </div>
            </div>
          )}

          {oppTab === 'design' && (
            <div style={{ marginTop: '1rem' }}>
              <SolarDesigner
                opportunityId={selectedOpp.id}
                opportunityTitle={selectedOpp.title}
                suggestedMonthlyKwh={
                  detailQuery.data?.estimatedConsumption ??
                  selectedOpp.estimatedConsumption ??
                  undefined
                }
              />
            </div>
          )}

          {oppTab === 'proposals' && (
            <div style={{ marginTop: '1rem' }}>
              <Proposals
                opportunityId={selectedOpp.id}
                opportunityTitle={selectedOpp.title}
                opportunityState={detailQuery.data?.state ?? selectedOpp.state}
                onOpportunityUpdated={() => {
                  queryClient.invalidateQueries({ queryKey: ['opportunity', selectedOpp.id] });
                  queryClient.invalidateQueries({ queryKey: ['opportunities'] });
                }}
              />
            </div>
          )}
        </section>
      )}

      {/* Table view */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Título / Cliente</th>
              <th>Estágio</th>
              <th>Prioridade</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {oppsQuery.isPending && (
              <tr>
                <td colSpan={5}>Carregando oportunidades…</td>
              </tr>
            )}
            {items.length === 0 && !oppsQuery.isPending && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                  Nenhuma oportunidade encontrada.
                </td>
              </tr>
            )}
            {items.map((opp) => (
              <tr key={opp.id}>
                <td>
                  <strong>{opp.code}</strong>
                </td>
                <td>
                  <div>
                    <strong>{opp.title}</strong>
                  </div>
                  <div className="device">{opp.customer?.legalName}</div>
                </td>
                <td>
                  <span className={`badge badge-${opp.state.toLowerCase()}`}>{opp.state}</span>
                </td>
                <td>{opp.priority}</td>
                <td>
                  <button
                    style={{ padding: '0.25rem 0.75rem', fontSize: '0.8125rem' }}
                    onClick={() => setSelectedOpp(opp)}
                  >
                    Abrir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
