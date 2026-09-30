'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, result, allows } from '../identity/client';
import { Feedback } from '../identity/feedback';

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
  const canCreate = me.data ? allows(me.data, 'contracts:create', false) : true;
  const canSend = me.data ? allows(me.data, 'contracts:send', false) : true;
  const canUpload = me.data ? allows(me.data, 'contracts:upload_signed', false) : true;
  const canVerify = me.data ? allows(me.data, 'contracts:verify_signed', false) : true;
  const canDownload = me.data ? allows(me.data, 'contracts:download', false) : true;

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
        return { label: 'Rascunho', color: 'var(--text-muted)', bg: 'var(--surface-sunken)' };
      case 'PENDING_REVIEW':
        return { label: 'Em Revisão', color: '#b45309', bg: '#fef3c7' };
      case 'APPROVED':
      case 'READY':
        return { label: 'Pronto p/ Envio', color: '#1d4ed8', bg: '#dbeafe' };
      case 'SENT':
        return { label: 'Enviado ao Cliente', color: '#6d28d9', bg: '#ede9fe' };
      case 'SIGNED_UPLOADED':
        return {
          label: 'Assinado Anexado (Aguardando Conferência)',
          color: '#c2410c',
          bg: '#ffedd5',
        };
      case 'ACTIVE':
      case 'SIGNED_VERIFIED':
        return { label: 'Ativo & Verificado (Gate C)', color: '#15803d', bg: '#dcfce7' };
      case 'AMENDED':
        return { label: 'Com Aditivo', color: '#0369a1', bg: '#e0f2fe' };
      case 'CANCELED':
        return { label: 'Cancelado', color: '#b91c1c', bg: '#fee2e2' };
      default:
        return { label: state, color: 'var(--text-muted)', bg: 'var(--surface-sunken)' };
    }
  };

  const gate = contract?.projectGates?.find((g) => g.gateType === 'CONTRACT');
  const activeVersion = contract?.versions?.[0];
  const docxDoc = activeVersion?.documents?.find((d) => d.type === 'DOCX_CONTRACT');
  const pdfDoc = activeVersion?.documents?.find((d) => d.type === 'PDF_CONTRACT');
  const signedDoc = activeVersion?.documents?.find((d) => d.type === 'SIGNED_UPLOAD');

  if (isLoading) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        Carregando dados contratuais...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Banner: Gate C status */}
      <div
        className="card"
        style={{
          borderLeft: gate?.status === 'SATISFIED' ? '6px solid #16a34a' : '6px solid #eab308',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-muted)',
                fontWeight: 600,
              }}
            >
              Milestone M5 — Gate C: Governança Contratual & Assinatura
            </div>
            <div
              style={{
                fontSize: '1.125rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginTop: '0.2rem',
              }}
            >
              {gate?.status === 'SATISFIED' ? (
                <span
                  style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  ✅ Gate C Superado — Contrato Ativo e Verificado
                </span>
              ) : (
                <span
                  style={{ color: '#ca8a04', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  ⏳ Gate C Pendente — Aguardando Assinatura e Conferência Formal
                </span>
              )}
            </div>
          </div>

          {!readonly && !contract && canCreate && (
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => setIsCreating(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              + Gerar Contrato Comercial
            </button>
          )}
        </div>

        {gate?.status === 'SATISFIED' && gate.satisfiedAt && (
          <div
            style={{
              fontSize: '0.8125rem',
              color: 'var(--text-muted)',
              borderTop: '1px solid var(--border-subtle)',
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
        <div
          className="card"
          style={{
            padding: '2.5rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div style={{ fontSize: '2.5rem' }}>📝</div>
          <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>
            Nenhum contrato formal gerado ainda
          </div>
          <p
            style={{
              maxWidth: '480px',
              color: 'var(--text-muted)',
              margin: 0,
              fontSize: '0.875rem',
            }}
          >
            Assim que a proposta comercial for aceita formalmente pelo cliente, gere o contrato
            padrão Moura Solar com minutas em DOCX e PDF para coleta de assinaturas e liberação do
            Gate C.
          </p>
          {!readonly && canCreate && (
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => setIsCreating(true)}
              style={{ marginTop: '0.5rem' }}
            >
              + Gerar Minuta Contratual
            </button>
          )}
        </div>
      )}

      {/* Contract Detail View */}
      {contract && (
        <>
          {/* Main Contract Header Card */}
          <div
            className="card"
            style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
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
                <span style={{ fontSize: '1.5rem' }}>📄</span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>{contract.code}</span>
                    {(() => {
                      const badge = getStatusBadge(contract.state);
                      return (
                        <span
                          style={{
                            padding: '0.2rem 0.6rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: badge.color,
                            backgroundColor: badge.bg,
                          }}
                        >
                          {badge.label}
                        </span>
                      );
                    })()}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    Criado em{' '}
                    {new Intl.DateTimeFormat('pt-BR', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    }).format(new Date(contract.createdAt))}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {!readonly &&
                  (contract.state === 'READY' || contract.state === 'SENT') &&
                  canSend && (
                    <button
                      type="button"
                      className="btn btn--subtle"
                      onClick={() => setIsDelivering(true)}
                    >
                      📤 Registrar Envio
                    </button>
                  )}

                {!readonly &&
                  (contract.state === 'SENT' ||
                    contract.state === 'READY' ||
                    contract.state === 'SIGNED_UPLOADED') &&
                  canUpload && (
                    <button
                      type="button"
                      className="btn btn--subtle"
                      onClick={() => setIsUploading(true)}
                    >
                      📥 Anexar Via Assinada
                    </button>
                  )}

                {!readonly && contract.state === 'SIGNED_UPLOADED' && canVerify && (
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() => {
                      setCheckParties(false);
                      setCheckPages(false);
                      setCheckVersion(false);
                      setCheckSignatures(false);
                      setReviewDecision('VERIFIED');
                      setIsReviewing(true);
                    }}
                  >
                    🔍 Conferência de Assinatura
                  </button>
                )}
              </div>
            </div>

            {/* Document Download Buttons */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '0.75rem',
                backgroundColor: 'var(--surface-sunken)',
                padding: '1rem',
                borderRadius: '0.5rem',
              }}
            >
              {/* DOCX Download */}
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                    📝 Minuta Editável (DOCX)
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {docxDoc
                      ? `${Math.round(docxDoc.fileSize / 1024)} KB • Modelo Moura Solar`
                      : 'Gerando...'}
                  </div>
                </div>
                {docxDoc && canDownload && (
                  <a
                    href={`/api/v1/contracts/${contract.id}/docx`}
                    className="btn btn--secondary"
                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                    download
                  >
                    Baixar DOCX
                  </a>
                )}
              </div>

              {/* PDF Download */}
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                    📄 Contrato Formal (PDF)
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {pdfDoc
                      ? `${Math.round(pdfDoc.fileSize / 1024)} KB • Pronto para assinatura`
                      : 'Gerando...'}
                  </div>
                </div>
                {pdfDoc && canDownload && (
                  <a
                    href={`/api/v1/contracts/${contract.id}/pdf`}
                    className="btn btn--secondary"
                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                    download
                  >
                    Baixar PDF
                  </a>
                )}
              </div>

              {/* Signed Upload Download */}
              {signedDoc && (
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#16a34a' }}>
                      ✍️ Via Assinada Anexada
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {Math.round(signedDoc.fileSize / 1024)} KB • {signedDoc.fileName}
                    </div>
                  </div>
                  {canDownload && (
                    <a
                      href={`/api/v1/contracts/${contract.id}/signed`}
                      className="btn btn--secondary"
                      style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                      download
                    >
                      Baixar Assinado
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Snapshots Grid */}
          {activeVersion && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '1rem',
              }}
            >
              {/* Partes Card */}
              <div className="card" style={{ padding: '1.25rem' }}>
                <h4
                  style={{
                    margin: '0 0 0.75rem 0',
                    fontSize: '0.9375rem',
                    color: 'var(--text-primary)',
                  }}
                >
                  👤 Partes Contratantes
                </h4>
                <div
                  style={{
                    fontSize: '0.8125rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Contratante:</span>{' '}
                    <strong>{activeVersion.partySnapshot?.client?.name}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Documento:</span>{' '}
                    {activeVersion.partySnapshot?.client?.document}
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Endereço:</span>{' '}
                    {activeVersion.partySnapshot?.client?.address}
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Unidade Consumidora:</span>{' '}
                    {activeVersion.partySnapshot?.utility?.customerUnit} (
                    {activeVersion.partySnapshot?.utility?.company})
                  </div>
                  <div
                    style={{
                      borderTop: '1px solid var(--border-subtle)',
                      paddingTop: '0.4rem',
                      marginTop: '0.2rem',
                    }}
                  >
                    <span style={{ color: 'var(--text-muted)' }}>Contratada:</span>{' '}
                    {activeVersion.partySnapshot?.company?.legalName} (CNPJ{' '}
                    {activeVersion.partySnapshot?.company?.cnpj})
                  </div>
                </div>
              </div>

              {/* Solução Técnica & BOM */}
              <div className="card" style={{ padding: '1.25rem' }}>
                <h4
                  style={{
                    margin: '0 0 0.75rem 0',
                    fontSize: '0.9375rem',
                    color: 'var(--text-primary)',
                  }}
                >
                  ⚡ Solução Técnica & Equipamentos (Anexo I)
                </h4>
                <div
                  style={{
                    fontSize: '0.8125rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Potência Instalada:</span>{' '}
                    <strong>{activeVersion.technicalSnapshot?.systemPowerKwp}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Geração Estimada:</span>{' '}
                    {activeVersion.technicalSnapshot?.estimatedMonthlyGenerationKwh}
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Módulos:</span>{' '}
                    {activeVersion.technicalSnapshot?.bom?.moduleQuantity}x{' '}
                    {activeVersion.technicalSnapshot?.bom?.moduleBrandModel}
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Inversor:</span>{' '}
                    {activeVersion.technicalSnapshot?.bom?.inverterQuantity}x{' '}
                    {activeVersion.technicalSnapshot?.bom?.inverterBrandModel}
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Estrutura & Telhado:</span>{' '}
                    {activeVersion.technicalSnapshot?.roofType} (
                    {activeVersion.technicalSnapshot?.bom?.structureType})
                  </div>
                </div>
              </div>

              {/* Condições Financeiras */}
              <div className="card" style={{ padding: '1.25rem' }}>
                <h4
                  style={{
                    margin: '0 0 0.75rem 0',
                    fontSize: '0.9375rem',
                    color: 'var(--text-primary)',
                  }}
                >
                  💰 Investimento & Cronograma Financeiro
                </h4>
                <div
                  style={{
                    fontSize: '0.8125rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Valor Total do Contrato:</span>{' '}
                    <strong style={{ fontSize: '1rem', color: '#16a34a' }}>
                      {activeVersion.commercialSnapshot?.contractTotal}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Condição de Pagamento:</span>{' '}
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
                          padding: '0.25rem 0.5rem',
                          backgroundColor: 'var(--surface-sunken)',
                          borderRadius: '0.25rem',
                          fontSize: '0.75rem',
                        }}
                      >
                        <span>
                          {m.stage} ({m.percent})
                        </span>
                        <strong>{m.amount}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Prazos & Escopo */}
              <div className="card" style={{ padding: '1.25rem' }}>
                <h4
                  style={{
                    margin: '0 0 0.75rem 0',
                    fontSize: '0.9375rem',
                    color: 'var(--text-primary)',
                  }}
                >
                  ⏱ Prazos & Garantias (SPEC-007)
                </h4>
                <div
                  style={{
                    fontSize: '0.8125rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Entrega de Equipamentos:</span>{' '}
                    {activeVersion.clausesSnapshot?.deadlines?.equipmentDeliveryDays} dias úteis
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Instalação Física:</span>{' '}
                    {activeVersion.clausesSnapshot?.deadlines?.installationDays} dias úteis
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Homologação Documental:</span>{' '}
                    {activeVersion.clausesSnapshot?.deadlines?.documentationDays} dias úteis
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Garantia de Instalação:</span>{' '}
                    {activeVersion.clausesSnapshot?.deadlines?.installationWarrantyMonths} meses
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Foro de Eleição:</span> Comarca de{' '}
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
            <div className="card" style={{ padding: '1.25rem' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9375rem' }}>
                📤 Histórico de Envios ao Cliente
              </h4>
              {contract.deliveries?.length === 0 ? (
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Nenhum envio registrado ainda.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {contract.deliveries.map((del) => (
                    <div
                      key={del.id}
                      style={{
                        padding: '0.5rem',
                        backgroundColor: 'var(--surface-sunken)',
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
                        <span>Canal: {del.channel}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                          {new Intl.DateTimeFormat('pt-BR', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          }).format(new Date(del.sentAt))}
                        </span>
                      </div>
                      {del.recipient && (
                        <div style={{ color: 'var(--text-muted)' }}>
                          Destinatário: {del.recipient}
                        </div>
                      )}
                      {del.notes && (
                        <div style={{ fontStyle: 'italic', marginTop: '0.2rem' }}>
                          &ldquo;{del.notes}&rdquo;
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Signed Reviews History */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9375rem' }}>
                🔍 Histórico de Conferência de Assinaturas
              </h4>
              {contract.signedReviews?.length === 0 ? (
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Nenhuma conferência formal realizada ainda.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {contract.signedReviews.map((rev) => (
                    <div
                      key={rev.id}
                      style={{
                        padding: '0.5rem',
                        borderLeft:
                          rev.decision === 'VERIFIED' ? '4px solid #16a34a' : '4px solid #ef4444',
                        backgroundColor: 'var(--surface-sunken)',
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
                          style={{ color: rev.decision === 'VERIFIED' ? '#16a34a' : '#ef4444' }}
                        >
                          {rev.decision === 'VERIFIED'
                            ? '✅ Aprovado (VERIFIED)'
                            : '❌ Rejeitado (REJECTED)'}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                          {new Intl.DateTimeFormat('pt-BR', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          }).format(new Date(rev.reviewedAt))}
                        </span>
                      </div>
                      {rev.rejectionReason && (
                        <div style={{ color: '#b91c1c', marginTop: '0.25rem' }}>
                          <strong>Motivo:</strong> {rev.rejectionReason}
                        </div>
                      )}
                      {rev.notes && (
                        <div style={{ color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          {rev.notes}
                        </div>
                      )}
                      <div
                        style={{
                          fontSize: '0.7rem',
                          color: 'var(--text-muted)',
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
          <div className="modal-card" style={{ maxWidth: '520px', width: '90%' }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>📄 Gerar Contrato Comercial Moura Solar</h3>
            <p
              style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0 0 1.25rem 0' }}
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
                style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}
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
                style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}
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
                style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}
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
                  gap: '0.5rem',
                  marginTop: '0.5rem',
                }}
              >
                <button
                  type="button"
                  className="btn btn--subtle"
                  onClick={() => setIsCreating(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? 'Gerando Minutas...' : 'Confirmar e Emitir Contrato'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Record Delivery */}
      {isDelivering && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '480px', width: '90%' }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>📤 Registrar Envio do Contrato</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0 0 1rem 0' }}>
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
                style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}
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
                style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}
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
                style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}
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
                  gap: '0.5rem',
                  marginTop: '0.5rem',
                }}
              >
                <button
                  type="button"
                  className="btn btn--subtle"
                  onClick={() => setIsDelivering(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={deliverMutation.isPending}
                >
                  {deliverMutation.isPending ? 'Registrando...' : 'Registrar Envio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Upload Signed Contract */}
      {isUploading && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '480px', width: '90%' }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>📥 Anexar Via Assinada pelo Cliente</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0 0 1rem 0' }}>
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
                style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}
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
                  <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.25rem' }}>
                    Arquivo selecionado: {uploadFileName}
                  </div>
                )}
              </label>

              <label
                className="form-label"
                style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}
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
                  gap: '0.5rem',
                  marginTop: '0.5rem',
                }}
              >
                <button
                  type="button"
                  className="btn btn--subtle"
                  onClick={() => setIsUploading(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={uploadMutation.isPending || !uploadBase64}
                >
                  {uploadMutation.isPending ? 'Enviando...' : 'Anexar Documento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Formal Conference Checklist (Gate C) */}
      {isReviewing && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '540px', width: '90%' }}>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>🔍 Conferência Formal de Assinatura (Gate C)</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0 0 1rem 0' }}>
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
                  backgroundColor: 'var(--surface-sunken)',
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
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checkParties}
                    onChange={(e) => setCheckParties(e.target.checked)}
                    style={{ marginTop: '0.2rem' }}
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
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checkPages}
                    onChange={(e) => setCheckPages(e.target.checked)}
                    style={{ marginTop: '0.2rem' }}
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
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checkVersion}
                    onChange={(e) => setCheckVersion(e.target.checked)}
                    style={{ marginTop: '0.2rem' }}
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
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checkSignatures}
                    onChange={(e) => setCheckSignatures(e.target.checked)}
                    style={{ marginTop: '0.2rem' }}
                  />
                  <span>
                    <strong>4. Legibilidade das Assinaturas:</strong> Assinaturas do contratante e
                    das testemunhas estão legíveis e identificadas.
                  </span>
                </label>
              </div>

              {/* Decision Toggle */}
              <div>
                <label className="form-label">Decisão da Conferência</label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <label
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.6rem',
                      border:
                        reviewDecision === 'VERIFIED'
                          ? '2px solid #16a34a'
                          : '1px solid var(--border-subtle)',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      backgroundColor: reviewDecision === 'VERIFIED' ? '#dcfce7' : 'transparent',
                    }}
                  >
                    <input
                      type="radio"
                      name="decision"
                      value="VERIFIED"
                      checked={reviewDecision === 'VERIFIED'}
                      onChange={() => setReviewDecision('VERIFIED')}
                    />
                    <span
                      style={{
                        fontWeight: 600,
                        color: reviewDecision === 'VERIFIED' ? '#15803d' : 'inherit',
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
                      padding: '0.6rem',
                      border:
                        reviewDecision === 'REJECTED'
                          ? '2px solid #ef4444'
                          : '1px solid var(--border-subtle)',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      backgroundColor: reviewDecision === 'REJECTED' ? '#fee2e2' : 'transparent',
                    }}
                  >
                    <input
                      type="radio"
                      name="decision"
                      value="REJECTED"
                      checked={reviewDecision === 'REJECTED'}
                      onChange={() => setReviewDecision('REJECTED')}
                    />
                    <span
                      style={{
                        fontWeight: 600,
                        color: reviewDecision === 'REJECTED' ? '#b91c1c' : 'inherit',
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
                    color: '#ef4444',
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
                style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}
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
                  gap: '0.5rem',
                  marginTop: '0.5rem',
                }}
              >
                <button
                  type="button"
                  className="btn btn--subtle"
                  onClick={() => setIsReviewing(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={reviewDecision === 'VERIFIED' ? 'btn btn--primary' : 'btn btn--danger'}
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
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
