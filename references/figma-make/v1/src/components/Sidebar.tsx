import React, { useState } from 'react';
import {
  IconHome,
  IconUsers,
  IconTrendingUp,
  IconActivity,
  IconFileText,
  IconFolder,
  IconTool,
  IconCalendar,
  IconPackage,
  IconShoppingCart,
  IconBarChart2,
  IconSettings,
  IconArrowUp,
  IconArrowDown,
  IconAward,
  IconTarget,
  IconMapPin,
  IconStar,
  IconShield,
  IconClipboard,
  IconChevronDown,
  IconChevronRight,
  IconLayers,
} from './Icons';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  currentPage: string;
  onNavigate: (page: string) => void;
}

interface NavItem {
  label: string;
  icon: React.FC<{ size?: number; className?: string }>;
  page: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const GROUPS: NavGroup[] = [
  {
    title: 'COMERCIAL',
    items: [
      { label: 'Funil', icon: IconTrendingUp, page: 'funil' },
      { label: 'Clientes', icon: IconUsers, page: 'clientes' },
      { label: 'Oportunidades', icon: IconTarget, page: 'oportunidades' },
      { label: 'Atividades', icon: IconActivity, page: 'atividades' },
      { label: 'Propostas', icon: IconFileText, page: 'propostas' },
    ],
  },
  {
    title: 'OPERAÇÃO',
    items: [
      { label: 'Projetos', icon: IconFolder, page: 'projetos' },
      { label: 'Engenharia', icon: IconTool, page: 'engenharia' },
      { label: 'Agenda', icon: IconCalendar, page: 'agenda' },
      { label: 'Instalações', icon: IconMapPin, page: 'instalacoes' },
      { label: 'Pós-venda', icon: IconStar, page: 'pos-venda' },
    ],
  },
  {
    title: 'SUPRIMENTOS',
    items: [
      { label: 'Estoque', icon: IconPackage, page: 'estoque' },
      { label: 'Movimentações', icon: IconLayers, page: 'movimentacoes' },
      { label: 'Compras', icon: IconShoppingCart, page: 'compras' },
      { label: 'Fornecedores', icon: IconUsers, page: 'fornecedores' },
    ],
  },
  {
    title: 'FINANCEIRO',
    items: [
      { label: 'Visão Financeira', icon: IconBarChart2, page: 'financeiro' },
      { label: 'Contas a Receber', icon: IconArrowDown, page: 'contas-receber' },
      { label: 'Contas a Pagar', icon: IconArrowUp, page: 'contas-pagar' },
      { label: 'Comissões', icon: IconAward, page: 'comissoes' },
      { label: 'Fluxo de Caixa', icon: IconTrendingUp, page: 'fluxo-caixa' },
    ],
  },
  {
    title: 'ADMINISTRAÇÃO',
    items: [
      { label: 'Equipe', icon: IconUsers, page: 'equipe' },
      { label: 'Papéis', icon: IconShield, page: 'papeis' },
      { label: 'Auditoria', icon: IconClipboard, page: 'auditoria' },
      { label: 'Configurações', icon: IconSettings, page: 'configuracoes' },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, currentPage, onNavigate }) => {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(GROUPS.map((g) => [g.title, true])),
  );

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const NavItemEl: React.FC<{ item: NavItem }> = ({ item }) => {
    const active = currentPage === item.page;
    const Icon = item.icon;
    return (
      <button
        onClick={() => onNavigate(item.page)}
        title={collapsed ? item.label : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: collapsed ? 0 : 12,
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '8px' : '8px 12px',
          margin: '1px 8px',
          borderRadius: 8,
          width: collapsed ? 48 : 'calc(100% - 16px)',
          background: active ? '#3A3200' : 'transparent',
          color: active ? '#FFD400' : '#9BA49E',
          borderLeft: active ? '2px solid #FFD400' : '2px solid transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          fontSize: 14,
          fontWeight: active ? 500 : 400,
          transition: 'background 0.15s, color 0.15s',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}
        onMouseEnter={(e) => {
          if (!active) {
            (e.currentTarget as HTMLButtonElement).style.background = '#1C211D';
            (e.currentTarget as HTMLButtonElement).style.color = '#F5F7F5';
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.color = '#9BA49E';
          }
        }}
      >
        <Icon size={18} />
        {!collapsed && (
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
        )}
      </button>
    );
  };

  return (
    <div
      style={{
        width: collapsed ? 64 : 264,
        minWidth: collapsed ? 64 : 264,
        height: '100vh',
        background: '#111412',
        borderRight: '1px solid #29302B',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'width 0.25s ease, min-width 0.25s ease',
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div
        style={{
          height: 72,
          display: 'flex',
          alignItems: 'center',
          padding: collapsed ? '0 8px' : '0 16px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderBottom: '1px solid #29302B',
          flexShrink: 0,
          gap: 12,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            background: '#FFD400',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            fontWeight: 800,
            fontSize: 14,
            color: '#090B0A',
            letterSpacing: '-0.5px',
          }}
        >
          MS
        </div>
        {!collapsed && (
          <div>
            <div style={{ color: '#F5F7F5', fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>
              Moura Solar
            </div>
            <div style={{ color: '#626A65', fontSize: 11 }}>CRM / ERP</div>
          </div>
        )}
      </div>

      {/* Nav area */}
      <div
        style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingTop: 8, paddingBottom: 8 }}
      >
        {/* Dashboard */}
        <div style={{ marginBottom: 4 }}>
          <button
            onClick={() => onNavigate('dashboard')}
            title={collapsed ? 'Dashboard' : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: collapsed ? 0 : 12,
              justifyContent: collapsed ? 'center' : 'flex-start',
              padding: collapsed ? '8px' : '8px 12px',
              margin: '1px 8px',
              borderRadius: 8,
              width: collapsed ? 48 : 'calc(100% - 16px)',
              background: currentPage === 'dashboard' ? '#3A3200' : 'transparent',
              color: currentPage === 'dashboard' ? '#FFD400' : '#9BA49E',
              borderLeft:
                currentPage === 'dashboard' ? '2px solid #FFD400' : '2px solid transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: currentPage === 'dashboard' ? 500 : 400,
              transition: 'background 0.15s, color 0.15s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              if (currentPage !== 'dashboard') {
                (e.currentTarget as HTMLButtonElement).style.background = '#1C211D';
                (e.currentTarget as HTMLButtonElement).style.color = '#F5F7F5';
              }
            }}
            onMouseLeave={(e) => {
              if (currentPage !== 'dashboard') {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                (e.currentTarget as HTMLButtonElement).style.color = '#9BA49E';
              }
            }}
          >
            <IconHome size={18} />
            {!collapsed && <span>Visão Geral</span>}
          </button>
        </div>

        {/* Groups */}
        {GROUPS.map((group) => (
          <div key={group.title} style={{ marginBottom: 4 }}>
            {!collapsed && (
              <button
                onClick={() => toggleGroup(group.title)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '6px 16px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#626A65',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginTop: 8,
                }}
              >
                <span>{group.title}</span>
                {openGroups[group.title] ? (
                  <IconChevronDown size={12} />
                ) : (
                  <IconChevronRight size={12} />
                )}
              </button>
            )}
            {(collapsed || openGroups[group.title]) &&
              group.items.map((item) => <NavItemEl key={item.page} item={item} />)}
          </div>
        ))}
      </div>

      {/* User */}
      <div
        style={{
          borderTop: '1px solid #29302B',
          padding: collapsed ? '12px 8px' : '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: '#3A3200',
            color: '#FFD400',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 13,
            flexShrink: 0,
          }}
        >
          CM
        </div>
        {!collapsed && (
          <div style={{ overflow: 'hidden' }}>
            <div
              style={{
                color: '#F5F7F5',
                fontSize: 13,
                fontWeight: 500,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              Carlos Mendes
            </div>
            <div style={{ color: '#626A65', fontSize: 11 }}>Administrador</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
