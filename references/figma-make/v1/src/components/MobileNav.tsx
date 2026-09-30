import React, { useState, useEffect } from 'react';
import {
  IconHome, IconTrendingUp, IconUsers, IconFolder, IconGrid,
  IconTarget, IconActivity, IconFileText, IconTool, IconCalendar,
  IconMapPin, IconStar, IconPackage, IconLayers, IconShoppingCart,
  IconBarChart2, IconArrowDown, IconArrowUp, IconAward, IconShield,
  IconClipboard, IconSettings, IconX,
} from './Icons';

interface MobileNavProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

interface NavEntry {
  label: string;
  icon: React.FC<{ size?: number; className?: string }>;
  page: string;
}

interface NavSection {
  title: string;
  items: NavEntry[];
}

const ALL_SECTIONS: NavSection[] = [
  {
    title: 'GERAL',
    items: [{ label: 'Visão Geral', icon: IconHome, page: 'dashboard' }],
  },
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

const TAB_ITEMS: NavEntry[] = [
  { label: 'Dashboard', icon: IconHome, page: 'dashboard' },
  { label: 'Funil', icon: IconTrendingUp, page: 'funil' },
  { label: 'Clientes', icon: IconUsers, page: 'clientes' },
  { label: 'Projetos', icon: IconFolder, page: 'projetos' },
  { label: 'Mais', icon: IconGrid, page: '__more__' },
];

export const MobileNav: React.FC<MobileNavProps> = ({ currentPage, onNavigate }) => {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  const openSheet = () => {
    setSheetOpen(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setAnimateIn(true));
    });
  };

  const closeSheet = () => {
    setAnimateIn(false);
    setTimeout(() => setSheetOpen(false), 280);
  };

  const handleNav = (page: string) => {
    if (page === '__more__') {
      openSheet();
      return;
    }
    onNavigate(page);
    closeSheet();
  };

  // Close sheet on back navigation / escape
  useEffect(() => {
    if (!sheetOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSheet();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [sheetOpen]);

  const isMoreActive =
    !TAB_ITEMS.slice(0, 4).some((t) => t.page === currentPage);

  return (
    <>
      {/* Bottom nav bar */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 'calc(64px + env(safe-area-inset-bottom, 0px))',
          background: '#111412',
          borderTop: '1px solid #29302B',
          display: 'flex',
          alignItems: 'flex-start',
          paddingTop: 8,
          zIndex: 50,
        }}
      >
        {TAB_ITEMS.map((tab) => {
          const isMore = tab.page === '__more__';
          const active = isMore ? isMoreActive || sheetOpen : currentPage === tab.page;
          const Icon = tab.icon;
          return (
            <button
              key={tab.page}
              onClick={() => handleNav(tab.page)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: active ? '#FFD400' : '#626A65',
                fontSize: 10,
                fontWeight: active ? 600 : 400,
                padding: '4px 0',
                transition: 'color 0.15s',
              }}
            >
              <Icon size={22} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Bottom sheet overlay */}
      {sheetOpen && (
        <div
          onClick={closeSheet}
          style={{
            position: 'fixed',
            inset: 0,
            background: animateIn ? 'rgba(9,11,10,0.75)' : 'rgba(9,11,10,0)',
            zIndex: 60,
            transition: 'background 0.28s ease',
          }}
        />
      )}

      {/* Bottom sheet panel */}
      {sheetOpen && (
        <div
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            maxHeight: '80vh',
            background: '#161A17',
            borderTop: '1px solid #29302B',
            borderRadius: '20px 20px 0 0',
            zIndex: 70,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            transform: animateIn ? 'translateY(0)' : 'translateY(100%)',
            transition: 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
          }}
        >
          {/* Sheet header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px 12px',
              borderBottom: '1px solid #29302B',
              flexShrink: 0,
            }}
          >
            <span style={{ color: '#F5F7F5', fontWeight: 600, fontSize: 16 }}>Navegação</span>
            <button
              onClick={closeSheet}
              style={{
                width: 32,
                height: 32,
                background: '#1C211D',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                color: '#9BA49E',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconX size={18} />
            </button>
          </div>

          {/* Sheet nav list */}
          <div style={{ overflowY: 'auto', padding: '8px 0 calc(80px + env(safe-area-inset-bottom, 0px))' }}>
            {ALL_SECTIONS.map((section) => (
              <div key={section.title}>
                <div
                  style={{
                    padding: '10px 20px 4px',
                    color: '#626A65',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                  }}
                >
                  {section.title}
                </div>
                {section.items.map((item) => {
                  const active = currentPage === item.page;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.page}
                      onClick={() => handleNav(item.page)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        width: '100%',
                        padding: '12px 20px',
                        background: active ? '#3A3200' : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: active ? '#FFD400' : '#F5F7F5',
                        fontSize: 14,
                        fontWeight: active ? 600 : 400,
                        textAlign: 'left',
                        borderLeft: active ? '3px solid #FFD400' : '3px solid transparent',
                      }}
                    >
                      <Icon size={20} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default MobileNav;
