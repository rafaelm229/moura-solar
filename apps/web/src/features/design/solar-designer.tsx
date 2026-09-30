'use client';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, result, allows } from '../identity/client';
import { Feedback } from '../identity/feedback';
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
      <section className="panel" aria-label="Assistente de Dimensionamento Solar">
        <div style={{ marginBottom: '1rem' }}>
          <h3>Assistente de Dimensionamento Solar & Catálogo</h3>
          <p className="device">
            Calcule a potência fotovoltaica ótima (kWp), o arranjo de módulos e os inversores
            compatíveis segundo as regras normativas e o catálogo Moura Solar.
          </p>
        </div>

        <Feedback error={designsQuery.error} />
        <Feedback error={suggestMutation.error} />
        <Feedback error={createDesignMutation.error} />

        <div className="panel" style={{ background: 'var(--color-canvas)' }}>
          <h4>Parâmetros de Entrada</h4>
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

          <div className="actions" style={{ marginTop: '1rem' }}>
            <button
              type="button"
              onClick={() => suggestMutation.mutate()}
              disabled={suggestMutation.isPending}
            >
              Calcular Sugestão de Dimensionamento
            </button>
          </div>
        </div>

        {/* Suggestion Result Display */}
        {suggestion && (
          <div
            className="panel"
            style={{
              marginTop: '1.5rem',
              border: '2px solid var(--brand-primary)',
              background: 'var(--brand-primary-soft)',
            }}
          >
            <span className="eyebrow">SUGESTÃO TÉCNICA AUTOMATIZADA</span>
            <h4 style={{ marginBlock: '0.25rem' }}>
              Sistema Recomendado: {suggestion.suggestedDcPowerKwp} kWp (Geração est.{' '}
              {suggestion.estimatedMonthlyGenerationKwh.toLocaleString('pt-BR')} kWh/mês)
            </h4>
            <p className="device" style={{ fontSize: '0.8125rem' }}>
              {suggestion.classification}
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(11rem, 1fr))',
                gap: '0.75rem',
                marginBlock: '1rem',
              }}
            >
              <div className="panel" style={{ margin: 0, padding: '0.75rem' }}>
                <span className="device" style={{ fontSize: '0.75rem' }}>
                  GERAÇÃO ESTIMADA
                </span>
                <strong style={{ fontSize: '1.25rem', display: 'block' }}>
                  {suggestion.estimatedMonthlyGenerationKwh.toLocaleString('pt-BR')} kWh/mês
                </strong>
                <span className="device" style={{ fontSize: '0.75rem' }}>
                  {suggestion.estimatedAnnualGenerationKwh.toLocaleString('pt-BR')} kWh/ano
                </span>
              </div>

              <div className="panel" style={{ margin: 0, padding: '0.75rem' }}>
                <span className="device" style={{ fontSize: '0.75rem' }}>
                  MÓDULOS FOTOVOLTAICOS
                </span>
                <strong style={{ fontSize: '1.25rem', display: 'block' }}>
                  {suggestion.suggestedModuleQuantity}× {suggestion.suggestedModulePowerWp} Wp
                </strong>
                <span className="device" style={{ fontSize: '0.75rem' }}>
                  Potência DC: {suggestion.suggestedDcPowerKwp} kWp
                </span>
              </div>

              <div className="panel" style={{ margin: 0, padding: '0.75rem' }}>
                <span className="device" style={{ fontSize: '0.75rem' }}>
                  INVERSOR SOLAR
                </span>
                <strong style={{ fontSize: '1.25rem', display: 'block' }}>
                  {suggestion.suggestedInverterQuantity}× {suggestion.suggestedInverterPowerKw} kW
                </strong>
                <span className="device" style={{ fontSize: '0.75rem' }}>
                  Razão CC/CA: {suggestion.dcAcRatio}
                </span>
              </div>
            </div>

            {!readonly && canCreateDesign && (
              <div className="actions" style={{ marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => createDesignMutation.mutate()}
                  disabled={createDesignMutation.isPending}
                >
                  Criar Dimensionamento a partir desta Sugestão
                </button>
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
    <section className="panel" aria-label="Dimensionamento Solar e Composição de Custos">
      {/* Header and Version Tabs */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <div>
          <h3>{currentDesign.name}</h3>
          <p className="device">
            Versão Atual: <strong>v{currentDesign.currentVersionNumber}</strong> | Sistema:{' '}
            {currentVersion?.systemType ?? 'ON_GRID'}
          </p>
        </div>

        {/* Version Switcher Tabs */}
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {currentDesign.versions.map((v) => (
            <button
              key={v.id}
              type="button"
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.8125rem',
                background: (
                  selectedVersionId
                    ? v.id === selectedVersionId
                    : v.versionNumber === currentDesign.currentVersionNumber
                )
                  ? 'var(--brand-primary)'
                  : 'var(--color-surface)',
                color: (
                  selectedVersionId
                    ? v.id === selectedVersionId
                    : v.versionNumber === currentDesign.currentVersionNumber
                )
                  ? 'var(--color-surface)'
                  : 'var(--brand-primary)',
              }}
              onClick={() => setSelectedVersionId(v.id)}
            >
              v{v.versionNumber} ({v.status})
            </button>
          ))}
          {isApproved && !readonly && canCreateDesign && (
            <button
              type="button"
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.8125rem',
                background: 'var(--color-surface)',
                color: 'var(--brand-primary)',
              }}
              onClick={() => createVersionMutation.mutate()}
              disabled={createVersionMutation.isPending}
            >
              + Nova Versão
            </button>
          )}
        </div>
      </div>

      <Feedback error={designsQuery.error} />
      <Feedback error={saveVersionMutation.error} />
      <Feedback error={approveMutation.error} />

      {/* Version Status Banner */}
      {isApproved && (
        <div
          className="notice"
          style={{
            marginBlock: '1rem',
            borderLeft: '4px solid var(--brand-primary)',
            background: 'var(--brand-primary-soft)',
            color: 'var(--brand-primary-strong)',
          }}
        >
          <strong>
            ✅ Versão {currentVersion.versionNumber} Aprovada em{' '}
            {currentVersion.approvedAt
              ? new Date(currentVersion.approvedAt).toLocaleDateString('pt-BR')
              : 'data recente'}
          </strong>
          <p style={{ margin: 0, fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Esta versão foi congelada e é imutável. Alterações no catálogo ou custos não modificam
            este registro, garantindo rastreabilidade jurídica e integridade da proposta comercial.
          </p>
        </div>
      )}

      {isDraft && (
        <div
          className="notice"
          style={{
            marginBlock: '1rem',
            borderLeft: '4px solid var(--color-brand-500)',
            background: 'var(--color-canvas)',
          }}
        >
          <strong>✏️ Versão {currentVersion?.versionNumber} — Rascunho em Elaboração</strong>
          <p className="device" style={{ margin: 0, fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Adicione ou edite os materiais, custos adicionais e o percentual de markup sobre o
            custo. Ao concluir, submeta a versão para aprovação técnica/comercial.
          </p>
        </div>
      )}

      {/* Technical Sizing Metrics KPI Bar */}
      {currentVersion && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(9.5rem, 1fr))',
            gap: '0.75rem',
            marginBlock: '1rem',
          }}
        >
          <div className="panel" style={{ margin: 0, padding: '0.75rem' }}>
            <span className="device" style={{ fontSize: '0.75rem' }}>
              POTÊNCIA DC
            </span>
            <strong style={{ fontSize: '1.25rem', display: 'block' }}>
              {currentVersion.dcPowerKwp.toFixed(2)} kWp
            </strong>
          </div>
          <div className="panel" style={{ margin: 0, padding: '0.75rem' }}>
            <span className="device" style={{ fontSize: '0.75rem' }}>
              POTÊNCIA AC
            </span>
            <strong style={{ fontSize: '1.25rem', display: 'block' }}>
              {currentVersion.acPowerKw.toFixed(2)} kW
            </strong>
          </div>
          <div className="panel" style={{ margin: 0, padding: '0.75rem' }}>
            <span className="device" style={{ fontSize: '0.75rem' }}>
              GERAÇÃO ESTIMADA
            </span>
            <strong style={{ fontSize: '1.25rem', display: 'block' }}>
              {currentVersion.estimatedMonthlyGenerationKwh.toLocaleString('pt-BR')} kWh/mês
            </strong>
          </div>
          <div className="panel" style={{ margin: 0, padding: '0.75rem' }}>
            <span className="device" style={{ fontSize: '0.75rem' }}>
              COBERTURA
            </span>
            <strong style={{ fontSize: '1.25rem', display: 'block' }}>
              {currentVersion.coveragePercent.toFixed(1)}%
            </strong>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* 1. LISTA DE MATERIAIS E SERVIÇOS (BOM) */}
      {/* -------------------------------------------------------------------- */}
      <div style={{ marginTop: '1.5rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <h4>Lista de Materiais e Serviços (Composição Prevista)</h4>
          {isDraft && !readonly && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.8125rem',
                  background: 'var(--color-surface)',
                  color: 'var(--text-primary)',
                }}
                onClick={() => setShowManualItemForm(!showManualItemForm)}
              >
                + Item Manual
              </button>
            </div>
          )}
        </div>

        {/* Quick Add from Catalog Dropdown */}
        {isDraft && !readonly && (
          <div
            className="panel"
            style={{
              background: 'var(--color-canvas)',
              marginBlock: '0.75rem',
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'flex-end',
              flexWrap: 'wrap',
            }}
          >
            <label style={{ flex: '2 1 14rem', margin: 0 }}>
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
            <label style={{ flex: '0 1 6rem', margin: 0 }}>
              Qtd
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={catalogItemQty}
                onChange={(e) => setCatalogItemQty(e.target.value)}
              />
            </label>
            <button
              type="button"
              onClick={handleAddCatalogItem}
              disabled={!selectedCatalogId}
              style={{ minHeight: 'var(--touch-target)' }}
            >
              Adicionar
            </button>
          </div>
        )}

        {/* Manual Item Form */}
        {showManualItemForm && isDraft && (
          <form
            className="panel"
            style={{ background: 'var(--color-canvas)', marginBlock: '0.75rem' }}
            onSubmit={handleAddManualItem}
          >
            <h5>Adicionar Item Manual (Fora do Catálogo Padrão)</h5>
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
            <div className="actions" style={{ marginTop: '0.75rem' }}>
              <button type="submit">Inserir Item Manual</button>
              <button
                type="button"
                style={{ background: 'var(--color-surface)', color: 'var(--text-primary)' }}
                onClick={() => setShowManualItemForm(false)}
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {/* Items Table / Cards */}
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
                {isDraft && !readonly && <th>Ação</th>}
              </tr>
            </thead>
            <tbody>
              {editItems.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '1rem' }}>
                    Nenhum item na composição.
                  </td>
                </tr>
              )}
              {editItems.map((item, idx) => (
                <tr key={idx}>
                  <td>
                    <span className="badge" style={{ fontSize: '0.7rem' }}>
                      {item.category}
                    </span>
                  </td>
                  <td>
                    <strong>{item.description}</strong>
                    {item.justification && (
                      <div className="device" style={{ fontSize: '0.75rem' }}>
                        Justificativa: {item.justification}
                      </div>
                    )}
                  </td>
                  <td>
                    {item.quantity} {item.unitOfMeasure}
                  </td>
                  <td>
                    R${' '}
                    {item.unitCost.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td>
                    <strong>
                      R${' '}
                      {(item.quantity * item.unitCost).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </strong>
                  </td>
                  <td>
                    <span className="device" style={{ fontSize: '0.75rem' }}>
                      {item.costSource}
                    </span>
                  </td>
                  {isDraft && !readonly && (
                    <td>
                      <button
                        type="button"
                        style={{
                          padding: '0.2rem 0.4rem',
                          fontSize: '0.75rem',
                          background: 'var(--color-surface)',
                          color: 'var(--status-danger)',
                          borderColor: 'var(--status-danger)',
                        }}
                        onClick={() => {
                          setEditItems(editItems.filter((_, i) => i !== idx));
                        }}
                      >
                        Remover
                      </button>
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
      <div style={{ marginTop: '1.5rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <h4>Custos Adicionais & Contingência</h4>
          {isDraft && !readonly && (
            <button
              type="button"
              style={{
                padding: '0.25rem 0.5rem',
                fontSize: '0.8125rem',
                background: 'var(--color-surface)',
                color: 'var(--text-primary)',
              }}
              onClick={() => setShowAdditionalCostForm(!showAdditionalCostForm)}
            >
              + Custo Adicional
            </button>
          )}
        </div>

        {showAdditionalCostForm && isDraft && (
          <form
            className="panel"
            style={{ background: 'var(--color-canvas)', marginBlock: '0.75rem' }}
            onSubmit={handleAddAdditionalCost}
          >
            <h5>Adicionar Custo Adicional</h5>
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
            <div className="actions" style={{ marginTop: '0.75rem' }}>
              <button type="submit">Salvar Custo</button>
              <button
                type="button"
                style={{ background: 'var(--color-surface)', color: 'var(--text-primary)' }}
                onClick={() => setShowAdditionalCostForm(false)}
              >
                Cancelar
              </button>
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
                {isDraft && !readonly && <th>Ação</th>}
              </tr>
            </thead>
            <tbody>
              {editAdditionalCosts.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '0.75rem' }}>
                    Nenhum custo adicional registrado.
                  </td>
                </tr>
              )}
              {editAdditionalCosts.map((cost, idx) => (
                <tr key={idx}>
                  <td>
                    <span className="badge" style={{ fontSize: '0.7rem' }}>
                      {cost.category}
                    </span>
                  </td>
                  <td>{cost.description}</td>
                  <td>
                    <strong>
                      R${' '}
                      {cost.amount.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </strong>
                  </td>
                  {isDraft && !readonly && (
                    <td>
                      <button
                        type="button"
                        style={{
                          padding: '0.2rem 0.4rem',
                          fontSize: '0.75rem',
                          background: 'var(--color-surface)',
                          color: 'var(--status-danger)',
                          borderColor: 'var(--status-danger)',
                        }}
                        onClick={() => {
                          setEditAdditionalCosts(editAdditionalCosts.filter((_, i) => i !== idx));
                        }}
                      >
                        Remover
                      </button>
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
      <div
        className="panel"
        style={{
          marginTop: '2rem',
          border: '2px solid var(--color-border)',
          background: 'var(--color-surface)',
        }}
      >
        <div style={{ marginBottom: '1rem' }}>
          <h4>Composição de Custos, Markup e Margem Bruta</h4>
          <p className="device">
            Conforme <strong>SPEC-005 item 8 e 9</strong>: distinção exata entre Markup (percentual
            sobre o custo) e Margem Bruta (percentual sobre o preço final de venda).
          </p>
        </div>

        {/* Cost Summary Breakdown */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(11rem, 1fr))',
            gap: '0.75rem',
            marginBottom: '1.5rem',
          }}
        >
          <div className="panel" style={{ margin: 0, padding: '0.75rem' }}>
            <span className="device" style={{ fontSize: '0.75rem' }}>
              CUSTO DIRETO MATERIAIS
            </span>
            <strong style={{ display: 'block', fontSize: '1.1rem' }}>
              R${' '}
              {editItems
                .filter((i) => i.kind === 'MATERIAL')
                .reduce((acc, i) => acc + i.quantity * i.unitCost, 0)
                .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </strong>
          </div>

          <div className="panel" style={{ margin: 0, padding: '0.75rem' }}>
            <span className="device" style={{ fontSize: '0.75rem' }}>
              CUSTO DIRETO SERVIÇOS
            </span>
            <strong style={{ display: 'block', fontSize: '1.1rem' }}>
              R${' '}
              {editItems
                .filter((i) => i.kind === 'SERVICE')
                .reduce((acc, i) => acc + i.quantity * i.unitCost, 0)
                .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </strong>
          </div>

          <div className="panel" style={{ margin: 0, padding: '0.75rem' }}>
            <span className="device" style={{ fontSize: '0.75rem' }}>
              CUSTOS ADICIONAIS
            </span>
            <strong style={{ display: 'block', fontSize: '1.1rem' }}>
              R${' '}
              {editAdditionalCosts
                .reduce((acc, c) => acc + c.amount, 0)
                .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </strong>
          </div>

          <div
            className="panel"
            style={{ margin: 0, padding: '0.75rem', background: 'var(--color-canvas)' }}
          >
            <span className="device" style={{ fontSize: '0.75rem' }}>
              CUSTO TOTAL ESTIMADO
            </span>
            <strong
              style={{
                display: 'block',
                fontSize: '1.25rem',
                color: 'var(--text-primary)',
              }}
            >
              R${' '}
              {totalDirectCost.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </strong>
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
              <span className="device" style={{ fontSize: '0.75rem', fontWeight: 400 }}>
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
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))',
            gap: '1rem',
            padding: '1.25rem',
            borderRadius: 'var(--radius-md)',
            background: isLowMargin ? '#fffbeb' : 'var(--brand-primary-soft)',
            border: isLowMargin
              ? '2px solid var(--color-accent-500)'
              : '2px solid var(--brand-primary)',
          }}
        >
          <div>
            <span className="eyebrow" style={{ color: 'var(--text-secondary)' }}>
              VALOR FINAL DE VENDA
            </span>
            <div
              style={{
                fontSize: '2rem',
                fontWeight: 800,
                color: 'var(--brand-primary-strong)',
                lineHeight: 1.1,
              }}
            >
              R${' '}
              {finalPrice.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            {discountAmount > 0 && (
              <span className="device" style={{ fontSize: '0.8125rem' }}>
                Preço inicial R${' '}
                {priceBeforeDiscount.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                (- R${discountAmount.toLocaleString('pt-BR')})
              </span>
            )}
          </div>

          <div>
            <span className="eyebrow" style={{ color: 'var(--text-secondary)' }}>
              MARGEM BRUTA SOBRE O PREÇO
            </span>
            <div
              style={{
                fontSize: '2rem',
                fontWeight: 800,
                color: isLowMargin ? '#b45309' : 'var(--brand-primary-strong)',
                lineHeight: 1.1,
              }}
            >
              {grossMarginPercent.toFixed(1)}%
            </div>
            <span className="device" style={{ fontSize: '0.8125rem' }}>
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
            className="notice error"
            data-testid="low-margin-alert"
            style={{
              marginTop: '1rem',
              borderLeft: '4px solid var(--status-danger)',
              background: '#fef2f2',
            }}
          >
            <strong>
              ⚠️ Alçada de Margem: Margem Inferior a 20% ({grossMarginPercent.toFixed(1)}%)
            </strong>
            <p style={{ margin: 0, fontSize: '0.875rem', marginTop: '0.25rem' }}>
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
          <div className="actions" style={{ marginTop: '1.5rem' }}>
            {canUpdateDesign && (
              <button
                type="button"
                style={{ background: 'var(--color-surface)', color: 'var(--text-primary)' }}
                onClick={() => saveVersionMutation.mutate()}
                disabled={saveVersionMutation.isPending}
              >
                Salvar Rascunho
              </button>
            )}

            {canApproveDesign && (
              <button
                type="button"
                onClick={() => setIsApproving(true)}
                disabled={approveMutation.isPending}
              >
                ✔ Aprovar Versão do Dimensionamento
              </button>
            )}
          </div>
        )}
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* 4. MODAL / PAINEL DE APROVAÇÃO COM TRAVA DE ALÇADA */}
      {/* -------------------------------------------------------------------- */}
      {isApproving && isDraft && (
        <div
          className="notice"
          data-testid="approval-dialog"
          style={{
            marginTop: '1.5rem',
            borderLeft: '4px solid var(--brand-primary)',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            padding: '1.25rem',
          }}
        >
          <h4>Aprovação Técnica e Comercial — Versão {currentVersion?.versionNumber}</h4>
          <p className="device">
            A aprovação congela esta versão como imutável, tornando-a a base oficial para a geração
            de propostas comerciais e contratos.
          </p>

          <Feedback error={approveMutation.error} />

          {isLowMargin && (
            <label style={{ color: 'var(--status-danger)' }}>
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

          <label>
            Observações Gerais de Aprovação (Opcional)
            <input
              type="text"
              placeholder="Ex: Projeto técnico validado de acordo com a vistoria técnica…"
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
            />
          </label>

          <div className="actions" style={{ marginTop: '1rem' }}>
            <button
              type="button"
              data-testid="confirm-approval-btn"
              onClick={() => approveMutation.mutate()}
              disabled={
                approveMutation.isPending || (isLowMargin && !lowMarginJustification.trim())
              }
            >
              Confirmar e Congelar Aprovação
            </button>
            <button
              type="button"
              style={{ background: 'var(--color-surface)', color: 'var(--text-primary)' }}
              onClick={() => setIsApproving(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
