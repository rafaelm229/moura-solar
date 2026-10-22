import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const _PDFDocument = require('pdfkit');
const PDFDocument: any = _PDFDocument.default ?? _PDFDocument;

const connectionTypeLabels: Record<string, string> = {
  MONOPHASIC: 'monofásica',
  BIPHASIC: 'bifásica',
  TRIPHASIC: 'trifásica',
};

function resolveAssetPath(subpath: string): string {
  const candidates = [
    join(process.cwd(), subpath),
    join(process.cwd(), 'apps/api', subpath),
    join(process.cwd(), '..', subpath),
    join(__dirname, '../../', subpath),
    join(__dirname, '../../../apps/api', subpath),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return candidates[0] ?? subpath;
}

export interface ProposalPdfData {
  proposalCode: string;
  versionNumber: number;
  issueDate: string;
  validUntil: string;
  sellerName: string;
  sellerEmail?: string;
  sellerPhone?: string;

  customer: {
    legalName: string;
    taxId: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
  };

  utilityUnit: {
    code: string;
    distributor: string;
    connectionType: string;
    voltage: string;
  };

  energyDiagnostic: {
    averageMonthlyConsumptionKwh: number;
    annualizedConsumptionKwh: number;
    validMonthsCount: number;
    historyIsIncomplete: boolean;
  };

  technicalSolution: {
    dcPowerKwp: number;
    acPowerKw: number;
    estimatedMonthlyGenerationKwh: number;
    estimatedAnnualGenerationKwh: number;
    systemType: string;
    modulesDescription: string;
    invertersDescription: string;
  };

  economicBenefit: {
    estimatedMonthlySavingsBrl: number;
    estimatedAnnualSavingsBrl: number;
  };

  scopeItems: string[];

  investment: {
    finalPriceBrl: number;
    paymentConditionsNotes?: string;
  };
}

export interface GeneratedPdfResult {
  buffer: Buffer;
  contentHash: string;
  fileSize: number;
}

@Injectable()
export class PdfService {
  async generateProposalPdf(data: ProposalPdfData): Promise<GeneratedPdfResult> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 40, bottom: 40, left: 45, right: 45 },
          info: {
            Title: `Proposta Comercial Moura Solar - ${data.proposalCode} - Versão ${data.versionNumber}`,
            Author: 'Moura Solar Engenharia Fotovoltaica',
            Subject: 'Proposta Comercial de Sistema de Geração de Energia Solar Fotovoltaica',
            Keywords: 'solar, energia solar, proposta, sustentabilidade',
          },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const contentHash = createHash('sha256').update(buffer).digest('hex');
          resolve({
            buffer,
            contentHash,
            fileSize: buffer.length,
          });
        });

        doc.on('error', (err: Error) => {
          reject(err);
        });

        // Brand colors
        const primaryColor = '#0e8345';
        const primaryDark = '#084d28';
        const accentOrange = '#d96b00';
        const textDark = '#1a202c';
        const textMuted = '#4a5568';
        const lightBg = '#f7fafc';
        const borderColor = '#e2e8f0';

        // --- 1. HEADER ---
        doc.rect(45, 40, 505, 4).fill(primaryColor);

        try {
          const logoPath = resolveAssetPath('assets/moura-solar-logo.png');
          if (existsSync(logoPath)) {
            doc.image(logoPath, 45, 50, { width: 50 });
          }
        } catch {
          // Ignored
        }

        doc
          .fontSize(16)
          .font('Helvetica-Bold')
          .fillColor(primaryDark)
          .text('MOURA SOLAR', 105, 52, { continued: true });
        doc
          .fontSize(8.5)
          .font('Helvetica')
          .fillColor(textMuted)
          .text('  |  ENGENHARIA E ENERGIA FOTOVOLTAICA');

        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor(primaryColor)
          .text('PROPOSTA COMERCIAL INSTITUCIONAL', 105, 70);

        // Document Meta Box
        const metaY = 55;
        doc
          .fontSize(8)
          .font('Helvetica-Bold')
          .fillColor(textDark)
          .text(`PROPOSTA: ${data.proposalCode} (Versão ${data.versionNumber})`, 330, metaY, {
            align: 'right',
            width: 220,
          });
        doc
          .font('Helvetica')
          .fillColor(textMuted)
          .text(`Emissão: ${data.issueDate}`, 330, metaY + 12, { align: 'right', width: 220 });
        doc
          .font('Helvetica-Bold')
          .fillColor(accentOrange)
          .text(`Validade da Proposta: até ${data.validUntil}`, 330, metaY + 24, {
            align: 'right',
            width: 220,
          });

        doc.y = 110;

        // --- 2. CLIENTE E LOCAL DE INSTALAÇÃO ---
        this.renderSectionHeader(doc, '1. DADOS DO CLIENTE E DO LOCAL', primaryDark);

        doc.rect(45, doc.y, 505, 62).fillAndStroke(lightBg, borderColor);
        const clientBoxY = doc.y + 8;

        doc.fontSize(9).font('Helvetica-Bold').fillColor(textDark);
        doc.text(`Cliente: ${data.customer.legalName}`, 55, clientBoxY);
        doc
          .font('Helvetica')
          .fillColor(textMuted)
          .text(`Documento: ${this.maskTaxId(data.customer.taxId)}`, 55, clientBoxY + 14);
        if (data.customer.email || data.customer.phone) {
          doc.text(
            `Contato: ${[data.customer.phone, data.customer.email].filter(Boolean).join(' • ')}`,
            55,
            clientBoxY + 28,
          );
        }
        if (data.customer.address || data.customer.city) {
          doc.text(
            `Endereço: ${[data.customer.address, data.customer.city, data.customer.state].filter(Boolean).join(', ')}`,
            55,
            clientBoxY + 42,
          );
        }

        // UC info on the right
        doc.font('Helvetica-Bold').fillColor(textDark);
        doc.text(`Unidade Consumidora (UC): ${data.utilityUnit.code}`, 320, clientBoxY);
        doc
          .font('Helvetica')
          .fillColor(textMuted)
          .text(`Concessionária: ${data.utilityUnit.distributor}`, 320, clientBoxY + 14);
        doc.text(
          `Ligação: ${connectionTypeLabels[data.utilityUnit.connectionType] ?? data.utilityUnit.connectionType} (${data.utilityUnit.voltage})`,
          320,
          clientBoxY + 28,
        );
        doc.text(`Consultor Comercial: ${data.sellerName}`, 320, clientBoxY + 42);

        doc.y = clientBoxY + 62;
        doc.moveDown(0.8);

        // --- 3. DIAGNÓSTICO ENERGÉTICO ---
        this.renderSectionHeader(doc, '2. DIAGNÓSTICO ENERGÉTICO', primaryDark);

        const diagY = doc.y;
        doc.rect(45, diagY, 245, 52).fillAndStroke(lightBg, borderColor);
        doc.rect(305, diagY, 245, 52).fillAndStroke(lightBg, borderColor);

        doc
          .fontSize(8)
          .font('Helvetica')
          .fillColor(textMuted)
          .text('CONSUMO MÉDIO MENSAL', 55, diagY + 8);
        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .fillColor(primaryColor)
          .text(
            `${data.energyDiagnostic.averageMonthlyConsumptionKwh.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kWh/mês`,
            55,
            diagY + 20,
          );
        doc
          .fontSize(7.5)
          .font('Helvetica')
          .fillColor(textMuted)
          .text(
            `Baseado em ${data.energyDiagnostic.validMonthsCount} competências analisadas`,
            55,
            diagY + 36,
          );

        doc
          .fontSize(8)
          .font('Helvetica')
          .fillColor(textMuted)
          .text('CONSUMO ANUALIZADO ESTIMADO', 315, diagY + 8);
        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .fillColor(textDark)
          .text(
            `${data.energyDiagnostic.annualizedConsumptionKwh.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kWh/ano`,
            315,
            diagY + 20,
          );
        doc
          .fontSize(7.5)
          .font('Helvetica')
          .fillColor(textMuted)
          .text('Demanda estimada de consumo para 12 meses', 315, diagY + 36);

        doc.y = diagY + 58;

        if (data.energyDiagnostic.historyIsIncomplete) {
          doc.rect(45, doc.y, 505, 20).fillAndStroke('#fffaf0', '#fbd38d');
          doc
            .fontSize(7.5)
            .font('Helvetica-Bold')
            .fillColor(accentOrange)
            .text(
              `Atenção: Histórico parcial (${data.energyDiagnostic.validMonthsCount} de 12 meses). O dimensionamento considera a média dos meses informados.`,
              55,
              doc.y + 5,
            );
          doc.y += 24;
        }

        doc.moveDown(0.5);

        // --- 4. SOLUÇÃO TÉCNICA PROPOSTA ---
        this.renderSectionHeader(doc, '3. ENGENHARIA DA SOLUÇÃO FOTOVOLTAICA', primaryDark);

        const techY = doc.y;
        const boxWidth = 120;
        const gap = (505 - boxWidth * 4) / 3;

        this.renderMetricCard(
          doc,
          45,
          techY,
          boxWidth,
          50,
          'POTÊNCIA DOS MÓDULOS',
          `${data.technicalSolution.dcPowerKwp.toFixed(2)} kWp`,
          'Energia em corrente contínua',
          primaryColor,
        );
        this.renderMetricCard(
          doc,
          45 + boxWidth + gap,
          techY,
          boxWidth,
          50,
          'POTÊNCIA DOS INVERSORES',
          `${data.technicalSolution.acPowerKw.toFixed(2)} kW`,
          'Energia em corrente alternada',
          textDark,
        );
        this.renderMetricCard(
          doc,
          45 + (boxWidth + gap) * 2,
          techY,
          boxWidth,
          50,
          'GERAÇÃO ESTIMADA',
          `${Math.round(data.technicalSolution.estimatedMonthlyGenerationKwh)} kWh/mês`,
          'Média projetada',
          primaryColor,
        );
        this.renderMetricCard(
          doc,
          45 + (boxWidth + gap) * 3,
          techY,
          boxWidth,
          50,
          'GERAÇÃO ANUAL',
          `${Math.round(data.technicalSolution.estimatedAnnualGenerationKwh)} kWh/ano`,
          'Produção no ano 1',
          textDark,
        );

        doc.y = techY + 58;

        // Equipments detail
        doc.rect(45, doc.y, 505, 40).fillAndStroke(lightBg, borderColor);
        const eqY = doc.y + 7;
        doc
          .fontSize(8.5)
          .font('Helvetica-Bold')
          .fillColor(textDark)
          .text('Módulos Fotovoltaicos: ', 55, eqY, { continued: true });
        doc
          .font('Helvetica')
          .fillColor(textMuted)
          .text(data.technicalSolution.modulesDescription || 'Conforme especificação homologada');

        doc
          .fontSize(8.5)
          .font('Helvetica-Bold')
          .fillColor(textDark)
          .text('Inversores / Microinversores: ', 55, eqY + 16, { continued: true });
        doc
          .font('Helvetica')
          .fillColor(textMuted)
          .text(data.technicalSolution.invertersDescription || 'Conforme especificação homologada');

        doc.y = eqY + 40;
        doc.moveDown(0.6);

        // --- 5. BENEFÍCIO ECONÔMICO E RETORNO ---
        this.renderSectionHeader(doc, '4. ECONOMIA ESTIMADA E BENEFÍCIOS', primaryDark);

        const econY = doc.y;
        doc.rect(45, econY, 245, 46).fillAndStroke('#f0fff4', '#9ae6b4');
        doc.rect(305, econY, 245, 46).fillAndStroke('#f0fff4', '#9ae6b4');

        doc
          .fontSize(8)
          .font('Helvetica-Bold')
          .fillColor(primaryDark)
          .text('ECONOMIA MÉDIA MENSAL ESTIMADA', 55, econY + 8);
        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .fillColor(primaryColor)
          .text(
            `R$ ${data.economicBenefit.estimatedMonthlySavingsBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} /mês`,
            55,
            econY + 20,
          );

        doc
          .fontSize(8)
          .font('Helvetica-Bold')
          .fillColor(primaryDark)
          .text('ECONOMIA ANUAL PROJETADA (ANO 1)', 315, econY + 8);
        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .fillColor(primaryColor)
          .text(
            `R$ ${data.economicBenefit.estimatedAnnualSavingsBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} /ano`,
            315,
            econY + 20,
          );

        doc.y = econY + 52;
        doc.moveDown(0.5);

        // --- 6. ESCOPO DOS SERVIÇOS INCLUSOS ---
        this.renderSectionHeader(doc, '5. ESCOPO COMPLETO DOS SERVIÇOS', primaryDark);

        const scopeList =
          data.scopeItems.length > 0
            ? data.scopeItems
            : [
                'Elaboração de Projeto de Engenharia com emissão de ART/TRT junto ao CREA/CFT',
                'Homologação completa do sistema de micro/minigeração junto à Concessionária de Energia',
                'Fornecimento de todos os equipamentos, estruturas de fixação e cabeamento solar CC/CA',
                'Montagem eletromecânica completa por equipe técnica certificada em NR-10 e NR-35',
                'Comissionamento, testes de isolamento e ativação oficial do sistema',
                'Configuração do aplicativo de monitoramento remoto da geração solar em tempo real',
              ];

        doc.fontSize(8).font('Helvetica').fillColor(textDark);
        for (const item of scopeList) {
          doc.text(`✔  ${item}`, 55, doc.y, { width: 485 });
          doc.moveDown(0.25);
        }

        doc.moveDown(0.6);

        // --- 7. INVESTIMENTO E CONDIÇÕES DE PAGAMENTO ---
        this.renderSectionHeader(doc, '6. INVESTIMENTO TOTAL E CONDIÇÕES COMERCIAIS', primaryDark);

        const investY = doc.y;
        doc.rect(45, investY, 505, 56).fillAndStroke(lightBg, primaryColor);

        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .fillColor(textMuted)
          .text('VALOR TOTAL DO INVESTIMENTO (SISTEMA COMPLETO CHAVE NA MÃO)', 55, investY + 10);
        doc
          .fontSize(18)
          .font('Helvetica-Bold')
          .fillColor(primaryColor)
          .text(
            `R$ ${data.investment.finalPriceBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            55,
            investY + 24,
          );

        if (data.investment.paymentConditionsNotes) {
          doc
            .fontSize(8)
            .font('Helvetica')
            .fillColor(textDark)
            .text(`Condições: ${data.investment.paymentConditionsNotes}`, 55, investY + 44, {
              width: 480,
            });
        } else {
          doc
            .fontSize(8)
            .font('Helvetica')
            .fillColor(textMuted)
            .text(
              'Opções: pagamento à vista com desconto especial ou financiamento bancário para energia solar em até 84 parcelas, com carência.',
              55,
              investY + 44,
            );
        }

        doc.y = investY + 68;

        // --- 8. FOOTER / SIGNATURE SECTION ---
        doc.moveDown(0.8);
        doc.rect(45, doc.y, 505, 0.5).fill(borderColor);
        doc.moveDown(0.5);

        const footerY = doc.y;
        doc
          .fontSize(7)
          .font('Helvetica')
          .fillColor(textMuted)
          .text(
            'Moura Solar — Soluções Sustentáveis em Energia Fotovoltaica • Contato comercial: contato@mourasolar.com.br',
            45,
            footerY,
            { align: 'center', width: 505 },
          );
        doc.text(
          `Documento gerado eletronicamente • Código de integridade: ${data.proposalCode}-v${data.versionNumber}-${data.validUntil}`,
          45,
          footerY + 10,
          { align: 'center', width: 505 },
        );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  private renderSectionHeader(doc: any, title: string, color: string) {
    doc.fontSize(9.5).font('Helvetica-Bold').fillColor(color).text(title);
    doc.moveDown(0.3);
  }

  private renderMetricCard(
    doc: any,
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    value: string,
    subtext: string,
    valueColor: string,
  ) {
    doc.rect(x, y, width, height).fillAndStroke('#f7fafc', '#e2e8f0');
    doc
      .fontSize(7)
      .font('Helvetica')
      .fillColor('#718096')
      .text(label, x + 6, y + 6);
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor(valueColor)
      .text(value, x + 6, y + 18);
    doc
      .fontSize(6.5)
      .font('Helvetica')
      .fillColor('#a0aec0')
      .text(subtext, x + 6, y + 34);
  }

  private maskTaxId(taxId?: string): string {
    if (!taxId) return '—';
    const clean = taxId.replace(/\D/g, '');
    if (clean.length === 11) {
      return `***.${clean.slice(3, 6)}.${clean.slice(6, 9)}-**`;
    }
    if (clean.length === 14) {
      return `**.${clean.slice(2, 5)}.${clean.slice(5, 8)}/****-**`;
    }
    return taxId;
  }
}
