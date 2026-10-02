'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, result } from '../identity/client';
import { Feedback } from '../identity/feedback';

export type ProjectOperationalState =
  | 'PREPARATION'
  | 'ENGINEERING'
  | 'HOMOLOGATION'
  | 'SUPPLY'
  | 'READY_TO_SCHEDULE'
  | 'SCHEDULED'
  | 'INSTALLING'
  | 'COMMISSIONING'
  | 'DELIVERY'
  | 'AFTER_SALES'
  | 'CLOSED'
  | 'SUSPENDED'
  | 'CANCELED';

export type HomologationStage =
  | 'PREPARING'
  | 'SUBMITTED'
  | 'PENDING_INFORMATION'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'METER_EXCHANGE_PENDING'
  | 'METER_EXCHANGED'
  | 'COMPLETED';

export type WorkOrderState =
  | 'DRAFT'
  | 'READY'
  | 'ASSIGNED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'PAUSED'
  | 'PARTIALLY_COMPLETED'
  | 'COMPLETED'
  | 'CANCELED';

export interface OperationalProjectView {
  id: string;
  code: string;
  title: string;
  state: ProjectOperationalState;
  nominalPowerKw?: number | string | null;
  estimatedMonthlyGenerationKwh?: number | string | null;
  artNumber?: string | null;
  notes?: string | null;
  createdAt: string;
  opportunity?: {
    id: string;
    code: string;
    title: string;
    state: string;
    customer?: { id: string; legalName: string; taxId?: string | null };
  };
  engineerUser?: { id: string; name: string; email: string } | null;
  homologation?: {
    id: string;
    distributor: string;
    protocolNumber?: string | null;
    stage: HomologationStage;
    submittedAt?: string | null;
    approvedAt?: string | null;
  } | null;
  executiveDesigns?: Array<{
    id: string;
    versionNumber: number;
    status: string;
  }>;
  workOrders?: Array<{
    id: string;
    code: string;
    state: string;
    scheduledDate?: string | null;
  }>;
  handover?: {
    id: string;
    clientName: string;
    generationVerifiedKw?: number | string | null;
    satisfactionRating?: number | null;
    handedOverAt: string;
  } | null;
}

export interface WorkOrderView {
  id: string;
  code: string;
  title: string;
  state: WorkOrderState;
  scheduledDate?: string | null;
  scheduledEndDate?: string | null;
  vehiclePlate?: string | null;
  pauseReason?: string | null;
  pauseNotes?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  project?: {
    id: string;
    code: string;
    title: string;
    opportunity?: {
      id: string;
      code: string;
      customer?: { id: string; legalName: string };
    };
  };
  assignedLeader?: { id: string; name: string; email: string } | null;
  checklistItems?: Array<{
    id: string;
    section: string;
    itemCode: string;
    title: string;
    responseType: string;
    status: string;
    measurementValue?: number | string | null;
    notes?: string | null;
    photoUrl?: string | null;
  }>;
}

export function EngineeringManagement() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    'projects' | 'workOrders' | 'homologation' | 'handover'
  >('projects');

  // Modals
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showDesignModal, setShowDesignModal] = useState(false);
  const [showWorkOrderModal, setShowWorkOrderModal] = useState(false);
  const [showHomologationModal, setShowHomologationModal] = useState(false);
  const [showHandoverModal, setShowHandoverModal] = useState(false);

  // Selected entities
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // Form states - Project
  const [prjOpportunityId, setPrjOpportunityId] = useState('');
  const [prjCode, setPrjCode] = useState('');
  const [prjTitle, setPrjTitle] = useState('');
  const [prjPower, setPrjPower] = useState(7.2);
  const [prjGeneration, setPrjGeneration] = useState(950);
  const [prjArt, setPrjArt] = useState('');
  const [prjNotes, setPrjNotes] = useState('');

  // Form states - Executive Design
  const [desStrings, setDesStrings] = useState(2);
  const [desModulesPerString, setDesModulesPerString] = useState(8);
  const [desMppts, setDesMppts] = useState(2);
  const [desTilt, setDesTilt] = useState(18);
  const [desAzimuth, setDesAzimuth] = useState(0);
  const [desCableGauge, setDesCableGauge] = useState(6);
  const [desDiagramUrl, setDesDiagramUrl] = useState('');
  const [desNotes, setDesNotes] = useState('');

  // Form states - Homologation
  const [homDistributor, setHomDistributor] = useState('CEMIG Distribuição S.A.');
  const [homProtocol, setHomProtocol] = useState('');
  const [homStage, setHomStage] = useState<HomologationStage>('SUBMITTED');
  const [homDeadline, setHomDeadline] = useState('');
  const [homNotes, setHomNotes] = useState('');

  // Form states - Work Order
  const [woCode, setWoCode] = useState('');
  const [woTitle, setWoTitle] = useState('Instalação Física e Montagem Elétrica');
  const [woDate, setWoDate] = useState('');
  const [woEndDate, setWoEndDate] = useState('');
  const [woVehicle, setWoVehicle] = useState('MOURA-01');

  // Form states - Handover
  const [hoClientName, setHoClientName] = useState('');
  const [hoClientDoc, setHoClientDoc] = useState('');
  const [hoGeneration, setHoGeneration] = useState(6.8);
  const [hoRating, setHoRating] = useState(5);
  const [hoNotes, setHoNotes] = useState('');

  // Queries
  const projectsQuery = useQuery({
    queryKey: ['engineering-projects'],
    queryFn: async () => {
      const res = await result(api.GET('/api/v1/engineering/projects'));
      return res as unknown as OperationalProjectView[];
    },
  });

  const workOrdersQuery = useQuery({
    queryKey: ['engineering-work-orders'],
    queryFn: async () => {
      const res = await result(api.GET('/api/v1/engineering/work-orders'));
      return res as unknown as WorkOrderView[];
    },
  });

  const opportunitiesQuery = useQuery({
    queryKey: ['opportunities-commercial'],
    queryFn: async () => {
      const res = await result(api.GET('/api/v1/opportunities'));
      return (
        (
          res as unknown as {
            items: Array<{ id: string; code: string; title: string; state: string }>;
          }
        ).items || []
      );
    },
  });

  // Mutations
  const createProjectMutation = useMutation({
    mutationFn: () =>
      result(
        api.POST('/api/v1/engineering/projects', {
          body: {
            opportunityId: prjOpportunityId,
            code: prjCode.trim().toUpperCase(),
            title: prjTitle.trim(),
            nominalPowerKw: Number(prjPower),
            estimatedMonthlyGenerationKwh: Number(prjGeneration),
            artNumber: prjArt || undefined,
            notes: prjNotes || undefined,
          },
        }),
      ),
    onSuccess: () => {
      setShowProjectModal(false);
      setPrjCode('');
      setPrjTitle('');
      setPrjNotes('');
      queryClient.invalidateQueries({ queryKey: ['engineering-projects'] });
    },
  });

  const createDesignMutation = useMutation({
    mutationFn: () =>
      result(
        api.POST('/api/v1/engineering/projects/{id}/designs', {
          params: { path: { id: selectedProjectId } },
          body: {
            stringsCount: Number(desStrings),
            modulesPerString: Number(desModulesPerString),
            mpptCount: Number(desMppts),
            tiltDegrees: Number(desTilt),
            azimuthDegrees: Number(desAzimuth),
            cableGaugeMm: Number(desCableGauge),
            diagramUrl: desDiagramUrl || undefined,
            notes: desNotes || undefined,
          },
        }),
      ),
    onSuccess: () => {
      setShowDesignModal(false);
      setDesNotes('');
      queryClient.invalidateQueries({ queryKey: ['engineering-projects'] });
    },
  });

  const approveDesignMutation = useMutation({
    mutationFn: ({ projectId, designId }: { projectId: string; designId: string }) =>
      result(
        api.POST('/api/v1/engineering/projects/{id}/designs/{designId}/approve', {
          params: { path: { id: projectId, designId } },
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engineering-projects'] });
    },
  });

  const updateHomologationMutation = useMutation({
    mutationFn: () =>
      result(
        api.PUT('/api/v1/engineering/projects/{id}/homologation', {
          params: { path: { id: selectedProjectId } },
          body: {
            distributor: homDistributor,
            protocolNumber: homProtocol || undefined,
            stage: homStage,
            deadlineAt: homDeadline || undefined,
            notes: homNotes || undefined,
          },
        }),
      ),
    onSuccess: () => {
      setShowHomologationModal(false);
      setHomDeadline('');
      queryClient.invalidateQueries({ queryKey: ['engineering-projects'] });
    },
  });

  const createWorkOrderMutation = useMutation({
    mutationFn: () =>
      result(
        api.POST('/api/v1/engineering/projects/{id}/work-orders', {
          params: { path: { id: selectedProjectId } },
          body: {
            code: woCode.trim().toUpperCase(),
            title: woTitle.trim(),
            scheduledDate: woDate || undefined,
            scheduledEndDate: woEndDate || undefined,
            vehiclePlate: woVehicle || undefined,
          },
        }),
      ),
    onSuccess: () => {
      setShowWorkOrderModal(false);
      setWoCode('');
      queryClient.invalidateQueries({ queryKey: ['engineering-work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['engineering-projects'] });
    },
  });

  const updateWorkOrderStateMutation = useMutation({
    mutationFn: ({ id, state }: { id: string; state: WorkOrderState }) =>
      result(
        api.PATCH('/api/v1/engineering/work-orders/{id}/state', {
          params: { path: { id } },
          body: { state },
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engineering-work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['engineering-projects'] });
    },
  });

  const updateChecklistItemMutation = useMutation({
    mutationFn: ({
      id,
      status,
      val,
    }: {
      id: string;
      status: 'OK' | 'NOK' | 'NOT_APPLICABLE';
      val?: number;
    }) =>
      result(
        api.PATCH('/api/v1/engineering/checklist-items/{id}', {
          params: { path: { id } },
          body: { status, measurementValue: val },
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engineering-work-orders'] });
    },
  });

  const recordHandoverMutation = useMutation({
    mutationFn: () =>
      result(
        api.POST('/api/v1/engineering/projects/{id}/handover', {
          params: { path: { id: selectedProjectId } },
          body: {
            clientName: hoClientName.trim(),
            clientDocument: hoClientDoc || undefined,
            generationVerifiedKw: Number(hoGeneration),
            satisfactionRating: Number(hoRating),
            notes: hoNotes || undefined,
          },
        }),
      ),
    onSuccess: () => {
      setShowHandoverModal(false);
      queryClient.invalidateQueries({ queryKey: ['engineering-projects'] });
    },
  });

  // KPIs
  const totalProjects = (projectsQuery.data || []).length;
  const inHomologation = (projectsQuery.data || []).filter(
    (p) => p.state === 'HOMOLOGATION' || p.homologation?.stage === 'SUBMITTED',
  ).length;
  const inField = (workOrdersQuery.data || []).filter((w) => w.state === 'IN_PROGRESS').length;
  const delivered = (projectsQuery.data || []).filter(
    (p) => p.state === 'DELIVERY' || p.state === 'AFTER_SALES' || p.handover,
  ).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#102a23' }}>
            Engenharia, Homologação e Obras
          </h2>
          <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.875rem' }}>
            Projetos executivos, parecer de acesso na concessionária, ordens de serviço de campo e
            termo de entrega.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowProjectModal(true)}
            style={{
              background: '#087443',
              color: '#ffffff',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            + Novo Projeto Operacional
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
            Projetos Ativos
          </div>
          <div
            style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginTop: '0.25rem' }}
          >
            {totalProjects}
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
            Em Homologação
          </div>
          <div
            style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0284c7', marginTop: '0.25rem' }}
          >
            {inHomologation}
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
            Instalações em Andamento
          </div>
          <div
            style={{ fontSize: '1.5rem', fontWeight: 700, color: '#b45309', marginTop: '0.25rem' }}
          >
            {inField}
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
            Usinas Entregues
          </div>
          <div
            style={{ fontSize: '1.5rem', fontWeight: 700, color: '#15803d', marginTop: '0.25rem' }}
          >
            {delivered}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '0.5rem',
        }}
      >
        {[
          { id: 'projects' as const, label: 'Projetos Operacionais' },
          { id: 'workOrders' as const, label: 'Ordens de Serviço & Campo' },
          { id: 'homologation' as const, label: 'Homologação & Concessionária' },
          { id: 'handover' as const, label: 'Entrega & Termo de Aceite' },
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

      {/* TAB 1: PROJETOS OPERACIONAIS */}
      {activeTab === 'projects' && (
        <div className="table-wrapper" style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr
                style={{
                  background: '#f8fafc',
                  borderBottom: '2px solid #e2e8f0',
                  textAlign: 'left',
                }}
              >
                <th style={{ padding: '0.75rem' }}>Código</th>
                <th style={{ padding: '0.75rem' }}>Projeto / Cliente</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Potência (kWp)</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Geração Mensal</th>
                <th style={{ padding: '0.75rem' }}>ART</th>
                <th style={{ padding: '0.75rem' }}>Fase</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {(projectsQuery.data || []).length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}
                  >
                    Nenhum projeto operacional cadastrado.
                  </td>
                </tr>
              ) : (
                (projectsQuery.data || []).map((prj) => (
                  <tr key={prj.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 600 }}>{prj.code}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <strong>{prj.title}</strong>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        Cliente: {prj.opportunity?.customer?.legalName || '-'}
                      </div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          marginTop: '0.35rem',
                          display: 'flex',
                          gap: '0.35rem',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                        }}
                      >
                        <span style={{ color: '#475569', fontWeight: 600 }}>
                          Projetos Executivos:
                        </span>
                        {!prj.executiveDesigns || prj.executiveDesigns.length === 0 ? (
                          <span style={{ color: '#dc2626' }}>Nenhum (Bloqueia OS)</span>
                        ) : (
                          prj.executiveDesigns.map((d) => (
                            <span
                              key={d.id}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                padding: '0.1rem 0.4rem',
                                borderRadius: '4px',
                                background: d.status === 'APPROVED' ? '#dcfce7' : '#fef3c7',
                                color: d.status === 'APPROVED' ? '#15803d' : '#b45309',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                              }}
                            >
                              v{d.versionNumber} ({d.status})
                              {d.status !== 'APPROVED' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    approveDesignMutation.mutate({
                                      projectId: prj.id,
                                      designId: d.id,
                                    })
                                  }
                                  disabled={approveDesignMutation.isPending}
                                  style={{
                                    marginLeft: '0.25rem',
                                    background: '#087443',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '3px',
                                    padding: '0.1rem 0.35rem',
                                    fontSize: '0.65rem',
                                    cursor: 'pointer',
                                  }}
                                  title="Aprovar Projeto Executivo (Libera agendamento de OS)"
                                >
                                  Aprovar
                                </button>
                              )}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>
                      {Number(prj.nominalPowerKw || 0).toFixed(2)} kWp
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      {Number(prj.estimatedMonthlyGenerationKwh || 0).toFixed(0)} kWh
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#475569' }}>
                      {prj.artNumber || 'Pendente'}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span
                        style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background:
                            prj.state === 'DELIVERY' || prj.state === 'AFTER_SALES'
                              ? '#dcfce7'
                              : prj.state === 'INSTALLING'
                                ? '#fef3c7'
                                : '#f1f5f9',
                          color:
                            prj.state === 'DELIVERY' || prj.state === 'AFTER_SALES'
                              ? '#15803d'
                              : prj.state === 'INSTALLING'
                                ? '#b45309'
                                : '#475569',
                        }}
                      >
                        {prj.state}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                        <button
                          onClick={() => {
                            setSelectedProjectId(prj.id);
                            setShowDesignModal(true);
                          }}
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            padding: '0.3rem 0.6rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                          }}
                        >
                          + Proj. Executivo
                        </button>
                        <button
                          onClick={() => {
                            setSelectedProjectId(prj.id);
                            setWoCode(`OS-${prj.code}`);
                            setShowWorkOrderModal(true);
                          }}
                          style={{
                            background: '#087443',
                            color: '#ffffff',
                            border: 'none',
                            padding: '0.3rem 0.6rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                          }}
                        >
                          Agendar OS
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: ORDENS DE SERVIÇO & CAMPO */}
      {activeTab === 'workOrders' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {(workOrdersQuery.data || []).length === 0 ? (
            <div
              style={{
                padding: '2rem',
                textAlign: 'center',
                color: '#64748b',
                background: '#f8fafc',
                borderRadius: '8px',
              }}
            >
              Nenhuma ordem de serviço de campo cadastrada.
            </div>
          ) : (
            (workOrdersQuery.data || []).map((wo) => (
              <div
                key={wo.id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                        {wo.code}
                      </span>
                      <span
                        style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background:
                            wo.state === 'COMPLETED'
                              ? '#dcfce7'
                              : wo.state === 'IN_PROGRESS'
                                ? '#fef3c7'
                                : '#f1f5f9',
                          color:
                            wo.state === 'COMPLETED'
                              ? '#15803d'
                              : wo.state === 'IN_PROGRESS'
                                ? '#b45309'
                                : '#475569',
                        }}
                      >
                        {wo.state}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#334155', marginTop: '0.25rem' }}>
                      <strong>{wo.title}</strong> — Projeto: {wo.project?.code} (
                      {wo.project?.opportunity?.customer?.legalName})
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
                      Data Agendada:{' '}
                      {wo.scheduledDate
                        ? new Date(wo.scheduledDate).toLocaleDateString('pt-BR')
                        : 'A definir'}{' '}
                      | Veículo: {wo.vehiclePlate || 'Não informado'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {wo.state === 'READY' && (
                      <button
                        onClick={() =>
                          updateWorkOrderStateMutation.mutate({ id: wo.id, state: 'IN_PROGRESS' })
                        }
                        style={{
                          background: '#087443',
                          color: '#ffffff',
                          border: 'none',
                          padding: '0.4rem 0.8rem',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Iniciar Instalação
                      </button>
                    )}
                    {wo.state === 'IN_PROGRESS' && (
                      <>
                        <button
                          onClick={() =>
                            updateWorkOrderStateMutation.mutate({ id: wo.id, state: 'PAUSED' })
                          }
                          style={{
                            background: '#fef3c7',
                            color: '#b45309',
                            border: '1px solid #fde68a',
                            padding: '0.4rem 0.8rem',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Pausar
                        </button>
                        <button
                          onClick={() =>
                            updateWorkOrderStateMutation.mutate({ id: wo.id, state: 'COMPLETED' })
                          }
                          style={{
                            background: '#15803d',
                            color: '#ffffff',
                            border: 'none',
                            padding: '0.4rem 0.8rem',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Concluir Obra
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Checklist de Campo */}
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
                  <div
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: '#475569',
                      marginBottom: '0.5rem',
                    }}
                  >
                    Checklist de Execução & Comissionamento:
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: '0.5rem',
                    }}
                  >
                    {wo.checklistItems?.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          background: item.status === 'OK' ? '#f0fdf4' : '#f8fafc',
                          border: `1px solid ${item.status === 'OK' ? '#bbf7d0' : '#e2e8f0'}`,
                          padding: '0.6rem',
                          borderRadius: '6px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.25rem',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                          }}
                        >
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e293b' }}>
                            [{item.itemCode}] {item.title}
                          </span>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              color: item.status === 'OK' ? '#15803d' : '#64748b',
                            }}
                          >
                            {item.status}
                          </span>
                        </div>
                        {item.responseType === 'MEASUREMENT' && (
                          <div style={{ fontSize: '0.75rem', color: '#0369a1' }}>
                            Valor medido:{' '}
                            {item.measurementValue ? `${item.measurementValue} V` : 'Não aferido'}
                          </div>
                        )}
                        {item.status !== 'OK' && (
                          <button
                            onClick={() =>
                              updateChecklistItemMutation.mutate({
                                id: item.id,
                                status: 'OK',
                                val: item.responseType === 'MEASUREMENT' ? 450.5 : undefined,
                              })
                            }
                            style={{
                              marginTop: '0.25rem',
                              background: '#ffffff',
                              border: '1px solid #cbd5e1',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              alignSelf: 'flex-start',
                            }}
                          >
                            Validar / Marcar OK
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: HOMOLOGAÇÃO */}
      {activeTab === 'homologation' && (
        <div className="table-wrapper" style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr
                style={{
                  background: '#f8fafc',
                  borderBottom: '2px solid #e2e8f0',
                  textAlign: 'left',
                }}
              >
                <th style={{ padding: '0.75rem' }}>Projeto</th>
                <th style={{ padding: '0.75rem' }}>Distribuidora</th>
                <th style={{ padding: '0.75rem' }}>Protocolo</th>
                <th style={{ padding: '0.75rem' }}>Etapa</th>
                <th style={{ padding: '0.75rem' }}>Aprovado em</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {(projectsQuery.data || []).map((prj) => (
                <tr key={prj.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 600 }}>
                    {prj.code} - {prj.title}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    {prj.homologation?.distributor || 'Não configurada'}
                  </td>
                  <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>
                    {prj.homologation?.protocolNumber || 'Pendente'}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span
                      style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: prj.homologation?.stage === 'APPROVED' ? '#dcfce7' : '#f1f5f9',
                        color: prj.homologation?.stage === 'APPROVED' ? '#15803d' : '#475569',
                      }}
                    >
                      {prj.homologation?.stage || 'PREPARING'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
                    {prj.homologation?.approvedAt
                      ? new Date(prj.homologation.approvedAt).toLocaleDateString('pt-BR')
                      : '-'}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                    <button
                      onClick={() => {
                        setSelectedProjectId(prj.id);
                        setHomDistributor(
                          prj.homologation?.distributor || 'CEMIG Distribuição S.A.',
                        );
                        setHomProtocol(prj.homologation?.protocolNumber || '');
                        setShowHomologationModal(true);
                      }}
                      style={{
                        background: '#087443',
                        color: '#ffffff',
                        border: 'none',
                        padding: '0.3rem 0.6rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                      }}
                    >
                      Atualizar Concessionária
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: ENTREGA & TERMO DE ACEITE */}
      {activeTab === 'handover' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {(projectsQuery.data || []).map((prj) => (
            <div
              key={prj.id}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#0f172a' }}>
                  {prj.code} — {prj.title}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '0.25rem' }}>
                  Cliente: <strong>{prj.opportunity?.customer?.legalName}</strong> | Potência:{' '}
                  {Number(prj.nominalPowerKw)} kWp
                </div>
                {prj.handover ? (
                  <div
                    style={{
                      marginTop: '0.5rem',
                      display: 'flex',
                      gap: '1rem',
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{
                        background: '#dcfce7',
                        color: '#15803d',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}
                    >
                      TERMO DE ENTREGA ASSINADO
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      Recebido por: {prj.handover.clientName} em{' '}
                      {new Date(prj.handover.handedOverAt).toLocaleDateString('pt-BR')} (Geração:{' '}
                      {Number(prj.handover.generationVerifiedKw)} kW)
                    </span>
                  </div>
                ) : (
                  <div style={{ marginTop: '0.5rem', color: '#b45309', fontSize: '0.8rem' }}>
                    Aguardando termo de entrega e conferência final com o cliente.
                  </div>
                )}
              </div>

              {!prj.handover && (
                <button
                  onClick={() => {
                    setSelectedProjectId(prj.id);
                    setHoClientName(prj.opportunity?.customer?.legalName || '');
                    setShowHandoverModal(true);
                  }}
                  style={{
                    background: '#087443',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Registrar Aceite do Cliente
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* MODAL: NOVO PROJETO OPERACIONAL */}
      {showProjectModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 100,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              padding: '1.5rem',
              borderRadius: '8px',
              maxWidth: '500px',
              width: '90%',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>
                Novo Projeto Operacional
              </h3>
              <button
                type="button"
                onClick={() => setShowProjectModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Oportunidade Comercial</label>
              <select
                value={prjOpportunityId}
                onChange={(e) => {
                  setPrjOpportunityId(e.target.value);
                  const sel = (opportunitiesQuery.data || []).find((o) => o.id === e.target.value);
                  if (sel) {
                    setPrjCode(`PRJ-${sel.code}`);
                    setPrjTitle(`Execução ${sel.title}`);
                  }
                }}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              >
                <option value="">Selecione uma oportunidade</option>
                {(opportunitiesQuery.data || []).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.code} - {o.title} ({o.state})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Código</label>
                <input
                  type="text"
                  value={prjCode}
                  onChange={(e) => setPrjCode(e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Título do Projeto</label>
                <input
                  type="text"
                  value={prjTitle}
                  onChange={(e) => setPrjTitle(e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Potência (kWp)</label>
                <input
                  type="number"
                  step="0.1"
                  value={prjPower}
                  onChange={(e) => setPrjPower(Number(e.target.value))}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Geração Mensal (kWh)</label>
                <input
                  type="number"
                  value={prjGeneration}
                  onChange={(e) => setPrjGeneration(Number(e.target.value))}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                Número da ART (CREA/CFT)
              </label>
              <input
                type="text"
                placeholder="ART-2026-0001"
                value={prjArt}
                onChange={(e) => setPrjArt(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Observações do Projeto</label>
              <textarea
                rows={2}
                placeholder="Particularidades do local, acesso ao telhado..."
                value={prjNotes}
                onChange={(e) => setPrjNotes(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <Feedback error={createProjectMutation.error} />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setShowProjectModal(false)}
                style={{
                  background: '#ffffff',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => createProjectMutation.mutate()}
                disabled={!prjOpportunityId || !prjCode || createProjectMutation.isPending}
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
                {createProjectMutation.isPending ? 'Salvando...' : 'Criar Projeto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOVO PROJETO EXECUTIVO */}
      {showDesignModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 100,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              padding: '1.5rem',
              borderRadius: '8px',
              maxWidth: '500px',
              width: '90%',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>
                Novo Projeto Executivo (Engenharia)
              </h3>
              <button
                type="button"
                onClick={() => setShowDesignModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Nº Strings</label>
                <input
                  type="number"
                  value={desStrings}
                  onChange={(e) => setDesStrings(Number(e.target.value))}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Módulos/String</label>
                <input
                  type="number"
                  value={desModulesPerString}
                  onChange={(e) => setDesModulesPerString(Number(e.target.value))}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Nº MPPTs</label>
                <input
                  type="number"
                  value={desMppts}
                  onChange={(e) => setDesMppts(Number(e.target.value))}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Inclinação (°)</label>
                <input
                  type="number"
                  value={desTilt}
                  onChange={(e) => setDesTilt(Number(e.target.value))}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Azimute (°)</label>
                <input
                  type="number"
                  value={desAzimuth}
                  onChange={(e) => setDesAzimuth(Number(e.target.value))}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Cabo CC (mm²)</label>
                <input
                  type="number"
                  value={desCableGauge}
                  onChange={(e) => setDesCableGauge(Number(e.target.value))}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                URL do Diagrama Unifilar / Memorial
              </label>
              <input
                type="text"
                placeholder="https://..."
                value={desDiagramUrl}
                onChange={(e) => setDesDiagramUrl(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                Observações do Dimensionamento
              </label>
              <textarea
                rows={2}
                placeholder="Detalhes dos inversores, proteções elétricas..."
                value={desNotes}
                onChange={(e) => setDesNotes(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <Feedback error={createDesignMutation.error} />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setShowDesignModal(false)}
                style={{
                  background: '#ffffff',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => createDesignMutation.mutate()}
                disabled={createDesignMutation.isPending}
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
                {createDesignMutation.isPending ? 'Salvando...' : 'Salvar Versão Executiva'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOVA ORDEM DE SERVIÇO */}
      {showWorkOrderModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 100,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              padding: '1.5rem',
              borderRadius: '8px',
              maxWidth: '480px',
              width: '90%',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>
                Agendar Ordem de Serviço
              </h3>
              <button
                type="button"
                onClick={() => setShowWorkOrderModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Código OS</label>
                <input
                  type="text"
                  value={woCode}
                  onChange={(e) => setWoCode(e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Veículo / Placa</label>
                <input
                  type="text"
                  value={woVehicle}
                  onChange={(e) => setWoVehicle(e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Título / Escopo</label>
              <input
                type="text"
                value={woTitle}
                onChange={(e) => setWoTitle(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Data Início</label>
                <input
                  type="date"
                  value={woDate}
                  onChange={(e) => setWoDate(e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Previsão Término</label>
                <input
                  type="date"
                  value={woEndDate}
                  onChange={(e) => setWoEndDate(e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>

            <Feedback error={createWorkOrderMutation.error} />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setShowWorkOrderModal(false)}
                style={{
                  background: '#ffffff',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => createWorkOrderMutation.mutate()}
                disabled={!woCode || createWorkOrderMutation.isPending}
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
                {createWorkOrderMutation.isPending ? 'Confirmando...' : 'Confirmar Agendamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: HOMOLOGAÇÃO */}
      {showHomologationModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 100,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              padding: '1.5rem',
              borderRadius: '8px',
              maxWidth: '480px',
              width: '90%',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>
                Atualizar Parecer da Concessionária
              </h3>
              <button
                type="button"
                onClick={() => setShowHomologationModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                Distribuidora de Energia
              </label>
              <input
                type="text"
                value={homDistributor}
                onChange={(e) => setHomDistributor(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Nº Protocolo</label>
                <input
                  type="text"
                  placeholder="PROT-2026-99"
                  value={homProtocol}
                  onChange={(e) => setHomProtocol(e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Etapa / Situação</label>
                <select
                  value={homStage}
                  onChange={(e) => setHomStage(e.target.value as HomologationStage)}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                >
                  <option value="PREPARING">Preparando Documentos</option>
                  <option value="SUBMITTED">Protocolado / Submetido</option>
                  <option value="UNDER_REVIEW">Em Análise Técnica</option>
                  <option value="PENDING_INFORMATION">Pendência / Exigência</option>
                  <option value="APPROVED">Parecer de Acesso Aprovado</option>
                  <option value="METER_EXCHANGE_PENDING">Aguardando Troca de Medidor</option>
                  <option value="METER_EXCHANGED">Medidor Trocado (Concluído)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                Prazo Limite da Concessionária
              </label>
              <input
                type="date"
                value={homDeadline}
                onChange={(e) => setHomDeadline(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Observações / Despacho</label>
              <textarea
                rows={2}
                value={homNotes}
                onChange={(e) => setHomNotes(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <Feedback error={updateHomologationMutation.error} />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setShowHomologationModal(false)}
                style={{
                  background: '#ffffff',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => updateHomologationMutation.mutate()}
                disabled={updateHomologationMutation.isPending}
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
                {updateHomologationMutation.isPending ? 'Salvando...' : 'Gravar Homologação'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TERMO DE ENTREGA & ACEITE */}
      {showHandoverModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 100,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              padding: '1.5rem',
              borderRadius: '8px',
              maxWidth: '480px',
              width: '90%',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>
                Termo de Entrega & Aceite da Usina
              </h3>
              <button
                type="button"
                onClick={() => setShowHandoverModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  Nome do Responsável Presente
                </label>
                <input
                  type="text"
                  value={hoClientName}
                  onChange={(e) => setHoClientName(e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>CPF / Documento</label>
                <input
                  type="text"
                  value={hoClientDoc}
                  onChange={(e) => setHoClientDoc(e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Geração Aferida (kW)</label>
                <input
                  type="number"
                  step="0.1"
                  value={hoGeneration}
                  onChange={(e) => setHoGeneration(Number(e.target.value))}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  Nota de Satisfação (1-5)
                </label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={hoRating}
                  onChange={(e) => setHoRating(Number(e.target.value))}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                Orientações e Declaração
              </label>
              <textarea
                rows={2}
                placeholder="Cliente instruído sobre desligamento de emergência e monitoramento."
                value={hoNotes}
                onChange={(e) => setHoNotes(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div
              style={{
                background: '#f8fafc',
                padding: '0.75rem',
                borderRadius: '6px',
                border: '1px dashed #cbd5e1',
                textAlign: 'center',
                fontSize: '0.8rem',
                color: '#475569',
              }}
            >
              Assinatura digital por toque confirmada no ato da entrega técnica.
            </div>

            <Feedback error={recordHandoverMutation.error} />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setShowHandoverModal(false)}
                style={{
                  background: '#ffffff',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => recordHandoverMutation.mutate()}
                disabled={!hoClientName || recordHandoverMutation.isPending}
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
                {recordHandoverMutation.isPending ? 'Registrando...' : 'Confirmar Entrega'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
