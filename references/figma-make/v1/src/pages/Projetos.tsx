import React, { useState } from 'react';
import {
  IconPlus,
  IconAlertTriangle,
  IconUsers,
  IconCalendar,
  IconTool,
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

type Phase =
  | 'Dimensionamento'
  | 'Engenharia'
  | 'Homologação'
  | 'Agendado'
  | 'Instalação'
  | 'Concluído'
  | 'Cancelado';

interface Project {
  id: string;
  title: string;
  client: string;
  city: string;
  phase: Phase;
  power: string;
  modules: number;
  inverter: string;
  team: string;
  date: string;
  progress: number;
  responsible: string;
  alert?: string;
  note?: string;
}

const PROJECTS: Project[] = [
  {
    id: 'PRJ-2024-0847',
    title: 'Residência Fazenda Sol',
    client: 'Maria Santos',
    city: 'Campinas, SP',
    phase: 'Instalação',
    power: '18,7 kWp',
    modules: 34,
    inverter: 'Fronius 15kW',
    team: 'Equipe Alfa',
    date: 'Instalação: 01/10/2026',
    progress: 75,
    responsible: 'Ana Lima',
  },
  {
    id: 'PRJ-2024-0841',
    title: 'Industrial Norte',
    client: 'Industrial Norte Ltda.',
    city: 'Araçatuba, SP',
    phase: 'Homologação',
    power: '187 kWp',
    modules: 340,
    inverter: 'ABB PVS-100',
    team: 'Equipe Beta',
    date: 'Prev.: 20/10/2026',
    progress: 50,
    responsible: 'Pedro Costa',
    alert: 'ART pendente há 12 dias',
  },
  {
    id: 'PRJ-2024-0835',
    title: 'Condomínio Verde Park',
    client: 'Condomínio Verde Park',
    city: 'São Paulo, SP',
    phase: 'Engenharia',
    power: '95 kWp',
    modules: 172,
    inverter: 'Growatt MID',
    team: 'Equipe Gama',
    date: 'Prev.: 15/11/2026',
    progress: 45,
    responsible: 'Juliana Melo',
  },
  {
    id: 'PRJ-2024-0828',
    title: 'Fazenda São Bento',
    client: 'Agro São Bento Ltda.',
    city: 'Barretos, SP',
    phase: 'Concluído',
    power: '320 kWp',
    modules: 581,
    inverter: 'Fronius Eco 25kW',
    team: 'Equipe Alfa',
    date: 'Instalado em 15/09/2026',
    progress: 100,
    responsible: 'Rafael Dias',
  },
  {
    id: 'PRJ-2024-0820',
    title: 'Farmácia Saúde & Vida',
    client: 'Farmácia S&V LTDA',
    city: 'Campinas, SP',
    phase: 'Dimensionamento',
    power: '42 kWp',
    modules: 76,
    inverter: 'Huawei SUN2000',
    team: 'Equipe Beta',
    date: 'Prev.: 01/12/2026',
    progress: 15,
    responsible: 'Ana Lima',
    note: 'Aguardando aprovação do cliente',
  },
  {
    id: 'PRJ-2024-0815',
    title: 'João Paulo Silva',
    client: 'João Paulo Silva',
    city: 'São Paulo, SP',
    phase: 'Concluído',
    power: '8,5 kWp',
    modules: 17,
    inverter: 'Growatt 5kW',
    team: 'Equipe Gama',
    date: 'Instalado 08/08/2026',
    progress: 100,
    responsible: 'Pedro Costa',
  },
];

const PHASES: Phase[] = [
  'Dimensionamento',
  'Engenharia',
  'Homologação',
  'Agendado',
  'Instalação',
  'Concluído',
  'Cancelado',
];

function phaseStyle(p: Phase): { color: string; bg: string } {
  return {
    Dimensionamento: { color: C.textSec, bg: 'rgba(155,164,158,0.12)' },
    Engenharia: { color: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
    Homologação: { color: C.orange, bg: 'rgba(255,159,28,0.12)' },
    Agendado: { color: C.solar, bg: 'rgba(255,212,0,0.12)' },
    Instalação: { color: C.blue, bg: 'rgba(59,130,246,0.12)' },
    Concluído: { color: C.green, bg: 'rgba(38,216,102,0.12)' },
    Cancelado: { color: C.red, bg: 'rgba(255,77,87,0.12)' },
  }[p];
}

function ProgressBar({ value, phase }: { value: number; phase: Phase }) {
  const color = phase === 'Concluído' ? C.green : phase === 'Instalação' ? C.solar : C.blue;
  return (
    <div style={{ height: 4, background: C.border, borderRadius: 2, overflow: 'hidden' }}>
      <div
        style={{
          height: '100%',
          width: `${value}%`,
          background: color,
          borderRadius: 2,
          transition: 'width 0.4s',
        }}
      />
    </div>
  );
}

function ProjectCard({ proj }: { proj: Project }) {
  const ps = phaseStyle(proj.phase);
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        cursor: 'pointer',
        transition: 'border-color 0.15s',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = C.solar + '44';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = C.border;
      }}
    >
      {proj.alert && (
        <div
          style={{
            background: 'rgba(255,77,87,0.08)',
            border: `1px solid rgba(255,77,87,0.25)`,
            borderRadius: 7,
            padding: '7px 12px',
            display: 'flex',
            gap: 8,
            alignItems: 'center',
          }}
        >
          <IconAlertTriangle size={14} style={{ color: C.red } as React.CSSProperties} />
          <span style={{ fontSize: 12, color: C.red, fontWeight: 600 }}>{proj.alert}</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 11, color: C.textDis, marginBottom: 3 }}>{proj.id}</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{proj.title}</div>
          <div style={{ fontSize: 12, color: C.textSec, marginTop: 2 }}>
            {proj.client} · {proj.city}
          </div>
        </div>
        <span
          style={{
            padding: '4px 12px',
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 700,
            color: ps.color,
            background: ps.bg,
            whiteSpace: 'nowrap',
            flexShrink: 0,
            marginLeft: 12,
          }}
        >
          {proj.phase}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {[
          { label: 'Potência', value: proj.power },
          { label: 'Módulos', value: `${proj.modules} un.` },
          { label: 'Inversor', value: proj.inverter },
        ].map((f) => (
          <div key={f.label}>
            <div
              style={{
                fontSize: 10,
                color: C.textDis,
                marginBottom: 2,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              {f.label}
            </div>
            <div style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{f.value}</div>
          </div>
        ))}
      </div>

      {proj.note && (
        <div
          style={{
            fontSize: 12,
            color: C.orange,
            background: 'rgba(255,159,28,0.08)',
            borderRadius: 6,
            padding: '6px 10px',
          }}
        >
          {proj.note}
        </div>
      )}

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: C.textSec }}>Progresso</span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: proj.phase === 'Concluído' ? C.green : C.text,
            }}
          >
            {proj.progress}%
          </span>
        </div>
        <ProgressBar value={proj.progress} phase={proj.phase} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div
            style={{
              display: 'flex',
              gap: 5,
              alignItems: 'center',
              fontSize: 12,
              color: C.textSec,
            }}
          >
            <IconUsers size={13} />
            {proj.team}
          </div>
          <div
            style={{
              display: 'flex',
              gap: 5,
              alignItems: 'center',
              fontSize: 12,
              color: C.textSec,
            }}
          >
            <IconCalendar size={13} />
            {proj.date}
          </div>
        </div>
        <div style={{ fontSize: 12, color: C.textDis }}>{proj.responsible}</div>
      </div>
    </div>
  );
}

export default function Projetos() {
  const [phaseFilter, setPhaseFilter] = useState<string>('Todos');

  const filtered =
    phaseFilter === 'Todos' ? PROJECTS : PROJECTS.filter((p) => p.phase === phaseFilter);

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
        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Projetos</h1>
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
          <IconPlus size={15} /> Novo Projeto
        </button>
      </div>

      {/* Phase filter tabs */}
      <div
        style={{ display: 'flex', gap: 2, borderBottom: `1px solid ${C.border}`, flexWrap: 'wrap' }}
      >
        {['Todos', ...PHASES].map((t) => {
          const isActive = phaseFilter === t;
          const ps = t !== 'Todos' ? phaseStyle(t as Phase) : null;
          return (
            <button
              key={t}
              onClick={() => setPhaseFilter(t)}
              style={{
                padding: '9px 14px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                color: isActive ? (ps?.color ?? C.solar) : C.textSec,
                borderBottom: `2px solid ${isActive ? (ps?.color ?? C.solar) : 'transparent'}`,
                marginBottom: -1,
              }}
            >
              {t}
            </button>
          );
        })}
      </div>

      {/* Cards grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
          gap: 16,
        }}
      >
        {filtered.map((p) => (
          <ProjectCard key={p.id} proj={p} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: C.textSec, fontSize: 15 }}>
          Nenhum projeto na fase "{phaseFilter}".
        </div>
      )}
    </div>
  );
}
