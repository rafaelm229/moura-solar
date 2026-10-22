import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { copyFile, cp, mkdir, mkdtemp, readdir, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const { PrismaClient } = require('@prisma/client');
// Last migration in main@47838f7. Keep the baseline fixed for this upgrade regression.
const baseline = '20261002000100_automations_notifications_indicators';
assert.ok(process.env.TEST_DATABASE_URL, 'Set TEST_DATABASE_URL to a disposable test database');
const url = new URL(process.env.TEST_DATABASE_URL);
const schema = `consolidation_${randomUUID().replaceAll('-', '')}`;
url.searchParams.set('schema', schema);
const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
const fixture = await mkdtemp(join(tmpdir(), 'moura-consolidation-upgrade-'));
const migrationSource = resolve('packages/database/prisma/migrations');
const migrationFixture = join(fixture, 'migrations');
const schemaFile = join(fixture, 'schema.prisma');

function deploy(file) {
  const result = spawnSync(
    'pnpm',
    ['--filter', '@moura-solar/database', 'exec', 'prisma', 'migrate', 'deploy', '--schema', file],
    { env: { ...process.env, DATABASE_URL: url.toString() }, encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stdout + result.stderr);
}

try {
  await mkdir(migrationFixture);
  await copyFile(resolve('packages/database/prisma/schema.prisma'), schemaFile);
  await copyFile(
    join(migrationSource, 'migration_lock.toml'),
    join(migrationFixture, 'migration_lock.toml'),
  );
  const migrations = (await readdir(migrationSource, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  assert.ok(migrations.includes(baseline));
  for (const name of migrations.filter((name) => name <= baseline)) {
    await cp(join(migrationSource, name), join(migrationFixture, name), { recursive: true });
  }
  deploy(schemaFile);

  const organization = await db.organization.create({
    data: { name: 'Upgrade fixture', slug: `upgrade-${randomUUID()}` },
  });
  const user = await db.user.create({
    data: { name: 'Fixture user', email: `${randomUUID()}@upgrade.test` },
  });
  const role = await db.role.create({
    data: { organizationId: organization.id, name: 'Fixture role' },
  });
  const membership = await db.membership.create({
    data: { organizationId: organization.id, userId: user.id, roleId: role.id, status: 'active' },
  });
  const session = await db.session.create({
    data: {
      membershipId: membership.id,
      accessHash: randomUUID(),
      accessExpiresAt: new Date('2030-01-01T00:00:00Z'),
      expiresAt: new Date('2030-01-02T00:00:00Z'),
      device: 'Upgrade test',
    },
  });
  const customer = await db.customer.create({
    data: { organizationId: organization.id, legalName: 'Existing fixture customer' },
  });
  const unit = await db.utilityUnit.create({
    data: {
      organizationId: organization.id,
      customerId: customer.id,
      distributorName: 'Fixture distributor',
    },
  });
  const opportunity = await db.opportunity.create({
    data: {
      organizationId: organization.id,
      customerId: customer.id,
      utilityUnitId: unit.id,
      ownerUserId: user.id,
      code: 'UPGRADE-001',
      title: 'Existing fixture opportunity',
      needSummary: 'Preserve existing links',
    },
  });
  const audit = await db.auditEvent.create({
    data: {
      organizationId: organization.id,
      actorId: user.id,
      action: 'UPGRADE_FIXTURE',
      entityId: customer.id,
      traceId: randomUUID(),
    },
  });
  const readingId = randomUUID();
  // Insert using the old columns: the generated client already describes the candidate schema.
  await db.$executeRaw`
    INSERT INTO energy_readings
      (id, organization_id, utility_unit_id, reference_month, consumption_kwh, updated_at)
    VALUES (${readingId}::uuid, ${organization.id}::uuid, ${unit.id}::uuid, '2026-09', 512.75, CURRENT_TIMESTAMP)
  `;
  const oldMigrations =
    await db.$queryRaw`SELECT migration_name, checksum FROM _prisma_migrations ORDER BY migration_name`;

  const fullSchema = resolve('packages/database/prisma/schema.prisma');
  deploy(fullSchema);
  for (const [model, expected] of [
    ['organization', organization],
    ['user', user],
    ['role', role],
    ['membership', membership],
    ['session', session],
    ['customer', customer],
    ['utilityUnit', unit],
    ['opportunity', opportunity],
    ['auditEvent', audit],
  ]) {
    assert.deepEqual(
      await db[model].findUnique({ where: { id: expected.id } }),
      expected,
      `${model} must survive upgrade unchanged`,
    );
  }
  const reading = await db.energyReading.findUniqueOrThrow({ where: { id: readingId } });
  assert.equal(Number(reading.consumptionKwh), 512.75);
  assert.equal(reading.utilityUnitId, unit.id);
  assert.equal(reading.referenceMonth, '2026-09');
  assert.equal(reading.version, 1);
  assert.equal(reading.status, 'ACTIVE');
  assert.equal(reading.sourceImportId, null);
  assert.equal(await db.dossierDocument.count(), 0);
  assert.equal(await db.integrationOutbox.count(), 0);

  const applied =
    await db.$queryRaw`SELECT migration_name, checksum FROM _prisma_migrations ORDER BY migration_name`;
  assert.equal(applied.length, migrations.length);
  assert.deepEqual(applied.slice(0, oldMigrations.length), oldMigrations);
  deploy(fullSchema);
  assert.deepEqual(
    await db.$queryRaw`SELECT migration_name, checksum FROM _prisma_migrations ORDER BY migration_name`,
    applied,
  );
  assert.equal(await db.session.count(), 1);
  assert.equal(await db.energyReading.count(), 1);
  console.log(
    'Main baseline upgraded with existing identity, session, customer/UC/opportunity, reading and audit preserved; migration checksums and redeploy verified.',
  );
} finally {
  // Only the unique schema owned by this fixture is removed; never a database or volume.
  await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await db.$disconnect();
  await rm(fixture, { recursive: true, force: true });
}
