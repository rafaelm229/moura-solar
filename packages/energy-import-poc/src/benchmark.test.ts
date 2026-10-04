import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';
import { benchmark } from './benchmark.js';
import type { AdapterRunSet, CorpusManifest, ExperimentPolicy } from './types.js';

const document = (index: number): CorpusManifest['documents'][number] => ({
  sampleId: `sample_${String(index).padStart(3, '0')}`,
  distributor: index % 2 ? 'DIST_A' : 'DIST_B',
  format: index % 2 ? 'DIGITAL_PDF' : 'PHOTO',
  quality: 'GOOD',
  mimeType: 'application/pdf',
  sha256: createHash('sha256').update(`sample-${index}`).digest('hex'),
  pageCount: 1,
  labels: [
    {
      key: 'utilityUnit.externalCode',
      field: 'utilityUnit.externalCode',
      value: `000${index}`,
      page: 1,
    },
    {
      key: 'bill.consumptionKwh',
      field: 'bill.consumptionKwh',
      value: '421.50',
      unit: 'kWh',
      page: 1,
    },
  ],
});

const manifest: CorpusManifest = {
  schemaVersion: '1',
  corpusId: 'blind_pilot_001',
  purpose: 'ENERGY_BILL_EXTRACTION_POC',
  authorization: {
    approved: true,
    approvedAt: '2026-10-04T12:00:00Z',
    approvedByRole: 'privacy-reviewer',
    privacyReviewed: true,
  },
  blindEvaluation: true,
  documents: Array.from({ length: 40 }, (_, index) => document(index + 1)),
};

const runSet = (mutate?: (set: AdapterRunSet) => void): AdapterRunSet => {
  const set: AdapterRunSet = {
    schemaVersion: '2',
    adapter: {
      name: 'fixture',
      model: 'normalized-fixture',
      version: '1',
      region: 'local',
      languageMode: 'pt-BR',
      executedAt: '2026-10-04T12:00:00Z',
    },
    overheadCost: { amount: '0.100000', currency: 'USD' },
    runs: manifest.documents.map((item) => ({
      sampleId: item.sampleId,
      outcome: 'SUCCEEDED',
      latencyMs: 100,
      chargedPages: 1,
      cost: { amount: '0.010000', currency: 'USD' },
      candidates: item.labels.map((label) => ({ ...label })),
    })),
  };
  mutate?.(set);
  return set;
};

const policy: ExperimentPolicy = {
  schemaVersion: '1',
  approvedBudget: { amount: '1.00', currency: 'USD' },
  criticalFields: ['utilityUnit.externalCode', 'bill.consumptionKwh'],
  goals: [
    { field: 'utilityUnit.externalCode', minExactRate: 1, minCoverage: 1 },
    { field: 'bill.consumptionKwh', minExactRate: 0.95, minCoverage: 1 },
  ],
};

describe('energy import PoC benchmark', () => {
  it('reports reproducible metrics and recommends continuation only when all declared gates pass', () => {
    const report = benchmark(manifest, runSet(), policy);
    assert.equal(report.totals.documents, 40);
    assert.equal(report.totals.cost.amount, '0.500000');
    assert.equal(report.totals.costPerSucceededDocument, '0.012500');
    assert.equal(report.totals.latencyP95Ms, 100);
    assert.equal(report.totals.criticalErrors, 0);
    assert.equal(report.totals.unknown, 0);
    assert.equal(report.byField['utilityUnit.externalCode']?.exactRate, 1);
    assert.equal(report.byQuality['GOOD']?.coverage, 1);
    assert.equal(report.recommendation, 'CONTINUE');
  });

  it('stops when an accepted external operation has an unknown result', () => {
    const report = benchmark(
      manifest,
      runSet((set) => {
        set.runs[0]!.outcome = 'UNKNOWN';
        set.runs[0]!.errorCode = 'EXTRACTION_TIMEOUT';
        set.runs[0]!.candidates = [];
      }),
      policy,
    );
    assert.equal(report.totals.unknown, 1);
    assert.equal(report.totals.unknownRate, 0.025);
    assert.equal(report.gates.find((gate) => gate.name === 'unknownResults')?.passed, false);
    assert.equal(report.recommendation, 'STOP');
  });

  it('counts missing, wrong units and manual fallback without hiding failed samples', () => {
    const report = benchmark(
      manifest,
      runSet((set) => {
        const first = set.runs[0]!;
        first.outcome = 'FALLBACK_MANUAL';
        first.errorCode = 'MANUAL_FALLBACK';
        first.candidates = [];
        const second = set.runs[1]!;
        second.candidates = [second.candidates[0]!, { ...second.candidates[1]!, unit: 'MWh' }];
      }),
      policy,
    );
    assert.equal(report.totals.fallbackManual, 1);
    assert.equal(report.totals.fallbackManualRate, 0.025);
    assert.equal(report.totals.criticalErrors, 3);
    assert.equal(report.byField['bill.consumptionKwh']?.corrections, 1);
    assert.equal(report.byField['bill.consumptionKwh']?.correctionRate, 1 / 40);
    assert.equal(report.byField['utilityUnit.externalCode']?.missing, 1);
    assert.equal(report.recommendation, 'STOP');
  });

  it('reports coverage of expected historical months per document', () => {
    const historicalLabels = [
      {
        key: 'history_month_2026_06',
        field: 'history.referenceMonth' as const,
        value: '2026-06',
        page: 1,
      },
      {
        key: 'history_month_2026_07',
        field: 'history.referenceMonth' as const,
        value: '2026-07',
        page: 1,
      },
    ];
    const historicalManifest: CorpusManifest = {
      ...manifest,
      documents: manifest.documents.map((entry, index) =>
        index === 0 ? { ...entry, labels: [...entry.labels, ...historicalLabels] } : entry,
      ),
    };
    const historicalRuns = runSet();
    historicalRuns.runs[0]!.candidates.push(
      { ...historicalLabels[0]! },
      {
        key: 'history_month_unexpected',
        field: 'history.referenceMonth',
        value: '2026-08',
        page: 1,
      },
    );
    const report = benchmark(historicalManifest, historicalRuns, policy);
    assert.equal(report.totals.historyMonthsExpected, 2);
    assert.equal(report.totals.historyMonthsDetected, 1);
    assert.equal(report.totals.historyMonthCoverage, 0.5);
  });

  it('refuses an unapproved corpus before producing metrics', () => {
    assert.throws(
      () =>
        benchmark(
          {
            ...manifest,
            authorization: { ...manifest.authorization, approved: false },
          },
          runSet(),
          policy,
        ),
      /authorization is not approved/,
    );
  });

  it('does not recommend a provider from fewer than 20 documents per distributor', () => {
    const smallManifest = { ...manifest, documents: manifest.documents.slice(0, 20) };
    const smallRuns = { ...runSet(), runs: runSet().runs.slice(0, 20) };
    assert.equal(benchmark(smallManifest, smallRuns, policy).recommendation, 'INCONCLUSIVE');
  });

  it('rejects incomplete and noncanonical experiment data', () => {
    assert.throws(
      () => benchmark(manifest, { ...runSet(), runs: runSet().runs.slice(1) }, policy),
      /Every corpus document/,
    );
    assert.throws(
      () =>
        benchmark(
          manifest,
          runSet((set) => {
            set.runs[0]!.cost.currency = 'BRL';
          }),
          policy,
        ),
      /Mixed currency/,
    );
  });
});
