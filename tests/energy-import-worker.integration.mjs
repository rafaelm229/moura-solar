import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

const apiRequire = createRequire(new URL('../apps/api/package.json', import.meta.url));
const workerRequire = createRequire(new URL('../apps/worker/package.json', import.meta.url));
const { PrismaClient } = apiRequire('@prisma/client');
const { claimNextImportOutbox, completeImportOutbox, heartbeatImportOutbox, releaseImportOutbox } =
  workerRequire('./dist/import-outbox.js');
const url = new URL(
  process.env.TEST_DATABASE_URL ?? 'postgresql://moura:change-me-local@localhost:5433/moura_solar',
);
const schema = `test_imp_worker_${randomUUID().replaceAll('-', '')}`;
url.searchParams.set('schema', schema);
const env = {
  ...process.env,
  PATH: `${process.cwd()}/.bin:${process.env.PATH}`,
  DATABASE_URL: url.toString(),
};
const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
let importId;
let documentVersionId;

before(async () => {
  await db.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  const migration = spawnSync(
    'pnpm',
    ['--filter', '@moura-solar/database', 'exec', 'prisma', 'migrate', 'deploy'],
    { env, encoding: 'utf8' },
  );
  assert.equal(migration.status, 0, migration.stdout + migration.stderr);

  const organization = await db.organization.create({
    data: { name: 'Worker de importação', slug: `worker-${randomUUID()}` },
  });
  const user = await db.user.create({
    data: { email: `${randomUUID()}@worker.test`, name: 'Usuário de teste' },
  });
  const customer = await db.customer.create({
    data: { organizationId: organization.id, legalName: 'Cliente do worker' },
  });
  const sha256 = randomUUID().replaceAll('-', '').padEnd(64, '0');
  const storedObject = await db.storedObject.create({
    data: {
      organizationId: organization.id,
      backend: 'MINIO',
      bucket: 'worker-test',
      key: `${randomUUID()}.pdf`,
      sha256,
      byteSize: 1024,
      verified: true,
      scanResult: 'CLEAN',
    },
  });
  const document = await db.dossierDocument.create({
    data: {
      organizationId: organization.id,
      customerId: customer.id,
      category: 'UTILITY_BILL',
      title: 'Conta de teste do worker',
      createdBy: user.id,
    },
  });
  const version = await db.dossierDocumentVersion.create({
    data: {
      documentId: document.id,
      versionNumber: 1,
      originalName: 'conta.pdf',
      fileSize: 1024,
      declaredMime: 'application/pdf',
      verifiedMime: 'application/pdf',
      sha256,
      persistenceState: 'READY',
      storedObjectId: storedObject.id,
      authorId: user.id,
    },
  });
  documentVersionId = version.id;
  const billImport = await db.energyBillImport.create({
    data: {
      organizationId: organization.id,
      customerId: customer.id,
      documentVersionId: version.id,
      createdById: user.id,
    },
  });
  importId = billImport.id;
  await db.importOutbox.create({
    data: {
      organizationId: organization.id,
      importId,
      eventType: 'ENERGY_BILL_IMPORT_QUEUED',
      dedupeKey: `worker-test:${importId}:first`,
      payload: { importId, documentVersionId },
    },
  });
});

after(async () => {
  await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await db.$disconnect();
});

test('outbox claims are exclusive, recover expired leases, and reject stale acknowledgements', async () => {
  const now = new Date(Date.now() + 1_000);
  const first = await claimNextImportOutbox(
    db,
    'worker-one',
    now,
    new Date(now.getTime() + 30_000),
  );
  assert.ok(first);
  assert.equal(first.importId, importId);
  assert.deepEqual(first.payload, { importId, documentVersionId });
  assert.equal(first.attempts, 1);

  assert.equal(
    await claimNextImportOutbox(
      db,
      'worker-two',
      new Date(now.getTime() + 10_000),
      new Date(now.getTime() + 40_000),
    ),
    null,
  );

  assert.equal(
    await heartbeatImportOutbox(
      db,
      first,
      new Date(now.getTime() + 10_000),
      new Date(now.getTime() + 60_000),
    ),
    true,
  );
  const second = await claimNextImportOutbox(
    db,
    'worker-two',
    new Date(now.getTime() + 61_000),
    new Date(now.getTime() + 91_000),
  );
  assert.ok(second);
  assert.equal(second.id, first.id);
  assert.equal(second.attempts, 2);
  assert.equal(await completeImportOutbox(db, first, new Date(now.getTime() + 62_000)), false);
  assert.equal(await completeImportOutbox(db, second, new Date(now.getTime() + 63_000)), true);
  const complete = await db.importOutbox.findUnique({ where: { id: second.id } });
  assert.equal(complete.status, 'DONE');
  assert.equal(complete.leaseOwner, null);
  assert.ok(complete.completedAt);
});

test('outbox release preserves a safe code and delays the next claim until its due time', async () => {
  const now = new Date(Date.now() + 1_000);
  await db.importOutbox.create({
    data: {
      organizationId: (await db.energyBillImport.findUnique({ where: { id: importId } }))
        .organizationId,
      importId,
      eventType: 'ENERGY_BILL_IMPORT_QUEUED',
      dedupeKey: `worker-test:${importId}:retry`,
      payload: { importId, documentVersionId },
    },
  });
  const claim = await claimNextImportOutbox(
    db,
    'worker-three',
    now,
    new Date(now.getTime() + 30_000),
  );
  assert.ok(claim);
  const dueAt = new Date(now.getTime() + 60_000);
  assert.equal(
    await releaseImportOutbox(db, claim, new Date(now.getTime() + 1_000), dueAt, 'STORE_TEMPORARY'),
    true,
  );
  assert.equal(
    await claimNextImportOutbox(
      db,
      'worker-four',
      new Date(now.getTime() + 59_000),
      new Date(now.getTime() + 89_000),
    ),
    null,
  );
  const reclaimed = await claimNextImportOutbox(
    db,
    'worker-four',
    new Date(now.getTime() + 61_000),
    new Date(now.getTime() + 91_000),
  );
  assert.ok(reclaimed);
  assert.equal(reclaimed.id, claim.id);
  const released = await db.importOutbox.findUnique({ where: { id: claim.id } });
  assert.equal(released.attempts, 2);
  assert.equal(released.lastErrorCode, 'STORE_TEMPORARY');
  assert.equal(await completeImportOutbox(db, reclaimed, new Date(now.getTime() + 62_000)), true);
});
