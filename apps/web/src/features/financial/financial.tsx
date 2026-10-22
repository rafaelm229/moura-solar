'use client';
import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, result } from '../identity/client';
import { Feedback } from '../identity/feedback';
import { Icon } from '../../components/icons/material-symbol';

export interface ReceivableView {
  id: string;
  installmentNumber: number;
  title: string;
  originalAmount: number | string;
  paidAmount: number | string;
  outstandingAmount: number | string;
  dueDate: string;
  status:
    'OPEN' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'RENEGOTIATED' | 'CANCELED' | 'WRITTEN_OFF';
  notes?: string | null;
  allocations?: Array<{
    id: string;
    receiptId: string;
    allocatedPrincipal: number | string;
    interestAmount: number | string;
    discountAmount: number | string;
    status: string;
    receipt?: {
      id: string;
      effectiveDate: string;
      paymentMethod: string;
      payerName?: string | null;
      status: string;
    };
  }>;
}

export interface PayableView {
  id: string;
  category: string;
  description: string;
  recipient: string;
  recipientTaxId?: string | null;
  originalAmount: number | string;
  paidAmount: number | string;
  outstandingAmount: number | string;
  dueDate: string;
  status: 'OPEN' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELED';
  notes?: string | null;
  allocations?: Array<{
    id: string;
    paymentId: string;
    allocatedAmount: number | string;
    status: string;
  }>;
}

export interface CommissionView {
  id: string;
  beneficiaryName: string;
  role: string;
  percentage: number | string;
  baseAmount: number | string;
  commissionAmount: number | string;
  triggerGate: string;
  status: 'ESTIMATED' | 'ACQUIRED' | 'PAID' | 'CANCELED';
  notes?: string | null;
  payableId?: string | null;
}

export interface FinancialSummaryResponse {
  opportunity: {
    id: string;
    code: string;
    title: string;
    state: string;
  };
  indicators: {
    contractedRevenue: number;
    receivedRevenue: number;
    openReceivables: number;
    overdueReceivables: number;
    recognizedCost: number;
    paidCost: number;
    actualGrossResult: number;
    projectedGrossResult: number;
    actualMarginPercent: number;
    projectedMarginPercent: number;
  };
  financialGate: {
    gateType: string;
    status: 'PENDING' | 'SATISFIED' | 'BLOCKED' | 'WAIVED';
    satisfiedAt?: string | null;
    evidenceSummary?: string | null;
  };
  activePaymentPlan?: {
    id: string;
    totalAmount: number | string;
    downPaymentAmount: number | string;
    installmentCount: number;
    paymentMethod: string;
    status: string;
  } | null;
  receivables: ReceivableView[];
  payables: PayableView[];
  commissions: CommissionView[];
}

export interface FinancialAccountView {
  id: string;
  name: string;
  accountType: string;
  bankCode?: string | null;
  agency?: string | null;
  accountNumber?: string | null;
  status: string;
}

export interface CashMovementView {
  id: string;
  direction: 'IN' | 'OUT';
  type: string;
  amount: number | string;
  currency: string;
  effectiveAt: string;
  status: string;
  description: string;
  account?: FinancialAccountView | null;
}

function formatBRL(val: number | string | undefined | null) {
  const num = typeof val === 'string' ? parseFloat(val) : (val ?? 0);
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(iso: string | undefined | null) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR');
}

export function OpportunityFinancial({
  opportunityId,
  opportunityCode,
  onUpdated,
}: {
  opportunityId: string;
  opportunityCode?: string;
  onUpdated?: () => void;
}) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'receivables' | 'payables' | 'commissions'>(
    'receivables',
  );

  // Modals state
  const [showGeneratePlanModal, setShowGeneratePlanModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showPayableModal, setShowPayableModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [showReverseModal, setShowReverseModal] = useState<{ receiptId: string } | null>(null);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowGeneratePlanModal(false);
        setShowReceiptModal(false);
        setShowPayableModal(false);
        setShowPaymentModal(false);
        setShowCommissionModal(false);
        setShowReverseModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Form states
  type PaymentMethodType =
    'PIX' | 'TED' | 'BOLETO' | 'CREDIT_CARD' | 'CASH' | 'FINANCING_RELEASE' | 'MIXED';

  type PayableCategoryType =
    | 'EQUIPMENT'
    | 'INSTALLATION_LABOR'
    | 'COMMISSION'
    | 'ENGINEERING_HOMOLOGATION'
    | 'FREIGHT'
    | 'OTHER';

  const [planTotal, setPlanTotal] = useState<number | ''>('');
  const [planDown, setPlanDown] = useState<number | ''>('');
  const [planInstallments, setPlanInstallments] = useState(3);
  const [planMethod, setPlanMethod] = useState<PaymentMethodType>('PIX');

  const [receiptAccount, setReceiptAccount] = useState('');
  const [receiptAmount, setReceiptAmount] = useState<number | ''>('');
  const [receiptMethod, setReceiptMethod] = useState<PaymentMethodType>('PIX');
  const [receiptPayer, setReceiptPayer] = useState('');
  const [receiptTargetReceivable, setReceiptTargetReceivable] = useState<string>('');

  const [payableCategory, setPayableCategory] = useState<PayableCategoryType>('EQUIPMENT');
  const [payableDesc, setPayableDesc] = useState('');
  const [payableRecipient, setPayableRecipient] = useState('');
  const [payableAmount, setPayableAmount] = useState<number | ''>('');
  const [payableDueDate, setPayableDueDate] = useState('');

  const [paymentAccount, setPaymentAccount] = useState('');
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('PIX');
  const [paymentTargetPayable, setPaymentTargetPayable] = useState<string>('');
  const [paymentDoc, setPaymentDoc] = useState('');

  const [commBeneficiary, setCommBeneficiary] = useState('');
  const [commRole, setCommRole] = useState('SALES_REP');
  const [commPercent, setCommPercent] = useState<number | ''>(3.0);
  const [commGate, setCommGate] = useState('FINANCIAL');

  const [reverseReason, setReverseReason] = useState('');

  // Queries
  const summaryQuery = useQuery({
    queryKey: ['financial-summary', opportunityId],
    queryFn: async () => {
      const res = await result(
        api.GET('/api/v1/opportunities/{opportunityId}/financial', {
          params: { path: { opportunityId } },
        }),
      );
      return res as unknown as FinancialSummaryResponse;
    },
    refetchOnWindowFocus: true,
  });

  const accountsQuery = useQuery({
    queryKey: ['financial-accounts'],
    queryFn: async () => {
      const res = await result(api.GET('/api/v1/financial/accounts'));
      return res as unknown as FinancialAccountView[];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['financial-summary', opportunityId] });
    queryClient.invalidateQueries({ queryKey: ['opportunity', opportunityId] });
    queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
    onUpdated?.();
  };

  // Mutations
  const generatePlanMutation = useMutation({
    mutationFn: async () => {
      return result(
        api.POST('/api/v1/opportunities/{opportunityId}/payment-plan/generate', {
          params: { path: { opportunityId } },
          body: {
            totalAmount: planTotal !== '' ? Number(planTotal) : undefined,
            downPaymentAmount: planDown !== '' ? Number(planDown) : 0,
            installmentCount: Number(planInstallments),
            paymentMethod: planMethod,
          },
        }),
      );
    },
    onSuccess: () => {
      setShowGeneratePlanModal(false);
      invalidate();
    },
  });

  const recordReceiptMutation = useMutation({
    mutationFn: async () => {
      const accountId = receiptAccount || accountsQuery.data?.[0]?.id;
      if (!accountId) throw new Error('Selecione uma conta bancária.');
      return result(
        api.POST('/api/v1/receipts', {
          body: {
            opportunityId,
            accountId,
            amount: Number(receiptAmount),
            paymentMethod: receiptMethod,
            payerName: receiptPayer || undefined,
            allocations: receiptTargetReceivable
              ? [
                  {
                    receivableId: receiptTargetReceivable,
                    allocatedPrincipal: Number(receiptAmount),
                    interestAmount: 0,
                    discountAmount: 0,
                  },
                ]
              : undefined,
          },
        }),
      );
    },
    onSuccess: () => {
      setShowReceiptModal(false);
      setReceiptAmount('');
      setReceiptPayer('');
      setReceiptTargetReceivable('');
      invalidate();
    },
  });

  const reverseReceiptMutation = useMutation({
    mutationFn: async (receiptId: string) => {
      return result(
        api.POST('/api/v1/receipts/{id}/reverse', {
          params: { path: { id: receiptId } },
          body: { reason: reverseReason || 'Estorno solicitado pelo operador' },
        }),
      );
    },
    onSuccess: () => {
      setShowReverseModal(null);
      setReverseReason('');
      invalidate();
    },
  });

  const createPayableMutation = useMutation({
    mutationFn: async () => {
      return result(
        api.POST('/api/v1/payables', {
          body: {
            opportunityId,
            category: payableCategory,
            description: payableDesc,
            recipient: payableRecipient,
            originalAmount: Number(payableAmount),
            dueDate: payableDueDate,
          },
        }),
      );
    },
    onSuccess: () => {
      setShowPayableModal(false);
      setPayableDesc('');
      setPayableRecipient('');
      setPayableAmount('');
      setPayableDueDate('');
      invalidate();
    },
  });

  const recordPaymentMutation = useMutation({
    mutationFn: async () => {
      const accountId = paymentAccount || accountsQuery.data?.[0]?.id;
      if (!accountId) throw new Error('Selecione uma conta financeira.');
      return result(
        api.POST('/api/v1/payments', {
          body: {
            accountId,
            amount: Number(paymentAmount),
            paymentMethod,
            documentNumber: paymentDoc || undefined,
            allocations: paymentTargetPayable
              ? [{ payableId: paymentTargetPayable, allocatedAmount: Number(paymentAmount) }]
              : undefined,
          },
        }),
      );
    },
    onSuccess: () => {
      setShowPaymentModal(false);
      setPaymentAmount('');
      setPaymentDoc('');
      setPaymentTargetPayable('');
      invalidate();
    },
  });

  const configureCommissionMutation = useMutation({
    mutationFn: async () => {
      return result(
        api.POST('/api/v1/commissions', {
          body: {
            opportunityId,
            beneficiaryName: commBeneficiary,
            role: commRole,
            percentage: Number(commPercent),
            triggerGate: commGate,
          },
        }),
      );
    },
    onSuccess: () => {
      setShowCommissionModal(false);
      setCommBeneficiary('');
      invalidate();
    },
  });

  if (summaryQuery.isLoading) {
    return <p className="loading">Carregando dados financeiros e margem...</p>;
  }

  const summary = summaryQuery.data;
  const indicators = summary?.indicators;
  const financialGate = summary?.financialGate;
  const receivables = summary?.receivables || [];
  const payables = summary?.payables || [];
  const commissions = summary?.commissions || [];

  return (
    <div
      className="financial-opportunity-view"
      style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
    >
      <Feedback
        error={
          generatePlanMutation.error ||
          recordReceiptMutation.error ||
          reverseReceiptMutation.error ||
          createPayableMutation.error ||
          recordPaymentMutation.error ||
          configureCommissionMutation.error
        }
      />

      {/* Gate Financeiro Status Banner */}
      <div
        className="gate-banner"
        style={{
          padding: '1rem 1.25rem',
          borderRadius: '8px',
          border: '1px solid',
          borderColor:
            financialGate?.status === 'SATISFIED'
              ? '#22c55e'
              : financialGate?.status === 'BLOCKED'
                ? '#ef4444'
                : '#f59e0b',
          backgroundColor:
            financialGate?.status === 'SATISFIED'
              ? '#f0fdf4'
              : financialGate?.status === 'BLOCKED'
                ? '#fef2f2'
                : '#fffbeb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              marginBottom: '0.25rem',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
              {financialGate?.status === 'SATISFIED' ? (
                <Icon name="verified" size={20} style={{ color: '#16a34a' }} />
              ) : (
                <Icon name="schedule" size={20} style={{ color: '#d97706' }} />
              )}
            </span>
            <strong style={{ fontSize: '1.05rem', color: '#1e293b' }}>
              Gate Financeiro {opportunityCode ? `[${opportunityCode}]` : ''} (Down Payment / Sinal)
            </strong>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.2rem 0.6rem',
                borderRadius: '999px',
                color: '#fff',
                backgroundColor:
                  financialGate?.status === 'SATISFIED'
                    ? '#16a34a'
                    : financialGate?.status === 'BLOCKED'
                      ? '#dc2626'
                      : '#d97706',
              }}
            >
              {financialGate?.status === 'SATISFIED'
                ? '✓ LIBERADO / SATISFEITO'
                : 'AGUARDANDO ENTRADA'}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569' }}>
            {financialGate?.evidenceSummary ||
              'Aguardando confirmação do pagamento do sinal/entrada para liberação dos suprimentos e compras.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            style={{
              backgroundColor: '#16a34a',
              color: '#ffffff',
              fontWeight: 600,
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
            onClick={() => {
              // Pre-select first open receivable (typically down payment)
              const firstOpen = receivables.find((r) =>
                ['OPEN', 'PARTIALLY_PAID'].includes(r.status),
              );
              if (firstOpen) {
                setReceiptTargetReceivable(firstOpen.id);
                setReceiptAmount(Number(firstOpen.outstandingAmount));
              }
              setShowReceiptModal(true);
            }}
          >
            <Icon name="payments" size={16} /> Registrar Recebimento
          </button>

          <button
            type="button"
            style={{
              backgroundColor: '#0284c7',
              color: '#ffffff',
              fontWeight: 600,
              padding: '0.5rem 0.85rem',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
            onClick={() => {
              if (summary?.activePaymentPlan) {
                setPlanTotal(Number(summary.activePaymentPlan.totalAmount));
                setPlanDown(Number(summary.activePaymentPlan.downPaymentAmount));
              }
              setShowGeneratePlanModal(true);
            }}
          >
            <Icon name="payments" size={16} />{' '}
            {summary?.activePaymentPlan ? 'Repactuar Plano' : 'Gerar Plano de Parcelas'}
          </button>
        </div>
      </div>

      {/* KPI Cards: Indicators & Margins */}
      <div
        className="kpi-grid"
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
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
            RECEITA CONTRATADA
          </span>
          <div
            style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', marginTop: '0.25rem' }}
          >
            {formatBRL(indicators?.contractedRevenue)}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Total comercial aprovado</span>
        </div>

        <div
          style={{
            background: '#f0fdf4',
            padding: '1rem',
            borderRadius: '8px',
            border: '1px solid #bbf7d0',
          }}
        >
          <span style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 600 }}>
            RECEBIDO (REALIZADO)
          </span>
          <div
            style={{ fontSize: '1.35rem', fontWeight: 700, color: '#15803d', marginTop: '0.25rem' }}
          >
            {formatBRL(indicators?.receivedRevenue)}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#16a34a' }}>
            {indicators?.contractedRevenue
              ? `${Math.round(((indicators.receivedRevenue || 0) / indicators.contractedRevenue) * 100)}% liquidado`
              : '0% liquidado'}
          </span>
        </div>

        <div
          style={{
            background: '#fffbeb',
            padding: '1rem',
            borderRadius: '8px',
            border: '1px solid #fde68a',
          }}
        >
          <span style={{ fontSize: '0.8rem', color: '#92400e', fontWeight: 600 }}>
            SALDO A RECEBER
          </span>
          <div
            style={{ fontSize: '1.35rem', fontWeight: 700, color: '#b45309', marginTop: '0.25rem' }}
          >
            {formatBRL(indicators?.openReceivables)}
          </div>
          {indicators?.overdueReceivables ? (
            <span
              style={{
                fontSize: '0.75rem',
                color: '#dc2626',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <Icon name="warning" size={14} /> {formatBRL(indicators.overdueReceivables)} vencido
            </span>
          ) : (
            <span style={{ fontSize: '0.75rem', color: '#16a34a' }}>Sem parcelas vencidas</span>
          )}
        </div>

        <div
          style={{
            background: '#f8fafc',
            padding: '1rem',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
          }}
        >
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
            CUSTOS PAGOS / ORÇADOS
          </span>
          <div
            style={{ fontSize: '1.25rem', fontWeight: 700, color: '#334155', marginTop: '0.25rem' }}
          >
            {formatBRL(indicators?.paidCost)}{' '}
            <span style={{ fontSize: '0.85rem', fontWeight: 400, color: '#64748b' }}>
              / {formatBRL(indicators?.recognizedCost)}
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Equipamentos, frete e comissões
          </span>
        </div>

        <div
          style={{
            background: (indicators?.actualGrossResult ?? 0) >= 0 ? '#f0fdf4' : '#fef2f2',
            padding: '1rem',
            borderRadius: '8px',
            border: '1px solid',
            borderColor: (indicators?.actualGrossResult ?? 0) >= 0 ? '#86efac' : '#fca5a5',
          }}
        >
          <span
            style={{
              fontSize: '0.8rem',
              fontWeight: 600,
              color: (indicators?.actualGrossResult ?? 0) >= 0 ? '#166534' : '#991b1b',
            }}
          >
            RESULTADO & MARGEM
          </span>
          <div
            style={{
              fontSize: '1.35rem',
              fontWeight: 700,
              color: (indicators?.actualGrossResult ?? 0) >= 0 ? '#15803d' : '#b91c1c',
              marginTop: '0.25rem',
            }}
          >
            {formatBRL(indicators?.actualGrossResult)}
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
            Margem Realizada: {indicators?.actualMarginPercent}% | Projetada:{' '}
            {indicators?.projectedMarginPercent}%
          </span>
        </div>
      </div>

      {/* Subtabs for Detail Tables */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '2px solid #e2e8f0',
          paddingBottom: '0.5rem',
        }}
      >
        <button
          type="button"
          style={{
            background: activeTab === 'receivables' ? '#087443' : 'transparent',
            color: activeTab === 'receivables' ? '#ffffff' : '#475569',
            border: activeTab === 'receivables' ? '1px solid #065f36' : '1px solid #cbd5e1',
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
          onClick={() => setActiveTab('receivables')}
        >
          <Icon name="receipt_long" size={16} /> Contas a Receber ({receivables.length})
        </button>

        <button
          type="button"
          style={{
            background: activeTab === 'payables' ? '#087443' : 'transparent',
            color: activeTab === 'payables' ? '#ffffff' : '#475569',
            border: activeTab === 'payables' ? '1px solid #065f36' : '1px solid #cbd5e1',
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
          onClick={() => setActiveTab('payables')}
        >
          <Icon name="attach_money" size={16} /> Custos & Contas a Pagar ({payables.length})
        </button>

        <button
          type="button"
          style={{
            background: activeTab === 'commissions' ? '#087443' : 'transparent',
            color: activeTab === 'commissions' ? '#ffffff' : '#475569',
            border: activeTab === 'commissions' ? '1px solid #065f36' : '1px solid #cbd5e1',
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
          onClick={() => setActiveTab('commissions')}
        >
          <Icon name="badge" size={16} /> Comissões ({commissions.length})
        </button>
      </div>

      {/* TAB 1: RECEIVABLES */}
      {activeTab === 'receivables' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0 }}>Cronograma de Parcelas & Recebimentos</h4>
            <button
              type="button"
              style={{
                backgroundColor: '#16a34a',
                color: '#fff',
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              onClick={() => {
                setReceiptTargetReceivable('');
                setShowReceiptModal(true);
              }}
            >
              + Novo Recebimento
            </button>
          </div>

          {receivables.length === 0 ? (
            <div
              style={{
                padding: '2rem',
                textAlign: 'center',
                background: '#f8fafc',
                borderRadius: '8px',
              }}
            >
              <p style={{ color: '#64748b' }}>
                Nenhum plano de pagamento gerado ainda para esta oportunidade.
              </p>
              <button
                type="button"
                style={{
                  backgroundColor: '#0284c7',
                  color: '#fff',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                }}
                onClick={() => setShowGeneratePlanModal(true)}
              >
                Gerar Plano de Parcelas Automaticamente
              </button>
            </div>
          ) : (
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '0.9rem',
              }}
            >
              <thead>
                <tr style={{ borderBottom: '2px solid #cbd5e1', color: '#475569' }}>
                  <th style={{ padding: '0.5rem' }}>#</th>
                  <th style={{ padding: '0.5rem' }}>Identificação</th>
                  <th style={{ padding: '0.5rem' }}>Valor Original</th>
                  <th style={{ padding: '0.5rem' }}>Valor Pago</th>
                  <th style={{ padding: '0.5rem' }}>Saldo em Aberto</th>
                  <th style={{ padding: '0.5rem' }}>Vencimento</th>
                  <th style={{ padding: '0.5rem' }}>Status</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {receivables.map((rec) => {
                  const isPaid = rec.status === 'PAID';
                  const isOverdue =
                    rec.status === 'OVERDUE' || (new Date(rec.dueDate) < new Date() && !isPaid);
                  return (
                    <tr
                      key={rec.id}
                      style={{
                        borderBottom: '1px solid #e2e8f0',
                        background: isPaid ? '#f0fdf4' : undefined,
                      }}
                    >
                      <td style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>
                        {rec.installmentNumber}
                      </td>
                      <td style={{ padding: '0.6rem 0.5rem' }}>
                        <strong>{rec.title}</strong>
                        {rec.notes && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{rec.notes}</div>
                        )}
                      </td>
                      <td style={{ padding: '0.6rem 0.5rem' }}>{formatBRL(rec.originalAmount)}</td>
                      <td style={{ padding: '0.6rem 0.5rem', color: '#16a34a', fontWeight: 600 }}>
                        {formatBRL(rec.paidAmount)}
                      </td>
                      <td style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>
                        {formatBRL(rec.outstandingAmount)}
                      </td>
                      <td
                        style={{
                          padding: '0.6rem 0.5rem',
                          color: isOverdue ? '#dc2626' : undefined,
                          fontWeight: isOverdue ? 700 : 400,
                        }}
                      >
                        {formatDate(rec.dueDate)}
                      </td>
                      <td style={{ padding: '0.6rem 0.5rem' }}>
                        <span
                          style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor:
                              rec.status === 'PAID'
                                ? '#bbf7d0'
                                : rec.status === 'PARTIALLY_PAID'
                                  ? '#fed7aa'
                                  : isOverdue
                                    ? '#fecaca'
                                    : '#e2e8f0',
                            color:
                              rec.status === 'PAID'
                                ? '#166534'
                                : rec.status === 'PARTIALLY_PAID'
                                  ? '#9a3412'
                                  : isOverdue
                                    ? '#991b1b'
                                    : '#334155',
                          }}
                        >
                          {rec.status === 'PAID'
                            ? 'LIQUIDADO'
                            : rec.status === 'PARTIALLY_PAID'
                              ? 'PARCIAL'
                              : isOverdue
                                ? 'VENCIDO'
                                : 'EM ABERTO'}
                        </span>
                      </td>
                      <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                          {!isPaid && (
                            <button
                              type="button"
                              style={{
                                backgroundColor: '#16a34a',
                                color: '#fff',
                                border: 'none',
                                padding: '0.25rem 0.6rem',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                              }}
                              onClick={() => {
                                setReceiptTargetReceivable(rec.id);
                                setReceiptAmount(Number(rec.outstandingAmount));
                                setShowReceiptModal(true);
                              }}
                            >
                              Receber
                            </button>
                          )}
                          {rec.allocations && rec.allocations.length > 0 && (
                            <button
                              type="button"
                              style={{
                                backgroundColor: '#fee2e2',
                                color: '#991b1b',
                                border: '1px solid #f87171',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                              }}
                              onClick={() => {
                                const lastAlloc = rec.allocations?.[rec.allocations.length - 1];
                                if (lastAlloc) {
                                  setShowReverseModal({ receiptId: lastAlloc.receiptId });
                                }
                              }}
                            >
                              Estornar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB 2: PAYABLES */}
      {activeTab === 'payables' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0 }}>Obrigações a Pagar do Projeto</h4>
            <button
              type="button"
              style={{
                backgroundColor: '#0284c7',
                color: '#fff',
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              onClick={() => setShowPayableModal(true)}
            >
              + Adicionar Custo / Despesa
            </button>
          </div>

          {payables.length === 0 ? (
            <div
              style={{
                padding: '2rem',
                textAlign: 'center',
                background: '#f8fafc',
                borderRadius: '8px',
              }}
            >
              <p style={{ color: '#64748b' }}>
                Nenhum custo ou obrigação a pagar cadastrada para este projeto.
              </p>
              <button
                type="button"
                style={{
                  backgroundColor: '#0284c7',
                  color: '#fff',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                }}
                onClick={() => setShowPayableModal(true)}
              >
                Cadastrar Custo de Equipamento ou Serviço
              </button>
            </div>
          ) : (
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '0.9rem',
              }}
            >
              <thead>
                <tr style={{ borderBottom: '2px solid #cbd5e1', color: '#475569' }}>
                  <th style={{ padding: '0.5rem' }}>Categoria</th>
                  <th style={{ padding: '0.5rem' }}>Descrição / Fornecedor</th>
                  <th style={{ padding: '0.5rem' }}>Valor Original</th>
                  <th style={{ padding: '0.5rem' }}>Pago</th>
                  <th style={{ padding: '0.5rem' }}>Saldo</th>
                  <th style={{ padding: '0.5rem' }}>Vencimento</th>
                  <th style={{ padding: '0.5rem' }}>Status</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {payables.map((p) => {
                  const isPaid = p.status === 'PAID';
                  return (
                    <tr
                      key={p.id}
                      style={{
                        borderBottom: '1px solid #e2e8f0',
                        background: isPaid ? '#f0fdf4' : undefined,
                      }}
                    >
                      <td style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>{p.category}</td>
                      <td style={{ padding: '0.6rem 0.5rem' }}>
                        <div>
                          <strong>{p.description}</strong>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.recipient}</div>
                      </td>
                      <td style={{ padding: '0.6rem 0.5rem' }}>{formatBRL(p.originalAmount)}</td>
                      <td style={{ padding: '0.6rem 0.5rem', color: '#16a34a' }}>
                        {formatBRL(p.paidAmount)}
                      </td>
                      <td style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>
                        {formatBRL(p.outstandingAmount)}
                      </td>
                      <td style={{ padding: '0.6rem 0.5rem' }}>{formatDate(p.dueDate)}</td>
                      <td style={{ padding: '0.6rem 0.5rem' }}>
                        <span
                          style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: isPaid ? '#bbf7d0' : '#fed7aa',
                            color: isPaid ? '#166534' : '#9a3412',
                          }}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right' }}>
                        {!isPaid && (
                          <button
                            type="button"
                            style={{
                              backgroundColor: '#0284c7',
                              color: '#fff',
                              border: 'none',
                              padding: '0.25rem 0.6rem',
                              borderRadius: '4px',
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                            }}
                            onClick={() => {
                              setPaymentTargetPayable(p.id);
                              setPaymentAmount(Number(p.outstandingAmount));
                              setShowPaymentModal(true);
                            }}
                          >
                            Pagar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB 3: COMMISSIONS */}
      {activeTab === 'commissions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0 }}>Comissões da Oportunidade</h4>
            <button
              type="button"
              style={{
                backgroundColor: '#0284c7',
                color: '#fff',
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              onClick={() => setShowCommissionModal(true)}
            >
              + Nova Comissão
            </button>
          </div>

          {commissions.length === 0 ? (
            <p style={{ color: '#64748b' }}>Nenhuma comissão configurada.</p>
          ) : (
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '0.9rem',
              }}
            >
              <thead>
                <tr style={{ borderBottom: '2px solid #cbd5e1', color: '#475569' }}>
                  <th style={{ padding: '0.5rem' }}>Beneficiário</th>
                  <th style={{ padding: '0.5rem' }}>Papel</th>
                  <th style={{ padding: '0.5rem' }}>%</th>
                  <th style={{ padding: '0.5rem' }}>Valor Base</th>
                  <th style={{ padding: '0.5rem' }}>Comissão</th>
                  <th style={{ padding: '0.5rem' }}>Gatilho de Aquisição</th>
                  <th style={{ padding: '0.5rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>
                      {c.beneficiaryName}
                    </td>
                    <td style={{ padding: '0.6rem 0.5rem' }}>{c.role}</td>
                    <td style={{ padding: '0.6rem 0.5rem' }}>{c.percentage}%</td>
                    <td style={{ padding: '0.6rem 0.5rem' }}>{formatBRL(c.baseAmount)}</td>
                    <td style={{ padding: '0.6rem 0.5rem', color: '#16a34a', fontWeight: 700 }}>
                      {formatBRL(c.commissionAmount)}
                    </td>
                    <td style={{ padding: '0.6rem 0.5rem' }}>Gate {c.triggerGate}</td>
                    <td style={{ padding: '0.6rem 0.5rem' }}>
                      <span
                        style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor:
                            c.status === 'PAID'
                              ? '#bbf7d0'
                              : c.status === 'ACQUIRED'
                                ? '#dbeafe'
                                : '#fef3c7',
                          color:
                            c.status === 'PAID'
                              ? '#166534'
                              : c.status === 'ACQUIRED'
                                ? '#1e40af'
                                : '#92400e',
                        }}
                      >
                        {c.status === 'ESTIMATED'
                          ? 'ESTIMADA (Aguardando Gate)'
                          : c.status === 'ACQUIRED'
                            ? 'ADQUIRIDA (Gerado a Pagar)'
                            : 'PAGA'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* MODAL 1: GENERATE / ADJUST PAYMENT PLAN */}
      {showGeneratePlanModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowGeneratePlanModal(false);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1050,
            padding: '1rem',
          }}
        >
          <div
            className="modal-card"
            style={{
              backgroundColor: '#fff',
              padding: '1.5rem',
              borderRadius: '12px',
              maxWidth: '480px',
              width: '90%',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              border: '1px solid #d9e2de',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Icon name="payments" size={20} /> Gerar / Repactuar Plano de Pagamento
              </h3>
              <button
                type="button"
                onClick={() => setShowGeneratePlanModal(false)}
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
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
              Define a entrada e a quantidade de parcelas. O Gate Financeiro exigirá a liquidação da
              entrada para liberação do projeto.
            </p>

            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                fontSize: '0.85rem',
              }}
            >
              Valor Total Contratado (R$)
              <input
                type="number"
                value={planTotal}
                placeholder="ex: 50000"
                onChange={(e) => setPlanTotal(e.target.value === '' ? '' : Number(e.target.value))}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </label>

            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                fontSize: '0.85rem',
              }}
            >
              Valor de Entrada / Sinal (R$)
              <input
                type="number"
                value={planDown}
                placeholder="ex: 10000 (20%)"
                onChange={(e) => setPlanDown(e.target.value === '' ? '' : Number(e.target.value))}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </label>

            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                fontSize: '0.85rem',
              }}
            >
              Quantidade de Parcelas do Saldo
              <input
                type="number"
                min="1"
                max="36"
                value={planInstallments}
                onChange={(e) => setPlanInstallments(Number(e.target.value))}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </label>

            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                fontSize: '0.85rem',
              }}
            >
              Método de Pagamento Esperado
              <select
                value={planMethod}
                onChange={(e) => setPlanMethod(e.target.value as PaymentMethodType)}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              >
                <option value="PIX">PIX</option>
                <option value="FINANCING">Financiamento Bancário / Solar</option>
                <option value="BOLETO">Boleto Bancário</option>
                <option value="CREDIT_CARD">Cartão de Crédito</option>
                <option value="MIXED">Misto (Entrada PIX + Saldo Financiado)</option>
              </select>
            </label>

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
                onClick={() => setShowGeneratePlanModal(false)}
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
                type="button"
                disabled={generatePlanMutation.isPending}
                onClick={() => generatePlanMutation.mutate()}
                style={{
                  background: '#0284c7',
                  color: '#fff',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {generatePlanMutation.isPending ? 'Gerando…' : 'Confirmar e Gerar Parcelas'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: RECORD RECEIPT */}
      {showReceiptModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowReceiptModal(false);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1050,
            padding: '1rem',
          }}
        >
          <div
            className="modal-card"
            style={{
              backgroundColor: '#fff',
              padding: '1.5rem',
              borderRadius: '12px',
              maxWidth: '480px',
              width: '90%',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              border: '1px solid #d9e2de',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Icon name="payments" size={20} /> Registrar Recebimento de Cliente
              </h3>
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
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

            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                fontSize: '0.85rem',
              }}
            >
              Conta Bancária de Destino
              <select
                value={receiptAccount || accountsQuery.data?.[0]?.id}
                onChange={(e) => setReceiptAccount(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              >
                {accountsQuery.data?.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.bankCode || 'Banco'})
                  </option>
                ))}
              </select>
            </label>

            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                fontSize: '0.85rem',
              }}
            >
              Valor Recebido (R$) *
              <input
                type="number"
                required
                value={receiptAmount}
                placeholder="ex: 10000"
                onChange={(e) =>
                  setReceiptAmount(e.target.value === '' ? '' : Number(e.target.value))
                }
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </label>

            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                fontSize: '0.85rem',
              }}
            >
              Método de Pagamento
              <select
                value={receiptMethod}
                onChange={(e) => setReceiptMethod(e.target.value as PaymentMethodType)}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              >
                <option value="PIX">PIX</option>
                <option value="TED">Transferência TED</option>
                <option value="BOLETO">Boleto Bancário</option>
                <option value="FINANCING_RELEASE">Liberação de Financiamento</option>
                <option value="CREDIT_CARD">Cartão de Crédito</option>
              </select>
            </label>

            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                fontSize: '0.85rem',
              }}
            >
              Nome do Pagador / Referência
              <input
                type="text"
                value={receiptPayer}
                placeholder="ex: Carlos Silva"
                onChange={(e) => setReceiptPayer(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </label>

            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                fontSize: '0.85rem',
              }}
            >
              Alocar em Parcela Específica (Opcional - se vazio, aloca na mais antiga)
              <select
                value={receiptTargetReceivable}
                onChange={(e) => setReceiptTargetReceivable(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              >
                <option value="">Automático (ordem cronológica de vencimento)</option>
                {receivables.map((r) => (
                  <option key={r.id} value={r.id}>
                    #{r.installmentNumber} - {r.title} (Saldo: {formatBRL(r.outstandingAmount)})
                  </option>
                ))}
              </select>
            </label>

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
                onClick={() => setShowReceiptModal(false)}
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
                type="button"
                disabled={recordReceiptMutation.isPending || !receiptAmount}
                onClick={() => recordReceiptMutation.mutate()}
                style={{
                  background: '#16a34a',
                  color: '#fff',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {recordReceiptMutation.isPending ? 'Gravando…' : 'Confirmar Recebimento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: REVERSE RECEIPT */}
      {showReverseModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowReverseModal(null);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1050,
            padding: '1rem',
          }}
        >
          <div
            className="modal-card"
            style={{
              backgroundColor: '#fff',
              padding: '1.5rem',
              borderRadius: '12px',
              maxWidth: '440px',
              width: '90%',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              border: '1px solid #fecaca',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3
                style={{
                  margin: 0,
                  color: '#991b1b',
                  fontSize: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Icon name="warning" size={20} /> Estornar Recebimento
              </h3>
              <button
                type="button"
                onClick={() => setShowReverseModal(null)}
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
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                <Icon name="close" size={18} />
              </button>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569' }}>
              O estorno reabrirá os saldos das parcelas afetadas e gerará um movimento compensatório
              de saída no caixa operacional.
            </p>

            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                fontSize: '0.85rem',
              }}
            >
              Justificativa / Motivo do Estorno *
              <input
                type="text"
                required
                value={reverseReason}
                placeholder="ex: Comprovante cancelado pelo banco"
                onChange={(e) => setReverseReason(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setShowReverseModal(null)}
                className="btn btn--secondary"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={reverseReceiptMutation.isPending || !reverseReason.trim()}
                onClick={() => reverseReceiptMutation.mutate(showReverseModal.receiptId)}
                className="btn btn--danger"
              >
                {reverseReceiptMutation.isPending ? 'Estornando…' : 'Confirmar Estorno'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: CREATE PAYABLE */}
      {showPayableModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPayableModal(false);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1050,
            padding: '1rem',
          }}
        >
          <div
            className="modal-card"
            style={{
              backgroundColor: '#fff',
              padding: '1.5rem',
              borderRadius: '12px',
              maxWidth: '480px',
              width: '90%',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              border: '1px solid #d9e2de',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Icon name="attach_money" size={20} /> Cadastrar Custo ou Conta a Pagar
              </h3>
              <button
                type="button"
                onClick={() => setShowPayableModal(false)}
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
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                fontSize: '0.85rem',
              }}
            >
              Categoria do Custo
              <select
                value={payableCategory}
                onChange={(e) => setPayableCategory(e.target.value as PayableCategoryType)}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              >
                <option value="EQUIPMENT">Equipamentos (Módulos / Inversor / Estrutura)</option>
                <option value="INSTALLATION_LABOR">Mão de Obra de Instalação</option>
                <option value="COMMISSION">Comissão Comercial</option>
                <option value="ENGINEERING_HOMOLOGATION">Engenharia, ART & Homologação</option>
                <option value="FREIGHT">Frete & Logística</option>
                <option value="OTHER">Outros Custos Operacionais</option>
              </select>
            </label>

            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                fontSize: '0.85rem',
              }}
            >
              Descrição da Despesa *
              <input
                type="text"
                required
                value={payableDesc}
                placeholder="ex: Módulos Fotovoltaicos Canadian 550W (14 un)"
                onChange={(e) => setPayableDesc(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </label>

            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                fontSize: '0.85rem',
              }}
            >
              Fornecedor / Beneficiário *
              <input
                type="text"
                required
                value={payableRecipient}
                placeholder="ex: Distribuidora Solar PE"
                onChange={(e) => setPayableRecipient(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <label
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                  fontSize: '0.85rem',
                }}
              >
                Valor da Obrigação (R$) *
                <input
                  type="number"
                  required
                  value={payableAmount}
                  placeholder="ex: 15000"
                  onChange={(e) =>
                    setPayableAmount(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </label>

              <label
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                  fontSize: '0.85rem',
                }}
              >
                Data de Vencimento *
                <input
                  type="date"
                  required
                  value={payableDueDate}
                  onChange={(e) => setPayableDueDate(e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </label>
            </div>

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
                onClick={() => setShowPayableModal(false)}
                className="btn btn--secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={
                  createPayableMutation.isPending ||
                  !payableDesc ||
                  !payableAmount ||
                  !payableDueDate
                }
                onClick={() => createPayableMutation.mutate()}
                className="btn btn--primary"
              >
                {createPayableMutation.isPending ? 'Salvando…' : 'Cadastrar Obrigação'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: RECORD PAYMENT */}
      {showPaymentModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPaymentModal(false);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1050,
            padding: '1rem',
          }}
        >
          <div
            className="modal-card"
            style={{
              backgroundColor: '#fff',
              padding: '1.5rem',
              borderRadius: '12px',
              maxWidth: '480px',
              width: '90%',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              border: '1px solid #d9e2de',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Icon name="credit_card" size={20} /> Registrar Pagamento de Despesa
              </h3>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
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
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                fontSize: '0.85rem',
              }}
            >
              Conta Bancária de Origem
              <select
                value={paymentAccount || accountsQuery.data?.[0]?.id}
                onChange={(e) => setPaymentAccount(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              >
                {accountsQuery.data?.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </label>

            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                fontSize: '0.85rem',
              }}
            >
              Valor a Pagar (R$) *
              <input
                type="number"
                required
                value={paymentAmount}
                placeholder="ex: 15000"
                onChange={(e) =>
                  setPaymentAmount(e.target.value === '' ? '' : Number(e.target.value))
                }
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </label>

            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                fontSize: '0.85rem',
              }}
            >
              Método de Pagamento
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodType)}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              >
                <option value="PIX">PIX</option>
                <option value="TED">Transferência TED</option>
                <option value="BOLETO">Pagamento de Boleto</option>
              </select>
            </label>

            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                fontSize: '0.85rem',
              }}
            >
              Autenticação Bancária / Comprovante
              <input
                type="text"
                value={paymentDoc}
                placeholder="ex: TED-2026-9900"
                onChange={(e) => setPaymentDoc(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </label>

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
                onClick={() => setShowPaymentModal(false)}
                className="btn btn--secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={recordPaymentMutation.isPending || !paymentAmount}
                onClick={() => recordPaymentMutation.mutate()}
                className="btn btn--primary"
              >
                {recordPaymentMutation.isPending ? 'Liquidando…' : 'Confirmar Pagamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: CONFIGURE COMMISSION */}
      {showCommissionModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCommissionModal(false);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1050,
            padding: '1rem',
          }}
        >
          <div
            className="modal-card"
            style={{
              backgroundColor: '#fff',
              padding: '1.5rem',
              borderRadius: '12px',
              maxWidth: '420px',
              width: '90%',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              border: '1px solid #d9e2de',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Icon name="payments" size={20} /> Adicionar Comissão Comercial
              </h3>
              <button
                type="button"
                onClick={() => setShowCommissionModal(false)}
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
                aria-label="Fechar"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                fontSize: '0.85rem',
              }}
            >
              Nome do Beneficiário *
              <input
                type="text"
                required
                value={commBeneficiary}
                placeholder="ex: Rafael Silva (Consultor)"
                onChange={(e) => setCommBeneficiary(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </label>

            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                fontSize: '0.85rem',
              }}
            >
              Papel / Função
              <select
                value={commRole}
                onChange={(e) => setCommRole(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              >
                <option value="SALES_REP">Consultor / Vendedor</option>
                <option value="TECHNICAL_PARTNER">Parceiro Técnico</option>
                <option value="MANAGER">Gestor Comercial</option>
              </select>
            </label>

            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                fontSize: '0.85rem',
              }}
            >
              Percentual (%) *
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="20"
                required
                value={commPercent}
                onChange={(e) =>
                  setCommPercent(e.target.value === '' ? '' : Number(e.target.value))
                }
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </label>

            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                fontSize: '0.85rem',
              }}
            >
              Gatilho de Aquisição
              <select
                value={commGate}
                onChange={(e) => setCommGate(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              >
                <option value="FINANCIAL">Gate Financeiro (Recebimento do Sinal)</option>
                <option value="CONTRACT">Gate C (Assinatura do Contrato)</option>
                <option value="CONCLUSION">Conclusão da Obra</option>
              </select>
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setShowCommissionModal(false)}
                className="btn btn--secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={configureCommissionMutation.isPending || !commBeneficiary || !commPercent}
                onClick={() => configureCommissionMutation.mutate()}
                className="btn btn--primary"
              >
                {configureCommissionMutation.isPending ? 'Salvando…' : 'Salvar Comissão'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function GlobalFinancialDashboard() {
  const queryClient = useQueryClient();
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accountName, setAccountName] = useState('');
  const [accountBank, setAccountBank] = useState('');
  const [accountAgency, setAccountAgency] = useState('');
  const [accountNum, setAccountNum] = useState('');

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAccountModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const cashFlowQuery = useQuery({
    queryKey: ['cash-flow'],
    queryFn: async () => {
      const res = await result(api.GET('/api/v1/financial/cash-flow'));
      return res as unknown as {
        summary: { totalIn: number; totalOut: number; netCash: number };
        movements: CashMovementView[];
      };
    },
    refetchOnWindowFocus: true,
  });

  const accountsQuery = useQuery({
    queryKey: ['financial-accounts'],
    queryFn: async () => {
      const res = await result(api.GET('/api/v1/financial/accounts'));
      return res as unknown as FinancialAccountView[];
    },
  });

  const createAccountMutation = useMutation({
    mutationFn: async () => {
      return result(
        api.POST('/api/v1/financial/accounts', {
          body: {
            name: accountName,
            accountType: 'CHECKING',
            bankCode: accountBank || undefined,
            agency: accountAgency || undefined,
            accountNumber: accountNum || undefined,
          },
        }),
      );
    },
    onSuccess: () => {
      setShowAccountModal(false);
      setAccountName('');
      setAccountBank('');
      setAccountAgency('');
      setAccountNum('');
      queryClient.invalidateQueries({ queryKey: ['financial-accounts'] });
    },
  });

  const flow = cashFlowQuery.data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem' }}>
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
          <h2 style={{ margin: 0 }}>Gestão Financeira & Fluxo de Caixa</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
            Visão gerencial consolidada de entradas, saídas, margens e contas bancárias (SPEC-008).
          </p>
        </div>
        <button
          type="button"
          style={{
            backgroundColor: '#0284c7',
            color: '#fff',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
          onClick={() => setShowAccountModal(true)}
        >
          + Nova Conta Bancária
        </button>
      </div>

      {/* Cash Flow Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
        }}
      >
        <div
          style={{
            background: '#f0fdf4',
            padding: '1.25rem',
            borderRadius: '8px',
            border: '1px solid #bbf7d0',
          }}
        >
          <span style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 600 }}>
            ENTRADAS REALIZADAS
          </span>
          <div
            style={{ fontSize: '1.5rem', fontWeight: 700, color: '#15803d', marginTop: '0.25rem' }}
          >
            {formatBRL(flow?.summary.totalIn)}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#16a34a' }}>Recebimentos de clientes</span>
        </div>

        <div
          style={{
            background: '#fef2f2',
            padding: '1.25rem',
            borderRadius: '8px',
            border: '1px solid #fecaca',
          }}
        >
          <span style={{ fontSize: '0.8rem', color: '#991b1b', fontWeight: 600 }}>
            SAÍDAS REALIZADAS
          </span>
          <div
            style={{ fontSize: '1.5rem', fontWeight: 700, color: '#b91c1c', marginTop: '0.25rem' }}
          >
            {formatBRL(flow?.summary.totalOut)}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#dc2626' }}>Pagamentos & comissões</span>
        </div>

        <div
          style={{
            background: (flow?.summary.netCash ?? 0) >= 0 ? '#f0fdf4' : '#fff1f2',
            padding: '1.25rem',
            borderRadius: '8px',
            border: '1px solid',
            borderColor: (flow?.summary.netCash ?? 0) >= 0 ? '#86efac' : '#fda4af',
          }}
        >
          <span
            style={{
              fontSize: '0.8rem',
              fontWeight: 600,
              color: (flow?.summary.netCash ?? 0) >= 0 ? '#166534' : '#9f1239',
            }}
          >
            SALDO LÍQUIDO OPERACIONAL
          </span>
          <div
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: (flow?.summary.netCash ?? 0) >= 0 ? '#15803d' : '#e11d48',
              marginTop: '0.25rem',
            }}
          >
            {formatBRL(flow?.summary.netCash)}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Posição financeira de caixa</span>
        </div>
      </div>

      {/* Contas Bancárias */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '1.25rem',
        }}
      >
        <h3 style={{ margin: '0 0 1rem 0' }}>Contas Financeiras</h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1rem',
          }}
        >
          {accountsQuery.data?.map((acc) => (
            <div
              key={acc.id}
              style={{
                padding: '1rem',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                background: '#f8fafc',
              }}
            >
              <strong>{acc.name}</strong>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
                Tipo: {acc.accountType} | Banco: {acc.bankCode || 'Padrão'}
              </div>
              {acc.agency && (
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Agência: {acc.agency} | Conta: {acc.accountNumber || '-'}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Extrato de Movimentações */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '1.25rem',
        }}
      >
        <h3 style={{ margin: '0 0 1rem 0' }}>Extrato de Movimentações Recentes</h3>
        {flow?.movements.length === 0 ? (
          <p style={{ color: '#64748b' }}>Nenhuma movimentação registrada.</p>
        ) : (
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '0.9rem',
            }}
          >
            <thead>
              <tr style={{ borderBottom: '2px solid #cbd5e1', color: '#475569' }}>
                <th style={{ padding: '0.5rem' }}>Data</th>
                <th style={{ padding: '0.5rem' }}>Descrição</th>
                <th style={{ padding: '0.5rem' }}>Tipo</th>
                <th style={{ padding: '0.5rem' }}>Conta</th>
                <th style={{ padding: '0.5rem', textAlign: 'right' }}>Valor</th>
              </tr>
            </thead>
            <tbody>
              {flow?.movements.map((m) => {
                const isIn = m.direction === 'IN';
                return (
                  <tr key={m.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.6rem 0.5rem' }}>{formatDate(m.effectiveAt)}</td>
                    <td style={{ padding: '0.6rem 0.5rem' }}>{m.description}</td>
                    <td style={{ padding: '0.6rem 0.5rem' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          background: isIn ? '#dcfce7' : '#fee2e2',
                          color: isIn ? '#166534' : '#991b1b',
                        }}
                      >
                        {m.type}
                      </span>
                    </td>
                    <td style={{ padding: '0.6rem 0.5rem', color: '#64748b' }}>
                      {m.account?.name || 'Conta Padrão'}
                    </td>
                    <td
                      style={{
                        padding: '0.6rem 0.5rem',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: isIn ? '#16a34a' : '#dc2626',
                      }}
                    >
                      {isIn ? '+' : '-'} {formatBRL(m.amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL: NOVA CONTA */}
      {showAccountModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAccountModal(false);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1050,
            padding: '1rem',
          }}
        >
          <div
            className="modal-card"
            style={{
              backgroundColor: '#fff',
              padding: '1.5rem',
              borderRadius: '12px',
              maxWidth: '420px',
              width: '90%',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              border: '1px solid #d9e2de',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Icon name="payments" size={20} /> Cadastrar Conta Financeira
              </h3>
              <button
                type="button"
                onClick={() => setShowAccountModal(false)}
                aria-label="Fechar"
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
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                fontSize: '0.85rem',
              }}
            >
              Nome Identificador *
              <input
                type="text"
                required
                value={accountName}
                placeholder="ex: Banco Cora - Moura Solar"
                onChange={(e) => setAccountName(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </label>

            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                fontSize: '0.85rem',
              }}
            >
              Código do Banco (ex: 403 Cora, 260 Nu, 001 BB)
              <input
                type="text"
                value={accountBank}
                placeholder="ex: 403"
                onChange={(e) => setAccountBank(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <label
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                  fontSize: '0.85rem',
                }}
              >
                Agência
                <input
                  type="text"
                  value={accountAgency}
                  placeholder="ex: 0001"
                  onChange={(e) => setAccountAgency(e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </label>

              <label
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                  fontSize: '0.85rem',
                }}
              >
                Número da Conta
                <input
                  type="text"
                  value={accountNum}
                  placeholder="ex: 1234567-8"
                  onChange={(e) => setAccountNum(e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setShowAccountModal(false)}
                className="btn btn--secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={createAccountMutation.isPending || !accountName}
                onClick={() => createAccountMutation.mutate()}
                className="btn btn--primary"
              >
                {createAccountMutation.isPending ? 'Salvando…' : 'Salvar Conta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
