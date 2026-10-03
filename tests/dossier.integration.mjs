import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { randomUUID, createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { storageEnv } from './storage-env.mjs';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const { PrismaClient } = require('@prisma/client');
const PDFDocument = require('pdfkit');
const { StorageService } = require('./dist/proposal/storage.service.js');
const { ScannerService } = require('./dist/dossier/scanner.service.js');
const url = new URL(
  process.env.TEST_DATABASE_URL ?? 'postgresql://moura:change-me-local@localhost:5433/moura_solar',
);
const schema = `test_dos_${randomUUID().replaceAll('-', '')}`;
url.searchParams.set('schema', schema);
const env = {
  ...process.env,
  ...storageEnv,
  PATH: `${process.cwd()}/.bin:${process.env.PATH}`,
  DATABASE_URL: url.toString(),
  NODE_ENV: 'test',
  API_PORT: '3329',
  WEB_ORIGIN: 'http://localhost:3320',
  COOKIE_SECURE: 'false',
  IDENTITY_LINK_SECRET: 'integration-test-link-secret-at-least-32-characters',
  BOOTSTRAP_TOKEN: 'integration-test-bootstrap-at-least-32-characters',
};
const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
const config = { get: (key) => env[key], getOrThrow: (key) => env[key] };
const storage = new StorageService(config);
const scanner = new ScannerService(config);
let server;
const base = 'http://localhost:3329/api/v1';
const password = 'Integration-password-2026';
class Client {
  cookies = new Map();
  async call(path, method = 'GET', body, headers = {}) {
    const response = await fetch(`${base}/${path}`, {
      method,
      headers: {
        origin: env.WEB_ORIGIN,
        'x-requested-with': 'MouraSolar',
        'content-type': 'application/json',
        'idempotency-key': randomUUID(),
        cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; '),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    for (const cookie of response.headers.getSetCookie()) {
      const [name, value] = cookie.split(';')[0].split('=');
      this.cookies.set(name, value);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    const json = response.headers.get('content-type')?.includes('application/json');
    return {
      status: response.status,
      body: json ? JSON.parse(buffer.toString()) : undefined,
      buffer,
      headers: response.headers,
    };
  }
}
const admin = new Client();
let customerId, otherCustomerId, organizationId, actorId, documentId, versionId;
let pdf;
function upload(overrides = {}) {
  return {
    title: 'Conta de energia autorizada',
    category: 'UTILITY_BILL',
    fileName: 'conta.pdf',
    declaredMime: 'application/pdf',
    fileSize: pdf.length,
    fileBase64: pdf.toString('base64'),
    ...overrides,
  };
}
async function start(overrides = {}) {
  server = spawn('node', ['apps/api/dist/main.js'], {
    env: { ...env, ...overrides },
    stdio: ['ignore', 'ignore', 'ignore'],
  });
  for (let n = 0; n < 100; n++) {
    try {
      if ((await fetch(`${base}/health/ready`)).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('API test server did not become ready');
}
async function stop() {
  if (server?.exitCode === null) {
    server.kill();
    await new Promise((resolve) => server.once('exit', resolve));
  }
}
before(async () => {
  const migration = spawnSync('pnpm', ['db:deploy'], { env, encoding: 'utf8' });
  assert.equal(migration.status, 0, migration.stdout + migration.stderr);
  // A real scanner must be reachable; no production bypass or fake CLEAN result.
  let ready = false;
  for (let n = 0; n < 90; n++) {
    try {
      await scanner.scan(Buffer.from('scanner readiness'));
      ready = true;
      break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  assert.ok(ready, 'ClamAV must be running with current signatures');
  pdf = await new Promise((resolve) => {
    const doc = new PDFDocument();
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.text('Conta de energia - corpus sintetico autorizado');
    doc.end();
  });
  await start();
  const bootstrap = await admin.call(
    'identity/bootstrap',
    'POST',
    {
      name: 'Admin Dossiê',
      organization: 'Moura Solar Dossiê Test',
      email: 'admin-dossier@mourasolar.test',
      password,
    },
    { 'x-bootstrap-token': env.BOOTSTRAP_TOKEN },
  );
  assert.equal(bootstrap.status, 201);
  assert.equal(
    (
      await admin.call('identity/login', 'POST', {
        email: 'admin-dossier@mourasolar.test',
        password,
      })
    ).status,
    201,
  );
  const me = await admin.call('identity/me');
  organizationId = me.body.organizationId;
  actorId = me.body.userId;
  for (const name of ['Cliente principal', 'Outro cliente']) {
    const res = await admin.call('customers', 'POST', { kind: 'PERSON', legalName: name });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    if (!customerId) customerId = res.body.id;
    else otherCustomerId = res.body.id;
  }
});
after(async () => {
  await stop();
  await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await db.$disconnect();
});

test('DOC-04/07: rejects unsupported MIME, wrong size/hash, fake PDF and missing idempotency key without mutations', async () => {
  const count = await db.dossierDocument.count();
  for (const [changes, status] of [
    [{ fileSize: pdf.length + 1 }, 422],
    [{ sha256: '0'.repeat(64) }, 422],
    [{ declaredMime: 'image/webp' }, 400],
    [{ fileBase64: Buffer.from('<script>fake</script>').toString('base64'), fileSize: 21 }, 415],
  ]) {
    const result = await admin.call(
      `customers/${customerId}/document-uploads`,
      'POST',
      upload(changes),
    );
    assert.equal(result.status, status, JSON.stringify(result.body));
  }
  const missing = await admin.call(`customers/${customerId}/document-uploads`, 'POST', upload(), {
    'idempotency-key': '',
  });
  assert.equal(missing.status, 400);
  assert.equal(await db.dossierDocument.count(), count);
});

test('DOC-04/06/10: real MinIO + ClamAV, concurrent idempotent upload and conflict on changed payload', async () => {
  const key = randomUUID();
  const results = await Promise.all(
    [1, 2].map(() =>
      admin.call(`customers/${customerId}/document-uploads`, 'POST', upload(), {
        'idempotency-key': key,
      }),
    ),
  );
  for (const res of results) assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.equal(results[0].body.id, results[1].body.id);
  documentId = results[0].body.id;
  versionId = results[0].body.currentVersion.id;
  assert.equal(results[0].body.currentVersion.persistenceState, 'READY');
  const version = await db.dossierDocumentVersion.findUnique({
    where: { id: versionId },
    include: { storedObject: true },
  });
  assert.notEqual(version.storedObject.backend, 'LEGACY_LOCAL');
  assert.match(version.storedObject.scannerVersion, /^ClamAV /);
  assert.deepEqual(
    await storage.download(
      version.storedObject.bucket,
      version.storedObject.key,
      version.storedObject.backend,
    ),
    pdf,
  );
  const conflict = await admin.call(
    `customers/${customerId}/document-uploads`,
    'POST',
    upload({ title: 'Outro título' }),
    { 'idempotency-key': key },
  );
  assert.equal(conflict.status, 409);
  assert.equal(await db.dossierDocumentVersion.count({ where: { documentId } }), 1);
});

test('DOC-02: invalid contract, work order and cross-client UC are rejected atomically', async () => {
  const count = await db.dossierDocument.count();
  for (const field of [
    'contractId',
    'workOrderId',
    'representativeId',
    'projectId',
    'utilityUnitId',
  ]) {
    const res = await admin.call(
      `customers/${customerId}/document-uploads`,
      'POST',
      upload({ [field]: randomUUID() }),
    );
    assert.equal(res.status, 422, JSON.stringify(res.body));
  }
  const rep = await admin.call(`customers/${otherCustomerId}/representatives`, 'POST', {
    name: 'Representante sintético',
    role: 'LEGAL_REPRESENTATIVE',
  });
  assert.equal(rep.status, 201);
  const cross = await admin.call(
    `customers/${customerId}/document-uploads`,
    'POST',
    upload({ representativeId: rep.body.id }),
  );
  assert.equal(cross.status, 422);
  assert.equal(await db.dossierDocument.count(), count);
});

test('DOC-06: audited download verifies actual hash, archive preserves bytes/reason and rejects stale version', async () => {
  const result = await admin.call(
    `documents/${documentId}/versions/${versionId}/content?purpose=VIEW`,
  );
  assert.equal(result.status, 200);
  assert.deepEqual(result.buffer, pdf);
  assert.equal(result.headers.get('cache-control'), 'private, no-store, max-age=0');
  const events = await db.documentAccessEvent.findMany({ where: { targetId: documentId } });
  assert.equal(events.at(-1).outcome, 'SUCCESS');
  const stale = await admin.call(`documents/${documentId}/archive`, 'POST', {
    expectedVersion: 9,
    reason: 'Teste',
  });
  assert.equal(stale.status, 409);
  const key = randomUUID();
  const body = { expectedVersion: 1, reason: 'Documento histórico preservado' };
  assert.equal(
    (await admin.call(`documents/${documentId}/archive`, 'POST', body, { 'idempotency-key': key }))
      .status,
    200,
  );
  assert.equal(
    (await admin.call(`documents/${documentId}/archive`, 'POST', body, { 'idempotency-key': key }))
      .status,
    200,
  );
  const doc = await db.dossierDocument.findUnique({ where: { id: documentId } });
  assert.equal(doc.archiveReason, body.reason);
  assert.equal(doc.metadataVersion, 2);
  assert.equal(
    await db.auditEvent.count({ where: { entityId: documentId, action: 'document.archived' } }),
    1,
  );
  assert.deepEqual(
    (await admin.call(`documents/${documentId}/versions/${versionId}/content`)).buffer,
    pdf,
  );
});

test('DOC-04/08: unavailable S3 preserves one intent and retries after API restart without local fallback', async () => {
  await stop();
  await start({ S3_ENDPOINT: 'http://localhost:1' });
  const key = randomUUID();
  const dto = upload({ title: 'Intent survives unavailable backend' });
  const failed = await admin.call(`customers/${customerId}/document-uploads`, 'POST', dto, {
    'idempotency-key': key,
  });
  assert.equal(failed.status, 503);
  const pending = await db.dossierDocumentVersion.findUnique({
    where: { id: failed.body.details.versionId },
    include: { storedObject: true },
  });
  assert.equal(pending.persistenceState, 'UPLOAD_FAILED');
  assert.equal(pending.storedObject.verified, false);
  await stop();
  await start();
  const retry = await admin.call(`customers/${customerId}/document-uploads`, 'POST', dto, {
    'idempotency-key': key,
  });
  assert.equal(retry.status, 201, JSON.stringify(retry.body));
  assert.equal(retry.body.id, failed.body.details.documentId);
  assert.equal(retry.body.currentVersion.persistenceState, 'READY');
});

test('DOC-05/08: unavailable scanner quarantines; restart and reconciliation release the same verified snapshot', async () => {
  await stop();
  await start({ CLAMD_PORT: '1' });
  const res = await admin.call(
    `customers/${customerId}/document-uploads`,
    'POST',
    upload({ title: 'Quarantine while scanner offline' }),
  );
  assert.equal(res.status, 201);
  assert.equal(res.body.currentVersion.persistenceState, 'QUARANTINED');
  const denied = await admin.call(
    `documents/${res.body.id}/versions/${res.body.currentVersion.id}/content`,
  );
  assert.equal(denied.status, 409);
  await stop();
  await start();
  const reconciled = await admin.call(
    `document-uploads/${res.body.currentVersion.id}/reconcile`,
    'POST',
  );
  assert.equal(reconciled.status, 200);
  assert.equal(reconciled.body.currentVersion.persistenceState, 'READY');
});

test('DOC-05: real scanner detects EICAR; PDF with unparsed trailing payload is rejected', async () => {
  const eicar = Buffer.from(
    'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*',
  );
  const scanned = await scanner.scan(eicar);
  assert.equal(scanned.result, 'INFECTED');
  const infectedPdf = Buffer.concat([pdf, Buffer.from('\n% '), eicar]);
  const res = await admin.call(
    `customers/${customerId}/document-uploads`,
    'POST',
    upload({
      title: 'Malware test synthetic fixture',
      fileSize: infectedPdf.length,
      fileBase64: infectedPdf.toString('base64'),
    }),
  );
  assert.equal(res.status, 422);
  assert.equal(res.body.code, 'PDF_UNSAFE');
});

test('DOC-06/10: concurrent completion, immutable old version and replacement CAS', async () => {
  const pending = await admin.call(
    `customers/${customerId}/document-uploads`,
    'POST',
    upload({
      title: 'Versioned document',
      fileBase64: undefined,
      sha256: createHash('sha256').update(pdf).digest('hex'),
    }),
  );
  assert.equal(pending.status, 201);
  const id = pending.body.id;
  const v = pending.body.currentVersion.id;
  const complete = { expectedVersion: 1, fileBase64: pdf.toString('base64') };
  const results = await Promise.all(
    [1, 2].map(() => admin.call(`document-uploads/${v}/complete`, 'POST', complete)),
  );
  for (const res of results) {
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.currentVersion.persistenceState, 'READY');
  }
  const versions = await db.dossierDocumentVersion.findMany({ where: { documentId: id } });
  assert.equal(versions.length, 1);
  await assert.rejects(
    db.dossierDocumentVersion.update({ where: { id: v }, data: { sha256: 'f'.repeat(64) } }),
  );
  const replace = upload({ title: 'Versioned document', expectedVersion: 1 });
  const reps = await Promise.all(
    [1, 2].map(() => admin.call(`documents/${id}/versions`, 'POST', replace)),
  );
  assert.deepEqual(reps.map((r) => r.status).sort(), [201, 409]);
  assert.deepEqual((await admin.call(`documents/${id}/versions/${v}/content`)).buffer, pdf);
  assert.equal((await admin.call(`documents/${id}/history`)).body.versions.length, 2);
});

test('DOC-02/05/07: effective category and assigned-work-order grants; deny cross organization and forbidden identity', async () => {
  const identity = await admin.call(
    `customers/${customerId}/document-uploads`,
    'POST',
    upload({ category: 'IDENTITY', title: 'Sensitive synthetic document' }),
  );
  assert.equal(identity.status, 201);
  const role = await db.role.create({
    data: {
      organizationId,
      name: 'Dossier test installer',
      grants: {
        create: [
          { permission: 'documents:read', scope: 'assigned' },
          { permission: 'documents:upload', scope: 'assigned' },
        ],
      },
    },
  });
  const membership = await db.membership.findFirst({ where: { userId: actorId, organizationId } });
  const originalRole = membership.roleId;
  const opp = await db.opportunity.create({
    data: {
      organizationId,
      customerId,
      ownerUserId: actorId,
      code: 'DOS-001',
      title: 'Fixture opportunity',
      needSummary: 'Synthetic fixture',
    },
  });
  const project = await db.operationalProject.create({
    data: { organizationId, opportunityId: opp.id, code: 'DOS-PROJ', title: 'Fixture project' },
  });
  const order = await db.workOrder.create({
    data: {
      organizationId,
      projectId: project.id,
      code: 'DOS-OS',
      title: 'Assigned installation',
      assignedLeaderId: actorId,
    },
  });
  const photo = await admin.call(
    `customers/${customerId}/document-uploads`,
    'POST',
    upload({ category: 'PHOTO_BEFORE', title: 'Work order photo evidence', workOrderId: order.id }),
  );
  assert.equal(photo.status, 201);
  assert.equal((await db.workOrder.findUnique({ where: { id: order.id } })).state, 'DRAFT');
  assert.equal(
    (await db.operationalProject.findUnique({ where: { id: project.id } })).state,
    'PREPARATION',
  );
  const context = await admin.call(`customers/${customerId}/document-context`);
  assert.equal(context.status, 200);
  const otherOrg = await db.organization.create({
    data: { name: 'Other organization', slug: `other-${randomUUID()}` },
  });
  const foreign = await db.customer.create({
    data: { organizationId: otherOrg.id, kind: 'PERSON', legalName: 'Other tenant fixture' },
  });
  assert.equal((await admin.call(`customers/${foreign.id}/documents`)).status, 404);
  await db.membership.update({ where: { id: membership.id }, data: { roleId: role.id } });
  try {
    const list = await admin.call(`customers/${customerId}/documents`);
    assert.equal(list.status, 200);
    const context = await admin.call(`customers/${customerId}/document-context`);
    assert.equal(context.status, 200);
    assert.deepEqual(context.body.categories, ['PHOTO_BEFORE', 'PHOTO_DURING', 'PHOTO_AFTER']);
    assert.equal(context.body.workOrders[0].id, order.id);
    assert.ok(list.body.every((d) => d.category.startsWith('PHOTO_')));
    assert.ok(list.body.some((d) => d.id === photo.body.id));
    assert.equal(
      (
        await admin.call(
          `documents/${identity.body.id}/versions/${identity.body.currentVersion.id}/content`,
        )
      ).status,
      404,
    );
    assert.equal(
      (
        await admin.call(
          `customers/${customerId}/document-uploads`,
          'POST',
          upload({ category: 'IDENTITY' }),
        )
      ).status,
      403,
    );
    assert.equal((await admin.call(`customers/${customerId}/representatives`)).status, 403);
    await db.workOrder.update({ where: { id: order.id }, data: { assignedLeaderId: null } });
    assert.equal(
      (
        await admin.call(
          `documents/${photo.body.id}/versions/${photo.body.currentVersion.id}/content`,
        )
      ).status,
      404,
    );
  } finally {
    await db.membership.update({ where: { id: membership.id }, data: { roleId: originalRole } });
  }
  await assert.rejects(
    db.documentOpportunityLink.create({
      data: {
        documentId: identity.body.id,
        opportunityId: (
          await db.opportunity.create({
            data: {
              organizationId,
              customerId: otherCustomerId,
              ownerUserId: actorId,
              code: 'DOS-002',
              title: 'Other customer fixture',
              needSummary: 'Test',
            },
          })
        ).id,
      },
    }),
  );
  await assert.rejects(
    db.opportunity.update({ where: { id: opp.id }, data: { customerId: otherCustomerId } }),
  );
  assert.equal(
    (await admin.call(`customers/${customerId}/documents?from=invalid-date`)).status,
    400,
  );
  assert.equal(
    (await admin.call(`customers/${customerId}/documents?status=ARCHIVED`)).body.length,
    1,
  );
});

test('DOC-06/08: crash-equivalent DB rollback after PUT recovers the persisted intent and audits read failures', async () => {
  await db.$executeRawUnsafe(
    `CREATE FUNCTION fail_verification() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.verified THEN RAISE EXCEPTION 'injected rollback after PUT'; END IF; RETURN NEW; END $$`,
  );
  await db.$executeRawUnsafe(
    `CREATE TRIGGER test_verification_failure BEFORE UPDATE ON stored_objects FOR EACH ROW EXECUTE FUNCTION fail_verification()`,
  );
  let failed;
  try {
    failed = await admin.call(
      `customers/${customerId}/document-uploads`,
      'POST',
      upload({ title: 'Recovery after object PUT and database rollback' }),
    );
    assert.equal(failed.status, 500);
  } finally {
    await db.$executeRawUnsafe('DROP TRIGGER test_verification_failure ON stored_objects');
    await db.$executeRawUnsafe('DROP FUNCTION fail_verification()');
  }
  const doc = await db.dossierDocument.findFirst({
    where: { title: 'Recovery after object PUT and database rollback' },
    include: { versions: { include: { storedObject: true } } },
  });
  const v = doc.versions[0];
  assert.equal(v.persistenceState, 'PENDING_UPLOAD');
  assert.deepEqual(
    await storage.download(v.storedObject.bucket, v.storedObject.key, v.storedObject.backend),
    pdf,
  );
  await stop();
  await start();
  const recovered = await admin.call(`document-uploads/${v.id}/reconcile`, 'POST');
  assert.equal(recovered.status, 200);
  assert.equal(recovered.body.currentVersion.persistenceState, 'READY');
  assert.equal(await db.storedObject.count({ where: { id: v.storedObject.id } }), 1);
  await stop();
  await start({ S3_ENDPOINT: 'http://localhost:1' });
  const missing = await admin.call(`documents/${doc.id}/versions/${v.id}/content`);
  assert.equal(missing.status, 503);
  assert.equal(
    (
      await db.documentAccessEvent.findFirst({
        where: { targetId: doc.id },
        orderBy: { occurredAt: 'desc' },
      })
    ).outcome,
    'ERROR',
  );
  assert.equal(
    (await db.dossierDocumentVersion.findUnique({ where: { id: v.id } })).persistenceState,
    'MISSING',
  );
  await stop();
  await start();
  assert.equal(
    (await admin.call(`document-uploads/${v.id}/reconcile`, 'POST')).body.currentVersion
      .persistenceState,
    'READY',
  );
});

test('DOC-03: origin projections respect filters and delegate exact historical bytes with original permissions', async () => {
  const opps = await db.opportunity.findMany({ where: { organizationId, customerId }, take: 1 });
  const opp = opps[0];
  // Minimal proposal graph with immutable source documents; no dossier byte duplication.
  const proposal = await db.proposal.create({
    data: { organizationId, opportunityId: opp.id, code: 'DOS-PROP' },
  });
  const design = await db.design.create({ data: { organizationId, opportunityId: opp.id } });
  const dv = await db.designVersion.create({
    data: {
      organizationId,
      designId: design.id,
      versionNumber: 1,
      targetMonthlyGenerationKwh: 100,
      targetConsumptionKwh: 100,
      dcPowerKwp: 1,
      acPowerKw: 1,
      estimatedMonthlyGenerationKwh: 100,
      estimatedAnnualGenerationKwh: 1200,
      assumptionsSnapshot: {},
    },
  });
  const pv = await db.proposalVersion.create({
    data: {
      organizationId,
      proposalId: proposal.id,
      versionNumber: 1,
      designVersionId: dv.id,
      customerSnapshot: {},
      utilityUnitSnapshot: {},
      technicalSnapshot: {},
      commercialSnapshot: {},
      finalPrice: 100,
      contentHash: 'b'.repeat(64),
    },
  });
  const stored = await storage.upload(env.S3_BUCKET, `dossier-origin/${randomUUID()}.pdf`, pdf);
  const doc = await db.proposalDocument.create({
    data: {
      organizationId,
      proposalVersionId: pv.id,
      fileName: 'historical.pdf',
      fileSize: pdf.length,
      mimeType: 'application/pdf',
      s3Bucket: stored.bucket,
      s3Key: stored.key,
      contentHash: stored.sha256,
    },
  });
  const list = await admin.call(
    `customers/${customerId}/documents?opportunityId=${opp.id}&category=COMMERCIAL_PROPOSAL`,
  );
  assert.equal(list.status, 200);
  assert.equal(list.body.length, 1);
  assert.equal(list.body[0].id, doc.id);
  assert.equal(list.body[0].currentVersion.persistenceState, 'READY');
  assert.deepEqual((await admin.call(list.body[0].contentUrl.replace('/api/v1/', ''))).buffer, pdf);
  assert.equal(
    (
      await admin.call(
        `customers/${customerId}/documents?opportunityId=${randomUUID()}&category=COMMERCIAL_PROPOSAL`,
      )
    ).body.length,
    0,
  );
  assert.equal(
    (
      await admin.call(
        `customers/${customerId}/documents?status=ARCHIVED&category=COMMERCIAL_PROPOSAL`,
      )
    ).body.length,
    0,
  );
  assert.equal(
    (
      await admin.call(
        `customers/${customerId}/documents?from=2099-01-01&category=COMMERCIAL_PROPOSAL`,
      )
    ).body.length,
    0,
  );
  assert.equal(await db.dossierDocument.count({ where: { id: doc.id } }), 0);
  const contract = await db.contract.create({
    data: {
      organizationId,
      opportunityId: opp.id,
      acceptedProposalVersionId: pv.id,
      code: 'DOS-CONTRACT',
    },
  });
  const contractVersions = [];
  for (const versionNumber of [1, 2])
    contractVersions.push(
      await db.contractVersion.create({
        data: {
          organizationId,
          contractId: contract.id,
          versionNumber,
          status: 'READY',
          partySnapshot: {},
          technicalSnapshot: {},
          commercialSnapshot: {},
          scopeSnapshot: {},
          clausesSnapshot: {},
          contentHash: 'c'.repeat(64),
        },
      }),
    );
  const original = await db.contractDocument.create({
    data: {
      organizationId,
      contractVersionId: contractVersions[0].id,
      type: 'PDF_CONTRACT',
      fileName: 'historical-contract.pdf',
      fileSize: pdf.length,
      mimeType: 'application/pdf',
      s3Bucket: stored.bucket,
      s3Key: stored.key,
      contentHash: stored.sha256,
    },
  });
  const latestBytes = Buffer.concat([pdf, Buffer.from('\n\n')]);
  const latest = await storage.upload(
    env.S3_BUCKET,
    `dossier-origin/${randomUUID()}.pdf`,
    latestBytes,
  );
  await db.contractDocument.create({
    data: {
      organizationId,
      contractVersionId: contractVersions[1].id,
      type: 'PDF_CONTRACT',
      fileName: 'latest-contract.pdf',
      fileSize: latestBytes.length,
      mimeType: 'application/pdf',
      s3Bucket: latest.bucket,
      s3Key: latest.key,
      contentHash: latest.sha256,
    },
  });
  await db.contract.update({
    where: { id: contract.id },
    data: { activeVersionId: contractVersions[1].id },
  });
  const contracts = await admin.call(
    `customers/${customerId}/documents?category=CONTRACT_ANNEX&opportunityId=${opp.id}`,
  );
  assert.equal(contracts.body.length, 2);
  const historical = contracts.body.find((d) => d.id === original.id);
  assert.equal(historical.currentVersion.versionNumber, 1);
  assert.deepEqual((await admin.call(historical.contentUrl.replace('/api/v1/', ''))).buffer, pdf);
  assert.equal(
    (
      await admin.call(
        `customers/${customerId}/documents?category=CONTRACT_ANNEX&opportunityId=${randomUUID()}`,
      )
    ).body.length,
    0,
  );
  const membership = await db.membership.findFirst({ where: { userId: actorId, organizationId } });
  const role = await db.role.create({
    data: {
      organizationId,
      name: 'Origin metadata without download',
      grants: {
        create: [
          { permission: 'documents:read', scope: 'organization' },
          { permission: 'proposals:read', scope: 'organization' },
          { permission: 'contracts:read', scope: 'organization' },
        ],
      },
    },
  });
  await db.membership.update({ where: { id: membership.id }, data: { roleId: role.id } });
  try {
    assert.equal(
      (await admin.call(`dossier/contract-documents/${original.id}/content`)).status,
      403,
    );
    assert.equal((await admin.call(`dossier/proposal-documents/${doc.id}/content`)).status, 403);
    const denied = await db.documentAccessEvent.findMany({
      where: { targetId: original.id, outcome: 'DENIED' },
    });
    assert.equal(denied.length, 1);
  } finally {
    await db.membership.update({
      where: { id: membership.id },
      data: { roleId: membership.roleId },
    });
  }
});

test('DOC-08/09: restore PostgreSQL dump and object copies to a fresh schema/bucket; verify hash and authenticated access', async () => {
  const restoredSchema = `restore_dos_${randomUUID().replaceAll('-', '')}`;
  const restoredUrl = new URL(url);
  restoredUrl.searchParams.set('schema', restoredSchema);
  const restoredDb = new PrismaClient({ datasources: { db: { url: restoredUrl.toString() } } });
  const container = process.env.TEST_POSTGRES_CONTAINER ?? 'moura-solar-platform-postgres-1';
  const dump = spawnSync(
    'docker',
    [
      'exec',
      container,
      'pg_dump',
      '-U',
      decodeURIComponent(url.username),
      '-d',
      url.pathname.slice(1),
      '--schema',
      schema,
      '--no-owner',
      '--no-privileges',
    ],
    { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
  );
  assert.equal(dump.status, 0, 'Isolated pg_dump must succeed');
  const bucket = `restore-dossier-${randomUUID().replaceAll('-', '')}`;
  const sql = dump.stdout.replaceAll(schema, restoredSchema).replaceAll(env.S3_BUCKET, bucket);
  const restored = spawnSync(
    'docker',
    [
      'exec',
      '-i',
      container,
      'psql',
      '-U',
      decodeURIComponent(url.username),
      '-d',
      url.pathname.slice(1),
      '-v',
      'ON_ERROR_STOP=1',
    ],
    { input: sql, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
  );
  assert.equal(restored.status, 0, 'Isolated psql restore must succeed');
  try {
    const source = await db.storedObject.findMany({ where: { organizationId, verified: true } });
    const manifest = [];
    for (const object of source) {
      const bytes = await storage.download(object.bucket, object.key, object.backend);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), object.sha256);
      await storage.upload(bucket, object.key, bytes);
      manifest.push({ id: object.id, sha256: object.sha256, byteSize: object.byteSize });
    }
    assert.ok(manifest.length > 0);
    for (const entry of manifest) {
      const object = await restoredDb.storedObject.findUnique({ where: { id: entry.id } });
      const bytes = await storage.download(object.bucket, object.key, object.backend);
      assert.equal(bytes.length, entry.byteSize);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256);
    }
    await stop();
    await start({ DATABASE_URL: restoredUrl.toString() });
    const read = await admin.call(`documents/${documentId}/versions/${versionId}/content`);
    assert.equal(read.status, 200);
    assert.deepEqual(read.buffer, pdf);
    const unsigned = await new Client().call(
      `documents/${documentId}/versions/${versionId}/content`,
    );
    assert.equal(unsigned.status, 401);
    assert.equal(
      (await restoredDb.dossierDocument.findUnique({ where: { id: documentId } })).status,
      'ARCHIVED',
    );
  } finally {
    await stop();
    await start();
    await restoredDb.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${restoredSchema}" CASCADE`);
    await restoredDb.$disconnect();
  }
});

test('DOC-04/08: explicit legacy migration preserves the source and publishes only a verified durable copy', async () => {
  const key = `legacy-${randomUUID()}.pdf`;
  const directory = `${process.cwd()}/.storage/proposals`;
  const file = `${directory}/legacy-test_${key}`;
  await mkdir(directory, { recursive: true });
  await writeFile(file, pdf, { flag: 'wx' });
  try {
    const stored = await db.storedObject.create({
      data: {
        organizationId,
        backend: 'LEGACY_LOCAL',
        bucket: 'legacy-test',
        key,
        sha256: storage.computeHash(pdf),
        byteSize: pdf.length,
      },
    });
    const doc = await db.dossierDocument.create({
      data: {
        organizationId,
        customerId,
        category: 'UTILITY_BILL',
        title: 'Legacy migration fixture',
        createdBy: actorId,
        versions: {
          create: {
            versionNumber: 1,
            originalName: 'legacy.pdf',
            fileSize: pdf.length,
            declaredMime: 'application/pdf',
            sha256: stored.sha256,
            storedObjectId: stored.id,
            authorId: actorId,
            persistenceState: 'QUARANTINED',
          },
        },
      },
      include: { versions: true },
    });
    const result = await admin.call(`document-uploads/${doc.versions[0].id}/reconcile`, 'POST');
    assert.equal(result.status, 200);
    assert.equal(result.body.currentVersion.persistenceState, 'READY');
    const version = await db.dossierDocumentVersion.findUnique({
      where: { id: doc.versions[0].id },
      include: { storedObject: true },
    });
    assert.notEqual(version.storedObjectId, stored.id);
    assert.notEqual(version.storedObject.backend, 'LEGACY_LOCAL');
    assert.ok(await db.storedObject.findUnique({ where: { id: stored.id } }));
    assert.deepEqual(
      (await admin.call(`documents/${doc.id}/versions/${version.id}/content`)).buffer,
      pdf,
    );
    await assert.rejects(
      db.storedObject.update({
        where: { id: version.storedObjectId },
        data: { key: 'different-object.pdf' },
      }),
    );
  } finally {
    await unlink(file);
  }
});

test('DOC-02/05: own scope validates opportunity ownership on create, replay, list and bytes', async () => {
  const opportunity = await db.opportunity.create({
    data: {
      organizationId,
      customerId,
      ownerUserId: actorId,
      code: 'OWN-DOC-001',
      title: 'Own document context',
      needSummary: 'Synthetic ownership fixture',
    },
  });
  const membership = await db.membership.findFirst({ where: { userId: actorId, organizationId } });
  const role = await db.role.create({
    data: {
      organizationId,
      name: 'Own dossier fixture',
      grants: {
        create: [
          { permission: 'documents:read', scope: 'own' },
          { permission: 'documents:upload', scope: 'own' },
        ],
      },
    },
  });
  await db.membership.update({ where: { id: membership.id }, data: { roleId: role.id } });
  try {
    const key = randomUUID();
    const body = upload({ title: 'Owned opportunity evidence', opportunityId: opportunity.id });
    const created = await admin.call(`customers/${customerId}/document-uploads`, 'POST', body, {
      'idempotency-key': key,
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const context = await admin.call(`customers/${customerId}/document-context`);
    assert.equal(context.status, 200);
    assert.equal(context.body.requiresOpportunity, true);
    assert.ok(context.body.opportunities.some((o) => o.id === opportunity.id));
    const list = await admin.call(`customers/${customerId}/documents`);
    assert.equal(list.status, 200);
    assert.ok(list.body.some((d) => d.id === created.body.id));
    const count = await db.dossierDocument.count();
    const invalid = await admin.call(
      `customers/${customerId}/document-uploads`,
      'POST',
      upload({ title: 'No owned link' }),
    );
    assert.equal(invalid.status, 404);
    assert.equal(await db.dossierDocument.count(), count);
    const otherUser = await db.user.create({
      data: { email: `owner-${randomUUID()}@fixture.test`, name: 'Other fixture owner' },
    });
    await db.opportunity.update({
      where: { id: opportunity.id },
      data: { ownerUserId: otherUser.id },
    });
    assert.equal(
      (
        await admin.call(
          `documents/${created.body.id}/versions/${created.body.currentVersion.id}/content`,
        )
      ).status,
      404,
    );
    assert.equal(
      (
        await admin.call(`customers/${customerId}/document-uploads`, 'POST', body, {
          'idempotency-key': key,
        })
      ).status,
      404,
    );
  } finally {
    await db.membership.update({
      where: { id: membership.id },
      data: { roleId: membership.roleId },
    });
  }
});
