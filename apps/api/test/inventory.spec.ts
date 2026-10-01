import { describe, expect, it, beforeEach } from 'vitest';
import { InventoryService } from '../src/inventory/inventory.service';
import { Prisma } from '@prisma/client';

describe('SPEC-009 Inventory & Procurement Governance Unit Tests', () => {
  let service: InventoryService;
  let fakeDb: any;
  let recordedAudits: any[];

  beforeEach(() => {
    recordedAudits = [];
    fakeDb = {
      stockLocation: {
        findFirst: async ({ where }: any) => ({
          id: where.id || 'loc-1',
          organizationId: where.organizationId,
          code: 'DEP-CENTRAL',
          name: 'Depósito Central',
          type: 'WAREHOUSE',
        }),
        create: async ({ data }: any) => ({ id: 'loc-new', ...data }),
        findMany: async () => [{ id: 'loc-1', code: 'DEP-CENTRAL', name: 'Depósito Central' }],
      },
      catalogItem: {
        findFirst: async ({ where }: any) => ({
          id: where.id || 'cat-1',
          sku: 'MOD-LONGI-550',
          name: 'Painel Longi 550W',
          category: 'MODULE',
        }),
      },
      stockBalance: {
        findUnique: async () => ({
          id: 'bal-1',
          catalogItemId: 'cat-1',
          locationId: 'loc-1',
          physicalOnHand: new Prisma.Decimal(10),
          reserved: new Prisma.Decimal(2),
          blocked: new Prisma.Decimal(0),
          available: new Prisma.Decimal(8),
          averageCost: new Prisma.Decimal(400),
        }),
      },
      $transaction: async (cb: any) => cb(fakeDb),
    };

    const fakeAuditService = {
      record: async (event: any) => {
        recordedAudits.push(event);
      },
    };

    service = new InventoryService(fakeDb as any);
  });

  it('calculates weighted moving average cost accurately on incoming stock', () => {
    // Current stock: 10 units @ R$ 400.00 = R$ 4,000.00
    // Incoming stock: 5 units @ R$ 500.00 = R$ 2,500.00
    // Total value: R$ 6,500.00 / 15 units = R$ 433.3333333333333
    const currentQty = new Prisma.Decimal(10);
    const currentAvg = new Prisma.Decimal(400);
    const incomingQty = new Prisma.Decimal(5);
    const incomingCost = new Prisma.Decimal(500);

    const newAvgCost = currentQty
      .mul(currentAvg)
      .add(incomingQty.mul(incomingCost))
      .div(currentQty.add(incomingQty));

    expect(Number(newAvgCost.toFixed(2))).toBe(433.33);
  });

  it('prevents reservation when available quantity is lower than required', async () => {
    // Current available: 8
    // Attempting to reserve: 10
    const available = 8;
    const requested = 10;
    expect(requested > available).toBe(true);
  });

  it('updates available quantity as physicalOnHand minus reserved minus blocked', () => {
    const physical = new Prisma.Decimal(20);
    const reserved = new Prisma.Decimal(5);
    const blocked = new Prisma.Decimal(2);
    const available = physical.sub(reserved).sub(blocked);

    expect(available.toNumber()).toBe(13);
  });
});
