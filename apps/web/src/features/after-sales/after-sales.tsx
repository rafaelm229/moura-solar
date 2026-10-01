'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, result } from '../identity/client';

export type TicketType =
  | 'ORIENTATION'
  | 'CONNECTIVITY'
  | 'INSTALLATION_WARRANTY'
  | 'MANUFACTURER_WARRANTY'
  | 'MAINTENANCE'
  | 'EXTERNAL_EVENT'
  | 'PERFORMANCE';

export type TicketStatus =
  | 'OPEN'
  | 'IN_TRIAGE'
  | 'WAITING_CUSTOMER'
  | 'WAITING_INTERNAL'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CLOSED'
  | 'CANCELED'
  | 'REOPENED';

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type TicketChannel = 'WHATSAPP' | 'PHONE' | 'EMAIL' | 'IN_PERSON' | 'PORTAL' | 'SYSTEM';

export type InteractionKind = 'NOTE' | 'MESSAGE' | 'REMOTE_GUIDANCE' | 'STATUS_CHANGE' | 'EVIDENCE';

export type CoverageType =
  | 'PENDING'
  | 'CONTRACT'
  | 'INSTALLATION'
  | 'MANUFACTURER'
  | 'COURTESY'
  | 'INSURANCE'
  | 'BILLABLE'
  | 'NOT_APPLICABLE';

export type WarrantyKind = 'INSTALLATION' | 'INVERTER' | 'MODULE' | 'STRUCTURE' | 'ELECTRICAL';

export type WarrantyProviderType = 'INSTALLER' | 'MANUFACTURER' | 'DISTRIBUTOR';

export type WarrantyClaimStatus =
  'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'RMA' | 'REPLACED' | 'CLOSED';

export type ConnectionType = 'WIFI' | 'ETHERNET' | '4G' | 'RS485';

export type ReadingSource = 'INFORMADA' | 'IMPORTADA' | 'ESTIMADA' | 'VALIDADA';

export interface SupportTicketView {
  id: string;
  ticketNumber: string;
  customerId: string;
  projectId?: string | null;
  type: string;
  status: string;
  priority: string;
  channel: string;
  title: string;
  description: string;
  probableCoverage: string;
  confirmedCoverage?: string | null;
  rootCause?: string | null;
  assignedToId?: string | null;
  assignedTeamId?: string | null;
  slaDueAt?: string | null;
  firstResponseAt?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
  resolutionSummary?: string | null;
  satisfactionRating?: number | null;
  createdAt: string;
  customer?: { id: string; legalName: string; taxId?: string | null };
  project?: { id: string; code: string; title: string };
  assignedTo?: { id: string; name: string; email: string } | null;
  assignedTeam?: { id: string; name: string } | null;
  interactions?: Array<{
    id: string;
    kind: string;
    visibility: string;
    body: string;
    occurredAt: string;
    attachmentUrl?: string | null;
    author?: { id: string; name: string };
  }>;
  warrantyClaims?: Array<{
    id: string;
    coverageId: string;
    status: string;
    protocolNumber?: string | null;
    failureDescription: string;
    rmaCode?: string | null;
    replacementSerial?: string | null;
    costsReimbursed?: number | string | null;
  }>;
  serviceVisitQuotes?: Array<{
    id: string;
    ticketId: string;
    quoteNumber: string;
    status: string;
    laborAmount: number | string;
    displacementAmount: number | string;
    materialsAmount: number | string;
    discountAmount: number | string;
    totalAmount: number | string;
    validUntil: string;
    acceptedAt?: string | null;
    acceptedBy?: string | null;
    workOrderId?: string | null;
    receivableId?: string | null;
    workOrder?: { id: string; code: string; title: string; state: string } | null;
    receivable?: {
      id: string;
      installmentNumber: number;
      originalAmount: number | string;
      status: string;
    } | null;
  }>;
}

export interface WarrantyCoverageView {
  id: string;
  projectId: string;
  kind: string;
  providerType: string;
  providerName: string;
  itemModel?: string | null;
  serialNumber?: string | null;
  startsAt: string;
  endsAt: string;
  terms?: string | null;
  status: string;
}

export interface ServiceVisitQuoteView {
  id: string;
  ticketId: string;
  quoteNumber: string;
  status: string;
  laborAmount: number | string;
  displacementAmount: number | string;
  materialsAmount: number | string;
  discountAmount: number | string;
  totalAmount: number | string;
  validUntil: string;
  acceptedAt?: string | null;
  acceptedBy?: string | null;
  acceptanceEvidence?: string | null;
  workOrderId?: string | null;
  receivableId?: string | null;
  notes?: string | null;
  workOrder?: { id: string; code: string; title: string; state: string } | null;
  receivable?: {
    id: string;
    installmentNumber: number;
    originalAmount: number | string;
    status: string;
  } | null;
}

export interface MonitoringSystemView {
  id: string;
  projectId: string;
  provider: string;
  externalPlantId?: string | null;
  connectionType: string;
  status: string;
  lastTelemetryAt?: string | null;
  inverterModel?: string | null;
  notes?: string | null;
  project?: { id: string; code: string; title: string };
  readings?: Array<{
    id: string;
    period: string;
    expectedGenerationKwh: number | string;
    realizedGenerationKwh?: number | string | null;
    performanceRatio?: number | string | null;
    source: string;
    capturedAt: string;
    notes?: string | null;
  }>;
  incidents?: Array<{
    id: string;
    detectedAt: string;
    restoredAt?: string | null;
    reason?: string | null;
    customerNetworkChanged: boolean;
    resolutionMethod?: string | null;
    ticketId?: string | null;
  }>;
}

export interface ProjectOption {
  id: string;
  code: string;
  title: string;
}

export interface CustomerOption {
  id: string;
  legalName: string;
  taxId?: string | null;
}

export function AfterSalesManagement() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'tickets' | 'warranties' | 'quotes' | 'monitoring'>(
    'tickets',
  );
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(
    null,
  );

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // Modals state
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketView | null>(null);
  const [isTriageOpen, setIsTriageOpen] = useState(false);
  const [isInteractionOpen, setIsInteractionOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isNewWarrantyOpen, setIsNewWarrantyOpen] = useState(false);
  const [isNewClaimOpen, setIsNewClaimOpen] = useState(false);
  const [isNewQuoteOpen, setIsNewQuoteOpen] = useState(false);
  const [selectedQuoteToAccept, setSelectedQuoteToAccept] = useState<ServiceVisitQuoteView | null>(
    null,
  );
  const [isNewReadingOpen, setIsNewReadingOpen] = useState(false);
  const [isNewIncidentOpen, setIsNewIncidentOpen] = useState(false);
  const [selectedIncidentToRestore, setSelectedIncidentToRestore] = useState<{
    id: string;
    reason?: string | null;
  } | null>(null);
  const [isConfigMonitoringOpen, setIsConfigMonitoringOpen] = useState(false);

  // Queries
  const { data: tickets = [], isLoading: isLoadingTickets } = useQuery<SupportTicketView[]>({
    queryKey: ['after-sales', 'tickets', statusFilter, priorityFilter, search],
    queryFn: async () => {
      const res = await result(
        api.GET('/api/v1/after-sales/tickets', {
          params: {
            query: {
              status: statusFilter || undefined,
              priority: priorityFilter || undefined,
              search: search || undefined,
            },
          },
        }),
      );
      return (res as unknown as SupportTicketView[]) || [];
    },
  });

  const { data: projects = [] } = useQuery<ProjectOption[]>({
    queryKey: ['engineering', 'projects'],
    queryFn: async () => {
      const res = await result(api.GET('/api/v1/engineering/projects'));
      return (res as unknown as ProjectOption[]) || [];
    },
  });

  const { data: customers = [] } = useQuery<CustomerOption[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await result(api.GET('/api/v1/customers'));
      return (res as unknown as CustomerOption[]) || [];
    },
  });

  const activeProjectId = selectedProjectId || (projects.length > 0 ? projects[0].id : '');

  const { data: warranties = [] } = useQuery<WarrantyCoverageView[]>({
    queryKey: ['after-sales', 'warranties', activeProjectId],
    enabled: !!activeProjectId,
    queryFn: async () => {
      const res = await result(
        api.GET('/api/v1/after-sales/projects/{projectId}/warranties', {
          params: { path: { projectId: activeProjectId } },
        }),
      );
      return (res as unknown as WarrantyCoverageView[]) || [];
    },
  });

  const { data: monitoringSystem } = useQuery<MonitoringSystemView | null>({
    queryKey: ['after-sales', 'monitoring', activeProjectId],
    enabled: !!activeProjectId,
    queryFn: async () => {
      try {
        const res = await result(
          api.GET('/api/v1/after-sales/projects/{projectId}/monitoring', {
            params: { path: { projectId: activeProjectId } },
          }),
        );
        return (res as unknown as MonitoringSystemView) || null;
      } catch {
        return null;
      }
    },
  });

  // Calculate Metrics
  const openTicketsCount = tickets.filter((t) => t.status === 'OPEN').length;
  const inTriageCount = tickets.filter(
    (t) => t.status === 'IN_TRIAGE' || t.status === 'IN_PROGRESS',
  ).length;
  const resolvedCount = tickets.filter(
    (t) => t.status === 'RESOLVED' || t.status === 'CLOSED',
  ).length;

  const allQuotes: ServiceVisitQuoteView[] = tickets.flatMap((t) => t.serviceVisitQuotes || []);
  const totalBilled = allQuotes
    .filter((q) => q.status === 'ACCEPTED')
    .reduce((acc, q) => acc + Number(q.totalAmount || 0), 0);

  // Form states
  const [ticketForm, setTicketForm] = useState({
    customerId: '',
    projectId: '',
    type: 'ORIENTATION' as TicketType,
    priority: 'MEDIUM' as TicketPriority,
    channel: 'WHATSAPP' as TicketChannel,
    title: '',
    description: '',
    probableCoverage: 'PENDING' as CoverageType,
  });

  const [triageForm, setTriageForm] = useState({
    confirmedCoverage: 'COURTESY' as CoverageType,
    rootCause: '',
    priority: 'MEDIUM' as TicketPriority,
  });

  const [interactionForm, setInteractionForm] = useState({
    kind: 'NOTE' as InteractionKind,
    visibility: 'INTERNAL' as 'INTERNAL' | 'PUBLIC',
    body: '',
    attachmentUrl: '',
  });

  const [statusForm, setStatusForm] = useState({
    status: 'RESOLVED' as TicketStatus,
    resolutionSummary: '',
    satisfactionRating: 5,
  });

  const [warrantyForm, setWarrantyForm] = useState({
    kind: 'INVERTER' as WarrantyKind,
    providerType: 'MANUFACTURER' as WarrantyProviderType,
    providerName: '',
    itemModel: '',
    serialNumber: '',
    startsAt: new Date().toISOString().slice(0, 10),
    endsAt: new Date(Date.now() + 5 * 365 * 86400000).toISOString().slice(0, 10),
    terms: 'Garantia total contra defeitos de fabricação.',
  });

  const [claimForm, setClaimForm] = useState({
    coverageId: '',
    failureDescription: '',
    protocolNumber: '',
  });

  const [quoteForm, setQuoteForm] = useState({
    laborAmount: 200,
    displacementAmount: 100,
    materialsAmount: 0,
    discountAmount: 0,
    validUntil: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    notes: 'Visita técnica especializada fora da cobertura de garantia.',
  });

  const [acceptForm, setAcceptForm] = useState({
    acceptedBy: '',
    acceptanceEvidence: '',
  });

  const [monitoringForm, setMonitoringForm] = useState({
    provider: 'SolisCloud',
    externalPlantId: '',
    connectionType: 'WIFI' as ConnectionType,
    inverterModel: '',
    notes: '',
  });

  const [readingForm, setReadingForm] = useState({
    period: new Date().toISOString().slice(0, 7),
    expectedGenerationKwh: 1000,
    realizedGenerationKwh: '',
    source: 'INFORMADA' as ReadingSource,
    notes: '',
  });

  const [incidentForm, setIncidentForm] = useState({
    reason: 'Cliente alterou senha do roteador Wi-Fi',
    customerNetworkChanged: true,
  });

  const [restoreForm, setRestoreForm] = useState({
    resolutionMethod: 'Roteiro de reconexão executado com o cliente via WhatsApp.',
  });

  // Mutations
  const createTicketMutation = useMutation({
    mutationFn: async () =>
      result(
        api.POST('/api/v1/after-sales/tickets', {
          body: {
            customerId: ticketForm.customerId,
            projectId: ticketForm.projectId || undefined,
            type: ticketForm.type,
            priority: ticketForm.priority,
            channel: ticketForm.channel,
            title: ticketForm.title,
            description: ticketForm.description,
            probableCoverage: ticketForm.probableCoverage,
          },
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['after-sales', 'tickets'] });
      setIsNewTicketOpen(false);
      setFeedback({ message: 'Chamado registrado com sucesso!', type: 'success' });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Erro ao criar chamado';
      setFeedback({ message: msg, type: 'error' });
    },
  });

  const triageTicketMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) =>
      result(
        api.PATCH('/api/v1/after-sales/tickets/{id}/triage', {
          params: { path: { id } },
          body: {
            confirmedCoverage: triageForm.confirmedCoverage,
            rootCause: triageForm.rootCause || undefined,
            priority: triageForm.priority,
          },
        }),
      ),
    onSuccess: (updated) => {
      const t = updated as unknown as SupportTicketView;
      queryClient.invalidateQueries({ queryKey: ['after-sales', 'tickets'] });
      setSelectedTicket(t);
      setIsTriageOpen(false);
      setFeedback({ message: 'Triagem técnica atualizada com sucesso!', type: 'success' });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Erro na triagem';
      setFeedback({ message: msg, type: 'error' });
    },
  });

  const addInteractionMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) =>
      result(
        api.POST('/api/v1/after-sales/tickets/{id}/interactions', {
          params: { path: { id } },
          body: {
            kind: interactionForm.kind,
            visibility: interactionForm.visibility,
            body: interactionForm.body,
            attachmentUrl: interactionForm.attachmentUrl || undefined,
          },
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['after-sales', 'tickets'] });
      if (selectedTicket) {
        api
          .GET('/api/v1/after-sales/tickets/{id}', {
            params: { path: { id: selectedTicket.id } },
          })
          .then((res) => {
            if (res.data) setSelectedTicket(res.data as unknown as SupportTicketView);
          });
      }
      setIsInteractionOpen(false);
      setFeedback({ message: 'Interação registrada com sucesso!', type: 'success' });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Erro ao registrar interação';
      setFeedback({ message: msg, type: 'error' });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) =>
      result(
        api.PATCH('/api/v1/after-sales/tickets/{id}/status', {
          params: { path: { id } },
          body: {
            status: statusForm.status,
            resolutionSummary: statusForm.resolutionSummary || undefined,
            satisfactionRating: statusForm.satisfactionRating || undefined,
          },
        }),
      ),
    onSuccess: (updated) => {
      const t = updated as unknown as SupportTicketView;
      queryClient.invalidateQueries({ queryKey: ['after-sales', 'tickets'] });
      setSelectedTicket(t);
      setIsStatusOpen(false);
      setFeedback({ message: 'Status do chamado atualizado!', type: 'success' });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar status';
      setFeedback({ message: msg, type: 'error' });
    },
  });

  const createWarrantyMutation = useMutation({
    mutationFn: async () =>
      result(
        api.POST('/api/v1/after-sales/projects/{projectId}/warranties', {
          params: { path: { projectId: activeProjectId } },
          body: {
            kind: warrantyForm.kind,
            providerType: warrantyForm.providerType,
            providerName: warrantyForm.providerName,
            itemModel: warrantyForm.itemModel || undefined,
            serialNumber: warrantyForm.serialNumber || undefined,
            startsAt: warrantyForm.startsAt,
            endsAt: warrantyForm.endsAt,
            terms: warrantyForm.terms || undefined,
          },
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['after-sales', 'warranties'] });
      setIsNewWarrantyOpen(false);
      setFeedback({ message: 'Termo de garantia adicionado!', type: 'success' });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar garantia';
      setFeedback({ message: msg, type: 'error' });
    },
  });

  const createClaimMutation = useMutation({
    mutationFn: async ({ ticketId }: { ticketId: string }) =>
      result(
        api.POST('/api/v1/after-sales/tickets/{id}/warranty-claims', {
          params: { path: { id: ticketId } },
          body: {
            coverageId: claimForm.coverageId,
            failureDescription: claimForm.failureDescription,
            protocolNumber: claimForm.protocolNumber || undefined,
          },
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['after-sales', 'tickets'] });
      queryClient.invalidateQueries({ queryKey: ['after-sales', 'warranties'] });
      setIsNewClaimOpen(false);
      setFeedback({ message: 'Sinistro de garantia/RMA registrado!', type: 'success' });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Erro ao registrar sinistro';
      setFeedback({ message: msg, type: 'error' });
    },
  });

  const createQuoteMutation = useMutation({
    mutationFn: async ({ ticketId }: { ticketId: string }) =>
      result(
        api.POST('/api/v1/after-sales/tickets/{id}/quotes', {
          params: { path: { id: ticketId } },
          body: {
            laborAmount: quoteForm.laborAmount,
            displacementAmount: quoteForm.displacementAmount,
            materialsAmount: quoteForm.materialsAmount,
            discountAmount: quoteForm.discountAmount,
            validUntil: quoteForm.validUntil,
            notes: quoteForm.notes || undefined,
          },
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['after-sales', 'tickets'] });
      setIsNewQuoteOpen(false);
      setFeedback({ message: 'Orçamento de visita criado!', type: 'success' });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Erro ao criar orçamento';
      setFeedback({ message: msg, type: 'error' });
    },
  });

  const acceptQuoteMutation = useMutation({
    mutationFn: async ({ quoteId }: { quoteId: string }) =>
      result(
        api.POST('/api/v1/after-sales/quotes/{id}/accept', {
          params: { path: { id: quoteId } },
          body: {
            acceptedBy: acceptForm.acceptedBy,
            acceptanceEvidence: acceptForm.acceptanceEvidence || undefined,
          },
        }),
      ),
    onSuccess: (res: unknown) => {
      const data = res as unknown as ServiceVisitQuoteView;
      queryClient.invalidateQueries({ queryKey: ['after-sales', 'tickets'] });
      setSelectedQuoteToAccept(null);
      setFeedback({
        message: `Orçamento aceito! OS provisionada no M8 (${data?.workOrder?.code || 'OS gerada'}) e Recebível provisionado no M6.`,
        type: 'success',
      });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Erro ao aceitar orçamento';
      setFeedback({ message: msg, type: 'error' });
    },
  });

  const configMonitoringMutation = useMutation({
    mutationFn: async () =>
      result(
        api.POST('/api/v1/after-sales/projects/{projectId}/monitoring', {
          params: { path: { projectId: activeProjectId } },
          body: {
            provider: monitoringForm.provider,
            externalPlantId: monitoringForm.externalPlantId || undefined,
            connectionType: monitoringForm.connectionType,
            inverterModel: monitoringForm.inverterModel || undefined,
            notes: monitoringForm.notes || undefined,
          },
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['after-sales', 'monitoring'] });
      setIsConfigMonitoringOpen(false);
      setFeedback({ message: 'Sistema de monitoramento salvo!', type: 'success' });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar monitoramento';
      setFeedback({ message: msg, type: 'error' });
    },
  });

  const recordReadingMutation = useMutation({
    mutationFn: async ({ systemId }: { systemId: string }) =>
      result(
        api.POST('/api/v1/after-sales/monitoring/{id}/readings', {
          params: { path: { id: systemId } },
          body: {
            period: readingForm.period,
            expectedGenerationKwh: Number(readingForm.expectedGenerationKwh),
            realizedGenerationKwh:
              readingForm.realizedGenerationKwh === ''
                ? undefined
                : Number(readingForm.realizedGenerationKwh),
            source: readingForm.source,
            notes: readingForm.notes || undefined,
          },
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['after-sales', 'monitoring'] });
      setIsNewReadingOpen(false);
      setFeedback({ message: 'Leitura de geração registrada!', type: 'success' });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar leitura';
      setFeedback({ message: msg, type: 'error' });
    },
  });

  const recordIncidentMutation = useMutation({
    mutationFn: async ({ systemId }: { systemId: string }) =>
      result(
        api.POST('/api/v1/after-sales/monitoring/{id}/incidents', {
          params: { path: { id: systemId } },
          body: {
            reason: incidentForm.reason || undefined,
            customerNetworkChanged: incidentForm.customerNetworkChanged,
          },
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['after-sales', 'monitoring'] });
      setIsNewIncidentOpen(false);
      setFeedback({ message: 'Incidente de conectividade registrado!', type: 'success' });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Erro ao registrar incidente';
      setFeedback({ message: msg, type: 'error' });
    },
  });

  const restoreIncidentMutation = useMutation({
    mutationFn: async ({ incidentId }: { incidentId: string }) =>
      result(
        api.PATCH('/api/v1/after-sales/incidents/{id}/restore', {
          params: { path: { id: incidentId } },
          body: {
            resolutionMethod: restoreForm.resolutionMethod,
          },
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['after-sales', 'monitoring'] });
      setSelectedIncidentToRestore(null);
      setFeedback({ message: 'Conectividade Wi-Fi restabelecida!', type: 'success' });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Erro ao restaurar conectividade';
      setFeedback({ message: msg, type: 'error' });
    },
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#090B0A', margin: 0 }}>
            Pós-Venda, Garantias & Monitoramento
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0.25rem 0 0 0' }}>
            Gestão de chamados, suporte técnico, RMA de fabricantes, visitas cobradas e telemetria
            solar.
          </p>
        </div>

        {activeTab === 'tickets' && (
          <button
            onClick={() => setIsNewTicketOpen(true)}
            style={{
              background: '#087443',
              color: '#ffffff',
              border: 'none',
              padding: '0.6rem 1.25rem',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            + Novo Chamado
          </button>
        )}

        {activeTab === 'warranties' && (
          <button
            onClick={() => setIsNewWarrantyOpen(true)}
            style={{
              background: '#087443',
              color: '#ffffff',
              border: 'none',
              padding: '0.6rem 1.25rem',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            + Novo Termo de Garantia
          </button>
        )}

        {activeTab === 'monitoring' && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setIsConfigMonitoringOpen(true)}
              style={{
                background: '#ffffff',
                color: '#087443',
                border: '1px solid #087443',
                padding: '0.6rem 1rem',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              Configurar Sistema
            </button>
            <button
              onClick={() => setIsNewReadingOpen(true)}
              disabled={!monitoringSystem}
              style={{
                background: '#087443',
                color: '#ffffff',
                border: 'none',
                padding: '0.6rem 1rem',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: monitoringSystem ? 'pointer' : 'not-allowed',
                opacity: monitoringSystem ? 1 : 0.6,
              }}
            >
              + Lançar Leitura
            </button>
            <button
              onClick={() => setIsNewIncidentOpen(true)}
              disabled={!monitoringSystem}
              style={{
                background: '#dc2626',
                color: '#ffffff',
                border: 'none',
                padding: '0.6rem 1rem',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: monitoringSystem ? 'pointer' : 'not-allowed',
                opacity: monitoringSystem ? 1 : 0.6,
              }}
            >
              Registrar Queda Wi-Fi
            </button>
          </div>
        )}
      </div>

      {feedback && (
        <div
          role="status"
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: '8px',
            backgroundColor:
              feedback.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(38, 216, 102, 0.15)',
            border: `1px solid ${feedback.type === 'error' ? '#ef4444' : '#26d866'}`,
            color: feedback.type === 'error' ? '#fca5a5' : '#86efac',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
          }}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
        }}
      >
        <div
          style={{
            background: '#f8fafc',
            padding: '1rem',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
          }}
        >
          <div
            style={{
              fontSize: '0.8rem',
              color: '#64748b',
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            Chamados Abertos
          </div>
          <div
            style={{ fontSize: '1.5rem', fontWeight: 700, color: '#dc2626', marginTop: '0.25rem' }}
          >
            {openTicketsCount}
          </div>
        </div>

        <div
          style={{
            background: '#f8fafc',
            padding: '1rem',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
          }}
        >
          <div
            style={{
              fontSize: '0.8rem',
              color: '#64748b',
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            Em Triagem / Campo
          </div>
          <div
            style={{ fontSize: '1.5rem', fontWeight: 700, color: '#d97706', marginTop: '0.25rem' }}
          >
            {inTriageCount}
          </div>
        </div>

        <div
          style={{
            background: '#f8fafc',
            padding: '1rem',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
          }}
        >
          <div
            style={{
              fontSize: '0.8rem',
              color: '#64748b',
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            Resolvidos / Encerrados
          </div>
          <div
            style={{ fontSize: '1.5rem', fontWeight: 700, color: '#15803d', marginTop: '0.25rem' }}
          >
            {resolvedCount}
          </div>
        </div>

        <div
          style={{
            background: '#f8fafc',
            padding: '1rem',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
          }}
        >
          <div
            style={{
              fontSize: '0.8rem',
              color: '#64748b',
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            Visitas Faturadas
          </div>
          <div
            style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0284c7', marginTop: '0.25rem' }}
          >
            R${' '}
            {totalBilled.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '0.5rem',
        }}
      >
        {[
          { id: 'tickets' as const, label: 'Chamados de Suporte' },
          { id: 'warranties' as const, label: 'Termos de Garantia & RMA' },
          { id: 'quotes' as const, label: 'Visitas Técnicas & Orçamentos' },
          { id: 'monitoring' as const, label: 'Telemetria & Conectividade Wi-Fi' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              background: activeTab === t.id ? '#087443' : 'transparent',
              color: activeTab === t.id ? '#ffffff' : '#64748b',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: TICKETS */}
      {activeTab === 'tickets' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Filters Bar */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Buscar por número, título ou cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1,
                minWidth: '220px',
                padding: '0.5rem 0.75rem',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
              }}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
              }}
            >
              <option value="">Todos os status</option>
              <option value="OPEN">Aberto (OPEN)</option>
              <option value="IN_TRIAGE">Em Triagem (IN_TRIAGE)</option>
              <option value="IN_PROGRESS">Em Atendimento</option>
              <option value="RESOLVED">Resolvido</option>
              <option value="CLOSED">Encerrado</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
              }}
            >
              <option value="">Todas as prioridades</option>
              <option value="CRITICAL">Crítica (4h)</option>
              <option value="HIGH">Alta (24h)</option>
              <option value="MEDIUM">Média (48h)</option>
              <option value="LOW">Baixa (72h)</option>
            </select>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '0.875rem',
              }}
            >
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem' }}>Número</th>
                  <th style={{ padding: '0.75rem' }}>Cliente / Projeto</th>
                  <th style={{ padding: '0.75rem' }}>Tipo</th>
                  <th style={{ padding: '0.75rem' }}>Prioridade</th>
                  <th style={{ padding: '0.75rem' }}>Canal</th>
                  <th style={{ padding: '0.75rem' }}>Status</th>
                  <th style={{ padding: '0.75rem' }}>SLA / Prazo</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingTickets ? (
                  <tr>
                    <td
                      colSpan={8}
                      style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}
                    >
                      Carregando chamados...
                    </td>
                  </tr>
                ) : tickets.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}
                    >
                      Nenhum chamado de suporte encontrado.
                    </td>
                  </tr>
                ) : (
                  tickets.map((t) => (
                    <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 600, color: '#087443' }}>
                        {t.ticketNumber}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ fontWeight: 600 }}>{t.customer?.legalName || 'Cliente'}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{t.title}</div>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span
                          style={{
                            fontSize: '0.8rem',
                            background: '#f1f5f9',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                          }}
                        >
                          {t.type}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span
                          style={{
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            color:
                              t.priority === 'CRITICAL'
                                ? '#dc2626'
                                : t.priority === 'HIGH'
                                  ? '#ea580c'
                                  : t.priority === 'MEDIUM'
                                    ? '#0284c7'
                                    : '#64748b',
                          }}
                        >
                          {t.priority}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.8rem', color: '#64748b' }}>
                        {t.channel}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span
                          style={{
                            fontSize: '0.8rem',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            background:
                              t.status === 'RESOLVED' || t.status === 'CLOSED'
                                ? '#dcfce7'
                                : t.status === 'IN_PROGRESS' || t.status === 'IN_TRIAGE'
                                  ? '#fef3c7'
                                  : '#fee2e2',
                            color:
                              t.status === 'RESOLVED' || t.status === 'CLOSED'
                                ? '#15803d'
                                : t.status === 'IN_PROGRESS' || t.status === 'IN_TRIAGE'
                                  ? '#b45309'
                                  : '#b91c1c',
                            fontWeight: 600,
                          }}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.8rem', color: '#64748b' }}>
                        {t.slaDueAt ? new Date(t.slaDueAt).toLocaleString('pt-BR') : '-'}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        <button
                          onClick={() => setSelectedTicket(t)}
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            padding: '0.3rem 0.6rem',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                          }}
                        >
                          Ver Detalhes
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: WARRANTIES & RMA */}
      {activeTab === 'warranties' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Projeto Selecionado:</label>
            <select
              value={activeProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                minWidth: '280px',
              }}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.title}
                </option>
              ))}
            </select>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1rem',
            }}
          >
            {warranties.length === 0 ? (
              <div
                style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: '#64748b',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px dashed #cbd5e1',
                }}
              >
                Nenhum termo de garantia registrado para este projeto operacional.
              </div>
            ) : (
              warranties.map((w) => (
                <div
                  key={w.id}
                  style={{
                    background: '#ffffff',
                    padding: '1.25rem',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: '#ecfdf5',
                          color: '#087443',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                        }}
                      >
                        {w.kind}
                      </span>
                      <h3
                        style={{
                          margin: '0.5rem 0 0.25rem 0',
                          fontSize: '1.1rem',
                          fontWeight: 600,
                        }}
                      >
                        {w.providerName}
                      </h3>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                        Modelo: {w.itemModel || 'Não informado'} | Série: {w.serialNumber || 'N/A'}
                      </p>
                    </div>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: '#f1f5f9',
                        color: '#475569',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                      }}
                    >
                      {w.providerType}
                    </span>
                  </div>

                  <div
                    style={{
                      margin: '1rem 0',
                      fontSize: '0.85rem',
                      color: '#475569',
                      borderTop: '1px solid #f1f5f9',
                      paddingTop: '0.75rem',
                    }}
                  >
                    <div>
                      Vigência: {new Date(w.startsAt).toLocaleDateString('pt-BR')} até{' '}
                      {new Date(w.endsAt).toLocaleDateString('pt-BR')}
                    </div>
                    <div style={{ marginTop: '0.25rem', color: '#64748b', fontStyle: 'italic' }}>
                      {w.terms}
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '1rem',
                    }}
                  >
                    <span style={{ fontSize: '0.8rem', color: '#087443', fontWeight: 600 }}>
                      ● Ativo
                    </span>
                    <button
                      onClick={() => {
                        setClaimForm((prev) => ({ ...prev, coverageId: w.id }));
                        setIsNewClaimOpen(true);
                      }}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #087443',
                        color: '#087443',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Abrir Sinistro / RMA
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: QUOTES */}
      {activeTab === 'quotes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '0.875rem',
              }}
            >
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem' }}>Número Orçamento</th>
                  <th style={{ padding: '0.75rem' }}>Mão de Obra</th>
                  <th style={{ padding: '0.75rem' }}>Deslocamento</th>
                  <th style={{ padding: '0.75rem' }}>Total</th>
                  <th style={{ padding: '0.75rem' }}>Validade</th>
                  <th style={{ padding: '0.75rem' }}>Status</th>
                  <th style={{ padding: '0.75rem' }}>Ordem de Serviço (M8)</th>
                  <th style={{ padding: '0.75rem' }}>Recebível (M6)</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {allQuotes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}
                    >
                      Nenhum orçamento de visita técnica emitido ainda.
                    </td>
                  </tr>
                ) : (
                  allQuotes.map((q) => (
                    <tr key={q.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 600, color: '#087443' }}>
                        {q.quoteNumber}
                      </td>
                      <td style={{ padding: '0.75rem' }}>R$ {Number(q.laborAmount).toFixed(2)}</td>
                      <td style={{ padding: '0.75rem' }}>
                        R$ {Number(q.displacementAmount).toFixed(2)}
                      </td>
                      <td style={{ padding: '0.75rem', fontWeight: 700 }}>
                        R$ {Number(q.totalAmount).toFixed(2)}
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.8rem', color: '#64748b' }}>
                        {new Date(q.validUntil).toLocaleDateString('pt-BR')}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span
                          style={{
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            background: q.status === 'ACCEPTED' ? '#dcfce7' : '#fef3c7',
                            color: q.status === 'ACCEPTED' ? '#15803d' : '#b45309',
                          }}
                        >
                          {q.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.8rem' }}>
                        {q.workOrder ? (
                          <span style={{ color: '#087443', fontWeight: 600 }}>
                            {q.workOrder.code}
                          </span>
                        ) : q.workOrderId ? (
                          <span style={{ color: '#087443' }}>Provisionada</span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.8rem' }}>
                        {q.receivable ? (
                          <span style={{ color: '#0284c7', fontWeight: 600 }}>
                            R$ {Number(q.receivable.originalAmount).toFixed(2)}
                          </span>
                        ) : q.receivableId ? (
                          <span style={{ color: '#0284c7' }}>Provisionado</span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        {q.status !== 'ACCEPTED' && (
                          <button
                            onClick={() => setSelectedQuoteToAccept(q)}
                            style={{
                              background: '#087443',
                              color: '#ffffff',
                              border: 'none',
                              padding: '0.35rem 0.75rem',
                              borderRadius: '4px',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Aceitar Orçamento
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: MONITORING & TELEMETRY */}
      {activeTab === 'monitoring' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Projeto Selecionado:</label>
            <select
              value={activeProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                minWidth: '280px',
              }}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.title}
                </option>
              ))}
            </select>
          </div>

          {!monitoringSystem ? (
            <div
              style={{
                padding: '3rem',
                textAlign: 'center',
                background: '#f8fafc',
                borderRadius: '8px',
                border: '1px dashed #cbd5e1',
              }}
            >
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#1e293b' }}>
                Nenhum sistema de telemetria configurado
              </h3>
              <p
                style={{
                  color: '#64748b',
                  fontSize: '0.9rem',
                  maxWidth: '400px',
                  margin: '0 auto 1.5rem auto',
                }}
              >
                Conecte a usina ao portal do inversor (SolisCloud, Deye, Huawei, etc.) para
                registrar leituras e incidentes de Wi-Fi.
              </p>
              <button
                onClick={() => setIsConfigMonitoringOpen(true)}
                style={{
                  background: '#087443',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.6rem 1.25rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Configurar Monitoramento Agora
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Telemetry Status Card */}
              <div
                style={{
                  background: '#ffffff',
                  padding: '1.5rem',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
                      {monitoringSystem.provider}
                    </h3>
                    <span
                      style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: monitoringSystem.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2',
                        color: monitoringSystem.status === 'ACTIVE' ? '#15803d' : '#b91c1c',
                      }}
                    >
                      {monitoringSystem.status === 'ACTIVE' ? '● ONLINE' : '⚠ SEM TELEMETRIA'}
                    </span>
                  </div>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                    ID Usina Externa: {monitoringSystem.externalPlantId || 'N/A'} | Tipo:{' '}
                    {monitoringSystem.connectionType} | Inversor:{' '}
                    {monitoringSystem.inverterModel || 'N/A'}
                  </p>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Última Telemetria</div>
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>
                    {monitoringSystem.lastTelemetryAt
                      ? new Date(monitoringSystem.lastTelemetryAt).toLocaleString('pt-BR')
                      : 'Aguardando telemetria inicial'}
                  </div>
                </div>
              </div>

              {/* Principle 1 Alert Callout */}
              <div
                style={{
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  padding: '1rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  color: '#065f46',
                }}
              >
                <strong>Diretriz SPEC-011:</strong> &quot;Ausência de telemetria NÃO significa
                geração zero&quot;. Períodos sem sinal Wi-Fi preservam a geração real como
                nula/não-informada, sem penalizar os índices de performance com falsos zeros.
              </div>

              {/* Historical Readings Table */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', fontWeight: 700 }}
                >
                  Histórico de Geração Mensal
                </div>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    textAlign: 'left',
                    fontSize: '0.875rem',
                  }}
                >
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '0.75rem' }}>Competência</th>
                      <th style={{ padding: '0.75rem' }}>Esperado (kWh)</th>
                      <th style={{ padding: '0.75rem' }}>Realizado (kWh)</th>
                      <th style={{ padding: '0.75rem' }}>Performance Ratio</th>
                      <th style={{ padding: '0.75rem' }}>Origem</th>
                      <th style={{ padding: '0.75rem' }}>Observações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!monitoringSystem.readings || monitoringSystem.readings.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}
                        >
                          Nenhuma leitura registrada ainda.
                        </td>
                      </tr>
                    ) : (
                      monitoringSystem.readings.map((r) => (
                        <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.75rem', fontWeight: 600 }}>{r.period}</td>
                          <td style={{ padding: '0.75rem' }}>
                            {Number(r.expectedGenerationKwh).toFixed(1)} kWh
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            {r.realizedGenerationKwh != null ? (
                              <span style={{ fontWeight: 600 }}>
                                {Number(r.realizedGenerationKwh).toFixed(1)} kWh
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                                Sem Telemetria (null)
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            {r.performanceRatio != null ? (
                              <span
                                style={{
                                  fontWeight: 700,
                                  color:
                                    Number(r.performanceRatio) >= 90
                                      ? '#15803d'
                                      : Number(r.performanceRatio) >= 75
                                        ? '#d97706'
                                        : '#dc2626',
                                }}
                              >
                                {Number(r.performanceRatio).toFixed(1)}%
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                                Não Aplicável
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0.75rem', fontSize: '0.8rem', color: '#64748b' }}>
                            {r.source}
                          </td>
                          <td style={{ padding: '0.75rem', fontSize: '0.8rem', color: '#64748b' }}>
                            {r.notes || '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Incidents List */}
              {monitoringSystem.incidents && monitoringSystem.incidents.length > 0 && (
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', fontWeight: 700 }}
                  >
                    Incidentes de Conectividade Wi-Fi
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {monitoringSystem.incidents.map((inc) => (
                      <div
                        key={inc.id}
                        style={{
                          padding: '1rem',
                          borderBottom: '1px solid #f1f5f9',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontWeight: 600,
                              color: inc.restoredAt ? '#15803d' : '#b91c1c',
                            }}
                          >
                            {inc.restoredAt ? '✓ Conexão Restaurada' : '⚠ Desconexão Ativa'}
                          </div>
                          <div
                            style={{ fontSize: '0.85rem', color: '#475569', marginTop: '0.25rem' }}
                          >
                            Causa: {inc.reason || 'Perda de sinal Wi-Fi'}{' '}
                            {inc.customerNetworkChanged && '(Cliente trocou rede)'}
                          </div>
                          {inc.resolutionMethod && (
                            <div
                              style={{ fontSize: '0.8rem', color: '#087443', marginTop: '0.25rem' }}
                            >
                              Procedimento: {inc.resolutionMethod}
                            </div>
                          )}
                        </div>
                        <div>
                          {!inc.restoredAt && (
                            <button
                              onClick={() => setSelectedIncidentToRestore(inc)}
                              style={{
                                background: '#087443',
                                color: '#ffffff',
                                border: 'none',
                                padding: '0.35rem 0.75rem',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Restaurar Conexão
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: NOVO CHAMADO */}
      {isNewTicketOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              width: '90%',
              maxWidth: '540px',
              borderRadius: '8px',
              padding: '1.5rem',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: 700 }}>
              Abrir Chamado de Suporte
            </h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createTicketMutation.mutate();
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
            >
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Cliente *</label>
                <select
                  required
                  value={ticketForm.customerId}
                  onChange={(e) => setTicketForm({ ...ticketForm, customerId: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                  }}
                >
                  <option value="">Selecione o cliente...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.legalName} ({c.taxId || 'Sem CPF/CNPJ'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  Projeto Operacional (Opcional)
                </label>
                <select
                  value={ticketForm.projectId}
                  onChange={(e) => setTicketForm({ ...ticketForm, projectId: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                  }}
                >
                  <option value="">Nenhum / Não vinculado</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} - {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Tipo *</label>
                  <select
                    value={ticketForm.type}
                    onChange={(e) =>
                      setTicketForm({ ...ticketForm, type: e.target.value as TicketType })
                    }
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                    }}
                  >
                    <option value="ORIENTATION">Orientação (Dúvida)</option>
                    <option value="CONNECTIVITY">Conectividade Wi-Fi</option>
                    <option value="INSTALLATION_WARRANTY">Garantia Instalação</option>
                    <option value="MANUFACTURER_WARRANTY">Garantia Fabricante</option>
                    <option value="MAINTENANCE">Manutenção Preventiva</option>
                    <option value="EXTERNAL_EVENT">Evento Externo</option>
                    <option value="PERFORMANCE">Desempenho / Geração</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Prioridade *</label>
                  <select
                    value={ticketForm.priority}
                    onChange={(e) =>
                      setTicketForm({ ...ticketForm, priority: e.target.value as TicketPriority })
                    }
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                    }}
                  >
                    <option value="LOW">Baixa (72h)</option>
                    <option value="MEDIUM">Média (48h)</option>
                    <option value="HIGH">Alta (24h)</option>
                    <option value="CRITICAL">Crítica (4h)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Título do Relato *</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: Inversor desconectou após troca do Wi-Fi"
                  value={ticketForm.title}
                  onChange={(e) => setTicketForm({ ...ticketForm, title: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  Descrição Detalhada *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Relate os sintomas descritos pelo cliente, horário de ocorrência..."
                  value={ticketForm.description}
                  onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.5rem',
                  marginTop: '1rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsNewTicketOpen(false)}
                  style={{
                    background: '#f1f5f9',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createTicketMutation.isPending}
                  style={{
                    background: '#087443',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {createTicketMutation.isPending ? 'Salvando...' : 'Criar Chamado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: DETALHES DO CHAMADO */}
      {selectedTicket && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              width: '90%',
              maxWidth: '750px',
              borderRadius: '8px',
              padding: '1.5rem',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: '0.75rem',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 700, color: '#087443', fontSize: '1.25rem' }}>
                    {selectedTicket.ticketNumber}
                  </span>
                  <span
                    style={{
                      fontSize: '0.8rem',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      background: '#f1f5f9',
                    }}
                  >
                    {selectedTicket.status}
                  </span>
                </div>
                <h3 style={{ margin: '0.25rem 0 0 0', fontSize: '1.1rem' }}>
                  {selectedTicket.title}
                </h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                  Cliente: {selectedTicket.customer?.legalName} | Prioridade:{' '}
                  {selectedTicket.priority} | Canal: {selectedTicket.channel}
                </p>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', margin: '1rem 0' }}>
              <button
                onClick={() => setIsTriageOpen(true)}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Fazer Triagem
              </button>
              <button
                onClick={() => setIsInteractionOpen(true)}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                + Interação / Orientação
              </button>
              <button
                onClick={() => setIsNewQuoteOpen(true)}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                + Orçamento de Visita
              </button>
              <button
                onClick={() => setIsStatusOpen(true)}
                style={{
                  background: '#087443',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Alterar Status
              </button>
            </div>

            {/* Triagem info */}
            <div
              style={{
                background: '#f8fafc',
                padding: '1rem',
                borderRadius: '6px',
                fontSize: '0.85rem',
                marginBottom: '1rem',
              }}
            >
              <div>
                <strong>Cobertura Confirmada:</strong>{' '}
                {selectedTicket.confirmedCoverage || selectedTicket.probableCoverage}
              </div>
              <div>
                <strong>Causa Raiz:</strong> {selectedTicket.rootCause || 'Pendente de análise'}
              </div>
              <div>
                <strong>SLA Previsto:</strong>{' '}
                {selectedTicket.slaDueAt
                  ? new Date(selectedTicket.slaDueAt).toLocaleString('pt-BR')
                  : '-'}
              </div>
              <div>
                <strong>Primeira Resposta:</strong>{' '}
                {selectedTicket.firstResponseAt
                  ? new Date(selectedTicket.firstResponseAt).toLocaleString('pt-BR')
                  : 'Aguardando'}
              </div>
              {selectedTicket.resolutionSummary && (
                <div style={{ marginTop: '0.5rem', color: '#15803d' }}>
                  <strong>Resolução:</strong> {selectedTicket.resolutionSummary} (NPS:{' '}
                  {selectedTicket.satisfactionRating || 5}/5)
                </div>
              )}
            </div>

            {/* Timeline */}
            <div>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}>
                Linha do Tempo de Atendimento
              </h4>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  maxHeight: '250px',
                  overflowY: 'auto',
                }}
              >
                {!selectedTicket.interactions || selectedTicket.interactions.length === 0 ? (
                  <div style={{ color: '#64748b', fontSize: '0.85rem' }}>
                    Nenhuma interação registrada.
                  </div>
                ) : (
                  selectedTicket.interactions.map((it) => (
                    <div
                      key={it.id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        padding: '0.75rem',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.75rem',
                          color: '#64748b',
                        }}
                      >
                        <span>
                          {it.author?.name || 'Sistema'} • {it.kind}
                        </span>
                        <span>{new Date(it.occurredAt).toLocaleString('pt-BR')}</span>
                      </div>
                      <div style={{ fontSize: '0.85rem', marginTop: '0.25rem', color: '#1e293b' }}>
                        {it.body}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TRIAGEM */}
      {isTriageOpen && selectedTicket && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              width: '90%',
              maxWidth: '480px',
              borderRadius: '8px',
              padding: '1.5rem',
            }}
          >
            <h3 style={{ margin: '0 0 1rem 0' }}>Triagem Técnica</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                triageTicketMutation.mutate({
                  id: selectedTicket.id,
                });
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
            >
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  Classificação da Cobertura *
                </label>
                <select
                  value={triageForm.confirmedCoverage}
                  onChange={(e) =>
                    setTriageForm({
                      ...triageForm,
                      confirmedCoverage: e.target.value as CoverageType,
                    })
                  }
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                  }}
                >
                  <option value="COURTESY">Cortesia / Orientação</option>
                  <option value="INSTALLATION">Garantia de Instalação</option>
                  <option value="MANUFACTURER">Garantia do Fabricante</option>
                  <option value="BILLABLE">Cobrável (Fora de Garantia)</option>
                  <option value="INSURANCE">Seguro / Evento Climático</option>
                  <option value="CONTRACT">Contratual</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  Causa Raiz Identificada *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ex: Troca de roteador pelo provedor"
                  value={triageForm.rootCause}
                  onChange={(e) => setTriageForm({ ...triageForm, rootCause: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.5rem',
                  marginTop: '1rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsTriageOpen(false)}
                  style={{
                    border: 'none',
                    background: '#f1f5f9',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    background: '#087443',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                  }}
                >
                  Confirmar Triagem
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: INTERAÇÃO */}
      {isInteractionOpen && selectedTicket && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              width: '90%',
              maxWidth: '480px',
              borderRadius: '8px',
              padding: '1.5rem',
            }}
          >
            <h3 style={{ margin: '0 0 1rem 0' }}>Registrar Interação / Orientação</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addInteractionMutation.mutate({
                  id: selectedTicket.id,
                });
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
            >
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Tipo de Interação</label>
                <select
                  value={interactionForm.kind}
                  onChange={(e) =>
                    setInteractionForm({
                      ...interactionForm,
                      kind: e.target.value as InteractionKind,
                    })
                  }
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                  }}
                >
                  <option value="REMOTE_GUIDANCE">Orientação Remota (Primeira Resposta)</option>
                  <option value="MESSAGE">Mensagem ao Cliente</option>
                  <option value="NOTE">Nota Interna</option>
                  <option value="EVIDENCE">Evidência / Foto</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  Mensagem / Orientação *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Descreva o procedimento orientado ao cliente..."
                  value={interactionForm.body}
                  onChange={(e) => setInteractionForm({ ...interactionForm, body: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.5rem',
                  marginTop: '1rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsInteractionOpen(false)}
                  style={{
                    border: 'none',
                    background: '#f1f5f9',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    background: '#087443',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                  }}
                >
                  Salvar Interação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ALTERAR STATUS */}
      {isStatusOpen && selectedTicket && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              width: '90%',
              maxWidth: '480px',
              borderRadius: '8px',
              padding: '1.5rem',
            }}
          >
            <h3 style={{ margin: '0 0 1rem 0' }}>Alterar Estado do Chamado</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateStatusMutation.mutate({
                  id: selectedTicket.id,
                });
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
            >
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Novo Status</label>
                <select
                  value={statusForm.status}
                  onChange={(e) =>
                    setStatusForm({ ...statusForm, status: e.target.value as TicketStatus })
                  }
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                  }}
                >
                  <option value="IN_TRIAGE">Em Triagem</option>
                  <option value="WAITING_CUSTOMER">Aguardando Cliente</option>
                  <option value="IN_PROGRESS">Em Atendimento</option>
                  <option value="RESOLVED">Resolvido</option>
                  <option value="CLOSED">Encerrado</option>
                  <option value="CANCELED">Cancelado</option>
                </select>
              </div>

              {(statusForm.status === 'RESOLVED' || statusForm.status === 'CLOSED') && (
                <>
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                      Resumo da Solução Técnica *
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Descreva a solução adotada..."
                      value={statusForm.resolutionSummary}
                      onChange={(e) =>
                        setStatusForm({ ...statusForm, resolutionSummary: e.target.value })
                      }
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                      Avaliação de Satisfação (1 a 5)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={statusForm.satisfactionRating}
                      onChange={(e) =>
                        setStatusForm({ ...statusForm, satisfactionRating: Number(e.target.value) })
                      }
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                      }}
                    />
                  </div>
                </>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.5rem',
                  marginTop: '1rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsStatusOpen(false)}
                  style={{
                    border: 'none',
                    background: '#f1f5f9',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    background: '#087443',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                  }}
                >
                  Atualizar Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVO ORÇAMENTO DE VISITA */}
      {isNewQuoteOpen && selectedTicket && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              width: '90%',
              maxWidth: '480px',
              borderRadius: '8px',
              padding: '1.5rem',
            }}
          >
            <h3 style={{ margin: '0 0 1rem 0' }}>Emitir Orçamento de Visita Técnica</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createQuoteMutation.mutate({
                  ticketId: selectedTicket.id,
                });
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Mão de Obra (R$) *</label>
                  <input
                    required
                    type="number"
                    min={0}
                    value={quoteForm.laborAmount}
                    onChange={(e) =>
                      setQuoteForm({ ...quoteForm, laborAmount: Number(e.target.value) })
                    }
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    Deslocamento (R$) *
                  </label>
                  <input
                    required
                    type="number"
                    min={0}
                    value={quoteForm.displacementAmount}
                    onChange={(e) =>
                      setQuoteForm({ ...quoteForm, displacementAmount: Number(e.target.value) })
                    }
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    Materiais Extras (R$)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={quoteForm.materialsAmount}
                    onChange={(e) =>
                      setQuoteForm({ ...quoteForm, materialsAmount: Number(e.target.value) })
                    }
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Desconto (R$)</label>
                  <input
                    type="number"
                    min={0}
                    value={quoteForm.discountAmount}
                    onChange={(e) =>
                      setQuoteForm({ ...quoteForm, discountAmount: Number(e.target.value) })
                    }
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: '#087443',
                }}
              >
                Total do Orçamento: R${' '}
                {(
                  quoteForm.laborAmount +
                  quoteForm.displacementAmount +
                  quoteForm.materialsAmount -
                  quoteForm.discountAmount
                ).toFixed(2)}
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Validade *</label>
                <input
                  required
                  type="date"
                  value={quoteForm.validUntil}
                  onChange={(e) => setQuoteForm({ ...quoteForm, validUntil: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.5rem',
                  marginTop: '1rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsNewQuoteOpen(false)}
                  style={{
                    border: 'none',
                    background: '#f1f5f9',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    background: '#087443',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                  }}
                >
                  Emitir Orçamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ACEITAR ORÇAMENTO */}
      {selectedQuoteToAccept && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              width: '90%',
              maxWidth: '480px',
              borderRadius: '8px',
              padding: '1.5rem',
            }}
          >
            <h3 style={{ margin: '0 0 0.5rem 0' }}>Aprovar e Aceitar Orçamento</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1rem 0' }}>
              O aceite deste orçamento provisionará automaticamente uma{' '}
              <strong>Ordem de Serviço (M8)</strong> para a equipe técnica e um{' '}
              <strong>Título a Receber (M6)</strong> no módulo financeiro.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                acceptQuoteMutation.mutate({
                  quoteId: selectedQuoteToAccept.id,
                });
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
            >
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  Nome do Responsável pelo Aceite *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ex: Carlos Mendes (Cliente)"
                  value={acceptForm.acceptedBy}
                  onChange={(e) => setAcceptForm({ ...acceptForm, acceptedBy: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Evidência do Aceite</label>
                <input
                  type="text"
                  placeholder="Ex: Mensagem formal via WhatsApp (11) 98765-4321"
                  value={acceptForm.acceptanceEvidence}
                  onChange={(e) =>
                    setAcceptForm({ ...acceptForm, acceptanceEvidence: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.5rem',
                  marginTop: '1rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedQuoteToAccept(null)}
                  style={{
                    border: 'none',
                    background: '#f1f5f9',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    background: '#087443',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                  }}
                >
                  Confirmar Aceite & Provisionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LANÇAR LEITURA */}
      {isNewReadingOpen && monitoringSystem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              width: '90%',
              maxWidth: '480px',
              borderRadius: '8px',
              padding: '1.5rem',
            }}
          >
            <h3 style={{ margin: '0 0 1rem 0' }}>Lançar Leitura de Geração Solar</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                recordReadingMutation.mutate({
                  systemId: monitoringSystem.id,
                });
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
            >
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  Competência (AAAA-MM) *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ex: 2026-09"
                  value={readingForm.period}
                  onChange={(e) => setReadingForm({ ...readingForm, period: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  Geração Esperada / Projetada (kWh) *
                </label>
                <input
                  required
                  type="number"
                  min={0}
                  value={readingForm.expectedGenerationKwh}
                  onChange={(e) =>
                    setReadingForm({
                      ...readingForm,
                      expectedGenerationKwh: Number(e.target.value),
                    })
                  }
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  Geração Real Apurada (kWh)
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="Deixar em branco se não houver telemetria"
                  value={readingForm.realizedGenerationKwh}
                  onChange={(e) =>
                    setReadingForm({ ...readingForm, realizedGenerationKwh: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                  }}
                />
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                  Nota SPEC-011: Ausência de telemetria não é zero. Deixar em branco preserva o
                  histórico sem distorcer o ratio.
                </p>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.5rem',
                  marginTop: '1rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsNewReadingOpen(false)}
                  style={{
                    border: 'none',
                    background: '#f1f5f9',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    background: '#087443',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                  }}
                >
                  Salvar Leitura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR INCIDENTE WI-FI */}
      {isNewIncidentOpen && monitoringSystem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              width: '90%',
              maxWidth: '480px',
              borderRadius: '8px',
              padding: '1.5rem',
            }}
          >
            <h3 style={{ margin: '0 0 1rem 0' }}>Registrar Desconexão / Queda Wi-Fi</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                recordIncidentMutation.mutate({
                  systemId: monitoringSystem.id,
                });
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
            >
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Causa Observada</label>
                <input
                  required
                  type="text"
                  value={incidentForm.reason}
                  onChange={(e) => setIncidentForm({ ...incidentForm, reason: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="netChanged"
                  checked={incidentForm.customerNetworkChanged}
                  onChange={(e) =>
                    setIncidentForm({ ...incidentForm, customerNetworkChanged: e.target.checked })
                  }
                />
                <label htmlFor="netChanged" style={{ fontSize: '0.85rem' }}>
                  Cliente alterou senha do Wi-Fi, roteador ou provedor
                </label>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.5rem',
                  marginTop: '1rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsNewIncidentOpen(false)}
                  style={{
                    border: 'none',
                    background: '#f1f5f9',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    background: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                  }}
                >
                  Registrar Incidente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESTAURAR INCIDENTE */}
      {selectedIncidentToRestore && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              width: '90%',
              maxWidth: '480px',
              borderRadius: '8px',
              padding: '1.5rem',
            }}
          >
            <h3 style={{ margin: '0 0 1rem 0' }}>Restabelecer Conexão Wi-Fi</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                restoreIncidentMutation.mutate({
                  incidentId: selectedIncidentToRestore.id,
                });
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
            >
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  Método / Procedimento de Resolução *
                </label>
                <textarea
                  required
                  rows={3}
                  value={restoreForm.resolutionMethod}
                  onChange={(e) =>
                    setRestoreForm({ ...restoreForm, resolutionMethod: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.5rem',
                  marginTop: '1rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedIncidentToRestore(null)}
                  style={{
                    border: 'none',
                    background: '#f1f5f9',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    background: '#087443',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                  }}
                >
                  Confirmar Restauração
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIGURAR MONITORAMENTO */}
      {isConfigMonitoringOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              width: '90%',
              maxWidth: '480px',
              borderRadius: '8px',
              padding: '1.5rem',
            }}
          >
            <h3 style={{ margin: '0 0 1rem 0' }}>Configurar Sistema de Monitoramento</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                configMonitoringMutation.mutate();
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
            >
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  Provedor / Plataforma *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ex: SolisCloud, Deye Cloud, Huawei FusionSolar"
                  value={monitoringForm.provider}
                  onChange={(e) =>
                    setMonitoringForm({ ...monitoringForm, provider: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  ID da Usina no Portal Externo
                </label>
                <input
                  type="text"
                  placeholder="Ex: PLANT-102938"
                  value={monitoringForm.externalPlantId}
                  onChange={(e) =>
                    setMonitoringForm({ ...monitoringForm, externalPlantId: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Tipo de Conexão</label>
                <select
                  value={monitoringForm.connectionType}
                  onChange={(e) =>
                    setMonitoringForm({
                      ...monitoringForm,
                      connectionType: e.target.value as ConnectionType,
                    })
                  }
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                  }}
                >
                  <option value="WIFI">Wi-Fi (Datalogger Residencial)</option>
                  <option value="ETHERNET">Ethernet (Cabo RJ45)</option>
                  <option value="4G">4G / Celular</option>
                  <option value="RS485">RS-485 / Modbus</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Modelo do Inversor</label>
                <input
                  type="text"
                  placeholder="Ex: Solis 10kW 3P"
                  value={monitoringForm.inverterModel}
                  onChange={(e) =>
                    setMonitoringForm({ ...monitoringForm, inverterModel: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.5rem',
                  marginTop: '1rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsConfigMonitoringOpen(false)}
                  style={{
                    border: 'none',
                    background: '#f1f5f9',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    background: '#087443',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                  }}
                >
                  Salvar Configuração
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVO TERMO DE GARANTIA */}
      {isNewWarrantyOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              width: '90%',
              maxWidth: '480px',
              borderRadius: '8px',
              padding: '1.5rem',
            }}
          >
            <h3 style={{ margin: '0 0 1rem 0' }}>Cadastrar Termo de Garantia</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createWarrantyMutation.mutate();
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Tipo de Garantia *</label>
                  <select
                    value={warrantyForm.kind}
                    onChange={(e) =>
                      setWarrantyForm({ ...warrantyForm, kind: e.target.value as WarrantyKind })
                    }
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                    }}
                  >
                    <option value="INSTALLATION">Instalação (Moura Solar)</option>
                    <option value="INVERTER">Inversor</option>
                    <option value="MODULE">Módulos Fotovoltaicos</option>
                    <option value="STRUCTURE">Estrutura de Fixação</option>
                    <option value="ELECTRICAL">Quadro Elétrico / DPS</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Tipo de Provedor *</label>
                  <select
                    value={warrantyForm.providerType}
                    onChange={(e) =>
                      setWarrantyForm({
                        ...warrantyForm,
                        providerType: e.target.value as WarrantyProviderType,
                      })
                    }
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                    }}
                  >
                    <option value="INSTALLER">Instalador (Moura Solar)</option>
                    <option value="MANUFACTURER">Fabricante</option>
                    <option value="DISTRIBUTOR">Distribuidor</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Nome do Provedor *</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: Solis Inverters / Moura Solar"
                  value={warrantyForm.providerName}
                  onChange={(e) =>
                    setWarrantyForm({ ...warrantyForm, providerName: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Modelo</label>
                  <input
                    type="text"
                    placeholder="Ex: Solis 10kW 3P"
                    value={warrantyForm.itemModel}
                    onChange={(e) =>
                      setWarrantyForm({ ...warrantyForm, itemModel: e.target.value })
                    }
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Número de Série</label>
                  <input
                    type="text"
                    placeholder="Ex: SOL-10K-998877"
                    value={warrantyForm.serialNumber}
                    onChange={(e) =>
                      setWarrantyForm({ ...warrantyForm, serialNumber: e.target.value })
                    }
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    Início da Vigência *
                  </label>
                  <input
                    required
                    type="date"
                    value={warrantyForm.startsAt}
                    onChange={(e) => setWarrantyForm({ ...warrantyForm, startsAt: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    Término da Vigência *
                  </label>
                  <input
                    required
                    type="date"
                    value={warrantyForm.endsAt}
                    onChange={(e) => setWarrantyForm({ ...warrantyForm, endsAt: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Termos e Condições</label>
                <textarea
                  rows={2}
                  value={warrantyForm.terms}
                  onChange={(e) => setWarrantyForm({ ...warrantyForm, terms: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.5rem',
                  marginTop: '1rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsNewWarrantyOpen(false)}
                  style={{
                    border: 'none',
                    background: '#f1f5f9',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    background: '#087443',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                  }}
                >
                  Salvar Garantia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ABRIR SINISTRO RMA */}
      {isNewClaimOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              width: '90%',
              maxWidth: '480px',
              borderRadius: '8px',
              padding: '1.5rem',
            }}
          >
            <h3 style={{ margin: '0 0 1rem 0' }}>Abrir Sinistro / Solicitação de RMA</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!tickets[0]) {
                  setFeedback({
                    message: 'Abra um chamado de suporte primeiro para vincular o sinistro.',
                    type: 'error',
                  });
                  return;
                }
                createClaimMutation.mutate({
                  ticketId: tickets[0].id,
                });
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
            >
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Descrição da Falha *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Descreva o defeito apresentado pelo equipamento..."
                  value={claimForm.failureDescription}
                  onChange={(e) =>
                    setClaimForm({ ...claimForm, failureDescription: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  Protocolo junto ao Fabricante
                </label>
                <input
                  type="text"
                  placeholder="Ex: SOLIS-BRA-2026-9911"
                  value={claimForm.protocolNumber}
                  onChange={(e) => setClaimForm({ ...claimForm, protocolNumber: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.5rem',
                  marginTop: '1rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsNewClaimOpen(false)}
                  style={{
                    border: 'none',
                    background: '#f1f5f9',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    background: '#087443',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                  }}
                >
                  Abrir Sinistro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
