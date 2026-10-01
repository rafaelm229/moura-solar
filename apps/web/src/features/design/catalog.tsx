'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, result, allows } from '../identity/client';
import { Feedback } from '../identity/feedback';
import { Button } from '../../ui/Button';
import type { Schemas } from '@moura-solar/api-client';

type CatalogItem = Schemas['CatalogItemViewDto'];

const CATEGORY_LABELS: Record<string, string> = {
  MODULE: 'Módulo Fotovoltaico',
  INVERTER: 'Inversor / Microinversor',
  STRUCTURE: 'Estrutura de Fixação',
  CABLE_ELECTRICAL: 'Cabos e Elétrica',
  BATTERY: 'Bateria / Armazenamento',
  SERVICE_INSTALLATION: 'Instalação',
  SERVICE_ENGINEERING: 'Engenharia / ART',
  OTHER: 'Outros',
};

export function Catalog() {
  const queryClient = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // New item form
  const [sku, setSku] = useState('');
  const [kind, setKind] = useState<'MATERIAL' | 'SERVICE'>('MATERIAL');
  const [category, setCategory] = useState<
    | 'MODULE'
    | 'INVERTER'
    | 'STRUCTURE'
    | 'CABLE_ELECTRICAL'
    | 'BATTERY'
    | 'SERVICE_INSTALLATION'
    | 'SERVICE_ENGINEERING'
    | 'OTHER'
  >('MODULE');
  const [name, setName] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [unitOfMeasure, setUnitOfMeasure] = useState('UN');
  const [powerRatingWp, setPowerRatingWp] = useState('');
  const [powerRatingKw, setPowerRatingKw] = useState('');
  const [referenceCost, setReferenceCost] = useState('');
  const [referencePrice, setReferencePrice] = useState('');

  // Permissions
  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => result(api.GET('/api/v1/identity/me')),
  });
  const canManageCatalog = me.data ? allows(me.data, 'catalog:manage', false) : false;

  const catalogQuery = useQuery({
    queryKey: ['catalog', categoryFilter],
    queryFn: () =>
      result(
        api.GET('/api/v1/catalog', {
          params: {
            query: {
              category: categoryFilter || undefined,
            },
          },
        }),
      ),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return result(
        api.POST('/api/v1/catalog', {
          body: {
            sku,
            kind,
            category,
            name,
            manufacturer: manufacturer || undefined,
            model: model || undefined,
            unitOfMeasure,
            powerRatingWp: powerRatingWp ? parseFloat(powerRatingWp) : undefined,
            powerRatingKw: powerRatingKw ? parseFloat(powerRatingKw) : undefined,
            referenceCost: parseFloat(referenceCost),
            referencePrice: referencePrice ? parseFloat(referencePrice) : undefined,
          },
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
      setShowAddForm(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setSku('');
    setName('');
    setManufacturer('');
    setModel('');
    setPowerRatingWp('');
    setPowerRatingKw('');
    setReferenceCost('');
    setReferencePrice('');
  };

  const rawItems: CatalogItem[] = catalogQuery.data ?? [];
  const items = rawItems.filter((i) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      i.name.toLowerCase().includes(term) ||
      i.sku.toLowerCase().includes(term) ||
      i.manufacturer?.toLowerCase().includes(term) ||
      i.model?.toLowerCase().includes(term)
    );
  });

  const modulesCount = rawItems.filter((i) => i.category === 'MODULE').length;
  const invertersCount = rawItems.filter((i) => i.category === 'INVERTER').length;
  const othersCount = rawItems.filter(
    (i) => i.category !== 'MODULE' && i.category !== 'INVERTER',
  ).length;

  return (
    <div className="design-catalog-page" aria-label="Catálogo de Materiais e Serviços">
      {/* TOOLBAR */}
      <div className="comm-toolbar">
        <div className="comm-toolbar__title-group">
          <h2 className="comm-toolbar__title">Catálogo de Materiais & Serviços</h2>
          <span className="comm-toolbar__count">{rawItems.length} itens homologados</span>
        </div>
        <div className="comm-toolbar__actions">
          {canManageCatalog && !showAddForm && (
            <Button variant="primary" onClick={() => setShowAddForm(true)}>
              + Novo Item no Catálogo
            </Button>
          )}
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="design-kpi-grid">
        <div className="design-kpi-card">
          <div className="design-kpi-card__label">Total no Catálogo</div>
          <div className="design-kpi-card__value">{rawItems.length}</div>
          <div className="design-kpi-card__subtext">Itens homologados</div>
        </div>
        <div className="design-kpi-card">
          <div className="design-kpi-card__label">Módulos Solares</div>
          <div className="design-kpi-card__value" style={{ color: 'var(--brand-solar, #ffd400)' }}>
            {modulesCount}
          </div>
          <div className="design-kpi-card__subtext">Painéis fotovoltaicos</div>
        </div>
        <div className="design-kpi-card">
          <div className="design-kpi-card__label">Inversores</div>
          <div className="design-kpi-card__value" style={{ color: '#3B82F6' }}>
            {invertersCount}
          </div>
          <div className="design-kpi-card__subtext">Inversores e microinversores</div>
        </div>
        <div className="design-kpi-card">
          <div className="design-kpi-card__label">Estruturas & Serviços</div>
          <div className="design-kpi-card__value" style={{ color: '#26D866' }}>
            {othersCount}
          </div>
          <div className="design-kpi-card__subtext">Fixações, cabos e serviços</div>
        </div>
      </div>

      <Feedback error={catalogQuery.error} />
      <Feedback error={createMutation.error} />

      {/* MODAL: NEW ITEM FORM */}
      {showAddForm && canManageCatalog && (
        <div className="comm-modal-overlay">
          <section
            className="comm-modal-box"
            style={{ maxWidth: '680px' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-catalog-item-title"
          >
            <div className="comm-modal-header">
              <h3 id="new-catalog-item-title" className="comm-modal-title">
                Novo Item de Catálogo
              </h3>
              <button
                type="button"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary, #9ba49e)',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                }}
                onClick={() => setShowAddForm(false)}
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate();
              }}
            >
              <div className="form-grid">
                <label>
                  SKU Interno Único *
                  <input
                    type="text"
                    required
                    placeholder="Ex: MOD-630-LONGI"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                  />
                </label>
                <label>
                  Tipo *
                  <select
                    value={kind}
                    onChange={(e) => setKind(e.target.value as 'MATERIAL' | 'SERVICE')}
                  >
                    <option value="MATERIAL">Material</option>
                    <option value="SERVICE">Serviço</option>
                  </select>
                </label>
                <label>
                  Categoria *
                  <select
                    value={category}
                    onChange={(e) =>
                      setCategory(
                        e.target.value as
                          | 'MODULE'
                          | 'INVERTER'
                          | 'STRUCTURE'
                          | 'CABLE_ELECTRICAL'
                          | 'BATTERY'
                          | 'SERVICE_INSTALLATION'
                          | 'SERVICE_ENGINEERING'
                          | 'OTHER',
                      )
                    }
                  >
                    <option value="MODULE">Módulo Fotovoltaico</option>
                    <option value="INVERTER">Inversor / Microinversor</option>
                    <option value="STRUCTURE">Estrutura de Fixação</option>
                    <option value="CABLE_ELECTRICAL">Cabos e Proteções Elétricas</option>
                    <option value="BATTERY">Bateria / Armazenamento</option>
                    <option value="SERVICE_INSTALLATION">Serviço de Instalação</option>
                    <option value="SERVICE_ENGINEERING">Serviço de Engenharia / Homologação</option>
                    <option value="OTHER">Outros</option>
                  </select>
                </label>
                <label style={{ gridColumn: '1 / -1' }}>
                  Nome / Descrição Comercial *
                  <input
                    type="text"
                    required
                    placeholder="Ex: Módulo Fotovoltaico Longi 630W N-Type"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label>
                  Fabricante / Marca
                  <input
                    type="text"
                    placeholder="Ex: Longi Solar"
                    value={manufacturer}
                    onChange={(e) => setManufacturer(e.target.value)}
                  />
                </label>
                <label>
                  Modelo
                  <input
                    type="text"
                    placeholder="Ex: Hi-MO X6"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                  />
                </label>
                <label>
                  Unidade de Medida
                  <input
                    type="text"
                    value={unitOfMeasure}
                    onChange={(e) => setUnitOfMeasure(e.target.value)}
                  />
                </label>
                <label>
                  Potência Módulo (Wp)
                  <input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="Ex: 630"
                    value={powerRatingWp}
                    onChange={(e) => setPowerRatingWp(e.target.value)}
                  />
                </label>
                <label>
                  Potência Inversor (kW)
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="Ex: 5.0"
                    value={powerRatingKw}
                    onChange={(e) => setPowerRatingKw(e.target.value)}
                  />
                </label>
                <label>
                  Custo de Referência (R$) *
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="Ex: 650.00"
                    value={referenceCost}
                    onChange={(e) => setReferenceCost(e.target.value)}
                  />
                </label>
                <label>
                  Preço de Venda Referência (R$)
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ex: 850.00"
                    value={referencePrice}
                    onChange={(e) => setReferencePrice(e.target.value)}
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
                <Button type="button" variant="secondary" onClick={() => setShowAddForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Salvando…' : 'Salvar no Catálogo'}
                </Button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* FILTER AND SEARCH BAR */}
      <div className="comm-filter-bar">
        <input
          type="search"
          className="comm-search-input"
          placeholder="Buscar no catálogo por nome, SKU, fabricante ou modelo…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="comm-filter-select"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">Todas as Categorias</option>
          <option value="MODULE">Módulos Fotovoltaicos</option>
          <option value="INVERTER">Inversores</option>
          <option value="STRUCTURE">Estruturas de Fixação</option>
          <option value="CABLE_ELECTRICAL">Cabos e Elétrica</option>
          <option value="SERVICE_INSTALLATION">Serviço de Instalação</option>
          <option value="SERVICE_ENGINEERING">Engenharia / Homologação</option>
        </select>
      </div>

      {/* TABLE VIEW */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Nome / Fabricante</th>
              <th>Categoria</th>
              <th>Potência</th>
              <th>Custo Ref. (R$)</th>
              <th>Preço Ref. (R$)</th>
              <th>Situação</th>
            </tr>
          </thead>
          <tbody>
            {catalogQuery.isPending && (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    textAlign: 'center',
                    padding: '2.5rem',
                    color: 'var(--text-secondary, #9ba49e)',
                  }}
                >
                  Carregando catálogo…
                </td>
              </tr>
            )}
            {items.length === 0 && !catalogQuery.isPending && (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    textAlign: 'center',
                    padding: '2.5rem',
                    color: 'var(--text-secondary, #9ba49e)',
                  }}
                >
                  Nenhum item encontrado no catálogo para este filtro.
                </td>
              </tr>
            )}
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong
                    style={{
                      fontFamily: 'var(--font-mono, monospace)',
                      color: 'var(--brand-solar, #ffd400)',
                    }}
                  >
                    {item.sku}
                  </strong>
                </td>
                <td>
                  <div>
                    <strong style={{ color: 'var(--text-primary, #f5f7f5)' }}>{item.name}</strong>
                  </div>
                  <div className="device" style={{ fontSize: '12px' }}>
                    {item.manufacturer ? `${item.manufacturer} ` : ''}
                    {item.model ? `(${item.model})` : ''}
                  </div>
                </td>
                <td>
                  <span className="badge" style={{ fontSize: '11px' }}>
                    {CATEGORY_LABELS[item.category] ?? item.category}
                  </span>
                </td>
                <td style={{ color: 'var(--text-primary, #f5f7f5)' }}>
                  {item.powerRatingWp ? `${item.powerRatingWp} Wp` : ''}
                  {item.powerRatingKw ? `${item.powerRatingKw} kW` : ''}
                  {!item.powerRatingWp && !item.powerRatingKw ? '—' : ''}
                </td>
                <td style={{ color: 'var(--text-primary, #f5f7f5)' }}>
                  R${' '}
                  {item.referenceCost.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td style={{ color: 'var(--text-primary, #f5f7f5)' }}>
                  {item.referencePrice
                    ? `R$ ${item.referencePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : '—'}
                </td>
                <td>
                  <span
                    className={`badge ${item.status === 'ACTIVE' ? 'badge-ativo' : 'badge-cancelado'}`}
                  >
                    {item.status === 'ACTIVE' ? 'Ativo' : item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
