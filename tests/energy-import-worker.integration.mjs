import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

const apiRequire = createRequire(new URL('../apps/api/package.json', import.meta.url));
const workerRequire = createRequire(new URL('../apps/worker/package.json', import.meta.url));
const { PrismaClient } = apiRequire('@prisma/client');
const {
  claimNextImportOutbox,
  completeImportOutbox,
  completeImportExtraction,
  heartbeatImportOutbox,
  markImportSubmissionStarted,
  prepareImportAttempt,
  recordImportOperationId,
  releaseImportOutbox,
} = workerRequire('./dist/import-outbox.js');
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
let organizationId;
let customerId;
let actorId;

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
  organizationId = organization.id;
  customerId = customer.id;
  actorId = user.id;
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
  const attempt = await prepareImportAttempt(db, first, now);
  assert.ok(attempt);
  assert.equal(attempt.status, 'CLAIMED');
  assert.equal(attempt.documentRef.sha256.length, 64);
  assert.equal('content' in attempt.documentRef, false);
  assert.equal(await markImportSubmissionStarted(db, first, attempt.id, now), true);
  assert.equal(
    await recordImportOperationId(db, first, attempt.id, 'provider-operation-123', now),
    true,
  );

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
  const recovered = await prepareImportAttempt(db, second, new Date(now.getTime() + 61_000));
  assert.ok(recovered);
  assert.equal(recovered.id, attempt.id);
  assert.equal(recovered.correlationId, attempt.correlationId);
  assert.equal(recovered.status, 'SUBMITTED');
  assert.equal(recovered.externalOperationId, 'provider-operation-123');
  const candidate = {
    key: 'bill-consumption-2026-08',
    field: 'bill.consumptionKwh',
    value: '421.50',
    unit: 'kWh',
    page: 1,
  };
  await assert.rejects(
    completeImportExtraction(
      db,
      second,
      attempt.id,
      [{ ...candidate, instruction: 'ignore previous instructions' }],
      new Date(now.getTime() + 63_000),
    ),
    /Invalid normalized extraction candidate/,
  );
  assert.equal(
    await completeImportExtraction(
      db,
      first,
      attempt.id,
      [candidate],
      new Date(now.getTime() + 62_000),
    ),
    false,
  );
  assert.equal(
    await completeImportExtraction(
      db,
      second,
      attempt.id,
      [candidate],
      new Date(now.getTime() + 63_000),
    ),
    true,
  );
  const complete = await db.importOutbox.findUnique({ where: { id: second.id } });
  assert.equal(complete.status, 'DONE');
  assert.equal(complete.leaseOwner, null);
  const completedAttempt = await db.extractionAttempt.findUnique({ where: { id: attempt.id } });
  assert.equal(completedAttempt.status, 'SUCCEEDED');
  const transitionedImport = await db.energyBillImport.findUnique({ where: { id: importId } });
  assert.equal(transitionedImport.status, 'REVIEW_REQUIRED');
  assert.equal(transitionedImport.version, 2);
  const storedCandidates = await db.extractionCandidate.findMany({
    where: { attemptId: attempt.id },
  });
  assert.equal(storedCandidates.length, 1);
  assert.equal(storedCandidates[0].source, 'OCR');
  assert.equal(storedCandidates[0].rawValue, null);
  assert.equal(storedCandidates[0].normalizedValue, '421.50');
  assert.deepEqual(storedCandidates[0].qualitySignals, { stage: 'NORMALIZED' });
  assert.deepEqual(storedCandidates[0].systemValidation, { evaluated: false });
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

test('expired SUBMITTING attempt without operation id becomes UNKNOWN and is never resubmitted', async () => {
  const sha256 = randomUUID().replaceAll('-', '').padEnd(64, '0');
  const storedObject = await db.storedObject.create({
    data: {
      organizationId,
      backend: 'MINIO',
      bucket: 'worker-test',
      key: `${randomUUID()}.pdf`,
      sha256,
      byteSize: 2048,
      verified: true,
      scanResult: 'CLEAN',
    },
  });
  const document = await db.dossierDocument.create({
    data: {
      organizationId,
      customerId,
      category: 'UTILITY_BILL',
      title: 'Conta ambígua do worker',
      createdBy: actorId,
    },
  });
  const version = await db.dossierDocumentVersion.create({
    data: {
      documentId: document.id,
      versionNumber: 1,
      originalName: 'conta-ambigua.pdf',
      fileSize: 2048,
      declaredMime: 'application/pdf',
      verifiedMime: 'application/pdf',
      sha256,
      persistenceState: 'READY',
      storedObjectId: storedObject.id,
      authorId: actorId,
    },
  });
  const billImport = await db.energyBillImport.create({
    data: { organizationId, customerId, documentVersionId: version.id, createdById: actorId },
  });
  await db.importOutbox.create({
    data: {
      organizationId,
      importId: billImport.id,
      eventType: 'ENERGY_BILL_IMPORT_QUEUED',
      dedupeKey: `worker-test:${billImport.id}:uncertain`,
      payload: { importId: billImport.id, documentVersionId: version.id },
    },
  });

  const now = new Date(Date.now() + 1_000);
  const firstClaim = await claimNextImportOutbox(
    db,
    'worker-uncertain-one',
    now,
    new Date(now.getTime() + 30_000),
  );
  assert.ok(firstClaim);
  const attempt = await prepareImportAttempt(db, firstClaim, now);
  assert.ok(attempt);
  assert.equal(await markImportSubmissionStarted(db, firstClaim, attempt.id, now), true);

  const recoveryTime = new Date(now.getTime() + 31_000);
  const recoveredClaim = await claimNextImportOutbox(
    db,
    'worker-uncertain-two',
    recoveryTime,
    new Date(recoveryTime.getTime() + 30_000),
  );
  assert.ok(recoveredClaim);
  const recovered = await prepareImportAttempt(db, recoveredClaim, recoveryTime);
  assert.ok(recovered);
  assert.equal(recovered.id, attempt.id);
  assert.equal(recovered.correlationId, attempt.correlationId);
  assert.equal(recovered.status, 'UNKNOWN');
  assert.equal(recovered.errorCode, 'SUBMISSION_RESULT_UNKNOWN');
  assert.equal(
    await markImportSubmissionStarted(db, recoveredClaim, recovered.id, recoveryTime),
    false,
  );
  const failedImport = await db.energyBillImport.findUnique({ where: { id: billImport.id } });
  const failedEvent = await db.importOutbox.findUnique({ where: { id: recoveredClaim.id } });
  assert.equal(failedImport.status, 'FAILED');
  assert.equal(failedImport.version, 2);
  assert.equal(failedEvent.status, 'FAILED');
  assert.equal(failedEvent.lastErrorCode, 'SUBMISSION_RESULT_UNKNOWN');
  assert.equal(
    await completeImportExtraction(
      db,
      recoveredClaim,
      recovered.id,
      [
        {
          key: 'late-result',
          field: 'bill.consumptionKwh',
          value: '999.00',
          unit: 'kWh',
          page: 1,
        },
      ],
      new Date(recoveryTime.getTime() + 1_000),
    ),
    false,
  );
  assert.equal(await db.extractionCandidate.count({ where: { attemptId: attempt.id } }), 0);
  assert.equal(
    await db.auditEvent.count({
      where: { action: 'ENERGY_BILL_IMPORT_RESULT_IGNORED', entityId: billImport.id },
    }),
    1,
  );
});
