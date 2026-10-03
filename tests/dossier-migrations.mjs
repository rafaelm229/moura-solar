import { mkdtemp, cp, readdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const { PrismaClient } = require('@prisma/client');
const schema = `dos_upgrade_${randomUUID().replaceAll('-', '')}`;
const url = new URL(
  process.env.TEST_DATABASE_URL ?? 'postgresql://moura:change-me-local@localhost:5433/moura_solar',
);
url.searchParams.set('schema', schema);
const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
const root = await mkdtemp(join(tmpdir(), 'moura-dossier-migration-'));
const env = {
  ...process.env,
  PATH: `${process.cwd()}/.bin:${process.env.PATH}`,
  DATABASE_URL: url.toString(),
};
function deploy(file) {
  const result = spawnSync(
    'pnpm',
    ['--filter', '@moura-solar/database', 'exec', 'prisma', 'migrate', 'deploy', '--schema', file],
    { env, encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stdout + result.stderr);
}
try {
  await writeFile(
    join(root, 'schema.prisma'),
    await readFile('packages/database/prisma/schema.prisma'),
  );
  for (const entry of await readdir('packages/database/prisma/migrations')) {
    if (entry === '20261003000200_dossier_integrity') continue;
    await cp(join('packages/database/prisma/migrations', entry), join(root, 'migrations', entry), {
      recursive: true,
    });
  }
  deploy(join(root, 'schema.prisma'));
  const organization = await db.organization.create({
    data: { name: 'Existing organization', slug: 'existing-dossier' },
  });
  const customer = await db.customer.create({
    data: { organizationId: organization.id, legalName: 'Existing customer' },
  });
  const ids = [randomUUID(), randomUUID(), randomUUID()];
  const sha = 'a'.repeat(64);
  await db.$executeRaw`INSERT INTO stored_objects (id, organization_id, backend, bucket, key, sha256, byte_size, verified, scan_result) VALUES (${ids[0]}::uuid, ${organization.id}::uuid, 'LEGACY_LOCAL', 'legacy', 'historical.pdf', ${sha}, 100, true, 'CLEAN')`;
  await db.$executeRaw`INSERT INTO dossier_documents (id, organization_id, customer_id, category, title, created_by, updated_at) VALUES (${ids[1]}::uuid, ${organization.id}::uuid, ${customer.id}::uuid, 'UTILITY_BILL', 'Historical evidence', 'migration-test', now())`;
  await db.$executeRaw`INSERT INTO dossier_document_versions (id, document_id, version_number, original_name, file_size, declared_mime, sha256, persistence_state, stored_object_id, author_id) VALUES (${ids[2]}::uuid, ${ids[1]}::uuid, 1, 'historical.pdf', 100, 'application/pdf', ${sha}, 'READY', ${ids[0]}::uuid, 'migration-test')`;
  deploy(resolve('packages/database/prisma/schema.prisma'));
  const doc = await db.dossierDocument.findUnique({
    where: { id: ids[1] },
    include: { versions: { include: { storedObject: true } } },
  });
  assert.equal(doc.metadataVersion, 1);
  assert.equal(doc.versions[0].sha256, sha);
  assert.equal(doc.versions[0].storedObject.key, 'historical.pdf');
  assert.equal(doc.versions[0].persistenceState, 'QUARANTINED');
  assert.equal(doc.versions[0].storedObject.verified, false);
  await assert.rejects(db.customer.delete({ where: { id: customer.id } }));
  deploy(resolve('packages/database/prisma/schema.prisma'));
  assert.equal(await db.dossierDocumentVersion.count(), 1);
  console.log(
    'Dossier upgrade preserved historical IDs, hashes and objects, quarantined unscanned evidence, and restricted parent deletion; redeploy safe.',
  );
} finally {
  await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await db.$disconnect();
  await rm(root, { recursive: true, force: true });
}
