'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, result, allows } from '../identity/client';
import { Feedback } from '../identity/feedback';
import { Button } from '../../ui/Button';
import type { Schemas } from '@moura-solar/api-client';

type EnergyReading = Schemas['EnergyReadingViewDto'];
type UtilityUnit = Schemas['UtilityUnitViewDto'];

interface EnergyReadingsProps {
  opportunityId: string;
  customerId: string;
  utilityUnitId?: string | null;
  opportunityVersion: number;
  onUtilityUnitLinked?: (unitId: string) => void;
  readonly?: boolean;
}

export function EnergyReadings({
  opportunityId,
  customerId,
  utilityUnitId,
  opportunityVersion,
  onUtilityUnitLinked,
  readonly = false,
}: EnergyReadingsProps) {
  const queryClient = useQueryClient();
  const [activeUnitId, setActiveUnitId] = useState<string | undefined>(utilityUnitId ?? undefined);

  // New utility unit form
  const [showNewUnitForm, setShowNewUnitForm] = useState(false);
  const [unitCode, setUnitCode] = useState('');
  const [distributor, setDistributor] = useState('Neoenergia');
  const [tariffGroup, setTariffGroup] = useState('B1');
  const [connectionType, setConnectionType] = useState<'MONOPHASIC' | 'BIPHASIC' | 'TRIPHASIC'>(
    'BIPHASIC',
  );
  const [voltage, setVoltage] = useState('220V');

  // New reading form
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [refMonth, setRefMonth] = useState(currentMonth);
  const [kwh, setKwh] = useState('');
  const [billedAmount, setBilledAmount] = useState('');
  const [readingNotes, setReadingNotes] = useState('');

  // Permissions
  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => result(api.GET('/api/v1/identity/me')),
  });
  const canManageUnits = me.data ? allows(me.data, 'consumer_units:manage', false) : false;

  // Query customer utility units if none is active
  const unitsQuery = useQuery({
    queryKey: ['customer-utility-units', customerId],
    queryFn: () =>
      result(
        api.GET('/api/v1/customers/{customerId}/utility-units', {
          params: { path: { customerId } },
        }),
      ),
    enabled: !!customerId,
  });

  // Query readings for active unit
  const readingsQuery = useQuery({
    queryKey: ['energy-readings', activeUnitId],
    queryFn: () =>
      result(
        api.GET('/api/v1/utility-units/{id}/readings', {
          params: { path: { id: activeUnitId! } },
        }),
      ),
    enabled: !!activeUnitId,
  });

  // Create and link utility unit
  const createUnitMutation = useMutation({
    mutationFn: async () => {
      const newUnit = await result(
        api.POST('/api/v1/customers/{customerId}/utility-units', {
          params: { path: { customerId } },
          body: {
            distributorName: distributor,
            externalCode: unitCode || undefined,
            consumerClass: tariffGroup === 'B1' ? 'RESIDENTIAL' : 'COMMERCIAL',
            tariffMode: 'CONVENTIONAL',
            connectionType,
            voltage,
          },
        }),
      );

      // Link to opportunity
      await result(
        api.PATCH('/api/v1/opportunities/{opportunityId}', {
          params: { path: { opportunityId } },
          body: {
            expectedVersion: opportunityVersion,
            utilityUnitId: newUnit.id,
          },
        }),
      );

      return newUnit;
    },
    onSuccess: (newUnit) => {
      queryClient.invalidateQueries({ queryKey: ['customer-utility-units', customerId] });
      queryClient.invalidateQueries({ queryKey: ['opportunity', opportunityId] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      setActiveUnitId(newUnit.id);
      setShowNewUnitForm(false);
      onUtilityUnitLinked?.(newUnit.id);
    },
  });

  // Link existing utility unit to opportunity
  const linkUnitMutation = useMutation({
    mutationFn: async (unitId: string) => {
      return result(
        api.PATCH('/api/v1/opportunities/{opportunityId}', {
          params: { path: { opportunityId } },
          body: {
            expectedVersion: opportunityVersion,
            utilityUnitId: unitId,
          },
        }),
      );
    },
    onSuccess: (_, unitId) => {
      queryClient.invalidateQueries({ queryKey: ['opportunity', opportunityId] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      setActiveUnitId(unitId);
      onUtilityUnitLinked?.(unitId);
    },
  });

  // Add reading
  const addReadingMutation = useMutation({
    mutationFn: async () => {
      if (!activeUnitId) throw new Error('Unidade consumidora não definida');
      return result(
        api.POST('/api/v1/utility-units/{id}/readings', {
          params: { path: { id: activeUnitId } },
          body: {
            referenceMonth: refMonth,
            consumptionKwh: parseFloat(kwh),
            billedAmount: billedAmount ? parseFloat(billedAmount) : undefined,
            source: 'MANUAL',
            notes: readingNotes || undefined,
          },
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['energy-readings', activeUnitId] });
      setKwh('');
      setBilledAmount('');
      setReadingNotes('');
    },
  });

  // Delete reading
  const deleteReadingMutation = useMutation({
    mutationFn: async (readingId: string) => {
      if (!activeUnitId) throw new Error('Unidade consumidora não selecionada');
      return result(
        api.DELETE('/api/v1/utility-units/{id}/readings/{readingId}', {
          params: { path: { id: activeUnitId, readingId } },
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['energy-readings', activeUnitId] });
    },
  });

  // If no unit is active yet
  if (!activeUnitId) {
    const existingUnits: UtilityUnit[] = unitsQuery.data ?? [];
    return (
      <section className="design-panel" aria-label="Vinculação de Unidade Consumidora">
        <div className="design-section-header">
          <div>
            <h3 className="design-section-title">Unidade Consumidora (UC)</h3>
            <p className="design-section-desc">
              Para registrar o histórico de 12 meses de consumo e dimensionar o sistema solar com
              precisão, vincule uma Unidade Consumidora a esta oportunidade.
            </p>
          </div>
        </div>

        {existingUnits.length > 0 && (
          <div style={{ marginBlock: '1rem' }}>
            <h4
              style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary, #f5f7f5)' }}
            >
              Unidades cadastradas para este cliente:
            </h4>
            <div
              style={{
                display: 'grid',
                gap: '0.75rem',
                marginTop: '0.5rem',
              }}
            >
              {existingUnits.map((u) => (
                <div
                  key={u.id}
                  style={{
                    background: 'var(--surface-elevated, #1c211d)',
                    border: '1px solid var(--border-default, #29302b)',
                    borderRadius: '8px',
                    padding: '14px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div>
                    <strong style={{ color: 'var(--brand-solar, #ffd400)' }}>
                      UC: {u.externalCode ?? u.id}
                    </strong>
                    <p className="device" style={{ margin: '4px 0 0', fontSize: '13px' }}>
                      {u.distributorName} | {u.consumerClass} | {u.voltage} | {u.connectionType}
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="compact"
                    onClick={() => linkUnitMutation.mutate(u.id)}
                    disabled={linkUnitMutation.isPending}
                  >
                    Vincular a esta Oportunidade
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {canManageUnits && !showNewUnitForm && (
          <div style={{ marginTop: '1rem' }}>
            <Button variant="secondary" onClick={() => setShowNewUnitForm(true)}>
              + Cadastrar Nova Unidade Consumidora
            </Button>
          </div>
        )}

        {/* Modal: New Utility Unit */}
        {showNewUnitForm && (
          <div className="comm-modal-overlay">
            <section
              className="comm-modal-box"
              style={{ maxWidth: '600px' }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="new-uc-title"
            >
              <div className="comm-modal-header">
                <h3 id="new-uc-title" className="comm-modal-title">
                  Nova Unidade Consumidora
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
                  onClick={() => setShowNewUnitForm(false)}
                >
                  ✕
                </button>
              </div>

              <Feedback error={createUnitMutation.error} />

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createUnitMutation.mutate();
                }}
              >
                <div className="form-grid">
                  <label>
                    Código da UC *
                    <input
                      type="text"
                      required
                      placeholder="Ex: 1002345678"
                      value={unitCode}
                      onChange={(e) => setUnitCode(e.target.value)}
                    />
                  </label>
                  <label>
                    Concessionária *
                    <input
                      type="text"
                      required
                      value={distributor}
                      onChange={(e) => setDistributor(e.target.value)}
                    />
                  </label>
                  <label>
                    Grupo Tarifário *
                    <select value={tariffGroup} onChange={(e) => setTariffGroup(e.target.value)}>
                      <option value="B1">B1 — Residencial</option>
                      <option value="B2">B2 — Rural</option>
                      <option value="B3">B3 — Comercial / Outros</option>
                      <option value="A4">A4 — Média Tensão</option>
                    </select>
                  </label>
                  <label>
                    Tipo de Ligação *
                    <select
                      value={connectionType}
                      onChange={(e) =>
                        setConnectionType(e.target.value as 'MONOPHASIC' | 'BIPHASIC' | 'TRIPHASIC')
                      }
                    >
                      <option value="MONOPHASIC">Monofásico</option>
                      <option value="BIPHASIC">Bifásico</option>
                      <option value="TRIPHASIC">Trifásico</option>
                    </select>
                  </label>
                  <label>
                    Tensão *
                    <select value={voltage} onChange={(e) => setVoltage(e.target.value)}>
                      <option value="127V">127V</option>
                      <option value="220V">220V</option>
                      <option value="380V">380V</option>
                    </select>
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
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowNewUnitForm(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" variant="primary" disabled={createUnitMutation.isPending}>
                    Salvar e Vincular UC
                  </Button>
                </div>
              </form>
            </section>
          </div>
        )}
      </section>
    );
  }

  const consumptionSummary = readingsQuery.data;
  const readings: EnergyReading[] = consumptionSummary?.readings ?? [];
  const monthsCount = consumptionSummary?.validMonthsCount ?? 0;
  const hasIncompleteHistory = consumptionSummary?.hasIncompleteHistory ?? false;

  return (
    <section className="design-panel" aria-label="Histórico de Consumo de Energia">
      <div className="design-section-header">
        <div>
          <h3 className="design-section-title">Histórico de Consumo de Energia</h3>
          <p className="design-section-desc">
            UC vinculada:{' '}
            <strong style={{ color: 'var(--brand-solar, #ffd400)' }}>
              {unitsQuery.data?.find((u) => u.id === activeUnitId)?.externalCode ?? activeUnitId}
            </strong>
          </p>
        </div>
      </div>

      <Feedback error={readingsQuery.error} />

      {/* KPI METRICS BAR */}
      <div className="design-kpi-grid">
        <div className="design-kpi-card">
          <div className="design-kpi-card__label">MÉDIA MENSAL</div>
          <div className="design-kpi-card__value" style={{ color: 'var(--brand-solar, #ffd400)' }}>
            {consumptionSummary
              ? `${consumptionSummary.averageMonthlyConsumptionKwh.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kWh`
              : '—'}
          </div>
          <div className="design-kpi-card__subtext">
            {monthsCount} {monthsCount === 1 ? 'mês registrado' : 'meses registrados'}
          </div>
        </div>

        <div className="design-kpi-card">
          <div className="design-kpi-card__label">CONSUMO ANUALIZADO</div>
          <div className="design-kpi-card__value">
            {consumptionSummary
              ? `${consumptionSummary.annualizedConsumptionKwh.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kWh`
              : '—'}
          </div>
          <div className="design-kpi-card__subtext">Projeção anual 12 meses</div>
        </div>

        <div className="design-kpi-card">
          <div className="design-kpi-card__label">SÉRIE HISTÓRICA</div>
          <div className="design-kpi-card__value">{monthsCount} / 12</div>
          <div className="design-kpi-card__subtext">
            {hasIncompleteHistory ? 'Histórico incompleto' : 'Histórico completo'}
          </div>
        </div>
      </div>

      {/* Incomplete history warning banner as mandated by SPEC-005 item 16 */}
      {hasIncompleteHistory && (
        <div
          className="design-alert design-alert--warning"
          data-testid="incomplete-history-notice"
          style={{ marginBlock: '1rem' }}
        >
          <strong>⚠️ Aviso: Histórico de Consumo Incompleto ({monthsCount}/12 meses)</strong>
          <p style={{ margin: '4px 0 0', fontSize: '13px' }}>
            A média foi calculada com base estritamente nos <strong>{monthsCount} meses</strong>{' '}
            informados (
            {consumptionSummary?.averageMonthlyConsumptionKwh.toLocaleString('pt-BR', {
              maximumFractionDigits: 1,
            })}{' '}
            kWh), sem interpolação ou invenção de meses ausentes. Recomenda-se registrar os 12 meses
            para maior precisão de sazonalidade.
          </p>
        </div>
      )}

      {monthsCount === 12 && (
        <div className="design-alert design-alert--success" style={{ marginBlock: '1rem' }}>
          <strong>✅ Histórico Completo de 12 Meses</strong>
          <p style={{ margin: '4px 0 0', fontSize: '13px' }}>
            Série histórica completa de 12 meses registrada. O dimensionamento considerará a
            sazonalidade anual integral.
          </p>
        </div>
      )}

      {/* Add Reading Form */}
      {!readonly && canManageUnits && (
        <form
          className="design-form"
          onSubmit={(e) => {
            e.preventDefault();
            addReadingMutation.mutate();
          }}
        >
          <h4
            style={{
              fontSize: '15px',
              fontWeight: 700,
              color: 'var(--text-primary, #f5f7f5)',
              margin: '0 0 12px',
            }}
          >
            Adicionar Leitura Mensal
          </h4>
          <Feedback error={addReadingMutation.error} />
          <div className="form-grid">
            <label>
              Mês de Referência (AAAA-MM) *
              <input
                type="month"
                required
                value={refMonth}
                onChange={(e) => setRefMonth(e.target.value)}
              />
            </label>
            <label>
              Consumo Mensal (kWh) *
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="Ex: 580"
                value={kwh}
                onChange={(e) => setKwh(e.target.value)}
              />
            </label>
            <label>
              Valor Faturado (R$)
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Ex: 540.50"
                value={billedAmount}
                onChange={(e) => setBilledAmount(e.target.value)}
              />
            </label>
            <label>
              Observações
              <input
                type="text"
                placeholder="Ex: Bandeira vermelha, ar condicionado novo…"
                value={readingNotes}
                onChange={(e) => setReadingNotes(e.target.value)}
              />
            </label>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginTop: '1rem',
            }}
          >
            <Button type="submit" variant="primary" disabled={addReadingMutation.isPending}>
              {addReadingMutation.isPending ? 'Salvando…' : 'Salvar Leitura'}
            </Button>
          </div>
        </form>
      )}

      {/* DESKTOP TABLE VIEW */}
      <div className="table-wrapper desktop-only">
        <table className="data-table">
          <thead>
            <tr>
              <th>Mês de Referência</th>
              <th>Consumo (kWh)</th>
              <th>Faturado (R$)</th>
              <th>Observação</th>
              {!readonly && <th style={{ textAlign: 'right' }}>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {readings.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    textAlign: 'center',
                    padding: '2.5rem',
                    color: 'var(--text-secondary, #9ba49e)',
                  }}
                >
                  Nenhuma leitura cadastrada ainda para esta UC.
                </td>
              </tr>
            )}
            {readings.map((r) => (
              <tr key={r.id}>
                <td>
                  <strong style={{ color: 'var(--text-primary, #f5f7f5)' }}>
                    {r.referenceMonth}
                  </strong>
                </td>
                <td>
                  <strong style={{ color: 'var(--brand-solar, #ffd400)' }}>
                    {r.consumptionKwh.toLocaleString('pt-BR')} kWh
                  </strong>
                </td>
                <td style={{ color: 'var(--text-primary, #f5f7f5)' }}>
                  {r.billedAmount !== null && r.billedAmount !== undefined
                    ? `R$ ${r.billedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : '—'}
                </td>
                <td className="device" style={{ fontSize: '13px' }}>
                  {r.notes ?? '—'}
                </td>
                {!readonly && (
                  <td style={{ textAlign: 'right' }}>
                    <Button
                      variant="danger"
                      size="compact"
                      onClick={() => deleteReadingMutation.mutate(r.id)}
                      disabled={deleteReadingMutation.isPending}
                    >
                      Excluir
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MOBILE CARD LIST VIEW */}
      <div className="mobile-readings-list">
        {readings.length === 0 && (
          <p
            className="device"
            style={{
              textAlign: 'center',
              padding: '1.5rem',
              color: 'var(--text-secondary, #9ba49e)',
            }}
          >
            Nenhuma leitura cadastrada ainda para esta UC.
          </p>
        )}
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {readings.map((r) => (
            <div key={r.id} className="mobile-reading-card">
              <div>
                <strong style={{ color: 'var(--text-primary, #f5f7f5)', fontSize: '14px' }}>
                  {r.referenceMonth}
                </strong>
                <div
                  style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color: 'var(--brand-solar, #ffd400)',
                    marginTop: '2px',
                  }}
                >
                  {r.consumptionKwh.toLocaleString('pt-BR')} kWh
                </div>
                {r.billedAmount !== null && r.billedAmount !== undefined && (
                  <div
                    className="device"
                    style={{ fontSize: '12px', color: 'var(--text-secondary, #9ba49e)' }}
                  >
                    Faturado: R${' '}
                    {r.billedAmount.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                )}
              </div>
              {!readonly && (
                <Button
                  variant="danger"
                  size="compact"
                  onClick={() => deleteReadingMutation.mutate(r.id)}
                  disabled={deleteReadingMutation.isPending}
                >
                  Excluir
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
