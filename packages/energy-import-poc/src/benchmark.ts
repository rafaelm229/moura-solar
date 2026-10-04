import type {
  AdapterRunSet,
  BenchmarkReport,
  CorpusDocument,
  CorpusManifest,
  ExperimentPolicy,
  SliceMetrics,
} from './types.js';
import { validateInputs } from './validate.js';

type Count = Omit<SliceMetrics, 'exactRate' | 'coverage'>;

const empty = (): Count => ({
  expected: 0,
  predicted: 0,
  exact: 0,
  corrections: 0,
  missing: 0,
  unexpected: 0,
});
const decimalToMicros = (value: string) => {
  const [whole = '0', fraction = ''] = value.split('.');
  return BigInt(whole) * 1_000_000n + BigInt((fraction + '000000').slice(0, 6));
};
const microsToDecimal = (value: bigint) =>
  `${value / 1_000_000n}.${(value % 1_000_000n).toString().padStart(6, '0')}`;
const metric = (count: Count): SliceMetrics => ({
  ...count,
  exactRate: count.expected ? count.exact / count.expected : null,
  coverage: count.expected ? (count.expected - count.missing) / count.expected : null,
});
const percentile = (values: number[], p: number) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil(p * sorted.length) - 1] ?? null;
};

function addDocument(
  target: Count,
  document: CorpusDocument,
  candidates: AdapterRunSet['runs'][number]['candidates'],
) {
  const expected = new Map(document.labels.map((label) => [label.key, label]));
  const predicted = new Map(candidates.map((candidate) => [candidate.key, candidate]));
  target.expected += expected.size;
  target.predicted += predicted.size;
  for (const [key, label] of expected) {
    const candidate = predicted.get(key);
    if (!candidate) target.missing += 1;
    else if (
      candidate.field === label.field &&
      candidate.value === label.value &&
      candidate.unit === label.unit
    )
      target.exact += 1;
    else target.corrections += 1;
  }
  for (const key of predicted.keys()) if (!expected.has(key)) target.unexpected += 1;
}

export function benchmark(
  manifest: CorpusManifest,
  runSet: AdapterRunSet,
  policy: ExperimentPolicy,
): BenchmarkReport {
  validateInputs(manifest, runSet, policy);
  const byField = new Map<string, Count>();
  const byDistributor = new Map<string, Count>();
  const byFormat = new Map<string, Count>();
  const byQuality = new Map<string, Count>();
  let totalCost = 0n;
  let chargedPages = 0;
  let succeeded = 0;
  let failed = 0;
  let fallbackManual = 0;
  let criticalErrors = 0;
  const latencies: number[] = [];

  for (const document of manifest.documents) {
    const run = runSet.runs.find((entry) => entry.sampleId === document.sampleId)!;
    totalCost += decimalToMicros(run.cost.amount);
    chargedPages += run.chargedPages;
    latencies.push(run.latencyMs);
    if (run.outcome === 'SUCCEEDED') succeeded += 1;
    if (run.outcome === 'FAILED') failed += 1;
    if (run.outcome === 'FALLBACK_MANUAL') fallbackManual += 1;
    const distributor = byDistributor.get(document.distributor) ?? empty();
    const format = byFormat.get(document.format) ?? empty();
    const quality = byQuality.get(document.quality) ?? empty();
    addDocument(distributor, document, run.candidates);
    addDocument(format, document, run.candidates);
    addDocument(quality, document, run.candidates);
    byDistributor.set(document.distributor, distributor);
    byFormat.set(document.format, format);
    byQuality.set(document.quality, quality);
    for (const label of document.labels) {
      const target = byField.get(label.field) ?? empty();
      addDocument(
        target,
        { ...document, labels: [label] },
        run.candidates.filter((c) => c.key === label.key),
      );
      byField.set(label.field, target);
      if (
        policy.criticalFields.includes(label.field) &&
        !run.candidates.some(
          (candidate) =>
            candidate.key === label.key &&
            candidate.field === label.field &&
            candidate.value === label.value &&
            candidate.unit === label.unit,
        )
      )
        criticalErrors += 1;
    }
  }
  const budget = decimalToMicros(policy.approvedBudget.amount);
  const gates = policy.goals.flatMap((goal) => {
    const actual = metric(byField.get(goal.field) ?? empty());
    return [
      {
        name: `${goal.field}:exactRate`,
        passed: actual.exactRate !== null && actual.exactRate >= goal.minExactRate,
        actual: actual.exactRate === null ? 'n/a' : actual.exactRate.toFixed(4),
        target: goal.minExactRate.toFixed(4),
      },
      {
        name: `${goal.field}:coverage`,
        passed: actual.coverage !== null && actual.coverage >= goal.minCoverage,
        actual: actual.coverage === null ? 'n/a' : actual.coverage.toFixed(4),
        target: goal.minCoverage.toFixed(4),
      },
    ];
  });
  gates.push(
    {
      name: 'criticalErrors',
      passed: criticalErrors === 0,
      actual: String(criticalErrors),
      target: '0',
    },
    {
      name: 'approvedBudget',
      passed: totalCost <= budget,
      actual: microsToDecimal(totalCost),
      target: policy.approvedBudget.amount,
    },
  );
  const allPassed = gates.every((gate) => gate.passed);
  const distributorCounts = new Map<string, number>();
  for (const document of manifest.documents)
    distributorCounts.set(
      document.distributor,
      (distributorCounts.get(document.distributor) ?? 0) + 1,
    );
  const sufficientSample = [...distributorCounts.values()].every((count) => count >= 20);
  return {
    schemaVersion: '1',
    corpusId: manifest.corpusId,
    adapter: runSet.adapter,
    totals: {
      documents: manifest.documents.length,
      succeeded,
      fallbackManual,
      failed,
      latencyP50Ms: percentile(latencies, 0.5),
      latencyP95Ms: percentile(latencies, 0.95),
      chargedPages,
      cost: { amount: microsToDecimal(totalCost), currency: policy.approvedBudget.currency },
      costPerSucceededDocument: succeeded ? microsToDecimal(totalCost / BigInt(succeeded)) : null,
      criticalErrors,
      fallbackManualRate: fallbackManual / manifest.documents.length,
    },
    byField: Object.fromEntries([...byField].map(([name, value]) => [name, metric(value)])),
    byDistributor: Object.fromEntries(
      [...byDistributor].map(([name, value]) => [name, metric(value)]),
    ),
    byFormat: Object.fromEntries([...byFormat].map(([name, value]) => [name, metric(value)])),
    byQuality: Object.fromEntries([...byQuality].map(([name, value]) => [name, metric(value)])),
    gates,
    recommendation: !sufficientSample ? 'INCONCLUSIVE' : allPassed ? 'CONTINUE' : 'STOP',
  };
}
