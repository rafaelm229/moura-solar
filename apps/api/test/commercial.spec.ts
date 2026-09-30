import { describe, expect, it } from 'vitest';

function normalizeDigits(value?: string | null): string {
  return value ? value.replace(/\D/g, '') : '';
}

function normalizeEmail(value?: string | null): string {
  return value ? value.trim().toLowerCase() : '';
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  NOVO: ['QUALIFICADO', 'PERDIDO', 'CANCELADO'],
  QUALIFICADO: ['LEVANTAMENTO', 'PERDIDO', 'CANCELADO'],
  LEVANTAMENTO: ['DIMENSIONAMENTO', 'PERDIDO', 'CANCELADO'],
  DIMENSIONAMENTO: ['PROPOSTA', 'PERDIDO', 'CANCELADO'],
  PROPOSTA: ['NEGOCIACAO', 'PERDIDO', 'CANCELADO'],
  NEGOCIACAO: ['CONTRATACAO', 'PERDIDO', 'CANCELADO'],
  CONTRATACAO: ['VENDIDO', 'CANCELADO'],
  PERDIDO: ['NOVO'],
  CANCELADO: ['NOVO'],
  VENDIDO: [],
};

function canTransition(fromState: string, toState: string): boolean {
  return VALID_TRANSITIONS[fromState]?.includes(toState) ?? false;
}

describe('Commercial Domain Pure Rules', () => {
  describe('Input Normalization', () => {
    it('normalizes CPF/CNPJ by stripping non-digit characters', () => {
      expect(normalizeDigits('123.456.789-01')).toBe('12345678901');
      expect(normalizeDigits('12.345.678/0001-90')).toBe('12345678000190');
      expect(normalizeDigits(null)).toBe('');
      expect(normalizeDigits(undefined)).toBe('');
    });

    it('normalizes email addresses by trimming and lowercasing', () => {
      expect(normalizeEmail('  Rafael@MouraSolar.com.br ')).toBe('rafael@mourasolar.com.br');
      expect(normalizeEmail(null)).toBe('');
      expect(normalizeEmail(undefined)).toBe('');
    });

    it('normalizes phone numbers to pure digits', () => {
      expect(normalizeDigits('+55 (31) 98765-4321')).toBe('5531987654321');
    });
  });

  describe('Opportunity State Machine Validations', () => {
    it('allows valid state transitions defined in SPEC-001', () => {
      expect(canTransition('NOVO', 'QUALIFICADO')).toBe(true);
      expect(canTransition('QUALIFICADO', 'LEVANTAMENTO')).toBe(true);
      expect(canTransition('LEVANTAMENTO', 'DIMENSIONAMENTO')).toBe(true);
      expect(canTransition('DIMENSIONAMENTO', 'PROPOSTA')).toBe(true);
      expect(canTransition('PROPOSTA', 'NEGOCIACAO')).toBe(true);
      expect(canTransition('NEGOCIACAO', 'CONTRATACAO')).toBe(true);
      expect(canTransition('CONTRATACAO', 'VENDIDO')).toBe(true);
      expect(canTransition('NOVO', 'PERDIDO')).toBe(true);
      expect(canTransition('PERDIDO', 'NOVO')).toBe(true);
      expect(canTransition('CANCELADO', 'NOVO')).toBe(true);
    });

    it('rejects invalid or skipped state transitions', () => {
      expect(canTransition('NOVO', 'VENDIDO')).toBe(false);
      expect(canTransition('NOVO', 'PROPOSTA')).toBe(false);
      expect(canTransition('VENDIDO', 'NOVO')).toBe(false);
      expect(canTransition('PERDIDO', 'QUALIFICADO')).toBe(false);
    });
  });

  describe('Gate A (Qualificação) Preconditions', () => {
    function validateGateA(data: {
      confirmedNeedSummary?: string;
      contactsCount: number;
      hasScheduledActivity: boolean;
    }): { valid: boolean; reason?: string } {
      if (!data.confirmedNeedSummary?.trim()) {
        return { valid: false, reason: 'Resumo da necessidade é obrigatório' };
      }
      if (data.contactsCount === 0) {
        return { valid: false, reason: 'Cliente deve ter ao menos um canal de contato' };
      }
      if (!data.hasScheduledActivity) {
        return { valid: false, reason: 'Exige próxima atividade agendada' };
      }
      return { valid: true };
    }

    it('approves when all Gate A requirements are met', () => {
      const result = validateGateA({
        confirmedNeedSummary: 'Sistema residencial 600 kWh/mês',
        contactsCount: 1,
        hasScheduledActivity: true,
      });
      expect(result.valid).toBe(true);
    });

    it('rejects when need summary is missing', () => {
      const result = validateGateA({
        confirmedNeedSummary: '',
        contactsCount: 1,
        hasScheduledActivity: true,
      });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('necessidade');
    });

    it('rejects when customer has no contacts', () => {
      const result = validateGateA({
        confirmedNeedSummary: 'Projeto',
        contactsCount: 0,
        hasScheduledActivity: true,
      });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('canal de contato');
    });

    it('rejects when no follow-up activity is scheduled', () => {
      const result = validateGateA({
        confirmedNeedSummary: 'Projeto',
        contactsCount: 1,
        hasScheduledActivity: false,
      });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('atividade');
    });
  });
});
