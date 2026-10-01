/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { PlaceholderPage } from './PlaceholderPage';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileNav } from './MobileNav';
import { AppShell } from './AppShell';
import { NavGroupConfig } from './types';
import { IconTarget, IconUsers, IconFolder } from '../Icons';

afterEach(() => {
  cleanup();
});

const mockGroups: NavGroupConfig[] = [
  {
    title: 'COMERCIAL',
    items: [
      {
        id: 'customers',
        label: 'Clientes',
        icon: IconUsers,
        path: '/comercial/clientes',
        section: 'Comercial',
      },
      {
        id: 'opportunities',
        label: 'Oportunidades',
        icon: IconTarget,
        path: '/comercial/oportunidades',
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
      },
      {
        id: 'teams',
        label: 'Equipes',
        icon: IconFolder,
        path: '/administracao/equipes',
        section: 'Administração',
      },
    ],
  },
];

const mockUser = {
  name: 'Carlos Mendes',
  email: 'carlos@mourasolar.com.br',
  role: 'Administrador',
  organizationName: 'Moura Solar Matriz',
  initials: 'CM',
};

describe('Shell Components', () => {
  describe('PlaceholderPage', () => {
    it('renders title, description and "Em desenvolvimento" badge', () => {
      render(
        <PlaceholderPage
          title="Agenda Técnica"
          description="Calendário integrado de vistorias e obras."
          icon={<IconTarget size={32} />}
        />,
      );

      const heading = screen.getByRole('heading', { name: 'Agenda Técnica' });
      expect(heading).toBeDefined();
      expect(screen.getByText('Calendário integrado de vistorias e obras.')).toBeDefined();
      expect(screen.getByText('Em desenvolvimento')).toBeDefined();
    });
  });

  describe('Sidebar', () => {
    it('renders brand, navigation groups and user information', () => {
      const onNavigate = vi.fn();
      render(
        <Sidebar
          collapsed={false}
          currentPage="customers"
          onNavigate={onNavigate}
          groups={mockGroups}
          user={mockUser}
        />,
      );

      expect(screen.getByText('MS')).toBeDefined();
      expect(screen.getByText('Moura Solar')).toBeDefined();
      expect(screen.getByRole('button', { name: 'Visão Geral' })).toBeDefined();
      expect(screen.getByText('COMERCIAL')).toBeDefined();
      expect(screen.getByRole('button', { name: 'Clientes' })).toBeDefined();
      expect(screen.getByRole('button', { name: 'Oportunidades' })).toBeDefined();
      expect(screen.getByText('Carlos Mendes')).toBeDefined();
      expect(screen.getByText('Administrador')).toBeDefined();

      fireEvent.click(screen.getByRole('button', { name: 'Oportunidades' }));
      expect(onNavigate).toHaveBeenCalledWith('opportunities');
    });

    it('toggles group items when group header is clicked', () => {
      render(
        <Sidebar
          collapsed={false}
          currentPage="customers"
          onNavigate={vi.fn()}
          groups={mockGroups}
          user={mockUser}
        />,
      );

      expect(screen.getByRole('button', { name: 'Projetos' })).toBeDefined();
      const operacaoToggle = screen.getByRole('button', { name: /OPERAÇÃO/i });
      fireEvent.click(operacaoToggle);
      expect(screen.queryByRole('button', { name: 'Projetos' })).toBeNull();
    });
  });

  describe('Topbar', () => {
    it('renders breadcrumb, search input, notification and action buttons', () => {
      const onMenuToggle = vi.fn();
      const onLogout = vi.fn();

      render(
        <Topbar
          onMenuToggle={onMenuToggle}
          currentPage="customers"
          pageTitle="Clientes"
          sectionTitle="Comercial"
          onNavigate={vi.fn()}
          user={mockUser}
          onLogout={onLogout}
        />,
      );

      expect(screen.getByRole('button', { name: 'Alternar menu lateral' })).toBeDefined();
      expect(screen.getByText('Comercial')).toBeDefined();
      expect(screen.getByText('Clientes')).toBeDefined();
      expect(screen.getByPlaceholderText('Buscar clientes, projetos, propostas...')).toBeDefined();
      expect(screen.getByRole('button', { name: /Criar/i })).toBeDefined();
      expect(screen.getByRole('button', { name: 'Sair' })).toBeDefined();

      fireEvent.click(screen.getByRole('button', { name: 'Alternar menu lateral' }));
      expect(onMenuToggle).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole('button', { name: 'Sair' }));
      expect(onLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe('MobileNav', () => {
    it('renders primary tabs and opens full menu sheet when "Mais" is clicked', () => {
      const onNavigate = vi.fn();
      render(
        <MobileNav
          currentPage="customers"
          onNavigate={onNavigate}
          groups={mockGroups}
          user={mockUser}
        />,
      );

      // Primary tab
      expect(screen.getByRole('button', { name: 'Clientes' })).toBeDefined();

      // Open drawer sheet via summary
      const summary = screen.getByText('Mais');
      expect(summary).toBeDefined();
      fireEvent.click(summary);
      expect(screen.getByText('Menu Moura Solar')).toBeDefined();

      // Click an item in the sheet
      const itemInSheet = screen.getByRole('button', { name: 'Projetos' });
      fireEvent.click(itemInSheet);
      expect(onNavigate).toHaveBeenCalledWith('projetos');
    });
  });

  describe('AppShell', () => {
    it('renders main layout with children and skip-link', () => {
      render(
        <AppShell
          currentPage="customers"
          onNavigate={vi.fn()}
          groups={mockGroups}
          pageTitle="Clientes"
          sectionTitle="Comercial"
          user={mockUser}
        >
          <div data-testid="page-content">Conteúdo da Página</div>
        </AppShell>,
      );

      const link = screen.getByRole('link', { name: 'Ir para conteúdo' });
      expect(link.getAttribute('href')).toBe('#content');
      expect(screen.getByTestId('page-content')).toBeDefined();
    });
  });
});
