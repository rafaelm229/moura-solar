import { describe, expect, it, beforeEach } from 'vitest';
import { FinancialService } from '../src/financial/financial.service';
import { Prisma } from '@prisma/client';

describe('SPEC-008 Financial, Receivables, Payables, Margin & Cash Flow Governance', () => {
  let service: FinancialService;
  let fakeDb: any;
  let recordedAudits: any[];

  beforeEach(() => {
    recordedAudits = [];
    fakeDb = {
      financialAccount: {
        findFirst: async ({ where }: any) => {
          return {
            id: 'acc-uuid-1',
            organizationId: where.organizationId,
            name: 'Conta Operacional Principal',
            status: 'ACTIVE',
          };
        },
        create: async ({ data }: any) => ({ id: 'acc-uuid-1', ...data }),
        findMany: async () => [{ id: 'acc-uuid-1', name: 'Conta Operacional Principal' }],
      },
      opportunity: {
        findFirst: async ({ where }: any) => {
          return {
            id: where.id,
            organizationId: where.organizationId,
            code: 'OPT-2026-0001',
            title: 'Sistema Solar 7.2 kWp',
            state: 'VENDIDO',
            customer: { id: 'cust-1', legalName: 'Carlos Silva' },
            contracts: [
              {
                id: 'ctr-1',
                code: 'CTR-2026-0001',
                state: 'ACTIVE',
              },
            ],
            proposals: [
              {
                versions: [
                  {
                    id: 'pv-1',
                    versionNumber: 1,
                    status: 'ACCEPTED',
                    finalPrice: new Prisma.Decimal(30000),
                    paymentConditions: {
                      downPaymentPercent: 20,
                      installmentCount: 3,
                    },
                  },
                ],
              },
            ],
            paymentPlans: [],
            payables: [],
            commissions: [],
            projectGates: [],
          };
        },
      },
      paymentPlan: {
        updateMany: async () => ({ count: 0 }),
        create: async ({ data }: any) => ({
          id: 'pp-uuid-1',
          ...data,
          receivables: [],
        }),
        findUniqueOrThrow: async ({ where }: any) => ({
          id: where.id,
          totalAmount: new Prisma.Decimal(30000),
          downPaymentAmount: new Prisma.Decimal(6000),
          status: 'ACTIVE',
          receivables: fakeDb._receivables,
        }),
      },
      receivable: {
        create: async ({ data }: any) => {
          const rec = { id: `rec-${fakeDb._receivables.length + 1}`, ...data };
          fakeDb._receivables.push(rec);
          return rec;
        },
        findFirst: async ({ where }: any) => {
          return fakeDb._receivables.find((r: any) => {
            if (where.id && r.id !== where.id) return false;
            if (where.installmentNumber && r.installmentNumber !== where.installmentNumber)
              return false;
            return true;
          });
        },
        findMany: async () => {
          return fakeDb._receivables.filter((r: any) =>
            ['OPEN', 'PARTIALLY_PAID', 'OVERDUE'].includes(r.status),
          );
        },
        update: async ({ where, data }: any) => {
          const item = fakeDb._receivables.find((r: any) => r.id === where.id);
          if (item) {
            Object.assign(item, data);
            return item;
          }
          return { id: where.id, ...data };
        },
      },
      projectGate: {
        findFirst: async ({ where }: any) => {
          return fakeDb._projectGates.find((g: any) => g.gateType === where.gateType);
        },
        create: async ({ data }: any) => {
          const gate = { id: `gate-${fakeDb._projectGates.length + 1}`, ...data };
          fakeDb._projectGates.push(gate);
          return gate;
        },
        update: async ({ where, data }: any) => {
          const gate = fakeDb._projectGates.find((g: any) => g.id === where.id);
          if (gate) {
            Object.assign(gate, data);
            return gate;
          }
          return { id: where.id, ...data };
        },
      },
      commission: {
        count: async () => fakeDb._commissions.length,
        create: async ({ data }: any) => {
          const comm = { id: `comm-${fakeDb._commissions.length + 1}`, ...data };
          fakeDb._commissions.push(comm);
          return comm;
        },
        findMany: async ({ where }: any) => {
          return fakeDb._commissions.filter((c: any) => {
            if (where.triggerGate && c.triggerGate !== where.triggerGate) return false;
            if (where.status && c.status !== where.status) return false;
            return true;
          });
        },
        update: async ({ where, data }: any) => {
          const comm = fakeDb._commissions.find((c: any) => c.id === where.id);
          if (comm) {
            Object.assign(comm, data);
            return comm;
          }
          return { id: where.id, ...data };
        },
        updateMany: async ({ where, data }: any) => {
          const comms = fakeDb._commissions.filter((c: any) => c.payableId === where.payableId);
          comms.forEach((c: any) => Object.assign(c, data));
          return { count: comms.length };
        },
      },
      receipt: {
        create: async ({ data }: any) => {
          const rc = { id: `rc-${fakeDb._receipts.length + 1}`, ...data };
          fakeDb._receipts.push(rc);
          return rc;
        },
        findFirst: async ({ where }: any) => {
          const r = fakeDb._receipts.find((item: any) => item.id === where.id);
          if (!r) return null;
          return {
            ...r,
            allocations: fakeDb._receiptAllocations
              .filter((a: any) => a.receiptId === r.id)
              .map((a: any) => ({
                ...a,
                receivable: fakeDb._receivables.find((rec: any) => rec.id === a.receivableId),
              })),
          };
        },
        findUniqueOrThrow: async ({ where }: any) => {
          const found = fakeDb._receipts.find((r: any) => r.id === where.id);
          return {
            ...found,
            account: { id: 'acc-uuid-1', name: 'Conta Operacional Principal' },
            allocations: fakeDb._receiptAllocations.filter((a: any) => a.receiptId === where.id),
          };
        },
        update: async ({ where, data }: any) => {
          const r = fakeDb._receipts.find((x: any) => x.id === where.id);
          if (r) Object.assign(r, data);
          return r;
        },
      },
      receiptAllocation: {
        create: async ({ data }: any) => {
          const alloc = {
            id: `alloc-${fakeDb._receiptAllocations.length + 1}`,
            ...data,
            receivable: fakeDb._receivables.find((r: any) => r.id === data.receivableId),
          };
          fakeDb._receiptAllocations.push(alloc);
          return alloc;
        },
        update: async ({ where, data }: any) => {
          const a = fakeDb._receiptAllocations.find((x: any) => x.id === where.id);
          if (a) Object.assign(a, data);
          return a;
        },
      },
      payable: {
        create: async ({ data }: any) => {
          const pay = { id: `pay-${fakeDb._payables.length + 1}`, ...data };
          fakeDb._payables.push(pay);
          return pay;
        },
        findFirst: async ({ where }: any) => {
          return fakeDb._payables.find((p: any) => p.id === where.id);
        },
        findMany: async () => fakeDb._payables,
        update: async ({ where, data }: any) => {
          const p = fakeDb._payables.find((x: any) => x.id === where.id);
          if (p) Object.assign(p, data);
          return p;
        },
      },
      payment: {
        create: async ({ data }: any) => {
          const p = { id: `pmt-${fakeDb._payments.length + 1}`, ...data };
          fakeDb._payments.push(p);
          return p;
        },
        findUniqueOrThrow: async ({ where }: any) => {
          const found = fakeDb._payments.find((x: any) => x.id === where.id);
          return {
            ...found,
            allocations: fakeDb._paymentAllocations.filter((a: any) => a.paymentId === where.id),
          };
        },
      },
      paymentAllocation: {
        create: async ({ data }: any) => {
          const alloc = { id: `pa-${fakeDb._paymentAllocations.length + 1}`, ...data };
          fakeDb._paymentAllocations.push(alloc);
          return alloc;
        },
      },
      cashMovement: {
        create: async ({ data }: any) => {
          const mov = { id: `mov-${fakeDb._cashMovements.length + 1}`, ...data };
          fakeDb._cashMovements.push(mov);
          return mov;
        },
        findMany: async () => fakeDb._cashMovements,
      },
      $transaction: async (fn: any) => fn(fakeDb),

      _receivables: [],
      _projectGates: [],
      _commissions: [],
      _receipts: [],
      _receiptAllocations: [],
      _payables: [],
      _payments: [],
      _paymentAllocations: [],
      _cashMovements: [],
    };

    const mockAudit: any = {
      record: async (params: any) => {
        recordedAudits.push(params);
        return { id: 'audit-id', ...params };
      },
    };

    service = new FinancialService(fakeDb as any, mockAudit);
  });

  it('1. Generates payment plan with down payment, balanced installments and commission', async () => {
    const plan = await service.generatePaymentPlanFromContract('org-1', 'opp-1', 'user-1');

    expect(plan).toBeDefined();
    expect(Number(plan.totalAmount)).toBe(30000);
    expect(Number(plan.downPaymentAmount)).toBe(6000);

    expect(fakeDb._receivables).toHaveLength(4);

    const downPayment = fakeDb._receivables[0];
    expect(downPayment.installmentNumber).toBe(1);
    expect(Number(downPayment.originalAmount)).toBe(6000);
    expect(downPayment.title).toContain('Entrada / Sinal');
    expect(downPayment.status).toBe('OPEN');

    const installment1 = fakeDb._receivables[1];
    expect(installment1.installmentNumber).toBe(2);
    expect(Number(installment1.originalAmount)).toBe(8000);

    expect(fakeDb._projectGates).toHaveLength(1);
    expect(fakeDb._projectGates[0].gateType).toBe('FINANCIAL');
    expect(fakeDb._projectGates[0].status).toBe('PENDING');

    expect(fakeDb._commissions).toHaveLength(1);
    expect(fakeDb._commissions[0].role).toBe('SALES_REP');
    expect(Number(fakeDb._commissions[0].commissionAmount)).toBe(900);
    expect(fakeDb._commissions[0].status).toBe('ESTIMATED');

    expect(recordedAudits).toContainEqual(
      expect.objectContaining({ action: 'FINANCIAL_PAYMENT_PLAN_GENERATED' }),
    );
  });

  it('2. Records partial receipt without fully satisfying down payment', async () => {
    await service.generatePaymentPlanFromContract('org-1', 'opp-1', 'user-1');

    const receipt = await service.recordReceipt('org-1', 'user-1', {
      opportunityId: 'opp-1',
      accountId: 'acc-uuid-1',
      amount: 3000,
      paymentMethod: 'PIX',
      payerName: 'Carlos Silva',
    });

    expect(receipt).toBeDefined();
    expect(Number(receipt.amount)).toBe(3000);

    const downPayment = fakeDb._receivables[0];
    expect(downPayment.status).toBe('PARTIALLY_PAID');
    expect(Number(downPayment.paidAmount)).toBe(3000);
    expect(Number(downPayment.outstandingAmount)).toBe(3000);

    const gate = fakeDb._projectGates[0];
    expect(gate.status).toBe('PENDING');

    expect(fakeDb._cashMovements).toHaveLength(1);
    expect(fakeDb._cashMovements[0].direction).toBe('IN');
    expect(Number(fakeDb._cashMovements[0].amount)).toBe(3000);
  });

  it('3. Fully paying down payment satisfies Gate FINANCIAL and acquires commission', async () => {
    await service.generatePaymentPlanFromContract('org-1', 'opp-1', 'user-1');

    await service.recordReceipt('org-1', 'user-1', {
      opportunityId: 'opp-1',
      accountId: 'acc-uuid-1',
      amount: 6000,
      paymentMethod: 'PIX',
      payerName: 'Carlos Silva',
    });

    const downPayment = fakeDb._receivables[0];
    expect(downPayment.status).toBe('PAID');
    expect(Number(downPayment.outstandingAmount)).toBe(0);

    const gate = fakeDb._projectGates[0];
    expect(gate.status).toBe('SATISFIED');
    expect(gate.evidenceSummary).toContain('Gate Financeiro liberado');

    const commission = fakeDb._commissions[0];
    expect(commission.status).toBe('ACQUIRED');
    expect(commission.payableId).toBeDefined();

    expect(fakeDb._payables).toHaveLength(1);
    expect(fakeDb._payables[0].category).toBe('COMMISSION');
    expect(Number(fakeDb._payables[0].originalAmount)).toBe(900);
  });

  it('4. Reversing receipt reopens receivable and re-evaluates Gate FINANCIAL', async () => {
    await service.generatePaymentPlanFromContract('org-1', 'opp-1', 'user-1');

    const receipt = await service.recordReceipt('org-1', 'user-1', {
      opportunityId: 'opp-1',
      accountId: 'acc-uuid-1',
      amount: 6000,
      paymentMethod: 'PIX',
    });

    expect(fakeDb._projectGates[0].status).toBe('SATISFIED');

    await service.reverseReceipt(
      'org-1',
      receipt.id,
      'user-1',
      'Depósito não compensado pelo banco',
    );

    const downPayment = fakeDb._receivables[0];
    expect(downPayment.status).toBe('OPEN');
    expect(Number(downPayment.outstandingAmount)).toBe(6000);

    expect(fakeDb._projectGates[0].status).toBe('PENDING');

    const outMovements = fakeDb._cashMovements.filter((m: any) => m.direction === 'OUT');
    expect(outMovements).toHaveLength(1);
    expect(Number(outMovements[0].amount)).toBe(6000);
  });

  it('5. Records payable and payment with cash flow updates', async () => {
    const payable = await service.createPayable('org-1', 'user-1', {
      opportunityId: 'opp-1',
      category: 'EQUIPMENT',
      description: 'Módulos Fotovoltaicos Canadian 550W (14 unidades)',
      recipient: 'Distribuidora Solar Brasil',
      originalAmount: 14000,
      dueDate: '2026-10-15',
    });

    expect(payable).toBeDefined();
    expect(Number(payable.originalAmount)).toBe(14000);
    expect(payable.status).toBe('OPEN');

    const payment = await service.recordPayment('org-1', 'user-1', {
      accountId: 'acc-uuid-1',
      amount: 14000,
      paymentMethod: 'TED',
      documentNumber: 'DOC-998877',
      allocations: [{ payableId: payable.id, allocatedAmount: 14000 }],
    });

    expect(payment).toBeDefined();
    expect(payable.status).toBe('PAID');
    expect(Number(payable.outstandingAmount)).toBe(0);

    const mov = fakeDb._cashMovements.find((m: any) => m.type === 'PAYMENT');
    expect(mov).toBeDefined();
    expect(mov.direction).toBe('OUT');
    expect(Number(mov.amount)).toBe(14000);
  });
});
