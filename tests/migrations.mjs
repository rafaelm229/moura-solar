import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const { PrismaClient } = require('@prisma/client');
const url = new URL(
  process.env.TEST_DATABASE_URL ?? 'postgresql://moura:m1-test-only@localhost:55439/moura_m1_test',
);
const schema = `upgrade_${randomUUID().replaceAll('-', '')}`;
url.searchParams.set('schema', schema);
const env = { ...process.env, DATABASE_URL: url.toString() };
const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
function prisma(args) {
  const command = spawnSync(
    'pnpm',
    ['--filter', '@moura-solar/database', 'exec', 'prisma', ...args],
    { env, encoding: 'utf8' },
  );
  assert.equal(command.status, 0, command.stdout + command.stderr);
}
try {
  await db.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  prisma([
    'db',
    'execute',
    '--file',
    'prisma/migrations/20260928000100_foundation/migration.sql',
    '--schema',
    'prisma/schema.prisma',
  ]);
  prisma(['migrate', 'resolve', '--applied', '20260928000100_foundation']);
  const original = await db.organization.create({
    data: { name: 'Organização pré-existente', slug: 'preserve-me' },
  });
  prisma(['migrate', 'deploy']);
  assert.deepEqual(await db.organization.findUnique({ where: { id: original.id } }), original);
  assert.equal(await db.membership.count(), 0);
  assert.equal(await db.customer.count(), 0);
  assert.equal(await db.opportunity.count(), 0);
  assert.equal(await db.catalogItem.count(), 0);
  assert.equal(await db.design.count(), 0);
  prisma(['migrate', 'deploy']);
  assert.equal(await db.organization.count(), 1);
  console.log(
    'Upgrade M0 → M1 → M2 → M3 preserved existing organization; repeated deployment was safe.',
  );
} finally {
  await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await db.$disconnect();
}
