import React, { useState, useRef, useEffect } from 'react';
import {
  IconMenu,
  IconSearch,
  IconBell,
  IconPlus,
  IconChevronDown,
  IconUser,
  IconSettings,
  IconLogOut,
  IconHelpCircle,
} from './Icons';

interface TopbarProps {
  onMenuToggle: () => void;
  currentPage: string;
  pageTitle: string;
  onNavigate: (page: string) => void;
}

const PAGE_SECTIONS: Record<string, string> = {
  dashboard: 'Visão Geral',
  funil: 'Comercial',
  clientes: 'Comercial',
  oportunidades: 'Comercial',
  atividades: 'Comercial',
  propostas: 'Comercial',
  projetos: 'Operação',
  engenharia: 'Operação',
  agenda: 'Operação',
  instalacoes: 'Operação',
  'pos-venda': 'Operação',
  estoque: 'Suprimentos',
  movimentacoes: 'Suprimentos',
  compras: 'Suprimentos',
  fornecedores: 'Suprimentos',
  financeiro: 'Financeiro',
  'contas-receber': 'Financeiro',
  'contas-pagar': 'Financeiro',
  comissoes: 'Financeiro',
  'fluxo-caixa': 'Financeiro',
  equipe: 'Administração',
  papeis: 'Administração',
  auditoria: 'Administração',
  configuracoes: 'Administração',
};

const QUICK_CREATE_ITEMS = ['Cliente', 'Oportunidade', 'Proposta', 'Projeto', 'Atividade'];

const USER_MENU_ITEMS = [
  { label: 'Meu Perfil', icon: IconUser },
  { label: 'Configurações', icon: IconSettings },
  { label: 'Ajuda', icon: IconHelpCircle },
  { label: 'Sair', icon: IconLogOut },
];

export const Topbar: React.FC<TopbarProps> = ({ onMenuToggle, currentPage, pageTitle }) => {
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const createRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const section = PAGE_SECTIONS[currentPage] || 'Moura Solar';

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (createRef.current && !createRef.current.contains(e.target as Node)) {
        setShowCreateMenu(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div
      style={{
        height: 72,
        background: '#111412',
        borderBottom: '1px solid #29302B',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 12,
        position: 'sticky',
        top: 0,
        zIndex: 40,
        flexShrink: 0,
      }}
    >
      {/* Menu toggle */}
      <button
        onClick={onMenuToggle}
        style={{
          width: 36,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
          color: '#9BA49E',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = '#1C211D';
          (e.currentTarget as HTMLButtonElement).style.color = '#F5F7F5';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          (e.currentTarget as HTMLButtonElement).style.color = '#9BA49E';
        }}
      >
        <IconMenu size={20} />
      </button>

      {/* Breadcrumb */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          color: '#626A65',
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
      >
        <span>Moura Solar</span>
        <span style={{ color: '#29302B' }}>/</span>
        <span>{section}</span>
        <span style={{ color: '#29302B' }}>/</span>
        <span style={{ color: '#F5F7F5', fontWeight: 500 }}>{pageTitle}</span>
      </nav>

      {/* Search */}
      <div
        style={{
          flex: 1,
          maxWidth: 420,
          marginLeft: 12,
          position: 'relative',
        }}
      >
        <IconSearch
          size={16}
          style={
            {
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#626A65',
              pointerEvents: 'none',
            } as React.CSSProperties
          }
        />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Buscar clientes, projetos, propostas..."
          style={{
            width: '100%',
            height: 36,
            background: '#161A17',
            border: '1px solid #29302B',
            borderRadius: 8,
            paddingLeft: 36,
            paddingRight: 12,
            color: '#F5F7F5',
            fontSize: 13,
            outline: 'none',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#FFD400';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#29302B';
          }}
        />
      </div>

      <div style={{ flex: 1 }} />

      {/* Bell */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <button
          style={{
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            color: '#9BA49E',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = '#1C211D';
            (e.currentTarget as HTMLButtonElement).style.color = '#F5F7F5';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.color = '#9BA49E';
          }}
        >
          <IconBell size={20} />
        </button>
        <div
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            width: 16,
            height: 16,
            background: '#FF4D57',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 9,
            fontWeight: 700,
            color: '#fff',
            pointerEvents: 'none',
            border: '2px solid #111412',
          }}
        >
          3
        </div>
      </div>

      {/* Quick Create */}
      <div ref={createRef} style={{ position: 'relative', flexShrink: 0 }}>
        <button
          onClick={() => setShowCreateMenu((v) => !v)}
          style={{
            height: 36,
            padding: '0 14px',
            background: showCreateMenu ? '#E6BE00' : '#FFD400',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            color: '#090B0A',
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
          onMouseEnter={(e) => {
            if (!showCreateMenu)
              (e.currentTarget as HTMLButtonElement).style.background = '#E6BE00';
          }}
          onMouseLeave={(e) => {
            if (!showCreateMenu)
              (e.currentTarget as HTMLButtonElement).style.background = '#FFD400';
          }}
        >
          <span>+ Criar</span>
          <IconChevronDown size={14} />
        </button>
        {showCreateMenu && (
          <div
            style={{
              position: 'absolute',
              top: 44,
              right: 0,
              background: '#1C211D',
              border: '1px solid #29302B',
              borderRadius: 10,
              padding: '6px 0',
              minWidth: 160,
              zIndex: 100,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}
          >
            {QUICK_CREATE_ITEMS.map((item) => (
              <button
                key={item}
                onClick={() => setShowCreateMenu(false)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '9px 16px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#F5F7F5',
                  fontSize: 13,
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = '#29302B';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }}
              >
                {item}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* User */}
      <div ref={userRef} style={{ position: 'relative', flexShrink: 0 }}>
        <button
          onClick={() => setShowUserMenu((v) => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'transparent',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            padding: '4px 8px',
            height: 36,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = '#1C211D';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: '#3A3200',
              color: '#FFD400',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 12,
              flexShrink: 0,
            }}
          >
            CM
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ color: '#F5F7F5', fontSize: 13, fontWeight: 500, lineHeight: 1.2 }}>
              Carlos Mendes
            </div>
            <div style={{ color: '#626A65', fontSize: 11 }}>Admin</div>
          </div>
          <IconChevronDown size={14} style={{ color: '#626A65' } as React.CSSProperties} />
        </button>
        {showUserMenu && (
          <div
            style={{
              position: 'absolute',
              top: 44,
              right: 0,
              background: '#1C211D',
              border: '1px solid #29302B',
              borderRadius: 10,
              padding: '6px 0',
              minWidth: 180,
              zIndex: 100,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}
          >
            {USER_MENU_ITEMS.map(({ label, icon: Icon }) => (
              <button
                key={label}
                onClick={() => setShowUserMenu(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '9px 16px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: label === 'Sair' ? '#FF4D57' : '#F5F7F5',
                  fontSize: 13,
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = '#29302B';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Topbar;
