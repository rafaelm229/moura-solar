'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, result } from '../identity/client';
import { Feedback } from '../identity/feedback';
import { Button } from '../../ui/Button';

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
    <div className="financial-container">
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
        className={`financial-gate-banner ${
          financialGate?.status === 'SATISFIED'
            ? 'financial-gate-banner--satisfied'
            : financialGate?.status === 'BLOCKED'
              ? 'financial-gate-banner--blocked'
              : 'financial-gate-banner--pending'
        }`}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              marginBottom: '0.35rem',
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>
              {financialGate?.status === 'SATISFIED' ? '🛡️' : '⏳'}
            </span>
            <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary, #f5f7f5)' }}>
              Gate Financeiro {opportunityCode ? `[${opportunityCode}]` : ''} (Down Payment / Sinal)
            </strong>
            <span
              className={`financial-badge ${
                financialGate?.status === 'SATISFIED'
                  ? 'financial-badge--success'
                  : financialGate?.status === 'BLOCKED'
                    ? 'financial-badge--danger'
                    : 'financial-badge--warning'
              }`}
            >
              {financialGate?.status === 'SATISFIED'
                ? '✓ LIBERADO / SATISFEITO'
                : 'AGUARDANDO ENTRADA'}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary, #9ba49e)' }}>
            {financialGate?.evidenceSummary ||
              'Aguardando confirmação do pagamento do sinal/entrada para liberação dos suprimentos e compras.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <Button
            type="button"
            variant="primary"
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
            💵 Registrar Recebimento
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              if (summary?.activePaymentPlan) {
                setPlanTotal(Number(summary.activePaymentPlan.totalAmount));
                setPlanDown(Number(summary.activePaymentPlan.downPaymentAmount));
              }
              setShowGeneratePlanModal(true);
            }}
          >
            ⚙️ {summary?.activePaymentPlan ? 'Repactuar Plano' : 'Gerar Plano de Parcelas'}
          </Button>
        </div>
      </div>

      {/* KPI Cards: Indicators & Margins */}
      <div className="financial-kpi-grid">
        <div className="financial-kpi-card">
          <span className="financial-kpi-label">RECEITA CONTRATADA</span>
          <div className="financial-kpi-value">{formatBRL(indicators?.contractedRevenue)}</div>
          <span className="financial-kpi-sub">Total comercial aprovado</span>
        </div>

        <div className="financial-kpi-card financial-kpi-card--success">
          <span className="financial-kpi-label" style={{ color: 'var(--status-success, #26d866)' }}>
            RECEBIDO (REALIZADO)
          </span>
          <div className="financial-kpi-value" style={{ color: 'var(--status-success, #26d866)' }}>
            {formatBRL(indicators?.receivedRevenue)}
          </div>
          <span className="financial-kpi-sub" style={{ color: 'var(--status-success, #26d866)' }}>
            {indicators?.contractedRevenue
              ? `${Math.round(((indicators.receivedRevenue || 0) / indicators.contractedRevenue) * 100)}% liquidado`
              : '0% liquidado'}
          </span>
        </div>

        <div
          className={`financial-kpi-card ${
            indicators?.overdueReceivables
              ? 'financial-kpi-card--danger'
              : 'financial-kpi-card--warning'
          }`}
        >
          <span className="financial-kpi-label" style={{ color: 'var(--status-warning, #ff9f1c)' }}>
            SALDO A RECEBER
          </span>
          <div className="financial-kpi-value" style={{ color: 'var(--status-warning, #ff9f1c)' }}>
            {formatBRL(indicators?.openReceivables)}
          </div>
          {indicators?.overdueReceivables ? (
            <span
              className="financial-kpi-sub"
              style={{ color: 'var(--status-danger, #ff4d57)', fontWeight: 600 }}
            >
              ⚠️ {formatBRL(indicators.overdueReceivables)} vencido
            </span>
          ) : (
            <span className="financial-kpi-sub" style={{ color: 'var(--status-success, #26d866)' }}>
              Sem parcelas vencidas
            </span>
          )}
        </div>

        <div className="financial-kpi-card">
          <span className="financial-kpi-label">CUSTOS PAGOS / ORÇADOS</span>
          <div className="financial-kpi-value" style={{ fontSize: '1.25rem' }}>
            {formatBRL(indicators?.paidCost)}{' '}
            <span
              style={{
                fontSize: '0.85rem',
                fontWeight: 400,
                color: 'var(--text-secondary, #9ba49e)',
              }}
            >
              / {formatBRL(indicators?.recognizedCost)}
            </span>
          </div>
          <span className="financial-kpi-sub">Equipamentos, frete e comissões</span>
        </div>

        <div
          className={`financial-kpi-card ${
            (indicators?.actualGrossResult ?? 0) >= 0
              ? 'financial-kpi-card--success'
              : 'financial-kpi-card--danger'
          }`}
        >
          <span
            className="financial-kpi-label"
            style={{
              color:
                (indicators?.actualGrossResult ?? 0) >= 0
                  ? 'var(--status-success, #26d866)'
                  : 'var(--status-danger, #ff4d57)',
            }}
          >
            RESULTADO & MARGEM
          </span>
          <div
            className="financial-kpi-value"
            style={{
              color:
                (indicators?.actualGrossResult ?? 0) >= 0
                  ? 'var(--status-success, #26d866)'
                  : 'var(--status-danger, #ff4d57)',
            }}
          >
            {formatBRL(indicators?.actualGrossResult)}
          </div>
          <span className="financial-kpi-sub" style={{ fontWeight: 600 }}>
            Margem Realizada: {indicators?.actualMarginPercent}% | Projetada:{' '}
            {indicators?.projectedMarginPercent}%
          </span>
        </div>
      </div>

      {/* Subtabs for Detail Tables */}
      <div className="financial-subtabs">
        <button
          type="button"
          className={`financial-subtab-btn ${
            activeTab === 'receivables' ? 'financial-subtab-btn--active' : ''
          }`}
          onClick={() => setActiveTab('receivables')}
        >
          📑 Contas a Receber ({receivables.length})
        </button>

        <button
          type="button"
          className={`financial-subtab-btn ${
            activeTab === 'payables' ? 'financial-subtab-btn--active' : ''
          }`}
          onClick={() => setActiveTab('payables')}
        >
          📤 Custos & Contas a Pagar ({payables.length})
        </button>

        <button
          type="button"
          className={`financial-subtab-btn ${
            activeTab === 'commissions' ? 'financial-subtab-btn--active' : ''
          }`}
          onClick={() => setActiveTab('commissions')}
        >
          🤝 Comissões ({commissions.length})
        </button>
      </div>

      {/* TAB 1: RECEIVABLES */}
      {activeTab === 'receivables' && (
        <div className="financial-panel">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <h4 style={{ margin: 0, color: 'var(--text-primary, #f5f7f5)' }}>
              Cronograma de Parcelas & Recebimentos
            </h4>
            <Button
              type="button"
              variant="primary"
              size="compact"
              onClick={() => {
                setReceiptTargetReceivable('');
                setShowReceiptModal(true);
              }}
            >
              + Novo Recebimento
            </Button>
          </div>

          {receivables.length === 0 ? (
            <div className="financial-empty-state">
              <p>Nenhum plano de pagamento gerado ainda para esta oportunidade.</p>
              <Button
                type="button"
                variant="primary"
                onClick={() => setShowGeneratePlanModal(true)}
              >
                Gerar Plano de Parcelas Automaticamente
              </Button>
            </div>
          ) : (
            <div className="financial-table-wrapper">
              <table className="financial-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Identificação</th>
                    <th>Valor Original</th>
                    <th>Valor Pago</th>
                    <th>Saldo em Aberto</th>
                    <th>Vencimento</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {receivables.map((rec) => {
                    const isPaid = rec.status === 'PAID';
                    const isOverdue =
                      rec.status === 'OVERDUE' || (new Date(rec.dueDate) < new Date() && !isPaid);
                    return (
                      <tr key={rec.id}>
                        <td style={{ fontWeight: 600 }}>{rec.installmentNumber}</td>
                        <td>
                          <strong>{rec.title}</strong>
                          {rec.notes && (
                            <div
                              style={{
                                fontSize: '0.75rem',
                                color: 'var(--text-secondary, #9ba49e)',
                              }}
                            >
                              {rec.notes}
                            </div>
                          )}
                        </td>
                        <td>{formatBRL(rec.originalAmount)}</td>
                        <td
                          style={{
                            color: 'var(--status-success, #26d866)',
                            fontWeight: 600,
                          }}
                        >
                          {formatBRL(rec.paidAmount)}
                        </td>
                        <td style={{ fontWeight: 600 }}>{formatBRL(rec.outstandingAmount)}</td>
                        <td
                          style={{
                            color: isOverdue ? 'var(--status-danger, #ff4d57)' : undefined,
                            fontWeight: isOverdue ? 700 : 400,
                          }}
                        >
                          {formatDate(rec.dueDate)}
                        </td>
                        <td>
                          <span
                            className={`financial-badge ${
                              rec.status === 'PAID'
                                ? 'financial-badge--success'
                                : rec.status === 'PARTIALLY_PAID'
                                  ? 'financial-badge--warning'
                                  : isOverdue
                                    ? 'financial-badge--danger'
                                    : 'financial-badge--neutral'
                            }`}
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
                        <td style={{ textAlign: 'right' }}>
                          <div
                            style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}
                          >
                            {!isPaid && (
                              <Button
                                type="button"
                                variant="primary"
                                size="compact"
                                onClick={() => {
                                  setReceiptTargetReceivable(rec.id);
                                  setReceiptAmount(Number(rec.outstandingAmount));
                                  setShowReceiptModal(true);
                                }}
                              >
                                Receber
                              </Button>
                            )}
                            {rec.allocations && rec.allocations.length > 0 && (
                              <Button
                                type="button"
                                variant="danger"
                                size="compact"
                                onClick={() => {
                                  const lastAlloc = rec.allocations?.[rec.allocations.length - 1];
                                  if (lastAlloc) {
                                    setShowReverseModal({ receiptId: lastAlloc.receiptId });
                                  }
                                }}
                              >
                                Estornar
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PAYABLES */}
      {activeTab === 'payables' && (
        <div className="financial-panel">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <h4 style={{ margin: 0, color: 'var(--text-primary, #f5f7f5)' }}>
              Obrigações a Pagar do Projeto
            </h4>
            <Button
              type="button"
              variant="secondary"
              size="compact"
              onClick={() => setShowPayableModal(true)}
            >
              + Adicionar Custo / Despesa
            </Button>
          </div>

          {payables.length === 0 ? (
            <div className="financial-empty-state">
              <p>Nenhum custo ou obrigação a pagar cadastrada para este projeto.</p>
              <Button type="button" variant="secondary" onClick={() => setShowPayableModal(true)}>
                Cadastrar Custo de Equipamento ou Serviço
              </Button>
            </div>
          ) : (
            <div className="financial-table-wrapper">
              <table className="financial-table">
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th>Descrição / Fornecedor</th>
                    <th>Valor Original</th>
                    <th>Pago</th>
                    <th>Saldo</th>
                    <th>Vencimento</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {payables.map((p) => {
                    const isPaid = p.status === 'PAID';
                    return (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600 }}>{p.category}</td>
                        <td>
                          <div>
                            <strong>{p.description}</strong>
                          </div>
                          <div
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--text-secondary, #9ba49e)',
                            }}
                          >
                            {p.recipient}
                          </div>
                        </td>
                        <td>{formatBRL(p.originalAmount)}</td>
                        <td
                          style={{
                            color: 'var(--status-success, #26d866)',
                            fontWeight: 600,
                          }}
                        >
                          {formatBRL(p.paidAmount)}
                        </td>
                        <td style={{ fontWeight: 600 }}>{formatBRL(p.outstandingAmount)}</td>
                        <td>{formatDate(p.dueDate)}</td>
                        <td>
                          <span
                            className={`financial-badge ${
                              isPaid ? 'financial-badge--success' : 'financial-badge--warning'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {!isPaid && (
                            <Button
                              type="button"
                              variant="secondary"
                              size="compact"
                              onClick={() => {
                                setPaymentTargetPayable(p.id);
                                setPaymentAmount(Number(p.outstandingAmount));
                                setShowPaymentModal(true);
                              }}
                            >
                              Pagar
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: COMMISSIONS */}
      {activeTab === 'commissions' && (
        <div className="financial-panel">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <h4 style={{ margin: 0, color: 'var(--text-primary, #f5f7f5)' }}>
              Comissões da Oportunidade
            </h4>
            <Button
              type="button"
              variant="secondary"
              size="compact"
              onClick={() => setShowCommissionModal(true)}
            >
              + Nova Comissão
            </Button>
          </div>

          {commissions.length === 0 ? (
            <div className="financial-empty-state">
              <p>Nenhuma comissão configurada.</p>
            </div>
          ) : (
            <div className="financial-table-wrapper">
              <table className="financial-table">
                <thead>
                  <tr>
                    <th>Beneficiário</th>
                    <th>Papel</th>
                    <th>%</th>
                    <th>Valor Base</th>
                    <th>Comissão</th>
                    <th>Gatilho de Aquisição</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.beneficiaryName}</td>
                      <td>{c.role}</td>
                      <td>{c.percentage}%</td>
                      <td>{formatBRL(c.baseAmount)}</td>
                      <td
                        style={{
                          color: 'var(--status-success, #26d866)',
                          fontWeight: 700,
                        }}
                      >
                        {formatBRL(c.commissionAmount)}
                      </td>
                      <td>Gate {c.triggerGate}</td>
                      <td>
                        <span
                          className={`financial-badge ${
                            c.status === 'PAID'
                              ? 'financial-badge--success'
                              : c.status === 'ACQUIRED'
                                ? 'financial-badge--info'
                                : 'financial-badge--warning'
                          }`}
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
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: GENERATE / ADJUST PAYMENT PLAN */}
      {showGeneratePlanModal && (
        <div className="financial-modal-backdrop">
          <div className="financial-modal-card">
            <h3 className="financial-modal-title">Gerar / Repactuar Plano de Pagamento</h3>
            <p className="financial-modal-desc">
              Define a entrada e a quantidade de parcelas. O Gate Financeiro exigirá a liquidação da
              entrada para liberação do projeto.
            </p>

            <label className="financial-form-group">
              Valor Total Contratado (R$)
              <input
                type="number"
                value={planTotal}
                placeholder="ex: 50000"
                onChange={(e) => setPlanTotal(e.target.value === '' ? '' : Number(e.target.value))}
                className="financial-input"
              />
            </label>

            <label className="financial-form-group">
              Valor de Entrada / Sinal (R$)
              <input
                type="number"
                value={planDown}
                placeholder="ex: 10000 (20%)"
                onChange={(e) => setPlanDown(e.target.value === '' ? '' : Number(e.target.value))}
                className="financial-input"
              />
            </label>

            <label className="financial-form-group">
              Quantidade de Parcelas do Saldo
              <input
                type="number"
                min="1"
                max="36"
                value={planInstallments}
                onChange={(e) => setPlanInstallments(Number(e.target.value))}
                className="financial-input"
              />
            </label>

            <label className="financial-form-group">
              Método de Pagamento Esperado
              <select
                value={planMethod}
                onChange={(e) => setPlanMethod(e.target.value as PaymentMethodType)}
                className="financial-select"
              >
                <option value="PIX">PIX</option>
                <option value="FINANCING">Financiamento Bancário / Solar</option>
                <option value="BOLETO">Boleto Bancário</option>
                <option value="CREDIT_CARD">Cartão de Crédito</option>
                <option value="MIXED">Misto (Entrada PIX + Saldo Financiado)</option>
              </select>
            </label>

            <div className="financial-modal-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowGeneratePlanModal(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={generatePlanMutation.isPending}
                onClick={() => generatePlanMutation.mutate()}
              >
                {generatePlanMutation.isPending ? 'Gerando…' : 'Confirmar e Gerar Parcelas'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: RECORD RECEIPT */}
      {showReceiptModal && (
        <div className="financial-modal-backdrop">
          <div className="financial-modal-card">
            <h3 className="financial-modal-title">Registrar Recebimento de Cliente</h3>

            <label className="financial-form-group">
              Conta Bancária de Destino
              <select
                value={receiptAccount || accountsQuery.data?.[0]?.id}
                onChange={(e) => setReceiptAccount(e.target.value)}
                className="financial-select"
              >
                {accountsQuery.data?.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.bankCode || 'Banco'})
                  </option>
                ))}
              </select>
            </label>

            <label className="financial-form-group">
              Valor Recebido (R$) *
              <input
                type="number"
                required
                value={receiptAmount}
                placeholder="ex: 10000"
                onChange={(e) =>
                  setReceiptAmount(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="financial-input"
              />
            </label>

            <label className="financial-form-group">
              Método de Pagamento
              <select
                value={receiptMethod}
                onChange={(e) => setReceiptMethod(e.target.value as PaymentMethodType)}
                className="financial-select"
              >
                <option value="PIX">PIX</option>
                <option value="TED">Transferência TED</option>
                <option value="BOLETO">Boleto Bancário</option>
                <option value="FINANCING_RELEASE">Liberação de Financiamento</option>
                <option value="CREDIT_CARD">Cartão de Crédito</option>
              </select>
            </label>

            <label className="financial-form-group">
              Nome do Pagador / Referência
              <input
                type="text"
                value={receiptPayer}
                placeholder="ex: Carlos Silva"
                onChange={(e) => setReceiptPayer(e.target.value)}
                className="financial-input"
              />
            </label>

            <label className="financial-form-group">
              Alocar em Parcela Específica (Opcional - se vazio, aloca na mais antiga)
              <select
                value={receiptTargetReceivable}
                onChange={(e) => setReceiptTargetReceivable(e.target.value)}
                className="financial-select"
              >
                <option value="">Automático (ordem cronológica de vencimento)</option>
                {receivables.map((r) => (
                  <option key={r.id} value={r.id}>
                    #{r.installmentNumber} - {r.title} (Saldo: {formatBRL(r.outstandingAmount)})
                  </option>
                ))}
              </select>
            </label>

            <div className="financial-modal-actions">
              <Button type="button" variant="secondary" onClick={() => setShowReceiptModal(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={recordReceiptMutation.isPending || !receiptAmount}
                onClick={() => recordReceiptMutation.mutate()}
              >
                {recordReceiptMutation.isPending ? 'Gravando…' : 'Confirmar Recebimento'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: REVERSE RECEIPT */}
      {showReverseModal && (
        <div className="financial-modal-backdrop">
          <div className="financial-modal-card" style={{ maxWidth: '420px' }}>
            <h3
              className="financial-modal-title"
              style={{ color: 'var(--status-danger, #ff4d57)' }}
            >
              Estornar Recebimento
            </h3>
            <p className="financial-modal-desc">
              O estorno reabrirá os saldos das parcelas afetadas e gerará um movimento compensatório
              de saída no caixa operacional.
            </p>

            <label className="financial-form-group">
              Justificativa / Motivo do Estorno *
              <input
                type="text"
                required
                value={reverseReason}
                placeholder="ex: Comprovante cancelado pelo banco"
                onChange={(e) => setReverseReason(e.target.value)}
                className="financial-input"
              />
            </label>

            <div className="financial-modal-actions">
              <Button type="button" variant="secondary" onClick={() => setShowReverseModal(null)}>
                Voltar
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={reverseReceiptMutation.isPending || !reverseReason.trim()}
                onClick={() => reverseReceiptMutation.mutate(showReverseModal.receiptId)}
              >
                {reverseReceiptMutation.isPending ? 'Estornando…' : 'Confirmar Estorno'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: CREATE PAYABLE */}
      {showPayableModal && (
        <div className="financial-modal-backdrop">
          <div className="financial-modal-card">
            <h3 className="financial-modal-title">Cadastrar Custo ou Conta a Pagar</h3>

            <label className="financial-form-group">
              Categoria do Custo
              <select
                value={payableCategory}
                onChange={(e) => setPayableCategory(e.target.value as PayableCategoryType)}
                className="financial-select"
              >
                <option value="EQUIPMENT">Equipamentos (Módulos / Inversor / Estrutura)</option>
                <option value="INSTALLATION_LABOR">Mão de Obra de Instalação</option>
                <option value="COMMISSION">Comissão Comercial</option>
                <option value="ENGINEERING_HOMOLOGATION">Engenharia, ART & Homologação</option>
                <option value="FREIGHT">Frete & Logística</option>
                <option value="OTHER">Outros Custos Operacionais</option>
              </select>
            </label>

            <label className="financial-form-group">
              Descrição da Despesa *
              <input
                type="text"
                required
                value={payableDesc}
                placeholder="ex: Módulos Fotovoltaicos Canadian 550W (14 un)"
                onChange={(e) => setPayableDesc(e.target.value)}
                className="financial-input"
              />
            </label>

            <label className="financial-form-group">
              Fornecedor / Beneficiário *
              <input
                type="text"
                required
                value={payableRecipient}
                placeholder="ex: Distribuidora Solar PE"
                onChange={(e) => setPayableRecipient(e.target.value)}
                className="financial-input"
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <label className="financial-form-group">
                Valor da Obrigação (R$) *
                <input
                  type="number"
                  required
                  value={payableAmount}
                  placeholder="ex: 15000"
                  onChange={(e) =>
                    setPayableAmount(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  className="financial-input"
                />
              </label>

              <label className="financial-form-group">
                Data de Vencimento *
                <input
                  type="date"
                  required
                  value={payableDueDate}
                  onChange={(e) => setPayableDueDate(e.target.value)}
                  className="financial-input"
                />
              </label>
            </div>

            <div className="financial-modal-actions">
              <Button type="button" variant="secondary" onClick={() => setShowPayableModal(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={
                  createPayableMutation.isPending ||
                  !payableDesc ||
                  !payableAmount ||
                  !payableDueDate
                }
                onClick={() => createPayableMutation.mutate()}
              >
                {createPayableMutation.isPending ? 'Salvando…' : 'Cadastrar Obrigação'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: RECORD PAYMENT */}
      {showPaymentModal && (
        <div className="financial-modal-backdrop">
          <div className="financial-modal-card">
            <h3 className="financial-modal-title">Registrar Pagamento de Despesa</h3>

            <label className="financial-form-group">
              Conta Bancária de Origem
              <select
                value={paymentAccount || accountsQuery.data?.[0]?.id}
                onChange={(e) => setPaymentAccount(e.target.value)}
                className="financial-select"
              >
                {accountsQuery.data?.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="financial-form-group">
              Valor a Pagar (R$) *
              <input
                type="number"
                required
                value={paymentAmount}
                placeholder="ex: 15000"
                onChange={(e) =>
                  setPaymentAmount(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="financial-input"
              />
            </label>

            <label className="financial-form-group">
              Método de Pagamento
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodType)}
                className="financial-select"
              >
                <option value="PIX">PIX</option>
                <option value="TED">Transferência TED</option>
                <option value="BOLETO">Pagamento de Boleto</option>
              </select>
            </label>

            <label className="financial-form-group">
              Autenticação Bancária / Comprovante
              <input
                type="text"
                value={paymentDoc}
                placeholder="ex: TED-2026-9900"
                onChange={(e) => setPaymentDoc(e.target.value)}
                className="financial-input"
              />
            </label>

            <div className="financial-modal-actions">
              <Button type="button" variant="secondary" onClick={() => setShowPaymentModal(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={recordPaymentMutation.isPending || !paymentAmount}
                onClick={() => recordPaymentMutation.mutate()}
              >
                {recordPaymentMutation.isPending ? 'Liquidando…' : 'Confirmar Pagamento'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: CONFIGURE COMMISSION */}
      {showCommissionModal && (
        <div className="financial-modal-backdrop">
          <div className="financial-modal-card" style={{ maxWidth: '420px' }}>
            <h3 className="financial-modal-title">Adicionar Comissão Comercial</h3>

            <label className="financial-form-group">
              Nome do Beneficiário *
              <input
                type="text"
                required
                value={commBeneficiary}
                placeholder="ex: Rafael Silva (Consultor)"
                onChange={(e) => setCommBeneficiary(e.target.value)}
                className="financial-input"
              />
            </label>

            <label className="financial-form-group">
              Papel / Função
              <select
                value={commRole}
                onChange={(e) => setCommRole(e.target.value)}
                className="financial-select"
              >
                <option value="SALES_REP">Consultor / Vendedor</option>
                <option value="TECHNICAL_PARTNER">Parceiro Técnico</option>
                <option value="MANAGER">Gestor Comercial</option>
              </select>
            </label>

            <label className="financial-form-group">
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
                className="financial-input"
              />
            </label>

            <label className="financial-form-group">
              Gatilho de Aquisição
              <select
                value={commGate}
                onChange={(e) => setCommGate(e.target.value)}
                className="financial-select"
              >
                <option value="FINANCIAL">Gate Financeiro (Recebimento do Sinal)</option>
                <option value="CONTRACT">Gate C (Assinatura do Contrato)</option>
                <option value="CONCLUSION">Conclusão da Obra</option>
              </select>
            </label>

            <div className="financial-modal-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowCommissionModal(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={configureCommissionMutation.isPending || !commBeneficiary || !commPercent}
                onClick={() => configureCommissionMutation.mutate()}
              >
                {configureCommissionMutation.isPending ? 'Salvando…' : 'Salvar Comissão'}
              </Button>
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
  const totalIn = flow?.summary.totalIn ?? 0;
  const totalOut = flow?.summary.totalOut ?? 0;
  const totalVolume = totalIn + totalOut;
  const inPercent = totalVolume > 0 ? Math.round((totalIn / totalVolume) * 100) : 50;
  const outPercent = totalVolume > 0 ? 100 - inPercent : 50;

  return (
    <div className="financial-container" style={{ padding: '0.5rem' }}>
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
          <h2 style={{ margin: 0, color: 'var(--text-primary, #f5f7f5)' }}>
            Gestão Financeira & Fluxo de Caixa
          </h2>
          <p
            style={{
              margin: '0.25rem 0 0 0',
              color: 'var(--text-secondary, #9ba49e)',
              fontSize: '0.9rem',
            }}
          >
            Visão gerencial consolidada de entradas, saídas, margens e contas bancárias (SPEC-008).
          </p>
        </div>
        <Button type="button" variant="primary" onClick={() => setShowAccountModal(true)}>
          + Nova Conta Bancária
        </Button>
      </div>

      {/* Cash Flow Summary Cards */}
      <div className="financial-kpi-grid">
        <div className="financial-kpi-card financial-kpi-card--success">
          <span className="financial-kpi-label" style={{ color: 'var(--status-success, #26d866)' }}>
            ENTRADAS REALIZADAS
          </span>
          <div className="financial-kpi-value" style={{ color: 'var(--status-success, #26d866)' }}>
            {formatBRL(flow?.summary.totalIn)}
          </div>
          <span className="financial-kpi-sub" style={{ color: 'var(--status-success, #26d866)' }}>
            Recebimentos de clientes
          </span>
        </div>

        <div className="financial-kpi-card financial-kpi-card--danger">
          <span className="financial-kpi-label" style={{ color: 'var(--status-danger, #ff4d57)' }}>
            SAÍDAS REALIZADAS
          </span>
          <div className="financial-kpi-value" style={{ color: 'var(--status-danger, #ff4d57)' }}>
            {formatBRL(flow?.summary.totalOut)}
          </div>
          <span className="financial-kpi-sub" style={{ color: 'var(--status-danger, #ff4d57)' }}>
            Pagamentos & comissões
          </span>
        </div>

        <div
          className={`financial-kpi-card ${
            (flow?.summary.netCash ?? 0) >= 0
              ? 'financial-kpi-card--solar'
              : 'financial-kpi-card--danger'
          }`}
        >
          <span
            className="financial-kpi-label"
            style={{
              color:
                (flow?.summary.netCash ?? 0) >= 0
                  ? 'var(--brand-solar, #ffd400)'
                  : 'var(--status-danger, #ff4d57)',
            }}
          >
            SALDO LÍQUIDO OPERACIONAL
          </span>
          <div
            className="financial-kpi-value"
            style={{
              color:
                (flow?.summary.netCash ?? 0) >= 0
                  ? 'var(--brand-solar, #ffd400)'
                  : 'var(--status-danger, #ff4d57)',
            }}
          >
            {formatBRL(flow?.summary.netCash)}
          </div>
          <span className="financial-kpi-sub">Posição financeira de caixa</span>
        </div>
      </div>

      {/* Visual Cash Flow Representation */}
      <div className="financial-chart-card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <h4 style={{ margin: 0, color: 'var(--text-primary, #f5f7f5)' }}>
            Composição do Fluxo Financeiro (Entradas vs Saídas)
          </h4>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--status-success, #26d866)' }}>
              ● Entradas ({inPercent}%)
            </span>
            <span style={{ color: 'var(--status-danger, #ff4d57)' }}>● Saídas ({outPercent}%)</span>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div
          style={{
            height: '14px',
            backgroundColor: 'var(--surface-sunken, #111412)',
            borderRadius: '999px',
            overflow: 'hidden',
            display: 'flex',
            border: '1px solid var(--border-default, #29302b)',
          }}
        >
          <div
            style={{
              width: `${inPercent}%`,
              backgroundColor: 'var(--status-success, #26d866)',
              transition: 'width 0.3s ease',
            }}
            title={`Entradas: ${formatBRL(totalIn)} (${inPercent}%)`}
          />
          <div
            style={{
              width: `${outPercent}%`,
              backgroundColor: 'var(--status-danger, #ff4d57)',
              transition: 'width 0.3s ease',
            }}
            title={`Saídas: ${formatBRL(totalOut)} (${outPercent}%)`}
          />
        </div>
      </div>

      {/* Contas Bancárias */}
      <div className="financial-panel">
        <h3 style={{ margin: 0, color: 'var(--text-primary, #f5f7f5)' }}>Contas Financeiras</h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1rem',
          }}
        >
          {accountsQuery.data?.map((acc) => (
            <div key={acc.id} className="financial-account-card">
              <strong className="financial-account-title">{acc.name}</strong>
              <div className="financial-account-info">
                Tipo: {acc.accountType} | Banco: {acc.bankCode || 'Padrão'}
              </div>
              {acc.agency && (
                <div className="financial-account-info">
                  Agência: {acc.agency} | Conta: {acc.accountNumber || '-'}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Extrato de Movimentações */}
      <div className="financial-panel">
        <h3 style={{ margin: 0, color: 'var(--text-primary, #f5f7f5)' }}>
          Extrato de Movimentações Recentes
        </h3>
        {flow?.movements.length === 0 ? (
          <div className="financial-empty-state">
            <p>Nenhuma movimentação registrada.</p>
          </div>
        ) : (
          <div className="financial-table-wrapper">
            <table className="financial-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Tipo</th>
                  <th>Conta</th>
                  <th style={{ textAlign: 'right' }}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {flow?.movements.map((m) => {
                  const isIn = m.direction === 'IN';
                  return (
                    <tr key={m.id}>
                      <td>{formatDate(m.effectiveAt)}</td>
                      <td>{m.description}</td>
                      <td>
                        <span
                          className={`financial-badge ${
                            isIn ? 'financial-badge--success' : 'financial-badge--danger'
                          }`}
                        >
                          {m.type}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary, #9ba49e)' }}>
                        {m.account?.name || 'Conta Padrão'}
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          fontWeight: 700,
                          color: isIn
                            ? 'var(--status-success, #26d866)'
                            : 'var(--status-danger, #ff4d57)',
                        }}
                      >
                        {isIn ? '+' : '-'} {formatBRL(m.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: NOVA CONTA */}
      {showAccountModal && (
        <div className="financial-modal-backdrop">
          <div className="financial-modal-card" style={{ maxWidth: '420px' }}>
            <h3 className="financial-modal-title">Cadastrar Conta Financeira</h3>

            <label className="financial-form-group">
              Nome Identificador *
              <input
                type="text"
                required
                value={accountName}
                placeholder="ex: Banco Cora - Moura Solar"
                onChange={(e) => setAccountName(e.target.value)}
                className="financial-input"
              />
            </label>

            <label className="financial-form-group">
              Código do Banco (ex: 403 Cora, 260 Nu, 001 BB)
              <input
                type="text"
                value={accountBank}
                placeholder="ex: 403"
                onChange={(e) => setAccountBank(e.target.value)}
                className="financial-input"
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <label className="financial-form-group">
                Agência
                <input
                  type="text"
                  value={accountAgency}
                  placeholder="ex: 0001"
                  onChange={(e) => setAccountAgency(e.target.value)}
                  className="financial-input"
                />
              </label>

              <label className="financial-form-group">
                Número da Conta
                <input
                  type="text"
                  value={accountNum}
                  placeholder="ex: 1234567-8"
                  onChange={(e) => setAccountNum(e.target.value)}
                  className="financial-input"
                />
              </label>
            </div>

            <div className="financial-modal-actions">
              <Button type="button" variant="secondary" onClick={() => setShowAccountModal(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={createAccountMutation.isPending || !accountName}
                onClick={() => createAccountMutation.mutate()}
              >
                {createAccountMutation.isPending ? 'Salvando…' : 'Salvar Conta'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
