import { Injectable, Logger } from '@nestjs/common';
import { randomUUID, createHash } from 'node:crypto';
import { existsSync, promises as fs } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const _PDFDocument = require('pdfkit');
const PDFDocument: any = _PDFDocument.default ?? _PDFDocument;

function resolveAssetPath(subpath: string): string {
  const candidates = [
    join(process.cwd(), subpath),
    join(process.cwd(), 'apps/api', subpath),
    join(process.cwd(), '..', subpath),
    join(__dirname, '../../', subpath),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return candidates[0] ?? subpath;
}

export interface ContractTemplateData {
  contractNumber: string;
  signingDate: string;
  city: string;
  company: {
    legalName: string;
    cnpj: string;
    address: string;
    representative: string;
    representativeCpf: string;
    phone: string;
    email: string;
  };
  client: {
    name: string;
    document: string;
    secondaryDocument: string;
    address: string;
    zipCode: string;
    phone: string;
    email: string;
  };
  utility: {
    customerUnit: string;
    company: string;
    tariff: string;
    connectionType: string;
  };
  project: {
    type: string;
    systemPowerKwp: string;
    estimatedMonthlyGenerationKwh: string;
    estimatedAnnualGenerationKwh: string;
    installationAddress: string;
    roofType: string;
    estimatedAreaM2: string;
  };
  commercial: {
    contractTotal: string;
    paymentMethod: string;
    lateInterestMonthly: string;
    adjustmentIndex: string;
    commercialValidity: string;
    specialConditions: string;
    milestones: Array<{
      stage: string;
      percent: string;
      amount: string;
      due: string;
      condition: string;
    }>;
  };
  deadlines: {
    equipmentDeliveryDays: string;
    installationDays: string;
    documentationDays: string;
    curePeriodDays: string;
    installationWarrantyMonths: string;
  };
  bom: {
    moduleBrandModel: string;
    modulePowerW: string;
    moduleQuantity: string;
    inverterBrandModel: string;
    inverterPowerKw: string;
    inverterQuantity: string;
    inverterPhase: string;
    batteryBrandModel: string;
    batteryCapacityKwh: string;
    batteryQuantity: string;
    structureType: string;
    structureQuantity: string;
    cableDescription: string;
    cableQuantity: string;
    protectionDescription: string;
    protectionQuantity: string;
    monitoringType: string;
  };
  generationMonthly: Record<string, string>;
  scope: {
    siteSurvey: boolean;
    design: boolean;
    homologation: boolean;
    installation: boolean;
    art: boolean;
    monitoring: boolean;
    training: boolean;
    deliveryReport: boolean;
    meter: boolean;
  };
  witnesses?: {
    witness1Name?: string;
    witness1Cpf?: string;
    witness2Name?: string;
    witness2Cpf?: string;
  };
  supportChannels: string;
}

function escapeXml(str: string): string {
  return (str ?? '')
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

@Injectable()
export class ContractGeneratorService {
  private readonly logger = new Logger(ContractGeneratorService.name);
  private get templatePath() {
    return resolveAssetPath('assets/contracts/template-padrao-moura-solar.docx');
  }
  private get logoPath() {
    return resolveAssetPath('assets/moura-solar-logo.png');
  }

  async generateDocx(data: ContractTemplateData): Promise<Buffer> {
    const tempDir = join('/tmp', `moura-contract-${randomUUID()}`);
    const outZipPath = join('/tmp', `moura-contract-${randomUUID()}.docx`);

    try {
      await fs.mkdir(tempDir, { recursive: true });

      // Unpack template docx
      const unzipRes = spawnSync('unzip', ['-q', this.templatePath, '-d', tempDir]);
      if (unzipRes.status !== 0 || unzipRes.error) {
        const errDetails =
          unzipRes.error?.message ||
          unzipRes.stderr?.toString() ||
          'Erro desconhecido ao executar unzip';
        throw new Error(`Falha ao descompactar template docx: ${errDetails}`);
      }

      // Build dictionary of placeholders
      const placeholders: Record<string, string> = {
        '{{CONTRACT_NUMBER}}': data.contractNumber,
        '{{SIGNING_DATE}}': data.signingDate,
        '{{CITY}}': data.city,
        '{{COMPANY_LEGAL_NAME}}': data.company.legalName,
        '{{COMPANY_CNPJ}}': data.company.cnpj,
        '{{COMPANY_ADDRESS}}': data.company.address,
        '{{COMPANY_REPRESENTATIVE}}': data.company.representative,
        '{{COMPANY_REPRESENTATIVE_CPF}}': data.company.representativeCpf,
        '{{COMPANY_PHONE}}': data.company.phone,
        '{{COMPANY_EMAIL}}': data.company.email,
        '{{CLIENT_NAME}}': data.client.name,
        '{{CLIENT_DOCUMENT}}': data.client.document,
        '{{CLIENT_SECONDARY_DOCUMENT}}': data.client.secondaryDocument,
        '{{CLIENT_ADDRESS}}': data.client.address,
        '{{CLIENT_ZIP_CODE}}': data.client.zipCode,
        '{{CLIENT_PHONE}}': data.client.phone,
        '{{CLIENT_EMAIL}}': data.client.email,
        '{{UTILITY_CUSTOMER_UNIT}}': data.utility.customerUnit,
        '{{UTILITY_COMPANY}}': data.utility.company,
        '{{GRID_CONNECTION_TYPE}}': data.utility.connectionType,
        '{{INSTALLATION_ADDRESS}}': data.project.installationAddress,
        '{{PROJECT_TYPE}}': data.project.type,
        '{{SYSTEM_POWER_KWP}}': data.project.systemPowerKwp,
        '{{CONTRACT_TOTAL}}': data.commercial.contractTotal,
        '{{PAYMENT_METHOD}}': data.commercial.paymentMethod,
        '{{LATE_INTEREST_MONTHLY}}': data.commercial.lateInterestMonthly,
        '{{ADJUSTMENT_INDEX}}': data.commercial.adjustmentIndex,
        '{{COMMERCIAL_VALIDITY}}': data.commercial.commercialValidity,
        '{{SPECIAL_CONDITIONS}}': data.commercial.specialConditions,
        '{{EQUIPMENT_DELIVERY_DAYS}}': data.deadlines.equipmentDeliveryDays,
        '{{INSTALLATION_DAYS}}': data.deadlines.installationDays,
        '{{DOCUMENTATION_DAYS}}': data.deadlines.documentationDays,
        '{{ESTIMATED_MONTHLY_GENERATION}}': data.project.estimatedMonthlyGenerationKwh,
        '{{ESTIMATED_ANNUAL_GENERATION}}': data.project.estimatedAnnualGenerationKwh,
        '{{ESTIMATED_AREA_M2}}': data.project.estimatedAreaM2,
        '{{INSTALLATION_WARRANTY_MONTHS}}': data.deadlines.installationWarrantyMonths,
        '{{SUPPORT_CHANNELS}}': data.supportChannels,
        '{{CURE_PERIOD_DAYS}}': data.deadlines.curePeriodDays,
        '{{AUTHORIZATION_DATE}}': data.signingDate,
        '{{ROOF_TYPE}}': data.project.roofType,

        // BOM
        '{{MODULE_BRAND_MODEL}}': data.bom.moduleBrandModel,
        '{{MODULE_POWER_W}}': data.bom.modulePowerW,
        '{{MODULE_QUANTITY}}': data.bom.moduleQuantity,
        '{{INVERTER_BRAND_MODEL}}': data.bom.inverterBrandModel,
        '{{INVERTER_POWER_KW}}': data.bom.inverterPowerKw,
        '{{INVERTER_QUANTITY}}': data.bom.inverterQuantity,
        '{{INVERTER_PHASE}}': data.bom.inverterPhase,
        '{{BATTERY_BRAND_MODEL}}': data.bom.batteryBrandModel,
        '{{BATTERY_CAPACITY_KWH}}': data.bom.batteryCapacityKwh,
        '{{BATTERY_QUANTITY}}': data.bom.batteryQuantity,
        '{{STRUCTURE_TYPE}}': data.bom.structureType,
        '{{STRUCTURE_QUANTITY}}': data.bom.structureQuantity,
        '{{CABLE_DESCRIPTION}}': data.bom.cableDescription,
        '{{CABLE_QUANTITY}}': data.bom.cableQuantity,
        '{{PROTECTION_DESCRIPTION}}': data.bom.protectionDescription,
        '{{PROTECTION_QUANTITY}}': data.bom.protectionQuantity,
        '{{MONITORING_TYPE}}': data.bom.monitoringType,

        // Witnesses (opcionais)
        '{{WITNESS_1_NAME}}': data.witnesses?.witness1Name ?? '',
        '{{WITNESS_1_CPF}}': data.witnesses?.witness1Cpf ?? '',
        '{{WITNESS_2_NAME}}': data.witnesses?.witness2Name ?? '',
        '{{WITNESS_2_CPF}}': data.witnesses?.witness2Cpf ?? '',

        // Monthly generation
        '{{GEN_JAN}}': data.generationMonthly['JAN'] || '0',
        '{{GEN_FEB}}': data.generationMonthly['FEB'] || '0',
        '{{GEN_MAR}}': data.generationMonthly['MAR'] || '0',
        '{{GEN_APR}}': data.generationMonthly['APR'] || '0',
        '{{GEN_MAY}}': data.generationMonthly['MAY'] || '0',
        '{{GEN_JUN}}': data.generationMonthly['JUN'] || '0',
        '{{GEN_JUL}}': data.generationMonthly['JUL'] || '0',
        '{{GEN_AUG}}': data.generationMonthly['AUG'] || '0',
        '{{GEN_SEP}}': data.generationMonthly['SEP'] || '0',
        '{{GEN_OCT}}': data.generationMonthly['OCT'] || '0',
        '{{GEN_NOV}}': data.generationMonthly['NOV'] || '0',
        '{{GEN_DEC}}': data.generationMonthly['DEC'] || '0',

        // Scope
        '{{SCOPE_SITE_SURVEY}}': data.scope.siteSurvey ? '☑ Incluído' : '☐ Não incluso',
        '{{SCOPE_DESIGN}}': data.scope.design ? '☑ Incluído' : '☐ Não incluso',
        '{{SCOPE_HOMOLOGATION}}': data.scope.homologation ? '☑ Incluído' : '☐ Não incluso',
        '{{SCOPE_INSTALLATION}}': data.scope.installation ? '☑ Incluído' : '☐ Não incluso',
        '{{SCOPE_ART}}': data.scope.art ? '☑ Incluído' : '☐ Não incluso',
        '{{SCOPE_MONITORING}}': data.scope.monitoring ? '☑ Incluído' : '☐ Não incluso',
        '{{SCOPE_TRAINING}}': data.scope.training ? '☑ Incluído' : '☐ Não incluso',
        '{{SCOPE_DELIVERY_REPORT}}': data.scope.deliveryReport ? '☑ Incluído' : '☐ Não incluso',
        '{{SCOPE_METER}}': data.scope.meter ? '☑ Incluído' : '☐ Conforme concessionária',
      };

      // Milestone placeholders
      for (let i = 0; i < 4; i++) {
        const m = data.commercial.milestones[i];
        const num = i + 1;
        if (m) {
          placeholders[`{{PAYMENT_${num}_STAGE}}`] = m.stage;
          placeholders[`{{PAYMENT_${num}_PERCENT}}`] = m.percent;
          placeholders[`{{PAYMENT_${num}_AMOUNT}}`] = m.amount;
          placeholders[`{{PAYMENT_${num}_DUE}}`] = m.due;
          placeholders[`{{PAYMENT_${num}_CONDITION}}`] = m.condition;
        } else {
          placeholders[`{{PAYMENT_${num}_STAGE}}`] = '-';
          placeholders[`{{PAYMENT_${num}_PERCENT}}`] = '-';
          placeholders[`{{PAYMENT_${num}_AMOUNT}}`] = '-';
          placeholders[`{{PAYMENT_${num}_DUE}}`] = '-';
          placeholders[`{{PAYMENT_${num}_CONDITION}}`] = '-';
        }
      }

      // Read document.xml
      const docXmlPath = join(tempDir, 'word', 'document.xml');
      let docXml = await fs.readFile(docXmlPath, 'utf8');

      // Special tariff placeholder
      docXml = docXml.replace(
        /\{\{R\$\s*\{\{UTILITY_TARIFF\}\}\s*por\s*kWh\}\}/g,
        `R$ ${escapeXml(data.utility.tariff)} por kWh`,
      );
      docXml = docXml.replace(/\{\{UTILITY_TARIFF\}\}/g, escapeXml(data.utility.tariff));

      for (const [key, value] of Object.entries(placeholders)) {
        const escapedVal = escapeXml(value);
        docXml = docXml.split(key).join(escapedVal);
      }
      await fs.writeFile(docXmlPath, docXml, 'utf8');

      // Read footer1.xml if exists
      const footerXmlPath = join(tempDir, 'word', 'footer1.xml');
      try {
        let footerXml = await fs.readFile(footerXmlPath, 'utf8');
        footerXml = footerXml.split('{{CONTRACT_NUMBER}}').join(escapeXml(data.contractNumber));
        await fs.writeFile(footerXmlPath, footerXml, 'utf8');
      } catch {
        // Footer file might not exist or already updated
      }

      // Repack into new docx
      const zipRes = spawnSync('zip', ['-q', '-r', outZipPath, '.'], { cwd: tempDir });
      if (zipRes.status !== 0 || zipRes.error) {
        const errDetails =
          zipRes.error?.message || zipRes.stderr?.toString() || 'Erro desconhecido ao executar zip';
        throw new Error(`Falha ao compactar contrato docx: ${errDetails}`);
      }

      const outputBuffer = await fs.readFile(outZipPath);
      return outputBuffer;
    } finally {
      // Clean up temp directories and files
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
        await fs.unlink(outZipPath).catch(() => {});
      } catch {
        // Ignored
      }
    }
  }

  async generatePdf(data: ContractTemplateData): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 36, bottom: 15, left: 40, right: 40 },
        bufferPages: true,
        info: {
          Title: `Contrato ${data.contractNumber} - Moura Solar`,
          Author: 'Moura Solar Engenharia',
          Subject: 'Contrato de Fornecimento e Instalação Fotovoltaica',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (c: any) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err: any) => reject(err));

      // Colors
      const C_DARK = '#0f172a';
      const C_BODY = '#1e293b';
      const C_MUTED = '#475569';
      const C_LIGHT_MUTED = '#64748b';
      const C_GREEN = '#087443';
      const C_GREEN_LIGHT = '#ecfdf5';
      const C_GREEN_BORDER = '#a7f3d0';
      const C_BG_CARD = '#f8fafc';
      const C_BORDER = '#cbd5e1';
      const C_BORDER_LIGHT = '#e2e8f0';

      const PAGE_WIDTH = 595.28;
      const PAGE_HEIGHT = 841.89;
      const MARGIN_LEFT = 40;
      const MARGIN_RIGHT = 40;
      const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT; // 515.28
      const MAX_Y = PAGE_HEIGHT - 45; // Keep space above footer

      let curY = 40;

      const drawRunningHeader = () => {
        try {
          if (existsSync(this.logoPath)) {
            doc.image(this.logoPath, MARGIN_LEFT, 20, { width: 22 });
          }
        } catch {
          // Ignored
        }

        doc
          .font('Helvetica-Bold')
          .fontSize(7.5)
          .fillColor(C_DARK)
          .text('MOURA SOLAR ENGENHARIA', MARGIN_LEFT + 28, 22);

        doc
          .font('Helvetica')
          .fontSize(7)
          .fillColor(C_MUTED)
          .text('Contrato de Fornecimento e Instalação Fotovoltaica', MARGIN_LEFT + 28, 31);

        doc
          .font('Helvetica-Bold')
          .fontSize(7.5)
          .fillColor(C_GREEN)
          .text(data.contractNumber, MARGIN_LEFT, 25, { width: CONTENT_WIDTH, align: 'right' });

        doc
          .moveTo(MARGIN_LEFT, 42)
          .lineTo(MARGIN_LEFT + CONTENT_WIDTH, 42)
          .strokeColor(C_BORDER_LIGHT)
          .lineWidth(0.75)
          .stroke();
      };

      const ensureSpace = (height: number) => {
        if (curY + height > MAX_Y) {
          doc.addPage();
          curY = 50; // below running header
          drawRunningHeader();
        }
      };

      // --- PAGE 1 COVER / HEADER ---
      const drawPage1Header = () => {
        try {
          if (existsSync(this.logoPath)) {
            doc.image(this.logoPath, MARGIN_LEFT, curY, { width: 52 });
          }
        } catch {
          // Ignored
        }

        doc
          .font('Helvetica-Bold')
          .fontSize(16)
          .fillColor(C_DARK)
          .text('MOURA SOLAR ENGENHARIA', MARGIN_LEFT + 60, curY + 2);

        doc
          .font('Helvetica')
          .fontSize(9.5)
          .fillColor(C_MUTED)
          .text('SISTEMAS FOTOVOLTAICOS CONECTADOS À REDE', MARGIN_LEFT + 60, curY + 22);

        // Badge top right
        const badgeW = 140;
        const badgeH = 34;
        const badgeX = MARGIN_LEFT + CONTENT_WIDTH - badgeW;
        doc
          .roundedRect(badgeX, curY, badgeW, badgeH, 4)
          .fill(C_GREEN_LIGHT)
          .strokeColor(C_GREEN_BORDER)
          .lineWidth(1)
          .stroke();

        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .fillColor(C_GREEN)
          .text(data.contractNumber, badgeX, curY + 6, { width: badgeW, align: 'center' });

        doc
          .font('Helvetica')
          .fontSize(7.5)
          .fillColor(C_MUTED)
          .text(`Emissão: ${data.signingDate}`, badgeX, curY + 20, {
            width: badgeW,
            align: 'center',
          });

        curY += 46;

        // Green separator
        doc.rect(MARGIN_LEFT, curY, CONTENT_WIDTH, 2.5).fill(C_GREEN);

        curY += 12;
      };

      drawPage1Header();

      // Contract Title
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .fillColor(C_DARK)
        .text('CONTRATO DE FORNECIMENTO E INSTALAÇÃO DE SISTEMA FOTOVOLTAICO', MARGIN_LEFT, curY, {
          width: CONTENT_WIDTH,
          align: 'center',
        });
      curY += 16;

      doc
        .font('Helvetica-Oblique')
        .fontSize(8.5)
        .fillColor(C_MUTED)
        .text(
          'Sistema solar fotovoltaico on-grid com serviços especializados de engenharia associados',
          MARGIN_LEFT,
          curY,
          {
            width: CONTENT_WIDTH,
            align: 'center',
          },
        );
      curY += 16;

      // Preambulo text
      const preambulo =
        'Pelo presente instrumento particular, as partes a seguir qualificadas celebram este Contrato de Fornecimento e Instalação de Sistema Fotovoltaico, que se regerá pelas disposições do Código Civil Brasileiro, Código de Defesa do Consumidor, Lei nº 14.300/2022, Resolução Normativa ANEEL nº 1.000/2021 e pelas cláusulas e condições seguintes:';
      doc.font('Helvetica').fontSize(8).fillColor(C_BODY).text(preambulo, MARGIN_LEFT, curY, {
        width: CONTENT_WIDTH,
        align: 'justify',
        lineGap: 2.5,
      });
      curY += doc.heightOfString(preambulo, { width: CONTENT_WIDTH, lineGap: 2.5 }) + 10;

      // --- IDENTIFICAÇÃO DAS PARTES (Cards) ---
      const drawParties = () => {
        ensureSpace(140);

        // Section title
        doc.roundedRect(MARGIN_LEFT, curY, CONTENT_WIDTH, 18, 3).fill(C_BG_CARD);
        doc.roundedRect(MARGIN_LEFT, curY, 4, 18, 2).fill(C_GREEN);
        doc
          .font('Helvetica-Bold')
          .fontSize(9)
          .fillColor(C_DARK)
          .text('IDENTIFICAÇÃO DAS PARTES CONTRATANTES', MARGIN_LEFT + 12, curY + 4.5);
        curY += 24;

        const boxW = (CONTENT_WIDTH - 10) / 2;
        const boxH = 118;

        // Card Contratada
        doc
          .roundedRect(MARGIN_LEFT, curY, boxW, boxH, 4)
          .fill('#ffffff')
          .strokeColor(C_BORDER)
          .lineWidth(0.8)
          .stroke();

        doc.rect(MARGIN_LEFT, curY, boxW, 16).fill(C_BG_CARD);
        doc
          .font('Helvetica-Bold')
          .fontSize(8)
          .fillColor(C_GREEN)
          .text('CONTRATADA (FORNECEDORA & INSTALADORA)', MARGIN_LEFT + 8, curY + 4);

        let ty = curY + 20;
        const renderField = (x: number, y: number, label: string, val: string): number => {
          doc.font('Helvetica-Bold').fontSize(7.2).fillColor(C_DARK).text(label, x, y);
          const labelW = doc.widthOfString(label) + 4;
          const valW = boxW - 16 - labelW;
          doc.font('Helvetica').fontSize(7.2);
          const textH = doc.heightOfString(val, { width: valW });
          doc.fillColor(C_BODY).text(val, x + labelW, y, { width: valW, lineGap: 1 });
          return Math.max(12, Math.round(textH) + 3);
        };

        ty += renderField(MARGIN_LEFT + 8, ty, 'Razão Social:', data.company.legalName);
        ty += renderField(MARGIN_LEFT + 8, ty, 'CNPJ:', data.company.cnpj);
        ty += renderField(MARGIN_LEFT + 8, ty, 'Endereço:', data.company.address);
        ty += renderField(
          MARGIN_LEFT + 8,
          ty,
          'Representante:',
          `${data.company.representative} (CPF ${data.company.representativeCpf})`,
        );
        renderField(
          MARGIN_LEFT + 8,
          ty,
          'Contato:',
          `${data.company.phone} | ${data.company.email}`,
        );

        // Card Contratante
        const rightX = MARGIN_LEFT + boxW + 10;
        doc
          .roundedRect(rightX, curY, boxW, boxH, 4)
          .fill('#ffffff')
          .strokeColor(C_BORDER)
          .lineWidth(0.8)
          .stroke();

        doc.rect(rightX, curY, boxW, 16).fill(C_BG_CARD);
        doc
          .font('Helvetica-Bold')
          .fontSize(8)
          .fillColor(C_DARK)
          .text('CONTRATANTE (CLIENTE / PROPRIETÁRIO)', rightX + 8, curY + 4);

        ty = curY + 20;
        ty += renderField(rightX + 8, ty, 'Nome/Razão:', data.client.name);
        ty += renderField(
          rightX + 8,
          ty,
          'CPF/CNPJ:',
          `${data.client.document}   RG/IE: ${data.client.secondaryDocument}`,
        );
        ty += renderField(
          rightX + 8,
          ty,
          'Endereço:',
          `${data.client.address} - CEP ${data.client.zipCode}`,
        );
        ty += renderField(
          rightX + 8,
          ty,
          'Contato:',
          `${data.client.phone} | ${data.client.email}`,
        );
        renderField(
          rightX + 8,
          ty,
          'Unidade Consumidora:',
          `${data.utility.customerUnit} (${data.utility.company})`,
        );

        curY += boxH + 12;
      };

      drawParties();

      // Helper for Section Heading
      const drawSectionTitle = (title: string) => {
        ensureSpace(65);
        doc.roundedRect(MARGIN_LEFT, curY, CONTENT_WIDTH, 17, 3).fill(C_BG_CARD);
        doc.roundedRect(MARGIN_LEFT, curY, 3.5, 17, 1.5).fill(C_GREEN);
        doc
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .fillColor(C_DARK)
          .text(title, MARGIN_LEFT + 10, curY + 4.5);
        curY += 22;
      };

      // Helper for Clause Paragraph
      const drawClauseItem = (number: string, text: string) => {
        const textHeight = doc.heightOfString(text, {
          width: CONTENT_WIDTH - 24,
          lineGap: 2.2,
          fontSize: 8,
        });
        ensureSpace(textHeight + 8);

        doc
          .font('Helvetica-Bold')
          .fontSize(8)
          .fillColor(C_DARK)
          .text(number, MARGIN_LEFT + 4, curY, { width: 20 });

        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor(C_BODY)
          .text(text, MARGIN_LEFT + 24, curY, {
            width: CONTENT_WIDTH - 24,
            align: 'justify',
            lineGap: 2.2,
          });

        curY += textHeight + 6;
      };

      // --- CLÁUSULA 1 - OBJETO ---
      drawSectionTitle('CLÁUSULA 1 — DO OBJETO E ESPECIFICAÇÕES GERAIS');
      drawClauseItem(
        '1.1.',
        `A CONTRATADA fornecerá e instalará um sistema gerador fotovoltaico no endereço de instalação: ${data.project.installationAddress}, conforme especificações de engenharia do Anexo I e escopo técnico selecionado no Anexo II.`,
      );
      drawClauseItem(
        '1.2.',
        `O projeto classifica-se como ${data.project.type}, com potência de pico total instalada de ${data.project.systemPowerKwp}, com estimativa de geração de ${data.project.estimatedMonthlyGenerationKwh} e área aproximada de ocupação de ${data.project.estimatedAreaM2} sobre superfície do tipo ${data.project.roofType}, destinado a atender a Unidade Consumidora nº ${data.utility.customerUnit}.`,
      );
      drawClauseItem(
        '1.3.',
        'O presente contrato abrange exclusivamente os equipamentos, materiais e serviços expressamente relacionados neste instrumento e anexos. Quaisquer obras complementares, reforços estruturais ou serviços suplementares dependerão de termo aditivo e prévia aprovação escrita das partes.',
      );

      // --- CLÁUSULA 2 - ESPECIFICAÇÕES E EQUIVALÊNCIA ---
      drawSectionTitle('CLÁUSULA 2 — DAS ESPECIFICAÇÕES E EQUIVALÊNCIA TÉCNICA');
      drawClauseItem(
        '2.1.',
        'Os módulos fotovoltaicos, inversores de frequência, estruturas de fixação, condutores elétricos, dispositivos de proteção (String Box CC e CA) e monitoramento constam descritos no Anexo I, que integra este contrato para todos os efeitos.',
      );
      drawClauseItem(
        '2.2.',
        'Na eventual indisponibilidade fabril comprovada de determinado item no momento da aquisição, a substituição somente poderá ocorrer por produto tecnicamente equivalente ou superior, preservando a potência e eficiência do projeto, mediante comunicação prévia ao CONTRATANTE.',
      );
      drawClauseItem(
        '2.3.',
        'Alterações de layout, ponto de acoplamento ou infraestrutura solicitadas pelo CONTRATANTE após aprovação do projeto executivo ensejarão revisão prévia de custos, prazos e eventual readequação do dimensionamento original.',
      );

      // --- CLÁUSULA 3 - ESCOPO DOS SERVIÇOS ---
      drawSectionTitle('CLÁUSULA 3 — DO ESCOPO DOS SERVIÇOS DE ENGENHARIA');
      drawClauseItem(
        '3.1.',
        'A CONTRATADA executará rigorosamente os serviços marcados como incluídos no Anexo II deste contrato, respeitando as condições de segurança (NR-10 e NR-35), integridade predial e normas técnicas vigentes da ABNT/NBR.',
      );
      drawClauseItem(
        '3.2.',
        `O processo de homologação compreende a elaboração dos projetos executivos, emissão de ART e protocolo de solicitação de acesso junto à distribuidora ${data.utility.company}. Os prazos regulatórios de análise da distribuidora fogem à ingerência direta da CONTRATADA.`,
      );
      drawClauseItem(
        '3.3.',
        'Serviços civis, alvenaria, reforços de vigamento, adequação integral de padrão de entrada ou substituição de fiação preexistente não inclusos no Anexo II deverão ser providenciados pelo CONTRATANTE ou contratados mediante termo adicional.',
      );

      // --- CLÁUSULA 4 - PREÇO E CONDIÇÕES DE PAGAMENTO ---
      drawSectionTitle('CLÁUSULA 4 — DO PREÇO E DAS CONDIÇÕES DE PAGAMENTO');
      drawClauseItem(
        '4.1.',
        `O valor total, irreajustável e certo do presente contrato é de ${data.commercial.contractTotal}, na modalidade de pagamento ${data.commercial.paymentMethod}, a ser quitado em estrita observância ao cronograma financeiro discriminado no Anexo III.`,
      );
      drawClauseItem(
        '4.2.',
        'O adimplemento pontual de cada parcela financeira condiciona a liberação da etapa executiva subsequente (aquisição e despacho de materiais, início da montagem mecânica ou entrega do termo de comissionamento).',
      );
      drawClauseItem(
        '4.3.',
        `Em caso de inadimplemento de qualquer parcela, incidirá multa moratória de 2% (dois por cento) sobre o valor em atraso, juros de mora de ${data.commercial.lateInterestMonthly} e correção monetária apurada pela variação positiva do ${data.commercial.adjustmentIndex}.`,
      );
      drawClauseItem(
        '4.4.',
        'Quaisquer despesas extras ou modificações solicitadas somente serão cobradas após apresentação de justificativa técnica e expressa autorização do CONTRATANTE.',
      );

      // --- CLÁUSULA 5 - PRAZOS ---
      drawSectionTitle('CLÁUSULA 5 — DOS PRAZOS DE FORNECIMENTO E INSTALAÇÃO');
      drawClauseItem(
        '5.1.',
        `Os prazos de execução estimados compreendem: a) Entrega dos equipamentos no local: até ${data.deadlines.equipmentDeliveryDays} dias úteis após liquidação da entrada; b) Instalação física e cabeamento: até ${data.deadlines.installationDays} dias úteis a contar da disponibilidade dos materiais no imóvel; c) Elaboração e protocolo do projeto na concessionária: até ${data.deadlines.documentationDays} dias úteis após recebimento da documentação integral do cliente.`,
      );
      drawClauseItem(
        '5.2.',
        'Os prazos poderão ser prorrogados por motivos de força maior ou caso fortuito, tais como chuvas intensas ou ventos que impeçam o trabalho seguro em altura (NR-35), atrasos comprovados de logística fabril ou impedimento de acesso ao imóvel.',
      );
      drawClauseItem(
        '5.3.',
        'Os prazos próprios de vistoria e substituição do medidor por parte da concessionária de energia submetem-se à regulação da ANEEL e não integram o prazo de montagem da CONTRATADA.',
      );

      // --- CLÁUSULA 6 - GERAÇÃO E ECONOMIA ESTIMADAS ---
      drawSectionTitle('CLÁUSULA 6 — DA GERAÇÃO DE ENERGIA E ECONOMIA ESTIMADAS');
      drawClauseItem(
        '6.1.',
        `A geração média mensal projetada é de ${data.project.estimatedMonthlyGenerationKwh} e anual de ${data.project.estimatedAnnualGenerationKwh}, apurada com base nos dados de irradiação solar da região e inclinação/orientação do telhado informadas.`,
      );
      drawClauseItem(
        '6.2.',
        'As projeções financeiras constituem estimativas técnicas sujeitas a variações climáticas, sujidade nos painéis, sombreamentos supervenientes e comportamento de consumo da unidade consumidora.',
      );
      drawClauseItem(
        '6.3.',
        'A CONTRATADA esclarece que o sistema de microgeração não extingue faturas de energia, remanescendo as cobranças regulatórias obrigatórias de custo de disponibilidade (taxa mínima), iluminação pública e tarifas de uso da rede (Lei 14.300/2022).',
      );

      // --- CLÁUSULA 7 - OBRIGAÇÕES DA CONTRATADA ---
      drawSectionTitle('CLÁUSULA 7 — DAS OBRIGAÇÕES DA CONTRATADA');
      drawClauseItem(
        '7.1.',
        'Fornecer materiais e equipamentos novos, certificados pelo INMETRO, acompanhados de nota fiscal e manual de instruções, com equipe qualificada em conformidade com as normas ABNT e NRs.',
      );
      drawClauseItem(
        '7.2.',
        'Realizar testes elétricos de funcionamento, comissionamento e instruções básicas de operação do sistema e do aplicativo de monitoramento ao CONTRATANTE.',
      );
      drawClauseItem(
        '7.3.',
        'Corrigir, sem ônus para o CONTRATANTE e dentro de prazo razoável, quaisquer vícios de instalação formalmente comunicados durante a vigência da garantia dos serviços.',
      );
      drawClauseItem(
        '7.4.',
        `Prestar suporte técnico tempestivo através dos canais oficiais de comunicação da empresa: ${data.supportChannels}.`,
      );

      // --- CLÁUSULA 8 - OBRIGAÇÕES DO CONTRATANTE ---
      drawSectionTitle('CLÁUSULA 8 — DAS OBRIGAÇÕES DO CONTRATANTE');
      drawClauseItem(
        '8.1.',
        'Fornecer documentos cadastrais, conta de energia atualizada e assinar as procurações necessárias para a tramitação documental perante a distribuidora de energia.',
      );
      drawClauseItem(
        '8.2.',
        'Garantir livre acesso seguro da equipe técnica da CONTRATADA ao local de instalação nos horários acordados e zelar pela integridade do imóvel.',
      );
      drawClauseItem(
        '8.3.',
        'Efetuar pontualmente os pagamentos pactuados e não permitir qualquer intervenção mecânica ou elétrica no sistema por terceiros não autorizados pela CONTRATADA.',
      );
      drawClauseItem(
        '8.4.',
        'Disponibilizar sinal de internet Wi-Fi estável no ponto onde o inversor será afixado para permitir a comunicação com o servidor de monitoramento.',
      );

      // --- CLÁUSULA 9 - GARANTIAS ---
      drawSectionTitle('CLÁUSULA 9 — DAS GARANTIAS DOS EQUIPAMENTOS E SERVIÇOS');
      drawClauseItem(
        '9.1.',
        'Os equipamentos possuem garantias asseguradas diretamente por seus fabricantes, conforme certificados específicos: a) Módulos fotovoltaicos: garantia de produto de 12 a 15 anos e garantia de performance linear de 25 a 30 anos (mínimo 80%); b) Inversor solar: 5 a 10 anos conforme política fabril; c) Estruturas de fixação: 10 a 12 anos contra oxidação.',
      );
      drawClauseItem(
        '9.2.',
        `A CONTRATADA concede garantia técnica de ${data.deadlines.installationWarrantyMonths} meses para os serviços de montagem e instalação, contados a partir da emissão do termo de entrega técnica.`,
      );
      drawClauseItem(
        '9.3.',
        'A garantia de instalação cobre defeitos de execução, não abrangendo sinistros por força maior (vendavais extraordinários, descargas atmosféricas diretas que superem o limite dos protetores contra surtos - DPS) ou intervenções de terceiros.',
      );

      // --- CLÁUSULA 10 - SERVIÇOS NÃO INCLUÍDOS ---
      drawSectionTitle('CLÁUSULA 10 — DOS SERVIÇOS NÃO INCLUÍDOS');
      drawClauseItem(
        '10.1.',
        'Não integram o escopo contratual (salvo contratação expressa): reforços estruturais em coberturas, reforma em alvenaria ou impermeabilizações de telhados, retirada de telhas de amianto, poda de vegetação e reforma de padrão de entrada da distribuidora.',
      );
      drawClauseItem(
        '10.2.',
        'Caso sejam identificadas exigências adicionais supervenientes, a CONTRATADA apresentará laudo técnico e respectivo orçamento complementar para deliberação do CONTRATANTE.',
      );

      // --- CLÁUSULA 11 - SUSPENSÃO, RESCISÃO E CANCELAMENTO ---
      drawSectionTitle('CLÁUSULA 11 — DA SUSPENSÃO, RESCISÃO E PENALIDADES');
      drawClauseItem(
        '11.1.',
        `A parte que identificar descumprimento contratual notificará a outra, concedendo prazo de ${data.deadlines.curePeriodDays} dias úteis para regularização da obrigação.`,
      );
      drawClauseItem(
        '11.2.',
        'O atraso superior a 15 (quinze) dias no pagamento faculta à CONTRATADA a suspensão das atividades no imóvel até a regularização do débito.',
      );
      drawClauseItem(
        '11.3.',
        'Em caso de rescisão por iniciativa do CONTRATANTE antes do início da instalação, serão deduzidos os custos comprovados de vistorias, projetos de engenharia, emissão de ART e despesas logísticas de materiais sob encomenda.',
      );
      drawClauseItem(
        '11.4.',
        'Nas contratações celebradas fora do estabelecimento físico, é assegurado o direito de arrependimento no prazo legal estabelecido no art. 49 do Código de Defesa do Consumidor.',
      );

      // --- CLÁUSULA 12 - LGPD ---
      drawSectionTitle('CLÁUSULA 12 — DA PROTEÇÃO DE DADOS PESSOAIS (LGPD)');
      drawClauseItem(
        '12.1.',
        'Os dados pessoais do CONTRATANTE serão tratados em conformidade com a Lei nº 13.709/2018 (LGPD), exclusivamente para fins de faturamento, engenharia, homologação perante a concessionária de energia e assistência técnica.',
      );
      drawClauseItem(
        '12.2.',
        'O uso de imagem da instalação para fins promocionais e comerciais dependerá de anuência específica nos termos do Anexo IV deste contrato.',
      );

      // --- CLÁUSULA 13 - ACEITE E REGISTROS ---
      drawSectionTitle('CLÁUSULA 13 — DO ACEITE, ENTREGA TÉCNICA E REGISTROS');
      drawClauseItem(
        '13.1.',
        'Concluída a montagem e comissionamento, será lavrado o Termo de Entrega Técnica, registrando a conformidade dos equipamentos instalados e instruções repassadas.',
      );
      drawClauseItem(
        '13.2.',
        'O aceite da obra não afasta as garantias legais e contratuais asseguradas neste instrumento.',
      );

      // --- CLÁUSULA 14 - FORO ---
      drawSectionTitle('CLÁUSULA 14 — DAS DISPOSIÇÕES GERAIS E ELEIÇÃO DE FORO');
      drawClauseItem(
        '14.1.',
        'A tolerância quanto a eventuais atrasos ou descumprimentos pontuais não constituirá novação ou renúncia de direitos.',
      );
      drawClauseItem(
        '14.2.',
        'As partes elegem o Foro da Comarca de Recife/PE para dirimir controvérsias oriundas deste instrumento, respeitadas as normas processuais protetivas do Código de Defesa do Consumidor.',
      );
      drawClauseItem(
        '14.3.',
        'Este contrato poderá ser assinado fisicamente em duas vias de igual teor ou eletronicamente por meio de certificados digitais ou plataformas de assinatura eletrônica válidas nos termos da legislação vigente.',
      );

      // --- FORMALIZAÇÃO E ASSINATURAS ---
      ensureSpace(160);

      doc.roundedRect(MARGIN_LEFT, curY, CONTENT_WIDTH, 18, 3).fill(C_BG_CARD);
      doc.roundedRect(MARGIN_LEFT, curY, 4, 18, 2).fill(C_GREEN);
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(C_DARK)
        .text('FORMALIZAÇÃO E ASSINATURAS DAS PARTES', MARGIN_LEFT + 12, curY + 4.5);
      curY += 24;

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(C_MUTED)
        .text(
          `${data.city}, ${data.signingDate}. E, por estarem plenamente acordadas, as partes firmam o presente contrato e seus 4 (quatro) anexos integrantes.`,
          MARGIN_LEFT,
          curY,
          { width: CONTENT_WIDTH, align: 'center' },
        );
      curY += 24;

      // Signatures 2 columns (Contratada e Contratante)
      const sigBoxW = (CONTENT_WIDTH - 20) / 2;
      const sig1X = MARGIN_LEFT;
      const sig2X = MARGIN_LEFT + sigBoxW + 20;

      // Sign lines
      doc
        .moveTo(sig1X + 15, curY + 36)
        .lineTo(sig1X + sigBoxW - 15, curY + 36)
        .strokeColor(C_DARK)
        .lineWidth(0.8)
        .stroke();
      doc
        .moveTo(sig2X + 15, curY + 36)
        .lineTo(sig2X + sigBoxW - 15, curY + 36)
        .strokeColor(C_DARK)
        .lineWidth(0.8)
        .stroke();

      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor(C_DARK)
        .text(data.company.legalName, sig1X, curY + 44, { width: sigBoxW, align: 'center' });
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(C_MUTED)
        .text(
          `CONTRATADA: ${data.company.representative} (CPF ${data.company.representativeCpf})`,
          sig1X,
          curY + 58,
          { width: sigBoxW, align: 'center' },
        );

      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor(C_DARK)
        .text(data.client.name, sig2X, curY + 44, { width: sigBoxW, align: 'center' });
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(C_MUTED)
        .text(`CONTRATANTE: ${data.client.document}`, sig2X, curY + 58, {
          width: sigBoxW,
          align: 'center',
        });

      // --- ANEXO I: ESPECIFICAÇÃO TÉCNICA E MEMORIAL DESCRITIVO ---
      doc.addPage();
      curY = 50;
      drawRunningHeader();

      drawSectionTitle('ANEXO I — MEMORIAL DESCRITIVO DE EQUIPAMENTOS E ENGENHARIA');

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(C_MUTED)
        .text(
          'Este anexo consolida a especificação técnica e quantitativa dos equipamentos aprovados para implantação no sistema fotovoltaico:',
          MARGIN_LEFT,
          curY,
          { width: CONTENT_WIDTH },
        );
      curY += 16;

      // Equipment Table
      const bomCols = [
        { title: 'COMPONENTE', w: 110, align: 'left' as const },
        { title: 'MARCA / MODELO', w: 165, align: 'left' as const },
        { title: 'QTD', w: 55, align: 'center' as const },
        { title: 'ESPECIFICAÇÃO TÉCNICA', w: 185, align: 'left' as const },
      ];

      // Header Row
      doc.rect(MARGIN_LEFT, curY, CONTENT_WIDTH, 17).fill(C_GREEN);

      let hx = MARGIN_LEFT;
      for (const c of bomCols) {
        doc
          .font('Helvetica-Bold')
          .fontSize(7.5)
          .fillColor('#ffffff')
          .text(c.title, hx + 5, curY + 4.5, { width: c.w - 10, align: c.align });
        hx += c.w;
      }
      curY += 17;

      const bomRows: [string, string, string, string][] = [
        [
          'Módulos Fotovoltaicos',
          data.bom.moduleBrandModel,
          `${data.bom.moduleQuantity} un`,
          `${data.bom.modulePowerW} por módulo (Alta Eficiência)`,
        ],
        [
          'Inversor Solar On-Grid',
          data.bom.inverterBrandModel,
          `${data.bom.inverterQuantity} un`,
          `${data.bom.inverterPowerKw}, ${data.bom.inverterPhase}`,
        ],
        [
          'Estrutura de Fixação',
          data.bom.structureType,
          data.bom.structureQuantity,
          `Compatível com telhado ${data.project.roofType}`,
        ],
        [
          'Condutores Solares',
          data.bom.cableDescription,
          data.bom.cableQuantity,
          'Condutores solares anti-UV e halogen-free',
        ],
        [
          'Dispositivos de Proteção',
          data.bom.protectionDescription,
          data.bom.protectionQuantity,
          'DPS CC 1000V + Chave seccionadora e proteção CA',
        ],
        [
          'Interface Monitoramento',
          data.bom.monitoringType,
          '1 un',
          'Comunicação Wi-Fi com portal e aplicativo móvel',
        ],
      ];

      for (let idx = 0; idx < bomRows.length; idx++) {
        const row = bomRows[idx];
        if (!row) continue;
        const isEven = idx % 2 === 0;

        const h1 = doc.heightOfString(row[1], { width: bomCols[1]!.w - 10, fontSize: 7.5 });
        const h3 = doc.heightOfString(row[3], { width: bomCols[3]!.w - 10, fontSize: 7.5 });
        const rowH = Math.max(20, h1 + 8, h3 + 8);

        doc
          .rect(MARGIN_LEFT, curY, CONTENT_WIDTH, rowH)
          .fill(isEven ? '#ffffff' : C_BG_CARD)
          .strokeColor(C_BORDER_LIGHT)
          .lineWidth(0.6)
          .stroke();

        let rx = MARGIN_LEFT;
        for (let c = 0; c < bomCols.length; c++) {
          const col = bomCols[c]!;
          const cellVal = row[c]!;
          doc
            .font(c === 0 ? 'Helvetica-Bold' : 'Helvetica')
            .fontSize(7.5)
            .fillColor(c === 0 ? C_DARK : C_BODY)
            .text(cellVal, rx + 5, curY + 5, { width: col.w - 10, align: col.align });
          rx += col.w;
        }
        curY += rowH;
      }

      curY += 14;

      // Technical Summary Card
      doc
        .roundedRect(MARGIN_LEFT, curY, CONTENT_WIDTH, 42, 4)
        .fill(C_BG_CARD)
        .strokeColor(C_BORDER)
        .lineWidth(0.8)
        .stroke();

      const colW = CONTENT_WIDTH / 4;
      const drawStat = (label: string, val: string, x: number, y: number) => {
        doc
          .font('Helvetica')
          .fontSize(7)
          .fillColor(C_MUTED)
          .text(label, x + 8, y + 6);
        doc
          .font('Helvetica-Bold')
          .fontSize(9)
          .fillColor(C_GREEN)
          .text(val, x + 8, y + 20);
      };

      drawStat('POTÊNCIA TOTAL CC', data.project.systemPowerKwp, MARGIN_LEFT, curY);
      drawStat(
        'GERAÇÃO ESTIMADA MENSAL',
        data.project.estimatedMonthlyGenerationKwh,
        MARGIN_LEFT + colW,
        curY,
      );
      drawStat(
        'GERAÇÃO ESTIMADA ANUAL',
        data.project.estimatedAnnualGenerationKwh,
        MARGIN_LEFT + colW * 2,
        curY,
      );
      drawStat(
        'ÁREA DE TELHADO ESTIMADA',
        data.project.estimatedAreaM2,
        MARGIN_LEFT + colW * 3,
        curY,
      );

      curY += 54;

      // Monthly Generation Table
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor(C_DARK)
        .text('PREVISÃO MENSAL DE GERAÇÃO SOLAR ESTIMADA (kWh):', MARGIN_LEFT, curY);
      curY += 12;

      const months: [string, string][] = [
        ['Janeiro', data.generationMonthly['JAN'] ?? '0'],
        ['Fevereiro', data.generationMonthly['FEB'] ?? '0'],
        ['Março', data.generationMonthly['MAR'] ?? '0'],
        ['Abril', data.generationMonthly['APR'] ?? '0'],
        ['Maio', data.generationMonthly['MAY'] ?? '0'],
        ['Junho', data.generationMonthly['JUN'] ?? '0'],
        ['Julho', data.generationMonthly['JUL'] ?? '0'],
        ['Agosto', data.generationMonthly['AUG'] ?? '0'],
        ['Setembro', data.generationMonthly['SEP'] ?? '0'],
        ['Outubro', data.generationMonthly['OCT'] ?? '0'],
        ['Novembro', data.generationMonthly['NOV'] ?? '0'],
        ['Dezembro', data.generationMonthly['DEC'] ?? '0'],
      ];

      const mColW = CONTENT_WIDTH / 6;
      const mRowH = 24;

      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 6; c++) {
          const idx = r * 6 + c;
          const mItem = months[idx]!;
          const [mName, mVal] = mItem;
          const mx = MARGIN_LEFT + c * mColW;
          const my = curY + r * mRowH;

          doc
            .rect(mx, my, mColW, mRowH)
            .fill(idx % 2 === 0 ? '#ffffff' : C_BG_CARD)
            .strokeColor(C_BORDER_LIGHT)
            .lineWidth(0.6)
            .stroke();

          doc
            .font('Helvetica')
            .fontSize(6.5)
            .fillColor(C_MUTED)
            .text(mName, mx + 4, my + 3, { width: mColW - 8, align: 'center' });

          doc
            .font('Helvetica-Bold')
            .fontSize(8)
            .fillColor(C_DARK)
            .text(`${mVal || '0'} kWh`, mx + 4, my + 12, { width: mColW - 8, align: 'center' });
        }
      }
      curY += mRowH * 2 + 18;

      // --- ANEXO II: ESCOPO E EXCLUSÕES ---
      drawSectionTitle('ANEXO II — ESCOPO DE SERVIÇOS, FORNECIMENTO E EXCLUSÕES');

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(C_MUTED)
        .text(
          'Demonstrativo detalhado dos serviços inclusos e delimitação expressa de exclusões contratuais:',
          MARGIN_LEFT,
          curY,
          { width: CONTENT_WIDTH },
        );
      curY += 14;

      const scopeItems = [
        {
          title: 'Vistoria técnica presencial de viabilidade no imóvel',
          inc: data.scope.siteSurvey,
        },
        { title: 'Elaboração de projeto executivo e diagramas unifilares', inc: data.scope.design },
        {
          title: 'Emissão e recolhimento de ART (Anotação de Responsabilidade Técnica)',
          inc: data.scope.art,
        },
        {
          title: `Protocolo e acompanhamento do parecer de acesso perante ${data.utility.company}`,
          inc: data.scope.homologation,
        },
        {
          title: 'Montagem mecânica, estruturas em alumínio e cabeamento CC/CA',
          inc: data.scope.installation,
        },
        {
          title: 'Configuração do aplicativo de monitoramento solar Wi-Fi',
          inc: data.scope.monitoring,
        },
        {
          title: 'Treinamento operacional e entrega de manuais técnicos ao cliente',
          inc: data.scope.training,
        },
        {
          title: 'Emissão de relatório técnico de entrega e comissionamento',
          inc: data.scope.deliveryReport,
        },
      ];

      const scopeBoxW = (CONTENT_WIDTH - 10) / 2;
      const sItemH = 22;

      // Draw Checkboxes using clean vector graphics (ZERO UNICODE BUGS!)
      const drawVectorCheckbox = (x: number, y: number, checked: boolean) => {
        doc
          .roundedRect(x, y, 11, 11, 2.5)
          .lineWidth(0.9)
          .fillAndStroke(checked ? C_GREEN_LIGHT : '#ffffff', checked ? C_GREEN : C_BORDER);

        if (checked) {
          doc
            .moveTo(x + 2.5, y + 5.5)
            .lineTo(x + 4.5, y + 8.5)
            .lineTo(x + 8.5, y + 3)
            .strokeColor(C_GREEN)
            .lineWidth(1.4)
            .stroke();
        }
      };

      for (let i = 0; i < scopeItems.length; i += 2) {
        const item1 = scopeItems[i];
        if (!item1) continue;
        const item2 = scopeItems[i + 1];

        // Left item
        doc
          .roundedRect(MARGIN_LEFT, curY, scopeBoxW, sItemH, 3)
          .fill(item1.inc ? '#ffffff' : C_BG_CARD)
          .strokeColor(item1.inc ? C_GREEN_BORDER : C_BORDER_LIGHT)
          .lineWidth(0.6)
          .stroke();

        drawVectorCheckbox(MARGIN_LEFT + 8, curY + 5.5, item1.inc);
        doc
          .font(item1.inc ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(7.5)
          .fillColor(item1.inc ? C_DARK : C_MUTED)
          .text(item1.title, MARGIN_LEFT + 25, curY + 6, { width: scopeBoxW - 32 });

        // Right item
        if (item2) {
          const rx = MARGIN_LEFT + scopeBoxW + 10;
          doc
            .roundedRect(rx, curY, scopeBoxW, sItemH, 3)
            .fill(item2.inc ? '#ffffff' : C_BG_CARD)
            .strokeColor(item2.inc ? C_GREEN_BORDER : C_BORDER_LIGHT)
            .lineWidth(0.6)
            .stroke();

          drawVectorCheckbox(rx + 8, curY + 5.5, item2.inc);
          doc
            .font(item2.inc ? 'Helvetica-Bold' : 'Helvetica')
            .fontSize(7.5)
            .fillColor(item2.inc ? C_DARK : C_MUTED)
            .text(item2.title, rx + 25, curY + 6, { width: scopeBoxW - 32 });
        }

        curY += sItemH + 4;
      }

      curY += 8;

      // Exclusions Callout
      doc
        .roundedRect(MARGIN_LEFT, curY, CONTENT_WIDTH, 44, 3)
        .fill(C_BG_CARD)
        .strokeColor(C_BORDER_LIGHT)
        .lineWidth(0.7)
        .stroke();

      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor('#dc2626')
        .text('SERVIÇOS E ITENS EXPRESSAMENTE NÃO INCLUÍDOS:', MARGIN_LEFT + 8, curY + 5);

      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor(C_MUTED)
        .text(
          '• Reforço estrutural em vigas/madeiramento ou reforma de telhados • Troca de telhas danificadas preexistentes ou remoção de amianto • Obras civis de alvenaria e pintura • Reforma do padrão de entrada da concessionária • Disponibilização de sinal de internet Wi-Fi • Taxas extraordinárias de obras de rede da concessionária.',
          MARGIN_LEFT + 8,
          curY + 16,
          { width: CONTENT_WIDTH - 16, lineGap: 2 },
        );

      curY += 56;

      // --- ANEXO III & IV ON PAGE 5 ---
      doc.addPage();
      curY = 50;
      drawRunningHeader();

      drawSectionTitle('ANEXO III — CONDIÇÕES COMERCIAIS E CRONOGRAMA DE PARCELAS');

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(C_MUTED)
        .text(
          `Valor global do investimento: ${data.commercial.contractTotal} | Modalidade: ${data.commercial.paymentMethod} | Validade: ${data.commercial.commercialValidity}`,
          MARGIN_LEFT,
          curY,
          { width: CONTENT_WIDTH },
        );
      curY += 14;

      // Table of Milestones
      const msCols = [
        { title: 'ETAPA / MARCO EXECUTIVO', w: 155, align: 'left' as const },
        { title: '% TOTAL', w: 50, align: 'center' as const },
        { title: 'VALOR PARCELA', w: 90, align: 'right' as const },
        { title: 'VENCIMENTO', w: 95, align: 'center' as const },
        { title: 'CONDIÇÃO DE LIBERAÇÃO', w: 125, align: 'left' as const },
      ];

      doc.rect(MARGIN_LEFT, curY, CONTENT_WIDTH, 17).fill(C_GREEN);

      let mxPos = MARGIN_LEFT;
      for (const c of msCols) {
        doc
          .font('Helvetica-Bold')
          .fontSize(7.5)
          .fillColor('#ffffff')
          .text(c.title, mxPos + 5, curY + 4.5, { width: c.w - 10, align: c.align });
        mxPos += c.w;
      }
      curY += 17;

      for (let i = 0; i < data.commercial.milestones.length; i++) {
        const m = data.commercial.milestones[i];
        if (!m) continue;
        const isEven = i % 2 === 0;

        const hStage = doc.heightOfString(m.stage, { width: msCols[0]!.w - 10, fontSize: 7.5 });
        const hCond = doc.heightOfString(m.condition, { width: msCols[4]!.w - 10, fontSize: 7 });
        const rowH = Math.max(22, hStage + 8, hCond + 8);

        doc
          .rect(MARGIN_LEFT, curY, CONTENT_WIDTH, rowH)
          .fill(isEven ? '#ffffff' : C_BG_CARD)
          .strokeColor(C_BORDER_LIGHT)
          .lineWidth(0.6)
          .stroke();

        let cx = MARGIN_LEFT;
        doc
          .font('Helvetica-Bold')
          .fontSize(7.5)
          .fillColor(C_DARK)
          .text(m.stage, cx + 5, curY + 6, { width: msCols[0]!.w - 10 });
        cx += msCols[0]!.w;

        doc
          .font('Helvetica')
          .fontSize(7.5)
          .fillColor(C_MUTED)
          .text(m.percent, cx + 5, curY + 6, { width: msCols[1]!.w - 10, align: 'center' });
        cx += msCols[1]!.w;

        doc
          .font('Helvetica-Bold')
          .fontSize(7.5)
          .fillColor(C_GREEN)
          .text(m.amount, cx + 5, curY + 6, { width: msCols[2]!.w - 10, align: 'right' });
        cx += msCols[2]!.w;

        doc
          .font('Helvetica')
          .fontSize(7.5)
          .fillColor(C_BODY)
          .text(m.due, cx + 5, curY + 6, { width: msCols[3]!.w - 10, align: 'center' });
        cx += msCols[3]!.w;

        doc
          .font('Helvetica')
          .fontSize(7)
          .fillColor(C_MUTED)
          .text(m.condition, cx + 5, curY + 6, { width: msCols[4]!.w - 10 });

        curY += rowH;
      }

      curY += 14;

      // --- ANEXO IV: AUTORIZAÇÕES OPCIONAIS ---
      ensureSpace(140);
      drawSectionTitle('ANEXO IV — TERMO DE AUTORIZAÇÕES OPCIONAIS');

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(C_MUTED)
        .text(
          'As opções a seguir são estritamente facultativas e não condicionam o fornecimento ou a execução da garantia dos equipamentos:',
          MARGIN_LEFT,
          curY,
          { width: CONTENT_WIDTH },
        );
      curY += 12;

      const authOptions = [
        'Autorizo registros fotográficos estritamente técnicos do sistema para fins de auditoria, garantia e suporte.',
        'Autorizo a divulgação de fotografias do sistema em canais institucionais sem menção ao meu nome ou dados pessoais.',
        'Autorizo a divulgação de fotografias da instalação com citação do meu nome ou empresa como caso de sucesso.',
        'Autorizo o uso de depoimento ou relato de satisfação prévia e expressamente aprovado por mim.',
        'Não autorizo qualquer veiculação pública de fotografias, depoimentos ou imagens da instalação.',
      ];

      for (const opt of authOptions) {
        drawVectorCheckbox(MARGIN_LEFT + 6, curY + 2, false);
        doc
          .font('Helvetica')
          .fontSize(7.5)
          .fillColor(C_BODY)
          .text(opt, MARGIN_LEFT + 24, curY + 2.5, { width: CONTENT_WIDTH - 30 });
        curY += 15;
      }

      curY += 10;

      // Client signature line for Annex IV
      const aivW = 240;
      const aivX = MARGIN_LEFT + (CONTENT_WIDTH - aivW) / 2;
      doc
        .moveTo(aivX, curY + 16)
        .lineTo(aivX + aivW, curY + 16)
        .strokeColor(C_DARK)
        .lineWidth(0.8)
        .stroke();
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor(C_DARK)
        .text(data.client.name, aivX, curY + 20, { width: aivW, align: 'center' });
      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor(C_MUTED)
        .text(`Data: ${data.signingDate}`, aivX, curY + 30, { width: aivW, align: 'center' });

      // --- FOOTERS WITH EXACT TWO-PASS PAGINATION ---
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        const oldBottom = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;

        // Running footer line
        doc
          .moveTo(MARGIN_LEFT, PAGE_HEIGHT - 32)
          .lineTo(MARGIN_LEFT + CONTENT_WIDTH, PAGE_HEIGHT - 32)
          .strokeColor(C_BORDER_LIGHT)
          .lineWidth(0.7)
          .stroke();

        doc
          .font('Helvetica')
          .fontSize(6.8)
          .fillColor(C_LIGHT_MUTED)
          .text(
            `Contrato ${data.contractNumber} — ${data.company.legalName} (CNPJ ${data.company.cnpj})`,
            MARGIN_LEFT,
            PAGE_HEIGHT - 24,
            { width: CONTENT_WIDTH - 100, lineBreak: false },
          );

        doc
          .font('Helvetica-Bold')
          .fontSize(7)
          .fillColor(C_MUTED)
          .text(
            `Página ${i + 1} de ${range.count}`,
            MARGIN_LEFT + CONTENT_WIDTH - 80,
            PAGE_HEIGHT - 24,
            { width: 80, align: 'right', lineBreak: false },
          );

        doc.page.margins.bottom = oldBottom;
      }

      doc.end();
    });
  }

  computeHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }
}
