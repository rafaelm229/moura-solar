import React, { useState, useRef, useEffect } from 'react';
import { ShellUser } from './types';
import {
  IconMenu,
  IconSearch,
  IconBell,
  IconPlus,
  IconChevronDown,
  IconLogOut,
  IconUsers,
  IconTarget,
  IconFileText,
  IconFolder,
  IconActivity,
} from '../Icons';

export interface TopbarProps {
  onMenuToggle: () => void;
  currentPage: string;
  pageTitle: string;
  sectionTitle?: string;
  onNavigate: (pageId: string) => void;
  user?: ShellUser;
  onLogout?: () => void;
  isLogoutPending?: boolean;
  onCreateAction?: (type: string) => void;
}

const QUICK_CREATE_ITEMS = [
  { label: 'Cliente', id: 'customers', icon: IconUsers },
  { label: 'Oportunidade', id: 'opportunities', icon: IconTarget },
  { label: 'Proposta', id: 'propostas', icon: IconFileText },
  { label: 'Projeto', id: 'projetos', icon: IconFolder },
  { label: 'Atividade', id: 'activities', icon: IconActivity },
];

export function Topbar({
  onMenuToggle,
  pageTitle,
  sectionTitle = 'Moura Solar',
  onNavigate,
  user,
  onLogout,
  isLogoutPending,
  onCreateAction,
}: TopbarProps) {
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const createRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

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

  const getInitials = (name?: string) => {
    if (!name) return 'MS';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = user?.initials || getInitials(user?.name);

  return (
    <header
      className="shell-topbar"
      style={{
        height: 72,
        background: 'var(--surface-default, #111412)',
        borderBottom: '1px solid var(--border-subtle, #29302B)',
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
      {/* Menu toggle button */}
      <button
        type="button"
        onClick={onMenuToggle}
        title="Alternar menu lateral"
        aria-label="Alternar menu lateral"
        className="shell-topbar-toggle"
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
          color: 'var(--color-ink-300, #9BA49E)',
          flexShrink: 0,
          transition: 'background 0.15s, color 0.15s',
        }}
      >
        <IconMenu size={20} />
      </button>

      {/* Breadcrumb */}
      <nav
        aria-label="Caminho de navegação"
        className="shell-breadcrumb"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          color: 'var(--color-ink-400, #626A65)',
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
      >
        <span>Moura Solar</span>
        <span style={{ color: 'var(--border-subtle, #29302B)' }}>/</span>
        <span>{sectionTitle}</span>
        <span style={{ color: 'var(--border-subtle, #29302B)' }}>/</span>
        <span style={{ color: 'var(--color-ink-50, #F5F7F5)', fontWeight: 500 }}>{pageTitle}</span>
      </nav>

      {/* Search box */}
      <div
        className="shell-search"
        style={{
          flex: 1,
          maxWidth: 420,
          marginLeft: 12,
          position: 'relative',
        }}
      >
        <IconSearch
          size={16}
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--color-ink-400, #626A65)',
            pointerEvents: 'none',
          }}
        />
        <input
          type="search"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Buscar clientes, projetos, propostas..."
          aria-label="Buscar clientes, projetos, propostas"
          style={{
            width: '100%',
            height: 36,
            background: 'var(--surface-card, #161A17)',
            border: '1px solid var(--border-subtle, #29302B)',
            borderRadius: 8,
            paddingLeft: 36,
            paddingRight: 12,
            color: 'var(--color-ink-50, #F5F7F5)',
            fontSize: 13,
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.15s',
          }}
        />
      </div>

      <div style={{ flex: 1 }} />

      {/* Notification Bell */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <button
          type="button"
          aria-label="Notificações"
          title="Notificações"
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
            color: 'var(--color-ink-300, #9BA49E)',
            transition: 'background 0.15s, color 0.15s',
          }}
        >
          <IconBell size={20} />
        </button>
        <div
          aria-hidden="true"
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
            color: '#FFFFFF',
            pointerEvents: 'none',
            border: '2px solid var(--surface-default, #111412)',
          }}
        >
          3
        </div>
      </div>

      {/* Quick Create Button + Dropdown */}
      <div ref={createRef} style={{ position: 'relative', flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => setShowCreateMenu((v) => !v)}
          aria-expanded={showCreateMenu}
          aria-haspopup="menu"
          style={{
            height: 36,
            padding: '0 14px',
            background: showCreateMenu ? '#E6BE00' : 'var(--color-solar, #FFD400)',
            color: '#090B0A',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'background 0.15s',
          }}
        >
          <IconPlus size={16} />
          <span>Criar</span>
          <IconChevronDown size={14} />
        </button>

        {showCreateMenu && (
          <div
            role="menu"
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: 180,
              background: 'var(--surface-elevated, #1C211D)',
              border: '1px solid var(--border-subtle, #29302B)',
              borderRadius: 8,
              padding: '4px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              zIndex: 50,
            }}
          >
            {QUICK_CREATE_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setShowCreateMenu(false);
                    if (onCreateAction) onCreateAction(item.id);
                    else onNavigate(item.id);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '8px 12px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    color: 'var(--color-ink-50, #F5F7F5)',
                    fontSize: 13,
                    textAlign: 'left',
                  }}
                >
                  <Icon size={16} color="var(--color-solar, #FFD400)" />
                  <span>Novo {item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Sair Button (Direct visible button matching test accessibility locator) */}
      {onLogout && (
        <button
          type="button"
          onClick={onLogout}
          disabled={isLogoutPending}
          aria-label="Sair"
          className="shell-topbar-logout"
          style={{
            height: 36,
            padding: '0 12px',
            background: 'transparent',
            border: '1px solid var(--border-subtle, #29302B)',
            borderRadius: 8,
            cursor: isLogoutPending ? 'wait' : 'pointer',
            color: 'var(--color-ink-300, #9BA49E)',
            fontSize: 13,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'background 0.15s, color 0.15s, border-color 0.15s',
          }}
        >
          <IconLogOut size={16} />
          <span>Sair</span>
        </button>
      )}

      {/* User profile dropdown */}
      <div ref={userRef} style={{ position: 'relative', flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => setShowUserMenu((v) => !v)}
          aria-expanded={showUserMenu}
          aria-haspopup="menu"
          aria-label="Menu do usuário"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'transparent',
            border: 'none',
            padding: '4px',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: 'var(--color-brand-900, #3A3200)',
              color: 'var(--color-solar, #FFD400)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            {initials}
          </div>
          <div style={{ textAlign: 'left', display: 'none' }} className="shell-user-text">
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink-50, #F5F7F5)' }}>
              {user?.name || 'Carlos Mendes'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-ink-400, #626A65)' }}>
              {user?.role || 'Admin'}
            </div>
          </div>
        </button>

        {showUserMenu && (
          <div
            role="menu"
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: 200,
              background: 'var(--surface-elevated, #1C211D)',
              border: '1px solid var(--border-subtle, #29302B)',
              borderRadius: 8,
              padding: '6px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              zIndex: 50,
            }}
          >
            <div
              style={{
                padding: '8px 10px',
                borderBottom: '1px solid var(--border-subtle, #29302B)',
                marginBottom: 4,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink-50, #F5F7F5)' }}>
                {user?.name || 'Carlos Mendes'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-ink-400, #626A65)' }}>
                {user?.email || user?.organizationName || 'Moura Solar'}
              </div>
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setShowUserMenu(false);
                onNavigate('sessions');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '8px 10px',
                background: 'transparent',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                color: 'var(--color-ink-50, #F5F7F5)',
                fontSize: 13,
                textAlign: 'left',
              }}
            >
              <span>Minhas sessões</span>
            </button>
            {onLogout && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setShowUserMenu(false);
                  onLogout();
                }}
                disabled={isLogoutPending}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '8px 10px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  color: '#FF4D57',
                  fontSize: 13,
                  textAlign: 'left',
                }}
              >
                <IconLogOut size={16} />
                <span>Encerrar sessão</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

export default Topbar;
