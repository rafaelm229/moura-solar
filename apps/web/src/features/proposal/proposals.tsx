'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, result, allows } from '../identity/client';
import { Feedback } from '../identity/feedback';
import { Button } from '../../ui/Button';
import type { Schemas } from '@moura-solar/api-client';

export interface ProposalDocumentView {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  contentHash: string;
  generationStatus: string;
}

export interface ProposalDeliveryView {
  id: string;
  channel: string;
  recipient: string;
  status: string;
  sentAt: string;
  notes?: string | null;
}

export interface ProposalAcceptanceView {
  id: string;
  method: string;
  acceptedByName: string;
  acceptedAt: string;
  notes?: string | null;
}

export interface ProposalVersionView {
  id: string;
  proposalId: string;
  versionNumber: number;
  status: 'DRAFT' | 'READY' | 'SENT' | 'VIEWED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  systemPowerKwp?: number | string;
  estimatedMonthlyGenerationKwh?: number | string;
  totalInvestmentAmount?: number | string;
  finalAmount?: number | string;
  finalPrice?: number | string;
  technicalSnapshot?: {
    dcPowerKwp?: number | string;
    estimatedMonthlyGenerationKwh?: number | string;
  } | null;
  validityDays: number;
  validUntil?: string | null;
  paymentConditions?: Record<string, unknown> | null;
  observations?: string | null;
  rejectionReason?: string | null;
  documents?: ProposalDocumentView[];
  deliveries?: ProposalDeliveryView[];
  acceptance?: ProposalAcceptanceView | null;
  createdAt: string;
}

export interface ProposalView {
  id: string;
  organizationId: string;
  opportunityId: string;
  code: string;
  status: string;
  acceptedVersionId?: string | null;
  versions?: ProposalVersionView[];
  createdAt: string;
  updatedAt: string;
}

type Design = Schemas['DesignViewDto'];

interface ProposalsProps {
  opportunityId: string;
  opportunityTitle?: string;
  opportunityState?: string;
  onOpportunityUpdated?: () => void;
  readonly?: boolean;
}

export function Proposals({
  opportunityId,
  opportunityTitle,
  opportunityState,
  onOpportunityUpdated,
  readonly = false,
}: ProposalsProps) {
  const queryClient = useQueryClient();

  // Creation form state
  const [isCreating, setIsCreating] = useState(false);
  const [selectedDesignVersionId, setSelectedDesignVersionId] = useState('');
  const [validityDays, setValidityDays] = useState(10);
  const [paymentConditionsText, setPaymentConditionsText] = useState(
    'À vista com 5% de desconto especial ou Financiamento Bancário Solar em até 84 parcelas.',
  );
  const [observations, setObservations] = useState('');

  // Delivery Modal/Inline state
  const [deliveryVersionId, setDeliveryVersionId] = useState<string | null>(null);
  const [deliveryChannel, setDeliveryChannel] = useState<
    'WHATSAPP' | 'EMAIL' | 'IN_PERSON' | 'MANUAL'
  >('WHATSAPP');
  const [deliveryRecipient, setDeliveryRecipient] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  // Acceptance Modal/Inline state
  const [acceptVersionId, setAcceptVersionId] = useState<string | null>(null);
  const [acceptMethod, setAcceptMethod] = useState<
    'SIGNED_DOCUMENT' | 'MESSAGE' | 'IN_PERSON' | 'E_SIGNATURE'
  >('MESSAGE');
  const [acceptedByName, setAcceptedByName] = useState('');
  const [acceptNotes, setAcceptNotes] = useState('');

  // Rejection Modal/Inline state
  const [rejectVersionId, setRejectVersionId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('PRECO_ALTO');
  const [rejectNotes, setRejectNotes] = useState('');

  // Next Version Modal/Inline state
  const [newVersionParentId, setNewVersionParentId] = useState<string | null>(null);

  // Downloading state
  const [downloadingVersionId, setDownloadingVersionId] = useState<string | null>(null);

  // Queries
  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => result(api.GET('/api/v1/identity/me')),
  });
  const canCreate = me.data
    ? allows(me.data, 'proposals:create', false) || me.data.roleName === 'Administrador'
    : true;
  const canSend = me.data
    ? allows(me.data, 'proposals:send', false) || me.data.roleName === 'Administrador'
    : true;
  const canAccept = me.data
    ? allows(me.data, 'proposals:accept', false) || me.data.roleName === 'Administrador'
    : true;
  const canReject = me.data
    ? allows(me.data, 'proposals:reject', false) || me.data.roleName === 'Administrador'
    : true;

  const proposalsQuery = useQuery({
    queryKey: ['proposals', opportunityId],
    queryFn: () =>
      result(
        api.GET('/api/v1/opportunities/{opportunityId}/proposals', {
          params: { path: { opportunityId } },
        }),
      ),
  });

  const designsQuery = useQuery({
    queryKey: ['designs', opportunityId],
    queryFn: () =>
      result(
        api.GET('/api/v1/opportunities/{id}/designs', {
          params: { path: { id: opportunityId } },
        }),
      ),
  });

  // Extract approved design versions
  const designs = (designsQuery.data ?? []) as Design[];
  const approvedVersions: Array<{
    designId: string;
    designName: string;
    versionId: string;
    versionNumber: number;
    peakPowerKwp: number;
    estimatedGenerationKwh: number;
    finalPrice: number;
    approvedAt?: string;
  }> = [];

  for (const d of designs) {
    for (const v of d.versions ?? []) {
      if (v.status === 'APPROVED') {
        approvedVersions.push({
          designId: d.id,
          designName: d.name,
          versionId: v.id,
          versionNumber: v.versionNumber,
          peakPowerKwp: Number(v.dcPowerKwp ?? 0),
          estimatedGenerationKwh: Number(v.estimatedMonthlyGenerationKwh ?? 0),
          finalPrice: Number(v.pricing?.finalPrice ?? 0),
          approvedAt: v.approvedAt ?? undefined,
        });
      }
    }
  }

  // Mutations
  const createProposalMutation = useMutation({
    mutationFn: async () => {
      return result(
        api.POST('/api/v1/proposals', {
          body: {
            opportunityId,
            designVersionId: selectedDesignVersionId,
            validityDays: Number(validityDays),
            paymentConditions: { summary: paymentConditionsText } as unknown as Record<
              string,
              never
            >,
            observations: observations || undefined,
          },
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals', opportunityId] });
      setIsCreating(false);
      setSelectedDesignVersionId('');
      setObservations('');
    },
  });

  const deliverMutation = useMutation({
    mutationFn: async (versionId: string) => {
      return result(
        api.POST('/api/v1/proposal-versions/{id}/deliveries', {
          params: { path: { id: versionId } },
          body: {
            channel: deliveryChannel,
            recipient: deliveryRecipient,
            notes: deliveryNotes || undefined,
          },
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals', opportunityId] });
      setDeliveryVersionId(null);
      setDeliveryRecipient('');
      setDeliveryNotes('');
      onOpportunityUpdated?.();
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async (versionId: string) => {
      return result(
        api.POST('/api/v1/proposal-versions/{id}/accept', {
          params: { path: { id: versionId } },
          body: {
            method: acceptMethod,
            acceptedByName,
            notes: acceptNotes || undefined,
          },
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals', opportunityId] });
      setAcceptVersionId(null);
      setAcceptedByName('');
      setAcceptNotes('');
      onOpportunityUpdated?.();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (versionId: string) => {
      return result(
        api.POST('/api/v1/proposal-versions/{id}/reject', {
          params: { path: { id: versionId } },
          body: {
            reason: rejectReason,
            notes: rejectNotes || undefined,
          },
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals', opportunityId] });
      setRejectVersionId(null);
      setRejectNotes('');
      onOpportunityUpdated?.();
    },
  });

  const newVersionMutation = useMutation({
    mutationFn: async (parentId: string) => {
      return result(
        api.POST('/api/v1/proposal-versions/{id}/new-version', {
          params: { path: { id: parentId } },
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals', opportunityId] });
      setNewVersionParentId(null);
    },
  });

  const handleDownloadPdf = async (version: ProposalVersionView) => {
    try {
      setDownloadingVersionId(version.id);
      const res = await fetch(`/api/v1/proposal-versions/${version.id}/pdf`, {
        credentials: 'include',
        headers: { 'x-requested-with': 'MouraSolar' },
      });
      if (!res.ok) {
        throw new Error('Falha ao baixar PDF da proposta');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `proposta-v${version.versionNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Não foi possível fazer download do PDF. Tente novamente.');
    } finally {
      setDownloadingVersionId(null);
    }
  };

  const proposals = (proposalsQuery.data ?? []) as unknown as ProposalView[];

  // KPI aggregates
  const totalProposalsCount = proposals.length;
  const totalVersionsCount = proposals.reduce((acc, p) => acc + (p.versions?.length ?? 0), 0);
  const sentProposalsCount = proposals.filter((p) =>
    p.versions?.some((v) => v.status === 'SENT'),
  ).length;
  const acceptedProposalsCount = proposals.filter((p) => Boolean(p.acceptedVersionId)).length;

  return (
    <div className="proposal-container proposals-container">
      {/* Header bar */}
      <div className="proposal-header">
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: 700,
              color: 'var(--text-primary, #f5f7f5)',
            }}
          >
            Propostas Comerciais{opportunityTitle ? ` — ${opportunityTitle}` : ''}
          </h3>
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center',
              marginTop: '0.35rem',
              flexWrap: 'wrap',
            }}
          >
            <span className="device" style={{ color: 'var(--text-secondary, #9ba49e)' }}>
              Geração de PDFs padronizados, controle de versões, registro de envios e aceite formal.
            </span>
            {opportunityState && (
              <span className={`badge badge-${opportunityState.toLowerCase()}`}>
                {opportunityState}
              </span>
            )}
          </div>
        </div>

        {!readonly && canCreate && !isCreating && (
          <Button
            variant="primary"
            onClick={() => {
              setIsCreating(true);
              if (approvedVersions.length > 0 && !selectedDesignVersionId) {
                setSelectedDesignVersionId(approvedVersions[0].versionId);
              }
            }}
          >
            + Nova Proposta Comercial
          </Button>
        )}
      </div>

      {/* Top KPI Summary Grid */}
      <div className="proposal-kpi-grid">
        <div className="proposal-kpi-card">
          <span className="proposal-kpi-label">Propostas Emitidas</span>
          <span className="proposal-kpi-value" style={{ color: 'var(--brand-solar, #ffd400)' }}>
            {totalProposalsCount}
          </span>
        </div>
        <div className="proposal-kpi-card">
          <span className="proposal-kpi-label">Total de Versões</span>
          <span className="proposal-kpi-value">{totalVersionsCount}</span>
        </div>
        <div className="proposal-kpi-card">
          <span className="proposal-kpi-label">Envios Registrados</span>
          <span className="proposal-kpi-value" style={{ color: 'var(--status-warning, #ff9f1c)' }}>
            {sentProposalsCount}
          </span>
        </div>
        <div className="proposal-kpi-card">
          <span className="proposal-kpi-label">Aceites Formais</span>
          <span className="proposal-kpi-value" style={{ color: 'var(--status-success, #26d866)' }}>
            {acceptedProposalsCount}
          </span>
        </div>
      </div>

      {/* Proposal Creation Panel */}
      {isCreating && (
        <section
          className="proposal-card"
          style={{
            border: '1px solid var(--brand-solar, #ffd400)',
            padding: '1.25rem',
          }}
          aria-label="Criação de Proposta Comercial"
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
              borderBottom: '1px solid var(--border-default, #29302b)',
              paddingBottom: '0.75rem',
            }}
          >
            <h4
              style={{
                margin: 0,
                fontSize: '1.1rem',
                fontWeight: 700,
                color: 'var(--text-primary, #f5f7f5)',
              }}
            >
              Emitir Nova Proposta Comercial (PDF)
            </h4>
            <button
              type="button"
              style={{
                background: 'transparent',
                color: 'var(--text-secondary, #9ba49e)',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.1rem',
                padding: '0.25rem 0.5rem',
              }}
              onClick={() => setIsCreating(false)}
            >
              ✕ Fechar
            </button>
          </div>

          <Feedback error={createProposalMutation.error} />

          {approvedVersions.length === 0 ? (
            <div
              className="notice error"
              style={{
                background: 'rgba(255, 77, 87, 0.1)',
                padding: '1rem',
                borderRadius: 'var(--radius-sm, 6px)',
                border: '1px solid var(--status-danger, #ff4d57)',
              }}
            >
              <strong style={{ color: 'var(--status-danger, #ff4d57)' }}>
                ⚠️ Nenhum dimensionamento aprovado disponível
              </strong>
              <p
                style={{
                  margin: '0.5rem 0 0 0',
                  fontSize: '0.875rem',
                  color: 'var(--text-primary, #f5f7f5)',
                }}
              >
                Para emitir uma proposta comercial oficial com PDF, você precisa primeiro aprovar
                uma versão de dimensionamento técnico na aba{' '}
                <strong>&quot;☀️ Dimensionamento & Custos&quot;</strong>.
              </p>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createProposalMutation.mutate();
              }}
              style={{ display: 'grid', gap: '1rem' }}
            >
              <div className="form-grid">
                <label style={{ gridColumn: '1 / -1' }}>
                  Dimensionamento Técnico Aprovado *
                  <select
                    required
                    value={selectedDesignVersionId}
                    onChange={(e) => setSelectedDesignVersionId(e.target.value)}
                  >
                    <option value="">Selecione a versão técnica aprovada…</option>
                    {approvedVersions.map((v) => (
                      <option key={v.versionId} value={v.versionId}>
                        {v.designName} — v{v.versionNumber} ({v.peakPowerKwp.toFixed(2)} kWp |{' '}
                        {v.estimatedGenerationKwh.toFixed(0)} kWh/mês | R${' '}
                        {v.finalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Prazo de Validade (dias corridos) *
                  <input
                    type="number"
                    min={1}
                    max={90}
                    required
                    value={validityDays}
                    onChange={(e) => setValidityDays(parseInt(e.target.value, 10) || 10)}
                  />
                  <small className="device" style={{ color: 'var(--text-secondary, #9ba49e)' }}>
                    Padrão SPEC-006: 10 dias corridos
                  </small>
                </label>

                <label style={{ gridColumn: '1 / -1' }}>
                  Condições de Pagamento e Parcelamento
                  <textarea
                    rows={2}
                    value={paymentConditionsText}
                    onChange={(e) => setPaymentConditionsText(e.target.value)}
                    placeholder="ex: À vista com 5% de desconto ou Financiamento Bancário Solar em até 84 parcelas."
                  />
                </label>

                <label style={{ gridColumn: '1 / -1' }}>
                  Observações Comerciais (impressas no PDF)
                  <textarea
                    rows={2}
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    placeholder="ex: Instalação prevista para até 15 dias úteis após parecer de acesso da distribuidora."
                  />
                </label>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  justifyContent: 'flex-end',
                  marginTop: '0.5rem',
                }}
              >
                <Button type="button" variant="secondary" onClick={() => setIsCreating(false)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={createProposalMutation.isPending || !selectedDesignVersionId}
                >
                  {createProposalMutation.isPending
                    ? 'Gerando PDF…'
                    : 'Gerar Proposta e PDF Oficial'}
                </Button>
              </div>
            </form>
          )}
        </section>
      )}

      {/* Proposals List */}
      {proposalsQuery.isPending && (
        <p className="device" role="status" style={{ color: 'var(--text-secondary, #9ba49e)' }}>
          Carregando propostas comerciais…
        </p>
      )}

      {!proposalsQuery.isPending && proposals.length === 0 && !isCreating && (
        <div className="proposal-empty-state">
          <span style={{ fontSize: '2.5rem' }}>📄</span>
          <h4
            style={{
              margin: '0.25rem 0',
              fontSize: '1.15rem',
              fontWeight: 700,
              color: 'var(--text-primary, #f5f7f5)',
            }}
          >
            Nenhuma proposta emitida
          </h4>
          <p
            className="device"
            style={{
              maxWidth: '30rem',
              margin: '0 auto 1rem auto',
              color: 'var(--text-secondary, #9ba49e)',
            }}
          >
            Converta dimensionamentos aprovados em propostas comerciais formais completas com PDF
            para envio ao cliente via WhatsApp ou E-mail.
          </p>
          {!readonly && canCreate && (
            <Button
              variant="primary"
              onClick={() => {
                setIsCreating(true);
                if (approvedVersions.length > 0 && !selectedDesignVersionId) {
                  setSelectedDesignVersionId(approvedVersions[0].versionId);
                }
              }}
            >
              Criar Primeira Proposta
            </Button>
          )}
        </div>
      )}

      {proposals.map((proposal) => {
        const hasAcceptedVersion = Boolean(proposal.acceptedVersionId);
        const versions = (proposal.versions ?? []) as ProposalVersionView[];

        return (
          <div
            key={proposal.id}
            className={`proposal-card ${hasAcceptedVersion ? 'proposal-card--accepted' : ''}`}
          >
            {/* Proposal Header */}
            <div className="proposal-card-header">
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}
              >
                <span className="proposal-code">{proposal.code}</span>
                {hasAcceptedVersion && (
                  <span className="badge badge-ativo" style={{ fontSize: '0.75rem' }}>
                    CONTRATADA (ACEITE FORMAL)
                  </span>
                )}
                <span className="device" style={{ color: 'var(--text-secondary, #9ba49e)' }}>
                  Criada em {new Date(proposal.createdAt).toLocaleDateString('pt-BR')}
                </span>
              </div>

              <div
                className="device"
                style={{ fontSize: '0.875rem', color: 'var(--text-secondary, #9ba49e)' }}
              >
                {versions.length} {versions.length === 1 ? 'versão' : 'versões'}
              </div>
            </div>

            {/* Versions List */}
            <div style={{ display: 'grid', gap: '1rem', padding: '1.25rem' }}>
              {versions.map((version) => {
                const isAccepted = version.status === 'ACCEPTED';
                const isSent = version.status === 'SENT';
                const isReady = version.status === 'READY';
                const isRejected = version.status === 'REJECTED';
                const isExpired = version.status === 'EXPIRED';

                const doc = version.documents?.[0];
                const deliveries = version.deliveries ?? [];
                const acceptance = version.acceptance;

                return (
                  <div
                    key={version.id}
                    className={`proposal-version-card ${isAccepted ? 'proposal-version-card--accepted' : ''}`}
                  >
                    {/* Version Top Bar */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <strong
                          style={{
                            fontSize: '1rem',
                            color: 'var(--text-primary, #f5f7f5)',
                          }}
                        >
                          Versão {version.versionNumber}
                        </strong>
                        <span
                          className={`badge ${
                            isAccepted
                              ? 'badge-ativo'
                              : isRejected || isExpired
                                ? 'badge-perdido'
                                : isSent
                                  ? 'badge-sent'
                                  : 'badge-novo'
                          }`}
                        >
                          {version.status}
                        </span>
                      </div>

                      <div
                        className="device"
                        style={{ fontSize: '0.8125rem', color: 'var(--text-secondary, #9ba49e)' }}
                      >
                        {version.validUntil
                          ? `Válida até ${new Date(version.validUntil).toLocaleDateString('pt-BR')}`
                          : `Validade: ${version.validityDays} dias`}
                      </div>
                    </div>

                    {/* Technical & Commercial Summary Cards */}
                    <div className="proposal-metrics-grid">
                      <div className="proposal-metric-box">
                        <span
                          className="device"
                          style={{
                            fontSize: '0.75rem',
                            display: 'block',
                            color: 'var(--text-secondary, #9ba49e)',
                          }}
                        >
                          Potência Pico
                        </span>
                        <strong
                          style={{
                            fontSize: '1.1rem',
                            color: 'var(--text-primary, #f5f7f5)',
                            display: 'block',
                            marginTop: '2px',
                          }}
                        >
                          {Number(
                            version.systemPowerKwp ?? version.technicalSnapshot?.dcPowerKwp ?? 0,
                          ).toFixed(2)}{' '}
                          kWp
                        </strong>
                      </div>

                      <div className="proposal-metric-box">
                        <span
                          className="device"
                          style={{
                            fontSize: '0.75rem',
                            display: 'block',
                            color: 'var(--text-secondary, #9ba49e)',
                          }}
                        >
                          Geração Estimada
                        </span>
                        <strong
                          style={{
                            fontSize: '1.1rem',
                            color: 'var(--text-primary, #f5f7f5)',
                            display: 'block',
                            marginTop: '2px',
                          }}
                        >
                          {Number(
                            version.estimatedMonthlyGenerationKwh ??
                              version.technicalSnapshot?.estimatedMonthlyGenerationKwh ??
                              0,
                          ).toFixed(0)}{' '}
                          kWh/mês
                        </strong>
                      </div>

                      <div className="proposal-metric-box proposal-metric-box--highlight">
                        <span
                          className="device"
                          style={{
                            fontSize: '0.75rem',
                            display: 'block',
                            color: 'var(--text-secondary, #9ba49e)',
                          }}
                        >
                          Valor do Investimento (Preço Final)
                        </span>
                        <strong
                          style={{
                            fontSize: '1.25rem',
                            color: 'var(--brand-solar, #ffd400)',
                            display: 'block',
                            marginTop: '2px',
                          }}
                        >
                          R${' '}
                          {Number(version.finalAmount ?? version.finalPrice ?? 0).toLocaleString(
                            'pt-BR',
                            {
                              minimumFractionDigits: 2,
                            },
                          )}
                        </strong>
                      </div>
                    </div>

                    {/* Observations */}
                    {version.observations && (
                      <p
                        style={{
                          fontSize: '0.875rem',
                          margin: '0',
                          color: 'var(--text-secondary, #9ba49e)',
                          background: 'var(--surface-sunken, #111412)',
                          padding: '0.6rem 0.85rem',
                          borderRadius: 'var(--radius-sm, 6px)',
                          border: '1px solid var(--border-default, #29302b)',
                        }}
                      >
                        <strong style={{ color: 'var(--text-primary, #f5f7f5)' }}>
                          Observações:
                        </strong>{' '}
                        {version.observations}
                      </p>
                    )}

                    {/* PDF Document Status */}
                    {doc && (
                      <div className="proposal-doc-row">
                        <div>
                          <span style={{ color: 'var(--text-primary, #f5f7f5)' }}>
                            📄 {doc.fileName}
                          </span>{' '}
                          <span
                            className="device"
                            style={{ color: 'var(--text-secondary, #9ba49e)' }}
                          >
                            ({Math.round(doc.fileSize / 1024)} KB | Hash:{' '}
                            {doc.contentHash.slice(0, 10)}…)
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          size="compact"
                          onClick={() => handleDownloadPdf(version)}
                          disabled={downloadingVersionId === version.id}
                        >
                          {downloadingVersionId === version.id ? 'Baixando…' : '📥 Baixar PDF'}
                        </Button>
                      </div>
                    )}

                    {/* Acceptance Record Banner */}
                    {acceptance && (
                      <div
                        className="notice"
                        style={{
                          background: 'rgba(38, 216, 102, 0.1)',
                          border: '1px solid var(--status-success, #26d866)',
                          padding: '0.75rem 1rem',
                          borderRadius: 'var(--radius-sm, 6px)',
                          fontSize: '0.875rem',
                        }}
                      >
                        <strong style={{ color: 'var(--status-success, #26d866)' }}>
                          ✅ Proposta Comercial Aceita Formalmente
                        </strong>
                        <div
                          style={{
                            color: 'var(--text-primary, #f5f7f5)',
                            marginTop: '0.2rem',
                          }}
                        >
                          Aceito por <strong>{acceptance.acceptedByName}</strong> em{' '}
                          {new Date(acceptance.acceptedAt).toLocaleString('pt-BR')} via{' '}
                          <strong>{acceptance.method}</strong>.
                        </div>
                        {acceptance.notes && (
                          <div
                            style={{
                              marginTop: '0.25rem',
                              color: 'var(--text-secondary, #9ba49e)',
                            }}
                            className="device"
                          >
                            Notas: {acceptance.notes}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Rejection Banner */}
                    {isRejected && version.rejectionReason && (
                      <div
                        className="notice error"
                        style={{
                          background: 'rgba(255, 77, 87, 0.1)',
                          border: '1px solid var(--status-danger, #ff4d57)',
                          padding: '0.75rem 1rem',
                          borderRadius: 'var(--radius-sm, 6px)',
                          fontSize: '0.875rem',
                        }}
                      >
                        <strong style={{ color: 'var(--status-danger, #ff4d57)' }}>
                          ❌ Proposta Rejeitada
                        </strong>
                        <div style={{ color: 'var(--text-primary, #f5f7f5)', marginTop: '0.2rem' }}>
                          Motivo: {version.rejectionReason}
                        </div>
                      </div>
                    )}

                    {/* Deliveries Timeline */}
                    {deliveries.length > 0 && (
                      <div className="proposal-timeline-box">
                        <strong
                          style={{
                            fontSize: '0.8125rem',
                            display: 'block',
                            marginBottom: '0.35rem',
                            color: 'var(--text-primary, #f5f7f5)',
                          }}
                        >
                          Histórico de Envios:
                        </strong>
                        <div style={{ display: 'grid', gap: '0.35rem', fontSize: '0.8125rem' }}>
                          {deliveries.map((del) => (
                            <div
                              key={del.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                color: 'var(--text-secondary, #9ba49e)',
                                flexWrap: 'wrap',
                              }}
                            >
                              <span>
                                📤{' '}
                                {del.channel === 'WHATSAPP'
                                  ? '📱 WhatsApp'
                                  : del.channel === 'EMAIL'
                                    ? '✉️ E-mail'
                                    : '🤝 Presencial'}
                                :{' '}
                                <strong style={{ color: 'var(--text-primary, #f5f7f5)' }}>
                                  {del.recipient}
                                </strong>{' '}
                                ({new Date(del.sentAt).toLocaleString('pt-BR')})
                              </span>
                              {del.notes && <span className="device">— {del.notes}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Next Step Guidance Banner */}
                    {!readonly && !hasAcceptedVersion && !isRejected && !isExpired && (
                      <>
                        {isReady && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem',
                              backgroundColor: 'rgba(255, 212, 0, 0.08)',
                              border: '1px solid var(--brand-solar, #ffd400)',
                              borderRadius: 'var(--radius-sm, 6px)',
                              padding: '0.75rem 1rem',
                              fontSize: '0.875rem',
                              color: 'var(--brand-solar, #ffd400)',
                            }}
                          >
                            <span style={{ fontSize: '1.25rem' }}>👉</span>
                            <div>
                              <strong>Próximo Passo Comercial:</strong> Envie a proposta ao cliente
                              e registre o canal de entrega abaixo para liberar o{' '}
                              <strong>Aceite Formal</strong> e a etapa de contratação.
                            </div>
                          </div>
                        )}

                        {isSent && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem',
                              backgroundColor: 'rgba(38, 216, 102, 0.08)',
                              border: '1px solid var(--status-success, #26d866)',
                              borderRadius: 'var(--radius-sm, 6px)',
                              padding: '0.75rem 1rem',
                              fontSize: '0.875rem',
                              color: 'var(--status-success, #26d866)',
                            }}
                          >
                            <span style={{ fontSize: '1.25rem' }}>🎯</span>
                            <div>
                              <strong>Proposta Entregue ao Cliente!</strong> Assim que o cliente der
                              o retorno positivo, registre o <strong>Aceite Formal</strong> no botão
                              verde destacado abaixo para avançar à etapa de Contratos.
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Action Buttons Toolbar */}
                    {!readonly && !hasAcceptedVersion && (
                      <div className="proposal-actions-bar">
                        {canSend && (
                          <Button
                            type="button"
                            aria-label="📤 Registrar Envio"
                            variant={isReady ? 'primary' : 'secondary'}
                            onClick={() => {
                              setDeliveryVersionId(version.id);
                              setAcceptVersionId(null);
                              setRejectVersionId(null);
                            }}
                          >
                            📤{' '}
                            {isReady
                              ? '1. Registrar Envio ao Cliente (Gate B)'
                              : 'Registrar Novo Envio'}
                          </Button>
                        )}

                        {canAccept &&
                          (isSent ? (
                            <Button
                              type="button"
                              aria-label="✓ Registrar Aceite Formal"
                              variant="primary"
                              style={{
                                backgroundColor: 'var(--status-success, #26d866)',
                                color: '#090B0A',
                                fontWeight: 700,
                              }}
                              onClick={() => {
                                setAcceptVersionId(version.id);
                                setDeliveryVersionId(null);
                                setRejectVersionId(null);
                              }}
                            >
                              ✓ Registrar Aceite Formal do Cliente
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              disabled
                              title="O aceite formal requer o envio prévio da proposta ao cliente (Gate B)."
                              style={{
                                border: '1px dashed var(--border-default, #29302b)',
                                opacity: 0.6,
                              }}
                            >
                              ✓ Registrar Aceite Formal (Aguardando Envio)
                            </Button>
                          ))}

                        {canReject && isSent && (
                          <Button
                            type="button"
                            variant="danger"
                            onClick={() => {
                              setRejectVersionId(version.id);
                              setDeliveryVersionId(null);
                              setAcceptVersionId(null);
                            }}
                          >
                            ✕ Registrar Rejeição
                          </Button>
                        )}

                        {canCreate && (
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                              setNewVersionParentId(version.id);
                            }}
                          >
                            + Nova Versão
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Inline Form: Register Delivery */}
                    {deliveryVersionId === version.id && (
                      <div className="proposal-inline-form">
                        <h4
                          style={{
                            margin: '0 0 0.5rem 0',
                            color: 'var(--text-primary, #f5f7f5)',
                            fontSize: '1rem',
                            fontWeight: 700,
                          }}
                        >
                          Registrar Envio da Proposta (Gate B)
                        </h4>
                        <p
                          className="device"
                          style={{
                            margin: '0 0 0.75rem 0',
                            color: 'var(--text-secondary, #9ba49e)',
                          }}
                        >
                          O envio formal atualiza a oportunidade para
                          &quot;PROPOSTA_APRESENTADA&quot; e agenda atividade automática de
                          follow-up em 48h.
                        </p>
                        <Feedback error={deliverMutation.error} />
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            deliverMutation.mutate(version.id);
                          }}
                          style={{ display: 'grid', gap: '0.75rem' }}
                        >
                          <div className="form-grid">
                            <label>
                              Canal de Envio *
                              <select
                                value={deliveryChannel}
                                onChange={(e) =>
                                  setDeliveryChannel(
                                    e.target.value as 'WHATSAPP' | 'EMAIL' | 'IN_PERSON' | 'MANUAL',
                                  )
                                }
                              >
                                <option value="WHATSAPP">WhatsApp</option>
                                <option value="EMAIL">E-mail</option>
                                <option value="IN_PERSON">Presencial / Reunião</option>
                                <option value="MANUAL">Outro Canal</option>
                              </select>
                            </label>

                            <label>
                              Destinatário *
                              <input
                                type="text"
                                required
                                placeholder="ex: (31) 98765-4321 ou cliente@email.com"
                                value={deliveryRecipient}
                                onChange={(e) => setDeliveryRecipient(e.target.value)}
                              />
                            </label>

                            <label style={{ gridColumn: '1 / -1' }}>
                              Notas do Envio
                              <input
                                type="text"
                                placeholder="ex: Enviado em PDF pelo WhatsApp corporativo ao diretor financeiro."
                                value={deliveryNotes}
                                onChange={(e) => setDeliveryNotes(e.target.value)}
                              />
                            </label>
                          </div>

                          <div
                            style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}
                          >
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => setDeliveryVersionId(null)}
                            >
                              Cancelar
                            </Button>
                            <Button
                              type="submit"
                              variant="primary"
                              disabled={deliverMutation.isPending || !deliveryRecipient}
                            >
                              {deliverMutation.isPending ? 'Registrando…' : 'Confirmar Envio'}
                            </Button>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* Inline Form: Register Acceptance */}
                    {acceptVersionId === version.id && (
                      <div
                        className="proposal-inline-form"
                        style={{
                          border: '1px solid var(--status-success, #26d866)',
                          background: 'rgba(38, 216, 102, 0.05)',
                        }}
                      >
                        <h4
                          style={{
                            margin: '0 0 0.5rem 0',
                            color: 'var(--status-success, #26d866)',
                            fontSize: '1rem',
                            fontWeight: 700,
                          }}
                        >
                          Registrar Aceite Formal do Cliente
                        </h4>
                        <p
                          className="device"
                          style={{
                            margin: '0 0 0.75rem 0',
                            color: 'var(--text-secondary, #9ba49e)',
                          }}
                        >
                          O aceite formal marca a proposta como vencedora, transita a oportunidade
                          para &quot;CONTRATACAO&quot; e cria a tarefa de formalização do contrato.
                        </p>
                        <Feedback error={acceptMutation.error} />
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            acceptMutation.mutate(version.id);
                          }}
                          style={{ display: 'grid', gap: '0.75rem' }}
                        >
                          <div className="form-grid">
                            <label>
                              Forma de Aceite *
                              <select
                                value={acceptMethod}
                                onChange={(e) =>
                                  setAcceptMethod(
                                    e.target.value as
                                      'SIGNED_DOCUMENT' | 'MESSAGE' | 'IN_PERSON' | 'E_SIGNATURE',
                                  )
                                }
                              >
                                <option value="MESSAGE">Mensagem Escrita / WhatsApp</option>
                                <option value="SIGNED_DOCUMENT">Documento Assinado Físico</option>
                                <option value="E_SIGNATURE">
                                  Assinatura Eletrônica (DocuSign/Gov.br)
                                </option>
                                <option value="IN_PERSON">Acordo Presencial</option>
                              </select>
                            </label>

                            <label>
                              Nome do Decisor / Signatário *
                              <input
                                type="text"
                                required
                                placeholder="ex: Roberto Carlos da Silva"
                                value={acceptedByName}
                                onChange={(e) => setAcceptedByName(e.target.value)}
                              />
                            </label>

                            <label style={{ gridColumn: '1 / -1' }}>
                              Observações do Aceite
                              <input
                                type="text"
                                placeholder="ex: Aceite registrado via áudio/mensagem de WhatsApp confirmando a proposta."
                                value={acceptNotes}
                                onChange={(e) => setAcceptNotes(e.target.value)}
                              />
                            </label>
                          </div>

                          <div
                            style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}
                          >
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => setAcceptVersionId(null)}
                            >
                              Cancelar
                            </Button>
                            <Button
                              type="submit"
                              variant="primary"
                              style={{
                                backgroundColor: 'var(--status-success, #26d866)',
                                color: '#090B0A',
                                fontWeight: 700,
                              }}
                              disabled={acceptMutation.isPending || !acceptedByName}
                            >
                              {acceptMutation.isPending
                                ? 'Confirmando…'
                                : 'Confirmar Aceite Formal'}
                            </Button>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* Inline Form: Register Rejection */}
                    {rejectVersionId === version.id && (
                      <div
                        className="proposal-inline-form"
                        style={{
                          border: '1px solid var(--status-danger, #ff4d57)',
                          background: 'rgba(255, 77, 87, 0.05)',
                        }}
                      >
                        <h4
                          style={{
                            margin: '0 0 0.5rem 0',
                            color: 'var(--status-danger, #ff4d57)',
                            fontSize: '1rem',
                            fontWeight: 700,
                          }}
                        >
                          Registrar Rejeição da Versão
                        </h4>
                        <Feedback error={rejectMutation.error} />
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            rejectMutation.mutate(version.id);
                          }}
                          style={{ display: 'grid', gap: '0.75rem' }}
                        >
                          <div className="form-grid">
                            <label>
                              Motivo da Recusa *
                              <select
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                              >
                                <option value="PRECO_ALTO">Preço acima da expectativa</option>
                                <option value="CONCORRENTE">Fechou com concorrente</option>
                                <option value="FINANCIAMENTO_NEGADO">
                                  Crédito/financiamento negado
                                </option>
                                <option value="DESISTENCIA">Desistência do projeto</option>
                                <option value="OUTRO">Outro motivo</option>
                              </select>
                            </label>

                            <label style={{ gridColumn: '1 / -1' }}>
                              Detalhes da Rejeição
                              <input
                                type="text"
                                placeholder="ex: Solicitou refazer dimensionamento com módulos de maior potência."
                                value={rejectNotes}
                                onChange={(e) => setRejectNotes(e.target.value)}
                              />
                            </label>
                          </div>

                          <div
                            style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}
                          >
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => setRejectVersionId(null)}
                            >
                              Cancelar
                            </Button>
                            <Button
                              type="submit"
                              variant="danger"
                              disabled={rejectMutation.isPending}
                            >
                              {rejectMutation.isPending ? 'Registrando…' : 'Confirmar Rejeição'}
                            </Button>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* Inline Form: Create Next Version */}
                    {newVersionParentId === version.id && (
                      <div className="proposal-inline-form">
                        <h4
                          style={{
                            margin: '0 0 0.5rem 0',
                            color: 'var(--text-primary, #f5f7f5)',
                            fontSize: '1rem',
                            fontWeight: 700,
                          }}
                        >
                          Emitir Próxima Versão da Proposta
                        </h4>
                        <p
                          className="device"
                          style={{
                            margin: '0 0 0.75rem 0',
                            color: 'var(--text-secondary, #9ba49e)',
                          }}
                        >
                          Será criada uma nova versão (v{version.versionNumber + 1}) para esta
                          proposta comercial, permitindo novas revisões e reenvio formal.
                        </p>
                        <Feedback error={newVersionMutation.error} />
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setNewVersionParentId(null)}
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="button"
                            variant="primary"
                            onClick={() => newVersionMutation.mutate(version.id)}
                            disabled={newVersionMutation.isPending}
                          >
                            {newVersionMutation.isPending ? 'Emitindo…' : 'Confirmar Nova Versão'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
