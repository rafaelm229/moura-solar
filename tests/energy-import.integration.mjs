import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const { PrismaClient } = require('@prisma/client');
const url = new URL(
  process.env.TEST_DATABASE_URL ?? 'postgresql://moura:change-me-local@localhost:5433/moura_solar',
);
const schema = `test_imp_${randomUUID().replaceAll('-', '')}`;
url.searchParams.set('schema', schema);
const env = {
  ...process.env,
  PATH: `${process.cwd()}/.bin:${process.env.PATH}`,
  DATABASE_URL: url.toString(),
  NODE_ENV: 'test',
  API_PORT: '3335',
  WEB_ORIGIN: 'http://localhost:3320',
  COOKIE_SECURE: 'false',
  IDENTITY_LINK_SECRET: 'integration-test-link-secret-at-least-32-characters',
  BOOTSTRAP_TOKEN: 'integration-test-bootstrap-at-least-32-characters',
};
const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
const base = 'http://localhost:3335/api/v1';
const password = 'Integration-password-2026';
let server;
let organizationId;
let customerId;
let otherCustomerId;
let actorId;
let readyVersionId;
let pendingVersionId;
let deniedVersionId;
let applicationVersionId;
let utilityUnitId;

class Client {
  cookies = new Map();

  async call(path, method = 'GET', body, headers = {}) {
    const response = await fetch(`${base}/${path}`, {
      method,
      headers: {
        origin: env.WEB_ORIGIN,
        'x-requested-with': 'MouraSolar',
        'content-type': 'application/json',
        cookie: [...this.cookies].map(([name, value]) => `${name}=${value}`).join('; '),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    for (const cookie of response.headers.getSetCookie()) {
      const [name, value] = cookie.split(';')[0].split('=');
      this.cookies.set(name, value);
    }
    const text = await response.text();
    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
    return { status: response.status, body: parsed };
  }
}

const admin = new Client();

async function start() {
  server = spawn('node', ['apps/api/dist/main.js'], { env, stdio: ['ignore', 'ignore', 'ignore'] });
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      if ((await fetch(`${base}/health/ready`)).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('API test server did not become ready');
}

async function createReadyDocument(ownerCustomerId, persistenceState, verified, suffix) {
  const sha256 = suffix.padEnd(64, '0');
  const object = await db.storedObject.create({
    data: {
      organizationId,
      backend: 'MINIO',
      bucket: 'energy-import-integration',
      key: `${randomUUID()}.pdf`,
      sha256,
      byteSize: 1024,
      verified,
      scanResult: verified ? 'CLEAN' : 'UNCHECKED',
    },
  });
  const document = await db.dossierDocument.create({
    data: {
      organizationId,
      customerId: ownerCustomerId,
      category: 'UTILITY_BILL',
      title: `Conta de teste ${suffix}`,
      createdBy: actorId,
    },
  });
  const version = await db.dossierDocumentVersion.create({
    data: {
      documentId: document.id,
      versionNumber: 1,
      originalName: `${suffix}.pdf`,
      fileSize: 1024,
      declaredMime: 'application/pdf',
      verifiedMime: 'application/pdf',
      sha256,
      persistenceState,
      storedObjectId: object.id,
      authorId: actorId,
    },
  });
  return version.id;
}

before(async () => {
  await db.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  const migration = spawnSync(
    'pnpm',
    ['--filter', '@moura-solar/database', 'exec', 'prisma', 'migrate', 'deploy'],
    { env, encoding: 'utf8' },
  );
  assert.equal(migration.status, 0, migration.stdout + migration.stderr);
  await start();

  const bootstrap = await admin.call(
    'identity/bootstrap',
    'POST',
    {
      name: 'Admin Importação',
      organization: 'Moura Solar Importação Teste',
      email: 'admin-energy-import@mourasolar.test',
      password,
    },
    { 'x-bootstrap-token': env.BOOTSTRAP_TOKEN },
  );
  assert.equal(bootstrap.status, 201);
  assert.equal(
    (
      await admin.call('identity/login', 'POST', {
        email: 'admin-energy-import@mourasolar.test',
        password,
      })
    ).status,
    201,
  );
  const context = await admin.call('identity/me');
  organizationId = context.body.organizationId;
  actorId = context.body.userId;

  for (const name of ['Cliente da importação', 'Outro cliente']) {
    const response = await admin.call('customers', 'POST', { kind: 'PERSON', legalName: name });
    assert.equal(response.status, 201, JSON.stringify(response.body));
    if (!customerId) customerId = response.body.id;
    else otherCustomerId = response.body.id;
  }

  const unit = await admin.call(`customers/${customerId}/utility-units`, 'POST', {
    distributorName: 'Distribuidora de teste',
    externalCode: 'IMPORT-OWN-CUSTOMER',
    consumerClass: 'RESIDENTIAL',
    tariffMode: 'CONVENTIONAL',
    connectionType: 'BIPHASIC',
    voltage: '220V',
  });
  assert.equal(unit.status, 201, JSON.stringify(unit.body));
  utilityUnitId = unit.body.id;

  readyVersionId = await createReadyDocument(customerId, 'READY', true, 'a');
  pendingVersionId = await createReadyDocument(customerId, 'QUARANTINED', false, 'b');
  deniedVersionId = await createReadyDocument(otherCustomerId, 'READY', true, 'c');
  applicationVersionId = await createReadyDocument(customerId, 'READY', true, 'd');
});

after(async () => {
  if (server?.exitCode === null) {
    server.kill();
    await new Promise((resolve) => server.once('exit', resolve));
  }
  await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await db.$disconnect();
});

test('READY intake writes one queued import and a minimal outbox event atomically and idempotently', async () => {
  const input = { documentVersionId: readyVersionId };
  const headers = { 'idempotency-key': 'energy-import-ready-intake-key' };
  const created = await admin.call(
    `customers/${customerId}/energy-imports`,
    'POST',
    input,
    headers,
  );
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.status, 'QUEUED');
  assert.equal(created.body.version, 1);
  assert.equal(created.body.documentVersionId, readyVersionId);

  const replay = await admin.call(`customers/${customerId}/energy-imports`, 'POST', input, headers);
  assert.equal(replay.status, 201);
  assert.equal(replay.body.id, created.body.id);

  const [record, outbox] = await Promise.all([
    db.energyBillImport.findUnique({ where: { id: created.body.id } }),
    db.importOutbox.findMany({ where: { importId: created.body.id } }),
  ]);
  assert.equal(record.status, 'QUEUED');
  assert.equal(outbox.length, 1);
  assert.equal(outbox[0].status, 'PENDING');
  assert.deepEqual(outbox[0].payload, {
    importId: created.body.id,
    documentVersionId: readyVersionId,
  });

  const status = await admin.call(`energy-imports/${created.body.id}`);
  assert.equal(status.status, 200);
  assert.equal(status.body.id, created.body.id);
  assert.equal(status.body.status, 'QUEUED');

  const changedPayload = await admin.call(
    `customers/${customerId}/energy-imports`,
    'POST',
    { documentVersionId: pendingVersionId },
    headers,
  );
  assert.equal(changedPayload.status, 409);
});

test('intake rejects a document until READY and refuses a document owned by another customer', async () => {
  const beforeCount = await db.energyBillImport.count();
  const pending = await admin.call(
    `customers/${customerId}/energy-imports`,
    'POST',
    { documentVersionId: pendingVersionId },
    { 'idempotency-key': 'energy-import-pending-document-key' },
  );
  assert.equal(pending.status, 422);
  assert.equal(pending.body.code, 'DOCUMENT_NOT_READY');

  const crossCustomer = await admin.call(
    `customers/${customerId}/energy-imports`,
    'POST',
    { documentVersionId: deniedVersionId },
    { 'idempotency-key': 'energy-import-cross-customer-key' },
  );
  assert.equal(crossCustomer.status, 404);
  assert.equal(await db.energyBillImport.count(), beforeCount);
});

test('intake validates that selected utility units and opportunities belong to the same customer', async () => {
  const unit = await admin.call(`customers/${otherCustomerId}/utility-units`, 'POST', {
    distributorName: 'Distribuidora de teste',
    externalCode: 'IMPORT-OTHER-CUSTOMER',
    consumerClass: 'RESIDENTIAL',
    tariffMode: 'CONVENTIONAL',
    connectionType: 'BIPHASIC',
    voltage: '220V',
  });
  assert.equal(unit.status, 201, JSON.stringify(unit.body));

  const crossCustomerUnit = await admin.call(
    `customers/${customerId}/energy-imports`,
    'POST',
    { documentVersionId: readyVersionId, utilityUnitId: unit.body.id },
    { 'idempotency-key': 'energy-import-cross-unit-key' },
  );
  assert.equal(crossCustomerUnit.status, 404);
  assert.equal(await db.energyBillImport.count(), 1);

  const secondUnit = await admin.call(`customers/${customerId}/utility-units`, 'POST', {
    distributorName: 'Outra distribuidora de teste',
    externalCode: 'IMPORT-SECOND-UNIT',
  });
  assert.equal(secondUnit.status, 201, JSON.stringify(secondUnit.body));
  const opportunity = await admin.call('opportunities', 'POST', {
    customerId,
    utilityUnitId: secondUnit.body.id,
    title: 'Oportunidade vinculada a outra UC',
    needSummary: 'Verificar consistência entre importação e oportunidade',
    firstActivity: {
      type: 'CALL',
      subject: 'Revisar conta de energia',
      dueAt: new Date(Date.now() + 86400000).toISOString(),
    },
  });
  assert.equal(opportunity.status, 201, JSON.stringify(opportunity.body));
  const mismatch = await admin.call(
    `customers/${customerId}/energy-imports`,
    'POST',
    {
      documentVersionId: readyVersionId,
      utilityUnitId,
      opportunityId: opportunity.body.id,
    },
    { 'idempotency-key': 'energy-import-opportunity-unit-mismatch-key' },
  );
  assert.equal(mismatch.status, 409);
  assert.equal(mismatch.body.code, 'OPPORTUNITY_UTILITY_UNIT_MISMATCH');
  assert.equal(await db.energyBillImport.count(), 1);
});

test('create and status endpoints require their distinct effective grants', async () => {
  const membership = await db.membership.findFirst({
    where: { userId: actorId, organizationId },
    select: { roleId: true },
  });
  const permissions = [
    'energy_imports:create',
    'energy_imports:read',
    'energy_imports:review',
    'energy_imports:confirm',
  ];
  const grants = await db.roleGrant.findMany({
    where: { roleId: membership.roleId, permission: { in: permissions } },
  });
  await db.roleGrant.deleteMany({
    where: { roleId: membership.roleId, permission: { in: permissions } },
  });
  try {
    const deniedCreate = await admin.call(
      `customers/${customerId}/energy-imports`,
      'POST',
      { documentVersionId: readyVersionId },
      { 'idempotency-key': 'energy-import-denied-create-key' },
    );
    assert.equal(deniedCreate.status, 403);
    const deniedRead = await admin.call('energy-imports/00000000-0000-4000-8000-000000000000');
    assert.equal(deniedRead.status, 403);
    const deniedReview = await admin.call(
      'energy-imports/00000000-0000-4000-8000-000000000000/review',
      'PUT',
      {
        expectedVersion: 1,
        months: [{ referenceMonth: '2026-08', decision: 'INSERT', consumptionKwh: '100' }],
      },
      { 'idempotency-key': 'energy-import-denied-review-key' },
    );
    assert.equal(deniedReview.status, 403);
    const deniedConfirm = await admin.call(
      'energy-imports/00000000-0000-4000-8000-000000000000/confirm',
      'POST',
      {
        expectedVersion: 1,
        reviewId: '00000000-0000-4000-8000-000000000000',
        reviewDigest: 'a'.repeat(64),
      },
      { 'idempotency-key': 'energy-import-denied-confirm-key' },
    );
    assert.equal(deniedConfirm.status, 403);
  } finally {
    await db.roleGrant.createMany({
      data: grants,
      skipDuplicates: true,
    });
  }
});

test('manual review is immutable and confirmation atomically applies versions with a replayable receipt', async () => {
  const manualReading = await admin.call(
    `utility-units/${utilityUnitId}/readings`,
    'POST',
    { referenceMonth: '2026-05', consumptionKwh: 400.5 },
    { 'idempotency-key': 'energy-import-seed-reading-key' },
  );
  assert.equal(manualReading.status, 200, JSON.stringify(manualReading.body));

  const created = await admin.call(
    `customers/${customerId}/energy-imports`,
    'POST',
    { documentVersionId: applicationVersionId, utilityUnitId },
    { 'idempotency-key': 'energy-import-review-intake-key' },
  );
  assert.equal(created.status, 201, JSON.stringify(created.body));

  const initialReview = {
    expectedVersion: 1,
    months: [
      {
        referenceMonth: '2026-05',
        decision: 'REPLACE',
        expectedReadingVersion: 1,
        consumptionKwh: '410.25',
        injectedKwh: '5.00',
        billedAmount: '123.45',
        reason: 'Conferida na fatura original.',
      },
      {
        referenceMonth: '2026-08',
        decision: 'INSERT',
        consumptionKwh: '500.00',
        injectedKwh: '10.00',
        billedAmount: '450.00',
      },
    ],
  };
  const reviewHeaders = { 'idempotency-key': 'energy-import-review-first-key' };
  const reviewed = await admin.call(
    `energy-imports/${created.body.id}/review`,
    'PUT',
    initialReview,
    reviewHeaders,
  );
  assert.equal(reviewed.status, 200, JSON.stringify(reviewed.body));
  assert.equal(reviewed.body.status, 'REVIEW_REQUIRED');
  assert.equal(reviewed.body.version, 2);
  assert.equal(reviewed.body.latestReview.revision, 1);
  assert.equal(typeof reviewed.body.latestReview.digest, 'string');

  const replayReview = await admin.call(
    `energy-imports/${created.body.id}/review`,
    'PUT',
    initialReview,
    reviewHeaders,
  );
  assert.equal(replayReview.body.latestReview.id, reviewed.body.latestReview.id);
  assert.equal(await db.extractionCandidate.count({ where: { importId: created.body.id } }), 6);

  const mayReading = await db.energyReading.findFirst({
    where: { utilityUnitId, referenceMonth: '2026-05', status: 'ACTIVE' },
  });
  const interveningCorrection = await admin.call(
    `utility-units/${utilityUnitId}/readings/${mayReading.id}/corrections`,
    'POST',
    {
      referenceMonth: '2026-05',
      expectedVersion: 1,
      consumptionKwh: 402.5,
      correctionReason: 'Ajuste manual concorrente para testar CAS.',
    },
    { 'idempotency-key': 'energy-import-intervening-correction-key' },
  );
  assert.equal(interveningCorrection.status, 200, JSON.stringify(interveningCorrection.body));

  const staleConfirm = await admin.call(
    `energy-imports/${created.body.id}/confirm`,
    'POST',
    {
      expectedVersion: reviewed.body.version,
      reviewId: reviewed.body.latestReview.id,
      reviewDigest: reviewed.body.latestReview.digest,
    },
    { 'idempotency-key': 'energy-import-stale-confirm-key' },
  );
  assert.equal(staleConfirm.status, 409);
  assert.equal(staleConfirm.body.code, 'CONCURRENT_MODIFICATION');
  assert.equal(
    await db.energyReading.count({ where: { utilityUnitId, referenceMonth: '2026-08' } }),
    0,
  );

  const revisedInput = {
    ...initialReview,
    expectedVersion: reviewed.body.version,
    months: initialReview.months.map((month) =>
      month.referenceMonth === '2026-05'
        ? { ...month, expectedReadingVersion: 2, consumptionKwh: '415.25' }
        : month,
    ),
  };
  const revised = await admin.call(
    `energy-imports/${created.body.id}/review`,
    'PUT',
    revisedInput,
    { 'idempotency-key': 'energy-import-review-second-key' },
  );
  assert.equal(revised.status, 200, JSON.stringify(revised.body));
  assert.equal(revised.body.latestReview.revision, 2);
  assert.equal(revised.body.version, 3);

  const confirmInput = {
    expectedVersion: revised.body.version,
    reviewId: revised.body.latestReview.id,
    reviewDigest: revised.body.latestReview.digest,
  };
  const confirmHeaders = { 'idempotency-key': 'energy-import-final-confirm-key' };
  const receipt = await admin.call(
    `energy-imports/${created.body.id}/confirm`,
    'POST',
    confirmInput,
    confirmHeaders,
  );
  assert.equal(receipt.status, 200, JSON.stringify(receipt.body));
  assert.equal(receipt.body.status, 'APPLIED');
  assert.equal(receipt.body.readingChanges.length, 2);

  const replay = await admin.call(
    `energy-imports/${created.body.id}/confirm`,
    'POST',
    confirmInput,
    confirmHeaders,
  );
  const replayWithNewKey = await admin.call(
    `energy-imports/${created.body.id}/confirm`,
    'POST',
    confirmInput,
    { 'idempotency-key': 'energy-import-second-confirm-key' },
  );
  assert.deepEqual(replay.body, receipt.body);
  assert.deepEqual(replayWithNewKey.body, receipt.body);

  const incompatible = await admin.call(
    `energy-imports/${created.body.id}/confirm`,
    'POST',
    { ...confirmInput, reviewDigest: 'f'.repeat(64) },
    { 'idempotency-key': 'energy-import-incompatible-confirm-key' },
  );
  assert.equal(incompatible.status, 409);
  assert.equal(incompatible.body.code, 'IMPORT_ALREADY_APPLIED');

  const activeReadings = await db.energyReading.findMany({
    where: { utilityUnitId, referenceMonth: { in: ['2026-05', '2026-08'] }, status: 'ACTIVE' },
    orderBy: { referenceMonth: 'asc' },
  });
  assert.deepEqual(
    activeReadings.map((reading) => [reading.referenceMonth, reading.version, reading.source]),
    [
      ['2026-05', 3, 'IMPORT'],
      ['2026-08', 1, 'IMPORT'],
    ],
  );
  assert.ok(activeReadings.every((reading) => reading.sourceImportId === created.body.id));
  assert.equal(
    await db.energyReadingRevision.count({ where: { sourceImportId: created.body.id } }),
    2,
  );
  assert.equal(
    await db.importOutbox.count({ where: { importId: created.body.id, status: 'PENDING' } }),
    2,
  );
  assert.equal(
    await db.documentUtilityUnitLink.count({
      where: { utilityUnitId, document: { versions: { some: { id: applicationVersionId } } } },
    }),
    1,
  );

  const status = await admin.call(`energy-imports/${created.body.id}`);
  assert.equal(status.body.status, 'APPLIED');
  assert.equal(status.body.latestReview.revision, 2);
  assert.deepEqual(status.body.applicationReceipt, receipt.body);
});
