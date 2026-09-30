'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, result, allows } from '../identity/client';
import { Feedback } from '../identity/feedback';
import type { Schemas } from '@moura-solar/api-client';

type Survey = Schemas['SurveyViewDto'];

interface SurveyProps {
  opportunityId: string;
  readonly?: boolean;
}

export function TechnicalSurvey({ opportunityId, readonly = false }: SurveyProps) {
  const queryClient = useQueryClient();
  const [showEditForm, setShowEditForm] = useState(false);

  // Form states
  const [type, setType] = useState<'REMOTE' | 'ONSITE' | 'HYBRID'>('REMOTE');
  const [roofType, setRoofType] = useState('CERAMIC');
  const [shadingKnown, setShadingKnown] = useState(false);
  const [gridVoltage, setGridVoltage] = useState('220V');
  const [connectionType, setConnectionType] = useState<'MONOPHASIC' | 'BIPHASIC' | 'TRIPHASIC'>(
    'BIPHASIC',
  );
  const [tariffPerKwh, setTariffPerKwh] = useState('0.95');
  const [surveyNotes, setSurveyNotes] = useState('');

  // Permissions
  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => result(api.GET('/api/v1/identity/me')),
  });
  const canManageSurvey = me.data ? allows(me.data, 'surveys:create', false) : false;
  const canCompleteSurvey = me.data ? allows(me.data, 'surveys:complete', false) : false;

  // Surveys query
  const surveysQuery = useQuery({
    queryKey: ['opportunity-surveys', opportunityId],
    queryFn: () =>
      result(
        api.GET('/api/v1/opportunities/{id}/surveys', {
          params: { path: { id: opportunityId } },
        }),
      ),
    enabled: !!opportunityId,
  });

  // Save / Update survey
  const saveSurveyMutation = useMutation({
    mutationFn: async () => {
      return result(
        api.POST('/api/v1/opportunities/{id}/surveys', {
          params: { path: { id: opportunityId } },
          body: {
            type,
            roofType: roofType || undefined,
            tariffPerKwh: parseFloat(tariffPerKwh) || 0.95,
            shadingKnown,
            voltage: gridVoltage || '220V',
            connectionType,
            notes: surveyNotes || undefined,
          },
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunity-surveys', opportunityId] });
      setShowEditForm(false);
    },
  });

  // Complete survey
  const completeSurveyMutation = useMutation({
    mutationFn: async (surveyId: string) => {
      return result(
        api.POST('/api/v1/surveys/{id}/complete', {
          params: { path: { id: surveyId } },
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunity-surveys', opportunityId] });
    },
  });

  const surveys: Survey[] = surveysQuery.data ?? [];
  const latestSurvey = surveys[0] as Survey | undefined;

  return (
    <section className="panel" aria-label="Levantamento Técnico e Vistoria">
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
          <h3>Levantamento Técnico & Vistoria</h3>
          <p className="device">
            Premissas físicas e elétricas da instalação (tipo de telhado, tensão e tipo de ligação).
          </p>
        </div>
        {latestSurvey && !readonly && canManageSurvey && latestSurvey.status !== 'COMPLETED' && (
          <button
            style={{ background: 'var(--color-surface)', color: 'var(--text-primary)' }}
            onClick={() => {
              if (latestSurvey) {
                setType((latestSurvey.type as 'REMOTE' | 'ONSITE' | 'HYBRID') || 'REMOTE');
                setRoofType(latestSurvey.roofType ?? 'CERAMIC');
                setShadingKnown(latestSurvey.shadingKnown ?? false);
                setGridVoltage(latestSurvey.voltage ?? '220V');
                setConnectionType(
                  (latestSurvey.connectionType as 'MONOPHASIC' | 'BIPHASIC' | 'TRIPHASIC') ||
                    'BIPHASIC',
                );
                setTariffPerKwh(latestSurvey.tariffPerKwh?.toString() ?? '0.95');
                setSurveyNotes(latestSurvey.notes ?? '');
              }
              setShowEditForm(!showEditForm);
            }}
          >
            {showEditForm ? 'Fechar Edição' : 'Editar Vistoria'}
          </button>
        )}
      </div>

      <Feedback error={surveysQuery.error} />
      <Feedback error={completeSurveyMutation.error} />

      {!latestSurvey && !showEditForm && (
        <div style={{ padding: '1.5rem', textAlign: 'center' }}>
          <p className="device">Nenhum levantamento técnico registrado ainda.</p>
          {!readonly && canManageSurvey && (
            <button onClick={() => setShowEditForm(true)} style={{ marginTop: '0.5rem' }}>
              + Iniciar Levantamento Técnico
            </button>
          )}
        </div>
      )}

      {/* Latest Survey Details */}
      {latestSurvey && !showEditForm && (
        <div style={{ marginTop: '1rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <span
              className={`badge ${latestSurvey.status === 'COMPLETED' ? 'badge-ativo' : 'badge-novo'}`}
            >
              {latestSurvey.status === 'COMPLETED'
                ? 'Vistoria Concluída'
                : 'Em Elaboração (Rascunho)'}
            </span>
            <span className="device">
              Tipo: <strong>{latestSurvey.type}</strong> | Registrado em:{' '}
              {new Date(latestSurvey.createdAt).toLocaleDateString('pt-BR')}
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))',
              gap: '0.75rem',
            }}
          >
            <div className="panel" style={{ margin: 0, padding: '0.75rem' }}>
              <span className="device" style={{ fontSize: '0.75rem' }}>
                TIPO DE TELHADO
              </span>
              <strong style={{ display: 'block' }}>
                {latestSurvey.roofType ?? 'Não informado'}
              </strong>
            </div>
            <div className="panel" style={{ margin: 0, padding: '0.75rem' }}>
              <span className="device" style={{ fontSize: '0.75rem' }}>
                TENSÃO & CONEXÃO
              </span>
              <strong style={{ display: 'block' }}>
                {latestSurvey.voltage} — {latestSurvey.connectionType}
              </strong>
            </div>
            <div className="panel" style={{ margin: 0, padding: '0.75rem' }}>
              <span className="device" style={{ fontSize: '0.75rem' }}>
                TARIFA APLICÁVEL
              </span>
              <strong style={{ display: 'block' }}>
                R$ {latestSurvey.tariffPerKwh.toFixed(4)} / kWh
              </strong>
            </div>
            <div className="panel" style={{ margin: 0, padding: '0.75rem' }}>
              <span className="device" style={{ fontSize: '0.75rem' }}>
                SOMBREAMENTO CONHECIDO
              </span>
              <strong style={{ display: 'block' }}>
                {latestSurvey.shadingKnown ? 'Sim' : 'Não'}
              </strong>
            </div>
          </div>

          {latestSurvey.notes && (
            <p style={{ marginTop: '1rem', fontStyle: 'italic' }}>
              <strong>Observações:</strong> {latestSurvey.notes}
            </p>
          )}

          {latestSurvey.status !== 'COMPLETED' && !readonly && canCompleteSurvey && (
            <div className="actions" style={{ marginTop: '1.25rem' }}>
              <button
                onClick={() => completeSurveyMutation.mutate(latestSurvey.id)}
                disabled={completeSurveyMutation.isPending}
              >
                ✔ Concluir e Validar Vistoria Técnica
              </button>
            </div>
          )}
        </div>
      )}

      {/* Edit / New Survey Form */}
      {showEditForm && !readonly && (
        <form
          className="panel"
          style={{ marginTop: '1rem', background: 'var(--color-canvas)' }}
          onSubmit={(e) => {
            e.preventDefault();
            saveSurveyMutation.mutate();
          }}
        >
          <h4>{latestSurvey ? 'Atualizar Levantamento Técnico' : 'Novo Levantamento Técnico'}</h4>
          <Feedback error={saveSurveyMutation.error} />
          <div className="form-grid">
            <label>
              Tipo de Levantamento *
              <select
                value={type}
                onChange={(e) => setType(e.target.value as 'REMOTE' | 'ONSITE' | 'HYBRID')}
              >
                <option value="REMOTE">Remoto (Fotos / Documentos)</option>
                <option value="ONSITE">Presencial (Visita técnica)</option>
                <option value="HYBRID">Híbrido</option>
              </select>
            </label>
            <label>
              Tipo de Estrutura / Telhado
              <select value={roofType} onChange={(e) => setRoofType(e.target.value)}>
                <option value="CERAMIC">Cerâmico</option>
                <option value="METALLIC">Metálico / Trapezoidal</option>
                <option value="FIBROCEMENT">Fibrocimento</option>
                <option value="CONCRETE">Laje de Concreto</option>
                <option value="GROUND">Solo</option>
              </select>
            </label>
            <label>
              Tensão da Rede *
              <select value={gridVoltage} onChange={(e) => setGridVoltage(e.target.value)}>
                <option value="127V">127V</option>
                <option value="220V">220V</option>
                <option value="380V">380V</option>
              </select>
            </label>
            <label>
              Tipo de Conexão *
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
              Tarifa de Referência (R$/kWh)
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={tariffPerKwh}
                onChange={(e) => setTariffPerKwh(e.target.value)}
              />
            </label>
            <div className="check-row" style={{ marginTop: '1.5rem' }}>
              <input
                type="checkbox"
                id="shading-check"
                checked={shadingKnown}
                onChange={(e) => setShadingKnown(e.target.checked)}
              />
              <label htmlFor="shading-check" style={{ margin: 0 }}>
                Possui sombreamento conhecido?
              </label>
            </div>
            <label style={{ gridColumn: '1 / -1' }}>
              Notas Técnicas e Limitações
              <input
                type="text"
                placeholder="Ex: Ponto de conexão padrão CEMIG 220V; sem obstáculos de sombreamento…"
                value={surveyNotes}
                onChange={(e) => setSurveyNotes(e.target.value)}
              />
            </label>
          </div>
          <div className="actions" style={{ marginTop: '0.75rem' }}>
            <button type="submit" disabled={saveSurveyMutation.isPending}>
              Salvar Levantamento
            </button>
            <button
              type="button"
              style={{ background: 'var(--color-surface)', color: 'var(--text-primary)' }}
              onClick={() => setShowEditForm(false)}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
