'use client';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, result, allows } from '../identity/client';
import { Feedback } from '../identity/feedback';
import { CustomerDossier } from './dossier';
import type { Schemas } from '@moura-solar/api-client';

type Customer = Schemas['CustomerViewDto'];
type DuplicateMatch = Schemas['DuplicateMatchDto'];

interface CustomersProps {
  onSelectCustomer?: (customer: Customer) => void;
  onCreateOpportunity?: (customer: Customer) => void;
}

export function Customers({ onSelectCustomer, onCreateOpportunity }: CustomersProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(() => {
    if (
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).has('customerId')
    )
      return 'ALL';
    return 'ACTIVE';
  });
  const [isCreating, setIsCreating] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Form state
  const [formKind, setFormKind] = useState<'PERSON' | 'COMPANY'>('PERSON');
  const [formName, setFormName] = useState('');
  const [formTradeName, setFormTradeName] = useState('');
  const [formTaxId, setFormTaxId] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formStreet, setFormStreet] = useState('');
  const [formNumber, setFormNumber] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formState, setFormState] = useState('MG');
  const [overrideDuplicate, setOverrideDuplicate] = useState(false);
  const [duplicatesWarning, setDuplicatesWarning] = useState<DuplicateMatch[]>([]);

  // Context for permissions
  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => result(api.GET('/api/v1/identity/me')),
  });
  const canArchive = me.data ? allows(me.data, 'customers:archive', false) : false;
  const canCreate = me.data ? allows(me.data, 'customers:create', false) : false;

  const customersQuery = useQuery({
    queryKey: ['customers', search, status],
    queryFn: () =>
      result(
        api.GET('/api/v1/customers', {
          params: { query: { search: search || undefined, status } },
        }),
      ),
  });

  const customerDetailQuery = useQuery({
    queryKey: ['customer', selectedCustomer?.id],
    queryFn: () =>
      result(
        api.GET('/api/v1/customers/{customerId}', {
          params: { path: { customerId: selectedCustomer!.id } },
        }),
      ),
    enabled: !!selectedCustomer?.id,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      // First check duplicates
      const dupCheck = await result(
        api.GET('/api/v1/customers/duplicates', {
          params: {
            query: {
              taxId: formTaxId || undefined,
              email: formEmail || undefined,
              phone: formPhone || undefined,
              name: formName || undefined,
            },
          },
        }),
      );

      if (dupCheck && dupCheck.length > 0 && !overrideDuplicate) {
        setDuplicatesWarning(dupCheck);
        throw new Error('Possível duplicidade detectada. Revise os alertas abaixo.');
      }

      return result(
        api.POST('/api/v1/customers', {
          body: {
            kind: formKind,
            legalName: formName,
            tradeName: formTradeName || undefined,
            taxId: formTaxId || undefined,
            phone: formPhone || undefined,
            email: formEmail || undefined,
            street: formStreet || undefined,
            number: formNumber || undefined,
            city: formCity || undefined,
            state: formState || undefined,
            overrideDuplicate,
          },
        }),
      );
    },
    onSuccess: (newCust) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsCreating(false);
      resetForm();
      setSelectedCustomer(newCust as unknown as Customer);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (c: Customer) =>
      result(
        api.POST('/api/v1/customers/{customerId}/archive', {
          params: { path: { customerId: c.id } },
          body: { expectedVersion: c.version },
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', selectedCustomer?.id] });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (c: Customer) =>
      result(
        api.POST('/api/v1/customers/{customerId}/restore', {
          params: { path: { customerId: c.id } },
          body: { expectedVersion: c.version },
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', selectedCustomer?.id] });
    },
  });

  function resetForm() {
    setFormKind('PERSON');
    setFormName('');
    setFormTradeName('');
    setFormTaxId('');
    setFormPhone('');
    setFormEmail('');
    setFormStreet('');
    setFormNumber('');
    setFormCity('');
    setFormState('MG');
    setOverrideDuplicate(false);
    setDuplicatesWarning([]);
  }

  const fetchedItems = customersQuery.data?.items;
  const items = useMemo(() => fetchedItems ?? [], [fetchedItems]);

  useEffect(() => {
    const customerId = new URLSearchParams(window.location.search).get('customerId');
    if (!customerId || selectedCustomer?.id === customerId) return;
    const match = items.find((item) => item.id === customerId);
    if (match) setSelectedCustomer(match);
  }, [items, selectedCustomer?.id]);

  return (
    <div className="commercial-customers">
      <div className="app-header" style={{ borderBottom: 'none', paddingInline: 0 }}>
        <div>
          <h2>Clientes</h2>
          <span className="device">{items.length} exibidos</span>
        </div>
        <div className="actions">
          {canCreate && !isCreating && (
            <button
              onClick={() => {
                setIsCreating(true);
                setSelectedCustomer(null);
                resetForm();
              }}
            >
              + Novo Cliente
            </button>
          )}
        </div>
      </div>

      <div className="filter-bar">
        <input
          type="search"
          placeholder="Buscar por nome, CPF/CNPJ, telefone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Buscar clientes"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filtrar por status"
        >
          <option value="ACTIVE">Ativos</option>
          <option value="ARCHIVED">Arquivados</option>
          <option value="ALL">Todos os status</option>
        </select>
      </div>

      {isCreating && (
        <section className="panel" aria-label="Cadastro de novo cliente">
          <h3>Cadastrar Novo Cliente</h3>
          <Feedback error={createMutation.error} />

          {duplicatesWarning.length > 0 && (
            <div
              className="notice"
              style={{ borderColor: 'var(--status-warning)', background: '#fffbeb' }}
            >
              <strong>Atenção: Possíveis duplicidades encontradas</strong>
              <ul style={{ margin: '0.5rem 0', paddingLeft: '1.25rem' }}>
                {duplicatesWarning.map((d, i) => (
                  <li key={i}>
                    [{d.strength === 'STRONG' ? 'Forte' : 'Moderada'}] {d.reason}
                    <button
                      type="button"
                      style={{
                        marginLeft: '0.5rem',
                        padding: '0.1rem 0.4rem',
                        fontSize: '0.75rem',
                      }}
                      onClick={() => {
                        setSelectedCustomer({
                          id: d.customerId,
                          legalName: d.customerName,
                        } as Customer);
                        setIsCreating(false);
                      }}
                    >
                      Abrir existente
                    </button>
                  </li>
                ))}
              </ul>
              <label className="check-row" style={{ marginTop: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={overrideDuplicate}
                  onChange={(e) => setOverrideDuplicate(e.target.checked)}
                />
                Confirmar e cadastrar mesmo com as correspondências acima
              </label>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
          >
            <div className="form-grid">
              <label>
                Tipo de Pessoa
                <select
                  value={formKind}
                  onChange={(e) => setFormKind(e.target.value as 'PERSON' | 'COMPANY')}
                >
                  <option value="PERSON">Pessoa Física (PF)</option>
                  <option value="COMPANY">Pessoa Jurídica (PJ)</option>
                </select>
              </label>

              <label>
                Nome Completo / Razão Social *
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="ex: João da Silva"
                />
              </label>

              {formKind === 'COMPANY' && (
                <label>
                  Nome Fantasia
                  <input
                    type="text"
                    value={formTradeName}
                    onChange={(e) => setFormTradeName(e.target.value)}
                    placeholder="ex: Silva Materiais"
                  />
                </label>
              )}

              <label>
                {formKind === 'PERSON' ? 'CPF' : 'CNPJ'}
                <input
                  type="text"
                  value={formTaxId}
                  onChange={(e) => setFormTaxId(e.target.value)}
                  placeholder={formKind === 'PERSON' ? '000.000.000-00' : '00.000.000/0001-00'}
                />
              </label>

              <label>
                Telefone / WhatsApp
                <input
                  type="tel"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="(31) 98765-4321"
                />
              </label>

              <label>
                E-mail
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="cliente@exemplo.com"
                />
              </label>

              <label>
                Rua / Logradouro
                <input
                  type="text"
                  value={formStreet}
                  onChange={(e) => setFormStreet(e.target.value)}
                  placeholder="Rua das Flores"
                />
              </label>

              <label>
                Número
                <input
                  type="text"
                  value={formNumber}
                  onChange={(e) => setFormNumber(e.target.value)}
                  placeholder="123"
                />
              </label>

              <label>
                Cidade
                <input
                  type="text"
                  value={formCity}
                  onChange={(e) => setFormCity(e.target.value)}
                  placeholder="Belo Horizonte"
                />
              </label>

              <label>
                Estado
                <input
                  type="text"
                  maxLength={2}
                  value={formState}
                  onChange={(e) => setFormState(e.target.value.toUpperCase())}
                  placeholder="MG"
                />
              </label>
            </div>

            <div className="actions" style={{ marginTop: '1rem' }}>
              <button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Salvando…' : 'Salvar Cliente'}
              </button>
              <button
                type="button"
                style={{ background: 'var(--color-surface)', color: 'var(--text-primary)' }}
                onClick={() => setIsCreating(false)}
              >
                Cancelar
              </button>
            </div>
          </form>
        </section>
      )}

      {selectedCustomer && (
        <section className="panel" aria-label="Detalhe do cliente">
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <h3>{selectedCustomer.legalName}</h3>
              {selectedCustomer.tradeName && <p>{selectedCustomer.tradeName}</p>}
            </div>
            <div style={{ display: 'flex', flexShrink: 0, gap: '0.5rem', alignItems: 'center' }}>
              <span
                className={`badge ${selectedCustomer.status === 'ACTIVE' ? 'badge-ativo' : 'badge-cancelado'}`}
              >
                {selectedCustomer.status === 'ACTIVE' ? 'Ativo' : 'Arquivado'}
              </span>
              <button
                style={{ background: 'var(--color-surface)', color: 'var(--text-primary)' }}
                onClick={() => setSelectedCustomer(null)}
              >
                Fechar
              </button>
            </div>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <p>
              <strong>Documento:</strong> {selectedCustomer.taxId || 'Não informado'} |{' '}
              <strong>Versão:</strong> {selectedCustomer.version}
            </p>

            {customerDetailQuery.isPending && <p>Carregando detalhes…</p>}
            {customerDetailQuery.data && (
              <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
                <div>
                  <h4>Contatos</h4>
                  {customerDetailQuery.data.contacts?.length === 0 ? (
                    <p className="device">Nenhum contato cadastrado.</p>
                  ) : (
                    <ul>
                      {customerDetailQuery.data.contacts?.map((c) => (
                        <li key={c.id}>
                          <strong>[{c.type}]</strong> {c.value} {c.isPrimary && '(Principal)'}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <h4>Unidades Consumidoras</h4>
                  {customerDetailQuery.data.utilityUnits?.length === 0 ? (
                    <p className="device">Nenhuma unidade consumidora cadastrada.</p>
                  ) : (
                    <ul>
                      {customerDetailQuery.data.utilityUnits?.map((u) => (
                        <li key={u.id}>
                          {u.distributorName} — Código: {u.externalCode || 'S/N'} ({u.consumerClass}
                          )
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <h4>Oportunidades</h4>
                  {customerDetailQuery.data.opportunities?.length === 0 ? (
                    <p className="device">Nenhuma oportunidade aberta.</p>
                  ) : (
                    <ul>
                      {customerDetailQuery.data.opportunities?.map((o) => (
                        <li key={o.id}>
                          <strong>{o.code}</strong> — {o.title} [{o.state}]
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            <div className="actions" style={{ marginTop: '1rem' }}>
              {onCreateOpportunity && (
                <button
                  onClick={() => {
                    onCreateOpportunity(selectedCustomer);
                  }}
                >
                  + Nova Oportunidade
                </button>
              )}

              {canArchive && selectedCustomer.status === 'ACTIVE' && (
                <button
                  style={{
                    background: 'var(--color-surface)',
                    color: 'var(--status-danger)',
                    borderColor: 'var(--status-danger)',
                  }}
                  disabled={archiveMutation.isPending}
                  onClick={() => archiveMutation.mutate(selectedCustomer)}
                >
                  Arquivar Cliente
                </button>
              )}

              {canArchive && selectedCustomer.status === 'ARCHIVED' && (
                <button
                  style={{ background: 'var(--brand-primary)' }}
                  disabled={restoreMutation.isPending}
                  onClick={() => restoreMutation.mutate(selectedCustomer)}
                >
                  Restaurar Cliente
                </button>
              )}
            </div>
            <Feedback error={archiveMutation.error || restoreMutation.error} />

            <div
              style={{
                marginTop: '1.5rem',
                borderTop: '1px solid var(--color-border-subtle, #e0e0e0)',
                paddingTop: '1.5rem',
              }}
            >
              <CustomerDossier
                customerId={selectedCustomer.id}
                utilityUnits={customerDetailQuery.data?.utilityUnits ?? []}
              />
            </div>
          </div>
        </section>
      )}

      {/* Responsive Presentation: Table on Desktop, Cards on Mobile */}
      <div className="desktop-only">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome / Razão Social</th>
                <th>CPF / CNPJ</th>
                <th>Tipo</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {customersQuery.isPending && (
                <tr>
                  <td colSpan={5}>Carregando clientes…</td>
                </tr>
              )}
              {items.length === 0 && !customersQuery.isPending && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              )}
              {items.map((cust) => (
                <tr key={cust.id}>
                  <td>
                    <strong>{cust.legalName}</strong>
                    {cust.tradeName && <div className="device">{cust.tradeName}</div>}
                  </td>
                  <td>{cust.taxId || '—'}</td>
                  <td>{cust.kind === 'PERSON' ? 'Física' : 'Jurídica'}</td>
                  <td>
                    <span
                      className={`badge ${cust.status === 'ACTIVE' ? 'badge-ativo' : 'badge-cancelado'}`}
                    >
                      {cust.status === 'ACTIVE' ? 'Ativo' : 'Arquivado'}
                    </span>
                  </td>
                  <td>
                    <button
                      style={{ padding: '0.25rem 0.75rem', fontSize: '0.8125rem' }}
                      onClick={() => {
                        setSelectedCustomer(cust);
                        if (onSelectCustomer) onSelectCustomer(cust);
                      }}
                    >
                      Ver detalhes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="customer-mobile-list">
        {customersQuery.isPending && <p role="status">Carregando clientes…</p>}
        {!customersQuery.isPending && items.length === 0 && <p>Nenhum cliente encontrado.</p>}
        {items.map((customer) => (
          <article className="card" key={customer.id}>
            <strong>{customer.legalName}</strong>
            {customer.tradeName && <p>{customer.tradeName}</p>}
            <p>
              {customer.kind === 'PERSON' ? 'Pessoa física' : 'Pessoa jurídica'} ·{' '}
              {customer.status === 'ACTIVE' ? 'Ativo' : 'Arquivado'}
            </p>
            <p>Documento: {customer.taxId || 'Não informado'}</p>
            <button
              onClick={() => {
                setSelectedCustomer(customer);
                onSelectCustomer?.(customer);
              }}
            >
              Ver detalhes
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
