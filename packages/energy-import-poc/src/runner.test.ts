import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';
import type { ExtractionPocAdapter, PollResult } from './adapter.js';
import { runExperiment } from './runner.js';
import type { Candidate, CorpusManifest, ExperimentPolicy } from './types.js';

const content = Buffer.from('synthetic energy bill fixture');
const hash = createHash('sha256').update(content).digest('hex');
const manifest: CorpusManifest = {
  schemaVersion: '1',
  corpusId: 'runner_fixture_001',
  purpose: 'ENERGY_BILL_EXTRACTION_POC',
  authorization: {
    approved: true,
    approvedAt: '2026-10-04T12:00:00Z',
    approvedByRole: 'privacy-reviewer',
    privacyReviewed: true,
  },
  blindEvaluation: true,
  documents: [1, 2].map((index) => ({
    sampleId: `runner_sample_${index}`,
    distributor: 'DIST_A',
    format: 'DIGITAL_PDF',
    quality: 'GOOD',
    mimeType: 'application/pdf',
    sha256: hash,
    pageCount: 1,
    labels: [
      {
        key: 'bill.consumptionKwh',
        field: 'bill.consumptionKwh',
        value: '421.50',
        unit: 'kWh',
        page: 1,
      },
    ],
  })),
};
const policy: ExperimentPolicy = {
  schemaVersion: '1',
  approvedBudget: { amount: '0.10', currency: 'USD' },
  goals: [{ field: 'bill.consumptionKwh', minExactRate: 1, minCoverage: 1 }],
  criticalFields: ['bill.consumptionKwh'],
};
const candidate: Candidate = {
  key: 'bill.consumptionKwh',
  field: 'bill.consumptionKwh',
  value: '421.50',
  unit: 'kWh',
  page: 1,
};

function adapter(poll: () => PollResult<Candidate[]>): ExtractionPocAdapter<Candidate[]> & {
  submitted: string[];
  canceled: string[];
} {
  const submitted: string[] = [];
  const canceled: string[] = [];
  return {
    identity: {
      name: 'fixture',
      model: 'fixture-model',
      version: '1',
      region: 'local',
      languageMode: 'pt-BR',
    },
    submitted,
    canceled,
    estimateUsage(input) {
      return {
        chargedPages: input.pageCount,
        cost: { amount: '0.10', currency: 'USD' },
      };
    },
    async submit(input, correlationId) {
      submitted.push(`${input.sampleId}:${correlationId}`);
      return { operationId: `operation-${input.sampleId}`, submittedAt: '2026-10-04T12:00:00Z' };
    },
    async poll() {
      return poll();
    },
    async cancel(operationId) {
      canceled.push(operationId);
    },
    normalize(raw) {
      return raw;
    },
  };
}

describe('PoC experiment runner', () => {
  it('polls an accepted operation, records actual usage and stops before exceeding the reached budget', async () => {
    let clock = 0;
    let polls = 0;
    const subject = adapter(() => {
      polls += 1;
      return polls === 1
        ? { state: 'PENDING' }
        : {
            state: 'SUCCEEDED',
            raw: [candidate],
            usage: { chargedPages: 1, cost: { amount: '0.10', currency: 'USD' } },
          };
    });
    const result = await runExperiment(manifest, policy, subject, async () => content, {
      pollIntervalMs: 10,
      timeoutMs: 100,
      now: () => clock,
      sleep: async (milliseconds) => {
        clock += milliseconds;
      },
    });
    assert.equal(result.runs[0]?.outcome, 'SUCCEEDED');
    assert.equal(result.runs[0]?.latencyMs, 10);
    assert.equal(result.runs[1]?.outcome, 'FALLBACK_MANUAL');
    assert.equal(result.runs[1]?.errorCode, 'BUDGET_LIMIT_REACHED');
    assert.equal(subject.submitted.length, 1);
  });

  it('does not submit a document whose estimate would exceed the remaining budget', async () => {
    const subject = adapter(() => ({ state: 'PENDING' }));
    subject.estimateUsage = (input) => ({
      chargedPages: input.pageCount,
      cost: { amount: '0.11', currency: 'USD' },
    });
    const result = await runExperiment(manifest, policy, subject, async () => content, {
      pollIntervalMs: 10,
      timeoutMs: 20,
    });
    assert.equal(result.runs[0]?.outcome, 'FALLBACK_MANUAL');
    assert.equal(result.runs[0]?.errorCode, 'BUDGET_LIMIT_REACHED');
    assert.equal(subject.submitted.length, 0);
  });

  it('marks a timed-out accepted operation unknown, cancels best effort and halts new submissions', async () => {
    let clock = 0;
    const subject = adapter(() => ({ state: 'PENDING' }));
    const result = await runExperiment(manifest, policy, subject, async () => content, {
      pollIntervalMs: 10,
      timeoutMs: 20,
      now: () => clock,
      sleep: async (milliseconds) => {
        clock += milliseconds;
      },
    });
    assert.equal(result.runs[0]?.outcome, 'UNKNOWN');
    assert.equal(result.runs[0]?.errorCode, 'EXTRACTION_TIMEOUT');
    assert.deepEqual(subject.canceled, ['operation-runner_sample_1']);
    assert.equal(result.runs[1]?.outcome, 'FALLBACK_MANUAL');
    assert.equal(result.runs[1]?.errorCode, 'EXTERNAL_RESULT_UNKNOWN');
    assert.equal(subject.submitted.length, 1);
  });

  it('rejects changed bytes before submission', async () => {
    const subject = adapter(() => ({ state: 'PENDING' }));
    const result = await runExperiment(
      manifest,
      policy,
      subject,
      async () => Buffer.from('changed'),
      {
        pollIntervalMs: 10,
        timeoutMs: 20,
      },
    );
    assert.equal(result.runs[0]?.outcome, 'FAILED');
    assert.equal(result.runs[0]?.errorCode, 'DOCUMENT_HASH_MISMATCH');
    assert.equal(subject.submitted.length, 0);
  });

  it('treats a submit error as ambiguous and does not automatically submit another document', async () => {
    const subject = adapter(() => ({ state: 'PENDING' }));
    subject.submit = async () => {
      throw new Error('NETWORK_TIMEOUT');
    };
    const result = await runExperiment(manifest, policy, subject, async () => content, {
      pollIntervalMs: 10,
      timeoutMs: 20,
    });
    assert.equal(result.runs[0]?.outcome, 'UNKNOWN');
    assert.equal(result.runs[0]?.errorCode, 'NETWORK_TIMEOUT');
    assert.equal(result.runs[1]?.outcome, 'FALLBACK_MANUAL');
    assert.equal(result.runs[1]?.errorCode, 'EXTERNAL_RESULT_UNKNOWN');
  });
});
