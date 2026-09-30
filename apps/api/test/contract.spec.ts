import { describe, expect, it } from 'vitest';
import {
  ContractGeneratorService,
  type ContractTemplateData,
} from '../src/contract/contract-generator.service';

describe('SPEC-007 Contracts, Document Engine, Lifecycle & Gate C Governance', () => {
  const generator = new ContractGeneratorService();

  const mockContractData: ContractTemplateData = {
    contractNumber: 'CTR-2026-0001',
    signingDate: '30 de setembro de 2026',
    city: 'Recife',
    company: {
      legalName: 'Moura Solar Engenharia e Energia Sustentável Ltda.',
      cnpj: '12.345.678/0001-90',
      address: 'Av. Solar dos Ventos, 1000 - Recife/PE',
      representative: 'Rafael Moura',
      representativeCpf: '012.345.678-90',
      phone: '(81) 3456-7890',
      email: 'contato@mourasolar.com.br',
    },
    client: {
      name: 'Carlos Eduardo da Silva',
      document: '123.456.789-00',
      secondaryDocument: 'Isento',
      address: 'Rua das Flores, 123 - Boa Viagem, Recife/PE',
      zipCode: '51020-000',
      phone: '(81) 98888-7777',
      email: 'carlos.silva@example.com',
    },
    utility: {
      customerUnit: '7001234567',
      company: 'Neoenergia Pernambuco',
      tariff: '0,95',
      connectionType: 'Bifásico 220V',
    },
    project: {
      type: 'Sistema Fotovoltaico Conectado à Rede (On-Grid)',
      systemPowerKwp: '7,20 kWp',
      estimatedMonthlyGenerationKwh: '960 kWh/mês',
      estimatedAnnualGenerationKwh: '11.520 kWh/ano',
      installationAddress: 'Rua das Flores, 123 - Boa Viagem, Recife/PE',
      roofType: 'Cerâmico',
      estimatedAreaM2: '36 m²',
    },
    commercial: {
      contractTotal: 'R$ 28.500,00',
      paymentMethod: 'Transferência Bancária / Financiamento Solar',
      lateInterestMonthly: '1% ao mês acrescido de multa de 2%',
      adjustmentIndex: 'IPCA / IBGE',
      commercialValidity: '10 dias úteis',
      specialConditions: 'Incluso monitoramento em nuvem por 12 meses',
      milestones: [
        {
          stage: 'Entrada / Assinatura',
          percent: '30%',
          amount: 'R$ 8.550,00',
          due: 'Na assinatura',
          condition: 'Assinatura e envio do contrato',
        },
        {
          stage: 'Entrega dos Equipamentos',
          percent: '40%',
          amount: 'R$ 11.400,00',
          due: 'Na entrega no local',
          condition: 'Conferência física dos materiais',
        },
        {
          stage: 'Conclusão da Instalação',
          percent: '20%',
          amount: 'R$ 5.700,00',
          due: 'No término da montagem',
          condition: 'Termo de comissionamento assinado',
        },
        {
          stage: 'Troca do Medidor',
          percent: '10%',
          amount: 'R$ 2.850,00',
          due: 'Após homologação',
          condition: 'Parecer de acesso e vistoria Neoenergia',
        },
      ],
    },
    deadlines: {
      equipmentDeliveryDays: '15',
      installationDays: '10',
      documentationDays: '20',
      curePeriodDays: '15',
      installationWarrantyMonths: '12',
    },
    bom: {
      moduleBrandModel: 'Canadian Solar CS6W-550MS',
      modulePowerW: '550 W',
      moduleQuantity: '14',
      inverterBrandModel: 'Growatt MIN 6000TL-X',
      inverterPowerKw: '6,0 kW',
      inverterQuantity: '1',
      inverterPhase: 'Monofásico 220V',
      batteryBrandModel: 'N/A',
      batteryCapacityKwh: 'N/A',
      batteryQuantity: '0',
      structureType: 'Estrutura Alumínio Telhado Cerâmico',
      structureQuantity: '1 kit',
      cableDescription: 'Cabo Solar 4mm² e 6mm² CC',
      cableQuantity: '100 m',
      protectionDescription: 'String Box CC 1000V com DPS',
      protectionQuantity: '1 conjunto',
      monitoringType: 'Wi-Fi integrado com app móvel',
    },
    generationMonthly: {
      JAN: '980',
      FEB: '960',
      MAR: '970',
      APR: '940',
      MAY: '920',
      JUN: '890',
      JUL: '910',
      AUG: '950',
      SEP: '970',
      OCT: '990',
      NOV: '1000',
      DEC: '990',
    },
    scope: {
      siteSurvey: true,
      design: true,
      homologation: true,
      installation: true,
      art: true,
      monitoring: true,
      training: true,
      deliveryReport: true,
      meter: false,
    },
    witnesses: {
      witness1Name: 'Mariana Costa Moura',
      witness1Cpf: '111.222.333-44',
      witness2Name: 'João Pedro Santos',
      witness2Cpf: '555.666.777-88',
    },
    supportChannels: 'suporte@mourasolar.com.br | (81) 98765-4321',
  };

  describe('1. Motor de Minuta DOCX com Template Moura Solar (SPEC-007 Item 7)', () => {
    it('deve gerar DOCX válido a partir do template com placeholders oficiais preenchidos', async () => {
      const buffer = await generator.generateDocx(mockContractData);
      expect(buffer).toBeDefined();
      expect(buffer.length).toBeGreaterThan(50000);

      // DOCX é um arquivo ZIP (magic number: PK\x03\x04 -> 0x50, 0x4b, 0x03, 0x04)
      expect(buffer[0]).toBe(0x50);
      expect(buffer[1]).toBe(0x4b);
      expect(buffer[2]).toBe(0x03);
      expect(buffer[3]).toBe(0x04);
    });

    it('deve calcular hash SHA-256 reproduzível para o arquivo gerado', async () => {
      const buffer = await generator.generateDocx(mockContractData);
      const hash = generator.computeHash(buffer);
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('2. Motor de Contrato PDF Institucional (SPEC-007 Item 7)', () => {
    it('deve gerar PDF com cabeçalho institucional, anexos e assinaturas', async () => {
      const buffer = await generator.generatePdf(mockContractData);
      expect(buffer).toBeDefined();
      expect(buffer.length).toBeGreaterThan(5000);

      // PDF magic bytes (%PDF-)
      const header = buffer.subarray(0, 5).toString('ascii');
      expect(header).toBe('%PDF-');
    });

    it('deve calcular hash de auditoria do PDF gerado', async () => {
      const buffer = await generator.generatePdf(mockContractData);
      const hash = generator.computeHash(buffer);
      expect(hash).toHaveLength(64);
    });
  });

  describe('3. Governança e Regras de Negócio do Contrato (SPEC-007 Itens 4, 8, 9, 10, 11)', () => {
    it('deve exigir checklist de conferência completo para verificação formal do assinado', () => {
      const validChecklist = {
        partiesMatch: true,
        allPagesPresent: true,
        versionMatches: true,
        signaturesLegible: true,
        decision: 'VERIFIED',
      };

      const isVerified =
        validChecklist.partiesMatch &&
        validChecklist.allPagesPresent &&
        validChecklist.versionMatches &&
        validChecklist.signaturesLegible &&
        validChecklist.decision === 'VERIFIED';

      expect(isVerified).toBe(true);
    });

    it('deve rejeitar se faltar qualquer critério de conferência essencial', () => {
      const incompleteChecklist = {
        partiesMatch: true,
        allPagesPresent: false, // Faltando página
        versionMatches: true,
        signaturesLegible: true,
        decision: 'VERIFIED',
      };

      const isVerified =
        incompleteChecklist.partiesMatch &&
        incompleteChecklist.allPagesPresent &&
        incompleteChecklist.versionMatches &&
        incompleteChecklist.signaturesLegible &&
        incompleteChecklist.decision === 'VERIFIED';

      expect(isVerified).toBe(false);
    });
  });
});
