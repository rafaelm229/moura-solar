'use client';
import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, result } from '../identity/client';
import { Feedback } from '../identity/feedback';
import { Icon } from '../../components/icons/material-symbol';

export type LocationType = 'WAREHOUSE' | 'VEHICLE' | 'TRANSIT' | 'QUARANTINE';
export type MovementType =
  | 'RECEIVE'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN'
  | 'CONSUME'
  | 'RETURN'
  | 'ADJUST'
  | 'LOSS'
  | 'QUARANTINE'
  | 'RELEASE';
export type SupplierCategory = 'SERVICE' | 'SOLAR_EQUIPMENT' | 'ELECTRICAL' | 'STRUCTURAL';

export interface StockLocationView {
  id: string;
  code: string;
  name: string;
  type: string;
  address?: string | null;
  managerUser?: { id: string; name: string; email: string } | null;
}

export interface StockBalanceView {
  id: string;
  catalogItemId: string;
  locationId: string;
  physicalOnHand: number | string;
  reserved: number | string;
  blocked: number | string;
  available: number | string;
  averageCost: number | string;
  minStockAlert?: number | string | null;
  catalogItem?: {
    id: string;
    sku: string;
    name: string;
    category: string;
    unitOfMeasure: string;
    referenceCost: number | string;
  };
  location?: {
    id: string;
    code: string;
    name: string;
    type: string;
  };
}

export interface StockMovementView {
  id: string;
  type: string;
  quantity: number | string;
  unitCost?: number | string | null;
  totalCost?: number | string | null;
  occurredAt: string;
  notes?: string | null;
  catalogItem?: { id: string; sku: string; name: string; category: string };
  fromLocation?: { id: string; code: string; name: string } | null;
  toLocation?: { id: string; code: string; name: string } | null;
  createdBy?: { id: string; name: string; email: string };
}

export interface StockReservationView {
  id: string;
  status: string;
  notes?: string | null;
  opportunity?: {
    id: string;
    code: string;
    title: string;
    customer?: { id: string; legalName: string; taxId?: string | null };
  };
  items?: Array<{
    id: string;
    quantityNeeded: number | string;
    quantityReserved: number | string;
    quantityConsumed: number | string;
    status: string;
    catalogItem?: { id: string; sku: string; name: string };
    location?: { id: string; code: string; name: string };
  }>;
}

export interface SupplierView {
  id: string;
  code: string;
  name: string;
  tradeName?: string | null;
  documentNumber: string;
  contactName?: string | null;
  email?: string | null;
  leadTimeDays: number;
  category: string;
}

export interface PurchaseOrderView {
  id: string;
  code: string;
  status: string;
  createdAt: string;
  expectedDeliveryDate?: string | null;
  totalAmount: number | string;
  supplier?: { id: string; code: string; name: string; tradeName?: string | null };
  items?: Array<{
    id: string;
    catalogItemId: string;
    quantityOrdered: number | string;
    quantityReceived: number | string;
    unitCost: number | string;
    catalogItem?: { id: string; sku: string; name: string };
  }>;
}

export interface SerializedAssetView {
  id: string;
  serialNumber: string;
  status: string;
  createdAt: string;
  installedAt?: string | null;
  catalogItem?: { id: string; name: string; manufacturer?: string | null };
  location?: { id: string; code: string; name: string } | null;
  opportunity?: { id: string; code: string; title: string } | null;
}

export interface CatalogItemView {
  id: string;
  sku: string;
  name: string;
  category: string;
  referenceCost?: number | string | null;
  referencePrice?: number | string | null;
  unitOfMeasure?: string | null;
  manufacturer?: string | null;
  model?: string | null;
}

export function InventoryManagement() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    'balances' | 'movements' | 'reservations' | 'purchases' | 'serials'
  >('balances');

  // Modals state
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [receivingOrder, setReceivingOrder] = useState<PurchaseOrderView | null>(null);

  // Edit Catalog Item Modal from Inventory
  const [editingCatalogItem, setEditingCatalogItem] = useState<{
    id: string;
    sku: string;
    name: string;
    category: string;
    unitOfMeasure?: string | null;
    referenceCost?: number | string | null;
    referencePrice?: number | string | null;
    manufacturer?: string | null;
    model?: string | null;
  } | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatCost, setEditCatCost] = useState('');
  const [editCatPrice, setEditCatPrice] = useState('');
  const [editCatUom, setEditCatUom] = useState('UN');

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowLocationModal(false);
        setShowMovementModal(false);
        setShowSupplierModal(false);
        setShowPurchaseModal(false);
        setReceivingOrder(null);
        setEditingCatalogItem(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filters state
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [searchItem, setSearchItem] = useState<string>('');
  const [lowStockOnly, setLowStockOnly] = useState<boolean>(false);
  const [searchSerial, setSearchSerial] = useState<string>('');

  // Form states - Location
  const [locCode, setLocCode] = useState('');
  const [locName, setLocName] = useState('');
  const [locType, setLocType] = useState<LocationType>('WAREHOUSE');
  const [locAddress, setLocAddress] = useState('');

  // Form states - Movement
  const [moveCatalogItemId, setMoveCatalogItemId] = useState('');
  const [moveType, setMoveType] = useState<MovementType>('RECEIVE');
  const [moveQuantity, setMoveQuantity] = useState(1);
  const [moveUnitCost, setMoveUnitCost] = useState('');
  const [moveFromLoc, setMoveFromLoc] = useState('');
  const [moveToLoc, setMoveToLoc] = useState('');
  const [moveNotes, setMoveNotes] = useState('');
  const [moveSerials, setMoveSerials] = useState('');

  // Form states - Supplier
  const [supCode, setSupCode] = useState('');
  const [supName, setSupName] = useState('');
  const [supTradeName, setSupTradeName] = useState('');
  const [supDoc, setSupDoc] = useState('');
  const [supContact, setSupContact] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supCategory, setSupCategory] = useState<SupplierCategory>('SOLAR_EQUIPMENT');
  const [supLeadTime, setSupLeadTime] = useState(10);

  // Form states - Purchase Order
  const [poSupplierId, setPoSupplierId] = useState('');
  const [poCode, setPoCode] = useState('');
  const [poDeliveryDate, setPoDeliveryDate] = useState('');
  const [poItemId, setPoItemId] = useState('');
  const [poQuantity, setPoQuantity] = useState(1);
  const [poUnitCost, setPoUnitCost] = useState('');
  const [poNotes, setPoNotes] = useState('');

  // Form states - Goods Receipt
  const [recCode, setRecCode] = useState('');
  const [recInvoice, setRecInvoice] = useState('');
  const [recLocationId, setRecLocationId] = useState('');
  const [recSerials, setRecSerials] = useState('');

  // Queries
  const locationsQuery = useQuery({
    queryKey: ['stock-locations'],
    queryFn: async () => {
      const res = await result(api.GET('/api/v1/inventory/locations'));
      return res as unknown as StockLocationView[];
    },
  });

  const catalogQuery = useQuery({
    queryKey: ['catalog-items'],
    queryFn: async () => {
      const res = await result(api.GET('/api/v1/catalog'));
      return res as unknown as CatalogItemView[];
    },
  });

  const balancesQuery = useQuery({
    queryKey: ['stock-balances', selectedLocation, lowStockOnly],
    queryFn: async () => {
      const res = await result(
        api.GET('/api/v1/inventory/balances', {
          params: {
            query: {
              locationId: selectedLocation || undefined,
              lowStockOnly: lowStockOnly || undefined,
            },
          },
        }),
      );
      return res as unknown as StockBalanceView[];
    },
  });

  const movementsQuery = useQuery({
    queryKey: ['stock-movements'],
    queryFn: async () => {
      const res = await result(
        api.GET('/api/v1/inventory/movements', {
          params: { query: { limit: 100 } },
        }),
      );
      return res as unknown as StockMovementView[];
    },
    enabled: activeTab === 'movements',
  });

  const reservationsQuery = useQuery({
    queryKey: ['stock-reservations'],
    queryFn: async () => {
      const res = await result(api.GET('/api/v1/inventory/reservations'));
      return res as unknown as StockReservationView[];
    },
    enabled: activeTab === 'reservations',
  });

  const suppliersQuery = useQuery({
    queryKey: ['stock-suppliers'],
    queryFn: async () => {
      const res = await result(api.GET('/api/v1/inventory/suppliers'));
      return res as unknown as SupplierView[];
    },
    enabled: activeTab === 'purchases',
  });

  const purchasesQuery = useQuery({
    queryKey: ['stock-purchases'],
    queryFn: async () => {
      const res = await result(api.GET('/api/v1/inventory/purchases'));
      return res as unknown as PurchaseOrderView[];
    },
    enabled: activeTab === 'purchases',
  });

  const serialsQuery = useQuery({
    queryKey: ['stock-serials', searchSerial],
    queryFn: async () => {
      const res = await result(
        api.GET('/api/v1/inventory/serials', {
          params: { query: { search: searchSerial || undefined } },
        }),
      );
      return res as unknown as SerializedAssetView[];
    },
    enabled: activeTab === 'serials',
  });

  // Mutations
  const updateCatalogItemMutation = useMutation({
    mutationFn: async () => {
      if (!editingCatalogItem) return;
      await result(
        api.PUT('/api/v1/catalog/{id}', {
          params: { path: { id: editingCatalogItem.id } },
          body: {
            name: editCatName,
            referenceCost: parseFloat(editCatCost) || 0,
            referencePrice: editCatPrice ? parseFloat(editCatPrice) : undefined,
            unitOfMeasure: editCatUom,
          },
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog-items'] });
      queryClient.invalidateQueries({ queryKey: ['stock-balances'] });
      setEditingCatalogItem(null);
    },
  });

  const createLocationMutation = useMutation({
    mutationFn: () =>
      result(
        api.POST('/api/v1/inventory/locations', {
          body: {
            code: locCode.trim().toUpperCase(),
            name: locName.trim(),
            type: locType,
            address: locAddress || undefined,
          },
        }),
      ),
    onSuccess: () => {
      setShowLocationModal(false);
      setLocCode('');
      setLocName('');
      setLocAddress('');
      queryClient.invalidateQueries({ queryKey: ['stock-locations'] });
    },
  });

  const recordMovementMutation = useMutation({
    mutationFn: () => {
      const serials = moveSerials
        ? moveSerials
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;
      return result(
        api.POST('/api/v1/inventory/movements', {
          body: {
            catalogItemId: moveCatalogItemId,
            type: moveType,
            quantity: Number(moveQuantity),
            unitCost: moveUnitCost ? Number(moveUnitCost) : undefined,
            fromLocationId: moveFromLoc || undefined,
            toLocationId: moveToLoc || undefined,
            notes: moveNotes || undefined,
            serialNumbers: serials,
          },
        }),
      );
    },
    onSuccess: () => {
      setShowMovementModal(false);
      setMoveNotes('');
      setMoveSerials('');
      setMoveUnitCost('');
      queryClient.invalidateQueries({ queryKey: ['stock-balances'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['stock-serials'] });
    },
  });

  const createSupplierMutation = useMutation({
    mutationFn: () =>
      result(
        api.POST('/api/v1/inventory/suppliers', {
          body: {
            code: supCode.trim().toUpperCase(),
            name: supName.trim(),
            tradeName: supTradeName || undefined,
            documentNumber: supDoc.trim(),
            contactName: supContact || undefined,
            email: supEmail || undefined,
            category: supCategory,
            leadTimeDays: Number(supLeadTime),
          },
        }),
      ),
    onSuccess: () => {
      setShowSupplierModal(false);
      setSupCode('');
      setSupName('');
      setSupDoc('');
      queryClient.invalidateQueries({ queryKey: ['stock-suppliers'] });
    },
  });

  const createPurchaseMutation = useMutation({
    mutationFn: () =>
      result(
        api.POST('/api/v1/inventory/purchases', {
          body: {
            supplierId: poSupplierId,
            code: poCode.trim().toUpperCase(),
            expectedDeliveryDate: poDeliveryDate || undefined,
            notes: poNotes || undefined,
            items: [
              {
                catalogItemId: poItemId,
                quantityOrdered: Number(poQuantity),
                unitCost: Number(poUnitCost),
              },
            ],
          },
        }),
      ),
    onSuccess: () => {
      setShowPurchaseModal(false);
      setPoCode('');
      setPoNotes('');
      setPoUnitCost('');
      queryClient.invalidateQueries({ queryKey: ['stock-purchases'] });
    },
  });

  const receiveGoodsMutation = useMutation({
    mutationFn: () => {
      if (!receivingOrder || !receivingOrder.items) throw new Error('Nenhum pedido selecionado');
      const serials = recSerials
        ? recSerials
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

      const items = receivingOrder.items.map((i) => ({
        catalogItemId: i.catalogItemId,
        quantityReceived: Number(i.quantityOrdered) - Number(i.quantityReceived),
        unitCost: Number(i.unitCost),
        serialNumbers: serials,
      }));

      return result(
        api.POST('/api/v1/inventory/purchases/{id}/receive', {
          params: { path: { id: receivingOrder.id } },
          body: {
            purchaseOrderId: receivingOrder.id,
            locationId: recLocationId,
            code: recCode.trim().toUpperCase(),
            invoiceNumber: recInvoice || undefined,
            items,
          },
        }),
      );
    },
    onSuccess: () => {
      setReceivingOrder(null);
      setRecCode('');
      setRecInvoice('');
      setRecSerials('');
      queryClient.invalidateQueries({ queryKey: ['stock-purchases'] });
      queryClient.invalidateQueries({ queryKey: ['stock-balances'] });
      queryClient.invalidateQueries({ queryKey: ['stock-serials'] });
    },
  });

  const releaseReservationMutation = useMutation({
    mutationFn: (reservationId: string) =>
      result(
        api.POST('/api/v1/inventory/reservations/{id}/release', {
          params: { path: { id: reservationId } },
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['stock-balances'] });
    },
  });

  // Calculations
  const formatBRL = (val: number | string | null | undefined) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val || 0));

  const totalInventoryValue = (balancesQuery.data || []).reduce(
    (acc, b) => acc + Number(b.physicalOnHand || 0) * Number(b.averageCost || 0),
    0,
  );
  const totalAvailableItems = (balancesQuery.data || []).reduce(
    (acc, b) => acc + Number(b.available || 0),
    0,
  );
  const totalReservedItems = (balancesQuery.data || []).reduce(
    (acc, b) => acc + Number(b.reserved || 0),
    0,
  );
  const lowStockCount = (balancesQuery.data || []).filter(
    (b) => b.minStockAlert && Number(b.available) <= Number(b.minStockAlert),
  ).length;

  const filteredBalances = (balancesQuery.data || []).filter((b) => {
    if (!searchItem) return true;
    const term = searchItem.toLowerCase();
    return (
      b.catalogItem?.sku?.toLowerCase().includes(term) ||
      b.catalogItem?.name?.toLowerCase().includes(term)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#102a23' }}>
            Estoque, Compras e Suprimentos
          </h2>
          <p style={{ margin: '0.25rem 0 0', color: '#52615c', fontSize: '0.875rem' }}>
            Gestão física de depósitos, rastreabilidade de seriais, ordens de compra e reservas por
            projeto.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
        }}
      >
        <div
          style={{
            background: '#f8fafc',
            padding: '1.25rem',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
          }}
        >
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
            VALOR TOTAL EM ESTOQUE
          </span>
          <div
            style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginTop: '0.25rem' }}
          >
            {formatBRL(totalInventoryValue)}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Custo médio ponderado</span>
        </div>

        <div
          style={{
            background: '#f0fdf4',
            padding: '1.25rem',
            borderRadius: '8px',
            border: '1px solid #bbf7d0',
          }}
        >
          <span style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 600 }}>
            DISPONÍVEL IMEDIATO
          </span>
          <div
            style={{ fontSize: '1.5rem', fontWeight: 700, color: '#15803d', marginTop: '0.25rem' }}
          >
            {totalAvailableItems}{' '}
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>unidades</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#16a34a' }}>Pronto para alocação</span>
        </div>

        <div
          style={{
            background: '#fffbeb',
            padding: '1.25rem',
            borderRadius: '8px',
            border: '1px solid #fef3c7',
          }}
        >
          <span style={{ fontSize: '0.8rem', color: '#92400e', fontWeight: 600 }}>
            RESERVADO PARA OBRAS
          </span>
          <div
            style={{ fontSize: '1.5rem', fontWeight: 700, color: '#b45309', marginTop: '0.25rem' }}
          >
            {totalReservedItems}{' '}
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>unidades</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#d97706' }}>Comprometidos com contratos</span>
        </div>

        <div
          style={{
            background: lowStockCount > 0 ? '#fef2f2' : '#f8fafc',
            padding: '1.25rem',
            borderRadius: '8px',
            border: `1px solid ${lowStockCount > 0 ? '#fecaca' : '#e2e8f0'}`,
          }}
        >
          <span
            style={{
              fontSize: '0.8rem',
              color: lowStockCount > 0 ? '#991b1b' : '#64748b',
              fontWeight: 600,
            }}
          >
            ESTOQUE CRÍTICO / MÍNIMO
          </span>
          <div
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: lowStockCount > 0 ? '#b91c1c' : '#0f172a',
              marginTop: '0.25rem',
            }}
          >
            {lowStockCount} <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>itens</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: lowStockCount > 0 ? '#dc2626' : '#64748b' }}>
            {lowStockCount > 0 ? 'Exigem reposição urgente' : 'Níveis adequados'}
          </span>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '0.5rem',
          overflowX: 'auto',
        }}
      >
        {[
          { id: 'balances', label: 'Saldos por Depósito' },
          { id: 'movements', label: 'Movimentações & Ajustes' },
          { id: 'reservations', label: 'Reservas de Kits' },
          { id: 'purchases', label: 'Ordens de Compra & Fornecedores' },
          { id: 'serials', label: 'Rastreabilidade de Seriais' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() =>
              setActiveTab(
                tab.id as 'balances' | 'movements' | 'reservations' | 'purchases' | 'serials',
              )
            }
            style={{
              background: activeTab === tab.id ? '#087443' : 'transparent',
              color: activeTab === tab.id ? '#ffffff' : '#52615c',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: SALDOS POR DEPÓSITO */}
      {activeTab === 'balances' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Filters & Actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div
              style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}
            >
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.875rem',
                }}
              >
                <option value="">Todos os Depósitos / Locais</option>
                {(locationsQuery.data || []).map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.code} - {loc.name} ({loc.type})
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Buscar por SKU ou Nome..."
                value={searchItem}
                onChange={(e) => setSearchItem(e.target.value)}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.875rem',
                  minWidth: '240px',
                }}
              />

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                }}
              >
                <input
                  type="checkbox"
                  checked={lowStockOnly}
                  onChange={(e) => setLowStockOnly(e.target.checked)}
                />
                Apenas estoque baixo
              </label>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  if (catalogQuery.data && catalogQuery.data.length > 0) {
                    const first = catalogQuery.data[0];
                    setEditingCatalogItem(first);
                    setEditCatName(first.name);
                    setEditCatCost(String(first.referenceCost || ''));
                    setEditCatPrice(String(first.referencePrice || ''));
                    setEditCatUom(first.unitOfMeasure || 'UN');
                  }
                }}
                className="btn btn--secondary"
                style={{
                  padding: '0.5rem 0.875rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <Icon name="inventory_2" size={16} /> Editar Produto do Catálogo
              </button>
              <button
                type="button"
                onClick={() => setShowLocationModal(true)}
                className="btn btn--secondary"
                style={{
                  padding: '0.5rem 0.875rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <Icon name="add" size={16} /> Novo Local
              </button>
              <button
                type="button"
                onClick={() => setShowMovementModal(true)}
                className="btn btn--primary"
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <Icon name="sync" size={16} /> Registrar Movimentação
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="table-wrapper" style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr
                  style={{
                    background: '#f8fafc',
                    borderBottom: '2px solid #e2e8f0',
                    textAlign: 'left',
                  }}
                >
                  <th style={{ padding: '0.75rem' }}>SKU</th>
                  <th style={{ padding: '0.75rem' }}>Item / Equipamento</th>
                  <th style={{ padding: '0.75rem' }}>Categoria</th>
                  <th style={{ padding: '0.75rem' }}>Local / Depósito</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Físico</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Reservado</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Disponível</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Custo Médio</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Valor Total</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredBalances.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}
                    >
                      Nenhum saldo encontrado para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredBalances.map((b) => {
                    const isLow = b.minStockAlert && Number(b.available) <= Number(b.minStockAlert);
                    return (
                      <tr key={b.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '0.75rem', fontWeight: 600 }}>
                          {b.catalogItem?.sku}
                        </td>
                        <td style={{ padding: '0.75rem' }}>{b.catalogItem?.name}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <span
                            style={{
                              background: '#f1f5f9',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                            }}
                          >
                            {b.catalogItem?.category}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <strong>{b.location?.code}</strong> - {b.location?.name}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          {Number(b.physicalOnHand)} {b.catalogItem?.unitOfMeasure}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', color: '#b45309' }}>
                          {Number(b.reserved)}
                        </td>
                        <td
                          style={{
                            padding: '0.75rem',
                            textAlign: 'right',
                            fontWeight: 700,
                            color: isLow ? '#b91c1c' : '#15803d',
                          }}
                        >
                          {Number(b.available)}{' '}
                          {isLow && (
                            <Icon
                              name="warning"
                              size={14}
                              style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '0.25rem' }}
                            />
                          )}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          {formatBRL(b.averageCost)}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>
                          {formatBRL(Number(b.physicalOnHand) * Number(b.averageCost))}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          {b.catalogItem && (
                            <button
                              type="button"
                              className="btn btn--secondary"
                              onClick={() => {
                                setEditingCatalogItem(b.catalogItem!);
                                setEditCatName(b.catalogItem!.name);
                                setEditCatCost(
                                  String(b.catalogItem!.referenceCost ?? b.averageCost ?? ''),
                                );
                                setEditCatPrice('');
                                setEditCatUom(b.catalogItem!.unitOfMeasure || 'UN');
                              }}
                              style={{
                                padding: '0.3rem 0.6rem',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                              }}
                            >
                              <Icon name="edit" size={14} /> Editar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: MOVIMENTAÇÕES & AJUSTES */}
      {activeTab === 'movements' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
              Exibindo as últimas 100 movimentações confirmadas no razão contábil.
            </span>
            <button
              onClick={() => setShowMovementModal(true)}
              style={{
                background: '#087443',
                color: '#ffffff',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              + Nova Movimentação
            </button>
          </div>

          <div className="table-wrapper" style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr
                  style={{
                    background: '#f8fafc',
                    borderBottom: '2px solid #e2e8f0',
                    textAlign: 'left',
                  }}
                >
                  <th style={{ padding: '0.75rem' }}>Data/Hora</th>
                  <th style={{ padding: '0.75rem' }}>Tipo</th>
                  <th style={{ padding: '0.75rem' }}>Item</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Quantidade</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Custo Unit.</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Custo Total</th>
                  <th style={{ padding: '0.75rem' }}>Origem → Destino</th>
                  <th style={{ padding: '0.75rem' }}>Responsável</th>
                  <th style={{ padding: '0.75rem' }}>Observações</th>
                </tr>
              </thead>
              <tbody>
                {(movementsQuery.data || []).length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}
                    >
                      Nenhuma movimentação registrada.
                    </td>
                  </tr>
                ) : (
                  (movementsQuery.data || []).map((m) => (
                    <tr key={m.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.75rem', fontSize: '0.8rem', color: '#64748b' }}>
                        {new Date(m.occurredAt).toLocaleString('pt-BR')}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span
                          style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background:
                              m.type === 'RECEIVE'
                                ? '#dcfce7'
                                : m.type === 'CONSUME'
                                  ? '#e0e7ff'
                                  : m.type === 'LOSS' || m.type === 'QUARANTINE'
                                    ? '#fee2e2'
                                    : '#f1f5f9',
                            color:
                              m.type === 'RECEIVE'
                                ? '#166534'
                                : m.type === 'CONSUME'
                                  ? '#3730a3'
                                  : m.type === 'LOSS' || m.type === 'QUARANTINE'
                                    ? '#991b1b'
                                    : '#334155',
                          }}
                        >
                          {m.type}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <strong>{m.catalogItem?.sku}</strong> - {m.catalogItem?.name}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>
                        {Number(m.quantity)}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        {m.unitCost ? formatBRL(m.unitCost) : '-'}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>
                        {m.totalCost ? formatBRL(m.totalCost) : '-'}
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                        {m.fromLocation ? m.fromLocation.code : 'EXTERNO'} →{' '}
                        {m.toLocation ? m.toLocation.code : 'CONSUMO/CLIENTE'}
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
                        {m.createdBy?.name}
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#64748b' }}>
                        {m.notes || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: RESERVAS DE KITS */}
      {activeTab === 'reservations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
            Kits e materiais reservados para projetos e contratos aprovados (Gate C).
          </span>

          {(reservationsQuery.data || []).length === 0 ? (
            <div
              style={{
                background: '#f8fafc',
                padding: '2.5rem',
                borderRadius: '8px',
                textAlign: 'center',
                color: '#64748b',
                border: '1px solid #e2e8f0',
              }}
            >
              Nenhuma reserva ativa vinculada a oportunidades no momento.
            </div>
          ) : (
            (reservationsQuery.data || []).map((res) => (
              <div
                key={res.id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>
                      {res.opportunity?.code} - {res.opportunity?.title}
                    </h3>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      Cliente: {res.opportunity?.customer?.legalName} (
                      {res.opportunity?.customer?.taxId || 'Sem CPF/CNPJ'})
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: res.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2',
                        color: res.status === 'ACTIVE' ? '#166534' : '#991b1b',
                      }}
                    >
                      {res.status}
                    </span>
                    {res.status === 'ACTIVE' && (
                      <button
                        onClick={() => {
                          if (confirm('Deseja realmente liberar e cancelar esta reserva?')) {
                            releaseReservationMutation.mutate(res.id);
                          }
                        }}
                        style={{
                          background: '#fee2e2',
                          color: '#b91c1c',
                          border: 'none',
                          padding: '0.4rem 0.75rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Liberar Reserva
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table
                    style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}
                  >
                    <thead>
                      <tr
                        style={{
                          background: '#f8fafc',
                          textAlign: 'left',
                          borderBottom: '1px solid #e2e8f0',
                        }}
                      >
                        <th style={{ padding: '0.5rem' }}>SKU</th>
                        <th style={{ padding: '0.5rem' }}>Equipamento</th>
                        <th style={{ padding: '0.5rem' }}>Depósito</th>
                        <th style={{ padding: '0.5rem', textAlign: 'right' }}>Necessário</th>
                        <th style={{ padding: '0.5rem', textAlign: 'right' }}>Reservado</th>
                        <th style={{ padding: '0.5rem', textAlign: 'right' }}>Consumido</th>
                        <th style={{ padding: '0.5rem' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {res.items?.map((item) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.5rem', fontWeight: 600 }}>
                            {item.catalogItem?.sku}
                          </td>
                          <td style={{ padding: '0.5rem' }}>{item.catalogItem?.name}</td>
                          <td style={{ padding: '0.5rem' }}>{item.location?.code}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                            {Number(item.quantityNeeded)}
                          </td>
                          <td
                            style={{
                              padding: '0.5rem',
                              textAlign: 'right',
                              fontWeight: 600,
                              color: '#b45309',
                            }}
                          >
                            {Number(item.quantityReserved)}
                          </td>
                          <td style={{ padding: '0.5rem', textAlign: 'right', color: '#15803d' }}>
                            {Number(item.quantityConsumed)}
                          </td>
                          <td style={{ padding: '0.5rem' }}>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 4: COMPRAS & FORNECEDORES */}
      {activeTab === 'purchases' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Header Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>
              Ordens de Compra de Equipamentos
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setShowSupplierModal(true)}
                style={{
                  background: '#ffffff',
                  color: '#087443',
                  border: '1px solid #087443',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                + Novo Fornecedor
              </button>
              <button
                onClick={() => setShowPurchaseModal(true)}
                style={{
                  background: '#087443',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                + Nova Ordem de Compra
              </button>
            </div>
          </div>

          {/* Orders Table */}
          <div className="table-wrapper" style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr
                  style={{
                    background: '#f8fafc',
                    borderBottom: '2px solid #e2e8f0',
                    textAlign: 'left',
                  }}
                >
                  <th style={{ padding: '0.75rem' }}>Código</th>
                  <th style={{ padding: '0.75rem' }}>Fornecedor</th>
                  <th style={{ padding: '0.75rem' }}>Data Emissão</th>
                  <th style={{ padding: '0.75rem' }}>Previsão Entrega</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Valor Total</th>
                  <th style={{ padding: '0.75rem' }}>Status</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {(purchasesQuery.data || []).length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}
                    >
                      Nenhuma ordem de compra emitida.
                    </td>
                  </tr>
                ) : (
                  (purchasesQuery.data || []).map((po) => (
                    <tr key={po.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 600 }}>{po.code}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <strong>{po.supplier?.tradeName || po.supplier?.name}</strong>
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#64748b' }}>
                        {new Date(po.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
                        {po.expectedDeliveryDate
                          ? new Date(po.expectedDeliveryDate).toLocaleDateString('pt-BR')
                          : '-'}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700 }}>
                        {formatBRL(po.totalAmount)}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span
                          style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background:
                              po.status === 'RECEIVED'
                                ? '#dcfce7'
                                : po.status === 'PARTIALLY_RECEIVED'
                                  ? '#fef3c7'
                                  : '#e0e7ff',
                            color:
                              po.status === 'RECEIVED'
                                ? '#166534'
                                : po.status === 'PARTIALLY_RECEIVED'
                                  ? '#b45309'
                                  : '#3730a3',
                          }}
                        >
                          {po.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        {['ORDERED', 'PARTIALLY_RECEIVED'].includes(po.status) && (
                          <button
                            onClick={() => {
                              setReceivingOrder(po);
                              setRecCode(`REC-${po.code}`);
                              if (locationsQuery.data && locationsQuery.data[0]) {
                                setRecLocationId(locationsQuery.data[0].id);
                              }
                            }}
                            style={{
                              background: '#087443',
                              color: '#ffffff',
                              border: 'none',
                              padding: '0.35rem 0.75rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Receber no Galpão
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Suppliers Directory */}
          <div style={{ marginTop: '1rem' }}>
            <h4 style={{ margin: '0 0 0.75rem', fontSize: '1rem', color: '#0f172a' }}>
              Fornecedores Homologados
            </h4>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1rem',
              }}
            >
              {(suppliersQuery.data || []).map((s) => (
                <div
                  key={s.id}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '1rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <strong>{s.tradeName || s.name}</strong>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        background: '#e2e8f0',
                        padding: '0.2rem 0.4rem',
                        borderRadius: '4px',
                      }}
                    >
                      {s.code}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
                    CNPJ: {s.documentNumber}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#334155', marginTop: '0.5rem' }}>
                    Contato: {s.contactName || '-'} | Prazo médio: {s.leadTimeDays} dias
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: RASTREABILIDADE DE SERIAIS */}
      {activeTab === 'serials' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <input
              type="text"
              placeholder="Buscar por número de série (ex: GRW-5K-001)..."
              value={searchSerial}
              onChange={(e) => setSearchSerial(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                minWidth: '300px',
              }}
            />
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Rastreamento unitário de inversores, baterias e placas solares.
            </span>
          </div>

          <div className="table-wrapper" style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr
                  style={{
                    background: '#f8fafc',
                    borderBottom: '2px solid #e2e8f0',
                    textAlign: 'left',
                  }}
                >
                  <th style={{ padding: '0.75rem' }}>Número de Série</th>
                  <th style={{ padding: '0.75rem' }}>Equipamento / Modelo</th>
                  <th style={{ padding: '0.75rem' }}>Fabricante</th>
                  <th style={{ padding: '0.75rem' }}>Local Atual / Destino</th>
                  <th style={{ padding: '0.75rem' }}>Status</th>
                  <th style={{ padding: '0.75rem' }}>Data Registro / Instalação</th>
                </tr>
              </thead>
              <tbody>
                {(serialsQuery.data || []).length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}
                    >
                      Nenhum equipamento serializado encontrado.
                    </td>
                  </tr>
                ) : (
                  (serialsQuery.data || []).map((s) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 700, fontFamily: 'monospace' }}>
                        {s.serialNumber}
                      </td>
                      <td style={{ padding: '0.75rem' }}>{s.catalogItem?.name}</td>
                      <td style={{ padding: '0.75rem' }}>{s.catalogItem?.manufacturer || '-'}</td>
                      <td style={{ padding: '0.75rem' }}>
                        {s.location ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Icon name="inventory_2" size={14} /> <strong>{s.location.code}</strong> - {s.location.name}
                          </span>
                        ) : s.opportunity ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Icon name="bolt" size={14} /> <strong>{s.opportunity.code}</strong> - {s.opportunity.title}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span
                          style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background:
                              s.status === 'INSTALLED'
                                ? '#dcfce7'
                                : s.status === 'IN_STOCK'
                                  ? '#e0e7ff'
                                  : '#fee2e2',
                            color:
                              s.status === 'INSTALLED'
                                ? '#166534'
                                : s.status === 'IN_STOCK'
                                  ? '#3730a3'
                                  : '#991b1b',
                          }}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#64748b' }}>
                        {new Date(s.installedAt || s.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: NOVO LOCAL/DEPÓSITO */}
      {showLocationModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowLocationModal(false);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 1050,
            padding: '1rem',
          }}
        >
          <div
            className="modal-card"
            style={{
              background: '#ffffff',
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
                  color: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Icon name="location_on" size={20} /> Novo Local / Depósito
              </h3>
              <button
                type="button"
                aria-label="Fechar modal"
                onClick={() => setShowLocationModal(false)}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                Código (Identificador)
              </label>
              <input
                type="text"
                placeholder="Ex: DEP-CENTRAL ou VEIC-01"
                value={locCode}
                onChange={(e) => setLocCode(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Nome Descritivo</label>
              <input
                type="text"
                placeholder="Ex: Galpão Principal Belo Horizonte"
                value={locName}
                onChange={(e) => setLocName(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Tipo de Local</label>
              <select
                value={locType}
                onChange={(e) => setLocType(e.target.value as LocationType)}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              >
                <option value="WAREHOUSE">Depósito Físico (Warehouse)</option>
                <option value="VEHICLE">Veículo / Equipe de Campo</option>
                <option value="TRANSIT">Em Trânsito / Transporte</option>
                <option value="QUARANTINE">Quarentena / Avarias</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Endereço (Opcional)</label>
              <input
                type="text"
                placeholder="Rua, número, cidade/UF"
                value={locAddress}
                onChange={(e) => setLocAddress(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <Feedback error={createLocationMutation.error} />
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
                onClick={() => setShowLocationModal(false)}
                style={{
                  background: '#ffffff',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => createLocationMutation.mutate()}
                disabled={!locCode || !locName || createLocationMutation.isPending}
                style={{
                  background: '#087443',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {createLocationMutation.isPending ? 'Salvando...' : 'Salvar Local'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOVA MOVIMENTAÇÃO */}
      {showMovementModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowMovementModal(false);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 1050,
            padding: '1rem',
          }}
        >
          <div
            className="modal-card"
            style={{
              background: '#ffffff',
              padding: '1.5rem',
              borderRadius: '12px',
              maxWidth: '540px',
              width: '90%',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              maxHeight: '90vh',
              overflowY: 'auto',
              border: '1px solid #d9e2de',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: '1.25rem',
                  color: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Icon name="sync" size={20} /> Registrar Movimentação
              </h3>
              <button
                type="button"
                aria-label="Fechar modal"
                onClick={() => setShowMovementModal(false)}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Tipo de Movimentação</label>
              <select
                value={moveType}
                onChange={(e) => setMoveType(e.target.value as MovementType)}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              >
                <option value="RECEIVE">Entrada Avulsa / Compra (RECEIVE)</option>
                <option value="TRANSFER_OUT">Transferência de Saída (TRANSFER_OUT)</option>
                <option value="TRANSFER_IN">Transferência de Entrada (TRANSFER_IN)</option>
                <option value="CONSUME">Consumo em Obra (CONSUME)</option>
                <option value="RETURN">Devolução ao Estoque (RETURN)</option>
                <option value="ADJUST">Ajuste de Inventário (ADJUST)</option>
                <option value="LOSS">Perda / Avaria (LOSS)</option>
                <option value="QUARANTINE">Bloqueio / Quarentena (QUARANTINE)</option>
                <option value="RELEASE">Liberação de Quarentena (RELEASE)</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Item do Catálogo</label>
              <select
                value={moveCatalogItemId}
                onChange={(e) => setMoveCatalogItemId(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              >
                <option value="">Selecione o equipamento...</option>
                {(catalogQuery.data || []).map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.sku} - {cat.name} ({cat.category})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Quantidade</label>
                <input
                  type="number"
                  min="1"
                  value={moveQuantity}
                  onChange={(e) => setMoveQuantity(Number(e.target.value))}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Custo Unitário (R$)</label>
                <input
                  type="number"
                  placeholder="Ex: 3500.00"
                  value={moveUnitCost}
                  onChange={(e) => setMoveUnitCost(e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>

            {['TRANSFER_OUT', 'CONSUME', 'LOSS', 'QUARANTINE'].includes(moveType) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Depósito de Origem</label>
                <select
                  value={moveFromLoc}
                  onChange={(e) => setMoveFromLoc(e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                >
                  <option value="">Selecione a origem...</option>
                  {(locationsQuery.data || []).map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.code} - {loc.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {['RECEIVE', 'TRANSFER_IN', 'RETURN', 'RELEASE', 'ADJUST'].includes(moveType) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Depósito de Destino</label>
                <select
                  value={moveToLoc}
                  onChange={(e) => setMoveToLoc(e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                >
                  <option value="">Selecione o destino...</option>
                  {(locationsQuery.data || []).map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.code} - {loc.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                Números de Série (Opcional, separados por vírgula)
              </label>
              <input
                type="text"
                placeholder="Ex: GRW-5K-001, GRW-5K-002"
                value={moveSerials}
                onChange={(e) => setMoveSerials(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Observações / Motivo</label>
              <textarea
                rows={2}
                placeholder="Ex: Contagem física anual ou transferência para equipe de instalação"
                value={moveNotes}
                onChange={(e) => setMoveNotes(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <Feedback error={recordMovementMutation.error} />

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
                onClick={() => setShowMovementModal(false)}
                style={{
                  background: '#ffffff',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => recordMovementMutation.mutate()}
                disabled={!moveCatalogItemId || recordMovementMutation.isPending}
                style={{
                  background: '#087443',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {recordMovementMutation.isPending ? 'Gravando...' : 'Confirmar Movimentação'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOVO FORNECEDOR */}
      {showSupplierModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSupplierModal(false);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 1050,
            padding: '1rem',
          }}
        >
          <div
            className="modal-card"
            style={{
              background: '#ffffff',
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
                  color: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Icon name="business" size={20} /> Novo Fornecedor
              </h3>
              <button
                type="button"
                aria-label="Fechar modal"
                onClick={() => setShowSupplierModal(false)}
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Código</label>
                <input
                  type="text"
                  placeholder="SUP-ALDO"
                  value={supCode}
                  onChange={(e) => setSupCode(e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>CNPJ/CPF</label>
                <input
                  type="text"
                  placeholder="00.000.000/0001-00"
                  value={supDoc}
                  onChange={(e) => setSupDoc(e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Razão Social / Nome</label>
              <input
                type="text"
                placeholder="Aldo Componentes Eletrônicos Ltda"
                value={supName}
                onChange={(e) => setSupName(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Nome Fantasia</label>
                <input
                  type="text"
                  placeholder="Aldo Solar"
                  value={supTradeName}
                  onChange={(e) => setSupTradeName(e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Categoria</label>
                <select
                  value={supCategory}
                  onChange={(e) => setSupCategory(e.target.value as SupplierCategory)}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                >
                  <option value="SOLAR_EQUIPMENT">Equipamentos Solares</option>
                  <option value="STRUCTURAL">Estrutura & Fixação</option>
                  <option value="ELECTRICAL">Elétrica & Cabos</option>
                  <option value="SERVICE">Serviços & Frete</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Prazo Médio (Dias)</label>
                <input
                  type="number"
                  value={supLeadTime}
                  onChange={(e) => setSupLeadTime(Number(e.target.value))}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Contato</label>
                <input
                  type="text"
                  placeholder="Carlos Silva"
                  value={supContact}
                  onChange={(e) => setSupContact(e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>E-mail</label>
                <input
                  type="email"
                  placeholder="vendas@fornecedor.com"
                  value={supEmail}
                  onChange={(e) => setSupEmail(e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>

            <Feedback error={createSupplierMutation.error} />

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
                onClick={() => setShowSupplierModal(false)}
                style={{
                  background: '#ffffff',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => createSupplierMutation.mutate()}
                disabled={!supCode || !supName || !supDoc || createSupplierMutation.isPending}
                style={{
                  background: '#087443',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {createSupplierMutation.isPending ? 'Salvando...' : 'Salvar Fornecedor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOVA ORDEM DE COMPRA */}
      {showPurchaseModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPurchaseModal(false);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 1050,
            padding: '1rem',
          }}
        >
          <div
            className="modal-card"
            style={{
              background: '#ffffff',
              padding: '1.5rem',
              borderRadius: '12px',
              maxWidth: '520px',
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
                  color: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Icon name="description" size={20} /> Nova Ordem de Compra
              </h3>
              <button
                type="button"
                aria-label="Fechar modal"
                onClick={() => setShowPurchaseModal(false)}
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Código Pedido</label>
                <input
                  type="text"
                  placeholder="PO-2026-002"
                  value={poCode}
                  onChange={(e) => setPoCode(e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Previsão Entrega</label>
                <input
                  type="date"
                  value={poDeliveryDate}
                  onChange={(e) => setPoDeliveryDate(e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Fornecedor</label>
              <select
                value={poSupplierId}
                onChange={(e) => setPoSupplierId(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              >
                <option value="">Selecione o fornecedor...</option>
                {(suppliersQuery.data || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.tradeName || s.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Equipamento</label>
              <select
                value={poItemId}
                onChange={(e) => {
                  setPoItemId(e.target.value);
                  const selected = (catalogQuery.data || []).find((c) => c.id === e.target.value);
                  if (selected?.referenceCost) setPoUnitCost(String(selected.referenceCost));
                }}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              >
                <option value="">Selecione o item...</option>
                {(catalogQuery.data || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.sku} - {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Quantidade</label>
                <input
                  type="number"
                  min="1"
                  value={poQuantity}
                  onChange={(e) => setPoQuantity(Number(e.target.value))}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Custo Negociado (R$)</label>
                <input
                  type="number"
                  value={poUnitCost}
                  onChange={(e) => setPoUnitCost(e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>

            <Feedback error={createPurchaseMutation.error} />

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
                onClick={() => setShowPurchaseModal(false)}
                style={{
                  background: '#ffffff',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => createPurchaseMutation.mutate()}
                disabled={!poSupplierId || !poCode || !poItemId || createPurchaseMutation.isPending}
                style={{
                  background: '#087443',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {createPurchaseMutation.isPending ? 'Emitindo...' : 'Emitir Ordem de Compra'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RECEBER MERCADORIA NO GALPÃO */}
      {receivingOrder && (
        <div
          role="dialog"
          aria-modal="true"
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setReceivingOrder(null);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 1050,
            padding: '1rem',
          }}
        >
          <div
            className="modal-card"
            style={{
              background: '#ffffff',
              padding: '1.5rem',
              borderRadius: '12px',
              maxWidth: '540px',
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
                  color: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Icon name="inventory_2" size={20} /> Recebimento Físico: {receivingOrder.code}
              </h3>
              <button
                type="button"
                aria-label="Fechar modal"
                onClick={() => setReceivingOrder(null)}
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
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Fornecedor: {receivingOrder.supplier?.tradeName || receivingOrder.supplier?.name}
            </span>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Cód. Recibo</label>
                <input
                  type="text"
                  value={recCode}
                  onChange={(e) => setRecCode(e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Nota Fiscal (NF-e)</label>
                <input
                  type="text"
                  placeholder="Ex: NF 109283"
                  value={recInvoice}
                  onChange={(e) => setRecInvoice(e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Depósito de Entrada</label>
              <select
                value={recLocationId}
                onChange={(e) => setRecLocationId(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              >
                {(locationsQuery.data || []).map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.code} - {loc.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                Seriais dos Inversores / Módulos Recebidos (Separados por vírgula)
              </label>
              <textarea
                rows={3}
                placeholder="Ex: INV-2026-001, INV-2026-002, INV-2026-003"
                value={recSerials}
                onChange={(e) => setRecSerials(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <Feedback error={receiveGoodsMutation.error} />

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
                onClick={() => setReceivingOrder(null)}
                style={{
                  background: '#ffffff',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => receiveGoodsMutation.mutate()}
                disabled={!recCode || !recLocationId || receiveGoodsMutation.isPending}
                style={{
                  background: '#087443',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {receiveGoodsMutation.isPending ? 'Confirmando...' : 'Confirmar Entrada no Estoque'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR PRODUTO DO CATÁLOGO A PARTIR DO ESTOQUE */}
      {editingCatalogItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-catalog-modal-title"
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingCatalogItem(null);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 1050,
            padding: '1rem',
          }}
        >
          <div
            className="modal-card"
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)',
              border: '1px solid #d9e2de',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: '0.75rem',
              }}
            >
              <div>
                <h3
                  id="edit-catalog-modal-title"
                  style={{
                    margin: 0,
                    fontSize: '1.25rem',
                    color: '#0f172a',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <Icon name="inventory_2" size={20} /> Editar Produto do Catálogo
                </h3>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  SKU: <strong>{editingCatalogItem.sku}</strong> ({editingCatalogItem.category})
                </span>
              </div>
              <button
                type="button"
                aria-label="Fechar modal"
                onClick={() => setEditingCatalogItem(null)}
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

            <Feedback error={updateCatalogItemMutation.error} />

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateCatalogItemMutation.mutate();
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Nome Descritivo *</label>
                <input
                  type="text"
                  required
                  value={editCatName}
                  onChange={(e) => setEditCatName(e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Custo Ref. (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editCatCost}
                    onChange={(e) => setEditCatCost(e.target.value)}
                    style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Preço Ref. (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Opcional"
                    value={editCatPrice}
                    onChange={(e) => setEditCatPrice(e.target.value)}
                    style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Unidade de Medida</label>
                <input
                  type="text"
                  value={editCatUom}
                  onChange={(e) => setEditCatUom(e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  marginTop: '0.5rem',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid #e2e8f0',
                }}
              >
                <button
                  type="button"
                  onClick={() => setEditingCatalogItem(null)}
                  style={{
                    background: '#ffffff',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updateCatalogItemMutation.isPending}
                  style={{
                    background: '#087443',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.5rem 1.25rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: updateCatalogItemMutation.isPending ? 'not-allowed' : 'pointer',
                    opacity: updateCatalogItemMutation.isPending ? 0.7 : 1,
                  }}
                >
                  {updateCatalogItemMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
