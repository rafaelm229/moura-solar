import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';
import { preflightExperiment, type PocExecutionPlan } from './preflight.js';
import type { CorpusManifest, ExperimentPolicy } from './types.js';

const contents = new Map<string, Uint8Array>();
const documents: CorpusManifest['documents'] = Array.from({ length: 40 }, (_, index) => {
  const sampleId = `preflight_sample_${String(index + 1).padStart(3, '0')}`;
  const content = Buffer.from(`synthetic fixture ${index + 1}`);
  contents.set(sampleId, content);
  return {
    sampleId,
    distributor: index < 20 ? 'DIST_A' : 'DIST_B',
    format: index % 2 === 0 ? 'DIGITAL_PDF' : 'PHOTO',
    quality: index % 3 === 0 ? 'POOR' : 'GOOD',
    mimeType: index % 2 === 0 ? 'application/pdf' : 'image/jpeg',
    sha256: createHash('sha256').update(content).digest('hex'),
    pageCount: index % 2 === 0 ? 2 : 1,
    labels: [],
  };
});

const manifest: CorpusManifest = {
  schemaVersion: '1',
  corpusId: 'preflight_fixture_001',
  purpose: 'ENERGY_BILL_EXTRACTION_POC',
  authorization: {
    approved: true,
    approvedAt: '2026-10-04T12:00:00Z',
    approvedByRole: 'privacy-reviewer',
    privacyReviewed: true,
  },
  blindEvaluation: true,
  documents,
};

const policy: ExperimentPolicy = {
  schemaVersion: '1',
  approvedBudget: { amount: '2.00', currency: 'USD' },
  goals: [{ field: 'bill.consumptionKwh', minExactRate: 0.9, minCoverage: 0.95 }],
  criticalFields: ['utilityUnit.externalCode', 'bill.referenceMonth'],
};

const plan: PocExecutionPlan = {
  schemaVersion: '1',
  adapter: {
    name: 'fixture-adapter',
    model: 'fixture-model',
    version: '2026-10-04',
    region: 'brazilsouth',
    languageMode: 'pt-BR',
  },
  pricing: {
    currency: 'USD',
    estimatedPerPage: '0.02',
    estimatedFixed: '0.10',
    sku: 'approved-fixture-sku',
    quotedAt: '2026-10-04T12:00:00Z',
  },
  providerPrivacyReview: {
    approved: true,
    reviewedAt: '2026-10-04T12:00:00Z',
    approvedByRole: 'privacy-reviewer',
    dataRegion: 'Brazil South',
    deletionProcedure: 'Delete each result after collecting normalized candidates.',
  },
};

const load = async (document: CorpusManifest['documents'][number]) =>
  contents.get(document.sampleId)!;

describe('PoC experiment preflight', () => {
  it('verifies every byte and produces a deterministic aggregate readiness report', async () => {
    const first = await preflightExperiment(manifest, policy, plan, load);
    const second = await preflightExperiment(manifest, policy, plan, load);
    assert.deepEqual(first, second);
    assert.equal(first.totals.documents, 40);
    assert.equal(first.totals.pages, 60);
    assert.deepEqual(first.totals.distributors, { DIST_A: 20, DIST_B: 20 });
    assert.equal(first.totals.estimatedCost.amount, '1.300000');
    assert.equal(first.decision, 'READY');
    assert.match(first.manifestDigest, /^[a-f0-9]{64}$/);
    assert.match(first.policyDigest, /^[a-f0-9]{64}$/);
    assert.match(first.planDigest, /^[a-f0-9]{64}$/);
  });

  it('blocks a corpus that would only repeat the same bytes', async () => {
    const duplicated = {
      ...manifest,
      documents: manifest.documents.map((document) => ({
        ...document,
        sha256: manifest.documents[0]!.sha256,
      })),
    };
    const repeated = contents.get(manifest.documents[0]!.sampleId)!;
    const report = await preflightExperiment(duplicated, policy, plan, async () => repeated);
    assert.equal(report.decision, 'BLOCKED');
    assert.equal(report.gates.find((gate) => gate.name === 'uniqueDocumentHashes')?.passed, false);
  });

  it('blocks execution whose complete estimate exceeds the approved budget', async () => {
    const report = await preflightExperiment(
      manifest,
      { ...policy, approvedBudget: { amount: '1.29', currency: 'USD' } },
      plan,
      load,
    );
    assert.equal(report.decision, 'BLOCKED');
    assert.equal(report.gates.find((gate) => gate.name === 'approvedBudget')?.passed, false);
  });

  it('rejects changed bytes and an unapproved provider privacy review', async () => {
    await assert.rejects(
      () => preflightExperiment(manifest, policy, plan, async () => Buffer.from('changed')),
      /hash mismatch/,
    );
    await assert.rejects(
      () =>
        preflightExperiment(
          manifest,
          policy,
          {
            ...plan,
            providerPrivacyReview: { ...plan.providerPrivacyReview, approved: false },
          },
          load,
        ),
      /privacy review is not approved/,
    );
  });
});
