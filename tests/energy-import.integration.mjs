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

  readyVersionId = await createReadyDocument(customerId, 'READY', true, 'a');
  pendingVersionId = await createReadyDocument(customerId, 'QUARANTINED', false, 'b');
  deniedVersionId = await createReadyDocument(otherCustomerId, 'READY', true, 'c');
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
});

test('create and status endpoints require their distinct effective grants', async () => {
  const membership = await db.membership.findFirst({
    where: { userId: actorId, organizationId },
    select: { roleId: true },
  });
  const createGrant = await db.roleGrant.findUnique({
    where: {
      roleId_permission: { roleId: membership.roleId, permission: 'energy_imports:create' },
    },
  });
  const readGrant = await db.roleGrant.findUnique({
    where: { roleId_permission: { roleId: membership.roleId, permission: 'energy_imports:read' } },
  });
  await db.roleGrant.deleteMany({
    where: {
      roleId: membership.roleId,
      permission: { in: ['energy_imports:create', 'energy_imports:read'] },
    },
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
  } finally {
    await db.roleGrant.createMany({
      data: [createGrant, readGrant].filter(Boolean),
      skipDuplicates: true,
    });
  }
});
