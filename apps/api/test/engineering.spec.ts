import { describe, expect, it, beforeEach } from 'vitest';
import { EngineeringService } from '../src/engineering/engineering.service';
import { ProjectOperationalState, WorkOrderState } from '../src/engineering/engineering.dto';

describe('SPEC-010 Engineering & Field Operations Unit Tests', () => {
  let service: EngineeringService;
  let fakeDb: any;
  let recordedAudits: any[];

  beforeEach(() => {
    recordedAudits = [];
    fakeDb = {
      operationalProject: {
        findFirst: async ({ where }: any) => {
          return {
            id: where.id || 'prj-1',
            organizationId: where.organizationId,
            code: 'PRJ-2026-0001',
            title: 'Projeto Solar 7.5 kWp',
            state: ProjectOperationalState.PREPARATION,
            executiveDesigns: [],
            opportunity: {
              id: 'opp-1',
              state: 'CONTRATACAO',
            },
          };
        },
        update: async ({ where, data }: any) => ({
          id: where.id,
          ...data,
          code: 'PRJ-2026-0001',
          opportunity: { customer: { legalName: 'Cliente Teste' } },
        }),
      },
      executiveDesign: {
        findFirst: async () => ({
          id: 'des-1',
          versionNumber: 1,
          status: 'DRAFT',
        }),
        update: async ({ where, data }: any) => ({
          id: where.id,
          ...data,
        }),
        updateMany: async () => ({ count: 1 }),
      },
      workOrder: {
        findFirst: async ({ where }: any) => ({
          id: where.id || 'wo-1',
          code: 'OS-2026-0001',
          state: WorkOrderState.READY,
          checklistItems: [],
          projectId: 'prj-1',
        }),
        update: async ({ where, data }: any) => ({
          id: where.id,
          ...data,
          checklistItems: [],
        }),
      },
      $transaction: async (cb: any) => cb(fakeDb),
    };

    const fakeAuditService = {
      record: async (event: any) => {
        recordedAudits.push(event);
      },
    };

    service = new EngineeringService(fakeDb as any, fakeAuditService as any);
  });

  it('blocks transition to READY_TO_SCHEDULE if executive design is not approved', async () => {
    await expect(
      service.updateOperationalProject('org-1', 'user-1', 'prj-1', {
        state: ProjectOperationalState.READY_TO_SCHEDULE,
      }),
    ).rejects.toThrow(/Gate de Engenharia pendente/);
  });

  it('allows transition to READY_TO_SCHEDULE when approved executive design exists', async () => {
    fakeDb.operationalProject.findFirst = async () => ({
      id: 'prj-1',
      organizationId: 'org-1',
      code: 'PRJ-2026-0001',
      state: ProjectOperationalState.PREPARATION,
      executiveDesigns: [{ id: 'des-1', status: 'APPROVED' }],
      opportunity: { id: 'opp-1', state: 'CONTRATACAO' },
    });

    const updated = await service.updateOperationalProject('org-1', 'user-1', 'prj-1', {
      state: ProjectOperationalState.READY_TO_SCHEDULE,
    });

    expect(updated.state).toBe(ProjectOperationalState.READY_TO_SCHEDULE);
  });

  it('requires pauseReason when work order is paused', async () => {
    await expect(
      service.updateWorkOrderState('org-1', 'user-1', 'wo-1', {
        state: WorkOrderState.PAUSED,
      }),
    ).rejects.toThrow(/Motivo da pausa é obrigatório/);
  });
});
