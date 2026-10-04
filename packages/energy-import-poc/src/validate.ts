import {
  fieldNames,
  type AdapterRunSet,
  type CorpusManifest,
  type ExperimentPolicy,
} from './types.js';

const fields = new Set<string>(fieldNames);
const id = /^[a-z0-9][a-z0-9_-]{2,79}$/;
const month = /^\d{4}-(0[1-9]|1[0-2])$/;
const decimal = /^(0|[1-9]\d*)(\.\d{1,6})?$/;
const sha256 = /^[a-f0-9]{64}$/;

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export function validateInputs(
  manifest: CorpusManifest,
  runSet: AdapterRunSet,
  policy: ExperimentPolicy,
): void {
  validateManifestAndPolicy(manifest, policy);
  invariant(runSet.schemaVersion === '2', 'Unsupported adapter result schemaVersion');
  invariant(runSet.adapter.name.length > 0, 'Adapter name is required');
  invariant(runSet.adapter.model.length > 0, 'Adapter model is required');
  invariant(runSet.adapter.version.length > 0, 'Adapter version is required');
  invariant(runSet.adapter.region.length > 0, 'Adapter region is required');
  invariant(
    !Number.isNaN(Date.parse(runSet.adapter.executedAt)),
    'Adapter execution date is invalid',
  );
  invariant(decimal.test(runSet.overheadCost.amount), 'Invalid adapter overhead cost');
  invariant(
    runSet.overheadCost.currency === policy.approvedBudget.currency,
    'Adapter overhead currency differs from approved budget',
  );

  const sampleIds = new Set(manifest.documents.map((document) => document.sampleId));
  const runIds = new Set<string>();
  for (const run of runSet.runs) {
    const document = manifest.documents.find((entry) => entry.sampleId === run.sampleId);
    invariant(document, `Run references unknown sample: ${run.sampleId}`);
    invariant(!runIds.has(run.sampleId), `Duplicate run: ${run.sampleId}`);
    invariant(run.latencyMs >= 0, `Negative latency: ${run.sampleId}`);
    invariant(run.chargedPages >= 0, `Negative charged pages: ${run.sampleId}`);
    invariant(decimal.test(run.cost.amount), `Invalid cost: ${run.sampleId}`);
    invariant(
      run.cost.currency === policy.approvedBudget.currency,
      `Mixed currency: ${run.sampleId}`,
    );
    invariant(
      run.outcome === 'SUCCEEDED' || run.candidates.length === 0,
      `Non-successful run contains candidates: ${run.sampleId}`,
    );
    invariant(
      run.outcome === 'SUCCEEDED' || Boolean(run.errorCode),
      `Non-successful run requires an error code: ${run.sampleId}`,
    );
    const keys = new Set<string>();
    for (const candidate of run.candidates) {
      invariant(fields.has(candidate.field), `Unknown candidate field: ${candidate.field}`);
      invariant(
        candidate.key.length > 0 && !keys.has(candidate.key),
        `Duplicate candidate key: ${candidate.key}`,
      );
      invariant(
        candidate.page > 0 && candidate.page <= document.pageCount,
        `Invalid candidate page: ${candidate.key}`,
      );
      if (candidate.field.endsWith('referenceMonth'))
        invariant(month.test(candidate.value), `Invalid candidate month: ${candidate.key}`);
      if (candidate.providerConfidence)
        invariant(
          candidate.providerConfidence.scale.length > 0 &&
            Number.isFinite(candidate.providerConfidence.value),
          `Invalid provider confidence: ${candidate.key}`,
        );
      keys.add(candidate.key);
    }
    runIds.add(run.sampleId);
  }
  invariant(runIds.size === sampleIds.size, 'Every corpus document must have exactly one run');
}

export function validateManifestAndPolicy(
  manifest: CorpusManifest,
  policy: ExperimentPolicy,
): void {
  invariant(manifest.schemaVersion === '1', 'Unsupported corpus schemaVersion');
  invariant(id.test(manifest.corpusId), 'Corpus ID is invalid');
  invariant(manifest.purpose === 'ENERGY_BILL_EXTRACTION_POC', 'Corpus purpose is invalid');
  invariant(manifest.authorization.approved, 'Corpus authorization is not approved');
  invariant(manifest.authorization.privacyReviewed, 'Corpus privacy review is missing');
  invariant(
    typeof manifest.authorization.approvedByRole === 'string' &&
      manifest.authorization.approvedByRole.trim().length > 0,
    'Corpus approver role is required',
  );
  invariant(
    !Number.isNaN(Date.parse(manifest.authorization.approvedAt)),
    'Corpus approval date is invalid',
  );
  invariant(manifest.blindEvaluation, 'Evaluation corpus must be blind');
  invariant(manifest.documents.length > 0, 'Corpus is empty');
  invariant(policy.schemaVersion === '1', 'Unsupported policy schemaVersion');
  invariant(decimal.test(policy.approvedBudget.amount), 'Approved budget must be a decimal string');
  invariant(
    /^[A-Z]{3}$/.test(policy.approvedBudget.currency),
    'Approved budget currency must be ISO-like',
  );
  invariant(policy.goals.length > 0, 'At least one quality goal is required');
  invariant(policy.criticalFields.length > 0, 'At least one critical field is required');

  const sampleIds = new Set<string>();
  for (const document of manifest.documents) {
    invariant(id.test(document.sampleId), `Invalid anonymous sampleId: ${document.sampleId}`);
    invariant(!sampleIds.has(document.sampleId), `Duplicate sampleId: ${document.sampleId}`);
    invariant(
      document.pageCount > 0 && document.pageCount <= 10,
      `Invalid pages: ${document.sampleId}`,
    );
    invariant(sha256.test(document.sha256), `Invalid SHA-256: ${document.sampleId}`);
    sampleIds.add(document.sampleId);
    const keys = new Set<string>();
    for (const label of document.labels) {
      invariant(fields.has(label.field), `Unknown label field: ${label.field}`);
      invariant(label.key.length > 0 && !keys.has(label.key), `Duplicate label key: ${label.key}`);
      invariant(
        label.page > 0 && label.page <= document.pageCount,
        `Invalid label page: ${label.key}`,
      );
      if (label.field.endsWith('referenceMonth'))
        invariant(month.test(label.value), `Invalid reference month: ${label.key}`);
      keys.add(label.key);
    }
  }
  for (const goal of policy.goals) {
    invariant(fields.has(goal.field), `Unknown goal field: ${goal.field}`);
    invariant(
      goal.minCoverage >= 0 && goal.minCoverage <= 1,
      `Invalid coverage goal: ${goal.field}`,
    );
    invariant(
      goal.minExactRate >= 0 && goal.minExactRate <= 1,
      `Invalid exact goal: ${goal.field}`,
    );
  }
  for (const field of policy.criticalFields)
    invariant(fields.has(field), `Unknown critical field: ${field}`);
}
