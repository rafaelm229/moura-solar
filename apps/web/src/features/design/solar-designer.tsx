'use client';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, result, allows } from '../identity/client';
import { Feedback } from '../identity/feedback';
import { Button } from '../../ui/Button';
import type { Schemas } from '@moura-solar/api-client';

type Design = Schemas['DesignViewDto'];
type DesignVersion = Schemas['DesignVersionViewDto'];
type DesignSuggestion = Schemas['DesignSuggestionViewDto'];

interface SolarDesignerProps {
  opportunityId: string;
  opportunityTitle?: string;
  suggestedMonthlyKwh?: number;
  readonly?: boolean;
}

export function SolarDesigner({
  opportunityId,
  opportunityTitle,
  suggestedMonthlyKwh,
  readonly = false,
}: SolarDesignerProps) {
  const queryClient = useQueryClient();

  // Assistant states for creating a new design
  const [targetKwh, setTargetKwh] = useState(
    suggestedMonthlyKwh ? Math.round(suggestedMonthlyKwh).toString() : '600',
  );
  const [specificYield, setSpecificYield] = useState('135');
  const [preferredModuleWp, setPreferredModuleWp] = useState('630');
  const [suggestion, setSuggestion] = useState<DesignSuggestion | null>(null);

  // Active version selector
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  // Edit version states (when in Draft)
  const [editItems, setEditItems] = useState<Array<Schemas['DesignItemInputDto']>>([]);
  const [editAdditionalCosts, setEditAdditionalCosts] = useState<
    Array<Schemas['AdditionalCostInputDto']>
  >([]);
  const [markupPercent, setMarkupPercent] = useState<number>(35);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [contingencyAmount, setContingencyAmount] = useState<number>(0);

  // Quick add item from catalog
  const [selectedCatalogId, setSelectedCatalogId] = useState('');
  const [catalogItemQty, setCatalogItemQty] = useState('1');

  // Quick add manual item
  const [showManualItemForm, setShowManualItemForm] = useState(false);
  const [manualDesc, setManualDesc] = useState('');
  const [manualCategory, setManualCategory] = useState('STRUCTURE');
  const [manualKind, setManualKind] = useState<'MATERIAL' | 'SERVICE'>('MATERIAL');
  const [manualUnit, setManualUnit] = useState('UN');
  const [manualQty, setManualQty] = useState('1');
  const [manualCost, setManualCost] = useState('');
  const [manualJustification, setManualJustification] = useState('');

  // Quick add additional cost
  const [showAdditionalCostForm, setShowAdditionalCostForm] = useState(false);
  const [addCostCategory, setAddCostCategory] = useState('FREIGHT');
  const [addCostDesc, setAddCostDesc] = useState('');
  const [addCostAmount, setAddCostAmount] = useState('');

  // Approval modal states
  const [isApproving, setIsApproving] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [lowMarginJustification, setLowMarginJustification] = useState('');

  // Current user & permissions
  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => result(api.GET('/api/v1/identity/me')),
  });
  const canCreateDesign = me.data ? allows(me.data, 'designs:create', false) : false;
  const canUpdateDesign = me.data ? allows(me.data, 'designs:update', false) : false;
  const canApproveDesign = me.data ? allows(me.data, 'designs:approve', false) : false;

  // Query designs for this opportunity
  const designsQuery = useQuery({
    queryKey: ['opportunity-designs', opportunityId],
    queryFn: () =>
      result(
        api.GET('/api/v1/opportunities/{id}/designs', {
          params: { path: { id: opportunityId } },
        }),
      ),
    enabled: !!opportunityId,
  });

  // Query catalog
  const catalogQuery = useQuery({
    queryKey: ['catalog'],
    queryFn: () =>
      result(
        api.GET('/api/v1/catalog', {
          params: { query: { status: 'ACTIVE' } },
        }),
      ),
  });

  const designs: Design[] = designsQuery.data ?? [];
  const currentDesign = designs[0] as Design | undefined;

  // Selected or latest version
  const currentVersion: DesignVersion | undefined =
    currentDesign?.versions.find((v) =>
      selectedVersionId
        ? v.id === selectedVersionId
        : v.versionNumber === currentDesign.currentVersionNumber,
    ) ?? currentDesign?.versions[currentDesign.versions.length - 1];

  // Initialize draft edit states whenever currentVersion changes
  useEffect(() => {
    if (currentVersion) {
      setEditItems(
        currentVersion.items.map((i) => ({
          catalogItemId: i.catalogItemId ?? undefined,
          kind: i.kind as 'MATERIAL' | 'SERVICE',
          category: i.category,
          description: i.description,
          unitOfMeasure: i.unitOfMeasure,
          quantity: i.quantity,
          unitCost: i.unitCost,
          costSource: i.costSource as 'CATALOG' | 'MANUAL' | 'QUOTE',
          isOptional: i.isOptional,
          justification: i.justification ?? undefined,
        })),
      );
      setEditAdditionalCosts(
        currentVersion.additionalCosts.map((c) => ({
          category: c.category as
            | 'LABOR'
            | 'FREIGHT'
            | 'ENGINEERING_ART'
            | 'EQUIPMENT_RENTAL'
            | 'ELECTRICAL_ADEQUACY'
            | 'TAXES'
            | 'COMMISSION'
            | 'CONTINGENCY'
            | 'OTHER',
          description: c.description,
          amount: c.amount,
          commercialTreatment: c.commercialTreatment as
            'INCLUDED_IN_PRICE' | 'BILLED_SEPARATELY' | 'INTERNAL_MONITORING',
          justification: c.justification ?? undefined,
        })),
      );
      if (currentVersion.pricing) {
        setMarkupPercent(currentVersion.pricing.markupPercent);
        setDiscountAmount(currentVersion.pricing.discountAmount);
        setContingencyAmount(currentVersion.pricing.contingencyAmount);
      }
    }
  }, [currentVersion]);

  // Request design suggestion
  const suggestMutation = useMutation({
    mutationFn: async () => {
      return result(
        api.POST('/api/v1/designs/suggest', {
          body: {
            targetMonthlyGenerationKwh: parseFloat(targetKwh),
            specificYield: parseFloat(specificYield),
            preferredModulePowerWp: preferredModuleWp ? parseInt(preferredModuleWp, 10) : 630,
          },
        }),
      );
    },
    onSuccess: (data) => {
      setSuggestion(data);
    },
  });

  // Create design
  const createDesignMutation = useMutation({
    mutationFn: async () => {
      return result(
        api.POST('/api/v1/opportunities/{id}/designs', {
          params: { path: { id: opportunityId } },
          body: {
            name: `Dimensionamento — ${opportunityTitle ?? 'Solar'}`,
            systemType: 'ON_GRID',
            targetMonthlyGenerationKwh: parseFloat(targetKwh),
            specificYield: parseFloat(specificYield),
          },
        }),
      );
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['opportunity-designs', opportunityId] });
      if (created.versions.length > 0) {
        setSelectedVersionId(created.versions[0].id);
      }
    },
  });

  // Create new version based on existing approved version
  const createVersionMutation = useMutation({
    mutationFn: async () => {
      if (!currentDesign) throw new Error('Projeto não encontrado');
      return result(
        api.POST('/api/v1/designs/{id}/versions', {
          params: { path: { id: currentDesign.id } },
          body: { basedOnVersionId: currentVersion?.id },
        }),
      );
    },
    onSuccess: (newVersion) => {
      queryClient.invalidateQueries({ queryKey: ['opportunity-designs', opportunityId] });
      setSelectedVersionId(newVersion.id);
    },
  });

  // Save version draft changes
  const saveVersionMutation = useMutation({
    mutationFn: async () => {
      if (!currentVersion) throw new Error('Versão não selecionada');
      return result(
        api.PUT('/api/v1/design-versions/{id}', {
          params: { path: { id: currentVersion.id } },
          body: {
            targetMonthlyGenerationKwh: currentVersion.targetMonthlyGenerationKwh,
            specificYield: currentVersion.specificYield,
            items: editItems,
            additionalCosts: editAdditionalCosts,
            contingencyAmount,
            markupPercent,
            discountAmount,
          },
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunity-designs', opportunityId] });
    },
  });

  // Approve version
  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!currentVersion) throw new Error('Versão não selecionada');
      return result(
        api.POST('/api/v1/design-versions/{id}/approve', {
          params: { path: { id: currentVersion.id } },
          body: {
            justification: approvalNotes || undefined,
            overrideLowMarginReason: lowMarginJustification || undefined,
          },
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunity-designs', opportunityId] });
      setIsApproving(false);
      setApprovalNotes('');
      setLowMarginJustification('');
    },
  });

  // Dynamic calculations for preview when editing
  const totalDirectCost =
    editItems.reduce((acc, item) => acc + item.quantity * item.unitCost, 0) +
    editAdditionalCosts.reduce((acc, cost) => acc + cost.amount, 0) +
    (contingencyAmount || 0);

  const priceBeforeDiscount = totalDirectCost * (1 + markupPercent / 100);
  const finalPrice = Math.max(0, priceBeforeDiscount - (discountAmount || 0));
  const grossMarginAmount = finalPrice - totalDirectCost;
  const grossMarginPercent = finalPrice > 0 ? (grossMarginAmount / finalPrice) * 100 : 0;
  const isLowMargin = grossMarginPercent < 20;

  // Add catalog item to draft
  const handleAddCatalogItem = () => {
    const catItem = catalogQuery.data?.find((c) => c.id === selectedCatalogId);
    if (!catItem) return;
    const qty = parseFloat(catalogItemQty) || 1;
    setEditItems([
      ...editItems,
      {
        catalogItemId: catItem.id,
        kind: catItem.kind as 'MATERIAL' | 'SERVICE',
        category: catItem.category,
        description: catItem.name,
        unitOfMeasure: catItem.unitOfMeasure,
        quantity: qty,
        unitCost: catItem.referenceCost,
        costSource: 'CATALOG' as const,
        isOptional: false,
      },
    ]);
    setSelectedCatalogId('');
    setCatalogItemQty('1');
  };

  // Add manual item to draft
  const handleAddManualItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualDesc || !manualCost || !manualJustification) return;
    setEditItems([
      ...editItems,
      {
        kind: manualKind,
        category: manualCategory,
        description: manualDesc,
        unitOfMeasure: manualUnit,
        quantity: parseFloat(manualQty) || 1,
        unitCost: parseFloat(manualCost) || 0,
        costSource: 'MANUAL' as const,
        isOptional: false,
        justification: manualJustification,
      },
    ]);
    setShowManualItemForm(false);
    setManualDesc('');
    setManualCost('');
    setManualJustification('');
  };

  // Add additional cost to draft
  const handleAddAdditionalCost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addCostDesc || !addCostAmount) return;
    setEditAdditionalCosts([
      ...editAdditionalCosts,
      {
        category: addCostCategory as
          | 'LABOR'
          | 'FREIGHT'
          | 'ENGINEERING_ART'
          | 'EQUIPMENT_RENTAL'
          | 'ELECTRICAL_ADEQUACY'
          | 'TAXES'
          | 'COMMISSION'
          | 'CONTINGENCY'
          | 'OTHER',
        description: addCostDesc,
        amount: parseFloat(addCostAmount) || 0,
        commercialTreatment: 'INCLUDED_IN_PRICE' as const,
      },
    ]);
    setShowAdditionalCostForm(false);
    setAddCostDesc('');
    setAddCostAmount('');
  };

  // ---------------------------------------------------------------------------
  // NO DESIGN CREATED YET: SHOW SIZING ASSISTANT
  // ---------------------------------------------------------------------------
  if (!currentDesign) {
    return (
      <section className="design-panel" aria-label="Assistente de Dimensionamento Solar">
        <div className="design-section-header">
          <div>
            <h3 className="design-section-title">Assistente de Dimensionamento Solar & Catálogo</h3>
            <p className="design-section-desc">
              Calcule a potência fotovoltaica ótima (kWp), o arranjo de módulos e os inversores
              compatíveis segundo as regras normativas e o catálogo Moura Solar.
            </p>
          </div>
        </div>

        <Feedback error={designsQuery.error} />
        <Feedback error={suggestMutation.error} />
        <Feedback error={createDesignMutation.error} />

        <div className="design-form">
          <h4
            style={{
              fontSize: '15px',
              fontWeight: 700,
              color: 'var(--text-primary, #f5f7f5)',
              margin: '0 0 16px',
            }}
          >
            Parâmetros de Entrada
          </h4>
          <div className="form-grid">
            <label>
              Geração Mensal Alvo (kWh/mês) *
              <input
                type="number"
                step="1"
                min="1"
                required
                value={targetKwh}
                onChange={(e) => setTargetKwh(e.target.value)}
              />
            </label>
            <label>
              Produtividade Específica (kWh/kWp/mês) *
              <input
                type="number"
                step="1"
                min="50"
                max="250"
                value={specificYield}
                onChange={(e) => setSpecificYield(e.target.value)}
              />
            </label>
            <label>
              Potência Preferencial do Módulo (Wp)
              <select
                value={preferredModuleWp}
                onChange={(e) => setPreferredModuleWp(e.target.value)}
              >
                <option value="630">630 Wp — N-Type Bifacial (Moura Solar)</option>
                <option value="585">585 Wp — TopCon Mono (Moura Solar)</option>
                <option value="550">550 Wp — Standard Mono</option>
              </select>
            </label>
          </div>

          <div style={{ marginTop: '1.25rem' }}>
            <Button
              variant="primary"
              onClick={() => suggestMutation.mutate()}
              disabled={suggestMutation.isPending}
            >
              Calcular Sugestão de Dimensionamento
            </Button>
          </div>
        </div>

        {/* Suggestion Result Display */}
        {suggestion && (
          <div className="design-suggestion-box">
            <span className="design-suggestion-badge">SUGESTÃO TÉCNICA AUTOMATIZADA</span>
            <h4
              style={{
                fontSize: '17px',
                fontWeight: 700,
                color: 'var(--text-primary, #f5f7f5)',
                margin: '8px 0 4px',
              }}
            >
              Sistema Recomendado: {suggestion.suggestedDcPowerKwp} kWp (Geração est.{' '}
              {suggestion.estimatedMonthlyGenerationKwh.toLocaleString('pt-BR')} kWh/mês)
            </h4>
            <p className="device" style={{ fontSize: '13px', margin: '0 0 16px' }}>
              {suggestion.classification}
            </p>

            <div className="design-kpi-grid">
              <div className="design-kpi-card">
                <div className="design-kpi-card__label">GERAÇÃO ESTIMADA</div>
                <div
                  className="design-kpi-card__value"
                  style={{ color: 'var(--brand-solar, #ffd400)' }}
                >
                  {suggestion.estimatedMonthlyGenerationKwh.toLocaleString('pt-BR')} kWh/mês
                </div>
                <div className="design-kpi-card__subtext">
                  {suggestion.estimatedAnnualGenerationKwh.toLocaleString('pt-BR')} kWh/ano
                </div>
              </div>

              <div className="design-kpi-card">
                <div className="design-kpi-card__label">MÓDULOS FOTOVOLTAICOS</div>
                <div className="design-kpi-card__value">
                  {suggestion.suggestedModuleQuantity}× {suggestion.suggestedModulePowerWp} Wp
                </div>
                <div className="design-kpi-card__subtext">
                  Potência DC: {suggestion.suggestedDcPowerKwp} kWp
                </div>
              </div>

              <div className="design-kpi-card">
                <div className="design-kpi-card__label">INVERSOR SOLAR</div>
                <div className="design-kpi-card__value">
                  {suggestion.suggestedInverterQuantity}× {suggestion.suggestedInverterPowerKw} kW
                </div>
                <div className="design-kpi-card__subtext">Razão CC/CA: {suggestion.dcAcRatio}</div>
              </div>
            </div>

            {!readonly && canCreateDesign && (
              <div style={{ marginTop: '1.25rem' }}>
                <Button
                  variant="primary"
                  onClick={() => createDesignMutation.mutate()}
                  disabled={createDesignMutation.isPending}
                >
                  Criar Dimensionamento a partir desta Sugestão
                </Button>
              </div>
            )}
          </div>
        )}
      </section>
    );
  }

  // ---------------------------------------------------------------------------
  // DESIGN EXISTS: DISPLAY VERSIONS, BOM, PRICING & APPROVAL
  // ---------------------------------------------------------------------------
  const isApproved = currentVersion?.status === 'APPROVED';
  const isDraft = currentVersion?.status === 'DRAFT';

  return (
    <section className="design-panel" aria-label="Dimensionamento Solar e Composição de Custos">
      {/* Header and Version Tabs */}
      <div className="design-section-header">
        <div>
          <h3 className="design-section-title">{currentDesign.name}</h3>
          <p className="design-section-desc">
            Versão Atual: <strong>v{currentDesign.currentVersionNumber}</strong> | Sistema:{' '}
            {currentVersion?.systemType ?? 'ON_GRID'}
          </p>
        </div>

        {/* Version Switcher Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {currentDesign.versions.map((v) => {
            const isSelected = selectedVersionId
              ? v.id === selectedVersionId
              : v.versionNumber === currentDesign.currentVersionNumber;
            return (
              <Button
                key={v.id}
                type="button"
                variant={isSelected ? 'primary' : 'secondary'}
                size="compact"
                onClick={() => setSelectedVersionId(v.id)}
              >
                v{v.versionNumber} ({v.status})
              </Button>
            );
          })}
          {isApproved && !readonly && canCreateDesign && (
            <Button
              type="button"
              variant="secondary"
              size="compact"
              onClick={() => createVersionMutation.mutate()}
              disabled={createVersionMutation.isPending}
            >
              + Nova Versão
            </Button>
          )}
        </div>
      </div>

      <Feedback error={designsQuery.error} />
      <Feedback error={saveVersionMutation.error} />
      <Feedback error={approveMutation.error} />

      {/* Version Status Banner */}
      {isApproved && (
        <div className="design-alert design-alert--success">
          <strong>
            ✅ Versão {currentVersion.versionNumber} Aprovada em{' '}
            {currentVersion.approvedAt
              ? new Date(currentVersion.approvedAt).toLocaleDateString('pt-BR')
              : 'data recente'}
          </strong>
          <p style={{ margin: '4px 0 0', fontSize: '13px' }}>
            Esta versão foi congelada e é imutável. Alterações no catálogo ou custos não modificam
            este registro, garantindo rastreabilidade jurídica e integridade da proposta comercial.
          </p>
        </div>
      )}

      {isDraft && (
        <div className="design-alert design-alert--info">
          <strong>✏️ Versão {currentVersion?.versionNumber} — Rascunho em Elaboração</strong>
          <p style={{ margin: '4px 0 0', fontSize: '13px' }}>
            Adicione ou edite os materiais, custos adicionais e o percentual de markup sobre o
            custo. Ao concluir, submeta a versão para aprovação técnica/comercial.
          </p>
        </div>
      )}

      {/* Technical Sizing Metrics KPI Bar */}
      {currentVersion && (
        <div className="design-kpi-grid">
          <div className="design-kpi-card">
            <div className="design-kpi-card__label">POTÊNCIA DC</div>
            <div
              className="design-kpi-card__value"
              style={{ color: 'var(--brand-solar, #ffd400)' }}
            >
              {currentVersion.dcPowerKwp.toFixed(2)} kWp
            </div>
            <div className="design-kpi-card__subtext">Capacidade fotovoltaica</div>
          </div>
          <div className="design-kpi-card">
            <div className="design-kpi-card__label">POTÊNCIA AC</div>
            <div className="design-kpi-card__value">{currentVersion.acPowerKw.toFixed(2)} kW</div>
            <div className="design-kpi-card__subtext">Potência dos inversores</div>
          </div>
          <div className="design-kpi-card">
            <div className="design-kpi-card__label">GERAÇÃO ESTIMADA</div>
            <div className="design-kpi-card__value">
              {currentVersion.estimatedMonthlyGenerationKwh.toLocaleString('pt-BR')} kWh/mês
            </div>
            <div className="design-kpi-card__subtext">Produção média esperada</div>
          </div>
          <div className="design-kpi-card">
            <div className="design-kpi-card__label">COBERTURA</div>
            <div
              className="design-kpi-card__value"
              style={{ color: 'var(--status-success, #26d866)' }}
            >
              {currentVersion.coveragePercent.toFixed(1)}%
            </div>
            <div className="design-kpi-card__subtext">Do consumo estimado</div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* 1. LISTA DE MATERIAIS E SERVIÇOS (BOM) */}
      {/* -------------------------------------------------------------------- */}
      <div style={{ marginTop: '2rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
            marginBottom: '1rem',
          }}
        >
          <h4
            style={{
              fontSize: '16px',
              fontWeight: 700,
              color: 'var(--text-primary, #f5f7f5)',
              margin: 0,
            }}
          >
            Lista de Materiais e Serviços (Composição Prevista)
          </h4>
          {isDraft && !readonly && (
            <Button
              type="button"
              variant="secondary"
              size="compact"
              onClick={() => setShowManualItemForm(!showManualItemForm)}
            >
              + Item Manual
            </Button>
          )}
        </div>

        {/* Quick Add from Catalog Dropdown */}
        {isDraft && !readonly && (
          <div
            className="design-form"
            style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-end',
              flexWrap: 'wrap',
              marginBlock: '1rem',
            }}
          >
            <label style={{ flex: '2 1 16rem', margin: 0 }}>
              Adicionar do Catálogo Moura Solar
              <select
                value={selectedCatalogId}
                onChange={(e) => setSelectedCatalogId(e.target.value)}
              >
                <option value="">Selecione um item do catálogo…</option>
                {catalogQuery.data?.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    [{cat.category}] {cat.name} — R${' '}
                    {cat.referenceCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ flex: '0 1 7rem', margin: 0 }}>
              Qtd
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={catalogItemQty}
                onChange={(e) => setCatalogItemQty(e.target.value)}
              />
            </label>
            <Button
              type="button"
              variant="primary"
              onClick={handleAddCatalogItem}
              disabled={!selectedCatalogId}
            >
              Adicionar
            </Button>
          </div>
        )}

        {/* Manual Item Form */}
        {showManualItemForm && isDraft && (
          <form className="design-form" onSubmit={handleAddManualItem}>
            <h5
              style={{
                fontSize: '15px',
                fontWeight: 700,
                color: 'var(--text-primary, #f5f7f5)',
                margin: '0 0 12px',
              }}
            >
              Adicionar Item Manual (Fora do Catálogo Padrão)
            </h5>
            <div className="form-grid">
              <label>
                Tipo *
                <select
                  value={manualKind}
                  onChange={(e) => setManualKind(e.target.value as 'MATERIAL' | 'SERVICE')}
                >
                  <option value="MATERIAL">Material</option>
                  <option value="SERVICE">Serviço</option>
                </select>
              </label>
              <label>
                Categoria *
                <select value={manualCategory} onChange={(e) => setManualCategory(e.target.value)}>
                  <option value="STRUCTURE">Estrutura de Fixação</option>
                  <option value="CABLE_ELECTRICAL">Cabos e Elétrica</option>
                  <option value="BATTERY">Bateria</option>
                  <option value="SERVICE_INSTALLATION">Serviço de Instalação</option>
                  <option value="SERVICE_ENGINEERING">Engenharia e Projetos</option>
                  <option value="OTHER">Outros</option>
                </select>
              </label>
              <label>
                Descrição *
                <input
                  type="text"
                  required
                  placeholder="Ex: Transformador elevador 15kVA"
                  value={manualDesc}
                  onChange={(e) => setManualDesc(e.target.value)}
                />
              </label>
              <label>
                Unidade
                <input
                  type="text"
                  value={manualUnit}
                  onChange={(e) => setManualUnit(e.target.value)}
                />
              </label>
              <label>
                Quantidade *
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  required
                  value={manualQty}
                  onChange={(e) => setManualQty(e.target.value)}
                />
              </label>
              <label>
                Custo Unitário Estimado (R$) *
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="Ex: 1450.00"
                  value={manualCost}
                  onChange={(e) => setManualCost(e.target.value)}
                />
              </label>
              <label style={{ gridColumn: '1 / -1' }}>
                Justificativa Obrigatória para Item Manual (SPEC-005 item 8) *
                <input
                  type="text"
                  required
                  placeholder="Justifique o motivo de não utilizar itens do catálogo…"
                  value={manualJustification}
                  onChange={(e) => setManualJustification(e.target.value)}
                />
              </label>
            </div>
            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                justifyContent: 'flex-end',
                marginTop: '1rem',
              }}
            >
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowManualItemForm(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="primary">
                Inserir Item Manual
              </Button>
            </div>
          </form>
        )}

        {/* Items Table */}
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tipo / Categoria</th>
                <th>Descrição</th>
                <th>Qtd</th>
                <th>Custo Unit. (R$)</th>
                <th>Total (R$)</th>
                <th>Origem</th>
                {isDraft && !readonly && <th style={{ textAlign: 'right' }}>Ação</th>}
              </tr>
            </thead>
            <tbody>
              {editItems.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      textAlign: 'center',
                      padding: '1.5rem',
                      color: 'var(--text-secondary, #9ba49e)',
                    }}
                  >
                    Nenhum item na composição.
                  </td>
                </tr>
              )}
              {editItems.map((item, idx) => (
                <tr key={idx}>
                  <td>
                    <span className="badge" style={{ fontSize: '11px' }}>
                      {item.category}
                    </span>
                  </td>
                  <td>
                    <strong style={{ color: 'var(--text-primary, #f5f7f5)' }}>
                      {item.description}
                    </strong>
                    {item.justification && (
                      <div
                        className="device"
                        style={{ fontSize: '12px', color: 'var(--text-secondary, #9ba49e)' }}
                      >
                        Justificativa: {item.justification}
                      </div>
                    )}
                  </td>
                  <td style={{ color: 'var(--text-primary, #f5f7f5)' }}>
                    {item.quantity} {item.unitOfMeasure}
                  </td>
                  <td style={{ color: 'var(--text-primary, #f5f7f5)' }}>
                    R${' '}
                    {item.unitCost.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td>
                    <strong style={{ color: 'var(--brand-solar, #ffd400)' }}>
                      R${' '}
                      {(item.quantity * item.unitCost).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </strong>
                  </td>
                  <td>
                    <span className="device" style={{ fontSize: '12px' }}>
                      {item.costSource}
                    </span>
                  </td>
                  {isDraft && !readonly && (
                    <td style={{ textAlign: 'right' }}>
                      <Button
                        variant="danger"
                        size="compact"
                        onClick={() => {
                          setEditItems(editItems.filter((_, i) => i !== idx));
                        }}
                      >
                        Remover
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* 2. CUSTOS ADICIONAIS E CONTINGÊNCIA */}
      {/* -------------------------------------------------------------------- */}
      <div style={{ marginTop: '2rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
            marginBottom: '1rem',
          }}
        >
          <h4
            style={{
              fontSize: '16px',
              fontWeight: 700,
              color: 'var(--text-primary, #f5f7f5)',
              margin: 0,
            }}
          >
            Custos Adicionais & Contingência
          </h4>
          {isDraft && !readonly && (
            <Button
              type="button"
              variant="secondary"
              size="compact"
              onClick={() => setShowAdditionalCostForm(!showAdditionalCostForm)}
            >
              + Custo Adicional
            </Button>
          )}
        </div>

        {showAdditionalCostForm && isDraft && (
          <form className="design-form" onSubmit={handleAddAdditionalCost}>
            <h5
              style={{
                fontSize: '15px',
                fontWeight: 700,
                color: 'var(--text-primary, #f5f7f5)',
                margin: '0 0 12px',
              }}
            >
              Adicionar Custo Adicional
            </h5>
            <div className="form-grid">
              <label>
                Categoria *
                <select
                  value={addCostCategory}
                  onChange={(e) => setAddCostCategory(e.target.value)}
                >
                  <option value="FREIGHT">Frete e Logística</option>
                  <option value="LABOR">Mão de Obra Especializada</option>
                  <option value="ENGINEERING_ART">Homologação / ART</option>
                  <option value="ELECTRICAL_ADEQUACY">Adequação de Padrão</option>
                  <option value="EQUIPMENT_RENTAL">
                    Locação de Equipamentos (Guindaste, etc.)
                  </option>
                  <option value="TAXES">Tributos Específicos</option>
                  <option value="OTHER">Outros</option>
                </select>
              </label>
              <label>
                Descrição *
                <input
                  type="text"
                  required
                  placeholder="Ex: Frete rodoviário segurado"
                  value={addCostDesc}
                  onChange={(e) => setAddCostDesc(e.target.value)}
                />
              </label>
              <label>
                Valor Estimado (R$) *
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="Ex: 850.00"
                  value={addCostAmount}
                  onChange={(e) => setAddCostAmount(e.target.value)}
                />
              </label>
            </div>
            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                justifyContent: 'flex-end',
                marginTop: '1rem',
              }}
            >
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowAdditionalCostForm(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="primary">
                Salvar Custo
              </Button>
            </div>
          </form>
        )}

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Categoria</th>
                <th>Descrição</th>
                <th>Valor (R$)</th>
                {isDraft && !readonly && <th style={{ textAlign: 'right' }}>Ação</th>}
              </tr>
            </thead>
            <tbody>
              {editAdditionalCosts.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      textAlign: 'center',
                      padding: '1rem',
                      color: 'var(--text-secondary, #9ba49e)',
                    }}
                  >
                    Nenhum custo adicional registrado.
                  </td>
                </tr>
              )}
              {editAdditionalCosts.map((cost, idx) => (
                <tr key={idx}>
                  <td>
                    <span className="badge" style={{ fontSize: '11px' }}>
                      {cost.category}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-primary, #f5f7f5)' }}>{cost.description}</td>
                  <td>
                    <strong style={{ color: 'var(--brand-solar, #ffd400)' }}>
                      R${' '}
                      {cost.amount.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </strong>
                  </td>
                  {isDraft && !readonly && (
                    <td style={{ textAlign: 'right' }}>
                      <Button
                        variant="danger"
                        size="compact"
                        onClick={() => {
                          setEditAdditionalCosts(editAdditionalCosts.filter((_, i) => i !== idx));
                        }}
                      >
                        Remover
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* 3. PAINEL DE PRECIFICAÇÃO, MARKUP VS MARGEM E ALÇADA */}
      {/* -------------------------------------------------------------------- */}
      <div className="design-pricing-box" style={{ marginTop: '2.5rem' }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <h4
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--text-primary, #f5f7f5)',
              margin: '0 0 4px',
            }}
          >
            Composição de Custos, Markup e Margem Bruta
          </h4>
          <p className="device" style={{ margin: 0 }}>
            Conforme <strong>SPEC-005 item 8 e 9</strong>: distinção exata entre Markup (percentual
            sobre o custo) e Margem Bruta (percentual sobre o preço final de venda).
          </p>
        </div>

        {/* Cost Summary Breakdown */}
        <div className="design-kpi-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="design-kpi-card">
            <div className="design-kpi-card__label">CUSTO DIRETO MATERIAIS</div>
            <div className="design-kpi-card__value" style={{ fontSize: '18px' }}>
              R${' '}
              {editItems
                .filter((i) => i.kind === 'MATERIAL')
                .reduce((acc, i) => acc + i.quantity * i.unitCost, 0)
                .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="design-kpi-card__subtext">Equipamentos e insumos</div>
          </div>

          <div className="design-kpi-card">
            <div className="design-kpi-card__label">CUSTO DIRETO SERVIÇOS</div>
            <div className="design-kpi-card__value" style={{ fontSize: '18px' }}>
              R${' '}
              {editItems
                .filter((i) => i.kind === 'SERVICE')
                .reduce((acc, i) => acc + i.quantity * i.unitCost, 0)
                .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="design-kpi-card__subtext">Instalação e engenharia</div>
          </div>

          <div className="design-kpi-card">
            <div className="design-kpi-card__label">CUSTOS ADICIONAIS</div>
            <div className="design-kpi-card__value" style={{ fontSize: '18px' }}>
              R${' '}
              {editAdditionalCosts
                .reduce((acc, c) => acc + c.amount, 0)
                .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="design-kpi-card__subtext">Frete, ART e taxas</div>
          </div>

          <div className="design-kpi-card" style={{ borderColor: 'rgba(255, 212, 0, 0.4)' }}>
            <div
              className="design-kpi-card__label"
              style={{ color: 'var(--brand-solar, #ffd400)' }}
            >
              CUSTO TOTAL ESTIMADO
            </div>
            <div
              className="design-kpi-card__value"
              style={{ fontSize: '20px', color: 'var(--brand-solar, #ffd400)' }}
            >
              R${' '}
              {totalDirectCost.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div className="design-kpi-card__subtext">Base para o markup</div>
          </div>
        </div>

        {/* Pricing Controls (Markup, Discount, Contingency) */}
        {isDraft && !readonly ? (
          <div className="form-grid" style={{ marginBottom: '1.5rem' }}>
            <label>
              Contingência Operacional (R$)
              <input
                type="number"
                step="50"
                min="0"
                value={contingencyAmount}
                onChange={(e) => setContingencyAmount(parseFloat(e.target.value) || 0)}
              />
            </label>

            <label>
              Markup sobre o Custo Total (%) *
              <input
                type="number"
                step="0.5"
                min="0"
                max="200"
                value={markupPercent}
                onChange={(e) => setMarkupPercent(parseFloat(e.target.value) || 0)}
              />
              <span className="device" style={{ fontSize: '12px', fontWeight: 400 }}>
                Fórmula: Preço = Custo × (1 + Markup / 100)
              </span>
            </label>

            <label>
              Desconto Comercial (R$)
              <input
                type="number"
                step="50"
                min="0"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
              />
            </label>
          </div>
        ) : null}

        {/* Final Price & Gross Margin Big Display */}
        <div
          className={`design-pricing-highlight ${
            isLowMargin
              ? 'design-pricing-highlight--low-margin'
              : 'design-pricing-highlight--normal'
          }`}
        >
          <div>
            <span
              className="device"
              style={{
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              VALOR FINAL DE VENDA
            </span>
            <div className="design-pricing-amount">
              R${' '}
              {finalPrice.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            {discountAmount > 0 && (
              <span className="device" style={{ fontSize: '13px' }}>
                Preço inicial R${' '}
                {priceBeforeDiscount.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                (- R$ {discountAmount.toLocaleString('pt-BR')})
              </span>
            )}
          </div>

          <div>
            <span
              className="device"
              style={{
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              MARGEM BRUTA SOBRE O PREÇO
            </span>
            <div
              className={`design-margin-amount ${
                isLowMargin ? 'design-margin-amount--low' : 'design-margin-amount--normal'
              }`}
            >
              {grossMarginPercent.toFixed(1)}%
            </div>
            <span className="device" style={{ fontSize: '13px' }}>
              Lucro Bruto: R${' '}
              {grossMarginAmount.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              | Markup aplicado: {markupPercent.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Low Margin Warning & Governance Notice (SPEC-005 item 9 & 16) */}
        {isLowMargin && (
          <div
            className="design-alert design-alert--danger"
            data-testid="low-margin-alert"
            style={{ marginTop: '1.25rem' }}
          >
            <strong>
              ⚠️ Alçada de Margem: Margem Inferior a 20% ({grossMarginPercent.toFixed(1)}%)
            </strong>
            <p style={{ margin: '4px 0 0', fontSize: '13px' }}>
              A margem bruta estimada está abaixo da alçada comercial mínima padrão da Moura Solar
              (20%). Para aprovar esta versão, será{' '}
              <strong>
                obrigatório registrar uma justificativa formal de exceção comercial/diretoria
              </strong>
              .
            </p>
          </div>
        )}

        {/* Actions for Draft Version */}
        {isDraft && !readonly && (
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'flex-end',
              marginTop: '1.5rem',
              flexWrap: 'wrap',
            }}
          >
            {canUpdateDesign && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => saveVersionMutation.mutate()}
                disabled={saveVersionMutation.isPending}
              >
                Salvar Rascunho
              </Button>
            )}

            {canApproveDesign && (
              <Button
                type="button"
                variant="primary"
                onClick={() => setIsApproving(true)}
                disabled={approveMutation.isPending}
              >
                ✔ Aprovar Versão do Dimensionamento
              </Button>
            )}
          </div>
        )}
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* 4. MODAL / PAINEL DE APROVAÇÃO COM TRAVA DE ALÇADA */}
      {/* -------------------------------------------------------------------- */}
      {isApproving && isDraft && (
        <div
          className="design-panel"
          data-testid="approval-dialog"
          style={{
            marginTop: '2rem',
            border: '2px solid var(--brand-solar, #ffd400)',
            background: 'var(--surface-elevated, #1c211d)',
          }}
        >
          <h4
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--text-primary, #f5f7f5)',
              margin: '0 0 6px',
            }}
          >
            Aprovação Técnica e Comercial — Versão {currentVersion?.versionNumber}
          </h4>
          <p className="device" style={{ margin: '0 0 16px' }}>
            A aprovação congela esta versão como imutável, tornando-a a base oficial para a geração
            de propostas comerciais e contratos.
          </p>

          <Feedback error={approveMutation.error} />

          <div className="design-form" style={{ background: 'var(--surface-card, #161a17)' }}>
            {isLowMargin && (
              <label style={{ color: 'var(--status-danger, #ff4d57)' }}>
                Justificativa Obrigatória de Exceção de Margem (&lt; 20%) *
                <input
                  type="text"
                  required
                  data-testid="override-margin-input"
                  placeholder="Informe a autorização da diretoria / alçada comercial para margem reduzida…"
                  value={lowMarginJustification}
                  onChange={(e) => setLowMarginJustification(e.target.value)}
                />
              </label>
            )}

            <label style={{ marginTop: isLowMargin ? '12px' : 0 }}>
              Observações Gerais de Aprovação (Opcional)
              <input
                type="text"
                placeholder="Ex: Projeto técnico validado de acordo com a vistoria técnica…"
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
              />
            </label>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'flex-end',
              marginTop: '1.25rem',
            }}
          >
            <Button type="button" variant="secondary" onClick={() => setIsApproving(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              data-testid="confirm-approval-btn"
              onClick={() => approveMutation.mutate()}
              disabled={
                approveMutation.isPending || (isLowMargin && !lowMarginJustification.trim())
              }
            >
              Confirmar e Congelar Aprovação
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
