'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, result } from '../identity/client';
import { Button } from '../../ui/Button';
import {
  IconUsers,
  IconTarget,
  IconFileText,
  IconDollarSign,
  IconFolder,
  IconAlertTriangle,
  IconCheck,
  IconCalendar,
  IconChevronRight,
  IconX,
  IconPlus,
} from '../../ui/Icons';
import type { Schemas } from '@moura-solar/api-client';

type Opportunity = Schemas['OpportunityViewDto'];
type Customer = Schemas['CustomerViewDto'];
type Activity = Schemas['ActivityViewDto'];

export interface DashboardProps {
  onNavigate?: (tab: string) => void;
}

function formatBRL(val: number | string | undefined | null) {
  const num = typeof val === 'string' ? parseFloat(val) : (val ?? 0);
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(iso: string | undefined | null) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR');
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const [period, setPeriod] = useState<'Hoje' | 'Semana' | 'Mês' | 'Trim' | 'Ano'>('Mês');
  const [alertDismissed, setAlertDismissed] = useState(false);

  // Queries
  const oppsQuery = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => result(api.GET('/api/v1/opportunities')),
    refetchOnWindowFocus: true,
  });

  const customersQuery = useQuery({
    queryKey: ['customers'],
    queryFn: () => result(api.GET('/api/v1/customers')),
    refetchOnWindowFocus: true,
  });

  const cashFlowQuery = useQuery({
    queryKey: ['cash-flow'],
    queryFn: async () => {
      const res = await result(api.GET('/api/v1/financial/cash-flow'));
      return res as unknown as {
        summary: { totalIn: number; totalOut: number; netCash: number };
        movements: Array<{
          id: string;
          direction: 'IN' | 'OUT';
          type: string;
          amount: number | string;
          effectiveAt: string;
          description: string;
        }>;
      };
    },
    refetchOnWindowFocus: true,
  });

  const activitiesQuery = useQuery({
    queryKey: ['activities'],
    queryFn: () => result(api.GET('/api/v1/activities')),
    refetchOnWindowFocus: true,
  });

  const opportunities: Opportunity[] =
    (oppsQuery.data as { items?: Opportunity[] })?.items || [];
  const customers: Customer[] = (customersQuery.data as { items?: Customer[] })?.items || [];
  const cashFlow = cashFlowQuery.data;
  const activities: Activity[] = (activitiesQuery.data as Activity[]) || [];

  // Metrics calculation
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter((c) => c.status === 'ACTIVE').length;

  const totalOpps = opportunities.length;
  const openOpps = opportunities.filter((o) => !['VENDIDO', 'PERDIDO'].includes(o.state)).length;
  const wonOpps = opportunities.filter((o) => o.state === 'VENDIDO').length;

  // Funnel stage distribution
  const funnelStages = [
    { key: 'LEAD_NOVO', label: 'Lead Novo', color: '#ffd400' },
    { key: 'QUALIFICACAO', label: 'Qualificação', color: '#ffbe00' },
    { key: 'LEVANTAMENTO', label: 'Levantamento', color: '#e6be00' },
    { key: 'DIMENSIONAMENTO', label: 'Dimensionamento', color: '#38bdf8' },
    { key: 'PROPOSTA_APRESENTADA', label: 'Proposta Apresentada', color: '#3b82f6' },
    { key: 'CONTRATACAO', label: 'Contratação', color: '#a855f7' },
    { key: 'VENDIDO', label: 'Vendido (Ganho)', color: '#26d866' },
  ];

  const funnelCounts = funnelStages.map((stage) => {
    const count = opportunities.filter((o) => o.state === stage.key).length;
    return { ...stage, count };
  });

  const maxFunnelCount = Math.max(...funnelCounts.map((f) => f.count), 1);

  // Activities metrics
  const pendingActivities = activities.filter((a) => a.status === 'OPEN').length;
  const overdueActivities = activities.filter(
    (a) => a.status === 'OPEN' && new Date(a.dueAt) < new Date(),
  ).length;

  // Cash flow metrics
  const totalIn = cashFlow?.summary?.totalIn ?? 0;
  const totalOut = cashFlow?.summary?.totalOut ?? 0;
  const netCash = cashFlow?.summary?.netCash ?? 0;
  const totalFlow = totalIn + totalOut;
  const inPercent = totalFlow > 0 ? Math.round((totalIn / totalFlow) * 100) : 50;
  const outPercent = totalFlow > 0 ? 100 - inPercent : 50;

  // Current formatted date
  const todayFormatted = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
  const capitalizedDate = todayFormatted.charAt(0).toUpperCase() + todayFormatted.slice(1);

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Visão Geral da Plataforma</h1>
          <p className="dashboard-subtitle">
            {capitalizedDate} • Gestão executiva integrada de vendas, engenharia, contratos e
            finanças.
          </p>
        </div>

        {/* Period Selector */}
        <div className="dashboard-period-filter">
          {(['Hoje', 'Semana', 'Mês', 'Trim', 'Ano'] as const).map((p) => (
            <button
              key={p}
              type="button"
              className={`dashboard-period-btn ${period === p ? 'dashboard-period-btn--active' : ''}`}
              onClick={() => setPeriod(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Alert Banner if there are pending items */}
      {!alertDismissed && (overdueActivities > 0 || openOpps > 0) && (
        <div className="dashboard-alert-banner">
          <div className="dashboard-alert-content">
            <IconAlertTriangle size={20} />
            <span>
              {overdueActivities > 0
                ? `${overdueActivities} atividade(s) comercial(is) requer(em) atenção prioritária hoje.`
                : `${openOpps} oportunidade(s) ativa(s) no pipeline aguardando progressão.`}
            </span>
          </div>
          <button
            type="button"
            className="dashboard-alert-close"
            onClick={() => setAlertDismissed(true)}
            aria-label="Fechar alerta"
          >
            <IconX size={18} />
          </button>
        </div>
      )}

      {/* 8 Executive KPI Cards */}
      <div className="dashboard-kpi-grid">
        {/* KPI 1 */}
        <div
          className="dashboard-kpi-card"
          onClick={() => onNavigate?.('customers')}
          style={{ cursor: 'pointer' }}
        >
          <div className="dashboard-kpi-header">
            <div
              className="dashboard-kpi-icon"
              style={{ background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8' }}
            >
              <IconUsers size={20} />
            </div>
            <span
              className="dashboard-kpi-tag"
              style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}
            >
              {activeCustomers} Ativos
            </span>
          </div>
          <div className="dashboard-kpi-value">{totalCustomers}</div>
          <div className="dashboard-kpi-label">Clientes Cadastrados</div>
        </div>

        {/* KPI 2 */}
        <div
          className="dashboard-kpi-card"
          onClick={() => onNavigate?.('opportunities')}
          style={{ cursor: 'pointer' }}
        >
          <div className="dashboard-kpi-header">
            <div
              className="dashboard-kpi-icon"
              style={{ background: 'rgba(255, 212, 0, 0.12)', color: '#ffd400' }}
            >
              <IconTarget size={20} />
            </div>
            <span
              className="dashboard-kpi-tag"
              style={{ background: 'rgba(255, 212, 0, 0.15)', color: '#ffd400' }}
            >
              Em Aberto
            </span>
          </div>
          <div className="dashboard-kpi-value">{openOpps}</div>
          <div className="dashboard-kpi-label">Pipeline de Oportunidades</div>
        </div>

        {/* KPI 3 */}
        <div
          className="dashboard-kpi-card"
          onClick={() => onNavigate?.('opportunities')}
          style={{ cursor: 'pointer' }}
        >
          <div className="dashboard-kpi-header">
            <div
              className="dashboard-kpi-icon"
              style={{ background: 'rgba(38, 216, 102, 0.12)', color: '#26d866' }}
            >
              <IconCheck size={20} />
            </div>
            <span
              className="dashboard-kpi-tag"
              style={{ background: 'rgba(38, 216, 102, 0.15)', color: '#26d866' }}
            >
              Concluídas
            </span>
          </div>
          <div className="dashboard-kpi-value">{wonOpps}</div>
          <div className="dashboard-kpi-label">Vendas Ganhas (Vendido)</div>
        </div>

        {/* KPI 4 */}
        <div
          className="dashboard-kpi-card"
          onClick={() => onNavigate?.('financial')}
          style={{ cursor: 'pointer' }}
        >
          <div className="dashboard-kpi-header">
            <div
              className="dashboard-kpi-icon"
              style={{ background: 'rgba(38, 216, 102, 0.12)', color: '#26d866' }}
            >
              <IconDollarSign size={20} />
            </div>
            <span
              className="dashboard-kpi-tag"
              style={{ background: 'rgba(38, 216, 102, 0.15)', color: '#26d866' }}
            >
              Realizado
            </span>
          </div>
          <div className="dashboard-kpi-value" style={{ color: '#26d866' }}>
            {formatBRL(totalIn)}
          </div>
          <div className="dashboard-kpi-label">Receita Entradas (Caixa)</div>
        </div>

        {/* KPI 5 */}
        <div
          className="dashboard-kpi-card"
          onClick={() => onNavigate?.('financial')}
          style={{ cursor: 'pointer' }}
        >
          <div className="dashboard-kpi-header">
            <div
              className="dashboard-kpi-icon"
              style={{ background: 'rgba(255, 77, 87, 0.12)', color: '#ff4d57' }}
            >
              <IconFolder size={20} />
            </div>
            <span
              className="dashboard-kpi-tag"
              style={{ background: 'rgba(255, 77, 87, 0.15)', color: '#ff4d57' }}
            >
              Custos Pagos
            </span>
          </div>
          <div className="dashboard-kpi-value" style={{ color: '#ff4d57' }}>
            {formatBRL(totalOut)}
          </div>
          <div className="dashboard-kpi-label">Saídas & Despesas</div>
        </div>

        {/* KPI 6 */}
        <div
          className="dashboard-kpi-card"
          onClick={() => onNavigate?.('financial')}
          style={{ cursor: 'pointer' }}
        >
          <div className="dashboard-kpi-header">
            <div
              className="dashboard-kpi-icon"
              style={{ background: 'rgba(255, 212, 0, 0.12)', color: '#ffd400' }}
            >
              <IconDollarSign size={20} />
            </div>
            <span
              className="dashboard-kpi-tag"
              style={{
                background: netCash >= 0 ? 'rgba(38, 216, 102, 0.15)' : 'rgba(255, 77, 87, 0.15)',
                color: netCash >= 0 ? '#26d866' : '#ff4d57',
              }}
            >
              {netCash >= 0 ? 'Positivo' : 'Negativo'}
            </span>
          </div>
          <div
            className="dashboard-kpi-value"
            style={{ color: netCash >= 0 ? '#ffd400' : '#ff4d57' }}
          >
            {formatBRL(netCash)}
          </div>
          <div className="dashboard-kpi-label">Saldo Operacional Líquido</div>
        </div>

        {/* KPI 7 */}
        <div
          className="dashboard-kpi-card"
          onClick={() => onNavigate?.('activities')}
          style={{ cursor: 'pointer' }}
        >
          <div className="dashboard-kpi-header">
            <div
              className="dashboard-kpi-icon"
              style={{ background: 'rgba(168, 85, 247, 0.12)', color: '#a855f7' }}
            >
              <IconCalendar size={20} />
            </div>
            <span
              className="dashboard-kpi-tag"
              style={{
                background:
                  overdueActivities > 0 ? 'rgba(255, 77, 87, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                color: overdueActivities > 0 ? '#ff4d57' : '#a855f7',
              }}
            >
              {overdueActivities > 0 ? `${overdueActivities} Vencidas` : 'Em dia'}
            </span>
          </div>
          <div className="dashboard-kpi-value">{pendingActivities}</div>
          <div className="dashboard-kpi-label">Atividades Pendentes</div>
        </div>

        {/* KPI 8 */}
        <div
          className="dashboard-kpi-card"
          onClick={() => onNavigate?.('opportunities')}
          style={{ cursor: 'pointer' }}
        >
          <div className="dashboard-kpi-header">
            <div
              className="dashboard-kpi-icon"
              style={{ background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8' }}
            >
              <IconFileText size={20} />
            </div>
            <span
              className="dashboard-kpi-tag"
              style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}
            >
              Total
            </span>
          </div>
          <div className="dashboard-kpi-value">{totalOpps}</div>
          <div className="dashboard-kpi-label">Oportunidades Cadastradas</div>
        </div>
      </div>

      {/* Row 1: Funil Comercial & Fluxo de Caixa */}
      <div className="dashboard-section-grid">
        {/* Funnel */}
        <div className="dashboard-panel">
          <div className="dashboard-panel-header">
            <h3 className="dashboard-panel-title">
              <IconTarget size={18} style={{ color: '#ffd400' }} />
              Funil Comercial & Pipeline
            </h3>
            <Button
              type="button"
              variant="ghost"
              size="compact"
              onClick={() => onNavigate?.('opportunities')}
            >
              Ver Funil <IconChevronRight size={14} />
            </Button>
          </div>

          <div className="dashboard-funnel-list">
            {funnelCounts.map((f) => {
              const pct = maxFunnelCount > 0 ? Math.round((f.count / maxFunnelCount) * 100) : 0;
              return (
                <div key={f.key} className="dashboard-funnel-item">
                  <div className="dashboard-funnel-label">{f.label}</div>
                  <div className="dashboard-funnel-track">
                    <div
                      className="dashboard-funnel-fill"
                      style={{
                        width: `${Math.max(pct, 4)}%`,
                        backgroundColor: f.color,
                      }}
                    />
                  </div>
                  <div className="dashboard-funnel-count">{f.count}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cash Flow Summary */}
        <div className="dashboard-panel">
          <div className="dashboard-panel-header">
            <h3 className="dashboard-panel-title">
              <IconDollarSign size={18} style={{ color: '#26d866' }} />
              Composição Financeira (Recebimentos × Pagamentos)
            </h3>
            <Button
              type="button"
              variant="ghost"
              size="compact"
              onClick={() => onNavigate?.('financial')}
            >
              Painel Financeiro <IconChevronRight size={14} />
            </Button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              <span style={{ color: '#26d866' }}>
                ● Entradas: {formatBRL(totalIn)} ({inPercent}%)
              </span>
              <span style={{ color: '#ff4d57' }}>
                ● Saídas: {formatBRL(totalOut)} ({outPercent}%)
              </span>
            </div>

            {/* Proportion Bar */}
            <div
              style={{
                height: '14px',
                backgroundColor: 'var(--surface-sunken, #111412)',
                borderRadius: '999px',
                overflow: 'hidden',
                display: 'flex',
                border: '1px solid var(--border-default, #29302b)',
              }}
            >
              <div
                style={{
                  width: `${inPercent}%`,
                  backgroundColor: '#26d866',
                  transition: 'width 0.3s ease',
                }}
              />
              <div
                style={{
                  width: `${outPercent}%`,
                  backgroundColor: '#ff4d57',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>

            {/* Quick summary cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem',
                marginTop: '0.5rem',
              }}
            >
              <div
                style={{
                  background: 'var(--surface-sunken, #111412)',
                  border: '1px solid var(--border-default, #29302b)',
                  borderRadius: '8px',
                  padding: '0.85rem',
                }}
              >
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary, #9ba49e)',
                    fontWeight: 600,
                  }}
                >
                  POSIÇÃO LÍQUIDA
                </span>
                <div
                  style={{
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    color: netCash >= 0 ? '#ffd400' : '#ff4d57',
                    marginTop: '0.2rem',
                  }}
                >
                  {formatBRL(netCash)}
                </div>
              </div>

              <div
                style={{
                  background: 'var(--surface-sunken, #111412)',
                  border: '1px solid var(--border-default, #29302b)',
                  borderRadius: '8px',
                  padding: '0.85rem',
                }}
              >
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary, #9ba49e)',
                    fontWeight: 600,
                  }}
                >
                  MOVIMENTAÇÕES RECENTES
                </span>
                <div
                  style={{
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    color: 'var(--text-primary, #f5f7f5)',
                    marginTop: '0.2rem',
                  }}
                >
                  {cashFlow?.movements?.length ?? 0} registros
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Últimas Oportunidades & Atividades Recentes */}
      <div className="dashboard-section-grid">
        {/* Recent Opportunities */}
        <div className="dashboard-panel">
          <div className="dashboard-panel-header">
            <h3 className="dashboard-panel-title">
              <IconFolder size={18} style={{ color: '#38bdf8' }} />
              Oportunidades no Pipeline
            </h3>
            <Button
              type="button"
              variant="ghost"
              size="compact"
              onClick={() => onNavigate?.('opportunities')}
            >
              Ver Todas <IconChevronRight size={14} />
            </Button>
          </div>

          {opportunities.length === 0 ? (
            <p style={{ color: 'var(--text-secondary, #9ba49e)', fontSize: '0.875rem', margin: 0 }}>
              Nenhuma oportunidade cadastrada no sistema.
            </p>
          ) : (
            <div className="dashboard-table-wrapper">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Título / Oportunidade</th>
                    <th>Cliente</th>
                    <th>Estágio</th>
                    <th style={{ textAlign: 'right' }}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {opportunities.slice(0, 6).map((opp) => (
                    <tr key={opp.id}>
                      <td style={{ fontWeight: 700, color: 'var(--brand-solar, #ffd400)' }}>
                        {opp.code}
                      </td>
                      <td>
                        <strong>{opp.title}</strong>
                      </td>
                      <td style={{ color: 'var(--text-secondary, #9ba49e)' }}>
                        {opp.customer?.legalName || '-'}
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            backgroundColor:
                              opp.state === 'VENDIDO'
                                ? 'rgba(38, 216, 102, 0.15)'
                                : opp.state === 'PERDIDO'
                                  ? 'rgba(255, 77, 87, 0.15)'
                                  : 'rgba(255, 212, 0, 0.15)',
                            color:
                              opp.state === 'VENDIDO'
                                ? '#26d866'
                                : opp.state === 'PERDIDO'
                                  ? '#ff4d57'
                                  : '#ffd400',
                          }}
                        >
                          {opp.state}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="compact"
                          onClick={() => onNavigate?.('opportunities')}
                        >
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

        {/* Recent Activities */}
        <div className="dashboard-panel">
          <div className="dashboard-panel-header">
            <h3 className="dashboard-panel-title">
              <IconCalendar size={18} style={{ color: '#a855f7' }} />
              Atividades Recentes & Agenda
            </h3>
            <Button
              type="button"
              variant="ghost"
              size="compact"
              onClick={() => onNavigate?.('activities')}
            >
              Ver Agenda <IconChevronRight size={14} />
            </Button>
          </div>

          {activities.length === 0 ? (
            <p style={{ color: 'var(--text-secondary, #9ba49e)', fontSize: '0.875rem', margin: 0 }}>
              Nenhuma atividade cadastrada.
            </p>
          ) : (
            <div className="dashboard-timeline">
              {activities.slice(0, 6).map((act) => {
                const isOverdue = act.status === 'OPEN' && new Date(act.dueAt) < new Date();
                const isCompleted = act.status === 'COMPLETED';
                const dotColor = isCompleted ? '#26d866' : isOverdue ? '#ff4d57' : '#ffd400';
                return (
                  <div key={act.id} className="dashboard-timeline-item">
                    <div className="dashboard-timeline-dot" style={{ backgroundColor: dotColor }} />
                    <div className="dashboard-timeline-content">
                      <p className="dashboard-timeline-text">
                        <strong>[{act.type}]</strong> {act.subject}
                      </p>
                      <p className="dashboard-timeline-time">
                        Vencimento: {formatDate(act.dueAt)} •{' '}
                        <span
                          style={{
                            color: isCompleted ? '#26d866' : isOverdue ? '#ff4d57' : '#ffd400',
                            fontWeight: 600,
                          }}
                        >
                          {isCompleted ? 'Concluída' : isOverdue ? 'Vencida' : 'Aberta'}
                        </span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Quick Navigation Actions */}
      <div className="dashboard-panel">
        <h3 className="dashboard-panel-title">
          <IconPlus size={18} style={{ color: '#ffd400' }} />
          Ações Rápidas do Operador
        </h3>
        <div className="dashboard-quick-actions">
          <button
            type="button"
            className="dashboard-action-btn"
            onClick={() => onNavigate?.('opportunities')}
          >
            <IconTarget size={18} style={{ color: '#ffd400' }} />
            <span>Nova Oportunidade</span>
          </button>

          <button
            type="button"
            className="dashboard-action-btn"
            onClick={() => onNavigate?.('customers')}
          >
            <IconUsers size={18} style={{ color: '#38bdf8' }} />
            <span>Novo Cliente</span>
          </button>

          <button
            type="button"
            className="dashboard-action-btn"
            onClick={() => onNavigate?.('financial')}
          >
            <IconDollarSign size={18} style={{ color: '#26d866' }} />
            <span>Gestão de Caixa & Contas</span>
          </button>

          <button
            type="button"
            className="dashboard-action-btn"
            onClick={() => onNavigate?.('activities')}
          >
            <IconCalendar size={18} style={{ color: '#a855f7' }} />
            <span>Agenda de Atividades</span>
          </button>
        </div>
      </div>
    </div>
  );
}
