import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import type { ExtractionPocAdapter, PollResult, ProviderUsage } from './adapter.js';
import { microsToMoney, moneyToMicros } from './money.js';
import { validateNormalizedCandidates } from './normalize.js';
import { assertPreflightReady, type PocExecutionPlan, type PreflightReport } from './preflight.js';
import type {
  AdapterRunSet,
  CorpusDocument,
  CorpusManifest,
  ExperimentPolicy,
  ExtractionRun,
} from './types.js';
import { validateManifestAndPolicy } from './validate.js';

export type DocumentLoader = (document: CorpusDocument) => Promise<Uint8Array>;

export interface ExperimentRunnerOptions {
  pollIntervalMs?: number;
  timeoutMs?: number;
  now?: () => number;
  sleep?: (milliseconds: number) => Promise<void>;
}

export interface AuthorizedExperiment {
  plan: PocExecutionPlan;
  preflight: PreflightReport;
}

const zeroUsage = (currency: string): ProviderUsage => ({
  chargedPages: 0,
  cost: { amount: '0', currency },
});

function safeCode(value: string, fallback: string): string {
  return /^[A-Z][A-Z0-9_]{2,63}$/.test(value) ? value : fallback;
}

function runResult(
  sampleId: string,
  outcome: ExtractionRun['outcome'],
  latencyMs: number,
  usage: ProviderUsage,
  candidates: ExtractionRun['candidates'],
  errorCode?: string,
): ExtractionRun {
  return {
    sampleId,
    outcome,
    latencyMs,
    chargedPages: usage.chargedPages,
    cost: usage.cost,
    candidates,
    ...(errorCode ? { errorCode } : {}),
  };
}

async function executeExperiment<TRaw>(
  manifest: CorpusManifest,
  policy: ExperimentPolicy,
  adapter: ExtractionPocAdapter<TRaw>,
  loadDocument: DocumentLoader,
  options: ExperimentRunnerOptions,
  overhead: bigint,
): Promise<AdapterRunSet> {
  validateManifestAndPolicy(manifest, policy);
  const pollIntervalMs = options.pollIntervalMs ?? 1_000;
  const timeoutMs = options.timeoutMs ?? 120_000;
  if (pollIntervalMs < 10 || pollIntervalMs > 30_000) throw new Error('Invalid poll interval');
  if (timeoutMs < pollIntervalMs || timeoutMs > 10 * 60_000) throw new Error('Invalid timeout');
  const now = options.now ?? Date.now;
  const sleep =
    options.sleep ??
    ((milliseconds) => new Promise<void>((done) => setTimeout(done, milliseconds)));
  const budget = moneyToMicros(policy.approvedBudget.amount);
  let spent = overhead;
  let halted = false;
  const runs: ExtractionRun[] = [];

  for (const document of manifest.documents) {
    if (halted) {
      runs.push(
        runResult(
          document.sampleId,
          'FALLBACK_MANUAL',
          0,
          zeroUsage(policy.approvedBudget.currency),
          [],
          'EXTERNAL_RESULT_UNKNOWN',
        ),
      );
      continue;
    }
    const estimatedUsage = adapter.estimateUsage({ pageCount: document.pageCount });
    if (estimatedUsage.cost.currency !== policy.approvedBudget.currency)
      throw new Error('ADAPTER_CURRENCY_MISMATCH');
    const estimatedCost = moneyToMicros(estimatedUsage.cost.amount);
    if (estimatedUsage.chargedPages < document.pageCount || estimatedCost < 0n)
      throw new Error('ADAPTER_ESTIMATE_INVALID');
    if (spent + estimatedCost > budget) {
      runs.push(
        runResult(
          document.sampleId,
          'FALLBACK_MANUAL',
          0,
          zeroUsage(policy.approvedBudget.currency),
          [],
          'BUDGET_LIMIT_REACHED',
        ),
      );
      continue;
    }
    const startedAt = now();
    let operationId: string | undefined;
    let submissionAttempted = false;
    try {
      const content = await loadDocument(document);
      if (!content.byteLength || content.byteLength > 20 * 1024 * 1024)
        throw new Error('DOCUMENT_SIZE_INVALID');
      const actualHash = createHash('sha256').update(content).digest('hex');
      if (actualHash !== document.sha256) throw new Error('DOCUMENT_HASH_MISMATCH');
      submissionAttempted = true;
      const receipt = await adapter.submit(
        {
          sampleId: document.sampleId,
          content,
          mimeType: document.mimeType,
          pageCount: document.pageCount,
        },
        `${manifest.corpusId}:${document.sampleId}:${adapter.identity.name}:${adapter.identity.version}`,
      );
      operationId = receipt.operationId;
      if (!operationId || !receipt.submittedAt) throw new Error('SUBMIT_RECEIPT_INVALID');
      let poll: PollResult<TRaw>;
      while (true) {
        if (now() - startedAt >= timeoutMs) throw new Error('EXTRACTION_TIMEOUT');
        poll = await adapter.poll(operationId);
        if (poll.state !== 'PENDING') break;
        await sleep(pollIntervalMs);
      }
      if (poll.usage.cost.currency !== policy.approvedBudget.currency)
        throw new Error('PROVIDER_CURRENCY_MISMATCH');
      spent += moneyToMicros(poll.usage.cost.amount);
      if (poll.state === 'FAILED') {
        runs.push(
          runResult(
            document.sampleId,
            'FAILED',
            now() - startedAt,
            poll.usage,
            [],
            safeCode(poll.errorCode, 'EXTRACTION_FAILED'),
          ),
        );
        continue;
      }
      try {
        runs.push(
          runResult(
            document.sampleId,
            'SUCCEEDED',
            now() - startedAt,
            poll.usage,
            validateNormalizedCandidates(document, adapter.normalize(poll.raw)),
          ),
        );
      } catch {
        runs.push(
          runResult(
            document.sampleId,
            'FAILED',
            now() - startedAt,
            poll.usage,
            [],
            'NORMALIZATION_FAILED',
          ),
        );
      }
    } catch (error) {
      const code =
        error instanceof Error
          ? safeCode(error.message, 'EXTRACTOR_UNAVAILABLE')
          : 'EXTRACTOR_UNAVAILABLE';
      if (submissionAttempted) {
        if (operationId)
          try {
            await adapter.cancel(operationId);
          } catch {}
        halted = true;
        runs.push(
          runResult(
            document.sampleId,
            'UNKNOWN',
            now() - startedAt,
            zeroUsage(policy.approvedBudget.currency),
            [],
            code,
          ),
        );
      } else {
        runs.push(
          runResult(
            document.sampleId,
            'FAILED',
            now() - startedAt,
            zeroUsage(policy.approvedBudget.currency),
            [],
            code,
          ),
        );
      }
    }
  }
  return {
    schemaVersion: '2',
    adapter: { ...adapter.identity, executedAt: new Date(now()).toISOString() },
    overheadCost: {
      amount: microsToMoney(overhead),
      currency: policy.approvedBudget.currency,
    },
    runs,
  };
}

export async function runAuthorizedExperiment<TRaw>(
  manifest: CorpusManifest,
  policy: ExperimentPolicy,
  authorization: AuthorizedExperiment,
  adapter: ExtractionPocAdapter<TRaw>,
  loadDocument: DocumentLoader,
  options: ExperimentRunnerOptions = {},
): Promise<AdapterRunSet> {
  assertPreflightReady(
    manifest,
    policy,
    authorization.plan,
    authorization.preflight,
    adapter.identity,
  );
  const perPage = moneyToMicros(authorization.plan.pricing.estimatedPerPage);
  for (const document of manifest.documents) {
    const estimate = adapter.estimateUsage({ pageCount: document.pageCount });
    if (
      estimate.cost.currency !== authorization.plan.pricing.currency ||
      moneyToMicros(estimate.cost.amount) !== perPage * BigInt(document.pageCount)
    )
      throw new Error('ADAPTER_ESTIMATE_DIFFERS_FROM_PLAN');
  }
  return executeExperiment(
    manifest,
    policy,
    adapter,
    loadDocument,
    options,
    moneyToMicros(authorization.plan.pricing.estimatedFixed),
  );
}

export function createLocalDocumentLoader(root: string): DocumentLoader {
  const safeRoot = resolve(root);
  return async (document) => {
    const extension =
      document.mimeType === 'application/pdf'
        ? '.pdf'
        : document.mimeType === 'image/png'
          ? '.png'
          : '.jpg';
    const path = resolve(safeRoot, `${document.sampleId}${extension}`);
    if (dirname(path) !== safeRoot || extname(path) !== extension)
      throw new Error('DOCUMENT_PATH_INVALID');
    return readFile(path);
  };
}
