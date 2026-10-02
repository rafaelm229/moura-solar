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

const destinations = [
  { id: 'sessions', label: 'Minhas sessões', permission: 'sessions:read_own', organization: false },
  { id: 'members', label: 'Pessoas', permission: 'users:manage', organization: true },
  { id: 'teams', label: 'Equipes', permission: 'teams:manage', organization: true },
  { id: 'audit', label: 'Auditoria', permission: 'audit:read', organization: false },
  { id: 'customers', label: 'Clientes', permission: 'customers:read', organization: false },
  {
    id: 'opportunities',
    label: 'Oportunidades',
    permission: 'opportunities:read',
    organization: false,
  },
  { id: 'activities', label: 'Atividades', permission: 'activities:manage', organization: false },
  { id: 'financial', label: 'Financeiro', permission: 'finance:read', organization: false },
  {
    id: 'inventory',
    label: 'Estoque & Compras',
    permission: 'inventory:read',
    organization: false,
  },
  {
    id: 'engineering',
    label: 'Engenharia & Obras',
    permission: 'engineering:read',
    organization: false,
  },
  {
    id: 'after_sales',
    label: 'Pós-Venda & Garantias',
    permission: 'after_sales:read',
    organization: false,
  },
  {
    id: 'automations',
    label: 'Gestão & Automações',
    permission: 'indicators:read',
    organization: false,
  },
  { id: 'catalog', label: 'Catálogo', permission: 'catalog:read', organization: false },
  { id: 'roles', label: 'Papéis', permission: 'roles:manage', organization: true },
];
function Application() {
  const client = useQueryClient();
  const [tab, setTab] = useState('sessions');
  const [preselectedCustomerId, setPreselectedCustomerId] = useState<string | undefined>(undefined);
  const [accessToken, setAccessToken] = useState('');
  const canLeave = () =>
    !document.querySelector('form[data-dirty="true"]') ||
    window.confirm('Descartar alterações ainda não salvas?');
  const switchTab = (next: string) => {
    if (next === tab || canLeave()) setTab(next);
  };
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
        }}
      />
    );
  const context = me.data;
  const navigation = destinations.filter((item) =>
    allows(context, item.permission, item.organization),
  );
  const permitted = navigation.some((item) => item.id === tab);
  return (
    <div className="app-layout">
      <header className="app-header">
        <a href="#content" className="skip-link">
          Ir para conteúdo
        </a>
        <div>
          <strong>Moura Solar</strong>
          <p>{context.organizationName}</p>
        </div>
        <div>
          <span>{context.name}</span>
          <button
            disabled={logout.isPending}
            onClick={() => {
              if (canLeave()) logout.mutate();
            }}
          >
            Sair
          </button>
        </div>
      </header>
      <nav className="app-nav desktop-nav" aria-label="Navegação principal">
        {navigation.map((item) => (
          <button
            key={item.id}
            aria-current={tab === item.id ? 'page' : undefined}
            onClick={() => switchTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <nav className="mobile-nav" aria-label="Navegação móvel">
        {navigation.slice(0, 3).map((item) => (
          <button
            key={item.id}
            aria-current={tab === item.id ? 'page' : undefined}
            onClick={() => switchTab(item.id)}
          >
            {item.label}
          </button>
        ))}
        {navigation.length > 3 && (
          <details>
            <summary>Mais</summary>
            <div className="mobile-more">
              {navigation.slice(3).map((item) => (
                <button
                  key={item.id}
                  onClick={(event) => {
                    switchTab(item.id);
                    event.currentTarget.closest('details')?.removeAttribute('open');
                  }}
                >
                  {item.label}
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
                  setPreselectedCustomerId(customer.id);
                  switchTab('opportunities');
                }}
              />
            )}
            {tab === 'opportunities' && (
              <Opportunities
                initialCustomerId={preselectedCustomerId}
                onCreated={() => setPreselectedCustomerId(undefined)}
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
