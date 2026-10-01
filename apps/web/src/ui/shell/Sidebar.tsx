import React, { useState } from 'react';
import { NavGroupConfig, NavItemConfig, ShellUser } from './types';
import { IconHome, IconChevronDown, IconChevronRight } from '../Icons';

export interface SidebarProps {
  collapsed: boolean;
  onToggle?: () => void;
  currentPage: string;
  onNavigate: (pageId: string) => void;
  groups: NavGroupConfig[];
  user?: ShellUser;
  onLogout?: () => void;
}

export function Sidebar({ collapsed, currentPage, onNavigate, groups, user }: SidebarProps) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.map((g) => [g.title, true])),
  );

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const getInitials = (name?: string) => {
    if (!name) return 'MS';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = user?.initials || getInitials(user?.name);

  return (
    <aside
      className={`shell-sidebar ${collapsed ? 'shell-sidebar-collapsed' : ''}`}
      aria-label="Navegação lateral"
      style={{
        width: collapsed ? 64 : 264,
        minWidth: collapsed ? 64 : 264,
        height: '100vh',
        background: 'var(--surface-default, #111412)',
        borderRight: '1px solid var(--border-subtle, #29302B)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition:
          'width 0.25s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        flexShrink: 0,
        zIndex: 30,
      }}
    >
      {/* Brand / Logo */}
      <div
        className="shell-sidebar-brand"
        style={{
          height: 72,
          display: 'flex',
          alignItems: 'center',
          padding: collapsed ? '0 14px' : '0 20px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderBottom: '1px solid var(--border-subtle, #29302B)',
          flexShrink: 0,
          gap: 12,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            background: 'var(--color-solar, #FFD400)',
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
          <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <div
              style={{
                color: 'var(--color-ink-50, #F5F7F5)',
                fontWeight: 700,
                fontSize: 15,
                lineHeight: 1.2,
              }}
            >
              Moura Solar
            </div>
            <div style={{ color: 'var(--color-ink-400, #626A65)', fontSize: 11 }}>CRM / ERP</div>
          </div>
        )}
      </div>

      {/* Nav List */}
      <nav
        className="shell-sidebar-nav"
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingTop: 8,
          paddingBottom: 8,
        }}
      >
        {/* Standalone Visão Geral */}
        <div style={{ marginBottom: 4 }}>
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            title={collapsed ? 'Visão Geral' : undefined}
            aria-current={currentPage === 'dashboard' ? 'page' : undefined}
            className={`shell-nav-item ${currentPage === 'dashboard' ? 'active' : ''}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: collapsed ? 0 : 12,
              justifyContent: collapsed ? 'center' : 'flex-start',
              padding: collapsed ? '8px' : '8px 12px',
              margin: '1px 8px',
              borderRadius: 8,
              width: collapsed ? 48 : 'calc(100% - 16px)',
              background:
                currentPage === 'dashboard' ? 'var(--color-brand-900, #3A3200)' : 'transparent',
              color:
                currentPage === 'dashboard'
                  ? 'var(--color-solar, #FFD400)'
                  : 'var(--color-ink-300, #9BA49E)',
              border: 'none',
              borderLeft:
                currentPage === 'dashboard'
                  ? '2px solid var(--color-solar, #FFD400)'
                  : '2px solid transparent',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: currentPage === 'dashboard' ? 600 : 400,
              transition: 'background 0.15s, color 0.15s',
              whiteSpace: 'nowrap',
              textAlign: 'left',
              boxSizing: 'border-box',
            }}
          >
            <IconHome size={18} />
            {!collapsed && <span>Visão Geral</span>}
          </button>
        </div>

        {/* Groups */}
        {groups.map((group) => {
          if (!group.items || group.items.length === 0) return null;
          const isOpen = openGroups[group.title] !== false;

          return (
            <div key={group.title} style={{ marginBottom: 4 }}>
              {!collapsed && (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.title)}
                  className="shell-group-header"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '6px 16px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--color-ink-400, #626A65)',
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginTop: 8,
                    textAlign: 'left',
                  }}
                >
                  <span>{group.title}</span>
                  {isOpen ? <IconChevronDown size={12} /> : <IconChevronRight size={12} />}
                </button>
              )}

              {(collapsed || isOpen) &&
                group.items.map((item: NavItemConfig) => {
                  const active = currentPage === item.id;
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onNavigate(item.id)}
                      title={collapsed ? item.label : undefined}
                      aria-current={active ? 'page' : undefined}
                      className={`shell-nav-item ${active ? 'active' : ''}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: collapsed ? 0 : 12,
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        padding: collapsed ? '8px' : '8px 12px',
                        margin: '1px 8px',
                        borderRadius: 8,
                        width: collapsed ? 48 : 'calc(100% - 16px)',
                        background: active ? 'var(--color-brand-900, #3A3200)' : 'transparent',
                        color: active
                          ? 'var(--color-solar, #FFD400)'
                          : 'var(--color-ink-300, #9BA49E)',
                        border: 'none',
                        borderLeft: active
                          ? '2px solid var(--color-solar, #FFD400)'
                          : '2px solid transparent',
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: active ? 600 : 400,
                        transition: 'background 0.15s, color 0.15s',
                        whiteSpace: 'nowrap',
                        textAlign: 'left',
                        boxSizing: 'border-box',
                      }}
                    >
                      <Icon size={18} />
                      {!collapsed && (
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                          {item.label}
                        </span>
                      )}
                      {!collapsed && item.badge && (
                        <span
                          style={{
                            fontSize: 10,
                            padding: '2px 6px',
                            borderRadius: 10,
                            background: 'rgba(255, 212, 0, 0.15)',
                            color: 'var(--color-solar, #FFD400)',
                            fontWeight: 600,
                          }}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          );
        })}
      </nav>

      {/* User Footer */}
      <div
        className="shell-sidebar-user"
        style={{
          borderTop: '1px solid var(--border-subtle, #29302B)',
          padding: collapsed ? '12px 8px' : '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
          justifyContent: collapsed ? 'center' : 'flex-start',
          background: 'var(--surface-default, #111412)',
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'var(--color-brand-900, #3A3200)',
            color: 'var(--color-solar, #FFD400)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 13,
            flexShrink: 0,
          }}
        >
          {initials}
        </div>
        {!collapsed && (
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div
              style={{
                color: 'var(--color-ink-50, #F5F7F5)',
                fontSize: 13,
                fontWeight: 500,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user?.name || 'Usuário'}
            </div>
            <div
              style={{
                color: 'var(--color-ink-400, #626A65)',
                fontSize: 11,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user?.role || user?.organizationName || 'Moura Solar'}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
