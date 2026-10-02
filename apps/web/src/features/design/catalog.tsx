'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, result, allows } from '../identity/client';
import { Feedback } from '../identity/feedback';
import type { Schemas } from '@moura-solar/api-client';

type CatalogItem = Schemas['CatalogItemViewDto'];

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

  // Editing state
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [editSku, setEditSku] = useState('');
  const [editKind, setEditKind] = useState<'MATERIAL' | 'SERVICE'>('MATERIAL');
  const [editCategory, setEditCategory] = useState<string>('MODULE');
  const [editName, setEditName] = useState('');
  const [editManufacturer, setEditManufacturer] = useState('');
  const [editModel, setEditModel] = useState('');
  const [editUnitOfMeasure, setEditUnitOfMeasure] = useState('UN');
  const [editPowerRatingWp, setEditPowerRatingWp] = useState('');
  const [editPowerRatingKw, setEditPowerRatingKw] = useState('');
  const [editReferenceCost, setEditReferenceCost] = useState('');
  const [editReferencePrice, setEditReferencePrice] = useState('');
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  const startEditing = (item: CatalogItem) => {
    setEditingItem(item);
    setEditSku(item.sku);
    setEditKind(item.kind as 'MATERIAL' | 'SERVICE');
    setEditCategory(item.category);
    setEditName(item.name);
    setEditManufacturer(item.manufacturer || '');
    setEditModel(item.model || '');
    setEditUnitOfMeasure(item.unitOfMeasure);
    setEditPowerRatingWp(item.powerRatingWp ? String(item.powerRatingWp) : '');
    setEditPowerRatingKw(item.powerRatingKw ? String(item.powerRatingKw) : '');
    setEditReferenceCost(String(item.referenceCost));
    setEditReferencePrice(item.referencePrice ? String(item.referencePrice) : '');
    setEditStatus(item.status as 'ACTIVE' | 'INACTIVE');
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingItem) return;
      return result(
        api.PUT('/api/v1/catalog/{id}', {
          params: { path: { id: editingItem.id } },
          body: {
            sku: editSku,
            kind: editKind,
            category: editCategory,
            name: editName,
            manufacturer: editManufacturer || undefined,
            model: editModel || undefined,
            unitOfMeasure: editUnitOfMeasure,
            powerRatingWp: editPowerRatingWp ? parseFloat(editPowerRatingWp) : undefined,
            powerRatingKw: editPowerRatingKw ? parseFloat(editPowerRatingKw) : undefined,
            referenceCost: parseFloat(editReferenceCost),
            referencePrice: editReferencePrice ? parseFloat(editReferencePrice) : undefined,
            status: editStatus,
            expectedVersion: editingItem.version,
          },
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
      setEditingItem(null);
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

  return (
    <div className="panel" aria-label="Catálogo de Materiais e Serviços">
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
          <h2>Catálogo de Materiais & Serviços</h2>
          <p className="device">
            Equipamentos, módulos, inversores, estruturas e serviços padrão homologados Moura Solar.
          </p>
        </div>
        {canManageCatalog && !showAddForm && (
          <button
            type="button"
            style={{
              background: '#087443',
              color: '#ffffff',
              fontWeight: 600,
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
            }}
            onClick={() => setShowAddForm(true)}
          >
            + Novo Item no Catálogo
          </button>
        )}
      </div>

      <Feedback error={catalogQuery.error} />
      <Feedback error={createMutation.error} />
      <Feedback error={updateMutation.error} />

      {/* New Item Form */}
      {showAddForm && canManageCatalog && (
        <form
          className="panel"
          style={{ background: 'var(--color-canvas)', marginBlock: '1rem' }}
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
        >
          <h3>Novo Item de Catálogo</h3>
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
            <label>
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
          <div className="actions" style={{ marginTop: '0.75rem' }}>
            <button type="submit" disabled={createMutation.isPending}>
              Salvar no Catálogo
            </button>
            <button
              type="button"
              style={{ background: 'var(--color-surface)', color: 'var(--text-primary)' }}
              onClick={() => setShowAddForm(false)}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Filter and Search Bar */}
      <div className="filter-bar" style={{ marginBlock: '1rem' }}>
        <input
          type="search"
          placeholder="Buscar no catálogo por nome, SKU, modelo…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">Todas as Categorias</option>
          <option value="MODULE">Módulos</option>
          <option value="INVERTER">Inversores</option>
          <option value="STRUCTURE">Estruturas</option>
          <option value="CABLE_ELECTRICAL">Cabos e Elétrica</option>
          <option value="SERVICE_INSTALLATION">Instalação</option>
          <option value="SERVICE_ENGINEERING">Engenharia</option>
        </select>
      </div>

      {/* Table view */}
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
              {canManageCatalog && <th>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {catalogQuery.isPending && (
              <tr>
                <td colSpan={canManageCatalog ? 8 : 7}>Carregando catálogo…</td>
              </tr>
            )}
            {items.length === 0 && !catalogQuery.isPending && (
              <tr>
                <td
                  colSpan={canManageCatalog ? 8 : 7}
                  style={{ textAlign: 'center', padding: '1.5rem' }}
                >
                  Nenhum item encontrado no catálogo.
                </td>
              </tr>
            )}
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{item.sku}</strong>
                </td>
                <td>
                  <div>
                    <strong>{item.name}</strong>
                  </div>
                  <div className="device">
                    {item.manufacturer ? `${item.manufacturer} ` : ''}
                    {item.model ? `(${item.model})` : ''}
                  </div>
                </td>
                <td>
                  <span className="badge" style={{ fontSize: '0.7rem' }}>
                    {item.category}
                  </span>
                </td>
                <td>
                  {item.powerRatingWp ? `${item.powerRatingWp} Wp` : ''}
                  {item.powerRatingKw ? `${item.powerRatingKw} kW` : ''}
                  {!item.powerRatingWp && !item.powerRatingKw ? '—' : ''}
                </td>
                <td>
                  R${' '}
                  {item.referenceCost.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td>
                  {item.referencePrice
                    ? `R$ ${item.referencePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : '—'}
                </td>
                <td>
                  <span
                    className={`badge ${item.status === 'ACTIVE' ? 'badge-ativo' : 'badge-cancelado'}`}
                  >
                    {item.status}
                  </span>
                </td>
                {canManageCatalog && (
                  <td>
                    <button
                      type="button"
                      style={{
                        background: '#f8fafc',
                        color: '#087443',
                        border: '1px solid #087443',
                        borderRadius: '4px',
                        padding: '0.35rem 0.75rem',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                      onClick={() => startEditing(item)}
                    >
                      ✏️ Editar
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Item Modal */}
      {editingItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-item-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1050,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #e2e8f0',
              }}
            >
              <div>
                <h3
                  id="edit-item-modal-title"
                  style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}
                >
                  Editar Item de Catálogo
                </h3>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  SKU: <strong>{editingItem.sku}</strong>
                </span>
              </div>
              <button
                type="button"
                aria-label="Fechar modal"
                onClick={() => setEditingItem(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.5rem',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateMutation.mutate();
              }}
              style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div className="form-grid">
                <label>
                  SKU Interno *
                  <input
                    type="text"
                    required
                    value={editSku}
                    onChange={(e) => setEditSku(e.target.value)}
                  />
                </label>
                <label>
                  Tipo *
                  <select
                    value={editKind}
                    onChange={(e) => setEditKind(e.target.value as 'MATERIAL' | 'SERVICE')}
                  >
                    <option value="MATERIAL">Material / Equipamento</option>
                    <option value="SERVICE">Serviço / Mão de Obra</option>
                  </select>
                </label>
                <label>
                  Categoria *
                  <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)}>
                    <option value="MODULE">Módulo Solar Fotovoltaico</option>
                    <option value="INVERTER">Inversor / Microinversor</option>
                    <option value="STRUCTURE">Estrutura de Fixação</option>
                    <option value="CABLE_ELECTRICAL">Cabos e Proteções Elétricas</option>
                    <option value="BATTERY">Bateria / Armazenamento</option>
                    <option value="SERVICE_INSTALLATION">Serviço de Instalação</option>
                    <option value="SERVICE_ENGINEERING">Serviço de Engenharia / Homologação</option>
                    <option value="OTHER">Outros Suprimentos</option>
                  </select>
                </label>
                <label>
                  Nome do Item *
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </label>
                <label>
                  Fabricante
                  <input
                    type="text"
                    value={editManufacturer}
                    onChange={(e) => setEditManufacturer(e.target.value)}
                  />
                </label>
                <label>
                  Modelo
                  <input
                    type="text"
                    value={editModel}
                    onChange={(e) => setEditModel(e.target.value)}
                  />
                </label>
                <label>
                  Unidade de Medida *
                  <input
                    type="text"
                    required
                    value={editUnitOfMeasure}
                    onChange={(e) => setEditUnitOfMeasure(e.target.value)}
                  />
                </label>
                <label>
                  Potência Nominal (Wp)
                  <input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="Ex: 630"
                    value={editPowerRatingWp}
                    onChange={(e) => setEditPowerRatingWp(e.target.value)}
                  />
                </label>
                <label>
                  Potência Nominal (kW)
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ex: 5.0"
                    value={editPowerRatingKw}
                    onChange={(e) => setEditPowerRatingKw(e.target.value)}
                  />
                </label>
                <label>
                  Custo de Referência (R$) *
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editReferenceCost}
                    onChange={(e) => setEditReferenceCost(e.target.value)}
                  />
                </label>
                <label>
                  Preço de Venda Referência (R$)
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editReferencePrice}
                    onChange={(e) => setEditReferencePrice(e.target.value)}
                  />
                </label>
                <label>
                  Situação *
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                  >
                    <option value="ACTIVE">Ativo</option>
                    <option value="INACTIVE">Inativo</option>
                  </select>
                </label>
              </div>

              {/* Modal Actions */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  marginTop: '1rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid #e2e8f0',
                }}
              >
                <button
                  type="button"
                  style={{
                    background: '#ffffff',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '0.5rem 1rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                  onClick={() => setEditingItem(null)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  style={{
                    background: '#087443',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.5rem 1.25rem',
                    fontWeight: 600,
                    cursor: updateMutation.isPending ? 'not-allowed' : 'pointer',
                    opacity: updateMutation.isPending ? 0.7 : 1,
                  }}
                >
                  {updateMutation.isPending ? 'Salvando…' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
