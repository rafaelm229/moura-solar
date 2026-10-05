import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { copyFile, cp, mkdir, mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const { PrismaClient } = require('@prisma/client');
const url = new URL(
  process.env.TEST_DATABASE_URL ??
    process.env.DATABASE_URL ??
    'postgresql://moura:change-me-local@localhost:5433/moura_solar',
);
const schema = `upgrade_${randomUUID().replaceAll('-', '')}`;
const correctionMigration = '20261004000100_energy_reading_corrections';
const migrationSource = resolve('packages/database/prisma/migrations');
const migrationFixture = await mkdtemp(join(tmpdir(), 'moura-energy-reading-migration-'));
const fixtureMigrations = join(migrationFixture, 'migrations');
const fixtureSchema = join(migrationFixture, 'schema.prisma');
await mkdir(fixtureMigrations, { recursive: true });
await copyFile(resolve('packages/database/prisma/schema.prisma'), fixtureSchema);
await copyFile(
  join(migrationSource, 'migration_lock.toml'),
  join(fixtureMigrations, 'migration_lock.toml'),
);
for (const entry of await readdir(migrationSource, { withFileTypes: true })) {
  if (entry.isDirectory() && entry.name !== correctionMigration) {
    await cp(join(migrationSource, entry.name), join(fixtureMigrations, entry.name), {
      recursive: true,
    });
  }
}
url.searchParams.set('schema', schema);
const env = {
  ...process.env,
  PATH: `${process.cwd()}/.bin:/tmp/moura-solar-tools:${process.env.PATH}`,
  DATABASE_URL: url.toString(),
};
const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
function prisma(args, prismaSchema = fixtureSchema) {
  const command = spawnSync(
    'pnpm',
    ['--filter', '@moura-solar/database', 'exec', 'prisma', ...args, '--schema', prismaSchema],
    { env, encoding: 'utf8' },
  );
  assert.equal(command.status, 0, command.stdout + command.stderr);
}
try {
  await db.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  prisma(['migrate', 'deploy']);
  const original = await db.organization.create({
    data: { name: 'Organização pré-existente', slug: 'preserve-me' },
  });
  const customer = await db.customer.create({
    data: { organizationId: original.id, legalName: 'Cliente anterior à correção' },
  });
  const utilityUnit = await db.utilityUnit.create({
    data: {
      organizationId: original.id,
      customerId: customer.id,
      distributorName: 'Distribuidora de teste',
    },
  });
  const readingId = randomUUID();
  await db.$executeRaw`
    INSERT INTO "energy_readings"
      ("id", "organization_id", "utility_unit_id", "reference_month", "consumption_kwh", "updated_at")
    VALUES
      (${readingId}::uuid, ${original.id}::uuid, ${utilityUnit.id}::uuid, '2026-05', 512.75, CURRENT_TIMESTAMP)
  `;

  await cp(
    join(migrationSource, correctionMigration),
    join(fixtureMigrations, correctionMigration),
    { recursive: true },
  );
  prisma(['migrate', 'deploy']);
  const migratedReading = await db.energyReading.findUnique({ where: { id: readingId } });
  assert.ok(migratedReading);
  assert.equal(Number(migratedReading.consumptionKwh), 512.75);
  assert.equal(migratedReading.version, 1);
  assert.equal(migratedReading.status, 'ACTIVE');
  assert.equal(migratedReading.correctionReason, null);
  assert.deepEqual(
    await db.$queryRaw`SELECT COUNT(*)::int AS count FROM "energy_readings" WHERE "utility_unit_id" = ${utilityUnit.id}::uuid AND "status" = 'ACTIVE' AND "reference_month" = '2026-05'`,
    [{ count: 1 }],
  );

  assert.deepEqual(await db.organization.findUnique({ where: { id: original.id } }), original);
  assert.equal(await db.membership.count(), 0);
  assert.equal(await db.customer.count(), 1);
  assert.equal(await db.utilityUnit.count(), 1);
  assert.equal(await db.energyReading.count(), 1);
  assert.equal(await db.opportunity.count(), 0);
  assert.equal(await db.catalogItem.count(), 0);
  assert.equal(await db.design.count(), 0);
  assert.equal(await db.proposal.count(), 0);
  assert.equal(await db.contract.count(), 0);
  assert.equal(await db.projectGate.count(), 0);
  assert.equal(await db.paymentPlan.count(), 0);
  assert.equal(await db.receivable.count(), 0);
  assert.equal(await db.payable.count(), 0);
  assert.equal(await db.financialAccount.count(), 0);
  assert.equal(await db.stockLocation.count(), 0);
  assert.equal(await db.stockBalance.count(), 0);
  assert.equal(await db.supplier.count(), 0);
  assert.equal(await db.purchaseOrder.count(), 0);
  assert.equal(await db.operationalProject.count(), 0);
  assert.equal(await db.executiveDesign.count(), 0);
  assert.equal(await db.homologationProcess.count(), 0);
  assert.equal(await db.workOrder.count(), 0);
  assert.equal(await db.customerHandover.count(), 0);
  assert.equal(await db.supportTicket.count(), 0);
  assert.equal(await db.supportInteraction.count(), 0);
  assert.equal(await db.warrantyCoverage.count(), 0);
  assert.equal(await db.warrantyClaim.count(), 0);
  assert.equal(await db.serviceVisitQuote.count(), 0);
  assert.equal(await db.monitoringSystem.count(), 0);
  assert.equal(await db.monitoringReading.count(), 0);
  assert.equal(await db.connectivityIncident.count(), 0);
  assert.equal(await db.automationRuleVersion.count(), 0);
  assert.equal(await db.automationExecution.count(), 0);
  assert.equal(await db.attentionItem.count(), 0);
  assert.equal(await db.notification.count(), 0);
  assert.equal(await db.notificationPreference.count(), 0);
  assert.equal(await db.goalVersion.count(), 0);
  assert.equal(await db.metricProjection.count(), 0);
  assert.equal(await db.dossierDocument.count(), 0);
  assert.equal(await db.dossierDocumentVersion.count(), 0);
  assert.equal(await db.storedObject.count(), 0);
  assert.equal(await db.customerRepresentative.count(), 0);
  assert.equal(await db.documentAccessEvent.count(), 0);
  prisma(['migrate', 'deploy']);
  assert.equal(await db.organization.count(), 1);
  assert.equal((await db.energyReading.findUnique({ where: { id: readingId } })).version, 1);
  console.log(
    'Upgrade through SPEC-013 preserved an existing energy reading, initialized version 1 and ACTIVE status, and safely redeployed.',
  );
} finally {
  await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await db.$disconnect();
  await rm(migrationFixture, { recursive: true, force: true });
}
