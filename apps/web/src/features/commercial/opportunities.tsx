'use client';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, result, allows } from '../identity/client';
import { Feedback } from '../identity/feedback';
import { Button } from '../../ui/Button';
import { EnergyReadings } from '../design/consumption';
import { TechnicalSurvey } from '../design/survey';
import { SolarDesigner } from '../design/solar-designer';
import { Proposals } from '../proposal/proposals';
import { ContractsView } from '../contract/contracts';
import { OpportunityFinancial } from '../financial/financial';
import type { Schemas } from '@moura-solar/api-client';

type Opportunity = Schemas['OpportunityViewDto'];

interface OpportunitiesProps {
  initialCustomerId?: string;
  onCreated?: () => void;
}

const KANBAN_STAGES: { state: string; label: string; color: string }[] = [
  { state: 'NOVO', label: 'Novo Lead', color: '#ffd400' },
  { state: 'QUALIFICADO', label: 'Qualificado', color: '#3b82f6' },
  { state: 'PROPOSTA_APRESENTADA', label: 'Proposta', color: '#ff9f1c' },
  { state: 'CONTRATACAO', label: 'Contratação', color: '#a855f7' },
  { state: 'VENDIDO', label: 'Vendido / Ganho', color: '#26d866' },
  { state: 'PERDIDO', label: 'Perdido', color: '#ff4d57' },
];

export function Opportunities({ initialCustomerId, onCreated }: OpportunitiesProps = {}) {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [stateFilter, setStateFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [oppTab, setOppTab] = useState<
    'commercial' | 'consumption' | 'design' | 'proposals' | 'contracts' | 'financial'
  >('commercial');
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

  const totalOpps = items.length;
  const newOpps = items.filter((o) => o.state === 'NOVO').length;
  const qualifiedOpps = items.filter((o) => o.state === 'QUALIFICADO').length;
  const proposalOpps = items.filter((o) => o.state === 'PROPOSTA_APRESENTADA').length;
  const wonOpps = items.filter((o) => o.state === 'VENDIDO').length;

  return (
    <div className="commercial-opportunities">
      {/* KPI Metrics Summary Row */}
      <div className="comm-kpi-grid">
        <div className="comm-kpi-card">
          <span className="comm-kpi-card__label">Total no Funil</span>
          <span className="comm-kpi-card__value">{totalOpps}</span>
          <span className="comm-kpi-card__subtext">Negociações ativas</span>
        </div>
        <div className="comm-kpi-card">
          <span className="comm-kpi-card__label">Novos Leads</span>
          <span className="comm-kpi-card__value" style={{ color: 'var(--brand-solar, #ffd400)' }}>
            {newOpps}
          </span>
          <span className="comm-kpi-card__subtext">Aguardando qualificação</span>
        </div>
        <div className="comm-kpi-card">
          <span className="comm-kpi-card__label">Qualificados</span>
          <span className="comm-kpi-card__value" style={{ color: '#3b82f6' }}>
            {qualifiedOpps}
          </span>
          <span className="comm-kpi-card__subtext">Em dimensionamento</span>
        </div>
        <div className="comm-kpi-card">
          <span className="comm-kpi-card__label">Em Proposta</span>
          <span className="comm-kpi-card__value" style={{ color: '#ff9f1c' }}>
            {proposalOpps}
          </span>
          <span className="comm-kpi-card__subtext">Propostas apresentadas</span>
        </div>
        <div className="comm-kpi-card">
          <span className="comm-kpi-card__label">Vendido / Ganho</span>
          <span
            className="comm-kpi-card__value"
            style={{ color: 'var(--status-success, #26d866)' }}
          >
            {wonOpps}
          </span>
          <span className="comm-kpi-card__subtext">Contratos formalizados</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="comm-toolbar">
        <div className="comm-toolbar__title-group">
          <h2 className="comm-toolbar__title">Oportunidades</h2>
          <span className="comm-toolbar__count device">{items.length} negociações</span>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div className="comm-view-toggle">
            <button
              type="button"
              className={`comm-view-toggle__btn ${viewMode === 'kanban' ? 'comm-view-toggle__btn--active' : ''}`}
              onClick={() => setViewMode('kanban')}
            >
              Kanban
            </button>
            <button
              type="button"
              className={`comm-view-toggle__btn ${viewMode === 'table' ? 'comm-view-toggle__btn--active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              Tabela
            </button>
          </div>

          <div className="actions" style={{ margin: 0 }}>
            {!isCreating && (
              <Button
                variant="primary"
                onClick={() => {
                  setIsCreating(true);
                  setSelectedOpp(null);
                }}
              >
                + Nova Oportunidade
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="comm-filter-bar">
        <input
          type="search"
          className="comm-search-input"
          placeholder="Buscar por código, título ou cliente…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Buscar oportunidades"
        />
        <select
          className="comm-filter-select"
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          aria-label="Filtrar por estado do funil"
        >
          <option value="">Todos os estágios</option>
          <option value="NOVO">Novo</option>
          <option value="QUALIFICADO">Qualificado</option>
          <option value="LEVANTAMENTO">Levantamento</option>
          <option value="DIMENSIONAMENTO">Dimensionamento</option>
          <option value="PROPOSTA_APRESENTADA">Proposta Apresentada</option>
          <option value="CONTRATACAO">Contratação</option>
          <option value="VENDIDO">Vendido</option>
          <option value="PERDIDO">Perdido</option>
        </select>
      </div>

      {/* Create form panel */}
      {isCreating && (
        <section className="panel" aria-label="Cadastro de nova oportunidade">
          <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 16px' }}>
            Cadastrar Nova Oportunidade
          </h3>
          <Feedback error={createMutation.error} />

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
          >
            <div className="form-grid">
              <label>
                Título da Negociação *
                <input
                  type="text"
                  className="ui-input"
                  required
                  placeholder="ex: Sistema Residencial 6kWp"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </label>

              <label>
                Cliente *
                <select
                  className="ui-input"
                  required
                  value={formCustomerId}
                  onChange={(e) => setFormCustomerId(e.target.value)}
                >
                  <option value="">Selecione um cliente cadastrado</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.legalName} {c.taxId ? `(${c.taxId})` : ''}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Consumo Médio Estimado (kWh/mês)
                <input
                  type="number"
                  className="ui-input"
                  placeholder="ex: 550"
                  value={formEstimatedConsumption}
                  onChange={(e) => setFormEstimatedConsumption(e.target.value)}
                />
              </label>

              <label>
                Temperatura / Prioridade
                <select
                  className="ui-input"
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
                  className="ui-input"
                  required
                  placeholder="ex: Reduzir conta de luz de R$ 600 para taxa mínima"
                  value={formNeedSummary}
                  onChange={(e) => setFormNeedSummary(e.target.value)}
                />
              </label>
            </div>

            <fieldset
              style={{
                marginTop: '1.25rem',
                border: '1px solid var(--border-default, #29302b)',
                borderRadius: '8px',
                padding: '1.25rem',
                background: 'var(--surface-elevated, #1c211d)',
              }}
            >
              <legend
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'var(--brand-solar, #ffd400)',
                  padding: '0 8px',
                }}
              >
                Primeira Atividade Obrigatória (Gate de Entrada)
              </legend>
              <div className="form-grid">
                <label>
                  Tipo de Atividade
                  <select
                    className="ui-input"
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
                    className="ui-input"
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
                    className="ui-input"
                    required
                    value={formActDue}
                    onChange={(e) => setFormActDue(e.target.value)}
                  />
                </label>
              </div>
            </fieldset>

            <div className="actions" style={{ marginTop: '1.25rem' }}>
              <Button type="submit" variant="primary" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Salvando…' : 'Criar Oportunidade'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setIsCreating(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </section>
      )}

      {/* Opportunity detail panel */}
      {selectedOpp && (
        <section className="panel comm-detail-panel" aria-label="Detalhes da oportunidade">
          <div className="comm-detail-header">
            <div>
              <h3
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  margin: '0 0 6px',
                  color: 'var(--text-primary, #f5f7f5)',
                }}
              >
                [{selectedOpp.code}] {selectedOpp.title}
              </h3>
              <p className="device" style={{ margin: 0, fontSize: '13px' }}>
                Estágio da esteira:{' '}
                <span
                  className={`badge badge-${(detailQuery.data?.state ?? selectedOpp.state).toLowerCase()}`}
                >
                  {detailQuery.data?.state ?? selectedOpp.state}
                </span>{' '}
                | Versão: {detailQuery.data?.version ?? selectedOpp.version}
              </p>
            </div>
            <Button variant="secondary" size="compact" onClick={() => setSelectedOpp(null)}>
              Fechar
            </Button>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="comm-tabs-nav">
            <button
              type="button"
              className={`comm-tab-btn ${oppTab === 'commercial' ? 'comm-tab-btn--active' : ''}`}
              aria-current={oppTab === 'commercial' ? 'page' : undefined}
              onClick={() => setOppTab('commercial')}
            >
              📋 Dados Comerciais
            </button>
            <button
              type="button"
              className={`comm-tab-btn ${oppTab === 'consumption' ? 'comm-tab-btn--active' : ''}`}
              aria-current={oppTab === 'consumption' ? 'page' : undefined}
              onClick={() => setOppTab('consumption')}
            >
              ⚡ Consumo & Vistoria
            </button>
            <button
              type="button"
              className={`comm-tab-btn ${oppTab === 'design' ? 'comm-tab-btn--active' : ''}`}
              aria-current={oppTab === 'design' ? 'page' : undefined}
              onClick={() => setOppTab('design')}
            >
              ☀️ Dimensionamento & Custos
            </button>
            <button
              type="button"
              className={`comm-tab-btn ${oppTab === 'proposals' ? 'comm-tab-btn--active' : ''}`}
              aria-current={oppTab === 'proposals' ? 'page' : undefined}
              onClick={() => setOppTab('proposals')}
            >
              📄 Propostas Comerciais
            </button>
            <button
              type="button"
              className={`comm-tab-btn ${oppTab === 'contracts' ? 'comm-tab-btn--active' : ''}`}
              aria-current={oppTab === 'contracts' ? 'page' : undefined}
              onClick={() => setOppTab('contracts')}
            >
              📝 Contratos & Documentos
            </button>
            <button
              type="button"
              className={`comm-tab-btn ${oppTab === 'financial' ? 'comm-tab-btn--active' : ''}`}
              aria-current={oppTab === 'financial' ? 'page' : undefined}
              onClick={() => setOppTab('financial')}
            >
              💰 Financeiro & Margem
            </button>
          </div>

          {oppTab === 'commercial' && (
            <div style={{ marginTop: '1rem' }}>
              <div
                style={{
                  background: 'var(--surface-elevated, #1c211d)',
                  border: '1px solid var(--border-default, #29302b)',
                  borderRadius: '8px',
                  padding: '16px',
                  display: 'grid',
                  gap: '8px',
                }}
              >
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary, #f5f7f5)' }}>
                  <strong>Necessidade:</strong> {selectedOpp.needSummary}
                </p>
                {selectedOpp.estimatedConsumption && (
                  <p
                    style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary, #9ba49e)' }}
                  >
                    <strong>Consumo estimado:</strong> {selectedOpp.estimatedConsumption} kWh/mês
                  </p>
                )}
              </div>

              {/* Stepper Commands */}
              <div className="actions" style={{ marginBlock: '1.25rem' }}>
                {selectedOpp.state === 'NOVO' && (
                  <Button
                    variant="primary"
                    onClick={() => {
                      setQualifySummary(selectedOpp.needSummary);
                      setIsQualifying(true);
                    }}
                  >
                    ✔ Qualificar Oportunidade (Gate A)
                  </Button>
                )}

                {!['PERDIDO', 'CANCELADO', 'VENDIDO'].includes(selectedOpp.state) && (
                  <Button variant="danger" onClick={() => setIsLosing(true)}>
                    Registrar Perda
                  </Button>
                )}

                {['PERDIDO', 'CANCELADO'].includes(selectedOpp.state) && canReopen && (
                  <Button variant="secondary" onClick={() => setIsReopening(true)}>
                    ↺ Reabrir Oportunidade
                  </Button>
                )}
              </div>

              {isQualifying && (
                <div
                  className="notice"
                  style={{
                    marginBlock: '1rem',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    borderLeftColor: '#3b82f6',
                    background: 'rgba(59, 130, 246, 0.08)',
                  }}
                >
                  <h4
                    style={{
                      margin: '0 0 4px',
                      fontSize: '15px',
                      color: 'var(--text-primary, #f5f7f5)',
                    }}
                  >
                    Qualificação Comercial (Gate A)
                  </h4>
                  <p className="device" style={{ margin: '0 0 10px' }}>
                    Confirme que a necessidade foi identificada e os contatos do cliente estão
                    completos.
                  </p>
                  <Feedback error={qualifyMutation.error} />
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    Resumo Confirmado da Necessidade *
                    <input
                      type="text"
                      className="ui-input"
                      required
                      value={qualifySummary}
                      onChange={(e) => setQualifySummary(e.target.value)}
                    />
                  </label>
                  <div className="actions" style={{ marginTop: '10px' }}>
                    <Button
                      variant="primary"
                      onClick={() => qualifyMutation.mutate()}
                      disabled={qualifyMutation.isPending}
                    >
                      Confirmar Qualificação
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setIsQualifying(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {isLosing && (
                <div
                  className="notice error"
                  style={{
                    marginBlock: '1rem',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                  }}
                >
                  <h4 style={{ margin: '0 0 4px', fontSize: '15px' }}>
                    Registrar Perda da Negociação
                  </h4>
                  <Feedback error={loseMutation.error} />
                  <div className="form-grid" style={{ marginTop: '8px' }}>
                    <label>
                      Motivo da Perda *
                      <select
                        className="ui-input"
                        value={lossReason}
                        onChange={(e) => setLossReason(e.target.value)}
                      >
                        <option value="PRECO_ELEVADO">
                          Preço Elevado / Concorrente Mais Barato
                        </option>
                        <option value="DESISTENCIA_CLIENTE">
                          Cliente Desistiu do Investimento
                        </option>
                        <option value="VIABILIDADE_TECNICA">Inviabilidade Técnica / Telhado</option>
                        <option value="PROBLEMAS_CREDITO">Crédito / Financiamento Reprovado</option>
                        <option value="FALTA_CONTATO">Cliente Não Responde Mais</option>
                        <option value="OUTRO">Outro Motivo</option>
                      </select>
                    </label>
                    <label style={{ gridColumn: '1 / -1' }}>
                      Observações Adicionais
                      <input
                        type="text"
                        className="ui-input"
                        placeholder="Contexto da decisão do cliente"
                        value={lossNotes}
                        onChange={(e) => setLossNotes(e.target.value)}
                      />
                    </label>
                  </div>
                  <div className="actions" style={{ marginTop: '10px' }}>
                    <Button
                      variant="danger"
                      onClick={() => loseMutation.mutate()}
                      disabled={loseMutation.isPending}
                    >
                      Confirmar Perda
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => setIsLosing(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {isReopening && (
                <div
                  className="notice"
                  style={{
                    marginBlock: '1rem',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                  }}
                >
                  <h4 style={{ margin: '0 0 4px', fontSize: '15px' }}>
                    Reabrir Negociação (Governança)
                  </h4>
                  <Feedback error={reopenMutation.error} />
                  <label
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      marginTop: '8px',
                    }}
                  >
                    Justificativa Obrigatória *
                    <input
                      type="text"
                      className="ui-input"
                      required
                      placeholder="ex: Cliente retomou contato após nova condição de financiamento"
                      value={reopenJustification}
                      onChange={(e) => setReopenJustification(e.target.value)}
                    />
                  </label>
                  <div className="actions" style={{ marginTop: '10px' }}>
                    <Button
                      variant="primary"
                      onClick={() => reopenMutation.mutate()}
                      disabled={reopenMutation.isPending}
                    >
                      Reabrir Negociação
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => setIsReopening(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {/* Status and Activity History */}
              <div style={{ marginTop: '1.5rem' }}>
                <h4
                  style={{
                    fontSize: '15px',
                    fontWeight: 700,
                    margin: '0 0 10px',
                    color: 'var(--text-primary, #f5f7f5)',
                  }}
                >
                  Histórico de Transições
                </h4>
                {detailQuery.data?.transitions?.length === 0 ? (
                  <p className="device">Nenhuma transição registrada.</p>
                ) : (
                  <div className="timeline">
                    {detailQuery.data?.transitions?.map((t) => (
                      <div className="timeline-item" key={t.id}>
                        <div>
                          <strong>
                            {t.fromState ? `${t.fromState} → ` : ''}
                            {t.toState}
                          </strong>{' '}
                          <span className="device">({t.reason})</span>
                        </div>
                        <div className="device" style={{ fontSize: '12px' }}>
                          Por: {t.actorUserId ?? 'Sistema'} em{' '}
                          {new Date(t.createdAt).toLocaleString('pt-BR')}
                        </div>
                        {t.notes && (
                          <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>{t.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
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

          {oppTab === 'contracts' && (
            <div style={{ marginTop: '1rem' }}>
              <ContractsView
                opportunityId={selectedOpp.id}
                onRefresh={() => {
                  queryClient.invalidateQueries({ queryKey: ['opportunity', selectedOpp.id] });
                  queryClient.invalidateQueries({ queryKey: ['opportunities'] });
                }}
              />
            </div>
          )}

          {oppTab === 'financial' && (
            <div style={{ marginTop: '1rem' }}>
              <OpportunityFinancial
                opportunityId={selectedOpp.id}
                opportunityCode={selectedOpp.code}
                onUpdated={() => {
                  queryClient.invalidateQueries({ queryKey: ['opportunity', selectedOpp.id] });
                  queryClient.invalidateQueries({ queryKey: ['opportunities'] });
                }}
              />
            </div>
          )}
        </section>
      )}

      {/* Main View: Kanban vs Table */}
      {viewMode === 'kanban' ? (
        <div className="kanban-board">
          {KANBAN_STAGES.map((col) => {
            const stageOpps = items.filter((opp) => opp.state === col.state);
            return (
              <div className="kanban-col" key={col.state}>
                <div className="kanban-col__header">
                  <div className="kanban-col__title">
                    <span
                      className="kanban-col__indicator"
                      style={{ background: col.color }}
                      aria-hidden="true"
                    />
                    {col.label}
                  </div>
                  <span className="kanban-col__count">{stageOpps.length}</span>
                </div>

                <div className="kanban-col__cards">
                  {stageOpps.length === 0 ? (
                    <p
                      style={{
                        fontSize: '12px',
                        color: 'var(--text-disabled, #626a65)',
                        textAlign: 'center',
                        padding: '16px 0',
                      }}
                    >
                      Nenhuma negociação
                    </p>
                  ) : (
                    stageOpps.map((opp) => (
                      <article
                        className="kanban-card"
                        key={opp.id}
                        onClick={() => setSelectedOpp(opp)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') setSelectedOpp(opp);
                        }}
                      >
                        <div className="kanban-card__top">
                          <span className="kanban-card__code">{opp.code}</span>
                          <span
                            className={`badge badge-${opp.state.toLowerCase()}`}
                            style={{ fontSize: '10px', padding: '1px 6px' }}
                          >
                            {opp.state}
                          </span>
                        </div>
                        <div className="kanban-card__title">{opp.title}</div>
                        <p className="kanban-card__customer">
                          {opp.customer?.legalName ?? 'Cliente não informado'}
                        </p>
                        <div className="kanban-card__footer">
                          <span className="kanban-card__metric">
                            {opp.estimatedConsumption ? `${opp.estimatedConsumption} kWh/mês` : '—'}
                          </span>
                          <span
                            style={{ fontSize: '11px', color: 'var(--text-secondary, #9ba49e)' }}
                          >
                            {opp.priority === 'HOT'
                              ? '🔥 Quente'
                              : opp.priority === 'COLD'
                                ? '❄️ Frio'
                                : '⚡ Morno'}
                          </span>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Título / Cliente</th>
                <th>Estágio</th>
                <th>Prioridade</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {oppsQuery.isPending && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                    Carregando oportunidades…
                  </td>
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
                    <strong style={{ color: 'var(--brand-solar, #ffd400)' }}>{opp.code}</strong>
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
                  <td style={{ textAlign: 'right' }}>
                    <Button variant="secondary" size="compact" onClick={() => setSelectedOpp(opp)}>
                      Abrir
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
