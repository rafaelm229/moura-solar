import React, { useState } from 'react';
import {
  IconPlus,
  IconEye,
  IconEdit,
  IconDownload,
  IconMoreVertical,
  IconX,
  IconCheck,
} from '../components/Icons';

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

type PStatus =
  'Aceita' | 'Em negociação' | 'Enviada' | 'Vencida' | 'Rascunho' | 'Pronta' | 'Recusada';

interface Proposta {
  num: string;
  cliente: string;
  valor: string;
  validade: string;
  status: PStatus;
  responsavel: string;
  ultimaAcao: string;
  urgente?: string;
}

const PROPOSTAS: Proposta[] = [
  {
    num: '#2851',
    cliente: 'Maria Santos — Res. Parque das Flores',
    valor: 'R$ 87.400',
    validade: '07/10/2026',
    status: 'Aceita',
    responsavel: 'Ana Lima',
    ultimaAcao: '28/09',
  },
  {
    num: '#2850',
    cliente: 'Farmácia Saúde & Vida',
    valor: 'R$ 145.000',
    validade: '08/10/2026',
    status: 'Em negociação',
    responsavel: 'Pedro Costa',
    ultimaAcao: '27/09',
  },
  {
    num: '#2849',
    cliente: 'Condomínio Verde Park',
    valor: 'R$ 380.000',
    validade: '05/10/2026',
    status: 'Enviada',
    responsavel: 'Juliana Melo',
    ultimaAcao: '24/09',
    urgente: 'Vence em 5 dias',
  },
  {
    num: '#2848',
    cliente: 'Industrial Norte Ltda.',
    valor: 'R$ 187.000',
    validade: '30/09/2026',
    status: 'Vencida',
    responsavel: 'Ana Lima',
    ultimaAcao: '20/09',
  },
  {
    num: '#2847',
    cliente: 'João Paulo Silva',
    valor: 'R$ 28.000',
    validade: '10/10/2026',
    status: 'Rascunho',
    responsavel: 'Pedro Costa',
    ultimaAcao: '29/09',
  },
  {
    num: '#2846',
    cliente: 'Supermercado Bom Preço',
    valor: 'R$ 290.000',
    validade: '15/10/2026',
    status: 'Em negociação',
    responsavel: 'Rafael Dias',
    ultimaAcao: '18/09',
  },
];

const STATUS_TABS = [
  'Todas',
  'Rascunho',
  'Pronta',
  'Enviada',
  'Em negociação',
  'Aceita',
  'Recusada',
  'Vencida',
];

function statusStyle(s: PStatus): { color: string; bg: string } {
  return {
    Aceita: { color: C.green, bg: 'rgba(38,216,102,0.12)' },
    'Em negociação': { color: C.blue, bg: 'rgba(59,130,246,0.12)' },
    Enviada: { color: C.orange, bg: 'rgba(255,159,28,0.12)' },
    Vencida: { color: C.red, bg: 'rgba(255,77,87,0.12)' },
    Rascunho: { color: C.textSec, bg: 'rgba(155,164,158,0.12)' },
    Pronta: { color: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
    Recusada: { color: C.red, bg: 'rgba(255,77,87,0.12)' },
  }[s];
}

function DetailPanel({ proposta, onClose }: { proposta: Proposta; onClose: () => void }) {
  const ss = statusStyle(proposta.status);
  const equipment = [
    { desc: '12× Módulo JA Solar 550W', value: 'R$ 42.240' },
    { desc: '2× Inversor Fronius Symo 10kW', value: 'R$ 17.800' },
    { desc: 'Estrutura de fixação (36m²)', value: 'R$ 8.640' },
    { desc: 'Cabeamento e proteções', value: 'R$ 3.320' },
  ];
  const timeline = [
    { date: '29/09/2026', event: 'Proposta criada', actor: 'Ana Lima' },
    { date: '29/09/2026', event: 'PDF gerado', actor: 'Sistema' },
    { date: '28/09/2026', event: 'Enviada ao cliente por e-mail', actor: 'Ana Lima' },
    { date: '28/09/2026', event: 'Aceite registrado', actor: 'Ana Lima' },
  ];

  return (
    <div
      style={{
        width: 460,
        flexShrink: 0,
        background: C.surface,
        borderLeft: `1px solid ${C.border}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '20px 24px',
          borderBottom: `1px solid ${C.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <div style={{ fontSize: 13, color: C.textDis, marginBottom: 4 }}>
            Proposta {proposta.num}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8 }}>
            {proposta.cliente}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: C.solar }}>{proposta.valor}</span>
            <span
              style={{
                padding: '3px 10px',
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 700,
                color: ss.color,
                background: ss.bg,
              }}
            >
              {proposta.status}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textSec }}
        >
          <IconX size={20} />
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        {/* Equipment */}
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: C.textDis,
              letterSpacing: 1,
              marginBottom: 12,
            }}
          >
            EQUIPAMENTOS
          </div>
          {equipment.map((e, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 0',
                borderBottom: i < equipment.length - 1 ? `1px solid ${C.border}` : 'none',
                fontSize: 13,
              }}
            >
              <span style={{ color: C.text }}>{e.desc}</span>
              <span style={{ color: C.textSec }}>{e.value}</span>
            </div>
          ))}
        </div>

        {/* Financial summary */}
        <div style={{ background: C.elevated, borderRadius: 10, padding: 16 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: C.textDis,
              letterSpacing: 1,
              marginBottom: 12,
            }}
          >
            RESUMO FINANCEIRO
          </div>
          {[
            { label: 'Equipamentos', value: 'R$ 72.000' },
            { label: 'Serviços', value: 'R$ 8.400' },
            { label: 'Impostos', value: 'R$ 7.000' },
          ].map((r) => (
            <div
              key={r.label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 8,
                fontSize: 13,
              }}
            >
              <span style={{ color: C.textSec }}>{r.label}</span>
              <span style={{ color: C.text }}>{r.value}</span>
            </div>
          ))}
          <div
            style={{
              borderTop: `1px solid ${C.border}`,
              paddingTop: 10,
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ color: C.text, fontWeight: 700 }}>Total</span>
            <span style={{ color: C.solar, fontWeight: 800, fontSize: 16 }}>{proposta.valor}</span>
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: C.textSec }}>
            Margem: <span style={{ color: C.green, fontWeight: 600 }}>8,6%</span>
          </div>
        </div>

        {/* Timeline */}
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: C.textDis,
              letterSpacing: 1,
              marginBottom: 12,
            }}
          >
            HISTÓRICO
          </div>
          {timeline.map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: C.solar,
                    marginTop: 4,
                  }}
                />
                {i < timeline.length - 1 && (
                  <div style={{ width: 1, flex: 1, background: C.border, marginTop: 4 }} />
                )}
              </div>
              <div style={{ paddingBottom: 12 }}>
                <div style={{ fontSize: 13, color: C.text }}>{t.event}</div>
                <div style={{ fontSize: 11, color: C.textDis, marginTop: 2 }}>
                  {t.date} · {t.actor}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div
        style={{
          padding: '16px 24px',
          borderTop: `1px solid ${C.border}`,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
        }}
      >
        {['Pré-visualizar', 'Gerar PDF', 'Enviar', 'Registrar Aceite', 'Criar Contrato'].map(
          (a, i) => (
            <button
              key={a}
              style={{
                padding: '8px 12px',
                background: i === 0 ? C.solar : C.elevated,
                border: `1px solid ${i === 0 ? C.solar : C.border}`,
                borderRadius: 7,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: i === 0 ? 700 : 400,
                color: i === 0 ? '#090B0A' : C.text,
              }}
            >
              {a}
            </button>
          ),
        )}
      </div>
    </div>
  );
}

export default function Propostas() {
  const [activeTab, setActiveTab] = useState('Todas');
  const [selected, setSelected] = useState<Proposta | null>(null);

  const filtered =
    activeTab === 'Todas' ? PROPOSTAS : PROPOSTAS.filter((p) => p.status === activeTab);

  const stats = [
    { label: 'Rascunho', value: 8, color: C.textSec },
    { label: 'Enviadas', value: 14, color: C.orange },
    { label: 'Em Negociação', value: 6, color: C.blue },
    { label: 'Aceitas', value: 5, color: C.green },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: '0 0 10px' }}>
            Propostas
          </h1>
          <div style={{ display: 'flex', gap: 20 }}>
            {stats.map((s) => (
              <div key={s.label} style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</span>
                <span style={{ fontSize: 12, color: C.textSec }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
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
          <IconPlus size={15} /> Nova Proposta
        </button>
      </div>

      {/* Tabs */}
      <div
        style={{ display: 'flex', gap: 2, borderBottom: `1px solid ${C.border}`, flexWrap: 'wrap' }}
      >
        {STATUS_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            style={{
              padding: '9px 16px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              color: activeTab === t ? C.solar : C.textSec,
              borderBottom: `2px solid ${activeTab === t ? C.solar : 'transparent'}`,
              marginBottom: -1,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Table + detail */}
      <div style={{ display: 'flex', gap: 0 }}>
        <div
          style={{
            flex: 1,
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: selected ? '10px 0 0 10px' : 10,
            overflow: 'auto',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.surface }}>
                {[
                  '#',
                  'Cliente',
                  'Valor',
                  'Validade',
                  'Status',
                  'Responsável',
                  'Última ação',
                  '',
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
              {filtered.map((p) => {
                const ss = statusStyle(p.status);
                return (
                  <tr
                    key={p.num}
                    onClick={() => setSelected(selected?.num === p.num ? null : p)}
                    style={{
                      borderTop: `1px solid ${C.border}`,
                      cursor: 'pointer',
                      background: selected?.num === p.num ? C.elevated : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (selected?.num !== p.num)
                        (e.currentTarget as HTMLTableRowElement).style.background = '#181E19';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.background =
                        selected?.num === p.num ? C.elevated : 'transparent';
                    }}
                  >
                    <td style={{ padding: '13px 14px', color: C.textSec, fontFamily: 'monospace' }}>
                      {p.num}
                    </td>
                    <td
                      style={{
                        padding: '13px 14px',
                        color: C.text,
                        fontWeight: 500,
                        maxWidth: 220,
                      }}
                    >
                      {p.cliente}
                    </td>
                    <td
                      style={{
                        padding: '13px 14px',
                        color: C.solar,
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {p.valor}
                    </td>
                    <td style={{ padding: '13px 14px', color: C.textSec, whiteSpace: 'nowrap' }}>
                      {p.validade}
                    </td>
                    <td style={{ padding: '13px 14px' }}>
                      <div
                        style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}
                      >
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 700,
                            color: ss.color,
                            background: ss.bg,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {p.status}
                        </span>
                        {p.urgente && (
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 20,
                              fontSize: 10,
                              fontWeight: 700,
                              color: C.red,
                              background: 'rgba(255,77,87,0.12)',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {p.urgente}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '13px 14px', color: C.textSec }}>{p.responsavel}</td>
                    <td style={{ padding: '13px 14px', color: C.textSec }}>{p.ultimaAcao}</td>
                    <td style={{ padding: '13px 8px' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 2 }}>
                        {[IconEye, IconEdit, IconDownload].map((Ic, i) => (
                          <button
                            key={i}
                            style={{
                              width: 28,
                              height: 28,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: C.textSec,
                              borderRadius: 6,
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLButtonElement).style.background = C.elevated;
                              (e.currentTarget as HTMLButtonElement).style.color = C.text;
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLButtonElement).style.background = 'none';
                              (e.currentTarget as HTMLButtonElement).style.color = C.textSec;
                            }}
                          >
                            <Ic size={15} />
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {selected && <DetailPanel proposta={selected} onClose={() => setSelected(null)} />}
      </div>
    </div>
  );
}
