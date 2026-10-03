'use client';
import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, result, allows } from '../identity/client';
import { Feedback } from '../identity/feedback';
import { Icon } from '../../components/icons/material-symbol';
import { Modal } from '../../components/ui/modal';

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
  milestones?: Array<{
    stage: string;
    percent: string;
    amount: string;
    due?: string;
    condition?: string;
  }>;
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

const formatBRL = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);


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

  // Payment configuration state (Anexo III)
  const [isEditingPayment, setIsEditingPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('PIX');
  const [downPaymentAmount, setDownPaymentAmount] = useState<string>('');
  const [milestones, setMilestones] = useState<
    Array<{ stage: string; percent: string; amount: string; due: string; condition: string }>
  >([]);

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

  // Close open modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCreating(false);
        setIsEditingPayment(false);
        setIsDelivering(false);
        setIsUploading(false);
        setIsReviewing(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  interface ProposalSummary {
    id: string;
    versions?: Array<{
      id: string;
      status: string;
      finalPrice?: number | string;
      totalInvestmentAmount?: number | string;
    }>;
  }

  // Fetch proposals to know proposal total & initial payment values
  const { data: proposals = [] } = useQuery({
    queryKey: ['proposals', opportunityId],
    queryFn: () =>
      result(
        api.GET('/api/v1/opportunities/{opportunityId}/proposals', {
          params: { path: { opportunityId } },
        }),
      ) as unknown as Promise<ProposalSummary[]>,
  });

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

  const acceptedProposal =
    proposals.flatMap((p) => p.versions || []).find((v) => v.status === 'ACCEPTED') ||
    proposals[0]?.versions?.[0];
  const finalPriceNum =
    Number(
      contract?.acceptedProposalVersion?.finalPrice ||
        acceptedProposal?.finalPrice ||
        acceptedProposal?.totalInvestmentAmount,
    ) || 35000;

  const getStandardMilestones = (total: number, method = 'PIX') => {
    if (method === 'FINANCIAMENTO') {
      return [
        {
          stage: 'Sinal / Entrada',
          percent: '10%',
          amount: `R$ ${(total * 0.1).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          due: 'Na assinatura do contrato',
          condition: 'Assinatura do contrato e comprovação do sinal',
        },
        {
          stage: 'Liberação do Financiamento Bancário',
          percent: '90%',
          amount: `R$ ${(total * 0.9).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          due: 'Após aprovação da CCB pelo banco parceiro',
          condition: 'Emissão e liquidação do contrato de financiamento solar',
        },
      ];
    }
    return [
      {
        stage: 'Assinatura do Contrato',
        percent: '30%',
        amount: `R$ ${(total * 0.3).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        due: 'Na assinatura do contrato',
        condition: 'Assinatura formal do instrumento contratual',
      },
      {
        stage: 'Faturamento e Entrega dos Equipamentos',
        percent: '40%',
        amount: `R$ ${(total * 0.4).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        due: 'Na entrega dos equipamentos',
        condition: 'Módulos e inversores descarregados e conferidos na obra',
      },
      {
        stage: 'Conclusão da Instalação',
        percent: '20%',
        amount: `R$ ${(total * 0.2).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        due: 'No término da montagem física',
        condition: 'Termo de conclusão de montagem e comissionamento assinado',
      },
      {
        stage: 'Homologação e Troca do Medidor',
        percent: '10%',
        amount: `R$ ${(total * 0.1).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        due: 'Após homologação pela concessionária',
        condition: 'Parecer de acesso aprovado e medidor bidirecional instalado',
      },
    ];
  };

  const initMilestonesForCreation = () => {
    if (milestones.length === 0) {
      setMilestones(getStandardMilestones(finalPriceNum, paymentMethod));
      setDownPaymentAmount((finalPriceNum * 0.3).toFixed(2));
    }
    setIsCreating(true);
  };

  const openEditPaymentModal = () => {
    const activeVer = contract?.versions?.[0];
    const snap = activeVer?.commercialSnapshot;
    if (snap?.paymentMethod) {
      setPaymentMethod(snap.paymentMethod);
    }
    if (Array.isArray(snap?.milestones) && snap.milestones.length > 0) {
      setMilestones(
        snap.milestones.map((m) => ({
          stage: m.stage || '',
          percent: m.percent || '',
          amount: m.amount || '',
          due: m.due || 'Conforme cronograma',
          condition: m.condition || 'Conclusão da etapa',
        })),
      );
    } else {
      setMilestones(getStandardMilestones(finalPriceNum, snap?.paymentMethod || 'PIX'));
    }
    setIsEditingPayment(true);
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: () => {
      const activeMilestones =
        milestones.length > 0 ? milestones : getStandardMilestones(finalPriceNum, paymentMethod);
      return result(
        api.POST('/api/v1/contracts', {
          body: {
            opportunityId,
            signingCity,
            roofType,
            notes: contractNotes || undefined,
            paymentMethod,
            downPaymentAmount: Number(downPaymentAmount) || undefined,
            installmentCount: activeMilestones.length,
            milestones: activeMilestones,
          },
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts', opportunityId] });
      setIsCreating(false);
      onRefresh?.();
    },
  });

  const updatePaymentMutation = useMutation({
    mutationFn: () => {
      if (!contract) return Promise.reject(new Error('Contrato não selecionado'));
      const activeMilestones =
        milestones.length > 0 ? milestones : getStandardMilestones(finalPriceNum, paymentMethod);
      return result(
        api.PATCH('/api/v1/contracts/{id}/draft', {
          params: { path: { id: contract.id } },
          body: {
            paymentMethod,
            downPaymentAmount: Number(downPaymentAmount) || undefined,
            installmentCount: activeMilestones.length,
            milestones: activeMilestones,
          },
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts', opportunityId] });
      setIsEditingPayment(false);
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
                  <Icon name="verified" size={18} /> Gate C Superado — Contrato Ativo e Verificado
                </span>
              ) : (
                <span
                  style={{ color: '#ca8a04', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Icon name="schedule" size={18} /> Gate C Pendente — Aguardando Assinatura e Conferência Formal
                </span>
              )}
            </div>
          </div>

          {!readonly && !contract && canCreate && (
            <button
              type="button"
              className="btn btn--primary"
              onClick={initMilestonesForCreation}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#087443',
                color: '#ffffff',
                fontWeight: 700,
                padding: '0.6rem 1.25rem',
                borderRadius: 'var(--radius-sm, 6px)',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
              }}
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
          <div>
            <Icon name="description" size={48} style={{ color: '#94a3b8' }} />
          </div>
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
              onClick={initMilestonesForCreation}
              style={{
                marginTop: '0.75rem',
                backgroundColor: '#087443',
                color: '#ffffff',
                fontWeight: 700,
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                borderRadius: 'var(--radius-sm, 6px)',
                boxShadow: '0 2px 5px rgba(0, 0, 0, 0.18)',
              }}
            >
              + Gerar Minuta Contratual (DOCX & PDF)
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
                <Icon name="description" size={24} style={{ color: '#087443' }} />
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
              <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
                {!readonly && (contract.state === 'READY' || contract.state === 'DRAFT') && (
                  <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={openEditPaymentModal}
                    style={{
                      backgroundColor: '#f0fdf4',
                      color: '#087443',
                      border: '1.5px solid #087443',
                      fontWeight: 700,
                      padding: '0.5rem 1rem',
                      fontSize: '0.875rem',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <Icon name="credit_card" size={16} /> Ajustar Parcelas & Forma de Pagamento (Anexo III)
                  </button>
                )}

                {!readonly &&
                  (contract.state === 'READY' || contract.state === 'SENT') &&
                  canSend && (
                    <button
                      type="button"
                      className="btn btn--secondary"
                      onClick={() => setIsDelivering(true)}
                      style={{
                        backgroundColor: '#ffffff',
                        color: '#087443',
                        border: '1.5px solid #087443',
                        fontWeight: 600,
                        padding: '0.5rem 1rem',
                        fontSize: '0.875rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      <Icon name="send" size={16} /> Registrar Envio
                    </button>
                  )}

                {!readonly &&
                  (contract.state === 'SENT' ||
                    contract.state === 'READY' ||
                    contract.state === 'SIGNED_UPLOADED') &&
                  canUpload && (
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={() => setIsUploading(true)}
                      style={{
                        backgroundColor: '#0284c7',
                        color: '#ffffff',
                        border: '1.5px solid #0369a1',
                        fontWeight: 600,
                        padding: '0.5rem 1rem',
                        fontSize: '0.875rem',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      <Icon name="upload_file" size={16} /> Anexar Via Assinada
                    </button>
                  )}

                {!readonly && contract.state === 'SIGNED_UPLOADED' && canVerify && (
                  <button
                    type="button"
                    className="btn btn--success"
                    onClick={() => {
                      setCheckParties(false);
                      setCheckPages(false);
                      setCheckVersion(false);
                      setCheckSignatures(false);
                      setReviewDecision('VERIFIED');
                      setIsReviewing(true);
                    }}
                    style={{
                      backgroundColor: '#15803d',
                      color: '#ffffff',
                      border: '1.5px solid #166534',
                      fontWeight: 700,
                      padding: '0.5rem 1.1rem',
                      fontSize: '0.875rem',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.18)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <Icon name="search" size={16} /> Conferência de Assinatura (Gate C)
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
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Icon name="description" size={16} /> Minuta Editável (DOCX)
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
                    className="btn btn--subtle"
                    style={{
                      fontSize: '0.8125rem',
                      padding: '0.4rem 0.85rem',
                      fontWeight: 600,
                      backgroundColor: '#f1f5f9',
                      color: '#0f172a',
                      border: '1px solid #cbd5e1',
                    }}
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
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Icon name="description" size={16} /> Contrato Formal (PDF)
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
                    className="btn btn--primary"
                    style={{
                      fontSize: '0.8125rem',
                      padding: '0.4rem 0.85rem',
                      fontWeight: 600,
                      backgroundColor: '#0284c7',
                      color: '#ffffff',
                      border: '1px solid #0369a1',
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
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Icon name="verified" size={16} /> Via Assinada Anexada
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {Math.round(signedDoc.fileSize / 1024)} KB • {signedDoc.fileName}
                    </div>
                  </div>
                  {canDownload && (
                    <a
                      href={`/api/v1/contracts/${contract.id}/signed`}
                      className="btn btn--success"
                      style={{
                        fontSize: '0.8125rem',
                        padding: '0.4rem 0.85rem',
                        fontWeight: 600,
                        backgroundColor: '#15803d',
                        color: '#ffffff',
                        border: '1px solid #166534',
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
          <div
            className="card"
            style={{
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: '1.125rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <Icon name="checklist" size={20} /> Etapas e Ações do Contrato (Gate C)
              </h3>
              <p
                style={{
                  margin: '0.25rem 0 0 0',
                  fontSize: '0.875rem',
                  color: 'var(--text-muted)',
                }}
              >
                Acompanhe as 4 etapas necessárias para homologar o contrato com validade jurídica e
                liberar a oportunidade.
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '1rem',
              }}
            >
              {/* Step 1: Minutas */}
              <div
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-sm, 6px)',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f8fafc',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  justifyContent: 'space-between',
                }}
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
                    <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                      1. Minutas do Contrato
                    </span>
                    <span
                      style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#15803d',
                        backgroundColor: '#dcfce7',
                      }}
                    >
                      ✓ Concluído
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8125rem', color: '#475569' }}>
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
                        backgroundColor: '#0284c7',
                        color: '#ffffff',
                        border: '1px solid #0369a1',
                        fontWeight: 600,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <Icon name="download" size={14} /> Baixar PDF
                    </a>
                  )}
                  {docxDoc && canDownload && (
                    <a
                      href={`/api/v1/contracts/${contract.id}/docx`}
                      download
                      className="btn btn--subtle"
                      style={{
                        fontSize: '0.8125rem',
                        padding: '0.45rem 0.8rem',
                        backgroundColor: '#ffffff',
                        color: '#334155',
                        border: '1px solid #cbd5e1',
                        fontWeight: 600,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <Icon name="download" size={14} /> Baixar DOCX
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
                const hasMilestones = Boolean(
                  activeVersion?.commercialSnapshot?.milestones &&
                    activeVersion.commercialSnapshot.milestones.length > 0,
                );
                return (
                  <div
                    style={{
                      padding: '1rem',
                      borderRadius: 'var(--radius-sm, 6px)',
                      border: isCurrent
                        ? '2px solid #087443'
                        : isSent
                          ? '1px solid #cbd5e1'
                          : '1px solid #e2e8f0',
                      backgroundColor: isCurrent
                        ? 'rgba(8, 116, 67, 0.05)'
                        : isSent
                          ? '#f8fafc'
                          : '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                      justifyContent: 'space-between',
                      boxShadow: isCurrent ? '0 2px 6px rgba(8, 116, 67, 0.12)' : 'none',
                    }}
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
                        <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                          2. Envio da Minuta
                        </span>
                        <span
                          style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: isSent ? '#15803d' : isCurrent ? '#087443' : '#64748b',
                            backgroundColor: isSent ? '#dcfce7' : isCurrent ? '#e2f3e9' : '#f1f5f9',
                          }}
                        >
                          {isSent ? '✓ Enviado' : isCurrent ? 'Ação Pendente' : 'Pendente'}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8125rem', color: '#475569' }}>
                        {isSent
                          ? `Enviado via ${contract.deliveries[0]?.channel} para ${contract.deliveries[0]?.recipient}.`
                          : 'Envie a minuta ao cliente e registre o canal (WhatsApp/E-mail) para controle de prazos.'}
                      </p>

                      {isCurrent && (
                        <div
                          style={{
                            marginTop: '0.5rem',
                            padding: '0.35rem 0.6rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            backgroundColor: hasMilestones ? '#f0fdf4' : '#fffbeb',
                            color: hasMilestones ? '#166534' : '#92400e',
                            border: hasMilestones ? '1px solid #bbf7d0' : '1px solid #fde68a',
                          }}
                        >
                          <Icon name={hasMilestones ? 'verified' : 'warning'} size={14} />
                          <span>
                            {hasMilestones
                              ? `${activeVersion?.commercialSnapshot?.milestones?.length} parcela(s) configurada(s) no Anexo III`
                              : 'Atenção: Configure as parcelas antes de registrar o envio'}
                          </span>
                        </div>
                      )}
                    </div>

                    {!readonly && canSend && (
                      <button
                        type="button"
                        className={isCurrent ? 'btn btn--primary' : 'btn btn--secondary'}
                        onClick={() => {
                          if (!hasMilestones) {
                            openEditPaymentModal();
                          } else {
                            setIsDelivering(true);
                          }
                        }}
                        style={{
                          fontSize: '0.8125rem',
                          padding: '0.5rem 0.9rem',
                          fontWeight: 700,
                          backgroundColor: isCurrent ? '#087443' : '#ffffff',
                          color: isCurrent ? '#ffffff' : '#087443',
                          border: isCurrent ? '1px solid #045c34' : '1.5px solid #087443',
                          boxShadow: isCurrent ? '0 2px 4px rgba(0, 0, 0, 0.15)' : 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        <Icon name={!hasMilestones ? 'payments' : 'send'} size={16} />
                        <span>
                          {!hasMilestones
                            ? 'Configurar Parcelas (Anexo III)'
                            : isSent
                              ? 'Registrar Novo Envio'
                              : 'Registrar Envio da Minuta'}
                        </span>
                      </button>
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
                    style={{
                      padding: '1rem',
                      borderRadius: 'var(--radius-sm, 6px)',
                      border: isCurrent
                        ? '2px solid #0284c7'
                        : hasUploaded
                          ? '1px solid #cbd5e1'
                          : '1px solid #e2e8f0',
                      backgroundColor: isCurrent
                        ? 'rgba(2, 132, 199, 0.05)'
                        : hasUploaded
                          ? '#f8fafc'
                          : '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                      justifyContent: 'space-between',
                      boxShadow: isCurrent ? '0 2px 6px rgba(2, 132, 199, 0.12)' : 'none',
                    }}
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
                        <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                          3. Assinatura do Cliente
                        </span>
                        <span
                          style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: hasUploaded ? '#15803d' : isCurrent ? '#0369a1' : '#64748b',
                            backgroundColor: hasUploaded
                              ? '#dcfce7'
                              : isCurrent
                                ? '#e0f2fe'
                                : '#f1f5f9',
                          }}
                        >
                          {hasUploaded
                            ? '✓ Anexado'
                            : isCurrent
                              ? 'Ação Pendente'
                              : 'Aguardando'}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8125rem', color: '#475569' }}>
                        {signedDoc
                          ? `Via assinada anexada (${Math.round(signedDoc.fileSize / 1024)} KB) pronta para conferência.`
                          : 'Colete a assinatura física ou eletrônica (DocuSign/Gov.br) e faça o upload do PDF assinado.'}
                      </p>
                    </div>

                    {!readonly && canUpload && (
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className={hasUploaded ? 'btn btn--secondary' : 'btn btn--primary'}
                          onClick={() => setIsUploading(true)}
                          style={{
                            fontSize: '0.8125rem',
                            padding: '0.5rem 0.9rem',
                            fontWeight: 700,
                            backgroundColor: hasUploaded ? '#ffffff' : '#0284c7',
                            color: hasUploaded ? '#0284c7' : '#ffffff',
                            border: hasUploaded ? '1.5px solid #0284c7' : '1px solid #0369a1',
                            boxShadow: hasUploaded ? 'none' : '0 2px 4px rgba(0, 0, 0, 0.15)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                          }}
                        >
                          <Icon name="upload_file" size={14} />
                          {hasUploaded ? 'Substituir Via Assinada' : 'Anexar Contrato Assinado'}
                        </button>
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
                    style={{
                      padding: '1rem',
                      borderRadius: 'var(--radius-sm, 6px)',
                      border: isReadyForReview
                        ? '2px solid #16a34a'
                        : isSatisfied
                          ? '1px solid #16a34a'
                          : '1px solid #e2e8f0',
                      backgroundColor: isReadyForReview
                        ? 'rgba(22, 163, 74, 0.08)'
                        : isSatisfied
                          ? '#f0fdf4'
                          : '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                      justifyContent: 'space-between',
                      boxShadow: isReadyForReview ? '0 2px 8px rgba(22, 163, 74, 0.2)' : 'none',
                    }}
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
                        <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                          4. Conferência Gate C
                        </span>
                        <span
                          style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: isSatisfied
                              ? '#15803d'
                              : isReadyForReview
                                ? '#15803d'
                                : '#64748b',
                            backgroundColor: isSatisfied
                              ? '#dcfce7'
                              : isReadyForReview
                                ? '#dcfce7'
                                : '#f1f5f9',
                          }}
                        >
                          {isSatisfied
                            ? '✓ Gate C Liberado'
                            : isReadyForReview
                              ? 'Pronto p/ Conferência'
                              : 'Bloqueado'}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8125rem', color: '#475569' }}>
                        {isSatisfied
                          ? 'Contrato conferido e homologado. As 4 regras de governança foram atendidas.'
                          : isReadyForReview
                            ? 'Valide partes, páginas, versão e assinaturas para ativar o contrato e liberar o Gate C.'
                            : 'Disponível após o anexo da via assinada pelo cliente.'}
                      </p>
                    </div>

                    {!readonly && isReadyForReview && canVerify && (
                      <button
                        type="button"
                        className="btn btn--success"
                        onClick={() => {
                          setCheckParties(false);
                          setCheckPages(false);
                          setCheckVersion(false);
                          setCheckSignatures(false);
                          setReviewDecision('VERIFIED');
                          setIsReviewing(true);
                        }}
                        style={{
                          fontSize: '0.875rem',
                          padding: '0.6rem 1.1rem',
                          fontWeight: 700,
                          backgroundColor: '#15803d',
                          color: '#ffffff',
                          border: '1px solid #166534',
                          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.18)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                        }}
                      >
                        <Icon name="search" size={16} /> Realizar Conferência Gate C
                      </button>
                    )}

                    {isSatisfied && (
                      <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>
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
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <Icon name="person" size={18} /> Partes Contratantes
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
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <Icon name="bolt" size={18} /> Solução Técnica & Equipamentos (Anexo I)
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
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <Icon name="payments" size={18} /> Investimento & Cronograma Financeiro
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

                  {!readonly && (contract.state === 'READY' || contract.state === 'DRAFT') && (
                    <button
                      type="button"
                      onClick={openEditPaymentModal}
                      style={{
                        marginTop: '0.5rem',
                        backgroundColor: '#f0fdf4',
                        color: '#15803d',
                        border: '1px solid #86efac',
                        borderRadius: '4px',
                        padding: '0.4rem 0.75rem',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        width: 'fit-content',
                      }}
                    >
                      <Icon name="edit" size={16} /> Ajustar Parcelas e Forma de Pagamento (Anexo III)
                    </button>
                  )}
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
              <h4
                style={{
                  margin: '0 0 0.75rem 0',
                  fontSize: '0.9375rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <Icon name="send" size={18} /> Histórico de Envios ao Cliente
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
              <h4
                style={{
                  margin: '0 0 0.75rem 0',
                  fontSize: '0.9375rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <Icon name="search" size={18} /> Histórico de Conferência de Assinaturas
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
                          style={{
                            color: rev.decision === 'VERIFIED' ? '#16a34a' : '#ef4444',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}
                        >
                          {rev.decision === 'VERIFIED' ? (
                            <>
                              <Icon name="verified" size={16} /> Aprovado (VERIFIED)
                            </>
                          ) : (
                            <>
                              <Icon name="close" size={16} /> Rejeitado (REJECTED)
                            </>
                          )}
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
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCreating(false);
          }}
        >
          <div
            className="modal-card"
            style={{ maxWidth: '680px', width: '92%', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.75rem',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <Icon name="description" size={20} /> Gerar Contrato Comercial Moura Solar
              </h3>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                aria-label="Fechar modal"
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
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                <Icon name="close" size={18} />
              </button>
            </div>
            <p
              style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0 0 1.25rem 0' }}
            >
              Gera a minuta contratual padrão com 14 cláusulas e Anexos I, II, III e IV. Defina a
              forma de pagamento e os marcos (Anexo III) antes de prosseguir com a emissão.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate();
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '0.75rem',
                }}
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
              </div>

              {/* Seção Anexo III - Forma de Pagamento e Parcelas */}
              <div
                style={{
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '1rem',
                  backgroundColor: '#f8fafc',
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
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#087443', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Icon name="payments" size={18} /> Anexo III — Condições de Pagamento & Parcelas
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: '#475569' }}>
                    Valor Total Proposta:{' '}
                    <strong>
                      R${' '}
                      {finalPriceNum.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </strong>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '0.75rem',
                  }}
                >
                  <label
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                    }}
                  >
                    Forma de Pagamento
                    <select
                      className="form-input"
                      value={paymentMethod}
                      onChange={(e) => {
                        const newMethod = e.target.value;
                        setPaymentMethod(newMethod);
                        setMilestones(getStandardMilestones(finalPriceNum, newMethod));
                      }}
                    >
                      <option value="PIX">À Vista (PIX / Transferência Bancária)</option>
                      <option value="FINANCIAMENTO">Financiamento Bancário (Solar)</option>
                      <option value="CARTAO">Cartão de Crédito / Parcelado</option>
                      <option value="PERSONALIZADO">Personalizado por Marcos da Obra</option>
                    </select>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                    }}
                  >
                    Valor da Entrada (R$)
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      placeholder="Ex: 5000.00"
                      value={downPaymentAmount}
                      onChange={(e) => setDownPaymentAmount(e.target.value)}
                    />
                  </label>
                </div>

                {/* Tabela interativa de marcos */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.4rem',
                    }}
                  >
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>
                      Marcos de Pagamento (Anexo III)
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setMilestones(getStandardMilestones(finalPriceNum, paymentMethod))
                      }
                      style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '4px',
                        padding: '0.2rem 0.5rem',
                        fontSize: '0.75rem',
                        color: '#087443',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      ↺ Recalcular Padrão
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {milestones.map((m, idx) => (
                      <div
                        key={idx}
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '4px',
                          padding: '0.5rem',
                          display: 'grid',
                          gridTemplateColumns: '2fr 1fr 1.5fr',
                          gap: '0.5rem',
                          alignItems: 'center',
                          fontSize: '0.8125rem',
                        }}
                      >
                        <input
                          type="text"
                          className="form-input"
                          style={{ fontSize: '0.75rem', padding: '0.3rem' }}
                          value={m.stage}
                          onChange={(e) => {
                            const updated = [...milestones];
                            const current = updated[idx];
                            if (current) {
                              updated[idx] = { ...current, stage: e.target.value };
                              setMilestones(updated);
                            }
                          }}
                        />
                        <input
                          type="text"
                          className="form-input"
                          style={{ fontSize: '0.75rem', padding: '0.3rem' }}
                          value={m.percent}
                          onChange={(e) => {
                            const updated = [...milestones];
                            const current = updated[idx];
                            if (current) {
                              updated[idx] = { ...current, percent: e.target.value };
                              setMilestones(updated);
                            }
                          }}
                        />
                        <input
                          type="text"
                          className="form-input"
                          style={{ fontSize: '0.75rem', padding: '0.3rem' }}
                          value={m.amount}
                          onChange={(e) => {
                            const updated = [...milestones];
                            const current = updated[idx];
                            if (current) {
                              updated[idx] = { ...current, amount: e.target.value };
                              setMilestones(updated);
                            }
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <label
                className="form-label"
                style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}
              >
                Observações e Condições Especiais
                <textarea
                  className="form-input"
                  rows={2}
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
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    fontWeight: 600,
                    padding: '0.5rem 1rem',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={createMutation.isPending}
                  style={{
                    backgroundColor: '#087443',
                    color: '#ffffff',
                    fontWeight: 700,
                    padding: '0.5rem 1.25rem',
                    border: 'none',
                    borderRadius: '6px',
                  }}
                >
                  {createMutation.isPending ? 'Gerando Minutas...' : 'Confirmar e Emitir Contrato'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Payment Terms & Milestones (Anexo III) */}
      {isEditingPayment && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsEditingPayment(false);
          }}
        >
          <div
            className="modal-card"
            style={{ maxWidth: '680px', width: '92%', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.75rem',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <Icon name="payments" size={20} /> Condições de Pagamento & Parcelas (Anexo III)
              </h3>
              <button
                type="button"
                onClick={() => setIsEditingPayment(false)}
                aria-label="Fechar modal"
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
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                <Icon name="close" size={18} />
              </button>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0 0 1rem 0' }}>
              Conforme a regra do processo, as parcelas e formas de pagamento devem ser confirmadas
              antes do envio do contrato para assinatura. Ao salvar, as minutas DOCX e PDF e o plano
              financeiro serão atualizados.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updatePaymentMutation.mutate();
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '0.75rem',
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                  }}
                >
                  Forma de Pagamento
                  <select
                    className="form-input"
                    value={paymentMethod}
                    onChange={(e) => {
                      const newMethod = e.target.value;
                      setPaymentMethod(newMethod);
                      setMilestones(getStandardMilestones(finalPriceNum, newMethod));
                    }}
                  >
                    <option value="PIX">À Vista (PIX / Transferência Bancária)</option>
                    <option value="FINANCIAMENTO">Financiamento Bancário (Solar)</option>
                    <option value="CARTAO">Cartão de Crédito / Parcelado</option>
                    <option value="PERSONALIZADO">Personalizado por Marcos da Obra</option>
                  </select>
                </label>

                <label
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                  }}
                >
                  Valor da Entrada (R$)
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    placeholder="Ex: 5000.00"
                    value={downPaymentAmount}
                    onChange={(e) => setDownPaymentAmount(e.target.value)}
                  />
                </label>
              </div>

              {/* Tabela de Marcos */}
              <div
                style={{
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '1rem',
                  backgroundColor: '#f8fafc',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.5rem',
                  }}
                >
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#087443' }}>
                    Cronograma de Parcelas / Marcos
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setMilestones(getStandardMilestones(finalPriceNum, paymentMethod))
                    }
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      color: '#087443',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    ↺ Restaurar Proporções Padrão
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {milestones.map((m, idx) => (
                    <div
                      key={idx}
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '4px',
                        padding: '0.5rem',
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr 1.5fr',
                        gap: '0.5rem',
                        alignItems: 'center',
                        fontSize: '0.8125rem',
                      }}
                    >
                      <input
                        type="text"
                        className="form-input"
                        style={{ fontSize: '0.75rem', padding: '0.3rem' }}
                        value={m.stage}
                        placeholder="Etapa / Marco"
                        onChange={(e) => {
                          const updated = [...milestones];
                          const current = updated[idx];
                          if (current) {
                            updated[idx] = { ...current, stage: e.target.value };
                            setMilestones(updated);
                          }
                        }}
                      />
                      <input
                        type="text"
                        className="form-input"
                        style={{ fontSize: '0.75rem', padding: '0.3rem' }}
                        value={m.percent}
                        placeholder="%"
                        onChange={(e) => {
                          const updated = [...milestones];
                          const current = updated[idx];
                          if (current) {
                            updated[idx] = { ...current, percent: e.target.value };
                            setMilestones(updated);
                          }
                        }}
                      />
                      <input
                        type="text"
                        className="form-input"
                        style={{ fontSize: '0.75rem', padding: '0.3rem' }}
                        value={m.amount}
                        placeholder="R$ Valor"
                        onChange={(e) => {
                          const updated = [...milestones];
                          const current = updated[idx];
                          if (current) {
                            updated[idx] = { ...current, amount: e.target.value };
                            setMilestones(updated);
                          }
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {updatePaymentMutation.error && <Feedback error={updatePaymentMutation.error} />}

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
                  onClick={() => setIsEditingPayment(false)}
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    fontWeight: 600,
                    padding: '0.5rem 1rem',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={updatePaymentMutation.isPending}
                  style={{
                    backgroundColor: '#087443',
                    color: '#ffffff',
                    fontWeight: 700,
                    padding: '0.5rem 1.25rem',
                    border: 'none',
                    borderRadius: '6px',
                  }}
                >
                  {updatePaymentMutation.isPending
                    ? 'Salvando...'
                    : 'Salvar Condições e Atualizar Minutas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Record Delivery */}
      {isDelivering && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsDelivering(false);
          }}
        >
          <div className="modal-card" style={{ maxWidth: '520px', width: '92%' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <Icon name="send" size={20} /> Registrar Envio do Contrato
              </h3>
              <button
                type="button"
                onClick={() => setIsDelivering(false)}
                aria-label="Fechar modal"
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
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                <Icon name="close" size={18} />
              </button>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0 0 1rem 0' }}>
              Registre o canal e destinatário para fins de auditoria e acompanhamento comercial.
            </p>

            {/* Verificação Prévia Obrigatória das Condições de Pagamento e Parcelas (Anexo III) */}
            <div
              style={{
                padding: '0.875rem',
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                marginBottom: '1rem',
              }}
            >
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
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    color: '#102a23',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <Icon name="payments" size={16} /> Condições de Pagamento (Anexo III)
                </span>
                {!readonly && (contract.state === 'READY' || contract.state === 'DRAFT') && (
                  <button
                    type="button"
                    className="btn btn--subtle"
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.25rem 0.5rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                    onClick={() => {
                      setIsDelivering(false);
                      openEditPaymentModal();
                    }}
                  >
                    <Icon name="edit" size={14} /> Alterar Parcelas
                  </button>
                )}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: '0.4rem',
                  fontSize: '0.8125rem',
                }}
              >
                <div>
                  <span style={{ color: '#64748b' }}>Forma:</span>{' '}
                  <strong>
                    {activeVersion?.commercialSnapshot?.paymentMethod || 'À Vista (PIX)'}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Total Contratado:</span>{' '}
                  <strong style={{ color: '#15803d' }}>
                    {activeVersion?.commercialSnapshot?.contractTotal ||
                      formatBRL(Number(contract.acceptedProposalVersion?.finalPrice) || 0)}
                  </strong>
                </div>
              </div>

              {/* Resumo das Parcelas */}
              {activeVersion?.commercialSnapshot?.milestones &&
              activeVersion.commercialSnapshot.milestones.length > 0 ? (
                <div
                  style={{
                    marginTop: '0.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                    borderTop: '1px dashed #cbd5e1',
                    paddingTop: '0.5rem',
                  }}
                >
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
                    {activeVersion.commercialSnapshot.milestones.length} parcela(s) vinculada(s) à
                    minuta:
                  </span>
                  {activeVersion.commercialSnapshot.milestones.map((m, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '0.2rem 0.4rem',
                        backgroundColor: '#ffffff',
                        borderRadius: '4px',
                        border: '1px solid #e2e8f0',
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
              ) : (
                <div
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.5rem',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    color: '#991b1b',
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <Icon name="warning" size={16} />
                  <span>Nenhum marco cadastrado! É obrigatório configurar antes de enviar.</span>
                </div>
              )}
            </div>

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
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    fontWeight: 600,
                    padding: '0.5rem 1rem',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={
                    deliverMutation.isPending ||
                    !activeVersion?.commercialSnapshot?.milestones ||
                    activeVersion.commercialSnapshot.milestones.length === 0
                  }
                  style={{
                    backgroundColor: '#087443',
                    color: '#ffffff',
                    fontWeight: 700,
                    padding: '0.5rem 1.25rem',
                    border: 'none',
                    borderRadius: '6px',
                  }}
                >
                  {deliverMutation.isPending
                    ? 'Registrando...'
                    : !activeVersion?.commercialSnapshot?.milestones ||
                        activeVersion.commercialSnapshot.milestones.length === 0
                      ? 'Defina as Parcelas para Enviar'
                      : 'Registrar Envio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Upload Signed Contract */}
      {isUploading && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsUploading(false);
          }}
        >
          <div className="modal-card" style={{ maxWidth: '480px', width: '90%' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <Icon name="upload_file" size={20} /> Anexar Via Assinada pelo Cliente
              </h3>
              <button
                type="button"
                onClick={() => setIsUploading(false)}
                aria-label="Fechar modal"
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
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                <Icon name="close" size={18} />
              </button>
            </div>
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
                  placeholder="Ex.: Assinado digitalmente pelo contratante via DocuSign/Gov.br ou via física com rubricas."
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
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    fontWeight: 600,
                    padding: '0.5rem 1rem',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={uploadMutation.isPending || !uploadBase64}
                  style={{
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    fontWeight: 700,
                    padding: '0.5rem 1.25rem',
                    border: 'none',
                    borderRadius: '6px',
                  }}
                >
                  {uploadMutation.isPending ? 'Enviando...' : 'Anexar Documento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Formal Conference Checklist (Gate C) */}
      {isReviewing && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsReviewing(false);
          }}
        >
          <div className="modal-card" style={{ maxWidth: '540px', width: '90%' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <Icon name="checklist" size={20} /> Conferência Formal de Assinatura (Gate C)
              </h3>
              <button
                type="button"
                onClick={() => setIsReviewing(false)}
                aria-label="Fechar modal"
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
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                <Icon name="close" size={18} />
              </button>
            </div>
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
                    <strong>4. Legibilidade da Assinatura:</strong> Assinatura do contratante está
                    legível e devidamente identificada.
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
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <Icon name="check_circle" size={16} /> Aprovar e Liberar Gate C
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
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <Icon name="close" size={16} /> Rejeitar Documento
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
                    placeholder="Ex.: Falta rubrica na página 3 ou assinatura divergente do titular."
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
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    fontWeight: 600,
                    padding: '0.5rem 1rem',
                  }}
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
                  style={{
                    backgroundColor: reviewDecision === 'VERIFIED' ? '#15803d' : '#ef4444',
                    color: '#ffffff',
                    fontWeight: 700,
                    padding: '0.5rem 1.25rem',
                    border: 'none',
                    borderRadius: '6px',
                  }}
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
