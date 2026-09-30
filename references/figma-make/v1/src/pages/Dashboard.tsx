import { useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  IconUsers,
  IconTarget,
  IconFileText,
  IconDollarSign,
  IconFolder,
  IconArrowDown,
  IconAlertTriangle,
  IconCalendar,
  IconArrowUp,
  IconArrowDown as IconArrowDownAlt,
  IconClock,
  IconPackage,
  IconX,
  IconChevronRight,
} from '../components/Icons';

// ─── colour tokens ────────────────────────────────────────────────────────────
const C = {
  bgBase: '#090B0A',
  surface: '#111412',
  card: '#161A17',
  elevated: '#1C211D',
  border: '#29302B',
  solar: '#FFD400',
  solarMuted: '#3A3200',
  green: '#26D866',
  greenMuted: '#113522',
  red: '#FF4D57',
  orange: '#FF9F1C',
  blue: '#3B82F6',
  text: '#F5F7F5',
  textSecondary: '#9BA49E',
  textDisabled: '#626A65',
};

// ─── data ─────────────────────────────────────────────────────────────────────
const revenueData = [
  { mes: 'Jan', valor: 380000 },
  { mes: 'Fev', valor: 420000 },
  { mes: 'Mar', valor: 395000 },
  { mes: 'Abr', valor: 510000 },
  { mes: 'Mai', valor: 480000 },
  { mes: 'Jun', valor: 560000 },
  { mes: 'Jul', valor: 620000 },
  { mes: 'Ago', valor: 590000 },
  { mes: 'Set', valor: 710000 },
];

const proposalData = [
  { mes: 'Jan', propostas: 18, vendas: 12 },
  { mes: 'Fev', propostas: 22, vendas: 15 },
  { mes: 'Mar', propostas: 19, vendas: 13 },
  { mes: 'Abr', propostas: 28, vendas: 20 },
  { mes: 'Mai', propostas: 25, vendas: 18 },
  { mes: 'Jun', propostas: 32, vendas: 24 },
  { mes: 'Jul', propostas: 35, vendas: 28 },
  { mes: 'Ago', propostas: 30, vendas: 25 },
  { mes: 'Set', propostas: 38, vendas: 31 },
];

const funnelData = [
  { stage: 'Entrada', count: 89 },
  { stage: 'Qualificação', count: 67 },
  { stage: 'Levantamento', count: 45 },
  { stage: 'Dimensionamento', count: 38 },
  { stage: 'Proposta', count: 28 },
  { stage: 'Negociação', count: 18 },
  { stage: 'Aprovado', count: 12 },
  { stage: 'Contrato', count: 8 },
];

const cashflowData = [
  { mes: 'Abr', previsto: 680000, realizado: 620000 },
  { mes: 'Mai', previsto: 720000, realizado: 710000 },
  { mes: 'Jun', previsto: 800000, realizado: 780000 },
  { mes: 'Jul', previsto: 850000, realizado: 840000 },
  { mes: 'Ago', previsto: 900000, realizado: 880000 },
  { mes: 'Set', previsto: 950000, realizado: 920000 },
];

const sellers = [
  { name: 'Ana Lima', initials: 'AL', opps: 34, proposals: 28, conv: '82%', revenue: 'R$ 420k' },
  { name: 'Pedro Costa', initials: 'PC', opps: 28, proposals: 22, conv: '79%', revenue: 'R$ 380k' },
  {
    name: 'Juliana Melo',
    initials: 'JM',
    opps: 22,
    proposals: 18,
    conv: '82%',
    revenue: 'R$ 290k',
  },
  { name: 'Rafael Dias', initials: 'RD', opps: 18, proposals: 12, conv: '67%', revenue: 'R$ 195k' },
];

// ─── helpers ──────────────────────────────────────────────────────────────────
const fmtRevenue = (v: number) => `R$ ${(v / 1000).toFixed(0)}k`;
const fmtCurrency = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;

const tooltipStyle = {
  contentStyle: {
    backgroundColor: C.elevated,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    color: C.text,
  },
  labelStyle: { color: C.textSecondary },
  cursor: { fill: 'rgba(255,212,0,0.06)' },
};

// ─── metric card ──────────────────────────────────────────────────────────────
interface MetricCardProps {
  label: string;
  value: string;
  delta?: string;
  deltaUp?: boolean;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  iconColor: string;
  iconBg: string;
}

function MetricCard({
  label,
  value,
  delta,
  deltaUp,
  icon: Icon,
  iconColor,
  iconBg,
}: MetricCardProps) {
  return (
    <div
      style={{
        backgroundColor: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: 20,
      }}
      className="flex flex-col gap-3 hover:border-[#3A4040] transition-colors cursor-pointer group"
    >
      <div className="flex items-start justify-between">
        <div
          style={{ backgroundColor: iconBg, borderRadius: 10, width: 40, height: 40 }}
          className="flex items-center justify-center flex-shrink-0"
        >
          <Icon size={18} style={{ color: iconColor } as React.CSSProperties} />
        </div>
        {delta && (
          <span
            style={{
              backgroundColor: deltaUp ? C.greenMuted : '#3A1214',
              color: deltaUp ? C.green : C.red,
              fontSize: 12,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 20,
            }}
            className="flex items-center gap-1"
          >
            {deltaUp ? <IconArrowUp size={11} /> : <IconArrowDownAlt size={11} />}
            {delta}
          </span>
        )}
      </div>
      <div>
        <div
          style={{
            color: C.text,
            fontSize: 22,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1.2,
          }}
        >
          {value}
        </div>
        <div style={{ color: C.textSecondary, fontSize: 13, marginTop: 4 }}>{label}</div>
      </div>
      <div
        style={{ color: C.solar, fontSize: 12 }}
        className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        Ver detalhes <IconChevronRight size={12} />
      </div>
    </div>
  );
}

// ─── funnel bar ───────────────────────────────────────────────────────────────
function FunnelBar({ stage, count, max }: { stage: string; count: number; max: number }) {
  const pct = (count / max) * 100;
  // gradient from yellow to green based on stage index
  const stageFraction = funnelData.findIndex((d) => d.stage === stage) / (funnelData.length - 1);
  const r = Math.round(255 * (1 - stageFraction) + 38 * stageFraction);
  const g = Math.round(212 * (1 - stageFraction) + 216 * stageFraction);
  const b = Math.round(0 * (1 - stageFraction) + 102 * stageFraction);
  const color = `rgb(${r},${g},${b})`;

  return (
    <div className="flex items-center gap-3">
      <div
        style={{
          color: C.textSecondary,
          fontSize: 12,
          width: 110,
          textAlign: 'right',
          flexShrink: 0,
        }}
      >
        {stage}
      </div>
      <div
        style={{
          flex: 1,
          height: 8,
          backgroundColor: C.elevated,
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <div
          style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: 4 }}
        />
      </div>
      <div
        style={{
          color: C.text,
          fontSize: 13,
          fontWeight: 600,
          width: 28,
          textAlign: 'right',
          flexShrink: 0,
        }}
      >
        {count}
      </div>
    </div>
  );
}

// ─── attention items ──────────────────────────────────────────────────────────
const attentionItems = [
  { text: 'Proposta #2847 vence hoje', color: C.orange, Icon: IconClock },
  { text: '3 instalações agendadas amanhã', color: C.blue, Icon: IconCalendar },
  { text: 'Parcela vencida: Cliente João Silva R$ 4.800', color: C.red, Icon: IconAlertTriangle },
  { text: 'Estoque de Microinversores crítico (2 un.)', color: C.orange, Icon: IconPackage },
  { text: 'Chamado #891 SLA crítico', color: C.red, Icon: IconAlertTriangle },
];

const activities = [
  { text: 'Proposta #2851 aceita por Maria Santos', time: '2h atrás', color: C.green },
  { text: 'Oportunidade criada: Condomínio Verde', time: '4h atrás', color: C.blue },
  { text: 'Pagamento recebido R$ 45.000 - Proj. Fazenda Sol', time: '5h atrás', color: C.green },
  { text: 'Chamado #889 resolvido', time: '1d atrás', color: C.green },
  { text: 'Contrato #312 assinado - Industrial Norte', time: '1d atrás', color: C.solar },
];

// ─── main ─────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [period, setPeriod] = useState<'Hoje' | 'Semana' | 'Mês' | 'Trim' | 'Ano'>('Mês');
  const [alertDismissed, setAlertDismissed] = useState(false);

  const periods = ['Hoje', 'Semana', 'Mês', 'Trim', 'Ano'] as const;

  const metrics: MetricCardProps[] = [
    {
      label: 'Clientes Ativos',
      value: '847',
      delta: '+12 este mês',
      deltaUp: true,
      icon: IconUsers,
      iconColor: C.green,
      iconBg: C.greenMuted,
    },
    {
      label: 'Oportunidades Abertas',
      value: '124',
      delta: '+8',
      deltaUp: true,
      icon: IconTarget,
      iconColor: C.blue,
      iconBg: '#112240',
    },
    {
      label: 'Propostas Enviadas',
      value: '38',
      delta: '-3',
      deltaUp: false,
      icon: IconFileText,
      iconColor: C.orange,
      iconBg: '#2D1E0A',
    },
    {
      label: 'Receita Recebida',
      value: 'R$ 2,84M',
      delta: '+18%',
      deltaUp: true,
      icon: IconDollarSign,
      iconColor: C.green,
      iconBg: C.greenMuted,
    },
    {
      label: 'Projetos Ativos',
      value: '67',
      delta: '+5',
      deltaUp: true,
      icon: IconFolder,
      iconColor: C.blue,
      iconBg: '#112240',
    },
    {
      label: 'Contas a Receber',
      value: 'R$ 1,23M',
      icon: IconArrowDown,
      iconColor: C.orange,
      iconBg: '#2D1E0A',
    },
    {
      label: 'Valores Vencidos',
      value: 'R$ 87.450',
      delta: '+2',
      deltaUp: false,
      icon: IconAlertTriangle,
      iconColor: C.red,
      iconBg: '#3A1214',
    },
    {
      label: 'Instalações Agendadas',
      value: '12',
      icon: IconCalendar,
      iconColor: C.green,
      iconBg: C.greenMuted,
    },
  ];

  const maxFunnel = funnelData[0].count;

  return (
    <div
      style={{ backgroundColor: C.bgBase, minHeight: '100vh', color: C.text }}
      className="p-4 md:p-6 space-y-5"
    >
      {/* ── header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Visão Geral</h1>
          <p style={{ color: C.textSecondary, fontSize: 13, marginTop: 2 }}>
            Quarta-feira, 30 de setembro de 2026
          </p>
        </div>
        <div
          style={{
            backgroundColor: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: '4px',
          }}
          className="flex"
        >
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '6px 14px',
                borderRadius: 7,
                fontSize: 13,
                fontWeight: 500,
                backgroundColor: period === p ? C.solar : 'transparent',
                color: period === p ? '#090B0A' : C.textSecondary,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* ── alert banner ── */}
      {!alertDismissed && (
        <div
          style={{
            backgroundColor: C.solarMuted,
            border: `1px solid ${C.solar}`,
            borderRadius: 10,
            padding: '12px 16px',
          }}
          className="flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <IconAlertTriangle
              size={18}
              style={{ color: C.solar, flexShrink: 0 } as React.CSSProperties}
            />
            <span style={{ color: C.solar, fontSize: 14, fontWeight: 500 }}>
              3 itens precisam de atenção — revise a seção abaixo
            </span>
          </div>
          <button
            onClick={() => setAlertDismissed(true)}
            style={{
              color: C.solar,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
            }}
          >
            <IconX size={18} />
          </button>
        </div>
      )}

      {/* ── metric cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>

      {/* ── charts row 1 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue bar */}
        <div
          style={{
            backgroundColor: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: 20,
          }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Receita Mensal</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenueData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.elevated} vertical={false} />
              <XAxis
                dataKey="mes"
                tick={{ fill: C.textSecondary, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: C.textSecondary, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={fmtRevenue}
                width={60}
              />
              <Tooltip
                {...tooltipStyle}
                formatter={(v: any) => [fmtCurrency(v as number), 'Receita']}
              />
              <Bar dataKey="valor" fill={C.solar} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Proposals vs Sales line */}
        <div
          style={{
            backgroundColor: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: 20,
          }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Propostas × Vendas</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={proposalData}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.elevated} vertical={false} />
              <XAxis
                dataKey="mes"
                tick={{ fill: C.textSecondary, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: C.textSecondary, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ color: C.textSecondary, fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="propostas"
                stroke={C.blue}
                strokeWidth={2}
                dot={{ fill: C.blue, r: 3 }}
                name="Propostas"
              />
              <Line
                type="monotone"
                dataKey="vendas"
                stroke={C.green}
                strokeWidth={2}
                dot={{ fill: C.green, r: 3 }}
                name="Vendas"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── charts row 2 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Funnel horizontal bars */}
        <div
          style={{
            backgroundColor: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: 20,
          }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Funil Comercial</h3>
          <div className="space-y-3">
            {funnelData.map((d) => (
              <FunnelBar key={d.stage} stage={d.stage} count={d.count} max={maxFunnel} />
            ))}
          </div>
        </div>

        {/* Cash flow area */}
        <div
          style={{
            backgroundColor: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: 20,
          }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Fluxo de Caixa</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={cashflowData}>
              <defs>
                <linearGradient id="gprevisto" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.blue} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C.blue} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="grealizado" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.green} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C.green} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.elevated} vertical={false} />
              <XAxis
                dataKey="mes"
                tick={{ fill: C.textSecondary, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: C.textSecondary, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={fmtRevenue}
                width={60}
              />
              <Tooltip {...tooltipStyle} formatter={(v: any) => [fmtCurrency(v as number)]} />
              <Legend wrapperStyle={{ color: C.textSecondary, fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="previsto"
                stroke={C.blue}
                fill="url(#gprevisto)"
                strokeWidth={2}
                name="Previsto"
              />
              <Area
                type="monotone"
                dataKey="realizado"
                stroke={C.green}
                fill="url(#grealizado)"
                strokeWidth={2}
                name="Realizado"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── bottom panels ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Attention today */}
        <div
          style={{
            backgroundColor: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: 20,
          }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Atenção Hoje</h3>
          <div className="space-y-2">
            {attentionItems.map((item) => (
              <div
                key={item.text}
                style={{
                  backgroundColor: C.elevated,
                  borderRadius: 10,
                  padding: '10px 14px',
                  border: `1px solid ${C.border}`,
                }}
                className="flex items-center gap-3 cursor-pointer hover:border-[#3A4040] transition-colors group"
              >
                <item.Icon
                  size={16}
                  style={{ color: item.color, flexShrink: 0 } as React.CSSProperties}
                />
                <span style={{ fontSize: 13, flex: 1, color: C.text }}>{item.text}</span>
                <button
                  style={{
                    fontSize: 12,
                    color: item.color,
                    background: 'none',
                    border: `1px solid ${item.color}`,
                    borderRadius: 6,
                    padding: '2px 10px',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  Ver
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activities */}
        <div
          style={{
            backgroundColor: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: 20,
          }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Atividades Recentes</h3>
          <div className="space-y-0">
            {activities.map((a, i) => (
              <div
                key={a.text}
                className="flex gap-3 items-start"
                style={{ paddingBottom: i < activities.length - 1 ? 16 : 0, position: 'relative' }}
              >
                {/* timeline dot */}
                <div
                  style={{
                    flexShrink: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      backgroundColor: a.color,
                      marginTop: 3,
                      boxShadow: `0 0 6px ${a.color}60`,
                    }}
                  />
                  {i < activities.length - 1 && (
                    <div
                      style={{
                        width: 1,
                        flex: 1,
                        backgroundColor: C.border,
                        marginTop: 4,
                        minHeight: 24,
                      }}
                    />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, color: C.text, lineHeight: 1.4 }}>{a.text}</p>
                  <p style={{ fontSize: 11, color: C.textSecondary, marginTop: 2 }}>{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── seller performance table ── */}
      <div
        style={{
          backgroundColor: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 14,
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>Desempenho por Vendedor</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: C.elevated }}>
                {['Vendedor', 'Oportunidades', 'Propostas', 'Conversão', 'Receita'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '10px 20px',
                      textAlign: 'left',
                      fontSize: 12,
                      color: C.textSecondary,
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sellers.map((s, i) => (
                <tr
                  key={s.name}
                  style={{ borderTop: `1px solid ${C.border}` }}
                  className="hover:bg-[#1C211D] transition-colors"
                >
                  <td style={{ padding: '12px 20px' }}>
                    <div className="flex items-center gap-3">
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          backgroundColor: C.solarMuted,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          fontWeight: 700,
                          color: C.solar,
                          flexShrink: 0,
                        }}
                      >
                        {s.initials}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</span>
                    </div>
                  </td>
                  <td
                    style={{
                      padding: '12px 20px',
                      fontSize: 13,
                      color: C.text,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {s.opps}
                  </td>
                  <td
                    style={{
                      padding: '12px 20px',
                      fontSize: 13,
                      color: C.text,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {s.proposals}
                  </td>
                  <td style={{ padding: '12px 20px' }}>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: parseInt(s.conv) >= 80 ? C.green : C.orange,
                      }}
                    >
                      {s.conv}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: '12px 20px',
                      fontSize: 13,
                      fontWeight: 700,
                      color: C.solar,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {s.revenue}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
