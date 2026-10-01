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
import { Dashboard } from '../dashboard/dashboard';

import { AppShell } from '@/ui/shell/AppShell';
import { PlaceholderPage } from '@/ui/shell/PlaceholderPage';
import { NavGroupConfig, ShellUser } from '@/ui/shell/types';
import {
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
  IconLayers,
  IconUser,
} from '@/ui/Icons';

const RAW_GROUPS: NavGroupConfig[] = [
  {
    title: 'COMERCIAL',
    items: [
      {
        id: 'funil',
        label: 'Funil',
        icon: IconTrendingUp,
        path: '/comercial/funil',
        section: 'Comercial',
      },
      {
        id: 'customers',
        label: 'Clientes',
        icon: IconUsers,
        path: '/comercial/clientes',
        section: 'Comercial',
        permission: 'customers:read',
        organization: false,
      },
      {
        id: 'opportunities',
        label: 'Oportunidades',
        icon: IconTarget,
        path: '/comercial/oportunidades',
        section: 'Comercial',
        permission: 'opportunities:read',
        organization: false,
      },
      {
        id: 'activities',
        label: 'Atividades',
        icon: IconActivity,
        path: '/comercial/atividades',
        section: 'Comercial',
        permission: 'activities:manage',
        organization: false,
      },
      {
        id: 'propostas',
        label: 'Propostas',
        icon: IconFileText,
        path: '/comercial/propostas',
        section: 'Comercial',
      },
    ],
  },
  {
    title: 'OPERAÇÃO',
    items: [
      {
        id: 'projetos',
        label: 'Projetos',
        icon: IconFolder,
        path: '/operacao/projetos',
        section: 'Operação',
      },
      {
        id: 'engenharia',
        label: 'Engenharia',
        icon: IconTool,
        path: '/operacao/engenharia',
        section: 'Operação',
      },
      {
        id: 'agenda',
        label: 'Agenda',
        icon: IconCalendar,
        path: '/operacao/agenda',
        section: 'Operação',
      },
      {
        id: 'instalacoes',
        label: 'Instalações',
        icon: IconMapPin,
        path: '/operacao/instalacoes',
        section: 'Operação',
      },
      {
        id: 'pos-venda',
        label: 'Pós-venda',
        icon: IconStar,
        path: '/operacao/pos-venda',
        section: 'Operação',
      },
    ],
  },
  {
    title: 'SUPRIMENTOS',
    items: [
      {
        id: 'estoque',
        label: 'Estoque',
        icon: IconPackage,
        path: '/suprimentos/estoque',
        section: 'Suprimentos',
      },
      {
        id: 'movimentacoes',
        label: 'Movimentações',
        icon: IconLayers,
        path: '/suprimentos/movimentacoes',
        section: 'Suprimentos',
      },
      {
        id: 'compras',
        label: 'Compras',
        icon: IconShoppingCart,
        path: '/suprimentos/compras',
        section: 'Suprimentos',
      },
      {
        id: 'fornecedores',
        label: 'Fornecedores',
        icon: IconUsers,
        path: '/suprimentos/fornecedores',
        section: 'Suprimentos',
      },
    ],
  },
  {
    title: 'FINANCEIRO',
    items: [
      {
        id: 'financial',
        label: 'Visão Financeira',
        icon: IconBarChart2,
        path: '/financeiro',
        section: 'Financeiro',
        permission: 'finance:read',
        organization: false,
      },
      {
        id: 'contas-receber',
        label: 'Contas a Receber',
        icon: IconArrowDown,
        path: '/financeiro/receber',
        section: 'Financeiro',
      },
      {
        id: 'contas-pagar',
        label: 'Contas a Pagar',
        icon: IconArrowUp,
        path: '/financeiro/pagar',
        section: 'Financeiro',
      },
      {
        id: 'comissoes',
        label: 'Comissões',
        icon: IconAward,
        path: '/financeiro/comissoes',
        section: 'Financeiro',
      },
      {
        id: 'fluxo-caixa',
        label: 'Fluxo de Caixa',
        icon: IconTrendingUp,
        path: '/financeiro/fluxo-caixa',
        section: 'Financeiro',
      },
    ],
  },
  {
    title: 'ADMINISTRAÇÃO',
    items: [
      {
        id: 'members',
        label: 'Pessoas',
        icon: IconUsers,
        path: '/administracao/equipe',
        section: 'Administração',
        permission: 'users:manage',
        organization: true,
      },
      {
        id: 'teams',
        label: 'Equipes',
        icon: IconLayers,
        path: '/administracao/equipes',
        section: 'Administração',
        permission: 'teams:manage',
        organization: true,
      },
      {
        id: 'roles',
        label: 'Papéis',
        icon: IconShield,
        path: '/administracao/papeis',
        section: 'Administração',
        permission: 'roles:manage',
        organization: true,
      },
      {
        id: 'audit',
        label: 'Auditoria',
        icon: IconClipboard,
        path: '/administracao/auditoria',
        section: 'Administração',
        permission: 'audit:read',
        organization: false,
      },
      {
        id: 'catalog',
        label: 'Catálogo',
        icon: IconFolder,
        path: '/administracao/catalogo',
        section: 'Administração',
        permission: 'catalog:read',
        organization: false,
      },
      {
        id: 'configuracoes',
        label: 'Configurações',
        icon: IconSettings,
        path: '/administracao/configuracoes',
        section: 'Administração',
      },
      {
        id: 'sessions',
        label: 'Minhas sessões',
        icon: IconUser,
        path: '/conta/sessoes',
        section: 'Administração',
        permission: 'sessions:read_own',
        organization: false,
      },
    ],
  },
];

const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Visão Geral',
  funil: 'Funil Comercial',
  customers: 'Clientes',
  opportunities: 'Oportunidades',
  activities: 'Atividades',
  propostas: 'Propostas Comerciais',
  projetos: 'Projetos Operacionais',
  engenharia: 'Engenharia & Projetos',
  agenda: 'Agenda Técnica',
  instalacoes: 'Instalações em Campo',
  'pos-venda': 'Pós-Venda & Operação',
  estoque: 'Estoque & Almoxarifado',
  movimentacoes: 'Movimentações de Materiais',
  compras: 'Gestão de Compras',
  fornecedores: 'Fornecedores & Distribuidores',
  financial: 'Visão Financeira',
  'contas-receber': 'Contas a Receber',
  'contas-pagar': 'Contas a Pagar',
  comissoes: 'Comissões de Vendas',
  'fluxo-caixa': 'Fluxo de Caixa Consolidado',
  members: 'Pessoas',
  teams: 'Equipes',
  roles: 'Papéis',
  audit: 'Auditoria',
  configuracoes: 'Configurações',
  catalog: 'Catálogo',
  sessions: 'Minhas sessões',
};

const PAGE_SECTIONS: Record<string, string> = {
  dashboard: 'Visão Geral',
  funil: 'Comercial',
  customers: 'Comercial',
  opportunities: 'Comercial',
  activities: 'Comercial',
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
  financial: 'Financeiro',
  'contas-receber': 'Financeiro',
  'contas-pagar': 'Financeiro',
  comissoes: 'Financeiro',
  'fluxo-caixa': 'Financeiro',
  members: 'Administração',
  teams: 'Administração',
  roles: 'Administração',
  audit: 'Administração',
  configuracoes: 'Administração',
  catalog: 'Administração',
  sessions: 'Conta',
};

const PATH_TO_PAGE_ID: Record<string, string> = {
  '/': 'sessions',
  '/dashboard': 'dashboard',
  '/comercial/funil': 'funil',
  '/comercial/clientes': 'customers',
  '/comercial/oportunidades': 'opportunities',
  '/comercial/atividades': 'activities',
  '/comercial/propostas': 'propostas',
  '/operacao/projetos': 'projetos',
  '/operacao/engenharia': 'engenharia',
  '/operacao/agenda': 'agenda',
  '/operacao/instalacoes': 'instalacoes',
  '/operacao/pos-venda': 'pos-venda',
  '/suprimentos/estoque': 'estoque',
  '/suprimentos/movimentacoes': 'movimentacoes',
  '/suprimentos/compras': 'compras',
  '/suprimentos/fornecedores': 'fornecedores',
  '/financeiro': 'financial',
  '/financeiro/receber': 'contas-receber',
  '/financeiro/pagar': 'contas-pagar',
  '/financeiro/comissoes': 'comissoes',
  '/financeiro/fluxo-caixa': 'fluxo-caixa',
  '/administracao/equipe': 'members',
  '/administracao/equipes': 'teams',
  '/administracao/papeis': 'roles',
  '/administracao/auditoria': 'audit',
  '/administracao/configuracoes': 'configuracoes',
  '/administracao/catalogo': 'catalog',
  '/conta/sessoes': 'sessions',
};

const PAGE_ID_TO_PATH: Record<string, string> = {
  dashboard: '/dashboard',
  funil: '/comercial/funil',
  customers: '/comercial/clientes',
  opportunities: '/comercial/oportunidades',
  activities: '/comercial/atividades',
  propostas: '/comercial/propostas',
  projetos: '/operacao/projetos',
  engenharia: '/operacao/engenharia',
  agenda: '/operacao/agenda',
  instalacoes: '/operacao/instalacoes',
  'pos-venda': '/operacao/pos-venda',
  estoque: '/suprimentos/estoque',
  movimentacoes: '/suprimentos/movimentacoes',
  compras: '/suprimentos/compras',
  fornecedores: '/suprimentos/fornecedores',
  financial: '/financeiro',
  'contas-receber': '/financeiro/receber',
  'contas-pagar': '/financeiro/pagar',
  comissoes: '/financeiro/comissoes',
  'fluxo-caixa': '/financeiro/fluxo-caixa',
  members: '/administracao/equipe',
  teams: '/administracao/equipes',
  roles: '/administracao/papeis',
  audit: '/administracao/auditoria',
  configuracoes: '/administracao/configuracoes',
  catalog: '/administracao/catalogo',
  sessions: '/conta/sessoes',
};

const ALL_DESTINATIONS = [
  { id: 'dashboard', permission: undefined },
  { id: 'funil', permission: undefined },
  { id: 'sessions', permission: 'sessions:read_own', organization: false },
  { id: 'members', permission: 'users:manage', organization: true },
  { id: 'teams', permission: 'teams:manage', organization: true },
  { id: 'audit', permission: 'audit:read', organization: false },
  { id: 'customers', permission: 'customers:read', organization: false },
  { id: 'opportunities', permission: 'opportunities:read', organization: false },
  { id: 'activities', permission: 'activities:manage', organization: false },
  { id: 'financial', permission: 'finance:read', organization: false },
  { id: 'catalog', permission: 'catalog:read', organization: false },
  { id: 'roles', permission: 'roles:manage', organization: true },
  { id: 'propostas', permission: undefined },
  { id: 'projetos', permission: undefined },
  { id: 'engenharia', permission: undefined },
  { id: 'agenda', permission: undefined },
  { id: 'instalacoes', permission: undefined },
  { id: 'pos-venda', permission: undefined },
  { id: 'estoque', permission: undefined },
  { id: 'movimentacoes', permission: undefined },
  { id: 'compras', permission: undefined },
  { id: 'fornecedores', permission: undefined },
  { id: 'contas-receber', permission: undefined },
  { id: 'contas-pagar', permission: undefined },
  { id: 'comissoes', permission: undefined },
  { id: 'fluxo-caixa', permission: undefined },
  { id: 'configuracoes', permission: undefined },
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
    if (next === tab || canLeave()) {
      setTab(next);
      const targetPath = PAGE_ID_TO_PATH[next];
      if (targetPath && typeof window !== 'undefined' && window.location.pathname !== targetPath) {
        window.history.pushState({ tab: next }, '', targetPath);
      }
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const currentPath = window.location.pathname;
    const pageIdFromPath = PATH_TO_PAGE_ID[currentPath];
    if (pageIdFromPath) {
      setTab(pageIdFromPath);
    }
    const onPopState = () => {
      const nextId = PATH_TO_PAGE_ID[window.location.pathname];
      if (nextId) setTab(nextId);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
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
        onLogin={(ctx) => {
          client.removeQueries({ predicate: (query) => query.queryKey[0] !== 'me' });
          client.setQueryData(['me'], ctx);
        }}
      />
    );

  const context = me.data;

  const groups: NavGroupConfig[] = RAW_GROUPS.map((group) => ({
    title: group.title,
    items: group.items.filter((item) => {
      if (!item.permission) return true;
      return allows(context, item.permission, item.organization);
    }),
  })).filter((group) => group.items.length > 0);

  const user: ShellUser = {
    name: context.name,
    email: context.email,
    role: context.roleName || 'Colaborador',
    organizationName: context.organizationName,
  };

  const currentDestination = ALL_DESTINATIONS.find((d) => d.id === tab);
  const permitted = currentDestination
    ? !currentDestination.permission ||
      allows(context, currentDestination.permission, currentDestination.organization)
    : true;

  const pageTitle = PAGE_TITLES[tab] || 'Visão Geral';
  const sectionTitle = PAGE_SECTIONS[tab] || 'Moura Solar';

  return (
    <AppShell
      currentPage={tab}
      onNavigate={switchTab}
      groups={groups}
      pageTitle={pageTitle}
      sectionTitle={sectionTitle}
      user={user}
      onLogout={() => {
        if (canLeave()) logout.mutate();
      }}
      isLogoutPending={logout.isPending}
      onCreateAction={(type) => switchTab(type)}
    >
      <Feedback error={logout.error} />

      {!permitted ? (
        <section>
          <h1>Sem permissão</h1>
          <p>Escolha uma área disponível no menu.</p>
        </section>
      ) : (
        <>
          {tab === 'dashboard' && <Dashboard onNavigate={switchTab} />}

          {tab === 'customers' && (
            <Customers
              onCreateOpportunity={(customer) => {
                setPreselectedCustomerId(customer.id);
                switchTab('opportunities');
              }}
            />
          )}

          {(tab === 'opportunities' || tab === 'funil') && (
            <Opportunities
              initialCustomerId={preselectedCustomerId}
              onCreated={() => setPreselectedCustomerId(undefined)}
            />
          )}

          {tab === 'activities' && <Activities />}
          {tab === 'financial' && <GlobalFinancialDashboard />}
          {tab === 'catalog' && <Catalog />}
          {tab === 'sessions' && <Sessions onLogout={logoutLocal} />}
          {tab === 'members' && <Members />}
          {tab === 'roles' && <Roles />}
          {tab === 'teams' && <Teams />}
          {tab === 'audit' && <AuditTrail />}

          {tab === 'propostas' && (
            <PlaceholderPage
              title="Propostas Comerciais"
              description="Gerenciamento e emissão de propostas comerciais integradas ao fluxo da oportunidade. Selecione uma oportunidade no Funil para emitir propostas."
              icon={<IconFileText size={32} />}
            />
          )}

          {tab === 'projetos' && (
            <PlaceholderPage
              title="Projetos Operacionais"
              description="Acompanhamento de cronograma físico-financeiro, etapas de homologação e obras."
              icon={<IconFolder size={32} />}
            />
          )}

          {tab === 'engenharia' && (
            <PlaceholderPage
              title="Engenharia & Projetos"
              description="Dimensionamentos avançados, emissão de ARTs, laudos técnicos e documentação."
              icon={<IconTool size={32} />}
            />
          )}

          {tab === 'agenda' && (
            <PlaceholderPage
              title="Agenda Técnica"
              description="Calendário unificado de vistorias, instalações em campo e reuniões com clientes."
              icon={<IconCalendar size={32} />}
            />
          )}

          {tab === 'instalacoes' && (
            <PlaceholderPage
              title="Instalações em Campo"
              description="Controle de equipes técnicas, checklists de instalação e relatórios fotográficos."
              icon={<IconMapPin size={32} />}
            />
          )}

          {tab === 'pos-venda' && (
            <PlaceholderPage
              title="Pós-Venda & Operação"
              description="Monitoramento de geração de energia, gestão de garantias e manutenções preventivas."
              icon={<IconStar size={32} />}
            />
          )}

          {tab === 'estoque' && (
            <PlaceholderPage
              title="Estoque & Almoxarifado"
              description="Controle de módulos, inversores, estruturas, cabos e materiais auxiliares."
              icon={<IconPackage size={32} />}
            />
          )}

          {tab === 'movimentacoes' && (
            <PlaceholderPage
              title="Movimentações de Materiais"
              description="Histórico de entradas, saídas para obra, transferências e baixas de estoque."
              icon={<IconLayers size={32} />}
            />
          )}

          {tab === 'compras' && (
            <PlaceholderPage
              title="Gestão de Compras"
              description="Solicitações de compra, cotações com distribuidores solares e ordens de compra."
              icon={<IconShoppingCart size={32} />}
            />
          )}

          {tab === 'fornecedores' && (
            <PlaceholderPage
              title="Fornecedores & Distribuidores"
              description="Cadastro de fabricantes, condições comerciais, tabelas de preço e avaliação de fornecedores."
              icon={<IconUsers size={32} />}
            />
          )}

          {tab === 'contas-receber' && (
            <PlaceholderPage
              title="Contas a Receber"
              description="Controle de parcelas, emissão de boletos, conciliação e inadimplência por projeto."
              icon={<IconArrowDown size={32} />}
            />
          )}

          {tab === 'contas-pagar' && (
            <PlaceholderPage
              title="Contas a Pagar"
              description="Controle de notas fiscais de fornecedores, pagamentos a instaladores e despesas operacionais."
              icon={<IconArrowUp size={32} />}
            />
          )}

          {tab === 'comissoes' && (
            <PlaceholderPage
              title="Comissões de Vendas"
              description="Cálculo e liquidação de comissões de consultores, representantes e canais."
              icon={<IconAward size={32} />}
            />
          )}

          {tab === 'fluxo-caixa' && (
            <PlaceholderPage
              title="Fluxo de Caixa Consolidado"
              description="Projeções financeiras, saldos previstos vs realizados e indicadores de liquidez."
              icon={<IconTrendingUp size={32} />}
            />
          )}

          {tab === 'configuracoes' && (
            <PlaceholderPage
              title="Configurações da Plataforma"
              description="Parâmetros operacionais, integrações com concessionárias e preferências do sistema."
              icon={<IconSettings size={32} />}
            />
          )}
        </>
      )}
    </AppShell>
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
