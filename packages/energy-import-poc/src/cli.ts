import { readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { benchmark } from './benchmark.js';
import type { AdapterRunSet, CorpusManifest, ExperimentPolicy } from './types.js';

const { values } = parseArgs({
  options: {
    manifest: { type: 'string' },
    runs: { type: 'string' },
    policy: { type: 'string' },
    output: { type: 'string' },
  },
});
if (!values.manifest || !values.runs || !values.policy || !values.output)
  throw new Error('Use --manifest, --runs, --policy and --output');

const read = async <T>(path: string) => JSON.parse(await readFile(path, 'utf8')) as T;
const report = benchmark(
  await read<CorpusManifest>(values.manifest),
  await read<AdapterRunSet>(values.runs),
  await read<ExperimentPolicy>(values.policy),
);
await writeFile(values.output, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
console.log(
  JSON.stringify({
    corpusId: report.corpusId,
    adapter: report.adapter.name,
    documents: report.totals.documents,
    recommendation: report.recommendation,
    output: values.output,
  }),
);
