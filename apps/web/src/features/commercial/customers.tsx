'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, result, allows } from '../identity/client';
import { Feedback } from '../identity/feedback';
import { Button } from '../../ui/Button';
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
  const [status, setStatus] = useState('ACTIVE');
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

  const items = customersQuery.data?.items ?? [];
  const activeCount = items.filter((c) => c.status === 'ACTIVE').length;
  const pfCount = items.filter((c) => c.kind === 'PERSON').length;
  const pjCount = items.filter((c) => c.kind === 'COMPANY').length;

  return (
    <div className="commercial-customers">
      {/* KPI Metrics Summary Row */}
      <div className="comm-kpi-grid">
        <div className="comm-kpi-card">
          <span className="comm-kpi-card__label">Total Clientes</span>
          <span className="comm-kpi-card__value">{items.length}</span>
          <span className="comm-kpi-card__subtext">Cadastros no sistema</span>
        </div>
        <div className="comm-kpi-card">
          <span className="comm-kpi-card__label">Clientes Ativos</span>
          <span
            className="comm-kpi-card__value"
            style={{ color: 'var(--status-success, #26d866)' }}
          >
            {activeCount}
          </span>
          <span className="comm-kpi-card__subtext">Em carteira comercial</span>
        </div>
        <div className="comm-kpi-card">
          <span className="comm-kpi-card__label">Pessoas Físicas</span>
          <span className="comm-kpi-card__value">{pfCount}</span>
          <span className="comm-kpi-card__subtext">Residencial / Rural</span>
        </div>
        <div className="comm-kpi-card">
          <span className="comm-kpi-card__label">Pessoas Jurídicas</span>
          <span className="comm-kpi-card__value" style={{ color: 'var(--brand-solar, #ffd400)' }}>
            {pjCount}
          </span>
          <span className="comm-kpi-card__subtext">Comercial / Industrial</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="comm-toolbar">
        <div className="comm-toolbar__title-group">
          <h2 className="comm-toolbar__title">Clientes</h2>
          <span className="comm-toolbar__count device">{items.length} exibidos</span>
        </div>
        <div className="actions">
          {canCreate && !isCreating && (
            <Button
              variant="primary"
              onClick={() => {
                setIsCreating(true);
                setSelectedCustomer(null);
                resetForm();
              }}
            >
              + Novo Cliente
            </Button>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div className="comm-filter-bar">
        <input
          type="search"
          className="comm-search-input"
          placeholder="Buscar por nome, CPF/CNPJ, telefone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Buscar clientes"
        />
        <select
          className="comm-filter-select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filtrar por status"
        >
          <option value="ACTIVE">Ativos</option>
          <option value="ARCHIVED">Arquivados</option>
          <option value="ALL">Todos os status</option>
        </select>
      </div>

      {/* Create form panel */}
      {isCreating && (
        <section className="panel" aria-label="Cadastro de novo cliente">
          <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 16px' }}>
            Cadastrar Novo Cliente
          </h3>
          <Feedback error={createMutation.error} />

          {duplicatesWarning.length > 0 && (
            <div
              className="notice"
              style={{
                borderColor: 'var(--status-warning, #ff9f1c)',
                background: 'rgba(255, 159, 28, 0.12)',
              }}
            >
              <strong>Atenção: Possíveis duplicidades encontradas</strong>
              <ul style={{ margin: '0.5rem 0', paddingLeft: '1.25rem' }}>
                {duplicatesWarning.map((d, i) => (
                  <li key={i}>
                    [{d.strength === 'STRONG' ? 'Forte' : 'Moderada'}] {d.reason}
                    <Button
                      variant="secondary"
                      size="compact"
                      type="button"
                      style={{ marginLeft: '0.5rem', padding: '2px 8px', fontSize: '12px' }}
                      onClick={() => {
                        setSelectedCustomer({
                          id: d.customerId,
                          legalName: d.customerName,
                        } as Customer);
                        setIsCreating(false);
                      }}
                    >
                      Abrir existente
                    </Button>
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
                  className="ui-input"
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
                  className="ui-input"
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
                    className="ui-input"
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
                  className="ui-input"
                  value={formTaxId}
                  onChange={(e) => setFormTaxId(e.target.value)}
                  placeholder={formKind === 'PERSON' ? '000.000.000-00' : '00.000.000/0001-00'}
                />
              </label>

              <label>
                Telefone / WhatsApp
                <input
                  type="tel"
                  className="ui-input"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="(31) 98765-4321"
                />
              </label>

              <label>
                E-mail
                <input
                  type="email"
                  className="ui-input"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="cliente@exemplo.com"
                />
              </label>

              <label>
                Rua / Logradouro
                <input
                  type="text"
                  className="ui-input"
                  value={formStreet}
                  onChange={(e) => setFormStreet(e.target.value)}
                  placeholder="Rua das Flores"
                />
              </label>

              <label>
                Número
                <input
                  type="text"
                  className="ui-input"
                  value={formNumber}
                  onChange={(e) => setFormNumber(e.target.value)}
                  placeholder="123"
                />
              </label>

              <label>
                Cidade
                <input
                  type="text"
                  className="ui-input"
                  value={formCity}
                  onChange={(e) => setFormCity(e.target.value)}
                  placeholder="Belo Horizonte"
                />
              </label>

              <label>
                Estado
                <input
                  type="text"
                  className="ui-input"
                  maxLength={2}
                  value={formState}
                  onChange={(e) => setFormState(e.target.value.toUpperCase())}
                  placeholder="MG"
                />
              </label>
            </div>

            <div className="actions" style={{ marginTop: '1.25rem' }}>
              <Button type="submit" variant="primary" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Salvando…' : 'Salvar Cliente'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setIsCreating(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </section>
      )}

      {/* Customer detail panel */}
      {selectedCustomer && (
        <section className="panel comm-detail-panel" aria-label="Detalhe do cliente">
          <div className="comm-detail-header">
            <div>
              <h3
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  margin: '0 0 4px',
                  color: 'var(--text-primary, #f5f7f5)',
                }}
              >
                {selectedCustomer.legalName}
              </h3>
              {selectedCustomer.tradeName && (
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary, #9ba49e)' }}>
                  {selectedCustomer.tradeName}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <span
                className={`badge ${selectedCustomer.status === 'ACTIVE' ? 'badge-ativo' : 'badge-cancelado'}`}
              >
                {selectedCustomer.status === 'ACTIVE' ? 'Ativo' : 'Arquivado'}
              </span>
              <Button variant="secondary" size="compact" onClick={() => setSelectedCustomer(null)}>
                Fechar
              </Button>
            </div>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary, #9ba49e)' }}>
              <strong>Documento:</strong> {selectedCustomer.taxId || 'Não informado'} |{' '}
              <strong>Versão:</strong> {selectedCustomer.version}
            </p>

            {customerDetailQuery.isPending && (
              <p role="status" className="id-status-text">
                Carregando detalhes…
              </p>
            )}

            {customerDetailQuery.data && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 16rem), 1fr))',
                  gap: '1rem',
                  marginTop: '1rem',
                }}
              >
                <div
                  style={{
                    background: 'var(--surface-elevated, #1c211d)',
                    border: '1px solid var(--border-default, #29302b)',
                    borderRadius: '8px',
                    padding: '14px',
                  }}
                >
                  <h4
                    style={{
                      margin: '0 0 8px',
                      fontSize: '14px',
                      color: 'var(--text-primary, #f5f7f5)',
                    }}
                  >
                    Contatos
                  </h4>
                  {customerDetailQuery.data.contacts?.length === 0 ? (
                    <p className="device">Nenhum contato cadastrado.</p>
                  ) : (
                    <ul
                      style={{
                        margin: 0,
                        paddingLeft: '1.25rem',
                        fontSize: '13px',
                        color: 'var(--text-secondary, #9ba49e)',
                      }}
                    >
                      {customerDetailQuery.data.contacts?.map((c) => (
                        <li key={c.id}>
                          <strong>[{c.type}]</strong> {c.value} {c.isPrimary && '(Principal)'}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div
                  style={{
                    background: 'var(--surface-elevated, #1c211d)',
                    border: '1px solid var(--border-default, #29302b)',
                    borderRadius: '8px',
                    padding: '14px',
                  }}
                >
                  <h4
                    style={{
                      margin: '0 0 8px',
                      fontSize: '14px',
                      color: 'var(--text-primary, #f5f7f5)',
                    }}
                  >
                    Unidades Consumidoras
                  </h4>
                  {customerDetailQuery.data.utilityUnits?.length === 0 ? (
                    <p className="device">Nenhuma unidade consumidora cadastrada.</p>
                  ) : (
                    <ul
                      style={{
                        margin: 0,
                        paddingLeft: '1.25rem',
                        fontSize: '13px',
                        color: 'var(--text-secondary, #9ba49e)',
                      }}
                    >
                      {customerDetailQuery.data.utilityUnits?.map((u) => (
                        <li key={u.id}>
                          {u.distributorName} — Código: {u.externalCode || 'S/N'} ({u.consumerClass}
                          )
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div
                  style={{
                    background: 'var(--surface-elevated, #1c211d)',
                    border: '1px solid var(--border-default, #29302b)',
                    borderRadius: '8px',
                    padding: '14px',
                  }}
                >
                  <h4
                    style={{
                      margin: '0 0 8px',
                      fontSize: '14px',
                      color: 'var(--text-primary, #f5f7f5)',
                    }}
                  >
                    Oportunidades
                  </h4>
                  {customerDetailQuery.data.opportunities?.length === 0 ? (
                    <p className="device">Nenhuma oportunidade aberta.</p>
                  ) : (
                    <ul
                      style={{
                        margin: 0,
                        paddingLeft: '1.25rem',
                        fontSize: '13px',
                        color: 'var(--text-secondary, #9ba49e)',
                      }}
                    >
                      {customerDetailQuery.data.opportunities?.map((o) => (
                        <li key={o.id}>
                          <strong style={{ color: 'var(--brand-solar, #ffd400)' }}>{o.code}</strong>{' '}
                          — {o.title} [{o.state}]
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            <div className="actions" style={{ marginTop: '1.25rem' }}>
              {onCreateOpportunity && (
                <Button
                  variant="primary"
                  onClick={() => {
                    onCreateOpportunity(selectedCustomer);
                  }}
                >
                  + Nova Oportunidade
                </Button>
              )}

              {canArchive && selectedCustomer.status === 'ACTIVE' && (
                <Button
                  variant="danger"
                  disabled={archiveMutation.isPending}
                  onClick={() => archiveMutation.mutate(selectedCustomer)}
                >
                  Arquivar Cliente
                </Button>
              )}

              {canArchive && selectedCustomer.status === 'ARCHIVED' && (
                <Button
                  variant="primary"
                  disabled={restoreMutation.isPending}
                  onClick={() => restoreMutation.mutate(selectedCustomer)}
                >
                  Restaurar Cliente
                </Button>
              )}
            </div>
            <Feedback error={archiveMutation.error || restoreMutation.error} />
          </div>
        </section>
      )}

      {/* Table view */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome / Razão Social</th>
              <th>CPF / CNPJ</th>
              <th>Tipo</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {customersQuery.isPending && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                  Carregando clientes…
                </td>
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
                <td style={{ textAlign: 'right' }}>
                  <Button
                    variant="secondary"
                    size="compact"
                    onClick={() => {
                      setSelectedCustomer(cust);
                      if (onSelectCustomer) onSelectCustomer(cust);
                    }}
                  >
                    Ver detalhes
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
