'use client';
import { useEffect, useState } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { api, result, allows, ApiFailure } from './client';
import { Login, AcceptAccess } from './login';
import { Members } from './members';
import { Roles } from './roles';
import { Sessions } from './sessions';
import { Teams } from './teams';
import { AuditTrail } from './audit';
import { Feedback } from './feedback';
import { Customers } from '../commercial/customers';
import { Opportunities } from '../commercial/opportunities';
import { Activities } from '../commercial/activities';
import { Catalog } from '../design/catalog';
import { GlobalFinancialDashboard } from '../financial/financial';
import { InventoryManagement } from '../inventory/inventory';
import { EngineeringManagement } from '../engineering/engineering';
import { AfterSalesManagement } from '../after-sales/after-sales';
import { AutomationsManagement } from '../automations/automations';
import { Icon, type IconName } from '../../components/icons/material-symbol';

export interface Destination {
  id: string;
  label: string;
  permission: string;
  organization: boolean;
  icon: IconName;
}

const destinations: Destination[] = [
  { id: 'sessions', label: 'Minhas sessões', permission: 'sessions:read_own', organization: false, icon: 'verified' },
  { id: 'members', label: 'Pessoas', permission: 'users:manage', organization: true, icon: 'person' },
  { id: 'teams', label: 'Equipes', permission: 'teams:manage', organization: true, icon: 'business' },
  { id: 'audit', label: 'Auditoria', permission: 'audit:read', organization: false, icon: 'history' },
  { id: 'customers', label: 'Clientes', permission: 'customers:read', organization: false, icon: 'person' },
  {
    id: 'opportunities',
    label: 'Oportunidades',
    permission: 'opportunities:read',
    organization: false,
    icon: 'trending_up',
  },
  { id: 'activities', label: 'Atividades', permission: 'activities:manage', organization: false, icon: 'checklist' },
  { id: 'financial', label: 'Financeiro', permission: 'finance:read', organization: false, icon: 'payments' },
  {
    id: 'inventory',
    label: 'Estoque & Compras',
    permission: 'inventory:read',
    organization: false,
    icon: 'inventory_2',
  },
  {
    id: 'engineering',
    label: 'Engenharia & Obras',
    permission: 'engineering:read',
    organization: false,
    icon: 'engineering',
  },
  {
    id: 'after_sales',
    label: 'Pós-Venda & Garantias',
    permission: 'after_sales:read',
    organization: false,
    icon: 'verified',
  },
  {
    id: 'automations',
    label: 'Gestão & Automações',
    permission: 'indicators:read',
    organization: false,
    icon: 'bolt',
  },
  { id: 'catalog', label: 'Catálogo', permission: 'catalog:read', organization: false, icon: 'solar_power' },
  { id: 'roles', label: 'Papéis', permission: 'roles:manage', organization: true, icon: 'badge' },
];
function Application() {
  const client = useQueryClient();
  const [tab, setTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const tabParam = searchParams.get('tab');
      if (tabParam && destinations.some((d) => d.id === tabParam)) {
        return tabParam;
      }
    }
    return 'sessions';
  });
  const [preselectedCustomerId, setPreselectedCustomerId] = useState<string | undefined>(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      return searchParams.get('customerId') || undefined;
    }
    return undefined;
  });
  const [returnToTab, setReturnToTab] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const tabParam = searchParams.get('tab');
      const returnParam = searchParams.get('returnTo');
      if (tabParam && destinations.some((d) => d.id === tabParam)) {
        return tabParam;
      }
      if (returnParam) {
        try {
          const parsed = new URL(returnParam, window.location.origin);
          const t = parsed.searchParams.get('tab');
          if (t && destinations.some((d) => d.id === t)) return t;
        } catch {
          // ignore
        }
      }
    }
    return null;
  });
  const [accessToken, setAccessToken] = useState('');

  const canLeave = () =>
    !document.querySelector('form[data-dirty="true"]') ||
    window.confirm('Descartar alterações ainda não salvas?');

  const switchTab = (next: string, updateHistory = true, customerId?: string) => {
    if (next === tab && customerId === preselectedCustomerId) return;
    if (canLeave()) {
      setTab(next);
      if (customerId !== undefined) {
        setPreselectedCustomerId(customerId);
      } else if (next !== 'opportunities') {
        setPreselectedCustomerId(undefined);
      }

      if (updateHistory && typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        if (next === 'sessions') {
          url.searchParams.delete('tab');
        } else {
          url.searchParams.set('tab', next);
        }
        if (customerId) {
          url.searchParams.set('customerId', customerId);
        } else {
          url.searchParams.delete('customerId');
        }
        window.history.pushState({ tab: next, customerId: customerId || null }, '', url.toString());
      }
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const tabParam = searchParams.get('tab') || 'sessions';
      const custParam = searchParams.get('customerId') || undefined;
      if (destinations.some((d) => d.id === tabParam)) {
        setTab(tabParam);
        setPreselectedCustomerId(custParam);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const protect = (event: BeforeUnloadEvent) => {
      if (document.querySelector('form[data-dirty="true"]')) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', protect);
    return () => window.removeEventListener('beforeunload', protect);
  }, []);

  useEffect(() => {
    const fragment = new URLSearchParams(location.hash.slice(1));
    setAccessToken(fragment.get('access') ?? '');
  }, []);

  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => result(api.GET('/api/v1/identity/me')),
    retry: false,
    refetchOnWindowFocus: true,
  });

  const logoutLocal = () => {
    client.removeQueries({ predicate: (query) => query.queryKey[0] !== 'me' });
    client.setQueryData(['me'], null);
    setTab('sessions');
    setPreselectedCustomerId(undefined);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('tab');
      url.searchParams.delete('customerId');
      url.searchParams.delete('returnTo');
      window.history.replaceState({}, '', url.toString());
    }
  };

  const logout = useMutation({
    mutationFn: () => result(api.POST('/api/v1/identity/logout')),
    onSuccess: logoutLocal,
  });

  if (accessToken)
    return (
      <AcceptAccess
        token={accessToken}
        onDone={() => {
          setAccessToken('');
          logoutLocal();
        }}
      />
    );

  if (me.isPending)
    return (
      <main className="auth-layout">
        <p role="status">Verificando sua sessão…</p>
      </main>
    );

  if (me.error && !(me.error instanceof ApiFailure && me.error.status === 401))
    return (
      <main className="auth-layout">
        <section className="auth-card">
          <h1>Não foi possível verificar seu acesso</h1>
          <Feedback error={me.error} />
          <button onClick={() => void me.refetch()}>Tentar novamente</button>
        </section>
      </main>
    );

  if (!me.data || me.error)
    return (
      <Login
        onLogin={(context) => {
          client.removeQueries({ predicate: (query) => query.queryKey[0] !== 'me' });
          client.setQueryData(['me'], context);
          if (
            returnToTab &&
            destinations.some((d) => d.id === returnToTab && allows(context, d.permission, d.organization))
          ) {
            switchTab(returnToTab, true);
            setReturnToTab(null);
          }
        }}
      />
    );

  const context = me.data;
  const navigation = destinations.filter((item) =>
    allows(context, item.permission, item.organization),
  );
  const permitted = navigation.some((item) => item.id === tab);

  // Role-oriented mobile shortcut priorities (A-03, UX-08)
  const isSeller = allows(context, 'customers:read', false) && !allows(context, 'users:manage', true);
  const isFinancial = allows(context, 'finance:read', false) && !allows(context, 'users:manage', true);
  const isInventory = allows(context, 'inventory:read', false) && !allows(context, 'users:manage', true);

  let primaryMobileIds: string[];
  if (isSeller) {
    primaryMobileIds = ['sessions', 'customers', 'opportunities', 'activities'];
  } else if (isFinancial) {
    primaryMobileIds = ['sessions', 'financial', 'customers', 'opportunities'];
  } else if (isInventory) {
    primaryMobileIds = ['sessions', 'inventory', 'catalog', 'activities'];
  } else {
    // Admin / Management / General:
    primaryMobileIds = ['sessions', 'members', 'teams', 'opportunities'];
  }

  const mobilePrimary = navigation
    .filter((item) => primaryMobileIds.includes(item.id))
    .sort((a, b) => primaryMobileIds.indexOf(a.id) - primaryMobileIds.indexOf(b.id))
    .slice(0, 3);

  const mobileMore = navigation.filter(
    (item) => !mobilePrimary.some((prim) => prim.id === item.id),
  );

  return (
    <div className="app-layout">
      <header className="app-header">
        <a href="#content" className="skip-link">
          Ir para conteúdo
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <strong style={{ color: '#087443', fontSize: '1.125rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Moura Solar
          </strong>
          <span
            style={{
              fontSize: '0.75rem',
              backgroundColor: '#e6f4ea',
              color: '#087443',
              padding: '0.2rem 0.6rem',
              borderRadius: '9999px',
              fontWeight: 600,
            }}
          >
            {context.organizationName}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
            {context.name}
          </span>
          <button
            type="button"
            className="btn btn--secondary"
            disabled={logout.isPending}
            onClick={() => {
              if (canLeave()) logout.mutate();
            }}
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.8125rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <Icon name="close" size={14} /> Sair
          </button>
        </div>
      </header>
      <nav className="app-nav desktop-nav" aria-label="Navegação principal">
        {navigation.map((item) => (
          <button
            key={item.id}
            aria-current={tab === item.id ? 'page' : undefined}
            onClick={() => switchTab(item.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem',
              textAlign: 'left',
            }}
          >
            <Icon name={item.icon} size={18} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <nav className="mobile-nav" aria-label="Navegação móvel">
        {mobilePrimary.map((item) => (
          <button
            key={item.id}
            aria-current={tab === item.id ? 'page' : undefined}
            onClick={() => switchTab(item.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
            }}
          >
            <Icon name={item.icon} size={16} />
            <span>{item.label}</span>
          </button>
        ))}
        {mobileMore.length > 0 && (
          <details>
            <summary>Mais</summary>
            <div
              className="mobile-more"
              style={{
                maxHeight: '70vh',
                overflowY: 'auto',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              }}
            >
              {mobileMore.map((item) => (
                <button
                  key={item.id}
                  onClick={(event) => {
                    switchTab(item.id);
                    event.currentTarget.closest('details')?.removeAttribute('open');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    textAlign: 'left',
                  }}
                >
                  <Icon name={item.icon} size={16} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </details>
        )}
      </nav>
      <main id="content" className="app-content">
        <Feedback error={logout.error} />
        {!permitted ? (
          <section>
            <h1>Sem permissão</h1>
            <p>Escolha uma área disponível no menu.</p>
          </section>
        ) : (
          <>
            {tab === 'customers' && (
              <Customers
                onCreateOpportunity={(customer) => {
                  switchTab('opportunities', true, customer.id);
                }}
              />
            )}
            {tab === 'opportunities' && (
              <Opportunities
                initialCustomerId={preselectedCustomerId}
                onCreated={() => {
                  setPreselectedCustomerId(undefined);
                  if (typeof window !== 'undefined') {
                    const url = new URL(window.location.href);
                    url.searchParams.delete('customerId');
                    window.history.replaceState({ tab: 'opportunities' }, '', url.toString());
                  }
                }}
              />
            )}
            {tab === 'activities' && <Activities />}
            {tab === 'financial' && <GlobalFinancialDashboard />}
            {tab === 'inventory' && <InventoryManagement />}
            {tab === 'engineering' && <EngineeringManagement />}
            {tab === 'after_sales' && <AfterSalesManagement />}
            {tab === 'automations' && <AutomationsManagement />}
            {tab === 'catalog' && <Catalog />}
            {tab === 'sessions' && <Sessions onLogout={logoutLocal} />}
            {tab === 'members' && <Members />}
            {tab === 'roles' && <Roles />}
            {tab === 'teams' && <Teams />}
            {tab === 'audit' && <AuditTrail />}
          </>
        )}
      </main>
    </div>
  );
}
export function Workspace() {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <Application />
    </QueryClientProvider>
  );
}
