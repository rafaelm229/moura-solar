'use client';
import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, result, allows } from '../identity/client';
import { Feedback } from '../identity/feedback';
import { Icon } from '../../components/icons/material-symbol';
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

  // Close creation panel or modals on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCreating(false);
        setDeliveryVersionId(null);
        setAcceptVersionId(null);
        setRejectVersionId(null);
        setNewVersionParentId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  return (
    <div className="proposals-container" style={{ display: 'grid', gap: '1.5rem' }}>
      {/* Header bar */}
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
          <h3 style={{ margin: 0 }}>
            Propostas Comerciais{opportunityTitle ? ` — ${opportunityTitle}` : ''}
          </h3>
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center',
              marginTop: '0.25rem',
              flexWrap: 'wrap',
            }}
          >
            <span className="device">
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
          <button
            onClick={() => {
              setIsCreating(true);
              if (approvedVersions.length > 0 && !selectedDesignVersionId) {
                setSelectedDesignVersionId(approvedVersions[0].versionId);
              }
            }}
          >
            + Nova Proposta Comercial
          </button>
        )}
      </div>

      {/* Proposal Creation Panel */}
      {isCreating && (
        <section
          className="panel"
          style={{
            border: '1px solid var(--brand-primary)',
            background: 'var(--color-surface)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-md)',
          }}
          aria-label="Criação de Proposta Comercial"
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
            }}
          >
            <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Icon name="description" size={20} /> Emitir Nova Proposta Comercial (PDF)
            </h4>
            <button
              type="button"
              className="btn btn--subtle"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '2rem',
                height: '2rem',
                padding: 0,
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f1f5f9',
                color: '#475569',
                cursor: 'pointer',
              }}
              onClick={() => setIsCreating(false)}
              aria-label="Fechar"
            >
              <Icon name="close" size={18} />
            </button>
          </div>

          <Feedback error={createProposalMutation.error} />

          {approvedVersions.length === 0 ? (
            <div
              className="notice error"
              style={{
                background: 'var(--color-canvas)',
                padding: '1rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--status-danger)',
              }}
            >
              <strong style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Icon name="warning" size={18} /> Nenhum dimensionamento aprovado disponível
              </strong>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>
                Para emitir uma proposta comercial oficial com PDF, você precisa primeiro aprovar
                uma versão de dimensionamento técnico na aba{' '}
                <strong>&quot;Dimensionamento & Custos&quot;</strong>.
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
                  <small className="device">Padrão SPEC-006: 10 dias corridos</small>
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
                <button
                  type="button"
                  className="btn btn--subtle"
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  onClick={() => setIsCreating(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createProposalMutation.isPending || !selectedDesignVersionId}
                >
                  {createProposalMutation.isPending
                    ? 'Gerando PDF…'
                    : 'Gerar Proposta e PDF Oficial'}
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      {/* Proposals List */}
      {proposalsQuery.isPending && (
        <p className="device" role="status">
          Carregando propostas comerciais…
        </p>
      )}

      {!proposalsQuery.isPending && proposals.length === 0 && !isCreating && (
        <div
          style={{
            textAlign: 'center',
            padding: '3rem 1.5rem',
            border: '2px dashed var(--color-border)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-surface)',
          }}
        >
          <div style={{ marginBottom: '0.5rem' }}>
            <Icon name="description" size={48} style={{ color: '#94a3b8' }} />
          </div>
          <h4 style={{ margin: '0.5rem 0' }}>Nenhuma proposta emitida</h4>
          <p className="device" style={{ maxWidth: '28rem', margin: '0 auto 1.5rem auto' }}>
            Converta dimensionamentos aprovados em propostas comerciais formais completas com PDF
            para envio ao cliente via WhatsApp ou E-mail.
          </p>
          {!readonly && canCreate && (
            <button
              onClick={() => {
                setIsCreating(true);
                if (approvedVersions.length > 0 && !selectedDesignVersionId) {
                  setSelectedDesignVersionId(approvedVersions[0].versionId);
                }
              }}
            >
              Criar Primeira Proposta
            </button>
          )}
        </div>
      )}

      {proposals.map((proposal) => {
        const hasAcceptedVersion = !!proposal.acceptedVersionId;
        const versions = (proposal.versions ?? []) as ProposalVersionView[];

        return (
          <div
            key={proposal.id}
            className="panel"
            style={{
              border: hasAcceptedVersion
                ? '2px solid var(--status-success)'
                : '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface)',
              overflow: 'hidden',
            }}
          >
            {/* Proposal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem',
                padding: '1rem 1.25rem',
                background: hasAcceptedVersion ? 'rgba(34, 197, 94, 0.08)' : 'var(--color-canvas)',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}
              >
                <span
                  style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--brand-primary)' }}
                >
                  {proposal.code}
                </span>
                {hasAcceptedVersion && (
                  <span className="badge badge-ativo" style={{ fontSize: '0.75rem' }}>
                    CONTRATADA (ACEITE FORMAL)
                  </span>
                )}
                <span className="device">
                  Criada em {new Date(proposal.createdAt).toLocaleDateString('pt-BR')}
                </span>
              </div>

              <div className="device" style={{ fontSize: '0.875rem' }}>
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
                    style={{
                      border: isAccepted
                        ? '1px solid var(--status-success)'
                        : '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '1rem',
                      background: isAccepted ? 'rgba(34, 197, 94, 0.03)' : 'var(--color-surface)',
                    }}
                  >
                    {/* Version Top Bar */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                        marginBottom: '0.75rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <strong style={{ fontSize: '1rem' }}>Versão {version.versionNumber}</strong>
                        <span
                          className={`badge ${
                            isAccepted
                              ? 'badge-ativo'
                              : isRejected || isExpired
                                ? 'badge-perdido'
                                : isSent
                                  ? 'badge-qualificado'
                                  : 'badge-novo'
                          }`}
                        >
                          {version.status}
                        </span>
                      </div>

                      <div className="device" style={{ fontSize: '0.8125rem' }}>
                        {version.validUntil
                          ? `Válida até ${new Date(version.validUntil).toLocaleDateString('pt-BR')}`
                          : `Validade: ${version.validityDays} dias`}
                      </div>
                    </div>

                    {/* Technical & Commercial Summary Cards */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                        gap: '0.75rem',
                        marginBottom: '1rem',
                      }}
                    >
                      <div
                        style={{
                          background: 'var(--color-canvas)',
                          padding: '0.5rem 0.75rem',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        <span className="device" style={{ fontSize: '0.75rem', display: 'block' }}>
                          Potência Pico
                        </span>
                        <strong style={{ fontSize: '1.1rem' }}>
                          {Number(
                            version.systemPowerKwp ?? version.technicalSnapshot?.dcPowerKwp ?? 0,
                          ).toFixed(2)}{' '}
                          kWp
                        </strong>
                      </div>

                      <div
                        style={{
                          background: 'var(--color-canvas)',
                          padding: '0.5rem 0.75rem',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        <span className="device" style={{ fontSize: '0.75rem', display: 'block' }}>
                          Geração Estimada
                        </span>
                        <strong style={{ fontSize: '1.1rem' }}>
                          {Number(
                            version.estimatedMonthlyGenerationKwh ??
                              version.technicalSnapshot?.estimatedMonthlyGenerationKwh ??
                              0,
                          ).toFixed(0)}{' '}
                          kWh/mês
                        </strong>
                      </div>

                      <div
                        style={{
                          background: 'var(--color-canvas)',
                          padding: '0.5rem 0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          gridColumn: 'span 2',
                        }}
                      >
                        <span className="device" style={{ fontSize: '0.75rem', display: 'block' }}>
                          Valor do Investimento (Preço Final)
                        </span>
                        <strong
                          style={{
                            fontSize: '1.25rem',
                            color: 'var(--brand-primary)',
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
                          margin: '0 0 0.75rem 0',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        <strong>Observações:</strong> {version.observations}
                      </p>
                    )}

                    {/* PDF Document Status */}
                    {doc && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '0.5rem',
                          padding: '0.5rem 0.75rem',
                          background: 'var(--color-canvas)',
                          borderRadius: 'var(--radius-sm)',
                          marginBottom: '0.75rem',
                          fontSize: '0.8125rem',
                        }}
                      >
                        <div>
                          <span
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                          >
                            <Icon name="description" size={16} /> {doc.fileName}
                          </span>{' '}
                          <span className="device">
                            ({Math.round(doc.fileSize / 1024)} KB | Hash:{' '}
                            {doc.contentHash.slice(0, 10)}…)
                          </span>
                        </div>
                        <button
                          type="button"
                          style={{
                            padding: '0.25rem 0.6rem',
                            fontSize: '0.8125rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                          }}
                          onClick={() => handleDownloadPdf(version)}
                          disabled={downloadingVersionId === version.id}
                        >
                          <Icon name="download" size={14} />
                          {downloadingVersionId === version.id ? 'Baixando…' : 'Baixar PDF'}
                        </button>
                      </div>
                    )}

                    {/* Acceptance Record Banner */}
                    {acceptance && (
                      <div
                        className="notice"
                        style={{
                          background: 'rgba(34, 197, 94, 0.1)',
                          border: '1px solid var(--status-success)',
                          padding: '0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          marginBottom: '0.75rem',
                          fontSize: '0.875rem',
                        }}
                      >
                        <strong style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Icon name="check_circle" size={18} /> Proposta Comercial Aceita
                          Formalmente
                        </strong>
                        <div>
                          Aceito por <strong>{acceptance.acceptedByName}</strong> em{' '}
                          {new Date(acceptance.acceptedAt).toLocaleString('pt-BR')} via{' '}
                          <strong>{acceptance.method}</strong>.
                        </div>
                        {acceptance.notes && (
                          <div style={{ marginTop: '0.25rem' }} className="device">
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
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid var(--status-danger)',
                          padding: '0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          marginBottom: '0.75rem',
                          fontSize: '0.875rem',
                        }}
                      >
                        <strong style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Icon name="close" size={18} /> Proposta Rejeitada
                        </strong>
                        <div>Motivo: {version.rejectionReason}</div>
                      </div>
                    )}

                    {/* Deliveries Timeline */}
                    {deliveries.length > 0 && (
                      <div style={{ marginBottom: '0.75rem' }}>
                        <strong
                          style={{
                            fontSize: '0.8125rem',
                            display: 'block',
                            marginBottom: '0.25rem',
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
                                color: 'var(--text-secondary)',
                              }}
                            >
                              <span>
                                <Icon name="send" size={14} style={{ marginRight: '0.35rem' }} />
                                {del.channel === 'WHATSAPP'
                                  ? 'WhatsApp'
                                  : del.channel === 'EMAIL'
                                    ? 'E-mail'
                                    : 'Presencial'}
                                : <strong>{del.recipient}</strong> (
                                {new Date(del.sentAt).toLocaleString('pt-BR')})
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
                              backgroundColor: 'rgba(8, 116, 67, 0.08)',
                              border: '1px solid var(--brand-primary, #087443)',
                              borderRadius: 'var(--radius-sm, 6px)',
                              padding: '0.75rem 1rem',
                              marginTop: '0.75rem',
                              fontSize: '0.875rem',
                              color: 'var(--brand-primary-strong, #045c34)',
                            }}
                          >
                            <Icon name="arrow_forward" size={20} />
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
                              backgroundColor: 'rgba(21, 128, 61, 0.1)',
                              border: '1px solid #16a34a',
                              borderRadius: 'var(--radius-sm, 6px)',
                              padding: '0.75rem 1rem',
                              marginTop: '0.75rem',
                              fontSize: '0.875rem',
                              color: '#15803d',
                            }}
                          >
                            <Icon name="verified" size={20} />
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
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          gap: '0.625rem',
                          marginTop: '0.75rem',
                          paddingTop: '0.75rem',
                          borderTop: '1px dashed var(--color-border)',
                        }}
                      >
                        {canSend && (
                          <button
                            type="button"
                            className={isReady ? 'btn btn--primary' : 'btn btn--secondary'}
                            style={{
                              padding: '0.55rem 1.1rem',
                              fontSize: '0.875rem',
                              minHeight: 'auto',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              backgroundColor: isReady
                                ? 'var(--brand-primary, #087443)'
                                : undefined,
                              color: isReady ? '#ffffff' : undefined,
                              border: isReady
                                ? '1px solid var(--brand-primary-strong, #045c34)'
                                : undefined,
                              boxShadow: isReady ? '0 1px 3px rgba(0, 0, 0, 0.12)' : undefined,
                            }}
                            onClick={() => {
                              setDeliveryVersionId(version.id);
                              setAcceptVersionId(null);
                              setRejectVersionId(null);
                            }}
                          >
                            <Icon name="send" size={16} />
                            {isReady
                              ? '1. Registrar Envio ao Cliente (Gate B)'
                              : 'Registrar Novo Envio'}
                          </button>
                        )}

                        {canAccept &&
                          (isSent ? (
                            <button
                              type="button"
                              className="btn btn--success"
                              style={{
                                padding: '0.6rem 1.25rem',
                                fontSize: '0.9375rem',
                                minHeight: 'auto',
                                backgroundColor: '#15803d',
                                color: '#ffffff',
                                border: '1px solid #166534',
                                fontWeight: 700,
                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.18)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                              }}
                              onClick={() => {
                                setAcceptVersionId(version.id);
                                setDeliveryVersionId(null);
                                setRejectVersionId(null);
                              }}
                            >
                              <Icon name="check" size={18} /> Registrar Aceite Formal do Cliente
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn"
                              disabled
                              title="O aceite formal requer o envio prévio da proposta ao cliente (Gate B)."
                              style={{
                                padding: '0.55rem 1rem',
                                fontSize: '0.875rem',
                                minHeight: 'auto',
                                backgroundColor: '#f1f5f9',
                                color: '#64748b',
                                border: '1px dashed #cbd5e1',
                                fontWeight: 600,
                                cursor: 'not-allowed',
                                opacity: 0.65,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                              }}
                            >
                              <Icon name="schedule" size={16} /> Registrar Aceite Formal (Aguardando
                              Envio)
                            </button>
                          ))}

                        {canReject && isSent && (
                          <button
                            type="button"
                            className="btn btn--danger"
                            style={{
                              padding: '0.55rem 1rem',
                              fontSize: '0.875rem',
                              minHeight: 'auto',
                              backgroundColor: '#fee2e2',
                              color: '#b91c1c',
                              border: '1px solid #ef4444',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                            }}
                            onClick={() => {
                              setRejectVersionId(version.id);
                              setDeliveryVersionId(null);
                              setAcceptVersionId(null);
                            }}
                          >
                            <Icon name="close" size={16} /> Registrar Rejeição
                          </button>
                        )}

                        {canCreate && (
                          <button
                            type="button"
                            className="btn btn--subtle"
                            style={{
                              padding: '0.55rem 1rem',
                              fontSize: '0.875rem',
                              minHeight: 'auto',
                              fontWeight: 600,
                            }}
                            onClick={() => {
                              setNewVersionParentId(version.id);
                            }}
                          >
                            + Nova Versão
                          </button>
                        )}
                      </div>
                    )}

                    {/* Inline Form: Register Delivery */}
                    {deliveryVersionId === version.id && (
                      <div
                        className="notice"
                        style={{
                          marginTop: '0.75rem',
                          background: 'var(--color-canvas)',
                          padding: '1rem',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        <h4 style={{ margin: '0 0 0.5rem 0' }}>
                          Registrar Envio da Proposta (Gate B)
                        </h4>
                        <p className="device" style={{ margin: '0 0 0.75rem 0' }}>
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
                            <button
                              type="button"
                              className="btn btn--subtle"
                              style={{
                                backgroundColor: '#ffffff',
                                color: '#334155',
                                border: '1px solid #cbd5e1',
                                padding: '0.45rem 1rem',
                                borderRadius: '6px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                              onClick={() => setDeliveryVersionId(null)}
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              disabled={deliverMutation.isPending || !deliveryRecipient}
                            >
                              {deliverMutation.isPending ? 'Registrando…' : 'Confirmar Envio'}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* Inline Form: Register Acceptance */}
                    {acceptVersionId === version.id && (
                      <div
                        className="notice"
                        style={{
                          marginTop: '0.75rem',
                          background: 'rgba(34, 197, 94, 0.08)',
                          border: '1px solid var(--status-success)',
                          padding: '1rem',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--status-success)' }}>
                          Registrar Aceite Formal do Cliente
                        </h4>
                        <p className="device" style={{ margin: '0 0 0.75rem 0' }}>
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
                            <button
                              type="button"
                              className="btn btn--subtle"
                              onClick={() => setAcceptVersionId(null)}
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              className="btn btn--success"
                              style={{
                                background: '#15803d',
                                color: '#ffffff',
                                border: '1px solid #166534',
                                fontWeight: 600,
                              }}
                              disabled={acceptMutation.isPending || !acceptedByName}
                            >
                              {acceptMutation.isPending
                                ? 'Confirmando…'
                                : 'Confirmar Aceite Formal'}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* Inline Form: Register Rejection */}
                    {rejectVersionId === version.id && (
                      <div
                        className="notice error"
                        style={{
                          marginTop: '0.75rem',
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid var(--status-danger)',
                          padding: '1rem',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--status-danger)' }}>
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
                            <button
                              type="button"
                              className="btn btn--subtle"
                              onClick={() => setRejectVersionId(null)}
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              className="btn btn--danger"
                              style={{
                                background: '#b91c1c',
                                color: '#ffffff',
                                border: '1px solid #991b1b',
                                fontWeight: 600,
                              }}
                              disabled={rejectMutation.isPending}
                            >
                              {rejectMutation.isPending ? 'Registrando…' : 'Confirmar Rejeição'}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* Inline Form: Create Next Version */}
                    {newVersionParentId === version.id && (
                      <div
                        className="notice"
                        style={{
                          marginTop: '0.75rem',
                          background: 'var(--color-canvas)',
                          padding: '1rem',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        <h4 style={{ margin: '0 0 0.5rem 0' }}>
                          Emitir Próxima Versão da Proposta
                        </h4>
                        <p className="device" style={{ margin: '0 0 0.75rem 0' }}>
                          Será criada uma nova versão (v{version.versionNumber + 1}) para esta
                          proposta comercial, permitindo novas revisões e reenvio formal.
                        </p>
                        <Feedback error={newVersionMutation.error} />
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="btn btn--subtle"
                            style={{
                              backgroundColor: '#ffffff',
                              color: '#334155',
                              border: '1px solid #cbd5e1',
                              padding: '0.45rem 1rem',
                              borderRadius: '6px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                            onClick={() => setNewVersionParentId(null)}
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => newVersionMutation.mutate(version.id)}
                            disabled={newVersionMutation.isPending}
                          >
                            {newVersionMutation.isPending ? 'Emitindo…' : 'Confirmar Nova Versão'}
                          </button>
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
