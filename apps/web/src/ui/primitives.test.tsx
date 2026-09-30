/** @vitest-environment jsdom */
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
import {
  Badge,
  Button,
  Card,
  FormField,
  IconButton,
  IconSun,
  Input,
  MetricCard,
  Separator,
  Skeleton,
} from './index';

describe('Button primitive', () => {
  it('renders primary button by default with correct text', () => {
    render(<Button>Confirmar Ação</Button>);
    const button = screen.getByRole('button', { name: /confirmar ação/i });
    expect(button).toBeDefined();
    expect(button.className).toContain('ui-button--primary');
    expect(button.className).toContain('ui-button--default');
    expect(button.getAttribute('disabled')).toBeNull();
  });

  it('renders variants and sizes', () => {
    const { rerender } = render(
      <Button variant="danger" size="compact">
        Excluir
      </Button>,
    );
    let button = screen.getByRole('button', { name: /excluir/i });
    expect(button.className).toContain('ui-button--danger');
    expect(button.className).toContain('ui-button--compact');

    rerender(
      <Button variant="secondary" size="field" fullWidth>
        Cancelar
      </Button>,
    );
    button = screen.getByRole('button', { name: /cancelar/i });
    expect(button.className).toContain('ui-button--secondary');
    expect(button.className).toContain('ui-button--field');
    expect(button.className).toContain('ui-button--full-width');
  });

  it('handles loading state with aria-busy and disables interaction', () => {
    render(<Button isLoading>Processando</Button>);
    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.getAttribute('disabled')).toBeDefined();
    expect(screen.getByRole('status', { name: /carregando/i })).toBeDefined();
  });

  it('renders icons on left and right', () => {
    render(
      <Button
        iconLeft={<span data-testid="left-icon">L</span>}
        iconRight={<span data-testid="right-icon">R</span>}
      >
        Com Ícones
      </Button>,
    );
    expect(screen.getByTestId('left-icon')).toBeDefined();
    expect(screen.getByTestId('right-icon')).toBeDefined();
  });
});

describe('IconButton primitive', () => {
  it('enforces aria-label and renders with square aspect-ratio styling', () => {
    render(<IconButton icon={<IconSun size={18} />} aria-label="Configurar sistema solar" />);
    const button = screen.getByRole('button', { name: /configurar sistema solar/i });
    expect(button).toBeDefined();
    expect(button.className).toContain('ui-icon-button');
  });
});

describe('Badge primitive', () => {
  it('renders with semantic status variants and accessible text', () => {
    const { rerender } = render(<Badge variant="success">Aprovado</Badge>);
    let badge = screen.getByText('Aprovado');
    expect(badge.closest('.ui-badge')?.className).toContain('ui-badge--success');

    rerender(
      <Badge variant="warning" dot>
        Em Revisão
      </Badge>,
    );
    badge = screen.getByText('Em Revisão');
    expect(badge.closest('.ui-badge')?.className).toContain('ui-badge--warning');
    expect(badge.closest('.ui-badge')?.querySelector('.ui-badge__dot')).toBeDefined();

    rerender(<Badge variant="solar">Ativo</Badge>);
    badge = screen.getByText('Ativo');
    expect(badge.closest('.ui-badge')?.className).toContain('ui-badge--solar');
  });
});

describe('Card & MetricCard primitive', () => {
  it('renders Card with padding and interactive option', () => {
    const { container } = render(
      <Card padding="lg" interactive as="article">
        <p>Conteúdo do cartão</p>
      </Card>,
    );
    const card = container.querySelector('article');
    expect(card).toBeDefined();
    expect(card?.className).toContain('ui-card--padding-lg');
    expect(card?.className).toContain('ui-card--interactive');
  });

  it('renders MetricCard with tabular numerals and change indicator', () => {
    render(
      <MetricCard
        title="Geração Mensal"
        value="4.500 kWh"
        change={{ value: '12%', trend: 'positive' }}
        subtitle="vs. mês anterior"
      />,
    );
    expect(screen.getByText('Geração Mensal')).toBeDefined();
    expect(screen.getByText('4.500 kWh')).toBeDefined();
    expect(screen.getByText('+12%')).toBeDefined();
    expect(screen.getByText('vs. mês anterior')).toBeDefined();
  });

  it('renders Skeleton when MetricCard is loading', () => {
    const { container } = render(
      <MetricCard title="Receita Estimada" value="R$ 150.000" loading />,
    );
    expect(container.querySelector('.ui-skeleton')).toBeDefined();
    expect(screen.queryByText('R$ 150.000')).toBeNull();
  });
});

describe('Input and FormField primitive', () => {
  it('connects label, input, description and error through ARIA attributes', () => {
    render(
      <FormField
        id="client-name"
        label="Nome do Cliente"
        description="Digite o nome completo conforme documento"
        error="Campo obrigatório"
        required
      >
        <Input placeholder="Ex: João da Silva" />
      </FormField>,
    );

    const label = screen.getByText(/nome do cliente/i);
    expect(label.getAttribute('for')).toBe('client-name');

    const input = screen.getByPlaceholderText('Ex: João da Silva');
    expect(input.getAttribute('id')).toBe('client-name');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.className).toContain('ui-input--error');

    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).toContain('client-name-description');
    expect(describedBy).toContain('client-name-error');

    const errorAlert = screen.getByRole('alert');
    expect(errorAlert.textContent).toContain('Campo obrigatório');
  });
});

describe('Skeleton primitive', () => {
  it('renders placeholder with aria-hidden and custom dimensions', () => {
    const { container } = render(<Skeleton width={200} height={24} borderRadius="4px" />);
    const skeleton = container.querySelector('.ui-skeleton') as HTMLElement;
    expect(skeleton).toBeDefined();
    expect(skeleton.getAttribute('aria-hidden')).toBe('true');
    expect(skeleton.style.width).toBe('200px');
    expect(skeleton.style.height).toBe('24px');
    expect(skeleton.style.borderRadius).toBe('4px');
  });
});

describe('Separator primitive', () => {
  it('renders with role separator and orientation', () => {
    const { rerender } = render(<Separator orientation="horizontal" />);
    let separator = screen.getByRole('separator');
    expect(separator.getAttribute('aria-orientation')).toBe('horizontal');
    expect(separator.className).toContain('ui-separator--horizontal');

    rerender(<Separator orientation="vertical" subtle />);
    separator = screen.getByRole('separator');
    expect(separator.getAttribute('aria-orientation')).toBe('vertical');
    expect(separator.className).toContain('ui-separator--vertical');
    expect(separator.className).toContain('ui-separator--subtle');
  });
});

describe('Icons primitive', () => {
  it('renders decorative icon with aria-hidden="true" by default', () => {
    const { container } = render(<IconSun size={24} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('role')).toBeNull();
  });

  it('renders accessible icon with role="img" when ariaLabel is provided', () => {
    render(<IconSun size={24} ariaLabel="Energia Solar Ativa" />);
    const icon = screen.getByRole('img', { name: /energia solar ativa/i });
    expect(icon).toBeDefined();
    expect(icon.getAttribute('aria-hidden')).toBeNull();
  });
});
