import { useState } from 'react';
import {
  IconTarget,
  IconPlus,
  IconFilter,
  IconX,
  IconChevronRight,
  IconChevronDown,
  IconChevronLeft,
  IconGrid,
  IconList,
  IconBarChart2,
  IconUser,
  IconPhone,
  IconMail,
  IconAlertTriangle,
  IconClock,
  IconCalendar,
  IconMoreVertical,
  IconArrowUp,
  IconCheck,
  IconFileText,
  IconRefresh,
  IconMessageSquare,
} from '../components/Icons';

// ─── colour tokens ────────────────────────────────────────────────────────────
const C = {
  bgBase: '#090B0A',
  surface: '#111412',
  card: '#161A17',
  elevated: '#1C211D',
  border: '#29302B',
  solar: '#FFD400',
  solarHover: '#E6BE00',
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

// ─── types ────────────────────────────────────────────────────────────────────
type Temperature = 'Quente' | 'Morno' | 'Frio';
type Stage =
  | 'Entrada'
  | 'Qualificação'
  | 'Levantamento'
  | 'Proposta'
  | 'Negociação'
  | 'Aprovado'
  | 'Contrato'
  | 'Perdido';

interface Opportunity {
  id: string;
  client: string;
  email?: string;
  phone?: string;
  consumption?: string;
  value: number;
  responsible: string;
  respInitials: string;
  origin?: string;
  temperature: Temperature;
  nextActivity?: string;
  stage: Stage;
  daysInStage?: number;
  notes?: string;
  alert?: string;
  badge?: string;
}

// ─── data ─────────────────────────────────────────────────────────────────────
const STAGES: Stage[] = [
  'Entrada',
  'Qualificação',
  'Levantamento',
  'Proposta',
  'Negociação',
  'Aprovado',
  'Contrato',
  'Perdido',
];

const INITIAL_OPPS: Opportunity[] = [
  // Entrada
  {
    id: 'op1',
    client: 'Residência – Dr. Marcos Viana',
    email: 'marcos@email.com',
    phone: '(11) 99234-5678',
    consumption: '450 kWh/mês',
    value: 28000,
    responsible: 'Ana Lima',
    respInitials: 'AL',
    origin: 'Indicação',
    temperature: 'Quente',
    nextActivity: 'Ligação amanhã',
    stage: 'Entrada',
  },
  {
    id: 'op2',
    client: 'Comércio – Padaria Central',
    email: 'contato@padariacentral.com.br',
    value: 45000,
    responsible: 'Pedro Costa',
    respInitials: 'PC',
    origin: 'Site',
    temperature: 'Morno',
    stage: 'Entrada',
  },
  {
    id: 'op3',
    client: 'Residência – Família Rocha',
    consumption: '320 kWh/mês',
    value: 22000,
    responsible: 'Juliana Melo',
    respInitials: 'JM',
    origin: 'Instagram',
    temperature: 'Frio',
    stage: 'Entrada',
  },
  // Qualificação
  {
    id: 'op4',
    client: 'Clínica Saúde Total',
    email: 'admin@saudetotal.com',
    phone: '(11) 3298-4400',
    consumption: '1.200 kWh/mês',
    value: 95000,
    responsible: 'Ana Lima',
    respInitials: 'AL',
    origin: 'Indicação',
    temperature: 'Quente',
    nextActivity: 'Visita técnica 03/10',
    stage: 'Qualificação',
  },
  {
    id: 'op5',
    client: 'Supermercado BomPreço',
    value: 280000,
    responsible: 'Rafael Dias',
    respInitials: 'RD',
    origin: 'Indicação',
    temperature: 'Morno',
    stage: 'Qualificação',
  },
  // Levantamento
  {
    id: 'op6',
    client: 'Hotel Beira-Mar',
    email: 'engenharia@beiramar.com',
    phone: '(48) 3254-1100',
    consumption: '8.500 kWh/mês',
    value: 620000,
    responsible: 'Pedro Costa',
    respInitials: 'PC',
    temperature: 'Quente',
    nextActivity: 'Enviar laudo até 05/10',
    stage: 'Levantamento',
  },
  {
    id: 'op7',
    client: 'Escola Estadual João Pessoa',
    value: 130000,
    responsible: 'Juliana Melo',
    respInitials: 'JM',
    temperature: 'Morno',
    stage: 'Levantamento',
  },
  // Proposta
  {
    id: 'op8',
    client: 'Industrial Norte Ltda.',
    email: 'compras@industrialnorte.com.br',
    value: 187000,
    responsible: 'Ana Lima',
    respInitials: 'AL',
    temperature: 'Quente',
    daysInStage: 3,
    badge: 'Aguardando retorno',
    nextActivity: 'Vence em 7 dias',
    stage: 'Proposta',
  },
  {
    id: 'op9',
    client: 'Condomínio Solar Ville',
    value: 380000,
    responsible: 'Pedro Costa',
    respInitials: 'PC',
    temperature: 'Morno',
    daysInStage: 8,
    stage: 'Proposta',
  },
  // Negociação
  {
    id: 'op10',
    client: 'Fazenda São Bento',
    email: 'gerencia@fazendasaobento.com.br',
    phone: '(64) 9 9812-3344',
    value: 320000,
    responsible: 'Ana Lima',
    respInitials: 'AL',
    temperature: 'Quente',
    daysInStage: 8,
    alert: 'Atraso',
    stage: 'Negociação',
  },
  {
    id: 'op11',
    client: 'Indústria Têxtil Nordeste',
    value: 215000,
    responsible: 'Rafael Dias',
    respInitials: 'RD',
    temperature: 'Morno',
    stage: 'Negociação',
  },
  // Aprovado
  {
    id: 'op12',
    client: 'Shopping Vitória Park',
    value: 940000,
    responsible: 'Ana Lima',
    respInitials: 'AL',
    temperature: 'Quente',
    nextActivity: 'Assinar contrato até 10/10',
    stage: 'Aprovado',
  },
  // Contrato
  {
    id: 'op13',
    client: 'Distribuidora Alimentos SA',
    value: 480000,
    responsible: 'Pedro Costa',
    respInitials: 'PC',
    temperature: 'Quente',
    daysInStage: 2,
    badge: 'Contrato assinado',
    stage: 'Contrato',
  },
  // Perdido
  {
    id: 'op14',
    client: 'Loja Eletro Plus',
    value: 35000,
    responsible: 'Rafael Dias',
    respInitials: 'RD',
    temperature: 'Frio',
    stage: 'Perdido',
  },
];

// ─── helpers ──────────────────────────────────────────────────────────────────
const fmtCurrency = (v: number) => {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace('.', ',')}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v.toLocaleString('pt-BR')}`;
};

const tempColor = (t: Temperature) => (t === 'Quente' ? C.red : t === 'Morno' ? C.orange : C.blue);
const tempEmoji = (t: Temperature) => (t === 'Quente' ? '🔥' : t === 'Morno' ? '🌤' : '❄️');

function Avatar({ initials, size = 28 }: { initials: string; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: C.solarMuted,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.38,
        fontWeight: 700,
        color: C.solar,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

// ─── opportunity card ─────────────────────────────────────────────────────────
function OppCard({ opp, onSelect }: { opp: Opportunity; onSelect: (o: Opportunity) => void }) {
  return (
    <div
      onClick={() => onSelect(opp)}
      style={{
        backgroundColor: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: 14,
        cursor: 'pointer',
        transition: 'border-color 0.15s, transform 0.1s',
      }}
      className="hover:border-[#FFD40060] hover:translate-y-[-1px] space-y-3 group"
    >
      {/* name + value */}
      <div className="flex items-start justify-between gap-2">
        <h4 style={{ fontSize: 13, fontWeight: 600, color: C.text, lineHeight: 1.3, flex: 1 }}>
          {opp.client}
        </h4>
        <IconMoreVertical
          size={14}
          style={{ color: C.textDisabled, flexShrink: 0, marginTop: 2 } as React.CSSProperties}
        />
      </div>

      {/* value */}
      <div
        style={{
          fontSize: 17,
          fontWeight: 700,
          color: C.solar,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {fmtCurrency(opp.value)}
      </div>

      {/* details */}
      <div className="space-y-1">
        {opp.consumption && (
          <div style={{ fontSize: 11, color: C.textSecondary }}>{opp.consumption}</div>
        )}
        {opp.daysInStage !== undefined && (
          <div style={{ fontSize: 11, color: C.textSecondary }}>
            Nesta etapa há {opp.daysInStage} {opp.daysInStage === 1 ? 'dia' : 'dias'}
          </div>
        )}
        {opp.nextActivity && (
          <div
            className="flex items-center gap-1"
            style={{
              fontSize: 11,
              color: opp.nextActivity.toLowerCase().includes('vence') ? C.orange : C.textSecondary,
            }}
          >
            <IconClock size={10} />
            {opp.nextActivity}
          </div>
        )}
      </div>

      {/* tags row */}
      <div className="flex flex-wrap gap-1.5 items-center">
        {/* temperature */}
        <span
          style={{
            fontSize: 11,
            padding: '2px 7px',
            borderRadius: 20,
            backgroundColor: `${tempColor(opp.temperature)}22`,
            color: tempColor(opp.temperature),
            fontWeight: 500,
          }}
        >
          {tempEmoji(opp.temperature)} {opp.temperature}
        </span>
        {opp.origin && (
          <span
            style={{
              fontSize: 11,
              padding: '2px 7px',
              borderRadius: 20,
              backgroundColor: C.elevated,
              color: C.textSecondary,
            }}
          >
            {opp.origin}
          </span>
        )}
        {opp.badge && (
          <span
            style={{
              fontSize: 11,
              padding: '2px 7px',
              borderRadius: 20,
              backgroundColor: '#112240',
              color: C.blue,
            }}
          >
            {opp.badge}
          </span>
        )}
        {opp.alert && (
          <span
            style={{
              fontSize: 11,
              padding: '2px 7px',
              borderRadius: 20,
              backgroundColor: '#3A1214',
              color: C.red,
              fontWeight: 600,
            }}
            className="flex items-center gap-1"
          >
            <IconAlertTriangle size={10} />
            {opp.alert}
          </span>
        )}
      </div>

      {/* responsible */}
      <div className="flex items-center gap-2 pt-1" style={{ borderTop: `1px solid ${C.border}` }}>
        <Avatar initials={opp.respInitials} size={22} />
        <span style={{ fontSize: 11, color: C.textSecondary }}>{opp.responsible}</span>
      </div>
    </div>
  );
}

// ─── kanban column ────────────────────────────────────────────────────────────
function KanbanColumn({
  stage,
  opps,
  onSelect,
}: {
  stage: Stage;
  opps: Opportunity[];
  onSelect: (o: Opportunity) => void;
}) {
  const total = opps.reduce((s, o) => s + o.value, 0);
  const stageColor =
    stage === 'Perdido'
      ? C.red
      : stage === 'Contrato'
        ? C.green
        : stage === 'Aprovado'
          ? C.solar
          : C.blue;

  return (
    <div
      style={{
        minWidth: 270,
        maxWidth: 280,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
      }}
    >
      {/* column header */}
      <div
        style={{
          backgroundColor: C.surface,
          border: `1px solid ${C.border}`,
          borderBottom: 'none',
          borderRadius: '12px 12px 0 0',
          padding: '12px 14px',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: stageColor }}
            />
            <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{stage}</span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: stageColor,
                backgroundColor: `${stageColor}22`,
                borderRadius: 20,
                padding: '1px 7px',
              }}
            >
              {opps.length}
            </span>
          </div>
          <span
            style={{ fontSize: 11, color: C.textSecondary, fontVariantNumeric: 'tabular-nums' }}
          >
            {fmtCurrency(total)}
          </span>
        </div>
      </div>

      {/* cards list */}
      <div
        style={{
          backgroundColor: `${C.surface}88`,
          border: `1px solid ${C.border}`,
          flex: 1,
          padding: '10px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          minHeight: 200,
          borderRadius: opps.length === 0 ? '0 0 12px 12px' : '0',
        }}
      >
        {opps.map((o) => (
          <OppCard key={o.id} opp={o} onSelect={onSelect} />
        ))}
        {opps.length === 0 && (
          <div
            style={{ textAlign: 'center', color: C.textDisabled, fontSize: 13, padding: '24px 0' }}
          >
            Nenhuma oportunidade
          </div>
        )}
      </div>

      {/* add button */}
      <button
        style={{
          backgroundColor: C.surface,
          border: `1px solid ${C.border}`,
          borderTop: 'none',
          borderRadius: '0 0 12px 12px',
          padding: '8px',
          width: '100%',
          color: C.textSecondary,
          fontSize: 12,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          transition: 'color 0.15s',
        }}
        className="hover:text-[#FFD400]"
      >
        <IconPlus size={13} /> Adicionar
      </button>
    </div>
  );
}

// ─── right drawer ─────────────────────────────────────────────────────────────
function Drawer({
  opp,
  onClose,
  onAdvance,
}: {
  opp: Opportunity;
  onClose: () => void;
  onAdvance: () => void;
}) {
  const stageIdx = STAGES.indexOf(opp.stage);
  const nextStage = stageIdx < STAGES.length - 2 ? STAGES[stageIdx + 1] : null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }} onClick={onClose}>
      {/* backdrop */}
      <div style={{ flex: 1, backgroundColor: 'rgba(9,11,10,0.6)', backdropFilter: 'blur(2px)' }} />

      {/* panel */}
      <div
        style={{
          width: 340,
          backgroundColor: C.surface,
          borderLeft: `1px solid ${C.border}`,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
          <div className="flex items-start justify-between gap-2">
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 11, color: C.textSecondary, marginBottom: 4 }}>Oportunidade</p>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, lineHeight: 1.3 }}>
                {opp.client}
              </h3>
            </div>
            <button
              onClick={onClose}
              style={{
                color: C.textSecondary,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                marginTop: 2,
              }}
            >
              <IconX size={18} />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <span
              style={{
                fontSize: 11,
                padding: '3px 9px',
                borderRadius: 20,
                backgroundColor: C.elevated,
                color: C.textSecondary,
              }}
            >
              {opp.stage}
            </span>
            <span
              style={{
                fontSize: 11,
                padding: '3px 9px',
                borderRadius: 20,
                backgroundColor: `${tempColor(opp.temperature)}22`,
                color: tempColor(opp.temperature),
              }}
            >
              {tempEmoji(opp.temperature)} {opp.temperature}
            </span>
          </div>
        </div>

        {/* value */}
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
          <p style={{ fontSize: 11, color: C.textSecondary, marginBottom: 2 }}>Valor estimado</p>
          <p
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: C.solar,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {fmtCurrency(opp.value)}
          </p>
          {opp.consumption && (
            <p style={{ fontSize: 12, color: C.textSecondary, marginTop: 4 }}>
              Consumo: {opp.consumption}
            </p>
          )}
        </div>

        {/* quick actions */}
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
          <p
            style={{
              fontSize: 11,
              color: C.textSecondary,
              marginBottom: 10,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Ações rápidas
          </p>
          <div className="grid grid-cols-2 gap-2">
            {nextStage && (
              <button
                onClick={onAdvance}
                style={{
                  backgroundColor: C.solar,
                  color: '#090B0A',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  gridColumn: '1 / -1',
                }}
              >
                <IconArrowUp size={13} /> Avançar para {nextStage}
              </button>
            )}
            {[
              { label: 'Registrar Atividade', icon: IconCheck },
              { label: 'Criar Proposta', icon: IconFileText },
              { label: 'Transferir', icon: IconRefresh },
              { label: 'Mensagem', icon: IconMessageSquare },
            ].map(({ label, icon: Icon }) => (
              <button
                key={label}
                style={{
                  backgroundColor: C.elevated,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding: '8px 10px',
                  fontSize: 12,
                  color: C.text,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <Icon size={13} style={{ color: C.textSecondary } as React.CSSProperties} /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* contact info */}
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
          <p
            style={{
              fontSize: 11,
              color: C.textSecondary,
              marginBottom: 10,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Contato
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Avatar initials={opp.respInitials} size={32} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{opp.responsible}</p>
                <p style={{ fontSize: 11, color: C.textSecondary }}>Responsável</p>
              </div>
            </div>
            {opp.email && (
              <div
                className="flex items-center gap-2"
                style={{ color: C.textSecondary, fontSize: 13 }}
              >
                <IconMail size={14} /> {opp.email}
              </div>
            )}
            {opp.phone && (
              <div
                className="flex items-center gap-2"
                style={{ color: C.textSecondary, fontSize: 13 }}
              >
                <IconPhone size={14} /> {opp.phone}
              </div>
            )}
          </div>
        </div>

        {/* activity history */}
        <div style={{ padding: '16px 20px', flex: 1 }}>
          <p
            style={{
              fontSize: 11,
              color: C.textSecondary,
              marginBottom: 12,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Histórico
          </p>
          <div className="space-y-4">
            {[
              { label: 'Oportunidade criada', time: 'há 12 dias', color: C.blue },
              {
                label: 'Ligação realizada – sem resposta',
                time: 'há 8 dias',
                color: C.textSecondary,
              },
              { label: 'E-mail enviado com apresentação', time: 'há 5 dias', color: C.blue },
              {
                label: `Proposta enviada (${fmtCurrency(opp.value)})`,
                time: 'há 3 dias',
                color: C.solar,
              },
            ].map((h, i, arr) => (
              <div key={h.label} className="flex gap-3">
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
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: h.color,
                      marginTop: 3,
                    }}
                  />
                  {i < arr.length - 1 && (
                    <div
                      style={{ width: 1, height: 28, backgroundColor: C.border, marginTop: 4 }}
                    />
                  )}
                </div>
                <div>
                  <p style={{ fontSize: 12, color: C.text }}>{h.label}</p>
                  <p style={{ fontSize: 11, color: C.textSecondary }}>{h.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── filter panel ─────────────────────────────────────────────────────────────
function FilterPanel({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{
        backgroundColor: C.elevated,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: 20,
        marginBottom: 8,
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 style={{ fontSize: 14, fontWeight: 600 }}>Filtros</h3>
        <button
          onClick={onClose}
          style={{
            color: C.textSecondary,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
          }}
        >
          <IconX size={16} />
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Responsável */}
        <div>
          <label
            style={{
              fontSize: 11,
              color: C.textSecondary,
              display: 'block',
              marginBottom: 6,
              fontWeight: 500,
            }}
          >
            Responsável
          </label>
          <select
            style={{
              width: '100%',
              backgroundColor: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: '7px 10px',
              color: C.text,
              fontSize: 12,
              outline: 'none',
            }}
          >
            <option value="">Todos</option>
            <option>Ana Lima</option>
            <option>Pedro Costa</option>
            <option>Juliana Melo</option>
            <option>Rafael Dias</option>
          </select>
        </div>

        {/* Origem */}
        <div>
          <label
            style={{
              fontSize: 11,
              color: C.textSecondary,
              display: 'block',
              marginBottom: 6,
              fontWeight: 500,
            }}
          >
            Origem
          </label>
          <select
            style={{
              width: '100%',
              backgroundColor: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: '7px 10px',
              color: C.text,
              fontSize: 12,
              outline: 'none',
            }}
          >
            <option value="">Todas</option>
            <option>Indicação</option>
            <option>Site</option>
            <option>Instagram</option>
            <option>Google Ads</option>
          </select>
        </div>

        {/* Temperatura */}
        <div>
          <label
            style={{
              fontSize: 11,
              color: C.textSecondary,
              display: 'block',
              marginBottom: 6,
              fontWeight: 500,
            }}
          >
            Temperatura
          </label>
          <select
            style={{
              width: '100%',
              backgroundColor: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: '7px 10px',
              color: C.text,
              fontSize: 12,
              outline: 'none',
            }}
          >
            <option value="">Todas</option>
            <option>Quente</option>
            <option>Morno</option>
            <option>Frio</option>
          </select>
        </div>

        {/* Valor */}
        <div>
          <label
            style={{
              fontSize: 11,
              color: C.textSecondary,
              display: 'block',
              marginBottom: 6,
              fontWeight: 500,
            }}
          >
            Valor mín.
          </label>
          <input
            type="number"
            placeholder="R$ 0"
            style={{
              width: '100%',
              backgroundColor: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: '7px 10px',
              color: C.text,
              fontSize: 12,
              outline: 'none',
            }}
          />
        </div>
        <div>
          <label
            style={{
              fontSize: 11,
              color: C.textSecondary,
              display: 'block',
              marginBottom: 6,
              fontWeight: 500,
            }}
          >
            Valor máx.
          </label>
          <input
            type="number"
            placeholder="Ilimitado"
            style={{
              width: '100%',
              backgroundColor: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: '7px 10px',
              color: C.text,
              fontSize: 12,
              outline: 'none',
            }}
          />
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button
          style={{
            backgroundColor: C.solar,
            color: '#090B0A',
            border: 'none',
            borderRadius: 8,
            padding: '8px 20px',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Aplicar filtros
        </button>
        <button
          onClick={onClose}
          style={{
            backgroundColor: 'transparent',
            color: C.textSecondary,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: '8px 16px',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Limpar
        </button>
      </div>
    </div>
  );
}

// ─── list view ────────────────────────────────────────────────────────────────
function ListView({ opps, onSelect }: { opps: Opportunity[]; onSelect: (o: Opportunity) => void }) {
  return (
    <div
      style={{
        backgroundColor: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        overflow: 'hidden',
      }}
    >
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: C.elevated }}>
              {['Cliente', 'Etapa', 'Valor', 'Temp.', 'Responsável', 'Próx. atividade', ''].map(
                (h) => (
                  <th
                    key={h}
                    style={{
                      padding: '10px 16px',
                      textAlign: 'left',
                      fontSize: 11,
                      color: C.textSecondary,
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {opps.map((o) => (
              <tr
                key={o.id}
                onClick={() => onSelect(o)}
                style={{ borderTop: `1px solid ${C.border}`, cursor: 'pointer' }}
                className="hover:bg-[#1C211D] transition-colors"
              >
                <td
                  style={{
                    padding: '12px 16px',
                    fontSize: 13,
                    fontWeight: 500,
                    color: C.text,
                    maxWidth: 220,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {o.client}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span
                    style={{
                      fontSize: 11,
                      padding: '2px 8px',
                      borderRadius: 20,
                      backgroundColor: C.elevated,
                      color: C.textSecondary,
                    }}
                  >
                    {o.stage}
                  </span>
                </td>
                <td
                  style={{
                    padding: '12px 16px',
                    fontSize: 13,
                    fontWeight: 700,
                    color: C.solar,
                    fontVariantNumeric: 'tabular-nums',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {fmtCurrency(o.value)}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ fontSize: 12, color: tempColor(o.temperature) }}>
                    {tempEmoji(o.temperature)} {o.temperature}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div className="flex items-center gap-2">
                    <Avatar initials={o.respInitials} size={22} />
                    <span style={{ fontSize: 12, color: C.textSecondary, whiteSpace: 'nowrap' }}>
                      {o.responsible}
                    </span>
                  </div>
                </td>
                <td style={{ padding: '12px 16px', fontSize: 12, color: C.textSecondary }}>
                  {o.nextActivity ?? '—'}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <IconChevronRight
                    size={14}
                    style={{ color: C.textDisabled } as React.CSSProperties}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── metrics view ─────────────────────────────────────────────────────────────
function MetricsView({ opps }: { opps: Opportunity[] }) {
  const byStage = STAGES.map((s) => ({
    stage: s,
    count: opps.filter((o) => o.stage === s).length,
    value: opps.filter((o) => o.stage === s).reduce((sum, o) => sum + o.value, 0),
  }));
  const maxCount = Math.max(...byStage.map((s) => s.count), 1);

  return (
    <div
      style={{
        backgroundColor: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: 24,
      }}
    >
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Distribuição por Etapa</h3>
      <div className="space-y-4">
        {byStage.map((s, i) => {
          const pct = (s.count / maxCount) * 100;
          const frac = i / (byStage.length - 1);
          const r = Math.round(255 * (1 - frac) + 38 * frac);
          const g = Math.round(212 * (1 - frac) + 216 * frac);
          const b = Math.round(0 * (1 - frac) + 102 * frac);
          const col = `rgb(${r},${g},${b})`;
          return (
            <div key={s.stage} className="flex items-center gap-4">
              <span
                style={{
                  width: 110,
                  textAlign: 'right',
                  fontSize: 12,
                  color: C.textSecondary,
                  flexShrink: 0,
                }}
              >
                {s.stage}
              </span>
              <div
                style={{
                  flex: 1,
                  height: 10,
                  backgroundColor: C.elevated,
                  borderRadius: 5,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    backgroundColor: col,
                    borderRadius: 5,
                  }}
                />
              </div>
              <span
                style={{
                  width: 24,
                  fontSize: 13,
                  fontWeight: 700,
                  color: C.text,
                  textAlign: 'right',
                  flexShrink: 0,
                }}
              >
                {s.count}
              </span>
              <span
                style={{
                  width: 80,
                  fontSize: 12,
                  color: C.solar,
                  fontVariantNumeric: 'tabular-nums',
                  textAlign: 'right',
                  flexShrink: 0,
                }}
              >
                {fmtCurrency(s.value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────
type ViewMode = 'kanban' | 'lista' | 'metricas';

export default function Funil() {
  const [view, setView] = useState<ViewMode>('kanban');
  const [selected, setSelected] = useState<Opportunity | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [opps, setOpps] = useState<Opportunity[]>(INITIAL_OPPS);

  const totalValue = opps.reduce((s, o) => s + o.value, 0);
  const activeOpps = opps.filter((o) => o.stage !== 'Perdido');

  const handleAdvance = () => {
    if (!selected) return;
    const idx = STAGES.indexOf(selected.stage);
    if (idx < STAGES.length - 2) {
      const newStage = STAGES[idx + 1];
      setOpps((prev) =>
        prev.map((o) => (o.id === selected.id ? { ...o, stage: newStage, daysInStage: 0 } : o)),
      );
      setSelected((prev) => (prev ? { ...prev, stage: newStage } : null));
    }
  };

  const viewButtons: {
    key: ViewMode;
    label: string;
    Icon: React.ComponentType<{ size?: number; className?: string }>;
  }[] = [
    { key: 'kanban', label: 'Kanban', Icon: IconGrid },
    { key: 'lista', label: 'Lista', Icon: IconList },
    { key: 'metricas', label: 'Métricas', Icon: IconBarChart2 },
  ];

  return (
    <div
      style={{
        backgroundColor: C.bgBase,
        minHeight: '100vh',
        color: C.text,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── header ── */}
      <div
        style={{
          padding: '20px 24px',
          borderBottom: `1px solid ${C.border}`,
          backgroundColor: C.surface,
          flexShrink: 0,
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* title + stats */}
          <div className="flex items-center gap-4 flex-1">
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: C.solarMuted,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconTarget size={18} style={{ color: C.solar } as React.CSSProperties} />
            </div>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 700 }}>Funil Comercial</h1>
              <div className="flex items-center gap-3 mt-0.5">
                <span style={{ fontSize: 12, color: C.textSecondary }}>
                  <span style={{ color: C.text, fontWeight: 600 }}>{activeOpps.length}</span>{' '}
                  oportunidades ativas
                </span>
                <span style={{ color: C.border }}>•</span>
                <span style={{ fontSize: 12, color: C.textSecondary }}>
                  Total:{' '}
                  <span style={{ color: C.solar, fontWeight: 700 }}>{fmtCurrency(totalValue)}</span>
                </span>
              </div>
            </div>
          </div>

          {/* controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* view toggle */}
            <div
              style={{
                backgroundColor: C.elevated,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: 3,
                display: 'flex',
              }}
            >
              {viewButtons.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  onClick={() => setView(key)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 500,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    backgroundColor: view === key ? C.card : 'transparent',
                    color: view === key ? C.text : C.textSecondary,
                    transition: 'all 0.15s',
                  }}
                >
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setFiltersOpen((v) => !v)}
              style={{
                backgroundColor: filtersOpen ? C.solar : C.elevated,
                color: filtersOpen ? '#090B0A' : C.text,
                border: `1px solid ${filtersOpen ? C.solar : C.border}`,
                borderRadius: 8,
                padding: '7px 14px',
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: 500,
              }}
            >
              <IconFilter size={14} /> Filtros
            </button>

            <button
              style={{
                backgroundColor: C.solar,
                color: '#090B0A',
                border: 'none',
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <IconPlus size={14} /> Nova Oportunidade
            </button>
          </div>
        </div>
      </div>

      {/* ── filter panel ── */}
      {filtersOpen && (
        <div style={{ padding: '12px 24px 0', flexShrink: 0 }}>
          <FilterPanel onClose={() => setFiltersOpen(false)} />
        </div>
      )}

      {/* ── main content ── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {view === 'kanban' && (
          <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', padding: '16px 24px 24px' }}>
            <div
              style={{
                display: 'flex',
                gap: 12,
                minWidth: 'max-content',
                alignItems: 'flex-start',
              }}
            >
              {STAGES.map((stage) => (
                <KanbanColumn
                  key={stage}
                  stage={stage}
                  opps={opps.filter((o) => o.stage === stage)}
                  onSelect={setSelected}
                />
              ))}
            </div>
          </div>
        )}

        {view === 'lista' && (
          <div style={{ padding: '16px 24px 24px' }}>
            <ListView opps={opps} onSelect={setSelected} />
          </div>
        )}

        {view === 'metricas' && (
          <div style={{ padding: '16px 24px 24px' }}>
            <MetricsView opps={opps} />
          </div>
        )}
      </div>

      {/* ── right drawer ── */}
      {selected && (
        <Drawer opp={selected} onClose={() => setSelected(null)} onAdvance={handleAdvance} />
      )}
    </div>
  );
}
