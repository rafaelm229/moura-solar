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
          <button onClick={() => setShowAddForm(true)}>+ Novo Item no Catálogo</button>
        )}
      </div>

      <Feedback error={catalogQuery.error} />
      <Feedback error={createMutation.error} />

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
            </tr>
          </thead>
          <tbody>
            {catalogQuery.isPending && (
              <tr>
                <td colSpan={7}>Carregando catálogo…</td>
              </tr>
            )}
            {items.length === 0 && !catalogQuery.isPending && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '1.5rem' }}>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
