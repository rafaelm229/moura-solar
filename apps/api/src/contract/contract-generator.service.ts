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
  witnesses: {
    witness1Name: string;
    witness1Cpf: string;
    witness2Name: string;
    witness2Cpf: string;
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
      if (unzipRes.status !== 0) {
        throw new Error(`Falha ao descompactar template docx: ${unzipRes.stderr?.toString()}`);
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

        // Witnesses
        '{{WITNESS_1_NAME}}': data.witnesses.witness1Name,
        '{{WITNESS_1_CPF}}': data.witnesses.witness1Cpf,
        '{{WITNESS_2_NAME}}': data.witnesses.witness2Name,
        '{{WITNESS_2_CPF}}': data.witnesses.witness2Cpf,

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
      if (zipRes.status !== 0) {
        throw new Error(`Falha ao compactar contrato docx: ${zipRes.stderr?.toString()}`);
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
        margin: 40,
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

      const primary = '#0f172a';
      const green = '#16a34a';
      const gray = '#475569';
      const lightBg = '#f8fafc';
      const border = '#cbd5e1';

      // Header on first page
      try {
        doc.image(this.logoPath, 40, 36, { width: 52 });
      } catch {
        // Fallback without logo
      }

      doc
        .font('Helvetica-Bold')
        .fontSize(15)
        .fillColor(primary)
        .text('MOURA SOLAR ENGENHARIA', 105, 38);
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(gray)
        .text('CONTRATO DE FORNECIMENTO E INSTALAÇÃO DE SISTEMA FOTOVOLTAICO', 105, 54);

      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(green)
        .text(data.contractNumber, 420, 38, { align: 'right', width: 135 });
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(gray)
        .text(`Emissão: ${data.signingDate}`, 420, 52, { align: 'right', width: 135 });

      doc.moveTo(40, 80).lineTo(555, 80).strokeColor(border).lineWidth(1).stroke();

      let y = 92;

      const drawSectionHeader = (title: string) => {
        if (y > 720) {
          doc.addPage();
          y = 45;
        }
        doc.rect(40, y, 515, 20).fill(lightBg);
        doc.rect(40, y, 4, 20).fill(green);
        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .fillColor(primary)
          .text(title, 50, y + 5);
        y += 28;
      };

      // Partes
      drawSectionHeader('1. QUALIFICAÇÃO DAS PARTES');
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(primary).text('CONTRATADA:', 45, y);
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(gray)
        .text(
          `${data.company.legalName}, CNPJ ${data.company.cnpj}, com sede em ${data.company.address}, representada por ${data.company.representative} (CPF ${data.company.representativeCpf}), e-mail ${data.company.email}, tel. ${data.company.phone}.`,
          45,
          y + 11,
          { width: 510 },
        );
      y += 34;

      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(primary).text('CONTRATANTE:', 45, y);
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(gray)
        .text(
          `${data.client.name}, CPF/CNPJ ${data.client.document}, doc. secundário ${data.client.secondaryDocument}, endereço ${data.client.address}, CEP ${data.client.zipCode}, tel. ${data.client.phone}, e-mail ${data.client.email}. Unidade Consumidora: ${data.utility.customerUnit} (${data.utility.company}).`,
          45,
          y + 11,
          { width: 510 },
        );
      y += 38;

      // Objeto e Local
      drawSectionHeader('2. OBJETO, ESPECIFICAÇÕES E LOCAL DE INSTALAÇÃO');
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(primary)
        .text(
          `O presente instrumento tem por objeto a prestação de serviços de engenharia, fornecimento de equipamentos, montagem física, comissionamento e protocolo de homologação junto à concessionária ${data.utility.company} de 1 (um) ${data.project.type}, com potência total de ${data.project.systemPowerKwp}, instalado em ${data.project.installationAddress}.`,
          45,
          y,
          { width: 510, lineGap: 2 },
        );
      y += 32;

      // Resumo Técnico em Grid
      doc.rect(40, y, 515, 34).fill(lightBg).strokeColor(border).stroke();
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(gray)
        .text('POTÊNCIA DC', 48, y + 4);
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(primary)
        .text(data.project.systemPowerKwp, 48, y + 16);

      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(gray)
        .text('GERAÇÃO ESTIMADA', 170, y + 4);
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(green)
        .text(`${data.project.estimatedMonthlyGenerationKwh} médios`, 170, y + 16);

      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(gray)
        .text('ÁREA ESTIMADA', 320, y + 4);
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(primary)
        .text(data.project.estimatedAreaM2, 320, y + 16);

      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(gray)
        .text('SUPERFÍCIE / TIPO', 440, y + 4);
      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor(primary)
        .text(data.project.roofType.slice(0, 16), 440, y + 16);
      y += 44;

      // Valor e Pagamento
      drawSectionHeader('3. VALOR TOTAL E CONDIÇÕES DE PAGAMENTO');
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(primary)
        .text(
          `O valor total certo e ajustado do presente contrato é de ${data.commercial.contractTotal}, a ser quitado na modalidade ${data.commercial.paymentMethod}, respeitando o seguinte cronograma financeiro vinculado às etapas executivas:`,
          45,
          y,
          { width: 510 },
        );
      y += 24;

      // Tabela de Marcos
      doc.rect(40, y, 515, 16).fill('#e2e8f0');
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(primary);
      doc.text('ETAPA / MARCO', 46, y + 4);
      doc.text('%', 185, y + 4);
      doc.text('VALOR', 230, y + 4);
      doc.text('VENCIMENTO', 330, y + 4);
      doc.text('CONDIÇÃO EXECUTIVA', 430, y + 4);
      y += 16;

      for (const m of data.commercial.milestones) {
        doc.rect(40, y, 515, 16).strokeColor(border).stroke();
        doc
          .font('Helvetica-Bold')
          .fontSize(7.5)
          .fillColor(primary)
          .text(m.stage, 46, y + 4);
        doc.font('Helvetica').fontSize(7.5).fillColor(gray);
        doc.text(m.percent, 185, y + 4);
        doc.text(m.amount, 230, y + 4);
        doc.text(m.due, 330, y + 4);
        doc.text(m.condition, 430, y + 4, { width: 120 });
        y += 16;
      }
      y += 10;

      // Prazos e Obrigações
      drawSectionHeader('4. PRAZOS, GARANTIAS E DISPOSIÇÕES GERAIS');
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(primary)
        .text(
          `a) Entrega de Equipamentos: até ${data.deadlines.equipmentDeliveryDays} dias úteis após confirmação de pagamento da entrada.\n` +
            `b) Instalação Física: até ${data.deadlines.installationDays} dias úteis a contar da disponibilidade dos equipamentos no local.\n` +
            `c) Homologação Documental: até ${data.deadlines.documentationDays} dias úteis para protocolo e acompanhamento perante a concessionária.\n` +
            `d) Garantia de Instalação e Serviços: ${data.deadlines.installationWarrantyMonths} meses assegurados diretamente pela Contratada.\n` +
            `e) Canais de Atendimento e Suporte Técnico: ${data.supportChannels}.\n` +
            `f) Foro: Fica eleito o Foro da Comarca de ${data.city}/PE para dirimir quaisquer dúvidas oriundas deste contrato.`,
          45,
          y,
          { width: 510, lineGap: 3 },
        );
      y += 75;

      // Anexo I - BOM
      drawSectionHeader('ANEXO I — MEMORIAL DESCRITIVO DE EQUIPAMENTOS E MATERIAIS');
      doc.font('Helvetica').fontSize(7.5).fillColor(gray);

      const items = [
        [
          'Módulos Fotovoltaicos',
          `${data.bom.moduleQuantity} un`,
          `${data.bom.moduleBrandModel} (${data.bom.modulePowerW})`,
        ],
        [
          'Inversor Solar',
          `${data.bom.inverterQuantity} un`,
          `${data.bom.inverterBrandModel} (${data.bom.inverterPowerKw}, ${data.bom.inverterPhase})`,
        ],
        ['Estrutura de Fixação', data.bom.structureQuantity, data.bom.structureType],
        ['Condutores e Cabos', data.bom.cableQuantity, data.bom.cableDescription],
        ['Proteção CC / CA', data.bom.protectionQuantity, data.bom.protectionDescription],
        ['Monitoramento', '1 un', data.bom.monitoringType],
      ];

      for (const [title, qtd, desc] of items) {
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(primary).text(title, 45, y);
        doc.font('Helvetica').fontSize(7.5).fillColor(gray).text(qtd, 190, y);
        doc.text(desc, 250, y, { width: 300 });
        y += 12;
      }
      y += 12;

      // Anexo III - Escopo
      drawSectionHeader('ANEXO III — ESCOPO DE SERVIÇOS E FORNECIMENTO');
      const scopeList = [
        ['Vistoria técnica presencial de viabilidade', data.scope.siteSurvey],
        ['Elaboração de projeto executivo e diagramas unifilares', data.scope.design],
        ['Emissão e recolhimento de ART (Anotação de Responsabilidade Técnica)', data.scope.art],
        [
          'Protocolo e gestão do processo de homologação na concessionária',
          data.scope.homologation,
        ],
        ['Montagem estrutural, fixação dos módulos e cabeamento CC/CA', data.scope.installation],
        ['Configuração de interface de monitoramento e aplicativo', data.scope.monitoring],
        ['Treinamento operacional para o cliente', data.scope.training],
        ['Relatório de entrega técnica e comissionamento', data.scope.deliveryReport],
      ];

      for (let i = 0; i < scopeList.length; i += 2) {
        const item1 = scopeList[i];
        if (!item1) continue;
        const [t1, inc1] = item1;
        const item2 = scopeList[i + 1];
        const [t2, inc2] = item2 ?? ['', false];
        doc
          .font('Helvetica-Bold')
          .fontSize(7.5)
          .fillColor(inc1 ? green : gray)
          .text(inc1 ? '☑' : '☐', 45, y);
        doc
          .font('Helvetica')
          .fontSize(7.5)
          .fillColor(primary)
          .text(t1 as string, 58, y, { width: 220 });

        if (t2) {
          doc
            .font('Helvetica-Bold')
            .fontSize(7.5)
            .fillColor(inc2 ? green : gray)
            .text(inc2 ? '☑' : '☐', 300, y);
          doc
            .font('Helvetica')
            .fontSize(7.5)
            .fillColor(primary)
            .text(t2 as string, 313, y, { width: 220 });
        }
        y += 13;
      }
      y += 18;

      // Assinaturas
      if (y > 670) {
        doc.addPage();
        y = 50;
      }
      drawSectionHeader('FORMALIZAÇÃO E ASSINATURAS');
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(gray)
        .text(
          `${data.city}, ${data.signingDate}. As partes assinam o presente contrato em concordância integral com todas as suas cláusulas e anexos.`,
          45,
          y,
          { width: 510 },
        );
      y += 32;

      // Bloco de Assinaturas (2 colunas)
      const sigY = y;
      doc.moveTo(50, sigY).lineTo(250, sigY).strokeColor(primary).stroke();
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor(primary)
        .text(data.company.legalName, 50, sigY + 4, { width: 200, align: 'center' });
      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor(gray)
        .text(`Contratada: ${data.company.representative}`, 50, sigY + 15, {
          width: 200,
          align: 'center',
        });

      doc.moveTo(330, sigY).lineTo(530, sigY).strokeColor(primary).stroke();
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor(primary)
        .text(data.client.name, 330, sigY + 4, { width: 200, align: 'center' });
      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor(gray)
        .text(`Contratante: ${data.client.document}`, 330, sigY + 15, {
          width: 200,
          align: 'center',
        });

      const witY = sigY + 48;
      doc.moveTo(50, witY).lineTo(250, witY).strokeColor(primary).stroke();
      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor(primary)
        .text(data.witnesses.witness1Name, 50, witY + 4, { width: 200, align: 'center' });
      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor(gray)
        .text(`CPF: ${data.witnesses.witness1Cpf}`, 50, witY + 14, { width: 200, align: 'center' });

      doc.moveTo(330, witY).lineTo(530, witY).strokeColor(primary).stroke();
      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor(primary)
        .text(data.witnesses.witness2Name, 330, witY + 4, { width: 200, align: 'center' });
      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor(gray)
        .text(`CPF: ${data.witnesses.witness2Cpf}`, 330, witY + 14, {
          width: 200,
          align: 'center',
        });

      // Page numbers on all pages
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc
          .font('Helvetica')
          .fontSize(7)
          .fillColor('#94a3b8')
          .text(
            `Contrato ${data.contractNumber} — Moura Solar — Página ${i + 1} de ${range.count}`,
            40,
            800,
            { align: 'center', width: 515 },
          );
      }

      doc.end();
    });
  }

  computeHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }
}
