import { createHash } from 'node:crypto';
import type { DocumentLoader } from './runner.js';
import { microsToMoney, moneyToMicros } from './money.js';
import type { CorpusManifest, ExperimentPolicy } from './types.js';
import { validateManifestAndPolicy } from './validate.js';

export interface PocExecutionPlan {
  schemaVersion: '1';
  adapter: {
    name: string;
    model: string;
    version: string;
    region: string;
    languageMode: string;
  };
  pricing: {
    currency: string;
    estimatedPerPage: string;
    estimatedFixed: string;
    sku: string;
    quotedAt: string;
  };
  providerPrivacyReview: {
    approved: boolean;
    reviewedAt: string;
    approvedByRole: string;
    dataRegion: string;
    deletionProcedure: string;
  };
}

export interface PreflightReport {
  schemaVersion: '1';
  corpusId: string;
  manifestDigest: string;
  policyDigest: string;
  planDigest: string;
  adapter: PocExecutionPlan['adapter'];
  totals: {
    documents: number;
    pages: number;
    bytes: number;
    distributors: Record<string, number>;
    formats: Record<string, number>;
    qualities: Record<string, number>;
    estimatedCost: { amount: string; currency: string };
    approvedBudget: { amount: string; currency: string };
  };
  gates: Array<{ name: string; passed: boolean; actual: string; target: string }>;
  decision: 'READY' | 'BLOCKED';
}

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0,
    );
    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function digest(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}

export function assertPreflightReady(
  manifest: CorpusManifest,
  policy: ExperimentPolicy,
  plan: PocExecutionPlan,
  report: PreflightReport,
  adapter: PocExecutionPlan['adapter'],
): void {
  validateManifestAndPolicy(manifest, policy);
  validatePlan(plan, policy);
  invariant(report.decision === 'READY', 'Preflight decision is not READY');
  invariant(
    report.gates.every((gate) => gate.passed),
    'Preflight contains a failed gate',
  );
  invariant(report.corpusId === manifest.corpusId, 'Preflight corpus differs from manifest');
  invariant(report.manifestDigest === digest(manifest), 'Manifest changed after preflight');
  invariant(report.policyDigest === digest(policy), 'Policy changed after preflight');
  invariant(report.planDigest === digest(plan), 'Execution plan changed after preflight');
  const pages = manifest.documents.reduce((total, document) => total + document.pageCount, 0);
  const estimatedCost =
    moneyToMicros(plan.pricing.estimatedFixed) +
    moneyToMicros(plan.pricing.estimatedPerPage) * BigInt(pages);
  const minimumDistributorCount = Math.min(
    ...Object.values(
      manifest.documents.reduce<Record<string, number>>((counts, document) => {
        counts[document.distributor] = (counts[document.distributor] ?? 0) + 1;
        return counts;
      }, {}),
    ),
  );
  invariant(
    new Set(manifest.documents.map((document) => document.sha256)).size ===
      manifest.documents.length,
    'Corpus contains repeated document hashes',
  );
  invariant(minimumDistributorCount >= 20, 'Corpus has fewer than 20 documents per distributor');
  invariant(
    estimatedCost <= moneyToMicros(policy.approvedBudget.amount),
    'Execution estimate exceeds approved budget',
  );
  invariant(
    report.totals.documents === manifest.documents.length && report.totals.pages === pages,
    'Preflight totals differ from manifest',
  );
  invariant(
    report.totals.estimatedCost.amount === microsToMoney(estimatedCost) &&
      report.totals.estimatedCost.currency === plan.pricing.currency,
    'Preflight estimate differs from plan',
  );
  invariant(
    report.totals.approvedBudget.amount === policy.approvedBudget.amount &&
      report.totals.approvedBudget.currency === policy.approvedBudget.currency,
    'Preflight budget differs from policy',
  );
  for (const key of ['name', 'model', 'version', 'region', 'languageMode'] as const) {
    invariant(
      report.adapter[key] === plan.adapter[key],
      `Preflight adapter ${key} differs from plan`,
    );
    invariant(adapter[key] === plan.adapter[key], `Runtime adapter ${key} differs from plan`);
  }
}

function increment(target: Record<string, number>, key: string): void {
  target[key] = (target[key] ?? 0) + 1;
}

function validatePlan(plan: PocExecutionPlan, policy: ExperimentPolicy): void {
  invariant(plan && typeof plan === 'object', 'Execution plan is required');
  invariant(plan.schemaVersion === '1', 'Unsupported execution plan schemaVersion');
  invariant(plan.adapter && typeof plan.adapter === 'object', 'Execution plan adapter is required');
  invariant(plan.pricing && typeof plan.pricing === 'object', 'Execution plan pricing is required');
  invariant(
    plan.providerPrivacyReview && typeof plan.providerPrivacyReview === 'object',
    'Provider privacy review is required',
  );
  for (const [name, value] of [
    ['name', plan.adapter.name],
    ['model', plan.adapter.model],
    ['version', plan.adapter.version],
    ['region', plan.adapter.region],
    ['languageMode', plan.adapter.languageMode],
  ] as const)
    invariant(nonEmpty(value), `Execution plan adapter ${name} is required`);
  invariant(
    typeof plan.pricing.currency === 'string' && /^[A-Z]{3}$/.test(plan.pricing.currency),
    'Execution plan currency is invalid',
  );
  invariant(
    plan.pricing.currency === policy.approvedBudget.currency,
    'Execution plan currency differs from approved budget',
  );
  moneyToMicros(plan.pricing.estimatedPerPage);
  moneyToMicros(plan.pricing.estimatedFixed);
  invariant(nonEmpty(plan.pricing.sku), 'Execution plan SKU is required');
  invariant(
    typeof plan.pricing.quotedAt === 'string' && !Number.isNaN(Date.parse(plan.pricing.quotedAt)),
    'Pricing quote date is invalid',
  );
  invariant(plan.providerPrivacyReview.approved, 'Provider privacy review is not approved');
  invariant(
    typeof plan.providerPrivacyReview.reviewedAt === 'string' &&
      !Number.isNaN(Date.parse(plan.providerPrivacyReview.reviewedAt)),
    'Provider privacy review date is invalid',
  );
  invariant(
    nonEmpty(plan.providerPrivacyReview.approvedByRole),
    'Provider privacy reviewer role is required',
  );
  invariant(nonEmpty(plan.providerPrivacyReview.dataRegion), 'Provider data region is required');
  invariant(
    nonEmpty(plan.providerPrivacyReview.deletionProcedure),
    'Provider deletion procedure is required',
  );
}

export async function preflightExperiment(
  manifest: CorpusManifest,
  policy: ExperimentPolicy,
  plan: PocExecutionPlan,
  loadDocument: DocumentLoader,
): Promise<PreflightReport> {
  validateManifestAndPolicy(manifest, policy);
  validatePlan(plan, policy);
  const distributors: Record<string, number> = {};
  const formats: Record<string, number> = {};
  const qualities: Record<string, number> = {};
  const hashes = new Set<string>();
  let bytes = 0;
  let pages = 0;

  for (const document of manifest.documents) {
    const content = await loadDocument(document);
    invariant(content.byteLength > 0, `Document is empty: ${document.sampleId}`);
    invariant(
      content.byteLength <= 20 * 1024 * 1024,
      `Document exceeds 20 MiB: ${document.sampleId}`,
    );
    const actualHash = createHash('sha256').update(content).digest('hex');
    invariant(actualHash === document.sha256, `Document hash mismatch: ${document.sampleId}`);
    bytes += content.byteLength;
    pages += document.pageCount;
    hashes.add(document.sha256);
    increment(distributors, document.distributor);
    increment(formats, document.format);
    increment(qualities, document.quality);
  }

  const estimatedCost =
    moneyToMicros(plan.pricing.estimatedFixed) +
    moneyToMicros(plan.pricing.estimatedPerPage) * BigInt(pages);
  const budget = moneyToMicros(policy.approvedBudget.amount);
  const minimumDistributorCount = Math.min(...Object.values(distributors));
  const gates = [
    {
      name: 'uniqueDocumentHashes',
      passed: hashes.size === manifest.documents.length,
      actual: String(hashes.size),
      target: String(manifest.documents.length),
    },
    {
      name: 'minimumDocumentsPerDistributor',
      passed: minimumDistributorCount >= 20,
      actual: String(minimumDistributorCount),
      target: '20',
    },
    {
      name: 'approvedBudget',
      passed: estimatedCost <= budget,
      actual: microsToMoney(estimatedCost),
      target: policy.approvedBudget.amount,
    },
  ];

  return {
    schemaVersion: '1',
    corpusId: manifest.corpusId,
    manifestDigest: digest(manifest),
    policyDigest: digest(policy),
    planDigest: digest(plan),
    adapter: plan.adapter,
    totals: {
      documents: manifest.documents.length,
      pages,
      bytes,
      distributors,
      formats,
      qualities,
      estimatedCost: { amount: microsToMoney(estimatedCost), currency: plan.pricing.currency },
      approvedBudget: { ...policy.approvedBudget },
    },
    gates,
    decision: gates.every((gate) => gate.passed) ? 'READY' : 'BLOCKED',
  };
}
