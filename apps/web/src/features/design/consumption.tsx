'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, result, allows } from '../identity/client';
import { Feedback } from '../identity/feedback';
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

  // Add / update reading
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
      <section className="panel" aria-label="Vinculação de Unidade Consumidora">
        <h3>Unidade Consumidora (UC)</h3>
        <p className="device">
          Para registrar o histórico de 12 meses de consumo e dimensionar o sistema solar com
          precisão, vincule uma Unidade Consumidora a esta oportunidade.
        </p>

        {existingUnits.length > 0 && (
          <div style={{ marginBlock: '1rem' }}>
            <h4>Unidades cadastradas para este cliente:</h4>
            <div className="record-list" style={{ marginTop: '0.5rem' }}>
              {existingUnits.map((u) => (
                <div key={u.id} className="panel" style={{ padding: '0.75rem' }}>
                  <strong>UC: {u.externalCode ?? u.id}</strong>
                  <p className="device">
                    {u.distributorName} | {u.consumerClass} | {u.voltage} | {u.connectionType}
                  </p>
                  <button
                    onClick={() => linkUnitMutation.mutate(u.id)}
                    disabled={linkUnitMutation.isPending}
                    style={{ marginTop: '0.5rem' }}
                  >
                    Vincular a esta Oportunidade
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {canManageUnits && !showNewUnitForm && (
          <button
            onClick={() => setShowNewUnitForm(true)}
            style={{
              marginTop: '1rem',
              background: 'var(--color-surface)',
              color: 'var(--brand-primary)',
            }}
          >
            + Cadastrar Nova Unidade Consumidora
          </button>
        )}

        {showNewUnitForm && (
          <form
            className="panel"
            style={{ marginTop: '1rem' }}
            onSubmit={(e) => {
              e.preventDefault();
              createUnitMutation.mutate();
            }}
          >
            <h4>Nova Unidade Consumidora</h4>
            <Feedback error={createUnitMutation.error} />
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
            <div className="actions">
              <button type="submit" disabled={createUnitMutation.isPending}>
                Salvar e Vincular UC
              </button>
              <button
                type="button"
                style={{ background: 'var(--color-surface)', color: 'var(--text-primary)' }}
                onClick={() => setShowNewUnitForm(false)}
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </section>
    );
  }

  const consumptionSummary = readingsQuery.data;
  const readings: EnergyReading[] = consumptionSummary?.readings ?? [];
  const monthsCount = consumptionSummary?.validMonthsCount ?? 0;
  const hasIncompleteHistory = consumptionSummary?.hasIncompleteHistory ?? false;

  return (
    <section className="panel" aria-label="Histórico de Consumo de Energia">
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
          <h3>Histórico de Consumo de Energia</h3>
          <p className="device">
            UC vinculada:{' '}
            <strong>
              {unitsQuery.data?.find((u) => u.id === activeUnitId)?.externalCode ?? activeUnitId}
            </strong>
          </p>
        </div>
      </div>

      <Feedback error={readingsQuery.error} />

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(10rem, 1fr))',
          gap: '0.75rem',
          marginBlock: '1rem',
        }}
      >
        <div className="panel" style={{ margin: 0, padding: '1rem' }}>
          <span className="eyebrow" style={{ fontSize: '0.7rem' }}>
            MÉDIA MENSAL
          </span>
          <strong style={{ fontSize: '1.5rem', display: 'block' }}>
            {consumptionSummary
              ? `${consumptionSummary.averageMonthlyConsumptionKwh.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kWh`
              : '—'}
          </strong>
          <span className="device" style={{ fontSize: '0.75rem' }}>
            {monthsCount} {monthsCount === 1 ? 'mês registrado' : 'meses registrados'}
          </span>
        </div>

        <div className="panel" style={{ margin: 0, padding: '1rem' }}>
          <span className="eyebrow" style={{ fontSize: '0.7rem' }}>
            CONSUMO ANUALIZADO
          </span>
          <strong style={{ fontSize: '1.5rem', display: 'block' }}>
            {consumptionSummary
              ? `${consumptionSummary.annualizedConsumptionKwh.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kWh`
              : '—'}
          </strong>
          <span className="device" style={{ fontSize: '0.75rem' }}>
            Projeção anual 12 meses
          </span>
        </div>

        <div className="panel" style={{ margin: 0, padding: '1rem' }}>
          <span className="eyebrow" style={{ fontSize: '0.7rem' }}>
            SÉRIE HISTÓRICA
          </span>
          <strong style={{ fontSize: '1.5rem', display: 'block' }}>{monthsCount} / 12</strong>
          <span className="device" style={{ fontSize: '0.75rem' }}>
            {hasIncompleteHistory ? 'Histórico incompleto' : 'Histórico completo'}
          </span>
        </div>
      </div>

      {/* Incomplete history warning banner as mandated by SPEC-005 item 16 */}
      {hasIncompleteHistory && (
        <div
          className="notice"
          data-testid="incomplete-history-notice"
          style={{
            marginBlock: '1rem',
            borderLeft: '4px solid var(--color-accent-500)',
            backgroundColor: '#fffbeb',
            color: '#92400e',
          }}
        >
          <strong>⚠️ Aviso: Histórico de Consumo Incompleto ({monthsCount}/12 meses)</strong>
          <p style={{ margin: 0, fontSize: '0.875rem', marginTop: '0.25rem' }}>
            A média foi calculada com base estritamente nos <strong>{monthsCount} meses</strong>{' '}
            informados, sem interpolação ou invenção de meses ausentes. Recomenda-se registrar os 12
            meses para maior precisão de sazonalidade.
          </p>
        </div>
      )}

      {monthsCount === 12 && (
        <div
          className="notice"
          style={{
            marginBlock: '1rem',
            borderLeft: '4px solid var(--brand-primary)',
            backgroundColor: 'var(--brand-primary-soft)',
            color: 'var(--brand-primary-strong)',
          }}
        >
          <strong>✅ Histórico Completo de 12 Meses</strong>
          <p style={{ margin: 0, fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Série histórica completa de 12 meses registrada. O dimensionamento considerará a
            sazonalidade anual integral.
          </p>
        </div>
      )}

      {/* Add Reading Form */}
      {!readonly && canManageUnits && (
        <form
          className="panel"
          style={{ marginBlock: '1rem', background: 'var(--color-canvas)' }}
          onSubmit={(e) => {
            e.preventDefault();
            addReadingMutation.mutate();
          }}
        >
          <h4>Adicionar Leitura Mensal</h4>
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
          <div className="actions" style={{ marginTop: '0.75rem' }}>
            <button type="submit" disabled={addReadingMutation.isPending}>
              Salvar Leitura
            </button>
          </div>
        </form>
      )}

      {/* Desktop Table View */}
      <div className="table-wrapper desktop-only">
        <table className="data-table">
          <thead>
            <tr>
              <th>Mês de Referência</th>
              <th>Consumo (kWh)</th>
              <th>Faturado (R$)</th>
              <th>Observação</th>
              {!readonly && <th>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {readings.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '1.5rem' }}>
                  Nenhuma leitura cadastrada ainda para esta UC.
                </td>
              </tr>
            )}
            {readings.map((r) => (
              <tr key={r.id}>
                <td>
                  <strong>{r.referenceMonth}</strong>
                </td>
                <td>
                  <strong>{r.consumptionKwh.toLocaleString('pt-BR')} kWh</strong>
                </td>
                <td>
                  {r.billedAmount !== null && r.billedAmount !== undefined
                    ? `R$ ${r.billedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : '—'}
                </td>
                <td className="device">{r.notes ?? '—'}</td>
                {!readonly && (
                  <td>
                    <button
                      type="button"
                      style={{
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.75rem',
                        background: 'var(--color-surface)',
                        color: 'var(--status-danger)',
                        borderColor: 'var(--status-danger)',
                      }}
                      onClick={() => deleteReadingMutation.mutate(r.id)}
                      disabled={deleteReadingMutation.isPending}
                    >
                      Excluir
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List View (Visible on 360px up to 768px, or responsive) */}
      <div className="mobile-readings-list">
        {readings.length === 0 && (
          <p className="device" style={{ textAlign: 'center', padding: '1rem' }}>
            Nenhuma leitura cadastrada ainda para esta UC.
          </p>
        )}
        <div className="record-list">
          {readings.map((r) => (
            <div
              key={r.id}
              className="panel"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <div>
                <strong>{r.referenceMonth}</strong>
                <div
                  style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--brand-primary)' }}
                >
                  {r.consumptionKwh.toLocaleString('pt-BR')} kWh
                </div>
                {r.billedAmount !== null && r.billedAmount !== undefined && (
                  <div className="device" style={{ fontSize: '0.8125rem' }}>
                    Faturado: R${' '}
                    {r.billedAmount.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                )}
              </div>
              {!readonly && (
                <button
                  type="button"
                  style={{
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.8125rem',
                    background: 'var(--color-surface)',
                    color: 'var(--status-danger)',
                    borderColor: 'var(--status-danger)',
                  }}
                  onClick={() => deleteReadingMutation.mutate(r.id)}
                  disabled={deleteReadingMutation.isPending}
                >
                  Excluir
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
