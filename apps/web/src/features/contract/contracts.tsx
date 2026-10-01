'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, result, allows } from '../identity/client';
import { Feedback } from '../identity/feedback';
import { Button } from '../../ui/Button';

export interface ContractDocumentView {
  id: string;
  type: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  contentHash: string;
  generationStatus: string;
  generatedAt: string;
}

export interface ContractDeliveryView {
  id: string;
  channel: string;
  recipient?: string | null;
  status: string;
  sentAt: string;
  notes?: string | null;
  sentBy?: { id: string; name: string; email: string } | null;
}

export interface SignedContractReviewView {
  id: string;
  partiesMatch: boolean;
  allPagesPresent: boolean;
  versionMatches: boolean;
  signaturesLegible: boolean;
  decision: 'VERIFIED' | 'REJECTED';
  rejectionReason?: string | null;
  notes?: string | null;
  reviewedAt: string;
  reviewedBy?: { id: string; name: string; email: string } | null;
}

export interface ProjectGateView {
  id: string;
  gateType: string;
  status: string;
  satisfiedAt?: string | null;
  evidenceSummary?: string | null;
}

export interface PartySnapshot {
  client?: { name?: string; document?: string; address?: string; phone?: string; email?: string };
  company?: { legalName?: string; cnpj?: string };
  utility?: { customerUnit?: string; company?: string };
}

export interface TechnicalSnapshot {
  systemPowerKwp?: string;
  estimatedMonthlyGenerationKwh?: string;
  roofType?: string;
  bom?: {
    moduleQuantity?: string;
    moduleBrandModel?: string;
    inverterQuantity?: string;
    inverterBrandModel?: string;
    structureType?: string;
  };
}

export interface CommercialSnapshot {
  contractTotal?: string;
  paymentMethod?: string;
  milestones?: Array<{ stage: string; percent: string; amount: string }>;
}

export interface ClausesSnapshot {
  deadlines?: {
    equipmentDeliveryDays?: string;
    installationDays?: string;
    documentationDays?: string;
    installationWarrantyMonths?: string;
  };
  city?: string;
}

export interface ContractVersionView {
  id: string;
  versionNumber: number;
  status: string;
  partySnapshot: PartySnapshot;
  technicalSnapshot: TechnicalSnapshot;
  commercialSnapshot: CommercialSnapshot;
  scopeSnapshot: Record<string, boolean>;
  clausesSnapshot: ClausesSnapshot;
  contentHash: string;
  observations?: string | null;
  documents: ContractDocumentView[];
  createdBy?: { id: string; name: string; email: string } | null;
  createdAt: string;
}

export interface ContractView {
  id: string;
  organizationId: string;
  opportunityId: string;
  acceptedProposalVersionId: string;
  code: string;
  state:
    | 'DRAFT'
    | 'PENDING_REVIEW'
    | 'APPROVED'
    | 'READY'
    | 'SENT'
    | 'SIGNED_UPLOADED'
    | 'SIGNED_VERIFIED'
    | 'ACTIVE'
    | 'AMENDED'
    | 'CANCELED'
    | 'TERMINATED';
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  versions: ContractVersionView[];
  deliveries: ContractDeliveryView[];
  signedReviews: SignedContractReviewView[];
  projectGates: ProjectGateView[];
  opportunity?: {
    id: string;
    code: string;
    title: string;
    state: string;
    customer: { id: string; legalName: string; taxId: string };
  };
  acceptedProposalVersion?: {
    id: string;
    versionNumber: number;
    finalPrice: number | string;
    proposal: { id: string; code: string };
  };
}

interface ContractsProps {
  opportunityId: string;
  onRefresh?: () => void;
  readonly?: boolean;
}

export function ContractsView({ opportunityId, onRefresh, readonly = false }: ContractsProps) {
  const queryClient = useQueryClient();

  // Modal states
  const [isCreating, setIsCreating] = useState(false);
  const [signingCity, setSigningCity] = useState('Recife');
  const [roofType, setRoofType] = useState('Cerâmico');
  const [contractNotes, setContractNotes] = useState('');

  // Delivery state
  const [isDelivering, setIsDelivering] = useState(false);
  const [deliveryChannel, setDeliveryChannel] = useState<
    'WHATSAPP' | 'EMAIL' | 'IN_PERSON' | 'MANUAL'
  >('WHATSAPP');
  const [deliveryRecipient, setDeliveryRecipient] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  // Upload signed state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadBase64, setUploadBase64] = useState('');
  const [uploadNotes, setUploadNotes] = useState('');

  // Review / Conference state
  const [isReviewing, setIsReviewing] = useState(false);
  const [checkParties, setCheckParties] = useState(false);
  const [checkPages, setCheckPages] = useState(false);
  const [checkVersion, setCheckVersion] = useState(false);
  const [checkSignatures, setCheckSignatures] = useState(false);
  const [reviewDecision, setReviewDecision] = useState<'VERIFIED' | 'REJECTED'>('VERIFIED');
  const [rejectionReason, setRejectionReason] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');

  // Identity and permissions
  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => result(api.GET('/api/v1/identity/me')),
  });
  const canCreate = me.data
    ? allows(me.data, 'contracts:create', false) || me.data.roleName === 'Administrador'
    : true;
  const canSend = me.data
    ? allows(me.data, 'contracts:send', false) || me.data.roleName === 'Administrador'
    : true;
  const canUpload = me.data
    ? allows(me.data, 'contracts:upload_signed', false) || me.data.roleName === 'Administrador'
    : true;
  const canVerify = me.data
    ? allows(me.data, 'contracts:verify_signed', false) || me.data.roleName === 'Administrador'
    : true;
  const canDownload = me.data
    ? allows(me.data, 'contracts:download', false) || me.data.roleName === 'Administrador'
    : true;

  // Fetch contracts
  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['contracts', opportunityId],
    queryFn: () =>
      result(
        api.GET('/api/v1/opportunities/{opportunityId}/contracts', {
          params: { path: { opportunityId } },
        }),
      ) as unknown as Promise<ContractView[]>,
  });

  const contract = contracts[0]; // Active contract for this opportunity

  // Mutations
  const createMutation = useMutation({
    mutationFn: () =>
      result(
        api.POST('/api/v1/contracts', {
          body: {
            opportunityId,
            signingCity,
            roofType,
            notes: contractNotes || undefined,
          },
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts', opportunityId] });
      setIsCreating(false);
      onRefresh?.();
    },
  });

  const deliverMutation = useMutation({
    mutationFn: () => {
      if (!contract) return Promise.reject(new Error('Contrato não selecionado'));
      return result(
        api.POST('/api/v1/contracts/{id}/deliveries', {
          params: { path: { id: contract.id } },
          body: {
            channel: deliveryChannel,
            recipient: deliveryRecipient || undefined,
            notes: deliveryNotes || undefined,
          },
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts', opportunityId] });
      setIsDelivering(false);
      onRefresh?.();
    },
  });

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!contract) return Promise.reject(new Error('Contrato não selecionado'));
      return result(
        api.POST('/api/v1/contracts/{id}/upload-signed', {
          params: { path: { id: contract.id } },
          body: {
            fileName: uploadFileName,
            fileBase64: uploadBase64,
            mimeType: 'application/pdf',
            notes: uploadNotes || undefined,
          },
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts', opportunityId] });
      setIsUploading(false);
      setUploadFileName('');
      setUploadBase64('');
      onRefresh?.();
    },
  });

  const reviewMutation = useMutation({
    mutationFn: () => {
      if (!contract) return Promise.reject(new Error('Contrato não selecionado'));
      return result(
        api.POST('/api/v1/contracts/{id}/verify-signed', {
          params: { path: { id: contract.id } },
          body: {
            partiesMatch: checkParties,
            allPagesPresent: checkPages,
            versionMatches: checkVersion,
            signaturesLegible: checkSignatures,
            decision: reviewDecision,
            rejectionReason: reviewDecision === 'REJECTED' ? rejectionReason : undefined,
            notes: reviewNotes || undefined,
          },
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts', opportunityId] });
      setIsReviewing(false);
      onRefresh?.();
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const resultStr = reader.result as string;
      const base64 = resultStr.split(',')[1] || '';
      setUploadBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const getStatusBadge = (state: string) => {
    switch (state) {
      case 'DRAFT':
        return {
          label: 'Rascunho',
          color: 'var(--text-secondary, #9ba49e)',
          bg: 'rgba(155, 164, 158, 0.12)',
        };
      case 'PENDING_REVIEW':
        return { label: 'Em Revisão', color: '#ff9f1c', bg: 'rgba(255, 159, 28, 0.12)' };
      case 'APPROVED':
      case 'READY':
        return { label: 'Pronto p/ Envio', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' };
      case 'SENT':
        return { label: 'Enviado ao Cliente', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.12)' };
      case 'SIGNED_UPLOADED':
        return {
          label: 'Assinado Anexado (Aguardando Conferência)',
          color: '#ff9f1c',
          bg: 'rgba(255, 159, 28, 0.12)',
        };
      case 'ACTIVE':
      case 'SIGNED_VERIFIED':
        return {
          label: 'Ativo & Verificado (Gate C)',
          color: '#26d866',
          bg: 'rgba(38, 216, 102, 0.12)',
        };
      case 'AMENDED':
        return { label: 'Com Aditivo', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.12)' };
      case 'CANCELED':
        return { label: 'Cancelado', color: '#ff4d57', bg: 'rgba(255, 77, 87, 0.12)' };
      default:
        return {
          label: state,
          color: 'var(--text-secondary, #9ba49e)',
          bg: 'rgba(155, 164, 158, 0.12)',
        };
    }
  };

  const gate = contract?.projectGates?.find((g) => g.gateType === 'CONTRACT');
  const activeVersion = contract?.versions?.[0];
  const docxDoc = activeVersion?.documents?.find((d) => d.type === 'DOCX_CONTRACT');
  const pdfDoc = activeVersion?.documents?.find((d) => d.type === 'PDF_CONTRACT');
  const signedDoc = activeVersion?.documents?.find((d) => d.type === 'SIGNED_UPLOAD');

  if (isLoading) {
    return (
      <div
        className="contract-card"
        style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary, #9ba49e)' }}
      >
        Carregando dados contratuais...
      </div>
    );
  }

  return (
    <div className="contract-container">
      {/* Top Banner: Gate C status */}
      <div
        className={`contract-gate-banner ${
          gate?.status === 'SATISFIED'
            ? 'contract-gate-banner--satisfied'
            : 'contract-gate-banner--pending'
        }`}
      >
        <div className="contract-gate-header">
          <div>
            <div className="contract-gate-eyebrow">
              Milestone M5 — Gate C: Governança Contratual & Assinatura
            </div>
            <div className="contract-gate-title">
              {gate?.status === 'SATISFIED' ? (
                <span style={{ color: 'var(--status-success, #26d866)' }}>
                  ✅ Gate C Superado — Contrato Ativo e Verificado
                </span>
              ) : (
                <span style={{ color: 'var(--status-warning, #ff9f1c)' }}>
                  ⏳ Gate C Pendente — Aguardando Assinatura e Conferência Formal
                </span>
              )}
            </div>
          </div>

          {!readonly && !contract && canCreate && (
            <Button variant="primary" onClick={() => setIsCreating(true)}>
              + Gerar Contrato Comercial
            </Button>
          )}
        </div>

        {gate?.status === 'SATISFIED' && gate.satisfiedAt && (
          <div
            style={{
              fontSize: '0.8125rem',
              color: 'var(--text-secondary, #9ba49e)',
              borderTop: '1px solid var(--border-default, #29302b)',
              paddingTop: '0.5rem',
            }}
          >
            Aprovado formalmente em{' '}
            {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
              new Date(gate.satisfiedAt),
            )}
            . {gate.evidenceSummary}
          </div>
        )}
      </div>

      {/* No contract state */}
      {!contract && (
        <div className="contract-empty-card">
          <div style={{ fontSize: '2.75rem' }}>📝</div>
          <div
            style={{
              fontWeight: 700,
              fontSize: '1.2rem',
              color: 'var(--text-primary, #f5f7f5)',
            }}
          >
            Nenhum contrato formal gerado ainda
          </div>
          <p
            style={{
              maxWidth: '480px',
              color: 'var(--text-secondary, #9ba49e)',
              margin: 0,
              fontSize: '0.875rem',
              lineHeight: 1.5,
            }}
          >
            Assim que a proposta comercial for aceita formalmente pelo cliente, gere o contrato
            padrão Moura Solar com minutas em DOCX e PDF para coleta de assinaturas e liberação do
            Gate C.
          </p>
          {!readonly && canCreate && (
            <Button
              variant="primary"
              onClick={() => setIsCreating(true)}
              style={{ marginTop: '0.5rem' }}
            >
              + Gerar Minuta Contratual (DOCX & PDF)
            </Button>
          )}
        </div>
      )}

      {/* Contract Detail View */}
      {contract && (
        <>
          {/* Main Contract Header Card */}
          <div className="contract-card">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.75rem' }}>📄</span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span
                      style={{
                        fontSize: '1.3rem',
                        fontWeight: 800,
                        color: 'var(--brand-solar, #ffd400)',
                      }}
                    >
                      {contract.code}
                    </span>
                    {(() => {
                      const badge = getStatusBadge(contract.state);
                      return (
                        <span
                          style={{
                            padding: '0.25rem 0.65rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: badge.color,
                            backgroundColor: badge.bg,
                            border: `1px solid ${badge.color}33`,
                          }}
                        >
                          {badge.label}
                        </span>
                      );
                    })()}
                  </div>
                  <div
                    style={{
                      fontSize: '0.8125rem',
                      color: 'var(--text-secondary, #9ba49e)',
                      marginTop: '2px',
                    }}
                  >
                    Criado em{' '}
                    {new Intl.DateTimeFormat('pt-BR', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    }).format(new Date(contract.createdAt))}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
                {!readonly &&
                  (contract.state === 'READY' || contract.state === 'SENT') &&
                  canSend && (
                    <Button type="button" variant="secondary" onClick={() => setIsDelivering(true)}>
                      📤 Registrar Envio
                    </Button>
                  )}

                {!readonly &&
                  (contract.state === 'SENT' ||
                    contract.state === 'READY' ||
                    contract.state === 'SIGNED_UPLOADED') &&
                  canUpload && (
                    <Button type="button" variant="primary" onClick={() => setIsUploading(true)}>
                      📥 Anexar Via Assinada
                    </Button>
                  )}

                {!readonly && contract.state === 'SIGNED_UPLOADED' && canVerify && (
                  <Button
                    type="button"
                    variant="primary"
                    style={{
                      backgroundColor: 'var(--status-success, #26d866)',
                      color: '#090B0A',
                      fontWeight: 700,
                    }}
                    onClick={() => {
                      setCheckParties(false);
                      setCheckPages(false);
                      setCheckVersion(false);
                      setCheckSignatures(false);
                      setReviewDecision('VERIFIED');
                      setIsReviewing(true);
                    }}
                  >
                    🔍 Conferência de Assinatura (Gate C)
                  </Button>
                )}
              </div>
            </div>

            {/* Document Download Buttons */}
            <div className="contract-downloads-grid">
              {/* DOCX Download */}
              <div className="contract-download-item">
                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      color: 'var(--text-primary, #f5f7f5)',
                    }}
                  >
                    📝 Minuta Editável (DOCX)
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #9ba49e)' }}>
                    {docxDoc
                      ? `${Math.round(docxDoc.fileSize / 1024)} KB • Modelo Moura Solar`
                      : 'Gerando...'}
                  </div>
                </div>
                {docxDoc && canDownload && (
                  <a
                    href={`/api/v1/contracts/${contract.id}/docx`}
                    className="btn btn--secondary"
                    style={{
                      fontSize: '0.8125rem',
                      padding: '0.4rem 0.85rem',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                    download
                  >
                    Baixar DOCX
                  </a>
                )}
              </div>

              {/* PDF Download */}
              <div className="contract-download-item">
                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      color: 'var(--text-primary, #f5f7f5)',
                    }}
                  >
                    📄 Contrato Formal (PDF)
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #9ba49e)' }}>
                    {pdfDoc
                      ? `${Math.round(pdfDoc.fileSize / 1024)} KB • Pronto para assinatura`
                      : 'Gerando...'}
                  </div>
                </div>
                {pdfDoc && canDownload && (
                  <a
                    href={`/api/v1/contracts/${contract.id}/pdf`}
                    className="btn btn--primary"
                    style={{
                      fontSize: '0.8125rem',
                      padding: '0.4rem 0.85rem',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                    download
                  >
                    Baixar PDF
                  </a>
                )}
              </div>

              {/* Signed Upload Download */}
              {signedDoc && (
                <div
                  className="contract-download-item"
                  style={{ borderColor: 'rgba(38, 216, 102, 0.4)' }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        color: 'var(--status-success, #26d866)',
                      }}
                    >
                      ✍️ Via Assinada Anexada
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #9ba49e)' }}>
                      {Math.round(signedDoc.fileSize / 1024)} KB • {signedDoc.fileName}
                    </div>
                  </div>
                  {canDownload && (
                    <a
                      href={`/api/v1/contracts/${contract.id}/signed`}
                      className="btn"
                      style={{
                        fontSize: '0.8125rem',
                        padding: '0.4rem 0.85rem',
                        fontWeight: 600,
                        backgroundColor: 'var(--status-success, #26d866)',
                        color: '#090B0A',
                        textDecoration: 'none',
                        borderRadius: 'var(--radius-sm, 6px)',
                      }}
                      download
                    >
                      Baixar Assinado
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Contract Stage Pipeline & Action Hub (Gate C) */}
          <div className="contract-card">
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: 'var(--text-primary, #f5f7f5)',
                }}
              >
                🎯 Etapas e Ações do Contrato (Gate C)
              </h3>
              <p
                style={{
                  margin: '0.35rem 0 0 0',
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary, #9ba49e)',
                }}
              >
                Acompanhe as 4 etapas necessárias para homologar o contrato com validade jurídica e
                liberar a oportunidade.
              </p>
            </div>

            <div className="contract-pipeline-grid">
              {/* Step 1: Minutas */}
              <div className="contract-pipeline-step contract-pipeline-step--success">
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        color: 'var(--text-primary, #f5f7f5)',
                      }}
                    >
                      1. Minutas do Contrato
                    </span>
                    <span
                      style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#26d866',
                        backgroundColor: 'rgba(38, 216, 102, 0.12)',
                      }}
                    >
                      ✓ Concluído
                    </span>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.8125rem',
                      color: 'var(--text-secondary, #9ba49e)',
                    }}
                  >
                    Documentos gerados com as cláusulas padrão Moura Solar e dados técnicos.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {pdfDoc && canDownload && (
                    <a
                      href={`/api/v1/contracts/${contract.id}/pdf`}
                      download
                      className="btn btn--primary"
                      style={{
                        fontSize: '0.8125rem',
                        padding: '0.45rem 0.8rem',
                        textDecoration: 'none',
                      }}
                    >
                      📄 Baixar PDF
                    </a>
                  )}
                  {docxDoc && canDownload && (
                    <a
                      href={`/api/v1/contracts/${contract.id}/docx`}
                      download
                      className="btn btn--secondary"
                      style={{
                        fontSize: '0.8125rem',
                        padding: '0.45rem 0.8rem',
                        textDecoration: 'none',
                      }}
                    >
                      📝 Baixar DOCX
                    </a>
                  )}
                </div>
              </div>

              {/* Step 2: Envio */}
              {(() => {
                const isSent =
                  contract.state !== 'READY' &&
                  contract.deliveries &&
                  contract.deliveries.length > 0;
                const isCurrent = contract.state === 'READY';
                return (
                  <div
                    className={`contract-pipeline-step ${
                      isCurrent
                        ? 'contract-pipeline-step--active'
                        : isSent
                          ? 'contract-pipeline-step--success'
                          : ''
                    }`}
                  >
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '0.5rem',
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: '0.875rem',
                            color: 'var(--text-primary, #f5f7f5)',
                          }}
                        >
                          2. Envio da Minuta
                        </span>
                        <span
                          style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: isSent ? '#26d866' : isCurrent ? '#ffd400' : '#9ba49e',
                            backgroundColor: isSent
                              ? 'rgba(38, 216, 102, 0.12)'
                              : isCurrent
                                ? 'rgba(255, 212, 0, 0.12)'
                                : 'rgba(155, 164, 158, 0.12)',
                          }}
                        >
                          {isSent ? '✓ Enviado' : isCurrent ? '👉 Ação Pendente' : 'Pendente'}
                        </span>
                      </div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '0.8125rem',
                          color: 'var(--text-secondary, #9ba49e)',
                        }}
                      >
                        {isSent
                          ? `Enviado via ${contract.deliveries[0]?.channel} para ${contract.deliveries[0]?.recipient}.`
                          : 'Envie a minuta ao cliente e registre o canal (WhatsApp/E-mail) para controle de prazos.'}
                      </p>
                    </div>

                    {!readonly && canSend && (
                      <Button
                        type="button"
                        variant={isCurrent ? 'primary' : 'secondary'}
                        onClick={() => setIsDelivering(true)}
                      >
                        📤 {isSent ? 'Registrar Novo Envio' : 'Registrar Envio da Minuta'}
                      </Button>
                    )}
                  </div>
                );
              })()}

              {/* Step 3: Assinatura */}
              {(() => {
                const hasUploaded = Boolean(signedDoc);
                const isCurrent =
                  !hasUploaded && (contract.state === 'SENT' || contract.state === 'READY');
                return (
                  <div
                    className={`contract-pipeline-step ${
                      isCurrent
                        ? 'contract-pipeline-step--active'
                        : hasUploaded
                          ? 'contract-pipeline-step--success'
                          : ''
                    }`}
                  >
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '0.5rem',
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: '0.875rem',
                            color: 'var(--text-primary, #f5f7f5)',
                          }}
                        >
                          3. Assinatura do Cliente
                        </span>
                        <span
                          style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: hasUploaded ? '#26d866' : isCurrent ? '#ffd400' : '#9ba49e',
                            backgroundColor: hasUploaded
                              ? 'rgba(38, 216, 102, 0.12)'
                              : isCurrent
                                ? 'rgba(255, 212, 0, 0.12)'
                                : 'rgba(155, 164, 158, 0.12)',
                          }}
                        >
                          {hasUploaded
                            ? '✓ Anexado'
                            : isCurrent
                              ? '👉 Ação Pendente'
                              : 'Aguardando'}
                        </span>
                      </div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '0.8125rem',
                          color: 'var(--text-secondary, #9ba49e)',
                        }}
                      >
                        {signedDoc
                          ? `Via assinada anexada (${Math.round(signedDoc.fileSize / 1024)} KB) pronta para conferência.`
                          : 'Colete a assinatura física ou eletrônica (DocuSign/Gov.br) e faça o upload do PDF assinado.'}
                      </p>
                    </div>

                    {!readonly && canUpload && (
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <Button
                          type="button"
                          variant={hasUploaded ? 'secondary' : 'primary'}
                          onClick={() => setIsUploading(true)}
                        >
                          📥 {hasUploaded ? 'Substituir Via Assinada' : 'Anexar Contrato Assinado'}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Step 4: Conferência Gate C */}
              {(() => {
                const isSatisfied = gate?.status === 'SATISFIED';
                const isReadyForReview = contract.state === 'SIGNED_UPLOADED';
                return (
                  <div
                    className={`contract-pipeline-step ${
                      isReadyForReview
                        ? 'contract-pipeline-step--active'
                        : isSatisfied
                          ? 'contract-pipeline-step--success'
                          : ''
                    }`}
                  >
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '0.5rem',
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: '0.875rem',
                            color: 'var(--text-primary, #f5f7f5)',
                          }}
                        >
                          4. Conferência Gate C
                        </span>
                        <span
                          style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: isSatisfied
                              ? '#26d866'
                              : isReadyForReview
                                ? '#ffd400'
                                : '#9ba49e',
                            backgroundColor: isSatisfied
                              ? 'rgba(38, 216, 102, 0.12)'
                              : isReadyForReview
                                ? 'rgba(255, 212, 0, 0.12)'
                                : 'rgba(155, 164, 158, 0.12)',
                          }}
                        >
                          {isSatisfied
                            ? '✅ Gate C Liberado'
                            : isReadyForReview
                              ? '⭐ Pronto p/ Conferência'
                              : '🔒 Bloqueado'}
                        </span>
                      </div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '0.8125rem',
                          color: 'var(--text-secondary, #9ba49e)',
                        }}
                      >
                        {isSatisfied
                          ? 'Contrato conferido e homologado. As 4 regras de governança foram atendidas.'
                          : isReadyForReview
                            ? 'Valide partes, páginas, versão e assinaturas para ativar o contrato e liberar o Gate C.'
                            : 'Disponível após o anexo da via assinada pelo cliente.'}
                      </p>
                    </div>

                    {!readonly && isReadyForReview && canVerify && (
                      <Button
                        type="button"
                        variant="primary"
                        style={{
                          backgroundColor: 'var(--status-success, #26d866)',
                          color: '#090B0A',
                          fontWeight: 700,
                        }}
                        onClick={() => {
                          setCheckParties(false);
                          setCheckPages(false);
                          setCheckVersion(false);
                          setCheckSignatures(false);
                          setReviewDecision('VERIFIED');
                          setIsReviewing(true);
                        }}
                      >
                        🔍 Realizar Conferência Gate C
                      </Button>
                    )}

                    {isSatisfied && (
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--status-success, #26d866)',
                          fontWeight: 700,
                        }}
                      >
                        ✓ Homologado com sucesso
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Snapshots Grid */}
          {activeVersion && (
            <div className="contract-snapshots-grid">
              {/* Partes Card */}
              <div className="contract-snapshot-card">
                <h4 className="contract-snapshot-title">👤 Partes Contratantes</h4>
                <div className="contract-snapshot-content">
                  <div>
                    <span className="contract-snapshot-label">Contratante:</span>{' '}
                    <strong>{activeVersion.partySnapshot?.client?.name}</strong>
                  </div>
                  <div>
                    <span className="contract-snapshot-label">Documento:</span>{' '}
                    {activeVersion.partySnapshot?.client?.document}
                  </div>
                  <div>
                    <span className="contract-snapshot-label">Endereço:</span>{' '}
                    {activeVersion.partySnapshot?.client?.address}
                  </div>
                  <div>
                    <span className="contract-snapshot-label">Unidade Consumidora:</span>{' '}
                    {activeVersion.partySnapshot?.utility?.customerUnit} (
                    {activeVersion.partySnapshot?.utility?.company})
                  </div>
                  <div
                    style={{
                      borderTop: '1px solid var(--border-default, #29302b)',
                      paddingTop: '0.4rem',
                      marginTop: '0.2rem',
                    }}
                  >
                    <span className="contract-snapshot-label">Contratada:</span>{' '}
                    {activeVersion.partySnapshot?.company?.legalName} (CNPJ{' '}
                    {activeVersion.partySnapshot?.company?.cnpj})
                  </div>
                </div>
              </div>

              {/* Solução Técnica & BOM */}
              <div className="contract-snapshot-card">
                <h4 className="contract-snapshot-title">
                  ⚡ Solução Técnica & Equipamentos (Anexo I)
                </h4>
                <div className="contract-snapshot-content">
                  <div>
                    <span className="contract-snapshot-label">Potência Instalada:</span>{' '}
                    <strong style={{ color: 'var(--brand-solar, #ffd400)' }}>
                      {activeVersion.technicalSnapshot?.systemPowerKwp}
                    </strong>
                  </div>
                  <div>
                    <span className="contract-snapshot-label">Geração Estimada:</span>{' '}
                    {activeVersion.technicalSnapshot?.estimatedMonthlyGenerationKwh}
                  </div>
                  <div>
                    <span className="contract-snapshot-label">Módulos:</span>{' '}
                    {activeVersion.technicalSnapshot?.bom?.moduleQuantity}x{' '}
                    {activeVersion.technicalSnapshot?.bom?.moduleBrandModel}
                  </div>
                  <div>
                    <span className="contract-snapshot-label">Inversor:</span>{' '}
                    {activeVersion.technicalSnapshot?.bom?.inverterQuantity}x{' '}
                    {activeVersion.technicalSnapshot?.bom?.inverterBrandModel}
                  </div>
                  <div>
                    <span className="contract-snapshot-label">Estrutura & Telhado:</span>{' '}
                    {activeVersion.technicalSnapshot?.roofType} (
                    {activeVersion.technicalSnapshot?.bom?.structureType})
                  </div>
                </div>
              </div>

              {/* Condições Financeiras */}
              <div className="contract-snapshot-card">
                <h4 className="contract-snapshot-title">💰 Investimento & Cronograma Financeiro</h4>
                <div className="contract-snapshot-content">
                  <div>
                    <span className="contract-snapshot-label">Valor Total do Contrato:</span>{' '}
                    <strong
                      style={{ fontSize: '1.15rem', color: 'var(--status-success, #26d866)' }}
                    >
                      {activeVersion.commercialSnapshot?.contractTotal}
                    </strong>
                  </div>
                  <div>
                    <span className="contract-snapshot-label">Condição de Pagamento:</span>{' '}
                    {activeVersion.commercialSnapshot?.paymentMethod}
                  </div>
                  <div
                    style={{
                      marginTop: '0.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem',
                    }}
                  >
                    {activeVersion.commercialSnapshot?.milestones?.map((m, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '0.4rem 0.6rem',
                          backgroundColor: 'var(--surface-sunken, #111412)',
                          border: '1px solid var(--border-default, #29302b)',
                          borderRadius: '0.25rem',
                          fontSize: '0.75rem',
                        }}
                      >
                        <span style={{ color: 'var(--text-secondary, #9ba49e)' }}>
                          {m.stage} ({m.percent})
                        </span>
                        <strong style={{ color: 'var(--text-primary, #f5f7f5)' }}>
                          {m.amount}
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Prazos & Escopo */}
              <div className="contract-snapshot-card">
                <h4 className="contract-snapshot-title">⏱ Prazos & Garantias (SPEC-007)</h4>
                <div className="contract-snapshot-content">
                  <div>
                    <span className="contract-snapshot-label">Entrega de Equipamentos:</span>{' '}
                    {activeVersion.clausesSnapshot?.deadlines?.equipmentDeliveryDays} dias úteis
                  </div>
                  <div>
                    <span className="contract-snapshot-label">Instalação Física:</span>{' '}
                    {activeVersion.clausesSnapshot?.deadlines?.installationDays} dias úteis
                  </div>
                  <div>
                    <span className="contract-snapshot-label">Homologação Documental:</span>{' '}
                    {activeVersion.clausesSnapshot?.deadlines?.documentationDays} dias úteis
                  </div>
                  <div>
                    <span className="contract-snapshot-label">Garantia de Instalação:</span>{' '}
                    {activeVersion.clausesSnapshot?.deadlines?.installationWarrantyMonths} meses
                  </div>
                  <div>
                    <span className="contract-snapshot-label">Foro de Eleição:</span> Comarca de{' '}
                    {activeVersion.clausesSnapshot?.city || 'Recife'}/PE
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Deliveries & Reviews History */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1rem',
            }}
          >
            {/* Deliveries */}
            <div className="contract-card">
              <h4
                style={{
                  margin: '0 0 0.75rem 0',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: 'var(--text-primary, #f5f7f5)',
                }}
              >
                📤 Histórico de Envios ao Cliente
              </h4>
              {contract.deliveries?.length === 0 ? (
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary, #9ba49e)' }}>
                  Nenhum envio registrado ainda.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {contract.deliveries.map((del) => (
                    <div
                      key={del.id}
                      style={{
                        padding: '0.6rem 0.8rem',
                        backgroundColor: 'var(--surface-sunken, #111412)',
                        border: '1px solid var(--border-default, #29302b)',
                        borderRadius: '0.375rem',
                        fontSize: '0.8125rem',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontWeight: 600,
                          color: 'var(--text-primary, #f5f7f5)',
                        }}
                      >
                        <span>Canal: {del.channel}</span>
                        <span
                          style={{
                            color: 'var(--text-secondary, #9ba49e)',
                            fontSize: '0.75rem',
                          }}
                        >
                          {new Intl.DateTimeFormat('pt-BR', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          }).format(new Date(del.sentAt))}
                        </span>
                      </div>
                      {del.recipient && (
                        <div
                          style={{
                            color: 'var(--text-secondary, #9ba49e)',
                            marginTop: '0.2rem',
                          }}
                        >
                          Destinatário: {del.recipient}
                        </div>
                      )}
                      {del.notes && (
                        <div
                          style={{
                            fontStyle: 'italic',
                            marginTop: '0.2rem',
                            color: 'var(--text-secondary, #9ba49e)',
                          }}
                        >
                          &ldquo;{del.notes}&rdquo;
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Signed Reviews History */}
            <div className="contract-card">
              <h4
                style={{
                  margin: '0 0 0.75rem 0',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: 'var(--text-primary, #f5f7f5)',
                }}
              >
                🔍 Histórico de Conferência de Assinaturas
              </h4>
              {contract.signedReviews?.length === 0 ? (
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary, #9ba49e)' }}>
                  Nenhuma conferência formal realizada ainda.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {contract.signedReviews.map((rev) => (
                    <div
                      key={rev.id}
                      style={{
                        padding: '0.6rem 0.8rem',
                        borderLeft:
                          rev.decision === 'VERIFIED'
                            ? '4px solid var(--status-success, #26d866)'
                            : '4px solid var(--status-danger, #ff4d57)',
                        backgroundColor: 'var(--surface-sunken, #111412)',
                        border: '1px solid var(--border-default, #29302b)',
                        borderLeftWidth: '4px',
                        borderRadius: '0.375rem',
                        fontSize: '0.8125rem',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontWeight: 600,
                        }}
                      >
                        <span
                          style={{
                            color:
                              rev.decision === 'VERIFIED'
                                ? 'var(--status-success, #26d866)'
                                : 'var(--status-danger, #ff4d57)',
                          }}
                        >
                          {rev.decision === 'VERIFIED'
                            ? '✅ Aprovado (VERIFIED)'
                            : '❌ Rejeitado (REJECTED)'}
                        </span>
                        <span
                          style={{
                            color: 'var(--text-secondary, #9ba49e)',
                            fontSize: '0.75rem',
                          }}
                        >
                          {new Intl.DateTimeFormat('pt-BR', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          }).format(new Date(rev.reviewedAt))}
                        </span>
                      </div>
                      {rev.rejectionReason && (
                        <div
                          style={{
                            color: 'var(--status-danger, #ff4d57)',
                            marginTop: '0.25rem',
                          }}
                        >
                          <strong>Motivo:</strong> {rev.rejectionReason}
                        </div>
                      )}
                      {rev.notes && (
                        <div
                          style={{
                            color: 'var(--text-secondary, #9ba49e)',
                            marginTop: '0.2rem',
                          }}
                        >
                          {rev.notes}
                        </div>
                      )}
                      <div
                        style={{
                          fontSize: '0.7rem',
                          color: 'var(--text-secondary, #9ba49e)',
                          marginTop: '0.25rem',
                        }}
                      >
                        Checklist: Partes ({rev.partiesMatch ? '✓' : '✗'}), Páginas (
                        {rev.allPagesPresent ? '✓' : '✗'}), Versão ({rev.versionMatches ? '✓' : '✗'}
                        ), Assinaturas ({rev.signaturesLegible ? '✓' : '✗'})
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* MODAL 1: Create Contract */}
      {isCreating && (
        <div className="modal-backdrop">
          <div
            className="modal-card"
            style={{
              maxWidth: '520px',
              width: '90%',
              backgroundColor: 'var(--surface-card, #161a17)',
              border: '1px solid var(--border-default, #29302b)',
              color: 'var(--text-primary, #f5f7f5)',
            }}
          >
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary, #f5f7f5)' }}>
              📄 Gerar Contrato Comercial Moura Solar
            </h3>
            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--text-secondary, #9ba49e)',
                margin: '0 0 1.25rem 0',
              }}
            >
              Este assistente gera a minuta em formato oficial DOCX (com os placeholders de
              qualificação, anexo I, II, III e IV preenchidos) e PDF pronto para coleta de
              assinatura.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate();
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}
            >
              <label
                className="form-label"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                  color: 'var(--text-primary, #f5f7f5)',
                }}
              >
                Cidade de Assinatura do Contrato
                <input
                  type="text"
                  className="form-input"
                  value={signingCity}
                  onChange={(e) => setSigningCity(e.target.value)}
                  required
                />
              </label>

              <label
                className="form-label"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                  color: 'var(--text-primary, #f5f7f5)',
                }}
              >
                Tipo de Telhado / Superfície de Fixação
                <select
                  className="form-input"
                  value={roofType}
                  onChange={(e) => setRoofType(e.target.value)}
                >
                  <option value="Cerâmico">Cerâmico (Telha Colonial / Francesa)</option>
                  <option value="Fibrocimento">Fibrocimento / Madeira</option>
                  <option value="Metálico">Metálico / Trapezoidal</option>
                  <option value="Solo">Solo / Monoposte</option>
                  <option value="Laje">Laje Plana de Concreto</option>
                </select>
              </label>

              <label
                className="form-label"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                  color: 'var(--text-primary, #f5f7f5)',
                }}
              >
                Observações e Condições Especiais
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Ex.: Incluso seguro de montagem por 12 meses e garantia dos inversores."
                  value={contractNotes}
                  onChange={(e) => setContractNotes(e.target.value)}
                />
              </label>

              {createMutation.error && <Feedback error={createMutation.error} />}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  marginTop: '0.5rem',
                }}
              >
                <Button type="button" variant="secondary" onClick={() => setIsCreating(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Gerando Minutas...' : 'Confirmar e Emitir Contrato'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Record Delivery */}
      {isDelivering && (
        <div className="modal-backdrop">
          <div
            className="modal-card"
            style={{
              maxWidth: '480px',
              width: '90%',
              backgroundColor: 'var(--surface-card, #161a17)',
              border: '1px solid var(--border-default, #29302b)',
              color: 'var(--text-primary, #f5f7f5)',
            }}
          >
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary, #f5f7f5)' }}>
              📤 Registrar Envio do Contrato
            </h3>
            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--text-secondary, #9ba49e)',
                margin: '0 0 1rem 0',
              }}
            >
              Registre o canal e destinatário para fins de auditoria e acompanhamento comercial.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                deliverMutation.mutate();
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}
            >
              <label
                className="form-label"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                  color: 'var(--text-primary, #f5f7f5)',
                }}
              >
                Canal de Envio
                <select
                  className="form-input"
                  value={deliveryChannel}
                  onChange={(e) =>
                    setDeliveryChannel(
                      e.target.value as 'WHATSAPP' | 'EMAIL' | 'IN_PERSON' | 'MANUAL',
                    )
                  }
                >
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="EMAIL">E-mail</option>
                  <option value="IN_PERSON">Presencial / Em mãos</option>
                  <option value="MANUAL">Outro canal manual</option>
                </select>
              </label>

              <label
                className="form-label"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                  color: 'var(--text-primary, #f5f7f5)',
                }}
              >
                Destinatário
                <input
                  type="text"
                  className="form-input"
                  placeholder="Número de WhatsApp ou e-mail"
                  value={deliveryRecipient}
                  onChange={(e) => setDeliveryRecipient(e.target.value)}
                />
              </label>

              <label
                className="form-label"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                  color: 'var(--text-primary, #f5f7f5)',
                }}
              >
                Observações
                <textarea
                  className="form-input"
                  rows={2}
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                />
              </label>

              {deliverMutation.error && <Feedback error={deliverMutation.error} />}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  marginTop: '0.5rem',
                }}
              >
                <Button type="button" variant="secondary" onClick={() => setIsDelivering(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" disabled={deliverMutation.isPending}>
                  {deliverMutation.isPending ? 'Registrando...' : 'Registrar Envio'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Upload Signed Contract */}
      {isUploading && (
        <div className="modal-backdrop">
          <div
            className="modal-card"
            style={{
              maxWidth: '480px',
              width: '90%',
              backgroundColor: 'var(--surface-card, #161a17)',
              border: '1px solid var(--border-default, #29302b)',
              color: 'var(--text-primary, #f5f7f5)',
            }}
          >
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary, #f5f7f5)' }}>
              📥 Anexar Via Assinada pelo Cliente
            </h3>
            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--text-secondary, #9ba49e)',
                margin: '0 0 1rem 0',
              }}
            >
              O envio da via assinada moverá o contrato para <strong>SIGNED_UPLOADED</strong>. O
              Gate C será liberado apenas após a conferência formal.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                uploadMutation.mutate();
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}
            >
              <label
                className="form-label"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                  color: 'var(--text-primary, #f5f7f5)',
                }}
              >
                Arquivo Assinado (PDF)
                <input
                  type="file"
                  accept="application/pdf"
                  className="form-input"
                  onChange={handleFileUpload}
                  required
                />
                {uploadFileName && (
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--status-success, #26d866)',
                      marginTop: '0.25rem',
                    }}
                  >
                    Arquivo selecionado: {uploadFileName}
                  </div>
                )}
              </label>

              <label
                className="form-label"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                  color: 'var(--text-primary, #f5f7f5)',
                }}
              >
                Observações sobre a Assinatura
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="Ex.: Assinado pelo titular e 2 testemunhas via DocuSign/físico."
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                />
              </label>

              {uploadMutation.error && <Feedback error={uploadMutation.error} />}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  marginTop: '0.5rem',
                }}
              >
                <Button type="button" variant="secondary" onClick={() => setIsUploading(false)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={uploadMutation.isPending || !uploadBase64}
                >
                  {uploadMutation.isPending ? 'Enviando...' : 'Anexar Documento'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Formal Conference Checklist (Gate C) */}
      {isReviewing && (
        <div className="modal-backdrop">
          <div
            className="modal-card"
            style={{
              maxWidth: '540px',
              width: '90%',
              backgroundColor: 'var(--surface-card, #161a17)',
              border: '1px solid var(--border-default, #29302b)',
              color: 'var(--text-primary, #f5f7f5)',
            }}
          >
            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary, #f5f7f5)' }}>
              🔍 Conferência Formal de Assinatura (Gate C)
            </h3>
            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--text-secondary, #9ba49e)',
                margin: '0 0 1rem 0',
              }}
            >
              SPEC-007 Item 10: Realize a conferência do documento assinado em relação à versão
              gerada antes de homologar e liberar o estágio VENDIDO.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                reviewMutation.mutate();
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              {/* Checklist items */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  backgroundColor: 'var(--surface-sunken, #111412)',
                  border: '1px solid var(--border-default, #29302b)',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.6rem',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    color: 'var(--text-primary, #f5f7f5)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checkParties}
                    onChange={(e) => setCheckParties(e.target.checked)}
                    style={{ marginTop: '0.2rem', width: 'auto' }}
                  />
                  <span>
                    <strong>1. Partes e Qualificação:</strong> Os dados do cliente, CPF/CNPJ,
                    endereços e representantes conferem com o cadastro.
                  </span>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.6rem',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    color: 'var(--text-primary, #f5f7f5)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checkPages}
                    onChange={(e) => setCheckPages(e.target.checked)}
                    style={{ marginTop: '0.2rem', width: 'auto' }}
                  />
                  <span>
                    <strong>2. Integridade de Páginas:</strong> Todas as páginas, cláusulas e anexos
                    I, II, III e IV estão presentes e na ordem correta.
                  </span>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.6rem',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    color: 'var(--text-primary, #f5f7f5)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checkVersion}
                    onChange={(e) => setCheckVersion(e.target.checked)}
                    style={{ marginTop: '0.2rem', width: 'auto' }}
                  />
                  <span>
                    <strong>3. Correspondência de Versão:</strong> O texto contratual, valores e
                    prazos correspondem à versão oficial emitida.
                  </span>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.6rem',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    color: 'var(--text-primary, #f5f7f5)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checkSignatures}
                    onChange={(e) => setCheckSignatures(e.target.checked)}
                    style={{ marginTop: '0.2rem', width: 'auto' }}
                  />
                  <span>
                    <strong>4. Legibilidade das Assinaturas:</strong> Assinaturas do contratante e
                    das testemunhas estão legíveis e identificadas.
                  </span>
                </label>
              </div>

              {/* Decision Toggle */}
              <div>
                <label
                  className="form-label"
                  style={{ color: 'var(--text-primary, #f5f7f5)', marginBottom: '0.5rem' }}
                >
                  Decisão da Conferência
                </label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <label
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem',
                      border:
                        reviewDecision === 'VERIFIED'
                          ? '2px solid var(--status-success, #26d866)'
                          : '1px solid var(--border-default, #29302b)',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      backgroundColor:
                        reviewDecision === 'VERIFIED'
                          ? 'rgba(38, 216, 102, 0.1)'
                          : 'var(--surface-sunken, #111412)',
                    }}
                  >
                    <input
                      type="radio"
                      name="decision"
                      value="VERIFIED"
                      checked={reviewDecision === 'VERIFIED'}
                      onChange={() => setReviewDecision('VERIFIED')}
                      style={{ width: 'auto' }}
                    />
                    <span
                      style={{
                        fontWeight: 600,
                        color:
                          reviewDecision === 'VERIFIED'
                            ? 'var(--status-success, #26d866)'
                            : 'var(--text-primary, #f5f7f5)',
                      }}
                    >
                      ✅ Aprovar e Liberar Gate C
                    </span>
                  </label>

                  <label
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem',
                      border:
                        reviewDecision === 'REJECTED'
                          ? '2px solid var(--status-danger, #ff4d57)'
                          : '1px solid var(--border-default, #29302b)',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      backgroundColor:
                        reviewDecision === 'REJECTED'
                          ? 'rgba(255, 77, 87, 0.1)'
                          : 'var(--surface-sunken, #111412)',
                    }}
                  >
                    <input
                      type="radio"
                      name="decision"
                      value="REJECTED"
                      checked={reviewDecision === 'REJECTED'}
                      onChange={() => setReviewDecision('REJECTED')}
                      style={{ width: 'auto' }}
                    />
                    <span
                      style={{
                        fontWeight: 600,
                        color:
                          reviewDecision === 'REJECTED'
                            ? 'var(--status-danger, #ff4d57)'
                            : 'var(--text-primary, #f5f7f5)',
                      }}
                    >
                      ❌ Rejeitar Documento
                    </span>
                  </label>
                </div>
              </div>

              {reviewDecision === 'REJECTED' && (
                <label
                  className="form-label"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                    color: 'var(--status-danger, #ff4d57)',
                  }}
                >
                  Motivo da Recusa (Obrigatório)
                  <textarea
                    className="form-input"
                    rows={2}
                    placeholder="Ex.: Falta rubrica na página 3 ou assinatura ilegível da testemunha 1."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    required
                  />
                </label>
              )}

              <label
                className="form-label"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                  color: 'var(--text-primary, #f5f7f5)',
                }}
              >
                Notas Adicionais do Conferente
                <textarea
                  className="form-input"
                  rows={2}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                />
              </label>

              {reviewMutation.error && <Feedback error={reviewMutation.error} />}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  marginTop: '0.5rem',
                }}
              >
                <Button type="button" variant="secondary" onClick={() => setIsReviewing(false)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant={reviewDecision === 'VERIFIED' ? 'primary' : 'danger'}
                  style={
                    reviewDecision === 'VERIFIED'
                      ? {
                          backgroundColor: 'var(--status-success, #26d866)',
                          color: '#090B0A',
                          fontWeight: 700,
                        }
                      : undefined
                  }
                  disabled={
                    reviewMutation.isPending ||
                    (reviewDecision === 'VERIFIED' &&
                      (!checkParties || !checkPages || !checkVersion || !checkSignatures)) ||
                    (reviewDecision === 'REJECTED' && !rejectionReason.trim())
                  }
                >
                  {reviewMutation.isPending
                    ? 'Homologando...'
                    : reviewDecision === 'VERIFIED'
                      ? 'Aprovar e Liberar Gate C'
                      : 'Confirmar Rejeição'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
