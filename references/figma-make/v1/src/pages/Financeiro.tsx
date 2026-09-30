import React, { useState } from 'react';
import { IconDownload, IconChevronLeft, IconChevronRight, IconCheck } from '../components/Icons';

const C = {
  bg: '#090B0A',
  surface: '#111412',
  card: '#161A17',
  elevated: '#1C211D',
  border: '#29302B',
  solar: '#FFD400',
  green: '#26D866',
  red: '#FF4D57',
  orange: '#FF9F1C',
  blue: '#3B82F6',
  text: '#F5F7F5',
  textSec: '#9BA49E',
  textDis: '#626A65',
};

const RECEIVABLES = [
  {
    cliente: 'Maria Santos',
    projeto: 'PRJ-0847',
    parcela: '1/3',
    vencimento: '05/10/2026',
    valor: 'R$ 29.133',
    status: 'Aberta',
    daysLate: 0,
  },
  {
    cliente: 'Farmácia S&V',
    projeto: 'PRJ-0841',
    parcela: '2/4',
    vencimento: '08/10/2026',
    valor: 'R$ 36.250',
    status: 'Aberta',
    daysLate: 0,
  },
  {
    cliente: 'Industrial Norte',
    projeto: 'PRJ-0828',
    parcela: '1/1',
    vencimento: '30/09/2026',
    valor: 'R$ 187.000',
    status: 'Vencida',
    daysLate: 1,
  },
  {
    cliente: 'Cond. Verde Park',
    projeto: 'PRJ-0835',
    parcela: '3/5',
    vencimento: '15/10/2026',
    valor: 'R$ 76.000',
    status: 'Aberta',
    daysLate: 0,
  },
  {
    cliente: 'João P. Silva',
    projeto: 'PRJ-0815',
    parcela: '3/3',
    vencimento: '01/09/2026',
    valor: 'R$ 9.800',
    status: 'Recebida',
    daysLate: 0,
  },
];

const BAR_DATA = [
  { month: 'Abr', entrada: 680, saida: 420 },
  { month: 'Mai', entrada: 750, saida: 390 },
  { month: 'Jun', entrada: 620, saida: 450 },
  { month: 'Jul', entrada: 890, saida: 510 },
  { month: 'Ago', entrada: 970, saida: 480 },
  { month: 'Set', entrada: 842, saida: 423 },
];

const AREA_DATA = [
  { month: 'Out', value: 980 },
  { month: 'Nov', value: 1120 },
  { month: 'Dez', value: 890 },
  { month: 'Jan', value: 1050 },
  { month: 'Fev', value: 1230 },
  { month: 'Mar', value: 1400 },
];

const DONUT = [
  { label: 'A vencer', value: 1147, color: C.blue },
  { label: '1–30 dias', value: 54, color: C.orange },
  { label: '31–60 dias', value: 22, color: C.red },
  { label: '60+ dias', value: 11, color: '#8B1C22' },
];
const DONUT_TOTAL = DONUT.reduce((a, d) => a + d.value, 0);

function DonutChart() {
  let offset = 0;
  const r = 50,
    circ = 2 * Math.PI * r;
  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
      <svg width={120} height={120} viewBox="0 0 120 120">
        <circle cx={60} cy={60} r={r} fill="none" stroke={C.border} strokeWidth={16} />
        {DONUT.map((d, i) => {
          const pct = d.value / DONUT_TOTAL;
          const dash = pct * circ;
          const gap = circ - dash;
          const el = (
            <circle
              key={i}
              cx={60}
              cy={60}
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth={16}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={(-offset * circ) / DONUT_TOTAL}
              style={{ transform: 'rotate(-90deg)', transformOrigin: '60px 60px' }}
            />
          );
          offset += d.value;
          return el;
        })}
        <text x={60} y={55} textAnchor="middle" fill={C.text} fontSize={11} fontWeight={700}>
          R$ 1.234k
        </text>
        <text x={60} y={70} textAnchor="middle" fill={C.textDis} fontSize={9}>
          a receber
        </text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {DONUT.map((d) => (
          <div key={d.label} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div
              style={{ width: 10, height: 10, borderRadius: 2, background: d.color, flexShrink: 0 }}
            />
            <div style={{ fontSize: 12 }}>
              <span style={{ color: C.textSec }}>{d.label}: </span>
              <span style={{ color: C.text, fontWeight: 600 }}>R$ {d.value}k</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarChart() {
  const max = Math.max(...BAR_DATA.flatMap((d) => [d.entrada, d.saida]));
  return (
    <div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 80 }}>
        {BAR_DATA.map((d) => (
          <div
            key={d.month}
            style={{ flex: 1, display: 'flex', gap: 2, alignItems: 'flex-end', height: '100%' }}
          >
            <div
              style={{
                flex: 1,
                background: C.green,
                borderRadius: '3px 3px 0 0',
                height: `${(d.entrada / max) * 100}%`,
                opacity: 0.8,
              }}
              title={`Entrada: R$ ${d.entrada}k`}
            />
            <div
              style={{
                flex: 1,
                background: C.red,
                borderRadius: '3px 3px 0 0',
                height: `${(d.saida / max) * 100}%`,
                opacity: 0.8,
              }}
              title={`Saída: R$ ${d.saida}k`}
            />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
        {BAR_DATA.map((d) => (
          <div
            key={d.month}
            style={{ flex: 1, textAlign: 'center', fontSize: 10, color: C.textDis }}
          >
            {d.month}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        {[
          { label: 'Entradas', color: C.green },
          { label: 'Saídas', color: C.red },
        ].map((l) => (
          <div key={l.label} style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} />
            <span style={{ fontSize: 11, color: C.textSec }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AreaChart() {
  const max = Math.max(...AREA_DATA.map((d) => d.value));
  const w = 100,
    h = 60;
  const pts = AREA_DATA.map((d, i) => ({
    x: (i / (AREA_DATA.length - 1)) * w,
    y: h - (d.value / max) * (h - 8) + 4,
  }));
  const lineD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaD = `${lineD} L${pts[pts.length - 1].x},${h} L0,${h} Z`;

  return (
    <div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        style={{ width: '100%', height: 80 }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.solar} stopOpacity="0.3" />
            <stop offset="100%" stopColor={C.solar} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#areaGrad)" />
        <path d={lineD} fill="none" stroke={C.solar} strokeWidth="1.5" />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={1.5} fill={C.solar} />
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        {AREA_DATA.map((d) => (
          <span key={d.month} style={{ fontSize: 11, color: C.textDis }}>
            {d.month}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Financeiro() {
  const [month, setMonth] = useState('Setembro 2026');
  const months = ['Julho 2026', 'Agosto 2026', 'Setembro 2026', 'Outubro 2026'];
  const idx = months.indexOf(month);

  const kpis = [
    {
      label: 'Saldo a Receber',
      value: 'R$ 1.234.800',
      sub: '42 parcelas abertas',
      color: C.orange,
    },
    { label: 'Recebido no Mês', value: 'R$ 842.390', sub: '+18% vs mês anterior', color: C.green },
    { label: 'Valores Vencidos', value: 'R$ 87.450', sub: '3 clientes em atraso', color: C.red },
    { label: 'Contas a Pagar', value: 'R$ 234.600', sub: 'Vence esta semana', color: C.blue },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Financeiro</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
            }}
          >
            <button
              onClick={() => idx > 0 && setMonth(months[idx - 1])}
              style={{
                width: 32,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: C.textSec,
              }}
            >
              <IconChevronLeft size={16} />
            </button>
            <span
              style={{
                fontSize: 13,
                color: C.text,
                fontWeight: 600,
                padding: '0 4px',
                minWidth: 130,
                textAlign: 'center',
              }}
            >
              {month}
            </span>
            <button
              onClick={() => idx < months.length - 1 && setMonth(months[idx + 1])}
              style={{
                width: 32,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: C.textSec,
              }}
            >
              <IconChevronRight size={16} />
            </button>
          </div>
          <button
            style={{
              padding: '8px 14px',
              background: C.elevated,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              cursor: 'pointer',
              color: C.text,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <IconDownload size={15} /> Exportar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {kpis.map((k) => (
          <div
            key={k.label}
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: '16px 20px',
              borderTop: `2px solid ${k.color}`,
            }}
          >
            <div style={{ fontSize: 12, color: C.textSec, marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color, marginBottom: 4 }}>
              {k.value}
            </div>
            <div style={{ fontSize: 12, color: C.textDis }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Main sections */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {/* Contas a Receber */}
        <div
          style={{
            flex: '3 1 400px',
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${C.border}`,
              fontSize: 14,
              fontWeight: 700,
              color: C.text,
            }}
          >
            Contas a Receber
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: C.surface }}>
                {['Cliente', 'Projeto', 'Parcela', 'Vencimento', 'Valor', 'Status', ''].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '10px 14px',
                      textAlign: 'left',
                      color: C.textDis,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: 0.5,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RECEIVABLES.map((r, i) => (
                <tr
                  key={i}
                  style={{ borderTop: `1px solid ${C.border}` }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.background = C.elevated;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.background = 'transparent';
                  }}
                >
                  <td style={{ padding: '12px 14px', color: C.text, fontWeight: 500 }}>
                    {r.cliente}
                  </td>
                  <td
                    style={{
                      padding: '12px 14px',
                      color: C.textDis,
                      fontFamily: 'monospace',
                      fontSize: 11,
                    }}
                  >
                    {r.projeto}
                  </td>
                  <td style={{ padding: '12px 14px', color: C.textSec }}>{r.parcela}</td>
                  <td style={{ padding: '12px 14px', color: C.textSec, whiteSpace: 'nowrap' }}>
                    {r.vencimento}
                  </td>
                  <td
                    style={{
                      padding: '12px 14px',
                      color: C.solar,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {r.valor}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {r.status === 'Vencida' ? (
                      <div>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: 20,
                            fontSize: 10,
                            fontWeight: 700,
                            color: C.red,
                            background: 'rgba(255,77,87,0.12)',
                          }}
                        >
                          Vencida
                        </span>
                        <div style={{ fontSize: 10, color: C.red, marginTop: 2 }}>
                          {r.daysLate} dia em atraso
                        </div>
                      </div>
                    ) : r.status === 'Recebida' ? (
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 20,
                          fontSize: 10,
                          fontWeight: 700,
                          color: C.green,
                          background: 'rgba(38,216,102,0.12)',
                        }}
                      >
                        Recebida
                      </span>
                    ) : (
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 20,
                          fontSize: 10,
                          fontWeight: 700,
                          color: C.textSec,
                          background: C.elevated,
                        }}
                      >
                        Aberta
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    {r.status === 'Aberta' && (
                      <button
                        style={{
                          fontSize: 10,
                          padding: '4px 8px',
                          background: 'rgba(38,216,102,0.1)',
                          border: `1px solid rgba(38,216,102,0.2)`,
                          borderRadius: 5,
                          cursor: 'pointer',
                          color: C.green,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Registrar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Charts panel */}
        <div style={{ flex: '2 1 280px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: 20,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 16 }}>
              Aging de Recebíveis
            </div>
            <DonutChart />
          </div>
          <div
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: 20,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 16 }}>
              Entradas × Saídas (6 meses)
            </div>
            <BarChart />
          </div>
        </div>
      </div>

      {/* Fluxo de Caixa */}
      <div
        style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: 20,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>
          Fluxo de Caixa Projetado
        </div>
        <div style={{ fontSize: 12, color: C.textSec, marginBottom: 16 }}>
          Projeção para os próximos 6 meses
        </div>
        <AreaChart />
        <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
          {AREA_DATA.map((d) => (
            <div key={d.month} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: C.textDis }}>{d.month}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.solar }}>R$ {d.value}k</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
