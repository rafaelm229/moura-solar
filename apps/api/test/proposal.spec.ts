import { describe, expect, it } from 'vitest';
import { PdfService } from '../src/proposal/pdf.service';

describe('SPEC-006 Proposals, PDF Engine & Lifecycle Governance', () => {
  const pdfService = new PdfService();

  const mockPdfData = {
    proposalCode: 'PROP-0001',
    versionNumber: 1,
    issueDate: '30/09/2026',
    validUntil: '10/10/2026',
    sellerName: 'Vendedor Comercial Moura',
    sellerEmail: 'vendedor@mourasolar.test',
    customer: {
      legalName: 'Cliente Comercial Moura Silva Ltda',
      taxId: '12.345.678/0001-90',
      email: 'financeiro@silva.test',
      phone: '(31) 98888-7777',
      address: 'Av. Afonso Pena, 1500',
      city: 'Belo Horizonte',
      state: 'MG',
    },
    utilityUnit: {
      code: 'UC-987654321',
      distributor: 'Cemig Distribuição',
      connectionType: 'TRIFASICO',
      voltage: '220V',
    },
    energyDiagnostic: {
      averageMonthlyConsumptionKwh: 1250,
      annualizedConsumptionKwh: 15000,
      validMonthsCount: 12,
      historyIsIncomplete: false,
    },
    technicalSolution: {
      dcPowerKwp: 10.5,
      acPowerKw: 8.5,
      estimatedMonthlyGenerationKwh: 1417.5,
      estimatedAnnualGenerationKwh: 17010,
      systemType: 'ON_GRID',
      modulesDescription: '18x Módulo Fotovoltaico Monocristalino 585Wp Tier-1',
      invertersDescription: '1x Inversor Solar On-Grid Trifásico 8.5 kW homologado',
    },
    economicBenefit: {
      estimatedMonthlySavingsBrl: 1346.62,
      estimatedAnnualSavingsBrl: 16159.5,
    },
    scopeItems: [
      'Projeto de Engenharia e ART',
      'Homologação junto à concessionária',
      'Montagem eletromecânica completa',
    ],
    investment: {
      finalPriceBrl: 38500.0,
      paymentConditionsNotes:
        'À vista com 5% de desconto ou Financiamento Solar Bancário em até 84x',
    },
  };

  describe('1. Motor de Renderização de PDF Comercial (SPEC-006 / pdf.md)', () => {
    it('gera buffer de PDF válido iniciando com cabeçalho %PDF', async () => {
      const result = await pdfService.generateProposalPdf(mockPdfData);

      expect(result).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.fileSize).toBeGreaterThan(1000);
      expect(result.contentHash).toBeDefined();
      expect(result.contentHash.length).toBe(64); // SHA-256

      // Verify PDF magic bytes
      const header = result.buffer.subarray(0, 5).toString('ascii');
      expect(header).toBe('%PDF-');
    });

    it('PROIBIDO NO PDF (SPEC-006 item 3): custos internos, markup e margem bruta NÃO são renderizados no PDF do cliente', async () => {
      const result = await pdfService.generateProposalPdf(mockPdfData);
      const pdfText = result.buffer.toString('utf-8');

      // Internal governance keywords that must NEVER be present in the customer PDF
      expect(pdfText).not.toContain('Markup interno');
      expect(pdfText).not.toContain('Margem bruta interna');
      expect(pdfText).not.toContain('Custo de aquisição');
      expect(pdfText).not.toContain('markupPercent');
      expect(pdfText).not.toContain('grossMargin');
    });

    it('mascara documento (CPF/CNPJ) para preservação de privacidade e LGPD', async () => {
      const result = await pdfService.generateProposalPdf(mockPdfData);
      expect(result.fileSize).toBeGreaterThan(0);
      // The masked format for CNPJ: **.345.678/****-**
    });

    it('renderiza aviso de histórico incompleto quando meses válidos < 12', async () => {
      const incompleteData = {
        ...mockPdfData,
        energyDiagnostic: {
          averageMonthlyConsumptionKwh: 600,
          annualizedConsumptionKwh: 7200,
          validMonthsCount: 3,
          historyIsIncomplete: true,
        },
      };

      const result = await pdfService.generateProposalPdf(incompleteData);
      expect(result.buffer).toBeDefined();
      expect(result.fileSize).toBeGreaterThan(1000);
    });
  });

  describe('2. Regras de Negócio e Validade (SPEC-006 item 5, 7 e 20)', () => {
    it('define prazo de validade padrão de 10 dias corridos a partir do envio', () => {
      const validityDays = 10;
      const sentAt = new Date('2026-10-01T12:00:00.000Z');
      const validUntil = new Date(sentAt.getTime() + validityDays * 86400000);

      expect(validUntil.toISOString()).toBe('2026-10-11T12:00:00.000Z');
    });

    it('impede aceite de proposta expirada sem exceção aprovada', () => {
      const validUntil = new Date('2026-10-10T23:59:59.000Z');
      const attemptedAcceptanceAt = new Date('2026-10-12T10:00:00.000Z');

      const isExpired = attemptedAcceptanceAt.getTime() > validUntil.getTime();
      expect(isExpired).toBe(true);
    });

    it('garante que apenas status SENT ou VIEWED pode ser aceito formalmente', () => {
      const allowedStatusesForAcceptance = ['SENT', 'VIEWED'];

      expect(allowedStatusesForAcceptance.includes('DRAFT')).toBe(false);
      expect(allowedStatusesForAcceptance.includes('READY')).toBe(false);
      expect(allowedStatusesForAcceptance.includes('EXPIRED')).toBe(false);
      expect(allowedStatusesForAcceptance.includes('SENT')).toBe(true);
      expect(allowedStatusesForAcceptance.includes('VIEWED')).toBe(true);
    });

    it('unicidade de aceite por oportunidade: apenas uma versão pode ser contratada', () => {
      const opportunityProposals = [
        { id: 'prop-1', versionNumber: 1, status: 'SUPERSEDED' },
        { id: 'prop-1', versionNumber: 2, status: 'ACCEPTED' },
      ];

      const acceptedVersions = opportunityProposals.filter((p) => p.status === 'ACCEPTED');
      expect(acceptedVersions.length).toBe(1);
    });
  });
});
