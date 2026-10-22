import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { copyFile, cp, mkdir, mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const { PrismaClient } = require('@prisma/client');
const migrationName = '20261009000100_integration_outbox';
const migrationSource = resolve('packages/database/prisma/migrations');
const fixture = await mkdtemp(join(tmpdir(), 'moura-integration-outbox-migration-'));
const baseUrl = new URL(
  process.env.TEST_DATABASE_URL ?? 'postgresql://moura:change-me-local@localhost:5433/moura_solar',
);
const env = {
  ...process.env,
  PATH: `${process.cwd()}/.bin:/tmp/moura-solar-tools:${process.env.PATH}`,
};

async function prepareMigrationFixture(schema, excludeOutboxMigration) {
  const schemaDir = join(fixture, schema);
  const migrationDir = join(schemaDir, 'migrations');
  const localSchemaFile = join(schemaDir, 'schema.prisma');
  await mkdir(migrationDir, { recursive: true });
  await copyFile(resolve('packages/database/prisma/schema.prisma'), localSchemaFile);
  await copyFile(
    join(migrationSource, 'migration_lock.toml'),
    join(migrationDir, 'migration_lock.toml'),
  );
  for (const entry of await readdir(migrationSource, { withFileTypes: true })) {
    if (entry.isDirectory() && !(excludeOutboxMigration && entry.name === migrationName)) {
      await cp(join(migrationSource, entry.name), join(migrationDir, entry.name), {
        recursive: true,
      });
    }
  }
  return { localSchemaFile, migrationDir };
}

function deploy(localSchemaFile, databaseUrl) {
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
      localSchemaFile,
    ],
    {
      env: { ...env, DATABASE_URL: databaseUrl },
      encoding: 'utf8',
    },
  );
  assert.equal(result.status, 0, result.stdout + result.stderr);
}

async function assertOutboxTable(db) {
  const rows = await db.$queryRaw`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = current_schema() AND table_name = 'integration_outbox'
  `;
  assert.deepEqual(rows, [{ table_name: 'integration_outbox' }]);
}

const emptySchema = `integration_outbox_empty_${randomUUID().replaceAll('-', '')}`;
const dataSchema = `integration_outbox_data_${randomUUID().replaceAll('-', '')}`;
const emptyUrl = new URL(baseUrl);
emptyUrl.searchParams.set('schema', emptySchema);
const dataUrl = new URL(baseUrl);
dataUrl.searchParams.set('schema', dataSchema);
const emptyDb = new PrismaClient({ datasources: { db: { url: emptyUrl.toString() } } });
const dataDb = new PrismaClient({ datasources: { db: { url: dataUrl.toString() } } });

try {
  const emptyFixture = await prepareMigrationFixture(emptySchema, false);
  await emptyDb.$executeRawUnsafe(`CREATE SCHEMA "${emptySchema}"`);
  deploy(emptyFixture.localSchemaFile, emptyUrl.toString());
  await assertOutboxTable(emptyDb);

  const previousFixture = await prepareMigrationFixture(dataSchema, true);
  await dataDb.$executeRawUnsafe(`CREATE SCHEMA "${dataSchema}"`);
  deploy(previousFixture.localSchemaFile, dataUrl.toString());
  const organization = await dataDb.organization.create({
    data: { name: 'Outbox migration baseline', slug: `outbox-${randomUUID()}` },
  });

  await cp(
    join(migrationSource, migrationName),
    join(previousFixture.migrationDir, migrationName),
    {
      recursive: true,
    },
  );
  deploy(previousFixture.localSchemaFile, dataUrl.toString());
  assert.equal(await dataDb.organization.count({ where: { id: organization.id } }), 1);
  await assertOutboxTable(dataDb);
} finally {
  await emptyDb.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${emptySchema}" CASCADE`);
  await dataDb.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${dataSchema}" CASCADE`);
  await emptyDb.$disconnect();
  await dataDb.$disconnect();
  await rm(fixture, { recursive: true, force: true });
}
