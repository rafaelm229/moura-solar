import React, { useState, useEffect } from 'react';
import { NavGroupConfig, ShellUser } from './types';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileNav } from './MobileNav';
import { IconLogOut } from '../Icons';
import './shell.css';

export interface AppShellProps {
  currentPage: string;
  onNavigate: (pageId: string) => void;
  groups: NavGroupConfig[];
  pageTitle: string;
  sectionTitle?: string;
  user?: ShellUser;
  onLogout?: () => void;
  isLogoutPending?: boolean;
  onCreateAction?: (type: string) => void;
  children: React.ReactNode;
}

export function AppShell({
  currentPage,
  onNavigate,
  groups,
  pageTitle,
  sectionTitle,
  user,
  onLogout,
  isLogoutPending,
  onCreateAction,
  children,
}: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getInitials = (name?: string) => {
    if (!name) return 'MS';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = user?.initials || getInitials(user?.name);

  if (isMobile) {
    return (
      <div
        className="shell-container app-layout"
        style={{ minHeight: '100dvh', background: 'var(--color-canvas, #090B0A)' }}
      >
        <a href="#content" className="skip-link">
          Ir para conteúdo
        </a>

        {/* Mobile Topbar */}
        <header
          className="app-header"
          style={{
            height: 56,
            background: 'var(--surface-default, #111412)',
            borderBottom: '1px solid var(--border-subtle, #29302B)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            position: 'sticky',
            top: 0,
            zIndex: 40,
            flexShrink: 0,
            gap: 12,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 10,
                color: 'var(--color-ink-400, #626A65)',
                letterSpacing: '0.05em',
              }}
            >
              MOURA SOLAR
            </div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: 'var(--color-ink-50, #F5F7F5)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {pageTitle}
            </div>
          </div>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              disabled={isLogoutPending}
              aria-label="Sair"
              style={{
                height: 32,
                padding: '0 10px',
                background: 'transparent',
                border: '1px solid var(--border-subtle, #29302B)',
                borderRadius: 6,
                cursor: isLogoutPending ? 'wait' : 'pointer',
                color: 'var(--color-ink-300, #9BA49E)',
                fontSize: 12,
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <IconLogOut size={14} />
              <span>Sair</span>
            </button>
          )}

          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--color-brand-900, #3A3200)',
              color: 'var(--color-solar, #FFD400)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 12,
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
        </header>

        {/* Mobile Main Content */}
        <main id="content" className="shell-main app-content">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileNav
          currentPage={currentPage}
          onNavigate={onNavigate}
          groups={groups}
          user={user}
          onLogout={onLogout}
          isLogoutPending={isLogoutPending}
        />
      </div>
    );
  }

  return (
    <div className="shell-container app-layout">
      <a href="#content" className="skip-link">
        Ir para conteúdo
      </a>

      {/* Desktop / Tablet Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
        currentPage={currentPage}
        onNavigate={onNavigate}
        groups={groups}
        user={user}
        onLogout={onLogout}
      />

      {/* Right Column: Topbar + Content */}
      <div className="shell-content-column">
        <Topbar
          onMenuToggle={() => setSidebarCollapsed((v) => !v)}
          currentPage={currentPage}
          pageTitle={pageTitle}
          sectionTitle={sectionTitle}
          onNavigate={onNavigate}
          user={user}
          onLogout={onLogout}
          isLogoutPending={isLogoutPending}
          onCreateAction={onCreateAction}
        />

        <main id="content" className="shell-main app-content">
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppShell;
