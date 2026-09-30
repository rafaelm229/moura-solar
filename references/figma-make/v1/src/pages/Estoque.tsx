import React, { useState } from 'react';
import { IconPlus, IconSearch } from '../components/Icons';

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

type StockStatus = 'Normal' | 'Crítico' | 'Esgotado';

interface Product {
  nome: string;
  fabricante: string;
  sku: string;
  categoria: string;
  estoque: string;
  reservado: string;
  disponivel: string;
  custoMedio: string;
  valorTotal: string;
  status: StockStatus;
}

const PRODUCTS: Product[] = [
  {
    nome: 'Módulo JA Solar 550W',
    fabricante: 'JA Solar',
    sku: 'MOD-550-JA',
    categoria: 'Módulos',
    estoque: '240 un',
    reservado: '85',
    disponivel: '155',
    custoMedio: 'R$ 890',
    valorTotal: 'R$ 213.600',
    status: 'Normal',
  },
  {
    nome: 'Módulo Canadian Solar 540W',
    fabricante: 'Canadian Solar',
    sku: 'MOD-540-CS',
    categoria: 'Módulos',
    estoque: '120 un',
    reservado: '45',
    disponivel: '75',
    custoMedio: 'R$ 870',
    valorTotal: 'R$ 104.400',
    status: 'Normal',
  },
  {
    nome: 'Inversor Fronius Symo 10kW',
    fabricante: 'Fronius',
    sku: 'INV-FRO-10K',
    categoria: 'Inversores',
    estoque: '8 un',
    reservado: '6',
    disponivel: '2',
    custoMedio: 'R$ 8.900',
    valorTotal: 'R$ 71.200',
    status: 'Crítico',
  },
  {
    nome: 'Inversor Growatt 5kW',
    fabricante: 'Growatt',
    sku: 'INV-GRO-5K',
    categoria: 'Inversores',
    estoque: '15 un',
    reservado: '8',
    disponivel: '7',
    custoMedio: 'R$ 3.200',
    valorTotal: 'R$ 48.000',
    status: 'Normal',
  },
  {
    nome: 'String Box 2E/2S',
    fabricante: 'Intelbras',
    sku: 'STR-INT-2E2S',
    categoria: 'Proteções',
    estoque: '45 un',
    reservado: '12',
    disponivel: '33',
    custoMedio: 'R$ 420',
    valorTotal: 'R$ 18.900',
    status: 'Normal',
  },
  {
    nome: 'Cabo Solar 6mm² Preto',
    fabricante: 'Nexans',
    sku: 'CAB-6MM-PT',
    categoria: 'Cabos',
    estoque: '850 m',
    reservado: '200',
    disponivel: '650',
    custoMedio: 'R$ 4,80/m',
    valorTotal: 'R$ 4.080',
    status: 'Normal',
  },
  {
    nome: 'Perfil Trilho 3,6m Alumínio',
    fabricante: 'Schletter',
    sku: 'EST-TRI-36',
    categoria: 'Estruturas',
    estoque: '3 un',
    reservado: '3',
    disponivel: '0',
    custoMedio: 'R$ 185',
    valorTotal: 'R$ 555',
    status: 'Esgotado',
  },
];

const CATEGORIES = ['Todos', 'Módulos', 'Inversores', 'Estruturas', 'Cabos', 'Proteções', 'Outros'];

function statusBadge(s: StockStatus) {
  const map = {
    Normal: { color: C.green, bg: 'rgba(38,216,102,0.12)' },
    Crítico: { color: C.red, bg: 'rgba(255,77,87,0.12)' },
    Esgotado: { color: C.orange, bg: 'rgba(255,159,28,0.12)' },
  };
  const st = map[s];
  return (
    <span
      style={{
        padding: '3px 10px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 700,
        color: st.color,
        background: st.bg,
      }}
    >
      {s}
    </span>
  );
}

export default function Estoque() {
  const [catFilter, setCatFilter] = useState('Todos');
  const [search, setSearch] = useState('');

  const filtered = PRODUCTS.filter((p) => {
    const matchCat = catFilter === 'Todos' || p.categoria === catFilter;
    const matchSearch =
      p.nome.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const kpis = [
    { label: 'Total', value: '847 itens', color: C.text },
    { label: 'Disponível', value: '623', color: C.green },
    { label: 'Reservado', value: '156', color: C.blue },
    { label: 'Em trânsito', value: '68', color: C.orange },
    { label: 'Valor total', value: 'R$ 2.847.000', color: C.solar },
  ];

  const actions = [
    '+ Entrada',
    'Transferir',
    'Reservar',
    'Registrar Consumo',
    'Iniciar Inventário',
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
        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Estoque</h1>
        <button
          style={{
            padding: '9px 18px',
            background: C.solar,
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            color: '#090B0A',
            fontSize: 13,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <IconPlus size={15} /> Nova Entrada
        </button>
      </div>

      {/* KPI strip */}
      <div
        style={{
          display: 'flex',
          gap: 0,
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        {kpis.map((k, i) => (
          <div
            key={k.label}
            style={{
              flex: 1,
              padding: '16px 20px',
              borderRight: i < kpis.length - 1 ? `1px solid ${C.border}` : 'none',
            }}
          >
            <div style={{ fontSize: 11, color: C.textSec, marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Search + filters */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <IconSearch
            size={15}
            style={
              {
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: C.textDis,
              } as React.CSSProperties
            }
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produto, SKU, fabricante..."
            style={{
              width: '100%',
              height: 36,
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 7,
              paddingLeft: 32,
              paddingRight: 10,
              color: C.text,
              fontSize: 13,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div
          style={{
            display: 'flex',
            gap: 2,
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: 3,
          }}
        >
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCatFilter(c)}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: catFilter === c ? C.elevated : 'transparent',
                color: catFilter === c ? C.text : C.textSec,
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {actions.map((a, i) => (
          <button
            key={a}
            style={{
              padding: '8px 16px',
              background: i === 0 ? C.elevated : 'transparent',
              border: `1px solid ${C.border}`,
              borderRadius: 7,
              cursor: 'pointer',
              color: C.text,
              fontSize: 13,
              fontWeight: i === 0 ? 600 : 400,
            }}
          >
            {a}
          </button>
        ))}
      </div>

      {/* Table */}
      <div
        style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          overflow: 'auto',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: C.surface }}>
              {[
                'Produto',
                'Fabricante',
                'SKU',
                'Estoque',
                'Reservado',
                'Disponível',
                'Custo médio',
                'Valor total',
                'Status',
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: '12px 14px',
                    textAlign: 'left',
                    color: C.textDis,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
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
                <td style={{ padding: '13px 14px' }}>
                  <div style={{ fontWeight: 600, color: C.text }}>{p.nome}</div>
                </td>
                <td style={{ padding: '13px 14px', color: C.textSec }}>{p.fabricante}</td>
                <td
                  style={{
                    padding: '13px 14px',
                    color: C.textDis,
                    fontFamily: 'monospace',
                    fontSize: 11,
                  }}
                >
                  {p.sku}
                </td>
                <td style={{ padding: '13px 14px', color: C.text, fontWeight: 600 }}>
                  {p.estoque}
                </td>
                <td style={{ padding: '13px 14px', color: C.blue }}>{p.reservado}</td>
                <td
                  style={{
                    padding: '13px 14px',
                    color: p.disponivel === '0' ? C.red : C.green,
                    fontWeight: 700,
                  }}
                >
                  {p.disponivel}
                </td>
                <td style={{ padding: '13px 14px', color: C.textSec }}>{p.custoMedio}</td>
                <td style={{ padding: '13px 14px', color: C.solar, fontWeight: 700 }}>
                  {p.valorTotal}
                </td>
                <td style={{ padding: '13px 14px' }}>{statusBadge(p.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
