import React, { useState } from 'react';
import {
  IconSearch,
  IconDownload,
  IconUpload,
  IconPlus,
  IconEye,
  IconEdit,
  IconMoreVertical,
  IconX,
  IconChevronLeft,
  IconChevronRight,
  IconPhone,
  IconMail,
  IconMapPin,
  IconUser,
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

type Status = 'Ativo' | 'Lead' | 'Em andamento' | 'Inativo';

interface Cliente {
  id: number;
  nome: string;
  doc: string;
  cidade: string;
  responsavel: string;
  origem: string;
  projetos: number;
  valorTotal: string;
  ultimaAtividade: string;
  status: Status;
  tipo: 'PF' | 'PJ';
}

const CLIENTES: Cliente[] = [
  {
    id: 1,
    nome: 'João Paulo Silva',
    doc: '123.456.789-00',
    cidade: 'São Paulo, SP',
    responsavel: 'Ana Lima',
    origem: 'Indicação',
    projetos: 2,
    valorTotal: 'R$ 87.400',
    ultimaAtividade: '28/09/2026',
    status: 'Ativo',
    tipo: 'PF',
  },
  {
    id: 2,
    nome: 'Farmácia Saúde & Vida LTDA',
    doc: '45.123.789/0001-55',
    cidade: 'Campinas, SP',
    responsavel: 'Pedro Costa',
    origem: 'Site',
    projetos: 1,
    valorTotal: 'R$ 145.000',
    ultimaAtividade: '27/09/2026',
    status: 'Ativo',
    tipo: 'PJ',
  },
  {
    id: 3,
    nome: 'Maria Conceição Ferreira',
    doc: '234.567.890-11',
    cidade: 'Ribeirão Preto, SP',
    responsavel: 'Ana Lima',
    origem: 'Indicação',
    projetos: 3,
    valorTotal: 'R$ 210.000',
    ultimaAtividade: '25/09/2026',
    status: 'Ativo',
    tipo: 'PF',
  },
  {
    id: 4,
    nome: 'Condomínio Verde Park',
    doc: '12.345.678/0001-90',
    cidade: 'São Paulo, SP',
    responsavel: 'Juliana Melo',
    origem: 'Captação ativa',
    projetos: 1,
    valorTotal: 'R$ 380.000',
    ultimaAtividade: '24/09/2026',
    status: 'Em andamento',
    tipo: 'PJ',
  },
  {
    id: 5,
    nome: 'Carlos Eduardo Moraes',
    doc: '345.678.901-22',
    cidade: 'Santos, SP',
    responsavel: 'Pedro Costa',
    origem: 'Site',
    projetos: 0,
    valorTotal: '—',
    ultimaAtividade: '20/09/2026',
    status: 'Lead',
    tipo: 'PF',
  },
  {
    id: 6,
    nome: 'Supermercado Bom Preço',
    doc: '98.765.432/0001-10',
    cidade: 'Sorocaba, SP',
    responsavel: 'Rafael Dias',
    origem: 'Parceiro',
    projetos: 2,
    valorTotal: 'R$ 290.000',
    ultimaAtividade: '18/09/2026',
    status: 'Ativo',
    tipo: 'PJ',
  },
  {
    id: 7,
    nome: 'Ana Beatriz Santos',
    doc: '456.789.012-33',
    cidade: 'Jundiaí, SP',
    responsavel: 'Juliana Melo',
    origem: 'Instagram',
    projetos: 1,
    valorTotal: 'R$ 56.000',
    ultimaAtividade: '15/09/2026',
    status: 'Ativo',
    tipo: 'PF',
  },
  {
    id: 8,
    nome: 'Frigorífico Industrial Norte',
    doc: '11.223.344/0001-55',
    cidade: 'Araçatuba, SP',
    responsavel: 'Rafael Dias',
    origem: 'Prospecção',
    projetos: 0,
    valorTotal: '—',
    ultimaAtividade: '10/09/2026',
    status: 'Lead',
    tipo: 'PJ',
  },
];

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function avatarColor(name: string) {
  const colors = ['#1e3a1e', '#1a2b3a', '#3a1a2b', '#2b2b1a', '#1a3a2b'];
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % colors.length;
  return colors[h];
}

function StatusBadge({ status }: { status: Status }) {
  const map: Record<Status, { color: string; bg: string }> = {
    Ativo: { color: C.green, bg: 'rgba(38,216,102,0.12)' },
    Lead: { color: C.orange, bg: 'rgba(255,159,28,0.12)' },
    'Em andamento': { color: C.blue, bg: 'rgba(59,130,246,0.12)' },
    Inativo: { color: C.textSec, bg: 'rgba(155,164,158,0.12)' },
  };
  const s = map[status];
  return (
    <span
      style={{
        padding: '2px 10px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        color: s.color,
        background: s.bg,
      }}
    >
      {status}
    </span>
  );
}

function DetailPanel({ cliente, onClose }: { cliente: Cliente; onClose: () => void }) {
  const [tab, setTab] = useState('Resumo');
  const tabs = ['Resumo', 'Contatos', 'Unidades', 'Oportunidades', 'Projetos', 'Documentos'];

  return (
    <div
      style={{
        width: 450,
        flexShrink: 0,
        background: C.surface,
        borderLeft: `1px solid ${C.border}`,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ padding: '20px 24px 0', borderBottom: `1px solid ${C.border}` }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: avatarColor(cliente.nome),
                color: '#FFD400',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 18,
              }}
            >
              {initials(cliente.nome)}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>
                {cliente.nome}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: C.elevated,
                    color: C.textSec,
                  }}
                >
                  {cliente.tipo}
                </span>
                <StatusBadge status={cliente.status} />
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: C.textSec,
              padding: 4,
            }}
          >
            <IconX size={20} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 0 }}>
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '8px 12px',
                fontSize: 12,
                fontWeight: 600,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: tab === t ? C.solar : C.textSec,
                borderBottom: `2px solid ${tab === t ? C.solar : 'transparent'}`,
                marginBottom: -1,
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        {tab === 'Resumo' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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
                INFORMAÇÕES DE CONTATO
              </div>
              {[
                { icon: <IconPhone size={14} />, label: 'Telefone', value: '(11) 98765-4321' },
                {
                  icon: <IconMail size={14} />,
                  label: 'E-mail',
                  value: cliente.nome.split(' ')[0].toLowerCase() + '@email.com',
                },
                { icon: <IconPhone size={14} />, label: 'WhatsApp', value: '(11) 98765-4321' },
              ].map((row) => (
                <div
                  key={row.label}
                  style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}
                >
                  <span style={{ color: C.textDis }}>{row.icon}</span>
                  <span style={{ fontSize: 12, color: C.textSec, width: 70 }}>{row.label}</span>
                  <span style={{ fontSize: 13, color: C.text }}>{row.value}</span>
                </div>
              ))}
            </div>
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
                ENDEREÇO
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ color: C.textDis, marginTop: 2 }}>
                  <IconMapPin size={14} />
                </span>
                <span style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>
                  Rua das Flores, 123, Ap 45
                  <br />
                  {cliente.cidade}
                  <br />
                  CEP: 01310-100
                </span>
              </div>
            </div>
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
                DADOS CRM
              </div>
              {[
                { label: 'Responsável', value: cliente.responsavel },
                { label: 'Origem', value: cliente.origem },
                { label: 'Documento', value: cliente.doc },
                { label: 'Projetos', value: String(cliente.projetos) },
                { label: 'Valor Total', value: cliente.valorTotal },
              ].map((row) => (
                <div
                  key={row.label}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                    fontSize: 13,
                  }}
                >
                  <span style={{ color: C.textSec }}>{row.label}</span>
                  <span style={{ color: C.text, fontWeight: 500 }}>{row.value}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['Residencial', 'Alta prioridade', cliente.origem].map((tag) => (
                <span
                  key={tag}
                  style={{
                    padding: '3px 10px',
                    borderRadius: 20,
                    fontSize: 11,
                    background: C.elevated,
                    color: C.textSec,
                    border: `1px solid ${C.border}`,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
        {tab !== 'Resumo' && (
          <div style={{ color: C.textSec, fontSize: 13, textAlign: 'center', marginTop: 40 }}>
            Conteúdo de {tab} disponível em breve.
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div
        style={{
          padding: '16px 24px',
          borderTop: `1px solid ${C.border}`,
          display: 'flex',
          gap: 8,
        }}
      >
        <button
          style={{
            flex: 1,
            padding: '9px 0',
            background: C.solar,
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 700,
            color: '#090B0A',
          }}
        >
          Nova Oportunidade
        </button>
        <button
          style={{
            padding: '9px 14px',
            background: C.elevated,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 12,
            color: C.text,
          }}
        >
          Atividade
        </button>
        <button
          style={{
            padding: '9px 14px',
            background: C.elevated,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 12,
            color: C.text,
          }}
        >
          Editar
        </button>
      </div>
    </div>
  );
}

export default function Clientes() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [tipoFilter, setTipoFilter] = useState('todos');
  const [selected, setSelected] = useState<Cliente | null>(null);
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [checkedRows, setCheckedRows] = useState<Set<number>>(new Set());

  const filtered = CLIENTES.filter((c) => {
    const matchSearch =
      c.nome.toLowerCase().includes(search.toLowerCase()) ||
      c.cidade.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'todos' || c.status.toLowerCase() === statusFilter;
    const matchTipo = tipoFilter === 'todos' || c.tipo === tipoFilter;
    return matchSearch && matchStatus && matchTipo;
  });

  const toggleCheck = (id: number) => {
    setCheckedRows((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Clientes</h1>
          <span style={{ fontSize: 13, color: C.textSec }}>847 clientes</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            style={{
              padding: '8px 16px',
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
            <IconUpload size={15} /> Importar
          </button>
          <button
            style={{
              padding: '8px 16px',
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
          <button
            style={{
              padding: '8px 16px',
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
            <IconPlus size={15} /> Novo Cliente
          </button>
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: '14px 16px',
          marginBottom: 16,
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
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
            placeholder="Buscar cliente, CPF/CNPJ, cidade..."
            style={{
              width: '100%',
              height: 36,
              background: C.elevated,
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
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {(['todos', 'ativo', 'lead', 'em andamento', 'inativo'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '5px 12px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: statusFilter === s ? C.solar : C.elevated,
                color: statusFilter === s ? '#090B0A' : C.textSec,
              }}
            >
              {s === 'todos' ? 'Todos' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
          <div style={{ width: 1, height: 20, background: C.border, margin: '0 4px' }} />
          {(['todos', 'PF', 'PJ'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTipoFilter(t)}
              style={{
                padding: '5px 12px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: tipoFilter === t ? '#1C3F2E' : C.elevated,
                color: tipoFilter === t ? C.green : C.textSec,
              }}
            >
              {t === 'todos' ? 'PF/PJ' : t}
            </button>
          ))}
          {(search || statusFilter !== 'todos' || tipoFilter !== 'todos') && (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('todos');
                setTipoFilter('todos');
              }}
              style={{
                padding: '5px 10px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: C.textSec,
                fontSize: 12,
                textDecoration: 'underline',
              }}
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Main area */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, gap: 0 }}>
        {/* Table */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: selected ? '10px 0 0 10px' : 10,
            overflow: 'auto',
          }}
        >
          {/* Desktop table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.surface }}>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    color: C.textDis,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    width: 40,
                  }}
                >
                  <input type="checkbox" style={{ accentColor: C.solar }} />
                </th>
                {[
                  'Cliente',
                  'Cidade',
                  'Responsável',
                  'Origem',
                  'Projetos',
                  'Valor Total',
                  'Última Atividade',
                  'Status',
                  '',
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '12px 12px',
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
              {filtered.map((c, i) => (
                <tr
                  key={c.id}
                  onClick={() => setSelected(selected?.id === c.id ? null : c)}
                  style={{
                    borderTop: `1px solid ${C.border}`,
                    cursor: 'pointer',
                    background: selected?.id === c.id ? C.elevated : 'transparent',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (selected?.id !== c.id)
                      (e.currentTarget as HTMLTableRowElement).style.background = '#181E19';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.background =
                      selected?.id === c.id ? C.elevated : 'transparent';
                  }}
                >
                  <td style={{ padding: '12px 16px' }} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={checkedRows.has(c.id)}
                      onChange={() => toggleCheck(c.id)}
                      style={{ accentColor: C.solar }}
                    />
                  </td>
                  <td style={{ padding: '12px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: avatarColor(c.nome),
                          color: '#FFD400',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {initials(c.nome)}
                      </div>
                      <div>
                        <div style={{ color: C.text, fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {c.nome}
                        </div>
                        <div style={{ color: C.textDis, fontSize: 11 }}>{c.doc}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 12px', color: C.textSec, whiteSpace: 'nowrap' }}>
                    {c.cidade}
                  </td>
                  <td style={{ padding: '12px 12px', color: C.textSec }}>{c.responsavel}</td>
                  <td style={{ padding: '12px 12px', color: C.textSec }}>{c.origem}</td>
                  <td style={{ padding: '12px 12px', color: C.textSec, textAlign: 'center' }}>
                    {c.projetos > 0 ? `${c.projetos}` : '—'}
                  </td>
                  <td
                    style={{
                      padding: '12px 12px',
                      color: C.text,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {c.valorTotal}
                  </td>
                  <td style={{ padding: '12px 12px', color: C.textSec, whiteSpace: 'nowrap' }}>
                    {c.ultimaAtividade}
                  </td>
                  <td style={{ padding: '12px 12px' }}>
                    <StatusBadge status={c.status} />
                  </td>
                  <td style={{ padding: '12px 8px' }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <button
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
                        <IconEye size={15} />
                      </button>
                      <button
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
                        <IconEdit size={15} />
                      </button>
                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={() => setOpenMenu(openMenu === c.id ? null : c.id)}
                          style={{
                            width: 28,
                            height: 28,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: openMenu === c.id ? C.elevated : 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: C.textSec,
                            borderRadius: 6,
                          }}
                        >
                          <IconMoreVertical size={15} />
                        </button>
                        {openMenu === c.id && (
                          <div
                            style={{
                              position: 'absolute',
                              right: 0,
                              top: 32,
                              background: C.elevated,
                              border: `1px solid ${C.border}`,
                              borderRadius: 8,
                              padding: '4px 0',
                              minWidth: 160,
                              zIndex: 50,
                              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                            }}
                          >
                            {['Criar Oportunidade', 'Adicionar Contato', 'Arquivar'].map(
                              (action) => (
                                <button
                                  key={action}
                                  onClick={() => setOpenMenu(null)}
                                  style={{
                                    display: 'block',
                                    width: '100%',
                                    padding: '8px 14px',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: action === 'Arquivar' ? C.red : C.text,
                                    fontSize: 13,
                                    textAlign: 'left',
                                  }}
                                  onMouseEnter={(e) => {
                                    (e.currentTarget as HTMLButtonElement).style.background =
                                      C.border;
                                  }}
                                  onMouseLeave={(e) => {
                                    (e.currentTarget as HTMLButtonElement).style.background =
                                      'none';
                                  }}
                                >
                                  {action}
                                </button>
                              ),
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 20px',
              borderTop: `1px solid ${C.border}`,
            }}
          >
            <span style={{ fontSize: 13, color: C.textSec }}>
              1–{filtered.length} de 847 clientes
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                style={{
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: C.elevated,
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  cursor: 'pointer',
                  color: C.textSec,
                }}
              >
                <IconChevronLeft size={16} />
              </button>
              {[1, 2, 3, '...', 106].map((p, i) => (
                <button
                  key={i}
                  style={{
                    minWidth: 32,
                    height: 32,
                    padding: '0 6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: p === 1 ? C.solar : C.elevated,
                    border: `1px solid ${p === 1 ? C.solar : C.border}`,
                    borderRadius: 6,
                    cursor: 'pointer',
                    color: p === 1 ? '#090B0A' : C.textSec,
                    fontWeight: p === 1 ? 700 : 400,
                    fontSize: 13,
                  }}
                >
                  {p}
                </button>
              ))}
              <button
                style={{
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: C.elevated,
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  cursor: 'pointer',
                  color: C.text,
                }}
              >
                <IconChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Detail panel */}
        {selected && <DetailPanel cliente={selected} onClose={() => setSelected(null)} />}
      </div>
    </div>
  );
}
