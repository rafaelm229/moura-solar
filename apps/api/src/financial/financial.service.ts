import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../database/audit.service';
import {
  CreateFinancialAccountDto,
  GeneratePaymentPlanDto,
  RecordReceiptDto,
  CreatePayableDto,
  RecordPaymentDto,
  ConfigureCommissionDto,
} from './financial.dto';

@Injectable()
export class FinancialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ==========================================
  // ACCOUNTS
  // ==========================================

  async ensureDefaultAccount(organizationId: string) {
    const existing = await this.prisma.financialAccount.findFirst({
      where: { organizationId, status: 'ACTIVE' },
    });
    if (existing) {
      return existing;
    }

    return this.prisma.financialAccount.create({
      data: {
        organizationId,
        name: 'Conta Operacional Principal (Moura Solar)',
        accountType: 'CHECKING',
        bankCode: '403',
        status: 'ACTIVE',
      },
    });
  }

  async listAccounts(organizationId: string) {
    await this.ensureDefaultAccount(organizationId);
    return this.prisma.financialAccount.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createAccount(organizationId: string, actorId: string, dto: CreateFinancialAccountDto) {
    const account = await this.prisma.financialAccount.create({
      data: {
        organizationId,
        name: dto.name,
        accountType: dto.accountType || 'CHECKING',
        bankCode: dto.bankCode,
        agency: dto.agency,
        accountNumber: dto.accountNumber,
        status: 'ACTIVE',
      },
    });

    await this.audit.record({
      organizationId,
      actorId,
      action: 'FINANCIAL_ACCOUNT_CREATED',
      entityId: account.id,
    });

    return account;
  }

  // ==========================================
  // PAYMENT PLANS & RECEIVABLES
  // ==========================================

  async generatePaymentPlanFromContract(
    organizationId: string,
    opportunityId: string,
    actorId: string,
    dto?: GeneratePaymentPlanDto,
  ) {
    const opp = await this.prisma.opportunity.findFirst({
      where: { id: opportunityId, organizationId },
      include: {
        customer: true,
        contracts: {
          where: {
            state: { in: ['ACTIVE', 'SIGNED_UPLOADED', 'READY', 'PENDING_REVIEW', 'DRAFT'] },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        proposals: {
          include: {
            versions: {
              where: { status: 'ACCEPTED' },
              orderBy: { versionNumber: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!opp) {
      throw new NotFoundException('Oportunidade não encontrada');
    }

    const contract = opp.contracts[0];
    const acceptedVersion = opp.proposals
      .flatMap((p) => p.versions)
      .find((v) => v.status === 'ACCEPTED');

    // Determine total amount
    let totalAmount = dto?.totalAmount;
    if (totalAmount === undefined || totalAmount === null) {
      if (acceptedVersion?.finalPrice) {
        totalAmount = Number(acceptedVersion.finalPrice);
      } else {
        totalAmount = 50000;
      }
    }

    if (totalAmount <= 0) {
      throw new BadRequestException('O valor total do plano de pagamento deve ser positivo.');
    }

    // Determine down payment & installments
    let downPaymentAmount = dto?.downPaymentAmount;
    let installmentCount = dto?.installmentCount || 3;

    if (downPaymentAmount === undefined || downPaymentAmount === null) {
      const cond = acceptedVersion?.paymentConditions as Record<string, unknown> | null;
      if (cond && typeof cond['downPaymentAmount'] === 'number') {
        downPaymentAmount = cond['downPaymentAmount'] as number;
      } else if (cond && typeof cond['downPaymentPercent'] === 'number') {
        downPaymentAmount = Math.round(
          totalAmount * ((cond['downPaymentPercent'] as number) / 100),
        );
      } else {
        downPaymentAmount = Math.round(totalAmount * 0.2);
      }
    }

    if (downPaymentAmount > totalAmount) {
      throw new BadRequestException(
        'O valor da entrada não pode ser maior que o total do contrato.',
      );
    }

    const balanceAmount = totalAmount - downPaymentAmount;
    if (installmentCount < 1) {
      installmentCount = 1;
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.paymentPlan.updateMany({
        where: { opportunityId, organizationId, status: 'ACTIVE' },
        data: { status: 'RENEGOTIATED' },
      });

      const paymentPlan = await tx.paymentPlan.create({
        data: {
          organizationId,
          opportunityId,
          contractId: contract?.id || dto?.contractId || null,
          totalAmount: new Prisma.Decimal(totalAmount),
          downPaymentAmount: new Prisma.Decimal(downPaymentAmount),
          installmentCount: downPaymentAmount > 0 ? installmentCount + 1 : installmentCount,
          paymentMethod: dto?.paymentMethod || 'PIX',
          status: 'ACTIVE',
          notes:
            dto?.notes ||
            'Plano de pagamento gerado automaticamente a partir do contrato comercial',
        },
      });

      const today = new Date();
      let installmentIndex = 1;

      // 1. Down Payment Receivable (if > 0)
      if (downPaymentAmount > 0) {
        const downDueDate = new Date(today);
        downDueDate.setDate(downDueDate.getDate() + 3);

        await tx.receivable.create({
          data: {
            organizationId,
            opportunityId,
            paymentPlanId: paymentPlan.id,
            installmentNumber: installmentIndex++,
            title: `Entrada / Sinal - Contrato ${contract?.code || opp.code}`,
            originalAmount: new Prisma.Decimal(downPaymentAmount),
            paidAmount: new Prisma.Decimal(0),
            outstandingAmount: new Prisma.Decimal(downPaymentAmount),
            dueDate: downDueDate,
            status: 'OPEN',
            notes: 'Condição necessária para liberação do Gate Financeiro',
          },
        });
      }

      // 2. Remaining Installments
      if (balanceAmount > 0) {
        const baseInstallment = Math.floor((balanceAmount / installmentCount) * 100) / 100;
        const remainder =
          Math.round((balanceAmount - baseInstallment * installmentCount) * 100) / 100;

        for (let i = 1; i <= installmentCount; i++) {
          const installmentDueDate = new Date(today);
          installmentDueDate.setDate(installmentDueDate.getDate() + 30 * i);

          const instAmount = i === installmentCount ? baseInstallment + remainder : baseInstallment;

          await tx.receivable.create({
            data: {
              organizationId,
              opportunityId,
              paymentPlanId: paymentPlan.id,
              installmentNumber: installmentIndex++,
              title: `Parcela ${i}/${installmentCount} - Contrato ${contract?.code || opp.code}`,
              originalAmount: new Prisma.Decimal(instAmount),
              paidAmount: new Prisma.Decimal(0),
              outstandingAmount: new Prisma.Decimal(instAmount),
              dueDate: installmentDueDate,
              status: 'OPEN',
            },
          });
        }
      }

      // 3. Ensure Financial Gate exists
      const existingGate = await tx.projectGate.findFirst({
        where: { opportunityId, gateType: 'FINANCIAL' },
      });

      if (!existingGate) {
        await tx.projectGate.create({
          data: {
            organizationId,
            opportunityId,
            contractId: contract?.id || null,
            gateType: 'FINANCIAL',
            status: 'PENDING',
            evidenceSummary: 'Aguardando confirmação do recebimento da entrada (Gate Financeiro)',
          },
        });
      }

      // 4. Create default commission estimate if none exists
      const existingCommissions = await tx.commission.count({
        where: { opportunityId },
      });

      if (existingCommissions === 0) {
        const commRate = 0.03;
        const commAmount = Math.round(totalAmount * commRate * 100) / 100;

        await tx.commission.create({
          data: {
            organizationId,
            opportunityId,
            beneficiaryName: opp.customer?.legalName
              ? `Consultor Moura Solar (${opp.code})`
              : 'Consultor Comercial',
            role: 'SALES_REP',
            percentage: new Prisma.Decimal(3.0),
            baseAmount: new Prisma.Decimal(totalAmount),
            commissionAmount: new Prisma.Decimal(commAmount),
            triggerGate: 'FINANCIAL',
            status: 'ESTIMATED',
            notes: 'Comissão estimada de vendas vinculada à liberação do Gate Financeiro',
          },
        });
      }

      await this.audit.record(
        {
          organizationId,
          actorId,
          action: 'FINANCIAL_PAYMENT_PLAN_GENERATED',
          entityId: paymentPlan.id,
        },
        tx,
      );

      return tx.paymentPlan.findUniqueOrThrow({
        where: { id: paymentPlan.id },
        include: { receivables: { orderBy: { installmentNumber: 'asc' } } },
      });
    });
  }

  // ==========================================
  // RECEIPTS & ALLOCATIONS
  // ==========================================

  async recordReceipt(organizationId: string, actorId: string, dto: RecordReceiptDto) {
    if (dto.amount <= 0) {
      throw new BadRequestException('O valor do recebimento deve ser maior que zero.');
    }

    const account = await this.prisma.financialAccount.findFirst({
      where: { id: dto.accountId, organizationId },
    });
    if (!account) {
      throw new NotFoundException('Conta financeira não encontrada para esta organização.');
    }

    return this.prisma.$transaction(async (tx) => {
      const effectiveDate = dto.effectiveDate ? new Date(dto.effectiveDate) : new Date();

      const receipt = await tx.receipt.create({
        data: {
          organizationId,
          opportunityId: dto.opportunityId || null,
          accountId: account.id,
          amount: new Prisma.Decimal(dto.amount),
          effectiveDate,
          paymentMethod: dto.paymentMethod || 'PIX',
          payerName: dto.payerName || null,
          payerTaxId: dto.payerTaxId || null,
          receiptDocumentUrl: dto.receiptDocumentUrl || null,
          status: 'CONFIRMED',
          notes: dto.notes || null,
          createdById: actorId,
        },
      });

      let remainingToAllocate = dto.amount;

      if (dto.allocations && dto.allocations.length > 0) {
        for (const alloc of dto.allocations) {
          const receivable = await tx.receivable.findFirst({
            where: { id: alloc.receivableId, organizationId },
          });

          if (!receivable) {
            throw new NotFoundException(`Título a receber ${alloc.receivableId} não encontrado.`);
          }

          const allocAmount = alloc.allocatedPrincipal;
          const interest = alloc.interestAmount || 0;
          const discount = alloc.discountAmount || 0;

          await tx.receiptAllocation.create({
            data: {
              organizationId,
              receiptId: receipt.id,
              receivableId: receivable.id,
              allocatedPrincipal: new Prisma.Decimal(allocAmount),
              interestAmount: new Prisma.Decimal(interest),
              discountAmount: new Prisma.Decimal(discount),
              status: 'ACTIVE',
            },
          });

          const currentPaid = Number(receivable.paidAmount);
          const currentOriginal = Number(receivable.originalAmount);
          const newPaid = currentPaid + allocAmount;
          const newOutstanding = Math.max(0, currentOriginal - newPaid - discount);

          const newStatus =
            newOutstanding <= 0.01 ? 'PAID' : newPaid > 0 ? 'PARTIALLY_PAID' : receivable.status;

          await tx.receivable.update({
            where: { id: receivable.id },
            data: {
              paidAmount: new Prisma.Decimal(newPaid),
              outstandingAmount: new Prisma.Decimal(newOutstanding),
              status: newStatus,
              version: { increment: 1 },
            },
          });

          remainingToAllocate -= allocAmount;
        }
      } else if (dto.opportunityId) {
        const openReceivables = await tx.receivable.findMany({
          where: {
            opportunityId: dto.opportunityId,
            organizationId,
            status: { in: ['OPEN', 'PARTIALLY_PAID', 'OVERDUE'] },
          },
          orderBy: [{ dueDate: 'asc' }, { installmentNumber: 'asc' }],
        });

        for (const rec of openReceivables) {
          if (remainingToAllocate <= 0) break;

          const outstanding = Number(rec.outstandingAmount);
          const allocAmount = Math.min(remainingToAllocate, outstanding);

          await tx.receiptAllocation.create({
            data: {
              organizationId,
              receiptId: receipt.id,
              receivableId: rec.id,
              allocatedPrincipal: new Prisma.Decimal(allocAmount),
              status: 'ACTIVE',
            },
          });

          const newPaid = Number(rec.paidAmount) + allocAmount;
          const newOutstanding = Math.max(0, Number(rec.originalAmount) - newPaid);
          const newStatus = newOutstanding <= 0.01 ? 'PAID' : 'PARTIALLY_PAID';

          await tx.receivable.update({
            where: { id: rec.id },
            data: {
              paidAmount: new Prisma.Decimal(newPaid),
              outstandingAmount: new Prisma.Decimal(newOutstanding),
              status: newStatus,
              version: { increment: 1 },
            },
          });

          remainingToAllocate -= allocAmount;
        }
      }

      await tx.cashMovement.create({
        data: {
          organizationId,
          accountId: account.id,
          direction: 'IN',
          type: 'RECEIPT',
          amount: new Prisma.Decimal(dto.amount),
          currency: 'BRL',
          effectiveAt: effectiveDate,
          receiptId: receipt.id,
          status: 'CONFIRMED',
          description: `Recebimento ${dto.payerName ? 'de ' + dto.payerName : ''} via ${dto.paymentMethod || 'PIX'}`,
        },
      });

      if (dto.opportunityId) {
        await this.evaluateFinancialConditions(tx, organizationId, dto.opportunityId, actorId);
      }

      await this.audit.record(
        {
          organizationId,
          actorId,
          action: 'FINANCIAL_RECEIPT_RECORDED',
          entityId: receipt.id,
        },
        tx,
      );

      return tx.receipt.findUniqueOrThrow({
        where: { id: receipt.id },
        include: {
          account: true,
          allocations: { include: { receivable: true } },
        },
      });
    });
  }

  async reverseReceipt(organizationId: string, receiptId: string, actorId: string, reason: string) {
    const receipt = await this.prisma.receipt.findFirst({
      where: { id: receiptId, organizationId },
      include: { allocations: { include: { receivable: true } } },
    });

    if (!receipt) {
      throw new NotFoundException('Recebimento não encontrado.');
    }
    if (receipt.status === 'REVERSED') {
      throw new ConflictException('Este recebimento já foi estornado.');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.receipt.update({
        where: { id: receipt.id },
        data: { status: 'REVERSED', notes: `${receipt.notes || ''} [ESTORNADO: ${reason}]` },
      });

      for (const alloc of receipt.allocations || []) {
        await tx.receiptAllocation.update({
          where: { id: alloc.id },
          data: { status: 'REVERSED' },
        });

        const rec = alloc.receivable;
        const restoredPaid = Math.max(0, Number(rec.paidAmount) - Number(alloc.allocatedPrincipal));
        const restoredOutstanding = Number(rec.originalAmount) - restoredPaid;
        const restoredStatus = restoredPaid > 0 ? 'PARTIALLY_PAID' : 'OPEN';

        await tx.receivable.update({
          where: { id: rec.id },
          data: {
            paidAmount: new Prisma.Decimal(restoredPaid),
            outstandingAmount: new Prisma.Decimal(restoredOutstanding),
            status: restoredStatus,
            version: { increment: 1 },
          },
        });
      }

      await tx.cashMovement.create({
        data: {
          organizationId,
          accountId: receipt.accountId,
          direction: 'OUT',
          type: 'REVERSAL',
          amount: receipt.amount,
          currency: 'BRL',
          receiptId: receipt.id,
          status: 'CONFIRMED',
          description: `Estorno de recebimento: ${reason}`,
        },
      });

      if (receipt.opportunityId) {
        await this.evaluateFinancialConditions(tx, organizationId, receipt.opportunityId, actorId);
      }

      await this.audit.record(
        {
          organizationId,
          actorId,
          action: 'FINANCIAL_RECEIPT_REVERSED',
          entityId: receipt.id,
        },
        tx,
      );

      return { success: true, message: 'Recebimento estornado com sucesso.' };
    });
  }

  // ==========================================
  // PAYABLES & EXPENSES
  // ==========================================

  async createPayable(organizationId: string, actorId: string, dto: CreatePayableDto) {
    if (dto.originalAmount <= 0) {
      throw new BadRequestException('O valor da obrigação a pagar deve ser maior que zero.');
    }

    const payable = await this.prisma.payable.create({
      data: {
        organizationId,
        opportunityId: dto.opportunityId || null,
        category: dto.category,
        description: dto.description,
        recipient: dto.recipient,
        recipientTaxId: dto.recipientTaxId || null,
        originalAmount: new Prisma.Decimal(dto.originalAmount),
        paidAmount: new Prisma.Decimal(0),
        outstandingAmount: new Prisma.Decimal(dto.originalAmount),
        dueDate: new Date(dto.dueDate),
        status: 'OPEN',
        notes: dto.notes || null,
      },
    });

    await this.audit.record({
      organizationId,
      actorId,
      action: 'FINANCIAL_PAYABLE_CREATED',
      entityId: payable.id,
    });

    return payable;
  }

  async listPayables(organizationId: string, opportunityId?: string) {
    return this.prisma.payable.findMany({
      where: {
        organizationId,
        ...(opportunityId ? { opportunityId } : {}),
      },
      include: {
        allocations: { include: { payment: true } },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async recordPayment(organizationId: string, actorId: string, dto: RecordPaymentDto) {
    if (dto.amount <= 0) {
      throw new BadRequestException('O valor do pagamento deve ser maior que zero.');
    }

    const account = await this.prisma.financialAccount.findFirst({
      where: { id: dto.accountId, organizationId },
    });
    if (!account) {
      throw new NotFoundException('Conta bancária não encontrada.');
    }

    return this.prisma.$transaction(async (tx) => {
      const effectiveDate = dto.effectiveDate ? new Date(dto.effectiveDate) : new Date();

      const payment = await tx.payment.create({
        data: {
          organizationId,
          accountId: account.id,
          amount: new Prisma.Decimal(dto.amount),
          effectiveDate,
          paymentMethod: dto.paymentMethod || 'PIX',
          documentNumber: dto.documentNumber || null,
          status: 'CONFIRMED',
          notes: dto.notes || null,
          createdById: actorId,
        },
      });

      if (dto.allocations && dto.allocations.length > 0) {
        for (const alloc of dto.allocations) {
          const payable = await tx.payable.findFirst({
            where: { id: alloc.payableId, organizationId },
          });

          if (!payable) {
            throw new NotFoundException(`Título a pagar ${alloc.payableId} não encontrado.`);
          }

          await tx.paymentAllocation.create({
            data: {
              organizationId,
              paymentId: payment.id,
              payableId: payable.id,
              allocatedAmount: new Prisma.Decimal(alloc.allocatedAmount),
              status: 'ACTIVE',
            },
          });

          const newPaid = Number(payable.paidAmount) + alloc.allocatedAmount;
          const newOutstanding = Math.max(0, Number(payable.originalAmount) - newPaid);
          const newStatus = newOutstanding <= 0.01 ? 'PAID' : 'PARTIALLY_PAID';

          await tx.payable.update({
            where: { id: payable.id },
            data: {
              paidAmount: new Prisma.Decimal(newPaid),
              outstandingAmount: new Prisma.Decimal(newOutstanding),
              status: newStatus,
            },
          });

          await tx.commission.updateMany({
            where: { payableId: payable.id },
            data: { status: newStatus === 'PAID' ? 'PAID' : 'ACQUIRED' },
          });
        }
      }

      await tx.cashMovement.create({
        data: {
          organizationId,
          accountId: account.id,
          direction: 'OUT',
          type: 'PAYMENT',
          amount: new Prisma.Decimal(dto.amount),
          currency: 'BRL',
          effectiveAt: effectiveDate,
          paymentId: payment.id,
          status: 'CONFIRMED',
          description: `Pagamento realizado via ${dto.paymentMethod || 'PIX'} (${dto.documentNumber || 's/n'})`,
        },
      });

      await this.audit.record(
        {
          organizationId,
          actorId,
          action: 'FINANCIAL_PAYMENT_RECORDED',
          entityId: payment.id,
        },
        tx,
      );

      return tx.payment.findUniqueOrThrow({
        where: { id: payment.id },
        include: { allocations: { include: { payable: true } } },
      });
    });
  }

  // ==========================================
  // COMMISSIONS
  // ==========================================

  async configureCommission(organizationId: string, actorId: string, dto: ConfigureCommissionDto) {
    const opp = await this.prisma.opportunity.findFirst({
      where: { id: dto.opportunityId, organizationId },
      include: {
        contracts: { where: { state: 'ACTIVE' }, take: 1 },
        proposals: {
          include: { versions: { where: { status: 'ACCEPTED' }, take: 1 } },
        },
      },
    });

    if (!opp) {
      throw new NotFoundException('Oportunidade não encontrada.');
    }

    const acceptedPrice = opp.proposals.flatMap((p) => p.versions)[0]?.finalPrice || 50000;
    const baseAmount = Number(acceptedPrice);
    const commissionAmount = Math.round(baseAmount * (dto.percentage / 100) * 100) / 100;

    const comm = await this.prisma.commission.create({
      data: {
        organizationId,
        opportunityId: opp.id,
        beneficiaryName: dto.beneficiaryName,
        role: dto.role || 'SALES_REP',
        percentage: new Prisma.Decimal(dto.percentage),
        baseAmount: new Prisma.Decimal(baseAmount),
        commissionAmount: new Prisma.Decimal(commissionAmount),
        triggerGate: dto.triggerGate || 'FINANCIAL',
        status: 'ESTIMATED',
        notes: dto.notes || null,
      },
    });

    await this.audit.record({
      organizationId,
      actorId,
      action: 'FINANCIAL_COMMISSION_CONFIGURED',
      entityId: comm.id,
    });

    return comm;
  }

  async listCommissions(organizationId: string, opportunityId?: string) {
    return this.prisma.commission.findMany({
      where: {
        organizationId,
        ...(opportunityId ? { opportunityId } : {}),
      },
      include: { payable: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ==========================================
  // SUMMARY & FLOW
  // ==========================================

  async getFinancialSummary(organizationId: string, opportunityId: string) {
    const opp = await this.prisma.opportunity.findFirst({
      where: { id: opportunityId, organizationId },
      include: {
        paymentPlans: {
          include: {
            receivables: {
              include: {
                allocations: {
                  include: { receipt: true },
                },
              },
              orderBy: { installmentNumber: 'asc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        payables: {
          include: {
            allocations: {
              include: { payment: true },
            },
          },
          orderBy: { dueDate: 'asc' },
        },
        commissions: {
          orderBy: { createdAt: 'desc' },
        },
        projectGates: {
          where: { gateType: { in: ['CONTRACT', 'FINANCIAL'] } },
        },
      },
    });

    if (!opp) {
      throw new NotFoundException('Oportunidade não encontrada.');
    }

    const activePlan = opp.paymentPlans.find((p) => p.status === 'ACTIVE') || opp.paymentPlans[0];
    const receivables = activePlan ? activePlan.receivables : [];

    const now = new Date();
    let contractedRevenue = 0;
    let receivedRevenue = 0;
    let openReceivables = 0;
    let overdueReceivables = 0;

    for (const rec of receivables) {
      const orig = Number(rec.originalAmount);
      const paid = Number(rec.paidAmount);
      const out = Number(rec.outstandingAmount);

      contractedRevenue += orig;
      receivedRevenue += paid;

      if (rec.status === 'OVERDUE' || (new Date(rec.dueDate) < now && rec.status !== 'PAID')) {
        overdueReceivables += out;
      }
      if (['OPEN', 'PARTIALLY_PAID', 'OVERDUE'].includes(rec.status)) {
        openReceivables += out;
      }
    }

    let recognizedCost = 0;
    let paidCost = 0;
    for (const pay of opp.payables) {
      if (pay.status !== 'CANCELED') {
        recognizedCost += Number(pay.originalAmount);
        paidCost += Number(pay.paidAmount);
      }
    }

    const actualGrossResult = Math.round((receivedRevenue - paidCost) * 100) / 100;
    const projectedGrossResult = Math.round((contractedRevenue - recognizedCost) * 100) / 100;
    const actualMarginPercent =
      receivedRevenue > 0 ? Math.round((actualGrossResult / receivedRevenue) * 10000) / 100 : 0;
    const projectedMarginPercent =
      contractedRevenue > 0
        ? Math.round((projectedGrossResult / contractedRevenue) * 10000) / 100
        : 0;

    const financialGate = opp.projectGates.find((g) => g.gateType === 'FINANCIAL');

    return {
      opportunity: {
        id: opp.id,
        code: opp.code,
        title: opp.title,
        state: opp.state,
      },
      indicators: {
        contractedRevenue,
        receivedRevenue,
        openReceivables,
        overdueReceivables,
        recognizedCost,
        paidCost,
        actualGrossResult,
        projectedGrossResult,
        actualMarginPercent,
        projectedMarginPercent,
      },
      financialGate: financialGate || {
        gateType: 'FINANCIAL',
        status: 'PENDING',
        evidenceSummary: 'Plano financeiro não inicializado ou aguardando pagamento da entrada',
      },
      activePaymentPlan: activePlan || null,
      receivables,
      payables: opp.payables,
      commissions: opp.commissions,
    };
  }

  async getCashFlow(organizationId: string) {
    const movements = await this.prisma.cashMovement.findMany({
      where: { organizationId, status: 'CONFIRMED' },
      include: { account: true },
      orderBy: { effectiveAt: 'desc' },
      take: 100,
    });

    let totalIn = 0;
    let totalOut = 0;
    for (const mov of movements) {
      const amt = Number(mov.amount);
      if (mov.direction === 'IN') {
        totalIn += amt;
      } else {
        totalOut += amt;
      }
    }

    const netCash = Math.round((totalIn - totalOut) * 100) / 100;

    return {
      summary: {
        totalIn,
        totalOut,
        netCash,
      },
      movements,
    };
  }

  // ==========================================
  // HELPERS
  // ==========================================

  private async evaluateFinancialConditions(
    tx: Prisma.TransactionClient,
    organizationId: string,
    opportunityId: string,
    actorId: string,
  ) {
    const downPaymentRec = await tx.receivable.findFirst({
      where: {
        opportunityId,
        organizationId,
        installmentNumber: 1,
      },
    });

    const isGateSatisfied = downPaymentRec ? downPaymentRec.status === 'PAID' : false;

    const gate = await tx.projectGate.findFirst({
      where: { opportunityId, gateType: 'FINANCIAL' },
    });

    if (isGateSatisfied) {
      if (gate) {
        await tx.projectGate.update({
          where: { id: gate.id },
          data: {
            status: 'SATISFIED',
            satisfiedById: actorId,
            satisfiedAt: new Date(),
            evidenceSummary: 'Sinal/Entrada liquidado integralmente. Gate Financeiro liberado.',
          },
        });
      } else {
        await tx.projectGate.create({
          data: {
            organizationId,
            opportunityId,
            gateType: 'FINANCIAL',
            status: 'SATISFIED',
            satisfiedById: actorId,
            satisfiedAt: new Date(),
            evidenceSummary: 'Sinal/Entrada liquidado integralmente. Gate Financeiro liberado.',
          },
        });
      }

      const pendingCommissions = await tx.commission.findMany({
        where: {
          opportunityId,
          triggerGate: 'FINANCIAL',
          status: 'ESTIMATED',
        },
      });

      for (const comm of pendingCommissions) {
        const commPayable = await tx.payable.create({
          data: {
            organizationId,
            opportunityId,
            category: 'COMMISSION',
            description: `Comissão de vendas: ${comm.beneficiaryName} (${comm.percentage}%)`,
            recipient: comm.beneficiaryName,
            originalAmount: comm.commissionAmount,
            paidAmount: new Prisma.Decimal(0),
            outstandingAmount: comm.commissionAmount,
            dueDate: new Date(Date.now() + 15 * 86400000),
            status: 'OPEN',
          },
        });

        await tx.commission.update({
          where: { id: comm.id },
          data: {
            status: 'ACQUIRED',
            payableId: commPayable.id,
          },
        });
      }
    } else if (gate && gate.status === 'SATISFIED') {
      await tx.projectGate.update({
        where: { id: gate.id },
        data: {
          status: 'PENDING',
          satisfiedById: null,
          satisfiedAt: null,
          evidenceSummary: 'Aguardando liquidação da entrada (reaberto após estorno).',
        },
      });
    }
  }
}
