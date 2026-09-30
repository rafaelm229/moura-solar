import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
const run = (command, args, env = process.env) => {
  const child = spawnSync(command, args, {
    stdio: 'inherit',
    env: { ...env, PATH: `${process.cwd()}/.bin:${env.PATH || ''}` },
  });
  if (child.status !== 0) process.exit(child.status ?? 1);
};
run('pnpm', ['--filter', '@moura-solar/api', 'build']);
run('node', ['apps/api/dist/main.js'], {
  ...process.env,
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://unused:unused@localhost:5432/unused',
  S3_ENDPOINT: 'http://localhost:9000',
  S3_ACCESS_KEY: 'unused',
  S3_SECRET_KEY: 'unused',
  S3_BUCKET: 'unused',
  IDENTITY_LINK_SECRET: 'contract-generation-only-not-a-real-secret',
  EXPORT_OPENAPI: resolve('packages/api-client/openapi.json'),
});
run('pnpm', [
  'exec',
  'openapi-typescript',
  'packages/api-client/openapi.json',
  '-o',
  'packages/api-client/src/schema.d.ts',
]);
run('pnpm', [
  'exec',
  'prettier',
  '--write',
  'packages/api-client/openapi.json',
  'packages/api-client/src/schema.d.ts',
]);
