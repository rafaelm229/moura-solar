import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { MobileNav } from './components/MobileNav';

import Dashboard from './pages/Dashboard';
import Funil from './pages/Funil';
import Clientes from './pages/Clientes';
import Propostas from './pages/Propostas';
import Projetos from './pages/Projetos';
import Financeiro from './pages/Financeiro';
import Estoque from './pages/Estoque';
import Configuracoes from './pages/Configuracoes';
import PlaceholderPage from './pages/PlaceholderPage';

import {
  IconTarget,
  IconActivity,
  IconTool,
  IconCalendar,
  IconMapPin,
  IconStar,
  IconLayers,
  IconShoppingCart,
  IconUsers,
  IconArrowDown,
  IconArrowUp,
  IconAward,
  IconTrendingUp,
  IconShield,
  IconClipboard,
} from './components/Icons';

const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Visão Geral',
  funil: 'Funil Comercial',
  clientes: 'Clientes',
  oportunidades: 'Oportunidades',
  atividades: 'Atividades',
  propostas: 'Propostas',
  projetos: 'Projetos',
  engenharia: 'Engenharia',
  agenda: 'Agenda',
  instalacoes: 'Instalações',
  'pos-venda': 'Pós-venda',
  estoque: 'Estoque',
  movimentacoes: 'Movimentações',
  compras: 'Compras',
  fornecedores: 'Fornecedores',
  financeiro: 'Financeiro',
  'contas-receber': 'Contas a Receber',
  'contas-pagar': 'Contas a Pagar',
  comissoes: 'Comissões',
  'fluxo-caixa': 'Fluxo de Caixa',
  equipe: 'Equipe',
  papeis: 'Papéis e Permissões',
  auditoria: 'Auditoria',
  configuracoes: 'Configurações',
};

function renderPage(page: string): React.ReactNode {
  switch (page) {
    case 'dashboard':
      return <Dashboard />;
    case 'funil':
      return <Funil />;
    case 'clientes':
      return <Clientes />;
    case 'propostas':
      return <Propostas />;
    case 'projetos':
      return <Projetos />;
    case 'financeiro':
      return <Financeiro />;
    case 'estoque':
      return <Estoque />;
    case 'configuracoes':
      return <Configuracoes />;

    case 'oportunidades':
      return (
        <PlaceholderPage
          title="Oportunidades"
          description="Gerencie todas as oportunidades de negócio do funil comercial em um só lugar."
          icon={<IconTarget size={32} />}
        />
      );
    case 'atividades':
      return (
        <PlaceholderPage
          title="Atividades"
          description="Acompanhe ligações, reuniões, e-mails e tarefas da equipe comercial."
          icon={<IconActivity size={32} />}
        />
      );
    case 'engenharia':
      return (
        <PlaceholderPage
          title="Engenharia"
          description="Dimensionamentos, ARTs, laudos técnicos e documentação de projetos."
          icon={<IconTool size={32} />}
        />
      );
    case 'agenda':
      return (
        <PlaceholderPage
          title="Agenda"
          description="Calendário de instalações, visitas técnicas e reuniões da equipe."
          icon={<IconCalendar size={32} />}
        />
      );
    case 'instalacoes':
      return (
        <PlaceholderPage
          title="Instalações"
          description="Controle de equipes em campo, checklist de instalação e registro fotográfico."
          icon={<IconMapPin size={32} />}
        />
      );
    case 'pos-venda':
      return (
        <PlaceholderPage
          title="Pós-venda"
          description="Monitoramento de geração, garantias, manutenções e satisfação do cliente."
          icon={<IconStar size={32} />}
        />
      );
    case 'movimentacoes':
      return (
        <PlaceholderPage
          title="Movimentações"
          description="Histórico de entradas, saídas, transferências e consumo de materiais."
          icon={<IconLayers size={32} />}
        />
      );
    case 'compras':
      return (
        <PlaceholderPage
          title="Compras"
          description="Solicitações de compra, cotações com fornecedores e ordens de compra."
          icon={<IconShoppingCart size={32} />}
        />
      );
    case 'fornecedores':
      return (
        <PlaceholderPage
          title="Fornecedores"
          description="Cadastro e avaliação de fornecedores, condições de pagamento e contratos."
          icon={<IconUsers size={32} />}
        />
      );
    case 'contas-receber':
      return (
        <PlaceholderPage
          title="Contas a Receber"
          description="Parcelas, boletos e controle de recebimentos por projeto e cliente."
          icon={<IconArrowDown size={32} />}
        />
      );
    case 'contas-pagar':
      return (
        <PlaceholderPage
          title="Contas a Pagar"
          description="Faturas de fornecedores, despesas operacionais e agendamento de pagamentos."
          icon={<IconArrowUp size={32} />}
        />
      );
    case 'comissoes':
      return (
        <PlaceholderPage
          title="Comissões"
          description="Cálculo automático e histórico de comissões por vendedor e período."
          icon={<IconAward size={32} />}
        />
      );
    case 'fluxo-caixa':
      return (
        <PlaceholderPage
          title="Fluxo de Caixa"
          description="Projeção de entradas e saídas, saldo disponível e planejamento financeiro."
          icon={<IconTrendingUp size={32} />}
        />
      );
    case 'equipe':
      return (
        <PlaceholderPage
          title="Equipe"
          description="Cadastro de colaboradores, funções, metas e desempenho individual."
          icon={<IconUsers size={32} />}
        />
      );
    case 'papeis':
      return (
        <PlaceholderPage
          title="Papéis e Permissões"
          description="Configure os níveis de acesso e permissões para cada perfil de usuário."
          icon={<IconShield size={32} />}
        />
      );
    case 'auditoria':
      return (
        <PlaceholderPage
          title="Auditoria"
          description="Registro completo de ações, alterações e acessos ao sistema."
          icon={<IconClipboard size={32} />}
        />
      );
    default:
      return (
        <PlaceholderPage
          title={PAGE_TITLES[page] || page}
          description="Esta página está em desenvolvimento."
          icon={<IconTarget size={32} />}
        />
      );
  }
}

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const pageTitle = PAGE_TITLES[currentPage] || currentPage;

  if (isMobile) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          background: '#090B0A',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Mobile topbar */}
        <div
          style={{
            height: 56,
            background: '#111412',
            borderBottom: '1px solid #29302B',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            position: 'sticky',
            top: 0,
            zIndex: 40,
            flexShrink: 0,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: '#626A65', letterSpacing: 0.5 }}>MOURA SOLAR</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#F5F7F5' }}>{pageTitle}</div>
          </div>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: '#3A3200',
              color: '#FFD400',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            CM
          </div>
        </div>

        {/* Mobile content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, paddingBottom: 96 }}>
          {renderPage(currentPage)}
        </div>

        {/* Mobile bottom nav */}
        <MobileNav currentPage={currentPage} onNavigate={setCurrentPage} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100dvh', background: '#090B0A', overflow: 'hidden' }}>
      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
        currentPage={currentPage}
        onNavigate={setCurrentPage}
      />

      {/* Right column */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        {/* Topbar */}
        <Topbar
          onMenuToggle={() => setSidebarCollapsed((v) => !v)}
          currentPage={currentPage}
          pageTitle={pageTitle}
          onNavigate={setCurrentPage}
        />

        {/* Main content */}
        <main style={{ flex: 1, overflowY: 'auto', background: '#090B0A', padding: 24 }}>
          {renderPage(currentPage)}
        </main>
      </div>
    </div>
  );
}
