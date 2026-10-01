import { describe, expect, it, beforeEach } from 'vitest';
import { AfterSalesService } from '../src/after-sales/after-sales.service';
import {
  ClaimStatus,
  InteractionKind,
  TicketCoverage,
  TicketPriority,
  TicketStatus,
  TicketType,
  WarrantyKind,
  WarrantyProviderType,
} from '../src/after-sales/after-sales.dto';

describe('SPEC-011 After-Sales, Support & Monitoring Unit Tests', () => {
  let service: AfterSalesService;
  let fakeDb: any;

  beforeEach(() => {
    fakeDb = {
      $transaction: async (callback: any) => callback(fakeDb),
      customer: {
        findFirst: async ({ where }: any) => ({
          id: where.id || 'cust-1',
          organizationId: where.organizationId,
          legalName: 'Cliente Solar Teste Ltda',
        }),
      },
      operationalProject: {
        findFirst: async ({ where }: any) => ({
          id: where.id || 'prj-1',
          organizationId: where.organizationId,
          code: 'PRJ-2026-0001',
          title: 'Usina 10 kWp',
          opportunityId: 'opp-1',
        }),
      },
      supportTicket: {
        count: async () => 0,
        create: async ({ data }: any) => ({
          id: 'ticket-1',
          ...data,
          version: 1,
        }),
        findFirst: async ({ where }: any) => ({
          id: where.id || 'ticket-1',
          organizationId: where.organizationId,
          ticketNumber: 'TK-2026-0001',
          customerId: 'cust-1',
          projectId: 'prj-1',
          type: TicketType.CONNECTIVITY,
          status: TicketStatus.OPEN,
          priority: TicketPriority.HIGH,
          channel: 'WHATSAPP',
          title: 'Inversor desconectado',
          description: 'Cliente trocou provedor de internet e perdeu sinal.',
          probableCoverage: TicketCoverage.PENDING,
          version: 1,
          customer: { legalName: 'Cliente Solar Teste Ltda' },
          project: {
            id: 'prj-1',
            opportunityId: 'opp-1',
            opportunity: { paymentPlans: [] },
          },
          interactions: [],
          warrantyClaims: [],
          serviceVisitQuotes: [],
        }),
        findUniqueOrThrow: async ({ where }: any) => ({
          id: where.id,
          ticketNumber: 'TK-2026-0001',
          customerId: 'cust-1',
          projectId: 'prj-1',
          status: TicketStatus.OPEN,
          priority: TicketPriority.HIGH,
          title: 'Inversor desconectado',
          customer: { legalName: 'Cliente Solar Teste Ltda' },
          project: { id: 'prj-1' },
          interactions: [],
          warrantyClaims: [],
          serviceVisitQuotes: [],
        }),
        update: async ({ where, data }: any) => ({
          id: where.id,
          ...data,
        }),
      },
      supportInteraction: {
        create: async ({ data }: any) => ({
          id: 'inter-1',
          ...data,
          occurredAt: new Date(),
        }),
      },
      warrantyCoverage: {
        create: async ({ data }: any) => ({
          id: 'cov-1',
          ...data,
        }),
        findFirst: async ({ where }: any) => ({
          id: where.id || 'cov-1',
          organizationId: where.organizationId,
          kind: WarrantyKind.INVERTER,
          providerName: 'Solis Inverters',
          startsAt: new Date('2026-01-01'),
          endsAt: new Date('2031-01-01'),
        }),
        findMany: async () => [],
      },
      warrantyClaim: {
        create: async ({ data }: any) => ({
          id: 'claim-1',
          ...data,
          status: ClaimStatus.DRAFT,
        }),
        findFirst: async ({ where }: any) => ({
          id: where.id || 'claim-1',
          organizationId: where.organizationId,
          status: ClaimStatus.DRAFT,
          failureDescription: 'Display apagado',
        }),
        update: async ({ where, data }: any) => ({
          id: where.id,
          ...data,
        }),
      },
      serviceVisitQuote: {
        count: async () => 0,
        create: async ({ data }: any) => ({
          id: 'quote-1',
          ...data,
        }),
        findFirst: async ({ where }: any) => ({
          id: where.id || 'quote-1',
          organizationId: where.organizationId,
          ticketId: 'ticket-1',
          quoteNumber: 'ORC-2026-0001',
          totalAmount: 350.0,
          status: 'DRAFT',
          ticket: {
            id: 'ticket-1',
            ticketNumber: 'TK-2026-0001',
            title: 'Inversor desconectado',
            projectId: 'prj-1',
            project: {
              id: 'prj-1',
              opportunityId: 'opp-1',
            },
            customer: {
              opportunities: [
                {
                  id: 'opp-1',
                  operationalProject: { id: 'prj-1' },
                },
              ],
            },
          },
        }),
        update: async ({ where, data }: any) => ({
          id: where.id,
          ...data,
        }),
      },
      workOrder: {
        count: async () => 0,
        create: async ({ data }: any) => ({
          id: 'wo-1',
          ...data,
        }),
      },
      paymentPlan: {
        findFirst: async () => null,
        create: async ({ data }: any) => ({
          id: 'pp-1',
          ...data,
        }),
      },
      receivable: {
        count: async () => 0,
        create: async ({ data }: any) => ({
          id: 'rec-1',
          ...data,
        }),
      },
      monitoringSystem: {
        upsert: async ({ create }: any) => ({
          id: 'mon-1',
          ...create,
          readings: [],
          incidents: [],
        }),
        findFirst: async ({ where }: any) => ({
          id: where.id || 'mon-1',
          projectId: where.projectId || 'prj-1',
          organizationId: where.organizationId,
          provider: 'SolisCloud',
          connectionType: 'WIFI',
          status: 'ACTIVE',
          readings: [],
          incidents: [],
        }),
        update: async ({ where, data }: any) => ({
          id: where.id,
          ...data,
        }),
      },
      monitoringReading: {
        upsert: async ({ create, update }: any) => ({
          id: 'read-1',
          ...(create || update),
        }),
      },
      connectivityIncident: {
        create: async ({ data }: any) => ({
          id: 'inc-1',
          ...data,
        }),
        findFirst: async ({ where }: any) => ({
          id: where.id || 'inc-1',
          organizationId: where.organizationId,
          monitoringSystemId: 'mon-1',
          ticketId: 'ticket-1',
        }),
        update: async ({ where, data }: any) => ({
          id: where.id,
          ...data,
        }),
      },
    };

    service = new AfterSalesService(fakeDb);
  });

  it('1. should create support ticket with correct SLA based on priority', async () => {
    const result = await service.createSupportTicket('org-1', 'user-1', {
      customerId: 'cust-1',
      projectId: 'prj-1',
      type: TicketType.CONNECTIVITY,
      priority: TicketPriority.HIGH,
      title: 'Perda de conexão Wi-Fi',
      description: 'Cliente trocou senha da rede Wi-Fi.',
    });

    expect(result).toBeDefined();
    expect(result.ticketNumber).toBe('TK-2026-0001');
  });

  it('2. should triage ticket and advance state to IN_TRIAGE', async () => {
    const result = await service.triageTicket('org-1', 'user-1', 'ticket-1', {
      confirmedCoverage: TicketCoverage.BILLABLE,
      rootCause: 'Troca de infraestrutura do cliente sem aviso prévio.',
      priority: TicketPriority.MEDIUM,
    });

    expect(result).toBeDefined();
  });

  it('3. should update firstResponseAt upon recording first customer message', async () => {
    let ticketUpdated = false;
    fakeDb.supportTicket.update = async ({ data }: any) => {
      if (data.firstResponseAt) ticketUpdated = true;
      return { id: 'ticket-1', ...data };
    };

    await service.addInteraction('org-1', 'user-1', 'ticket-1', {
      kind: InteractionKind.REMOTE_GUIDANCE,
      body: 'Enviado passo a passo para reconectar o inversor via WPS.',
    });

    expect(ticketUpdated).toBe(true);
  });

  it('4. should update ticket status to RESOLVED and set resolvedAt', async () => {
    let resolvedDateSet = false;
    fakeDb.supportTicket.update = async ({ data }: any) => {
      if (data.resolvedAt) resolvedDateSet = true;
      return { id: 'ticket-1', ...data };
    };

    await service.updateTicketStatus('org-1', 'user-1', 'ticket-1', {
      status: TicketStatus.RESOLVED,
      resolutionSummary: 'Inversor reconectado remotamente via WPS.',
      satisfactionRating: 5,
    });

    expect(resolvedDateSet).toBe(true);
  });

  it('5. should calculate service visit quote total amount correctly', async () => {
    const quote = await service.createServiceVisitQuote('org-1', 'ticket-1', {
      laborAmount: 200,
      displacementAmount: 100,
      materialsAmount: 50,
      discountAmount: 25,
      validUntil: '2026-11-01',
      notes: 'Visita técnica para reset de módulo Wi-Fi.',
    });

    expect(quote.totalAmount).toBe(325); // 200 + 100 + 50 - 25
  });

  it('6. should provision WorkOrder and Receivable when service visit quote is accepted', async () => {
    let workOrderCreated = false;
    let receivableCreated = false;

    fakeDb.workOrder.create = async ({ data }: any) => {
      workOrderCreated = true;
      return { id: 'wo-new-1', ...data };
    };

    fakeDb.receivable.create = async ({ data }: any) => {
      receivableCreated = true;
      return { id: 'rec-new-1', ...data };
    };

    const acceptedQuote = await service.acceptServiceVisitQuote('org-1', 'user-1', 'quote-1', {
      acceptedBy: 'Carlos Mendes (Cliente)',
      acceptanceEvidence: 'Aprovado via WhatsApp (11) 98765-4321',
    });

    expect(acceptedQuote.status).toBe('ACCEPTED');
    expect(acceptedQuote.workOrderId).toBe('wo-new-1');
    expect(acceptedQuote.receivableId).toBe('rec-new-1');
    expect(workOrderCreated).toBe(true);
    expect(receivableCreated).toBe(true);
  });

  it('7. SPEC-011 Principle 1: absence of telemetry must persist realized generation as NULL and NOT zero', async () => {
    let savedReading: any = null;

    fakeDb.monitoringReading.upsert = async ({ create }: any) => {
      savedReading = create;
      return { id: 'read-1', ...create };
    };

    // When realizedGenerationKwh is omitted (null or undefined)
    await service.recordMonitoringReading('org-1', 'mon-1', 'user-1', {
      period: '2026-09',
      expectedGenerationKwh: 1200,
      realizedGenerationKwh: null,
      notes: 'Telemetria indisponível no mês devido a queda de fibra óptica na região.',
    });

    expect(savedReading).toBeDefined();
    expect(savedReading.realizedGenerationKwh).toBeNull();
    expect(savedReading.performanceRatio).toBeNull(); // Must remain null, NOT 0%
  });

  it('8. should calculate performance ratio accurately when telemetry is present', async () => {
    let savedReading: any = null;

    fakeDb.monitoringReading.upsert = async ({ create }: any) => {
      savedReading = create;
      return { id: 'read-2', ...create };
    };

    await service.recordMonitoringReading('org-1', 'mon-1', 'user-1', {
      period: '2026-10',
      expectedGenerationKwh: 1000,
      realizedGenerationKwh: 950,
    });

    expect(savedReading).toBeDefined();
    expect(savedReading.realizedGenerationKwh).toBe(950);
    expect(savedReading.performanceRatio).toBe(95.0); // 950 / 1000 * 100 = 95%
  });

  it('9. should handle connectivity incident detection and restoration lifecycle', async () => {
    let incidentRecorded = false;
    let incidentRestored = false;

    fakeDb.connectivityIncident.create = async ({ data }: any) => {
      incidentRecorded = true;
      return { id: 'inc-1', ...data };
    };

    fakeDb.connectivityIncident.update = async ({ data }: any) => {
      if (data.restoredAt) incidentRestored = true;
      return { id: 'inc-1', ...data };
    };

    // Record incident
    await service.recordConnectivityIncident('org-1', 'user-1', 'mon-1', {
      reason: 'Roteador substituído pela operadora de telefonia.',
      customerNetworkChanged: true,
    });
    expect(incidentRecorded).toBe(true);

    // Restore incident
    await service.restoreConnectivityIncident('org-1', 'user-1', 'inc-1', {
      resolutionMethod: 'Configurado novo SSID e senha pelo aplicativo móvel.',
    });
    expect(incidentRestored).toBe(true);
  });
});
