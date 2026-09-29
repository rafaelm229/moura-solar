import { describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '../src/database/prisma.service';
import { HealthController } from '../src/health/health.controller';

describe('HealthController', () => {
  it('returns a live response without database access', () => {
    const prisma = { $queryRaw: vi.fn() } as unknown as PrismaService;
    const controller = new HealthController(prisma);

    expect(controller.live()).toMatchObject({ status: 'ok', service: 'moura-solar-api' });
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });
});
