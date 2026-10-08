import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { copyFile, cp, mkdir, mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const { PrismaClient } = require('@prisma/client');
const migrationName = '20261008000100_import_outbox_correlation';
const migrationSource = resolve('packages/database/prisma/migrations');
const fixture = await mkdtemp(join(tmpdir(), 'moura-import-correlation-migration-'));
const migrations = join(fixture, 'migrations');
const schemaFile = join(fixture, 'schema.prisma');
const schema = `import_correlation_${randomUUID().replaceAll('-', '')}`;
const url = new URL(
  process.env.TEST_DATABASE_URL ?? 'postgresql://moura:change-me-local@localhost:5433/moura_solar',
);
url.searchParams.set('schema', schema);
const env = { ...process.env, DATABASE_URL: url.toString() };
const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });

function deploy() {
  const result = spawnSync(
    'pnpm',
    [
      '--filter',
      '@moura-solar/database',
      'exec',
      'prisma',
      'migrate',
      'deploy',
      '--schema',
      schemaFile,
    ],
    { env, encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stdout + result.stderr);
}

try {
  await db.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  await mkdir(migrations);
  await copyFile(resolve('packages/database/prisma/schema.prisma'), schemaFile);
  await copyFile(
    join(migrationSource, 'migration_lock.toml'),
    join(migrations, 'migration_lock.toml'),
  );
  for (const entry of await readdir(migrationSource, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name !== migrationName) {
      await cp(join(migrationSource, entry.name), join(migrations, entry.name), {
        recursive: true,
      });
    }
  }
  deploy();

  const organization = await db.organization.create({
    data: { name: 'Existing organization', slug: `import-correlation-${randomUUID()}` },
  });
  const user = await db.user.create({
    data: { email: `${randomUUID()}@migration.test`, name: 'Migration test user' },
  });
  const customer = await db.customer.create({
    data: { organizationId: organization.id, legalName: 'Existing customer' },
  });
  const sha256 = 'a'.repeat(64);
  const object = await db.storedObject.create({
    data: {
      organizationId: organization.id,
      backend: 'MINIO',
      bucket: 'migration-test',
      key: `${randomUUID()}.pdf`,
      sha256,
      byteSize: 100,
      verified: true,
      scanResult: 'CLEAN',
    },
  });
  const document = await db.dossierDocument.create({
    data: {
      organizationId: organization.id,
      customerId: customer.id,
      category: 'UTILITY_BILL',
      title: 'Historical bill',
      createdBy: user.id,
    },
  });
  const version = await db.dossierDocumentVersion.create({
    data: {
      documentId: document.id,
      versionNumber: 1,
      originalName: 'historical.pdf',
      fileSize: 100,
      declaredMime: 'application/pdf',
      verifiedMime: 'application/pdf',
      sha256,
      persistenceState: 'READY',
      storedObjectId: object.id,
      authorId: user.id,
    },
  });
  const billImport = await db.energyBillImport.create({
    data: {
      organizationId: organization.id,
      customerId: customer.id,
      documentVersionId: version.id,
      createdById: user.id,
    },
  });
  const legacyEventId = randomUUID();
  const legacyPayload = { importId: billImport.id, documentVersionId: version.id };
  await db.$executeRaw`
    INSERT INTO import_outbox (id, organization_id, import_id, event_type, dedupe_key, payload, updated_at)
    VALUES (${legacyEventId}::uuid, ${organization.id}::uuid, ${billImport.id}::uuid,
      'ENERGY_BILL_IMPORT_QUEUED', 'migration-test:legacy', ${JSON.stringify(legacyPayload)}::jsonb, now())
  `;

  await cp(join(migrationSource, migrationName), join(migrations, migrationName), {
    recursive: true,
  });
  deploy();
  const legacy = await db.importOutbox.findUniqueOrThrow({ where: { id: legacyEventId } });
  assert.equal(legacy.correlationId, null);
  assert.equal(legacy.status, 'PENDING');
  assert.deepEqual(legacy.payload, legacyPayload);

  const correlated = await db.importOutbox.create({
    data: {
      organizationId: organization.id,
      importId: billImport.id,
      eventType: 'ENERGY_BILL_IMPORT_APPLIED',
      correlationId: 'r1-migration-test-request',
      dedupeKey: 'migration-test:correlated',
      payload: { importId: billImport.id },
    },
  });
  assert.equal(correlated.correlationId, 'r1-migration-test-request');
  deploy();
  assert.equal(await db.importOutbox.count({ where: { importId: billImport.id } }), 2);
  console.log('Import outbox correlation migration preserved legacy rows and redeployed safely.');
} finally {
  await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await db.$disconnect();
  await rm(fixture, { recursive: true, force: true });
}
