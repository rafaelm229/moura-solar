'use client';
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Schemas } from '@moura-solar/api-client';
import { Button } from '../../components/ui/button';
import { Modal } from '../../components/ui/modal';
import { ApiFailure, allows, api, result, type Context } from '../identity/client';
import { Feedback } from '../identity/feedback';

type UtilityUnit = Schemas['UtilityUnitViewDto'];
type DossierDocument = Schemas['DossierDocumentViewDto'];
type ReviewMonth = {
  referenceMonth: string;
  decision: '' | 'KEEP' | 'INSERT' | 'REPLACE';
  consumptionKwh: string;
  injectedKwh: string;
  billedAmount: string;
  reason: string;
  evidence: Partial<
    Record<
      | 'referenceMonthCandidateId'
      | 'consumptionKwhCandidateId'
      | 'injectedKwhCandidateId'
      | 'billedAmountCandidateId',
      string
    >
  >;
};
type SavedReviewMonth = {
  referenceMonth: string;
  decision: 'KEEP' | 'INSERT' | 'REPLACE';
  consumptionKwh?: string | null;
  injectedKwh?: string | null;
  billedAmount?: string | null;
  reason?: string | null;
  evidence?: ReviewMonth['evidence'];
};
type NewUtilityUnitDraft = {
  distributorName: string;
  externalCode: string;
  consumerClass: string;
  tariffMode: string;
  connectionType: string;
  voltage: string;
};

const candidateReviewFields: Record<
  string,
  keyof Pick<ReviewMonth, 'consumptionKwh' | 'injectedKwh' | 'billedAmount'>
> = {
  'bill.consumptionKwh': 'consumptionKwh',
  'history.consumptionKwh': 'consumptionKwh',
  'bill.injectedKwh': 'injectedKwh',
  'history.injectedKwh': 'injectedKwh',
  'bill.billedAmount': 'billedAmount',
};

const candidateEvidenceFields: Record<string, keyof ReviewMonth['evidence']> = {
  'bill.consumptionKwh': 'consumptionKwhCandidateId',
  'history.consumptionKwh': 'consumptionKwhCandidateId',
  'bill.injectedKwh': 'injectedKwhCandidateId',
  'history.injectedKwh': 'injectedKwhCandidateId',
  'bill.billedAmount': 'billedAmountCandidateId',
};

const newMonth = (): ReviewMonth => ({
  referenceMonth: '',
  decision: '',
  consumptionKwh: '',
  injectedKwh: '',
  billedAmount: '',
  reason: '',
  evidence: {},
});

const labels: Record<string, string> = {
  QUEUED: 'Aguardando revisão',
  PROCESSING: 'Processando',
  REVIEW_REQUIRED: 'Revisão necessária',
  CONFIRMING: 'Confirmando',
  APPLIED: 'Aplicada',
  FAILED: 'Falhou',
  CANCELED: 'Cancelada',
};

export function EnergyImportReview({
  customer,
  utilityUnits,
  readyDocuments,
  context,
}: {
  customer: Pick<Schemas['CustomerViewDto'], 'id'>;
  utilityUnits: UtilityUnit[];
  readyDocuments: DossierDocument[];
  context: Context;
}) {
  const queryClient = useQueryClient();
  const [initialImportId, setInitialImportId] = useState(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('energyImportId');
  });
  const [isOpen, setIsOpen] = useState(!!initialImportId);
  const [importId, setImportId] = useState<string | null>(initialImportId);
  const [selectedDocumentId, setSelectedDocumentId] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [newUtilityUnit, setNewUtilityUnit] = useState<NewUtilityUnitDraft>({
    distributorName: '',
    externalCode: '',
    consumerClass: '',
    tariffMode: '',
    connectionType: '',
    voltage: '',
  });
  const [months, setMonths] = useState<ReviewMonth[]>([newMonth()]);
  const [candidateMonthTargets, setCandidateMonthTargets] = useState<Record<string, string>>({});
  const [reviewSaved, setReviewSaved] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const commandKeys = useRef(new Map<string, string>());
  const canCreate = allows(context, 'energy_imports:create');
  const canReview = allows(context, 'energy_imports:review');
  const canConfirm = allows(context, 'energy_imports:confirm');
  const canCancel = allows(context, 'energy_imports:cancel');
  const canReadUnits = allows(context, 'consumer_units:read');
  const canManageUnits = allows(context, 'consumer_units:manage');
  const document = readyDocuments.find((item) => item.id === selectedDocumentId);
  const hasUnsavedReview =
    !reviewSaved &&
    months.some(
      (month) =>
        month.referenceMonth ||
        month.decision ||
        month.consumptionKwh ||
        month.injectedKwh ||
        month.billedAmount ||
        month.reason,
    );

  const keyFor = (operation: string, payload: unknown) => {
    const fingerprint = `${operation}:${JSON.stringify(payload)}`;
    let key = commandKeys.current.get(fingerprint);
    if (!key) {
      key = crypto.randomUUID();
      commandKeys.current.set(fingerprint, key);
    }
    return { 'idempotency-key': key };
  };

  const openCreate = () => {
    updateUrl(null);
    setImportId(null);
    setSelectedDocumentId('');
    setSelectedUnitId('');
    setNewUtilityUnit({
      distributorName: '',
      externalCode: '',
      consumerClass: '',
      tariffMode: '',
      connectionType: '',
      voltage: '',
    });
    setMonths([newMonth()]);
    setCandidateMonthTargets({});
    setReviewSaved(false);
    setIsOpen(true);
  };

  const updateMonth = (index: number, patch: Partial<ReviewMonth>) => {
    setMonths((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    setReviewSaved(false);
  };

  const applyCandidateToReview = (
    candidate: NonNullable<Schemas['EnergyBillImportViewDto']['candidates']>[number],
  ) => {
    if (candidate.field === 'bill.referenceMonth' || candidate.field === 'history.referenceMonth') {
      const referenceMonth = candidate.normalizedValue;
      if (!referenceMonth || !/^\d{4}-(0[1-9]|1[0-2])$/.test(referenceMonth)) return;
      setMonths((rows) => {
        const matchingIndex = rows.findIndex((row) => row.referenceMonth === referenceMonth);
        if (matchingIndex >= 0)
          return rows.map((row, index) =>
            index === matchingIndex
              ? {
                  ...row,
                  evidence: {
                    ...row.evidence,
                    referenceMonthCandidateId: candidate.id,
                  },
                }
              : row,
          );
        const emptyIndex = rows.findIndex((row) => !row.referenceMonth);
        if (emptyIndex >= 0)
          return rows.map((row, index) =>
            index === emptyIndex
              ? {
                  ...row,
                  referenceMonth,
                  evidence: {
                    ...row.evidence,
                    referenceMonthCandidateId: candidate.id,
                  },
                }
              : row,
          );
        return [
          ...rows,
          {
            ...newMonth(),
            referenceMonth,
            evidence: { referenceMonthCandidateId: candidate.id },
          },
        ];
      });
      setReviewSaved(false);
      return;
    }

    const field = candidateReviewFields[candidate.field];
    const evidenceField = candidateEvidenceFields[candidate.field];
    const referenceMonth = candidateMonthTargets[candidate.id];
    if (!field || !evidenceField || !referenceMonth || !candidate.normalizedValue) return;
    setMonths((rows) =>
      rows.map((row) =>
        row.referenceMonth === referenceMonth
          ? {
              ...row,
              [field]: candidate.normalizedValue,
              evidence: { ...row.evidence, [evidenceField]: candidate.id },
            }
          : row,
      ),
    );
    setReviewSaved(false);
  };

  const updateUrl = (nextImportId: string | null) => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'customers');
    url.searchParams.set('customerId', customer.id);
    if (nextImportId) url.searchParams.set('energyImportId', nextImportId);
    else url.searchParams.delete('energyImportId');
    window.history.pushState({ tab: 'customers', customerId: customer.id }, '', url.toString());
  };

  const importQuery = useQuery({
    queryKey: ['energy-import', importId],
    queryFn: () =>
      result(api.GET('/api/v1/energy-imports/{id}', { params: { path: { id: importId! } } })),
    enabled: !!importId && isOpen,
  });
  const creatingUnit =
    selectedUnitId === '__create__' ||
    (!!importId && !!importQuery.data && !importQuery.data.utilityUnitId);
  const newUnitComplete =
    newUtilityUnit.distributorName.trim().length >= 2 &&
    newUtilityUnit.consumerClass.trim().length >= 2 &&
    newUtilityUnit.tariffMode.trim().length >= 2 &&
    newUtilityUnit.connectionType.trim().length >= 2 &&
    newUtilityUnit.voltage.trim().length >= 2;

  const readingsQuery = useQuery({
    queryKey: ['energy-import-readings', importQuery.data?.utilityUnitId],
    queryFn: () =>
      result(
        api.GET('/api/v1/utility-units/{id}/readings', {
          params: { path: { id: importQuery.data!.utilityUnitId! } },
        }),
      ),
    enabled: !!importQuery.data?.utilityUnitId && canReadUnits,
  });

  const savedReview = importQuery.data?.latestReview as
    | {
        id?: string;
        months?: { months?: SavedReviewMonth[]; newUtilityUnit?: NewUtilityUnitDraft };
      }
    | undefined;
  const savedNewUtilityUnit = savedReview?.months?.newUtilityUnit;

  useEffect(() => {
    const savedMonths = savedReview?.months?.months;
    if (!importId || !savedReview?.id || !savedMonths?.length) return;
    setMonths(
      savedMonths.map((month) => ({
        referenceMonth: month.referenceMonth,
        decision: month.decision,
        consumptionKwh: month.consumptionKwh ?? '',
        injectedKwh: month.injectedKwh ?? '',
        billedAmount: month.billedAmount ?? '',
        reason: month.reason ?? '',
        evidence: month.evidence ?? {},
      })),
    );
    const targets: Record<string, string> = {};
    for (const month of savedMonths) {
      for (const candidateId of Object.values(month.evidence ?? {})) {
        if (candidateId) targets[candidateId] = month.referenceMonth;
      }
    }
    setCandidateMonthTargets(targets);
    if (savedNewUtilityUnit)
      setNewUtilityUnit({
        ...savedNewUtilityUnit,
        externalCode: savedNewUtilityUnit.externalCode ?? '',
      });
    setReviewSaved(true);
  }, [importId, savedReview?.id, savedReview?.months?.months, savedNewUtilityUnit]);

  const createMutation = useMutation({
    mutationFn: () => {
      if (!document?.currentVersion?.id) throw new Error('Selecione uma versão READY do dossiê.');
      if (!selectedUnitId)
        throw new Error('Selecione ou indique a criação da unidade consumidora.');
      const payload = {
        documentVersionId: document.currentVersion.id,
        ...(selectedUnitId !== '__create__' ? { utilityUnitId: selectedUnitId } : {}),
      };
      return result(
        api.POST('/api/v1/customers/{customerId}/energy-imports', {
          params: { path: { customerId: customer.id }, header: keyFor('create', payload) },
          body: payload,
        }),
      );
    },
    onSuccess: (created) => {
      setImportId(created.id);
      setInitialImportId(created.id);
      updateUrl(created.id);
      void queryClient.invalidateQueries({ queryKey: ['energy-import', created.id] });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async () => {
      const current = importQuery.data;
      if (!current) throw new Error('A importação ainda está carregando.');
      const validMonths = months.filter((month) => month.referenceMonth && month.decision);
      if (!validMonths.length) throw new Error('Inclua pelo menos um mês e uma decisão.');
      if (new Set(validMonths.map((month) => month.referenceMonth)).size !== validMonths.length)
        throw new Error('Cada mês pode aparecer uma única vez na revisão.');
      const readings = readingsQuery.data?.readings ?? [];
      const body = {
        expectedVersion: current.version,
        ...(creatingUnit
          ? {
              newUtilityUnit: {
                distributorName: newUtilityUnit.distributorName.trim(),
                ...(newUtilityUnit.externalCode.trim()
                  ? { externalCode: newUtilityUnit.externalCode.trim() }
                  : {}),
                consumerClass: newUtilityUnit.consumerClass.trim(),
                tariffMode: newUtilityUnit.tariffMode.trim(),
                connectionType: newUtilityUnit.connectionType.trim(),
                voltage: newUtilityUnit.voltage.trim(),
              },
            }
          : {}),
        months: validMonths.map((month) => {
          const existing = readings.find(
            (reading) => reading.referenceMonth === month.referenceMonth,
          );
          return {
            referenceMonth: month.referenceMonth,
            decision: month.decision as 'KEEP' | 'INSERT' | 'REPLACE',
            ...(month.decision !== 'INSERT' && existing
              ? { expectedReadingVersion: existing.version }
              : {}),
            ...(month.decision !== 'KEEP' && month.consumptionKwh
              ? { consumptionKwh: month.consumptionKwh }
              : {}),
            ...(month.decision !== 'KEEP' && month.injectedKwh
              ? { injectedKwh: month.injectedKwh }
              : {}),
            ...(month.decision !== 'KEEP' && month.billedAmount
              ? { billedAmount: month.billedAmount }
              : {}),
            ...(month.decision === 'REPLACE' && month.reason.trim()
              ? { reason: month.reason.trim() }
              : {}),
            ...(Object.keys(month.evidence).length ? { evidence: month.evidence } : {}),
          };
        }),
      };
      return result(
        api.PUT('/api/v1/energy-imports/{id}/review', {
          params: { path: { id: current.id }, header: keyFor('review', body) },
          body,
        }),
      );
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['energy-import', updated.id], updated);
      setReviewSaved(true);
      void queryClient.invalidateQueries({ queryKey: ['energy-import-readings'] });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () => {
      const current = importQuery.data;
      const review = current?.latestReview as { id?: string; digest?: string } | undefined;
      if (!current || !review?.id || !review.digest)
        throw new Error('Salve uma revisão antes de confirmar.');
      const body = {
        expectedVersion: current.version,
        reviewId: review.id,
        reviewDigest: review.digest,
      };
      return result(
        api.POST('/api/v1/energy-imports/{id}/confirm', {
          params: { path: { id: current.id }, header: keyFor('confirm', body) },
          body,
        }),
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['energy-import', importId] }),
        queryClient.invalidateQueries({ queryKey: ['customer', customer.id] }),
      ]);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => {
      const current = importQuery.data;
      if (!current || cancelReason.trim().length < 3)
        throw new Error('Informe o motivo do cancelamento (ao menos 3 caracteres).');
      const body = { expectedVersion: current.version, reason: cancelReason.trim() };
      return result(
        api.POST('/api/v1/energy-imports/{id}/cancel', {
          params: { path: { id: current.id }, header: keyFor('cancel', body) },
          body,
        }),
      );
    },
    onSuccess: (updated) => queryClient.setQueryData(['energy-import', updated.id], updated),
  });

  const status = importQuery.data?.status;
  const canChangeReview = canReview && (status === 'QUEUED' || status === 'REVIEW_REQUIRED');
  const review = importQuery.data?.latestReview as
    { id?: string; digest?: string; months?: unknown } | undefined;
  const candidates = importQuery.data?.candidates ?? [];
  const receipt = confirmMutation.data;

  const close = () => {
    if (hasUnsavedReview && !window.confirm('Fechar sem salvar as decisões preenchidas?')) return;
    setIsOpen(false);
    setImportId(null);
    setInitialImportId(null);
    updateUrl(null);
  };

  return (
    <>
      {canCreate && (
        <Button variant="outline" icon="bolt" onClick={openCreate}>
          Importar conta de energia
        </Button>
      )}

      <Modal
        isOpen={isOpen}
        onClose={close}
        title="Importação assistida de conta"
        subtitle={document?.title ?? 'Revisar uma importação existente'}
        maxWidth="920px"
        closeOnBackdropClick={false}
      >
        <div
          style={{
            display: 'grid',
            gap: '1rem',
            maxHeight: '68vh',
            overflowY: 'auto',
            padding: '0.25rem',
          }}
        >
          {!importId ? (
            <>
              <p>
                O documento original continua no dossiê. A extração automática ainda não está
                habilitada; os dados podem ser revisados manualmente.
              </p>
              <label className="field">
                Conta de energia READY
                <select
                  value={selectedDocumentId}
                  onChange={(event) => setSelectedDocumentId(event.target.value)}
                >
                  <option value="">Selecione um documento do dossiê</option>
                  {readyDocuments.map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.title} — {item.currentVersion?.originalName}
                    </option>
                  ))}
                </select>
              </label>
              {readyDocuments.length === 0 && (
                <p role="status">
                  Não há conta de energia READY disponível. Envie e verifique uma conta no dossiê
                  primeiro.
                </p>
              )}
              <label className="field">
                Unidade consumidora da conta
                <select
                  value={selectedUnitId}
                  onChange={(event) => {
                    setSelectedUnitId(event.target.value);
                    setReviewSaved(false);
                  }}
                >
                  <option value="">Selecione uma UC cadastrada</option>
                  {utilityUnits.map((unit) => (
                    <option value={unit.id} key={unit.id}>
                      {unit.distributorName} — {unit.externalCode || 'Código não informado'}
                    </option>
                  ))}
                  {canManageUnits && <option value="__create__">Criar nova UC ao confirmar</option>}
                </select>
              </label>
              {utilityUnits.length === 0 && (
                <p role="status">
                  Este cliente ainda não tem UC cadastrada.
                  {canManageUnits
                    ? ' Você pode informar uma nova UC para criá-la junto com a confirmação.'
                    : ' Peça acesso ao cadastro de unidades consumidoras para continuar.'}
                </p>
              )}
              {creatingUnit && canManageUnits && (
                <NewUtilityUnitFields value={newUtilityUnit} onChange={setNewUtilityUnit} />
              )}
              <Feedback error={createMutation.error} />
              <Button
                variant="primary"
                icon="bolt"
                loading={createMutation.isPending}
                disabled={
                  !document ||
                  !selectedUnitId ||
                  (selectedUnitId === '__create__' && (!canManageUnits || !newUnitComplete))
                }
                onClick={() => createMutation.mutate()}
              >
                Criar importação
              </Button>
            </>
          ) : importQuery.isPending ? (
            <p role="status">Carregando importação…</p>
          ) : importQuery.isError ? (
            <>
              <h3>Não foi possível carregar esta importação</h3>
              <Feedback error={importQuery.error} />
              {importQuery.error instanceof ApiFailure && importQuery.error.status === 404 && (
                <p>Confira se você ainda tem acesso ao cliente, ao documento e à importação.</p>
              )}
              <Button onClick={() => void importQuery.refetch()}>Tentar novamente</Button>
            </>
          ) : importQuery.data ? (
            <>
              <div className="notice" role="status">
                <strong>Estado: {labels[status ?? ''] ?? status}</strong>
                <span style={{ marginLeft: '0.5rem' }}>Versão {importQuery.data.version}</span>
              </div>
              {document?.contentUrl && (
                <a href={`${document.contentUrl}?purpose=VIEW`} target="_blank" rel="noreferrer">
                  Abrir documento original para comparação
                </a>
              )}

              {candidates.length > 0 && (
                <section aria-labelledby="extraction-candidates-title">
                  <h3 id="extraction-candidates-title">Dados sugeridos pela extração</h3>
                  <p>São candidatos para conferência e não alteram o consumo até a confirmação.</p>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Campo</th>
                          <th>Valor</th>
                          <th>Unidade</th>
                          <th>Página</th>
                          <th>Confiança informada</th>
                          <th>Usar na revisão</th>
                        </tr>
                      </thead>
                      <tbody>
                        {candidates.map((candidate) => {
                          const confidence = candidate.providerConfidence as {
                            value?: number;
                            scale?: string;
                          } | null;
                          return (
                            <tr key={candidate.id}>
                              <td>{candidate.field}</td>
                              <td>{candidate.normalizedValue ?? '—'}</td>
                              <td>{candidate.unit ?? '—'}</td>
                              <td>{candidate.page ?? '—'}</td>
                              <td>
                                {confidence
                                  ? `${confidence.value} (${confidence.scale})`
                                  : 'Não informada'}
                              </td>
                              <td>
                                {candidate.field === 'bill.referenceMonth' ||
                                candidate.field === 'history.referenceMonth' ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    disabled={
                                      !candidate.normalizedValue ||
                                      !/^\d{4}-(0[1-9]|1[0-2])$/.test(candidate.normalizedValue) ||
                                      months.some(
                                        (month) =>
                                          month.referenceMonth === candidate.normalizedValue,
                                      )
                                    }
                                    onClick={() => applyCandidateToReview(candidate)}
                                  >
                                    Adicionar mês
                                  </Button>
                                ) : candidateReviewFields[candidate.field] ? (
                                  <div
                                    style={{ display: 'grid', gap: '0.35rem', minWidth: '10rem' }}
                                  >
                                    <label>
                                      Mês da revisão
                                      <select
                                        aria-label={`Mês para ${candidate.field} página ${candidate.page ?? 'sem página'}`}
                                        value={candidateMonthTargets[candidate.id] ?? ''}
                                        onChange={(event) =>
                                          setCandidateMonthTargets((targets) => ({
                                            ...targets,
                                            [candidate.id]: event.target.value,
                                          }))
                                        }
                                      >
                                        <option value="">Selecione o mês</option>
                                        {months
                                          .filter((month) => month.referenceMonth)
                                          .map((month) => (
                                            <option
                                              value={month.referenceMonth}
                                              key={month.referenceMonth}
                                            >
                                              {month.referenceMonth}
                                            </option>
                                          ))}
                                      </select>
                                    </label>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      disabled={
                                        !candidateMonthTargets[candidate.id] ||
                                        !candidate.normalizedValue
                                      }
                                      onClick={() => applyCandidateToReview(candidate)}
                                    >
                                      Usar valor
                                    </Button>
                                  </div>
                                ) : (
                                  'Conferir no documento'
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {canChangeReview && (
                <form
                  data-dirty={hasUnsavedReview ? 'true' : undefined}
                  onSubmit={(event) => {
                    event.preventDefault();
                    reviewMutation.mutate();
                  }}
                  style={{ display: 'grid', gap: '0.75rem' }}
                >
                  <h3>Revisão mensal</h3>
                  <p>
                    Informe somente os meses presentes na conta. Cada mês exige uma decisão
                    explícita.
                  </p>
                  {creatingUnit && canManageUnits && (
                    <NewUtilityUnitFields value={newUtilityUnit} onChange={setNewUtilityUnit} />
                  )}
                  {!canReadUnits && !creatingUnit && (
                    <p role="alert">
                      Seu perfil precisa de leitura de unidades consumidoras para comparar os meses
                      existentes.
                    </p>
                  )}
                  {months.map((month, index) => {
                    const existing = readingsQuery.data?.readings.find(
                      (reading) => reading.referenceMonth === month.referenceMonth,
                    );
                    return (
                      <fieldset
                        key={index}
                        style={{ display: 'grid', gap: '0.65rem', minWidth: 0 }}
                      >
                        <legend>Mês {index + 1}</legend>
                        <div
                          style={{
                            display: 'grid',
                            gap: '0.65rem',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 170px), 1fr))',
                          }}
                        >
                          <label>
                            Mês de referência
                            <input
                              type="month"
                              required
                              value={month.referenceMonth}
                              onChange={(event) =>
                                updateMonth(index, {
                                  referenceMonth: event.target.value,
                                  decision: '',
                                  evidence: {
                                    ...month.evidence,
                                    ...(event.target.value === month.referenceMonth
                                      ? {}
                                      : { referenceMonthCandidateId: undefined }),
                                  },
                                })
                              }
                            />
                          </label>
                          <label>
                            Decisão
                            <select
                              required
                              value={month.decision}
                              onChange={(event) =>
                                updateMonth(index, {
                                  decision: event.target.value as ReviewMonth['decision'],
                                })
                              }
                            >
                              <option value="">Escolha uma decisão</option>
                              {existing ? (
                                <>
                                  <option value="KEEP">Manter leitura atual</option>
                                  <option value="REPLACE">Substituir leitura atual</option>
                                </>
                              ) : (
                                <option value="INSERT">Inserir leitura</option>
                              )}
                            </select>
                          </label>
                          {month.decision !== 'KEEP' && (
                            <>
                              <label>
                                Consumo (kWh)
                                <input
                                  inputMode="decimal"
                                  required
                                  value={month.consumptionKwh}
                                  onChange={(event) =>
                                    updateMonth(index, { consumptionKwh: event.target.value })
                                  }
                                />
                              </label>
                              <label>
                                Energia injetada (kWh)
                                <input
                                  inputMode="decimal"
                                  value={month.injectedKwh}
                                  onChange={(event) =>
                                    updateMonth(index, { injectedKwh: event.target.value })
                                  }
                                />
                              </label>
                              <label>
                                Total faturado (R$)
                                <input
                                  inputMode="decimal"
                                  value={month.billedAmount}
                                  onChange={(event) =>
                                    updateMonth(index, { billedAmount: event.target.value })
                                  }
                                />
                              </label>
                            </>
                          )}
                          {month.decision === 'REPLACE' && (
                            <label>
                              Motivo da substituição
                              <input
                                required
                                maxLength={500}
                                value={month.reason}
                                onChange={(event) =>
                                  updateMonth(index, { reason: event.target.value })
                                }
                              />
                            </label>
                          )}
                        </div>
                        {existing && (
                          <p>
                            Leitura atual: {existing.consumptionKwh} kWh · versão {existing.version}
                          </p>
                        )}
                        {Object.values(month.evidence).some(Boolean) && (
                          <p>
                            Candidatos vinculados como evidência; confira os valores antes de
                            salvar.
                          </p>
                        )}
                        {months.length > 1 && (
                          <Button
                            type="button"
                            variant="subtle"
                            onClick={() => setMonths((rows) => rows.filter((_, i) => i !== index))}
                          >
                            Remover mês
                          </Button>
                        )}
                      </fieldset>
                    );
                  })}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={months.length >= 36}
                      onClick={() => setMonths((rows) => [...rows, newMonth()])}
                    >
                      Adicionar mês
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      loading={reviewMutation.isPending}
                      disabled={
                        (creatingUnit
                          ? !canManageUnits || !newUnitComplete
                          : !canReadUnits || readingsQuery.isPending || readingsQuery.isError) ||
                        reviewMutation.isPending
                      }
                    >
                      Salvar revisão
                    </Button>
                  </div>
                  <Feedback
                    error={reviewMutation.error}
                    success={
                      reviewMutation.isSuccess
                        ? 'Revisão salva. A leitura ainda não foi alterada.'
                        : undefined
                    }
                  />
                </form>
              )}

              {review?.id && review.digest && canConfirm && status === 'REVIEW_REQUIRED' && (
                <section className="panel" aria-labelledby="confirm-import-title">
                  <h3 id="confirm-import-title">Revisão pronta</h3>
                  <p>
                    Ao confirmar, as decisões selecionadas serão aplicadas em uma única transação.
                  </p>
                  <Button
                    variant="success"
                    loading={confirmMutation.isPending}
                    onClick={() => confirmMutation.mutate()}
                  >
                    Confirmar importação
                  </Button>
                  <Feedback error={confirmMutation.error} />
                </section>
              )}

              {receipt && (
                <div className="notice" role="status">
                  <strong>Importação confirmada</strong>
                  <p>Recibo registrado em {new Date(receipt.appliedAt).toLocaleString('pt-BR')}.</p>
                  <p>
                    {receipt.readingChanges.length} leitura(s) atualizada(s); comprovante{' '}
                    {receipt.reviewDigest.slice(0, 12)}.
                  </p>
                </div>
              )}

              {canCancel && ['QUEUED', 'REVIEW_REQUIRED', 'FAILED'].includes(status ?? '') && (
                <section className="panel">
                  <h3>Cancelar importação</h3>
                  <label>
                    Motivo
                    <textarea
                      minLength={3}
                      maxLength={500}
                      value={cancelReason}
                      onChange={(event) => setCancelReason(event.target.value)}
                    />
                  </label>
                  <Button
                    variant="danger"
                    loading={cancelMutation.isPending}
                    disabled={cancelReason.trim().length < 3}
                    onClick={() => cancelMutation.mutate()}
                  >
                    Cancelar importação
                  </Button>
                  <Feedback error={cancelMutation.error} />
                </section>
              )}
            </>
          ) : null}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.75rem' }}>
          <Button onClick={close}>Fechar</Button>
        </div>
      </Modal>
    </>
  );
}

function NewUtilityUnitFields({
  value,
  onChange,
}: {
  value: NewUtilityUnitDraft;
  onChange: (value: NewUtilityUnitDraft) => void;
}) {
  const field = (key: keyof NewUtilityUnitDraft, label: string, required = true) => (
    <label key={key}>
      {label}
      <input
        required={required}
        minLength={required ? 2 : undefined}
        maxLength={key === 'externalCode' ? 80 : 160}
        value={value[key]}
        onChange={(event) => onChange({ ...value, [key]: event.target.value })}
      />
    </label>
  );
  return (
    <fieldset style={{ display: 'grid', gap: '0.65rem', minWidth: 0 }}>
      <legend>Dados confirmados da nova unidade consumidora</legend>
      <p>
        Informe os dados da conta. A unidade e suas leituras só serão criadas ao confirmar esta
        revisão.
      </p>
      <div
        style={{
          display: 'grid',
          gap: '0.65rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 170px), 1fr))',
        }}
      >
        {field('distributorName', 'Distribuidora')}
        {field('externalCode', 'Código da unidade (opcional)', false)}
        {field('consumerClass', 'Classe de consumo')}
        {field('tariffMode', 'Modalidade tarifária')}
        {field('connectionType', 'Tipo de conexão')}
        {field('voltage', 'Tensão')}
      </div>
    </fieldset>
  );
}
