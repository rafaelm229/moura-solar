import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { basename } from 'node:path';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../database/audit.service';
import { StorageService } from '../proposal/storage.service';
import { ContractGeneratorService, type ContractTemplateData } from './contract-generator.service';
import { FinancialService } from '../financial/financial.service';
import type {
  ActivityCreatedEventV1,
  ContractCanceledEventV1,
  ContractDeliveredEventV1,
} from '@moura-solar/contracts';
import {
  CreateContractDto,
  UpdateContractDraftDto,
  RequestContractReviewDto,
  ApproveContractDto,
  RecordContractDeliveryDto,
  UploadSignedContractDto,
  VerifySignedContractDto,
  CreateAmendmentDto,
  CancelContractDto,
  SignedReviewDecision,
} from './contract.dto';

@Injectable()
export class ContractService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly generator: ContractGeneratorService,
    private readonly audit: AuditService,
    private readonly financial: FinancialService,
  ) {}

  private buildTemplateData(
    code: string,
    partySnapshot: any,
    technicalSnapshot: any,
    commercialSnapshot: any,
    scopeSnapshot: any,
    clausesSnapshot: any,
  ): ContractTemplateData {
    return {
      contractNumber: code,
      signingDate: new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date()),
      city: clausesSnapshot?.city || 'Recife',
      company: partySnapshot?.company,
      client: partySnapshot?.client,
      utility: partySnapshot?.utility,
      project: {
        type: technicalSnapshot?.projectType || 'Sistema Fotovoltaico Conectado à Rede (On-Grid)',
        systemPowerKwp: technicalSnapshot?.systemPowerKwp || '7.20 kWp',
        estimatedMonthlyGenerationKwh:
          technicalSnapshot?.estimatedMonthlyGenerationKwh || '960 kWh/mês',
        estimatedAnnualGenerationKwh:
          technicalSnapshot?.estimatedAnnualGenerationKwh || '11520 kWh/ano',
        installationAddress:
          technicalSnapshot?.installationAddress || partySnapshot?.client?.address || '',
        roofType: technicalSnapshot?.roofType || 'Cerâmico',
        estimatedAreaM2: technicalSnapshot?.estimatedAreaM2 || '36 m²',
      },
      commercial: {
        contractTotal: commercialSnapshot?.contractTotal || 'R$ 0,00',
        paymentMethod: commercialSnapshot?.paymentMethod || 'PIX',
        lateInterestMonthly: commercialSnapshot?.lateInterestMonthly || '1,0%',
        adjustmentIndex: commercialSnapshot?.adjustmentIndex || 'IPCA (IBGE)',
        commercialValidity: commercialSnapshot?.commercialValidity || '30 dias',
        specialConditions: commercialSnapshot?.specialConditions || 'Sem condições especiais',
        milestones: commercialSnapshot?.milestones || [],
      },
      deadlines: clausesSnapshot?.deadlines || {
        equipmentDeliveryDays: '30 dias úteis',
        installationDays: '10 dias úteis',
        documentationDays: '15 dias úteis',
        installationWarrantyMonths: '12 meses',
      },
      bom: technicalSnapshot?.bom || {
        moduleBrandModel: 'Canadian Solar CS6W-550MS',
        modulePowerW: '550 W',
        moduleQuantity: '13',
        inverterBrandModel: 'Growatt MIN 6000TL-X',
        inverterPowerKw: '6.0 kW',
        inverterQuantity: '1',
      },
      generationMonthly: technicalSnapshot?.generationMonthly,
      scope: scopeSnapshot || {},
      witnesses: clausesSnapshot?.witnesses,
      supportChannels:
        clausesSnapshot?.supportChannels ||
        'suporte@mourasolar.com.br | (81) 3456-7890 | WhatsApp (81) 98765-4321',
    };
  }

  async createContract(organizationId: string, userId: string, dto: CreateContractDto) {
    const opp = await this.prisma.opportunity.findFirst({
      where: { id: dto.opportunityId, organizationId },
      include: {
        customer: {
          include: {
            contacts: true,
            addresses: true,
          },
        },
        utilityUnit: true,
        proposals: {
          include: {
            versions: {
              include: {
                acceptance: true,
                designVersion: true,
              },
            },
          },
        },
      },
    });

    if (!opp) {
      throw new NotFoundException('Oportunidade comercial não encontrada');
    }

    // Find accepted proposal version
    let acceptedProposalVersion: any = null;
    let parentProposal: any = null;

    if (dto.acceptedProposalVersionId) {
      for (const p of opp.proposals) {
        const v = p.versions.find((ver) => ver.id === dto.acceptedProposalVersionId);
        if (v) {
          acceptedProposalVersion = v;
          parentProposal = p;
          break;
        }
      }
      if (!acceptedProposalVersion) {
        throw new NotFoundException('Versão de proposta aceita especificada não encontrada');
      }
    } else {
      // Find the one that was accepted
      for (const p of opp.proposals) {
        const v = p.versions.find((ver) => ver.status === 'ACCEPTED' || ver.acceptance !== null);
        if (v) {
          acceptedProposalVersion = v;
          parentProposal = p;
          break;
        }
      }
    }

    if (!acceptedProposalVersion) {
      throw new UnprocessableEntityException(
        'A oportunidade deve possuir uma proposta comercial aceita formalmente para a geração do contrato (SPEC-007 Item 5)',
      );
    }

    // Check if an active contract already exists for this opportunity
    const existingContract = await this.prisma.contract.findFirst({
      where: {
        opportunityId: opp.id,
        state: { notIn: ['CANCELED', 'TERMINATED'] },
      },
      include: {
        versions: {
          include: { documents: true },
        },
        deliveries: true,
        signedReviews: true,
        projectGates: true,
      },
    });

    if (existingContract) {
      return existingContract;
    }

    // Generate contract code: CTR-YYYY-NNNN
    const year = new Date().getFullYear();
    const count = await this.prisma.contract.count({
      where: { organizationId },
    });
    const code = `CTR-${year}-${String(count + 1).padStart(4, '0')}`;

    // Extract snapshot data
    const customerSnap = acceptedProposalVersion.customerSnapshot as any;
    const utilitySnap = acceptedProposalVersion.utilityUnitSnapshot as any;
    const technicalSnap = acceptedProposalVersion.technicalSnapshot as any;
    const commercialSnap = acceptedProposalVersion.commercialSnapshot as any;

    const primaryAddress =
      opp.customer.addresses.find((a) => a.isPrimary) || opp.customer.addresses[0];
    const clientAddressStr = primaryAddress
      ? `${primaryAddress.street}, ${primaryAddress.number}${primaryAddress.complement ? ` - ${primaryAddress.complement}` : ''} - ${primaryAddress.district || ''}, ${primaryAddress.city}/${primaryAddress.state}`
      : customerSnap?.address || 'Endereço não informado';

    const clientPhone =
      opp.customer.contacts.find((c) => c.type === 'PHONE' || c.type === 'WHATSAPP')?.value ||
      customerSnap?.phone ||
      'Não informado';
    const clientEmail =
      opp.customer.contacts.find((c) => c.type === 'EMAIL')?.value ||
      customerSnap?.email ||
      'Não informado';

    const finalPriceNum = Number(acceptedProposalVersion.finalPrice);
    const formattedTotal = `R$ ${finalPriceNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // 1. Verificar plano de pagamento existente no banco para a oportunidade
    const existingPaymentPlan = await this.prisma.paymentPlan.findFirst({
      where: { opportunityId: opp.id, status: { in: ['ACTIVE', 'COMPLETED'] } },
      include: { receivables: { orderBy: { installmentNumber: 'asc' } } },
    });

    let paymentMethod = dto.paymentMethod || 'Transferência Bancária / Financiamento Solar';
    let milestones: Array<{
      stage: string;
      percent: string;
      amount: string;
      due: string;
      condition: string;
    }> = [];

    if (dto.milestones && Array.isArray(dto.milestones) && dto.milestones.length > 0) {
      milestones = dto.milestones.map((m) => ({
        stage: m.stage,
        percent: m.percent,
        amount: m.amount,
        due: m.due || 'Conforme cronograma',
        condition: m.condition || 'Conclusão da etapa',
      }));
    } else if (existingPaymentPlan && existingPaymentPlan.receivables.length > 0) {
      paymentMethod = existingPaymentPlan.paymentMethod || paymentMethod;
      const planTotal = Number(existingPaymentPlan.totalAmount) || finalPriceNum;
      milestones = existingPaymentPlan.receivables.map((r) => {
        const amt = Number(r.originalAmount);
        const pct = planTotal > 0 ? Math.round((amt / planTotal) * 100) : 0;
        const dueFormatted = r.dueDate
          ? new Intl.DateTimeFormat('pt-BR').format(new Date(r.dueDate))
          : 'A combinar';
        return {
          stage: r.title,
          percent: `${pct}%`,
          amount: `R$ ${amt.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          due: dueFormatted,
          condition:
            r.notes ||
            (r.installmentNumber === 1
              ? 'Na assinatura do contrato'
              : `Parcela ${r.installmentNumber}`),
        };
      });
    } else if (dto.downPaymentAmount !== undefined && dto.downPaymentAmount > 0) {
      const down = Math.min(dto.downPaymentAmount, finalPriceNum);
      const remaining = finalPriceNum - down;
      const count = dto.installmentCount && dto.installmentCount > 1 ? dto.installmentCount - 1 : 1;
      const remPerInstallment = count > 0 ? remaining / count : 0;

      const downPct = Math.round((down / finalPriceNum) * 100);
      milestones.push({
        stage: 'Entrada / Assinatura',
        percent: `${downPct}%`,
        amount: `R$ ${down.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        due: 'Na assinatura do contrato',
        condition: 'Assinatura e envio do contrato formal',
      });

      for (let i = 0; i < count; i++) {
        const remPct = Math.round((remPerInstallment / finalPriceNum) * 100);
        milestones.push({
          stage: count === 1 ? 'Saldo Final na Conclusão' : `Parcela ${i + 2}`,
          percent: `${remPct}%`,
          amount: `R$ ${remPerInstallment.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          due: `Em ${(i + 1) * 30} dias`,
          condition:
            count === 1
              ? 'Conclusão da instalação e termo emitido'
              : `Vencimento em ${(i + 1) * 30} dias`,
        });
      }
    } else {
      // Padrão Moura Solar 4 Marcos
      const p1Amount = finalPriceNum * 0.3;
      const p2Amount = finalPriceNum * 0.4;
      const p3Amount = finalPriceNum * 0.2;
      const p4Amount = finalPriceNum * 0.1;

      milestones = [
        {
          stage: 'Entrada / Assinatura',
          percent: '30%',
          amount: `R$ ${p1Amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          due: 'Na assinatura do contrato',
          condition: 'Assinatura e envio do contrato formal',
        },
        {
          stage: 'Entrega dos Equipamentos',
          percent: '40%',
          amount: `R$ ${p2Amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          due: 'Na entrega dos materiais no imóvel',
          condition: 'Conferência física dos módulos e inversor',
        },
        {
          stage: 'Conclusão da Instalação',
          percent: '20%',
          amount: `R$ ${p3Amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          due: 'No término da montagem física',
          condition: 'Termo de comissionamento emitido',
        },
        {
          stage: 'Troca do Medidor / Acesso',
          percent: '10%',
          amount: `R$ ${p4Amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          due: 'Após homologação pela concessionária',
          condition: 'Parecer de acesso e troca do medidor bidirecional',
        },
      ];
    }

    const partySnapshot = {
      company: {
        legalName: 'Moura Solar Engenharia e Energia Sustentável Ltda.',
        cnpj: '12.345.678/0001-90',
        address: 'Av. Solar dos Ventos, 1000 - Empresarial Moura - Recife/PE - CEP 51000-000',
        representative: 'Rafael Moura - Diretor Operacional',
        representativeCpf: '012.345.678-90',
        phone: '(81) 3456-7890',
        email: 'contato@mourasolar.com.br',
      },
      client: {
        name: opp.customer.legalName,
        document: opp.customer.taxId || customerSnap?.taxId || 'Não informado',
        secondaryDocument: 'Isento / Não aplicável',
        address: clientAddressStr,
        zipCode: primaryAddress?.postalCode || '51000-000',
        phone: clientPhone,
        email: clientEmail,
      },
      utility: {
        customerUnit: opp.utilityUnit?.externalCode || utilitySnap?.externalCode || 'UC-PADRAO',
        company:
          opp.utilityUnit?.distributorName ||
          utilitySnap?.distributorName ||
          'Neoenergia Pernambuco',
        tariff: '0,95',
        connectionType:
          opp.utilityUnit?.connectionType || utilitySnap?.connectionType || 'Bifásico 220V',
      },
    };

    const technicalSnapshot = {
      projectType: 'Sistema Fotovoltaico Conectado à Rede (On-Grid)',
      systemPowerKwp: `${technicalSnap?.dcPowerKwp || '7.20'} kWp`,
      estimatedMonthlyGenerationKwh: `${Math.round(technicalSnap?.estimatedMonthlyGenerationKwh || 960)} kWh/mês`,
      estimatedAnnualGenerationKwh: `${Math.round(technicalSnap?.estimatedAnnualGenerationKwh || 11520)} kWh/ano`,
      installationAddress: clientAddressStr,
      roofType: dto.roofType || 'Cerâmico / Fibrocimento',
      estimatedAreaM2: `${Math.round((technicalSnap?.dcPowerKwp || 7.2) * 5)} m²`,
      bom: {
        moduleBrandModel: technicalSnap?.modulesDescription || 'Canadian Solar CS6W-550MS',
        modulePowerW: '550 W',
        moduleQuantity: String(Math.ceil(((technicalSnap?.dcPowerKwp || 7.2) * 1000) / 550)),
        inverterBrandModel: technicalSnap?.invertersDescription || 'Growatt MIN 6000TL-X',
        inverterPowerKw: `${technicalSnap?.acPowerKw || 6.0} kW`,
        inverterQuantity: '1',
        inverterPhase: 'Monofásico 220V',
        batteryBrandModel: 'N/A',
        batteryCapacityKwh: 'N/A',
        batteryQuantity: '0',
        structureType: 'Estrutura em Alumínio c/ fixadores em inox',
        structureQuantity: '1 kit completo',
        cableDescription: 'Cabos solares 4mm² e 6mm² CC com proteção UV',
        cableQuantity: '100 m',
        protectionDescription: 'String Box CC 1000V com DPS e seccionadora',
        protectionQuantity: '1 conjunto',
        monitoringType: 'Interface Wi-Fi integrada com aplicativo móvel',
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
    };

    const commercialSnapshot = {
      contractTotal: formattedTotal,
      contractTotalNumber: finalPriceNum,
      paymentMethod,
      lateInterestMonthly: '1% ao mês acrescido de multa moratória de 2%',
      adjustmentIndex: 'IPCA / IBGE',
      commercialValidity: '10 dias úteis',
      specialConditions:
        dto.notes || 'Incluso suporte técnico e monitoramento pelo período de garantia.',
      milestones,
    };

    const scopeSnapshot = {
      siteSurvey: true,
      design: true,
      homologation: true,
      installation: true,
      art: true,
      monitoring: true,
      training: true,
      deliveryReport: true,
      meter: false,
    };

    const clausesSnapshot = {
      deadlines: {
        equipmentDeliveryDays: '15',
        installationDays: '10',
        documentationDays: '20',
        curePeriodDays: '15',
        installationWarrantyMonths: '12',
      },
      supportChannels: 'suporte@mourasolar.com.br | (81) 3456-7890 | WhatsApp (81) 98765-4321',
      city: dto.signingCity || 'Recife',
    };

    const templateData = this.buildTemplateData(
      code,
      partySnapshot,
      technicalSnapshot,
      commercialSnapshot,
      scopeSnapshot,
      clausesSnapshot,
    );

    // Generate documents
    const docxBuffer = await this.generator.generateDocx(templateData);
    const pdfBuffer = await this.generator.generatePdf(templateData);

    const docxHash = this.generator.computeHash(docxBuffer);
    const pdfHash = this.generator.computeHash(pdfBuffer);

    // Save in Database with concurrency protection, idempotent check and audit
    let attempts = 0;
    let contract: any;

    while (true) {
      try {
        contract = await this.prisma.$transaction(async (tx) => {
          const alreadyExists = await tx.contract.findFirst({
            where: {
              opportunityId: opp.id,
              state: { notIn: ['CANCELED', 'TERMINATED'] },
            },
            include: {
              versions: {
                include: { documents: true },
              },
              deliveries: true,
              signedReviews: true,
              projectGates: true,
            },
          });

          if (alreadyExists) {
            return alreadyExists;
          }

          const currentCount = await tx.contract.count({
            where: { organizationId },
          });
          const currentCode = `CTR-${year}-${String(currentCount + 1).padStart(4, '0')}`;

          const createdContract = await tx.contract.create({
            data: {
              organizationId,
              opportunityId: opp.id,
              acceptedProposalVersionId: acceptedProposalVersion.id,
              code: currentCode,
              state: 'READY',
              notes: dto.notes,
            },
          });

          const createdVersion = await tx.contractVersion.create({
            data: {
              organizationId,
              contractId: createdContract.id,
              versionNumber: 1,
              status: 'READY',
              partySnapshot,
              technicalSnapshot,
              commercialSnapshot,
              scopeSnapshot,
              clausesSnapshot,
              contentHash: pdfHash,
              createdById: userId,
            },
          });

          await tx.contract.update({
            where: { id: createdContract.id },
            data: { activeVersionId: createdVersion.id },
          });

          // Save document records
          const docxKey = `contracts/${createdContract.id}/v1/contrato-${currentCode}.docx`;
          const pdfKey = `contracts/${createdContract.id}/v1/contrato-${currentCode}.pdf`;

          await this.storage.upload(
            'moura-solar-contracts',
            docxKey,
            docxBuffer,
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          );
          await this.storage.upload('moura-solar-contracts', pdfKey, pdfBuffer, 'application/pdf');

          await tx.contractDocument.create({
            data: {
              organizationId,
              contractVersionId: createdVersion.id,
              type: 'DOCX_CONTRACT',
              fileName: `contrato-${currentCode}.docx`,
              fileSize: docxBuffer.length,
              mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              s3Bucket: 'moura-solar-contracts',
              s3Key: docxKey,
              contentHash: docxHash,
              generationStatus: 'READY',
            },
          });

          await tx.contractDocument.create({
            data: {
              organizationId,
              contractVersionId: createdVersion.id,
              type: 'PDF_CONTRACT',
              fileName: `contrato-${currentCode}.pdf`,
              fileSize: pdfBuffer.length,
              mimeType: 'application/pdf',
              s3Bucket: 'moura-solar-contracts',
              s3Key: pdfKey,
              contentHash: pdfHash,
              generationStatus: 'READY',
            },
          });

          // Initialize the contract ProjectGate in its pending state.
          await tx.projectGate.create({
            data: {
              organizationId,
              opportunityId: opp.id,
              contractId: createdContract.id,
              gateType: 'CONTRACT',
              status: 'PENDING',
              evidenceSummary: `Contrato ${currentCode} emitido e aguardando assinatura formal`,
            },
          });

          // Ensure PaymentPlan exists with the contract's defined milestones
          const existingPlan = await tx.paymentPlan.findFirst({
            where: { opportunityId: opp.id, status: { in: ['ACTIVE', 'COMPLETED'] } },
          });

          if (!existingPlan && milestones.length > 0 && milestones[0]) {
            const firstMilestone = milestones[0];
            const p1Parsed = parseFloat(
              firstMilestone.amount.replace(/[^0-9,-]+/g, '').replace(',', '.'),
            );
            const downPayment =
              dto.downPaymentAmount !== undefined
                ? dto.downPaymentAmount
                : !isNaN(p1Parsed)
                  ? p1Parsed
                  : finalPriceNum * 0.3;

            await tx.paymentPlan.create({
              data: {
                organizationId,
                opportunityId: opp.id,
                contractId: createdContract.id,
                totalAmount: finalPriceNum,
                downPaymentAmount: downPayment,
                installmentCount: milestones.length,
                paymentMethod: dto.paymentMethod || paymentMethod || 'PIX',
                status: 'ACTIVE',
                receivables: {
                  create: milestones.map((m, idx) => {
                    const parsedAmt = parseFloat(
                      m.amount.replace(/[^0-9,-]+/g, '').replace(',', '.'),
                    );
                    const amt =
                      !isNaN(parsedAmt) && parsedAmt > 0
                        ? parsedAmt
                        : finalPriceNum / milestones.length;
                    const dueDate = new Date();
                    dueDate.setDate(dueDate.getDate() + idx * 30);
                    return {
                      organizationId,
                      opportunityId: opp.id,
                      installmentNumber: idx + 1,
                      title: m.stage,
                      originalAmount: amt,
                      outstandingAmount: amt,
                      dueDate,
                      status: 'OPEN',
                      notes: m.condition,
                    };
                  }),
                },
              },
            });
          }

          // Create activity for contract review & signature collection
          await tx.activity.create({
            data: {
              organizationId,
              opportunityId: opp.id,
              customerId: opp.customerId,
              type: 'MEETING',
              subject: `Assinatura de Contrato: ${currentCode}`,
              description: `Minuta contratual gerada (DOCX e PDF) a partir da proposta ${parentProposal?.code || ''}. Coletar assinaturas das partes e testemunhas.`,
              assigneeUserId: opp.ownerUserId,
              dueAt: new Date(Date.now() + 3 * 86400000),
              status: 'OPEN',
            },
          });

          await this.audit.record(
            {
              organizationId,
              actorId: userId,
              action: 'CONTRACT_CREATED',
              entityId: createdContract.id,
            },
            tx,
          );

          return createdContract;
        });
        break;
      } catch (err: any) {
        if (err.code === 'P2002' && attempts < 5) {
          attempts++;
          continue;
        }
        throw err;
      }
    }

    return this.getContract(organizationId, contract.id);
  }

  async listContracts(organizationId: string, opportunityId?: string) {
    return this.prisma.contract.findMany({
      where: {
        organizationId,
        ...(opportunityId ? { opportunityId } : {}),
      },
      include: {
        versions: {
          include: {
            documents: true,
            createdBy: { select: { id: true, name: true, email: true } },
          },
          orderBy: { versionNumber: 'desc' },
        },
        deliveries: {
          include: {
            sentBy: { select: { id: true, name: true, email: true } },
          },
          orderBy: { sentAt: 'desc' },
        },
        signedReviews: {
          include: {
            reviewedBy: { select: { id: true, name: true, email: true } },
          },
          orderBy: { reviewedAt: 'desc' },
        },
        projectGates: true,
        opportunity: {
          select: {
            id: true,
            code: true,
            title: true,
            state: true,
            customer: { select: { id: true, legalName: true, taxId: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getContract(organizationId: string, id: string) {
    const contract = await this.prisma.contract.findFirst({
      where: { id, organizationId },
      include: {
        versions: {
          include: {
            documents: true,
            createdBy: { select: { id: true, name: true, email: true } },
          },
          orderBy: { versionNumber: 'desc' },
        },
        deliveries: {
          include: {
            sentBy: { select: { id: true, name: true, email: true } },
          },
          orderBy: { sentAt: 'desc' },
        },
        signedReviews: {
          include: {
            reviewedBy: { select: { id: true, name: true, email: true } },
          },
          orderBy: { reviewedAt: 'desc' },
        },
        projectGates: true,
        opportunity: {
          select: {
            id: true,
            code: true,
            title: true,
            state: true,
            customer: { select: { id: true, legalName: true, taxId: true } },
          },
        },
        acceptedProposalVersion: {
          select: {
            id: true,
            versionNumber: true,
            finalPrice: true,
            proposal: { select: { id: true, code: true } },
          },
        },
      },
    });

    if (!contract) {
      throw new NotFoundException('Contrato não encontrado');
    }

    return contract;
  }

  async updateDraft(organizationId: string, id: string, dto: UpdateContractDraftDto) {
    const contract = await this.getContract(organizationId, id);

    if (
      contract.state !== 'DRAFT' &&
      contract.state !== 'PENDING_REVIEW' &&
      contract.state !== 'READY'
    ) {
      throw new ConflictException(
        `Contratos no estado "${contract.state}" não podem ser editados diretamente. Gere um aditivo (AMENDED) conforme SPEC-007.`,
      );
    }

    const activeVersion = contract.versions[0];
    if (!activeVersion) {
      throw new NotFoundException('Versão do contrato não encontrada');
    }

    let commercialSnapshot = (dto.commercialSnapshot ?? activeVersion.commercialSnapshot) as any;
    if (dto.milestones || dto.paymentMethod) {
      commercialSnapshot = {
        ...commercialSnapshot,
        paymentMethod: dto.paymentMethod ?? commercialSnapshot?.paymentMethod ?? 'PIX',
        milestones: dto.milestones ?? commercialSnapshot?.milestones ?? [],
      };
    }
    const partySnapshot = (dto.partySnapshot ?? activeVersion.partySnapshot) as any;
    const technicalSnapshot = (dto.technicalSnapshot ?? activeVersion.technicalSnapshot) as any;
    const scopeSnapshot = (dto.scopeSnapshot ?? activeVersion.scopeSnapshot) as any;
    const clausesSnapshot = (dto.clausesSnapshot ?? activeVersion.clausesSnapshot) as any;

    // Regenerate contract documents (DOCX and PDF) with updated terms
    const templateData = this.buildTemplateData(
      contract.code,
      partySnapshot,
      technicalSnapshot,
      commercialSnapshot,
      scopeSnapshot,
      clausesSnapshot,
    );

    const docxBuffer = await this.generator.generateDocx(templateData);
    const pdfBuffer = await this.generator.generatePdf(templateData);

    const docxHash = this.generator.computeHash(docxBuffer);
    const pdfHash = this.generator.computeHash(pdfBuffer);

    const docxKey = `contracts/${contract.id}/v${activeVersion.versionNumber}/contrato-${contract.code}.docx`;
    const pdfKey = `contracts/${contract.id}/v${activeVersion.versionNumber}/contrato-${contract.code}.pdf`;

    await this.storage.upload(
      'moura-solar-contracts',
      docxKey,
      docxBuffer,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    await this.storage.upload('moura-solar-contracts', pdfKey, pdfBuffer, 'application/pdf');

    await this.prisma.contractDocument.deleteMany({
      where: { contractVersionId: activeVersion.id },
    });

    await this.prisma.contractDocument.createMany({
      data: [
        {
          organizationId,
          contractVersionId: activeVersion.id,
          type: 'DOCX_CONTRACT',
          fileName: `contrato-${contract.code}.docx`,
          fileSize: docxBuffer.length,
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          s3Bucket: 'moura-solar-contracts',
          s3Key: docxKey,
          contentHash: docxHash,
          generationStatus: 'READY',
        },
        {
          organizationId,
          contractVersionId: activeVersion.id,
          type: 'PDF_CONTRACT',
          fileName: `contrato-${contract.code}.pdf`,
          fileSize: pdfBuffer.length,
          mimeType: 'application/pdf',
          s3Bucket: 'moura-solar-contracts',
          s3Key: pdfKey,
          contentHash: pdfHash,
          generationStatus: 'READY',
        },
      ],
    });

    await this.prisma.contractVersion.update({
      where: { id: activeVersion.id },
      data: {
        partySnapshot,
        technicalSnapshot,
        commercialSnapshot,
        scopeSnapshot,
        clausesSnapshot,
        contentHash: pdfHash,
        observations: dto.observations ?? activeVersion.observations,
      },
    });

    // Synchronize PaymentPlan with new terms & milestones
    const finalPriceNum =
      Number(contract.acceptedProposalVersion?.finalPrice) ||
      parseFloat(
        String(commercialSnapshot?.contractTotal || '')
          .replace(/[^0-9,-]+/g, '')
          .replace(',', '.'),
      ) ||
      0;

    const milestones = commercialSnapshot?.milestones || [];
    if (milestones.length > 0 && finalPriceNum > 0 && milestones[0]) {
      const firstMilestone = milestones[0];
      const p1Parsed = parseFloat(
        firstMilestone.amount.replace(/[^0-9,-]+/g, '').replace(',', '.'),
      );
      const downPayment =
        dto.downPaymentAmount !== undefined
          ? dto.downPaymentAmount
          : !isNaN(p1Parsed)
            ? p1Parsed
            : finalPriceNum * 0.3;

      const existingPlan = await this.prisma.paymentPlan.findFirst({
        where: { opportunityId: contract.opportunityId },
      });

      if (existingPlan) {
        await this.prisma.receivable.deleteMany({
          where: { paymentPlanId: existingPlan.id, status: 'OPEN' },
        });
        await this.prisma.paymentPlan.update({
          where: { id: existingPlan.id },
          data: {
            totalAmount: finalPriceNum,
            downPaymentAmount: downPayment,
            installmentCount: milestones.length,
            paymentMethod: dto.paymentMethod || commercialSnapshot.paymentMethod || 'PIX',
            status: 'ACTIVE',
            receivables: {
              create: milestones.map((m: any, idx: number) => {
                const parsedAmt = parseFloat(m.amount.replace(/[^0-9,-]+/g, '').replace(',', '.'));
                const amt =
                  !isNaN(parsedAmt) && parsedAmt > 0
                    ? parsedAmt
                    : finalPriceNum / milestones.length;
                const dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + idx * 30);
                return {
                  organizationId,
                  opportunityId: contract.opportunityId,
                  installmentNumber: idx + 1,
                  title: m.stage,
                  originalAmount: amt,
                  outstandingAmount: amt,
                  dueDate,
                  status: 'OPEN',
                  notes: m.condition,
                };
              }),
            },
          },
        });
      } else {
        await this.prisma.paymentPlan.create({
          data: {
            organizationId,
            opportunityId: contract.opportunityId,
            contractId: contract.id,
            totalAmount: finalPriceNum,
            downPaymentAmount: downPayment,
            installmentCount: milestones.length,
            paymentMethod: dto.paymentMethod || commercialSnapshot.paymentMethod || 'PIX',
            status: 'ACTIVE',
            receivables: {
              create: milestones.map((m: any, idx: number) => {
                const parsedAmt = parseFloat(m.amount.replace(/[^0-9,-]+/g, '').replace(',', '.'));
                const amt =
                  !isNaN(parsedAmt) && parsedAmt > 0
                    ? parsedAmt
                    : finalPriceNum / milestones.length;
                const dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + idx * 30);
                return {
                  organizationId,
                  opportunityId: contract.opportunityId,
                  installmentNumber: idx + 1,
                  title: m.stage,
                  originalAmount: amt,
                  outstandingAmount: amt,
                  dueDate,
                  status: 'OPEN',
                  notes: m.condition,
                };
              }),
            },
          },
        });
      }
    }

    return this.getContract(organizationId, id);
  }

  async requestReview(
    organizationId: string,
    id: string,
    userId: string,
    dto: RequestContractReviewDto,
  ) {
    const contract = await this.getContract(organizationId, id);
    await this.prisma.contract.update({
      where: { id: contract.id },
      data: {
        state: 'PENDING_REVIEW',
        notes: dto.notes
          ? `${contract.notes ? `${contract.notes}\n` : ''}Revisão solicitada: ${dto.notes}`
          : contract.notes,
      },
    });
    return this.getContract(organizationId, id);
  }

  async approveContract(
    organizationId: string,
    id: string,
    userId: string,
    dto: ApproveContractDto,
  ) {
    const contract = await this.getContract(organizationId, id);
    await this.prisma.contract.update({
      where: { id: contract.id },
      data: {
        state: 'READY',
        notes: dto.notes
          ? `${contract.notes ? `${contract.notes}\n` : ''}Aprovado: ${dto.notes}`
          : contract.notes,
      },
    });
    return this.getContract(organizationId, id);
  }

  async recordDelivery(
    organizationId: string,
    contractId: string,
    userId: string,
    dto: RecordContractDeliveryDto,
    correlationId: string,
  ) {
    const contract = await this.getContract(organizationId, contractId);

    // Regra de negócio obrigatória: condições de pagamento e parcelas devem estar definidas antes do envio para assinatura
    const latestVersion = contract.versions?.[0];
    const commercialSnap = latestVersion?.commercialSnapshot as any;
    const hasMilestones =
      Array.isArray(commercialSnap?.milestones) && commercialSnap.milestones.length > 0;
    const existingPlan = await this.prisma.paymentPlan.findFirst({
      where: { opportunityId: contract.opportunityId, status: { in: ['ACTIVE', 'COMPLETED'] } },
    });

    if (!hasMilestones && !existingPlan) {
      throw new BadRequestException(
        'O plano de pagamento e as parcelas (Anexo III) devem ser cadastrados antes do envio do contrato para assinatura.',
      );
    }

    const sentAt = new Date();

    const delivery = await this.prisma.$transaction(async (tx) => {
      const del = await tx.contractDelivery.create({
        data: {
          organizationId,
          contractId: contract.id,
          channel: dto.channel,
          recipient: dto.recipient,
          status: 'SENT',
          sentById: userId,
          sentAt,
          notes: dto.notes,
        },
      });

      await tx.contract.update({
        where: { id: contract.id },
        data: { state: 'SENT' },
      });

      // Follow-up activity for signing
      const followUpActivity = await tx.activity.create({
        data: {
          organizationId,
          opportunityId: contract.opportunityId,
          customerId: contract.opportunity.customer.id,
          type: 'FOLLOW_UP',
          subject: `Acompanhar Assinatura: ${contract.code}`,
          description: `Contrato enviado via ${dto.channel} ao destinatário ${dto.recipient || 'cliente'}. Acompanhar assinatura formal e upload das vias assinadas.`,
          assigneeUserId: userId,
          dueAt: new Date(sentAt.getTime() + 2 * 86400000),
          status: 'OPEN',
        },
      });

      const deliveryAudit = await this.audit.record(
        {
          organizationId,
          actorId: userId,
          action: 'CONTRACT_DELIVERED',
          entityId: contract.id,
        },
        tx,
      );

      const activityEvent: ActivityCreatedEventV1 = {
        eventId: randomUUID(),
        eventType: 'ACTIVITY_CREATED',
        schemaVersion: 1,
        occurredAt: deliveryAudit.createdAt.toISOString(),
        organizationId,
        aggregateId: followUpActivity.id,
        producer: 'crm',
        correlationId,
        payload: {
          activityId: followUpActivity.id,
          auditEventId: deliveryAudit.id,
          customerId: contract.opportunity.customer.id,
          opportunityId: contract.opportunityId,
        },
      };
      await tx.integrationOutbox.create({
        data: {
          id: activityEvent.eventId,
          organizationId: activityEvent.organizationId,
          eventType: activityEvent.eventType,
          schemaVersion: activityEvent.schemaVersion,
          aggregateType: 'Activity',
          aggregateId: activityEvent.aggregateId,
          producer: activityEvent.producer,
          correlationId: activityEvent.correlationId,
          occurredAt: deliveryAudit.createdAt,
          payload: activityEvent.payload,
          dedupeKey: `ACTIVITY_CREATED:${deliveryAudit.id}:${followUpActivity.id}`,
        },
      });

      const contractEvent: ContractDeliveredEventV1 = {
        eventId: randomUUID(),
        eventType: 'CONTRACT_DELIVERED',
        schemaVersion: 1,
        occurredAt: deliveryAudit.createdAt.toISOString(),
        organizationId,
        aggregateId: contract.id,
        producer: 'contracts',
        correlationId,
        payload: {
          contractId: contract.id,
          deliveryId: del.id,
          auditEventId: deliveryAudit.id,
          opportunityId: contract.opportunityId,
        },
      };
      await tx.integrationOutbox.create({
        data: {
          id: contractEvent.eventId,
          organizationId: contractEvent.organizationId,
          eventType: contractEvent.eventType,
          schemaVersion: contractEvent.schemaVersion,
          aggregateType: 'Contract',
          aggregateId: contractEvent.aggregateId,
          producer: contractEvent.producer,
          correlationId: contractEvent.correlationId,
          occurredAt: deliveryAudit.createdAt,
          payload: contractEvent.payload,
          dedupeKey: `CONTRACT_DELIVERED:${deliveryAudit.id}:${del.id}`,
        },
      });

      return del;
    });

    return { delivery, contract: await this.getContract(organizationId, contractId) };
  }

  async uploadSignedContract(
    organizationId: string,
    contractId: string,
    userId: string,
    dto: UploadSignedContractDto,
  ) {
    const contract = await this.getContract(organizationId, contractId);
    if (['CANCELED', 'TERMINATED', 'ACTIVE'].includes(contract.state)) {
      throw new BadRequestException(
        `Não é possível enviar contrato assinado para um contrato no estado ${contract.state}.`,
      );
    }

    const activeVersion = contract.versions[0];
    if (!activeVersion) {
      throw new NotFoundException('Versão do contrato não encontrada');
    }

    const buffer = Buffer.from(dto.fileBase64, 'base64');
    if (buffer.length === 0) {
      throw new BadRequestException('O arquivo enviado está vazio.');
    }
    if (buffer.length > 25 * 1024 * 1024) {
      throw new BadRequestException('O arquivo enviado excede o limite máximo permitido de 25MB.');
    }

    // PDF Magic Bytes: deve começar com %PDF- (0x25 0x50 0x44 0x46 0x2D)
    const magicHeader = buffer.subarray(0, 5).toString('ascii');
    if (!magicHeader.startsWith('%PDF-')) {
      throw new BadRequestException(
        'O arquivo enviado não possui uma assinatura binária de PDF válida (%PDF-).',
      );
    }

    const sanitizedBase = basename(dto.fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
    const safeFileName = sanitizedBase.toLowerCase().endsWith('.pdf')
      ? sanitizedBase
      : `${sanitizedBase}.pdf`;

    const contentHash = this.generator.computeHash(buffer);
    const s3Key = `contracts/${contract.id}/signed/contrato-assinado-${Date.now()}.pdf`;

    await this.storage.upload(
      'moura-solar-contracts',
      s3Key,
      buffer,
      dto.mimeType || 'application/pdf',
    );

    const result = await this.prisma.$transaction(async (tx) => {
      const document = await tx.contractDocument.create({
        data: {
          organizationId,
          contractVersionId: activeVersion.id,
          type: 'SIGNED_UPLOAD',
          fileName: safeFileName,
          fileSize: buffer.length,
          mimeType: dto.mimeType || 'application/pdf',
          s3Bucket: 'moura-solar-contracts',
          s3Key,
          contentHash,
          generationStatus: 'READY',
        },
      });

      // SPEC-007 Item 4 & 9: Upload transitions to SIGNED_UPLOADED, does NOT activate automatically
      await tx.contract.update({
        where: { id: contract.id },
        data: { state: 'SIGNED_UPLOADED' },
      });

      // Create activity for conference
      await tx.activity.create({
        data: {
          organizationId,
          opportunityId: contract.opportunityId,
          customerId: contract.opportunity.customer.id,
          type: 'TASK',
          subject: `Conferência de Assinatura: ${contract.code}`,
          description: `Novo arquivo assinado "${safeFileName}" anexado. Realizar conferência das partes, páginas completas, correspondência da versão e legibilidade antes de liberar o gate contratual.`,
          assigneeUserId: userId,
          dueAt: new Date(Date.now() + 24 * 3600000),
          status: 'OPEN',
        },
      });

      await this.audit.record(
        {
          organizationId,
          actorId: userId,
          action: 'CONTRACT_SIGNED_UPLOADED',
          entityId: contract.id,
        },
        tx,
      );

      return document;
    });

    return { document: result, contract: await this.getContract(organizationId, contractId) };
  }

  async verifySignedContract(
    organizationId: string,
    contractId: string,
    userId: string,
    dto: VerifySignedContractDto,
    correlationId: string,
  ) {
    const contract = await this.getContract(organizationId, contractId);

    if (contract.state !== 'SIGNED_UPLOADED') {
      throw new BadRequestException(
        `Para realizar a conferência formal, o contrato deve estar no estado SIGNED_UPLOADED. Estado atual: ${contract.state}`,
      );
    }

    if (dto.decision === SignedReviewDecision.VERIFIED) {
      // SPEC-007 Item 10: all checklist criteria must pass
      if (
        !dto.partiesMatch ||
        !dto.allPagesPresent ||
        !dto.versionMatches ||
        !dto.signaturesLegible
      ) {
        throw new UnprocessableEntityException(
          'Para homologar a conferência como VERIFIED, todos os itens do checklist (partes, páginas, versão e legibilidade) devem ser atendidos obrigatoriamente.',
        );
      }
    } else {
      if (!dto.rejectionReason?.trim()) {
        throw new UnprocessableEntityException(
          'Para rejeitar o contrato assinado, o motivo da recusa é obrigatório.',
        );
      }
    }

    const reviewedAt = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      let reviewActivityId = '';

      // 1. Record review
      const review = await tx.signedContractReview.create({
        data: {
          organizationId,
          contractId: contract.id,
          partiesMatch: dto.partiesMatch,
          allPagesPresent: dto.allPagesPresent,
          versionMatches: dto.versionMatches,
          signaturesLegible: dto.signaturesLegible,
          decision: dto.decision,
          rejectionReason: dto.rejectionReason,
          notes: dto.notes,
          reviewedById: userId,
          reviewedAt,
        },
      });

      if (dto.decision === SignedReviewDecision.VERIFIED) {
        // 2. Mark contract ACTIVE
        await tx.contract.update({
          where: { id: contract.id },
          data: { state: 'ACTIVE' },
        });

        // 3. Satisfy the contract gate (CONTRACT)
        const gate = await tx.projectGate.findFirst({
          where: {
            opportunityId: contract.opportunityId,
            gateType: 'CONTRACT',
          },
        });

        if (gate) {
          await tx.projectGate.update({
            where: { id: gate.id },
            data: {
              status: 'SATISFIED',
              satisfiedById: userId,
              satisfiedAt: reviewedAt,
              evidenceSummary: `Contrato ${contract.code} conferido e verificado com sucesso`,
            },
          });
        } else {
          await tx.projectGate.create({
            data: {
              organizationId,
              opportunityId: contract.opportunityId,
              contractId: contract.id,
              gateType: 'CONTRACT',
              status: 'SATISFIED',
              satisfiedById: userId,
              satisfiedAt: reviewedAt,
              evidenceSummary: `Contrato ${contract.code} conferido e verificado com sucesso`,
            },
          });
        }

        // 4. Advance Opportunity to VENDIDO after contract verification.
        const opp = contract.opportunity;
        if (opp.state !== 'VENDIDO') {
          await tx.opportunity.update({
            where: { id: opp.id },
            data: {
              state: 'VENDIDO',
              version: { increment: 1 },
            },
          });

          await tx.opportunityTransition.create({
            data: {
              opportunityId: opp.id,
              fromState: opp.state,
              toState: 'VENDIDO',
              command: 'CONCLUIR_CONTRATO_GATE_C',
              actorId: userId,
              justification: `Contrato assinado ${contract.code} conferido e verificado. Gate contratual superado com sucesso.`,
            },
          });
        }

        // 5. Schedule next engineering activity
        const reviewActivity = await tx.activity.create({
          data: {
            organizationId,
            opportunityId: opp.id,
            customerId: opp.customer.id,
            type: 'TASK',
            subject: `Engenharia & Executivo: Oportunidade ${opp.code}`,
            description: `Contrato assinado e verificado. Gate contratual superado. Iniciar elaboração do projeto executivo de engenharia e solicitação de acesso junto à concessionária.`,
            assigneeUserId: userId,
            dueAt: new Date(reviewedAt.getTime() + 3 * 86400000),
            status: 'OPEN',
          },
        });
        reviewActivityId = reviewActivity.id;
      } else {
        // REJECTED
        // Contract reverts to READY so a corrected file can be sent/uploaded
        await tx.contract.update({
          where: { id: contract.id },
          data: { state: 'READY' },
        });

        const reviewActivity = await tx.activity.create({
          data: {
            organizationId,
            opportunityId: contract.opportunityId,
            customerId: contract.opportunity.customer.id,
            type: 'FOLLOW_UP',
            subject: `Regularizar Assinatura do Contrato: ${contract.code}`,
            description: `Conferência rejeitada por: ${dto.rejectionReason}. Entrar em contato com o cliente para colher novamente as assinaturas.`,
            assigneeUserId: userId,
            dueAt: new Date(reviewedAt.getTime() + 2 * 86400000),
            status: 'OPEN',
          },
        });
        reviewActivityId = reviewActivity.id;
      }

      const reviewAudit = await this.audit.record(
        {
          organizationId,
          actorId: userId,
          action:
            dto.decision === SignedReviewDecision.VERIFIED
              ? 'CONTRACT_VERIFIED_GATE_C'
              : 'CONTRACT_SIGNED_REJECTED',
          entityId: contract.id,
        },
        tx,
      );

      const activityEvent: ActivityCreatedEventV1 = {
        eventId: randomUUID(),
        eventType: 'ACTIVITY_CREATED',
        schemaVersion: 1,
        occurredAt: reviewAudit.createdAt.toISOString(),
        organizationId,
        aggregateId: reviewActivityId,
        producer: 'crm',
        correlationId,
        payload: {
          activityId: reviewActivityId,
          auditEventId: reviewAudit.id,
          customerId: contract.opportunity.customer.id,
          opportunityId: contract.opportunityId,
        },
      };
      await tx.integrationOutbox.create({
        data: {
          id: activityEvent.eventId,
          organizationId: activityEvent.organizationId,
          eventType: activityEvent.eventType,
          schemaVersion: activityEvent.schemaVersion,
          aggregateType: 'Activity',
          aggregateId: activityEvent.aggregateId,
          producer: activityEvent.producer,
          correlationId: activityEvent.correlationId,
          occurredAt: reviewAudit.createdAt,
          payload: activityEvent.payload,
          dedupeKey: `ACTIVITY_CREATED:${reviewAudit.id}:${reviewActivityId}`,
        },
      });

      return review;
    });

    if (dto.decision === SignedReviewDecision.VERIFIED) {
      try {
        await this.financial.generatePaymentPlanFromContract(
          organizationId,
          contract.opportunityId,
          userId,
        );
      } catch (err) {
        console.error('Aviso: Falha ao inicializar plano financeiro automaticamente:', err);
      }
    }

    return { review: result, contract: await this.getContract(organizationId, contractId) };
  }

  async createAmendment(
    organizationId: string,
    contractId: string,
    userId: string,
    dto: CreateAmendmentDto,
  ) {
    const contract = await this.getContract(organizationId, contractId);
    if (['CANCELED', 'TERMINATED'].includes(contract.state)) {
      throw new BadRequestException(
        `Não é possível criar aditivo para um contrato no estado ${contract.state}.`,
      );
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.contract.update({
        where: { id: contract.id },
        data: {
          state: 'AMENDED',
          notes: `${contract.notes ? `${contract.notes}\n` : ''}Aditivo: ${dto.reason}`,
        },
      });
      await this.audit.record(
        {
          organizationId,
          actorId: userId,
          action: 'CONTRACT_AMENDMENT_CREATED',
          entityId: contract.id,
        },
        tx,
      );
    });
    return this.getContract(organizationId, contractId);
  }

  async cancelContract(
    organizationId: string,
    contractId: string,
    userId: string,
    dto: CancelContractDto,
    correlationId: string,
  ) {
    const contract = await this.getContract(organizationId, contractId);
    if (['CANCELED', 'TERMINATED'].includes(contract.state)) {
      throw new BadRequestException(
        `O contrato já está no estado ${contract.state} e não pode ser cancelado novamente.`,
      );
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.contract.update({
        where: { id: contract.id },
        data: {
          state: 'CANCELED',
          notes: `${contract.notes ? `${contract.notes}\n` : ''}Cancelado: ${dto.reason}`,
        },
      });
      const cancellationAudit = await this.audit.record(
        {
          organizationId,
          actorId: userId,
          action: 'CONTRACT_CANCELED',
          entityId: contract.id,
        },
        tx,
      );

      const event: ContractCanceledEventV1 = {
        eventId: randomUUID(),
        eventType: 'CONTRACT_CANCELED',
        schemaVersion: 1,
        occurredAt: cancellationAudit.createdAt.toISOString(),
        organizationId,
        aggregateId: contract.id,
        producer: 'contracts',
        correlationId,
        payload: {
          contractId: contract.id,
          auditEventId: cancellationAudit.id,
          opportunityId: contract.opportunityId,
        },
      };
      await tx.integrationOutbox.create({
        data: {
          id: event.eventId,
          organizationId: event.organizationId,
          eventType: event.eventType,
          schemaVersion: event.schemaVersion,
          aggregateType: 'Contract',
          aggregateId: event.aggregateId,
          producer: event.producer,
          correlationId: event.correlationId,
          occurredAt: cancellationAudit.createdAt,
          payload: event.payload,
          dedupeKey: `CONTRACT_CANCELED:${cancellationAudit.id}`,
        },
      });
    });
    return this.getContract(organizationId, contractId);
  }

  async getDocumentBuffer(
    organizationId: string,
    contractId: string,
    documentType: 'docx' | 'pdf' | 'signed',
  ): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
    const contract = await this.getContract(organizationId, contractId);
    const activeVersion = contract.versions[0];
    if (!activeVersion) {
      throw new NotFoundException('Versão de contrato não encontrada');
    }

    let docType = 'PDF_CONTRACT';
    if (documentType === 'docx') docType = 'DOCX_CONTRACT';
    if (documentType === 'signed') docType = 'SIGNED_UPLOAD';

    const document = activeVersion.documents.find((d) => d.type === docType);
    if (!document) {
      throw new NotFoundException(
        `Documento do tipo "${docType}" não encontrado para este contrato.`,
      );
    }

    const buffer = await this.storage.download(document.s3Bucket, document.s3Key);
    return {
      buffer,
      fileName: document.fileName,
      mimeType: document.mimeType,
    };
  }
}
