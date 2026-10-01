import React from 'react';
import { NavGroupConfig, NavItemConfig, ShellUser } from './types';
import { IconGrid, IconX } from '../Icons';

export interface MobileNavProps {
  currentPage: string;
  onNavigate: (pageId: string) => void;
  groups: NavGroupConfig[];
  user?: ShellUser;
  onLogout?: () => void;
  isLogoutPending?: boolean;
}

const MOBILE_PRIORITY_ORDER = [
  'sessions',
  'members',
  'teams',
  'audit',
  'customers',
  'opportunities',
  'activities',
  'financial',
  'catalog',
  'roles',
];

export function MobileNav({ currentPage, onNavigate, groups }: MobileNavProps) {
  // Collect all unique available items from groups
  const allItemsMap = new Map<string, NavItemConfig>();
  for (const group of groups) {
    for (const item of group.items) {
      if (!allItemsMap.has(item.id)) {
        allItemsMap.set(item.id, item);
      }
    }
  }

  // Sort available items according to priority order
  const prioritizedItems: NavItemConfig[] = [];
  for (const id of MOBILE_PRIORITY_ORDER) {
    const item = allItemsMap.get(id);
    if (item) {
      prioritizedItems.push(item);
      allItemsMap.delete(id);
    }
  }
  // Append remaining items (roadmap and other modules)
  for (const item of allItemsMap.values()) {
    prioritizedItems.push(item);
  }

  // First 3 items become primary tabs; remaining go into "Mais"
  const primaryTabs = prioritizedItems.slice(0, 3);
  const primaryIds = new Set(primaryTabs.map((t) => t.id));
  const moreItems = prioritizedItems.slice(3);

  const isMoreActive = moreItems.some((m) => m.id === currentPage);

  const handleItemClick = (pageId: string, event: React.MouseEvent) => {
    onNavigate(pageId);
    event.currentTarget.closest('details')?.removeAttribute('open');
  };

  return (
    <nav
      aria-label="Navegação móvel"
      className="mobile-nav"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 64,
        background: 'var(--surface-default, #111412)',
        borderTop: '1px solid var(--border-subtle, #29302B)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 40,
        padding: '0 8px',
        boxSizing: 'border-box',
      }}
    >
      {/* Primary bottom bar tabs */}
      {primaryTabs.map((item) => {
        const active = currentPage === item.id;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id)}
            aria-current={active ? 'page' : undefined}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              height: '100%',
              background: 'transparent',
              border: 'none',
              color: active ? 'var(--color-solar, #FFD400)' : 'var(--color-ink-300, #9BA49E)',
              cursor: 'pointer',
              fontSize: 10,
              fontWeight: active ? 600 : 400,
              gap: 4,
              padding: '4px 0',
              transition: 'color 0.15s',
            }}
          >
            <Icon size={20} />
            <span>{item.label}</span>
          </button>
        );
      })}

      {/* "Mais" dropdown drawer using native details/summary */}
      {moreItems.length > 0 && (
        <details className="mobile-more-details" style={{ flex: 1, height: '100%' }}>
          <summary
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              background: 'transparent',
              border: 'none',
              color: isMoreActive ? 'var(--color-solar, #FFD400)' : 'var(--color-ink-300, #9BA49E)',
              cursor: 'pointer',
              fontSize: 10,
              fontWeight: isMoreActive ? 600 : 400,
              gap: 4,
              listStyle: 'none',
              userSelect: 'none',
              padding: '4px 0',
            }}
          >
            <IconGrid size={20} />
            <span>Mais</span>
          </summary>

          {/* Backdrop */}
          <div
            className="mobile-more-backdrop"
            onClick={(e) => {
              e.currentTarget.closest('details')?.removeAttribute('open');
            }}
          />

          {/* Sheet panel */}
          <div className="mobile-more" role="region" aria-label="Mais opções">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: 12,
                borderBottom: '1px solid var(--border-subtle, #29302B)',
                marginBottom: 16,
              }}
            >
              <div>
                <div
                  style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-ink-50, #F5F7F5)' }}
                >
                  Menu Moura Solar
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-ink-400, #626A65)' }}>
                  Módulos adicionais
                </div>
              </div>
              <button
                type="button"
                aria-label="Fechar menu"
                onClick={(e) => {
                  e.currentTarget.closest('details')?.removeAttribute('open');
                }}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'var(--surface-card, #161A17)',
                  border: '1px solid var(--border-subtle, #29302B)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-ink-300, #9BA49E)',
                  cursor: 'pointer',
                }}
              >
                <IconX size={18} />
              </button>
            </div>

            {/* Render grouped items that are NOT in primary tabs */}
            {groups.map((group) => {
              const itemsInGroup = group.items.filter((item) => !primaryIds.has(item.id));
              if (itemsInGroup.length === 0) return null;

              return (
                <div key={group.title} style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--color-ink-400, #626A65)',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      marginBottom: 8,
                    }}
                  >
                    {group.title}
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                      gap: 8,
                    }}
                  >
                    {itemsInGroup.map((item) => {
                      const active = currentPage === item.id;
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={(e) => handleItemClick(item.id, e)}
                          aria-current={active ? 'page' : undefined}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '10px 12px',
                            background: active
                              ? 'var(--color-brand-900, #3A3200)'
                              : 'var(--surface-card, #161A17)',
                            border: `1px solid ${active ? 'var(--color-solar, #FFD400)' : 'var(--border-subtle, #29302B)'}`,
                            borderRadius: 8,
                            color: active
                              ? 'var(--color-solar, #FFD400)'
                              : 'var(--color-ink-50, #F5F7F5)',
                            fontSize: 13,
                            fontWeight: active ? 600 : 400,
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          <Icon size={18} />
                          <span
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {item.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </details>
      )}
    </nav>
  );
}

export default MobileNav;
