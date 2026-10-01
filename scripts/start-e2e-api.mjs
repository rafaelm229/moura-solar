import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const { PrismaClient } = require('@prisma/client');
const url = new URL(
  process.env.TEST_DATABASE_URL ??
    process.env.DATABASE_URL ??
    'postgresql://moura:change-me-local@localhost:5433/moura_solar',
);
const schema = `e2e_${randomUUID().replaceAll('-', '')}`;
url.searchParams.set('schema', schema);
const env = {
  ...process.env,
  DATABASE_URL: url.toString(),
  NODE_ENV: 'test',
  API_PORT: '3318',
  WEB_ORIGIN: 'http://localhost:3320',
  COOKIE_SECURE: 'false',
  S3_ENDPOINT: 'http://localhost:9000',
  S3_ACCESS_KEY: 'test',
  S3_SECRET_KEY: 'test',
  S3_BUCKET: 'test',
  IDENTITY_LINK_SECRET: 'e2e-test-link-secret-at-least-32-characters',
  BOOTSTRAP_TOKEN: 'e2e-test-bootstrap-secret-at-least-32-characters',
  LOGIN_RATE_LIMIT_EMAIL: '100',
  LOGIN_RATE_LIMIT_IP: '200',
};
const deploy = spawnSync('pnpm', ['db:deploy'], { env, stdio: 'inherit' });
if (deploy.status !== 0) process.exit(1);
const server = spawn('node', ['apps/api/dist/main.js'], { env, stdio: 'inherit' });
let closing = false;
async function cleanup() {
  if (closing) return;
  closing = true;
  server.kill('SIGTERM');
  if (server.exitCode === null) await new Promise((resolve) => server.once('exit', resolve));
  const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await db.$disconnect();
  process.exit(0);
}
process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);
server.on('exit', (code) => {
  if (!closing) process.exit(code ?? 1);
});
