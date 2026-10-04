import { readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { preflightExperiment, type PocExecutionPlan } from './preflight.js';
import { createLocalDocumentLoader } from './runner.js';
import type { CorpusManifest, ExperimentPolicy } from './types.js';

const { values } = parseArgs({
  options: {
    manifest: { type: 'string' },
    policy: { type: 'string' },
    plan: { type: 'string' },
    documents: { type: 'string' },
    output: { type: 'string' },
  },
});
if (!values.manifest || !values.policy || !values.plan || !values.documents || !values.output)
  throw new Error('Use --manifest, --policy, --plan, --documents and --output');

const read = async <T>(path: string) => JSON.parse(await readFile(path, 'utf8')) as T;
const report = await preflightExperiment(
  await read<CorpusManifest>(values.manifest),
  await read<ExperimentPolicy>(values.policy),
  await read<PocExecutionPlan>(values.plan),
  createLocalDocumentLoader(values.documents),
);
await writeFile(values.output, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
console.log(
  JSON.stringify({
    corpusId: report.corpusId,
    documents: report.totals.documents,
    pages: report.totals.pages,
    estimatedCost: report.totals.estimatedCost,
    decision: report.decision,
    output: values.output,
  }),
);
if (report.decision === 'BLOCKED') process.exitCode = 2;
