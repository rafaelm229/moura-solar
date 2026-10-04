import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { benchmark } from './benchmark.js';
import type { AdapterRunSet, CorpusManifest, ExperimentPolicy } from './types.js';

const document = (index: number): CorpusManifest['documents'][number] => ({
  sampleId: `sample_${String(index).padStart(3, '0')}`,
  distributor: index % 2 ? 'DIST_A' : 'DIST_B',
  format: index % 2 ? 'DIGITAL_PDF' : 'PHOTO',
  quality: 'GOOD',
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
    schemaVersion: '1',
    adapter: {
      name: 'fixture',
      model: 'normalized-fixture',
      version: '1',
      region: 'local',
      languageMode: 'pt-BR',
      executedAt: '2026-10-04T12:00:00Z',
    },
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
    assert.equal(report.totals.cost.amount, '0.400000');
    assert.equal(report.totals.costPerSucceededDocument, '0.010000');
    assert.equal(report.totals.latencyP95Ms, 100);
    assert.equal(report.totals.criticalErrors, 0);
    assert.equal(report.byField['utilityUnit.externalCode']?.exactRate, 1);
    assert.equal(report.byQuality['GOOD']?.coverage, 1);
    assert.equal(report.recommendation, 'CONTINUE');
  });

  it('counts missing, wrong units and manual fallback without hiding failed samples', () => {
    const report = benchmark(
      manifest,
      runSet((set) => {
        const first = set.runs[0]!;
        first.outcome = 'FALLBACK_MANUAL';
        first.candidates = [first.candidates[0]!, { ...first.candidates[1]!, unit: 'MWh' }];
        set.runs[1]!.candidates = [];
      }),
      policy,
    );
    assert.equal(report.totals.fallbackManual, 1);
    assert.equal(report.totals.fallbackManualRate, 0.025);
    assert.equal(report.totals.criticalErrors, 3);
    assert.equal(report.byField['bill.consumptionKwh']?.corrections, 1);
    assert.equal(report.byField['utilityUnit.externalCode']?.missing, 1);
    assert.equal(report.recommendation, 'STOP');
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
