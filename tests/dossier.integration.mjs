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
const schema = `test_dos_${randomUUID().replaceAll('-', '')}`;
url.searchParams.set('schema', schema);

const env = {
  ...process.env,
  PATH: `${process.cwd()}/.bin:/tmp/moura-solar-tools:${process.env.PATH}`,
  DATABASE_URL: url.toString(),
  NODE_ENV: 'test',
  API_PORT: '3329',
  WEB_ORIGIN: 'http://localhost:3320',
  COOKIE_SECURE: 'false',
  S3_ENDPOINT: 'http://localhost:9000',
  S3_ACCESS_KEY: 'test',
  S3_SECRET_KEY: 'test',
  S3_BUCKET: 'test',
  IDENTITY_LINK_SECRET: 'integration-test-link-secret-at-least-32-characters',
  BOOTSTRAP_TOKEN: 'integration-test-bootstrap-at-least-32-characters',
};

const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
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
        cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; '),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    for (const cookie of response.headers.getSetCookie()) {
      const [name, value] = cookie.split(';')[0].split('=');
      this.cookies.set(name, value);
    }
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const text = await response.text();
      try {
        return { status: response.status, body: JSON.parse(text), headers: response.headers };
      } catch {
        return { status: response.status, body: text, headers: response.headers };
      }
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    return { status: response.status, buffer, headers: response.headers };
  }
}

const admin = new Client();
let customerId;
let documentId;
let versionId;

before(async () => {
  const migration = spawnSync('pnpm', ['db:deploy'], { env, encoding: 'utf8' });
  assert.equal(migration.status, 0, migration.stdout + migration.stderr);

  server = spawn('node', ['apps/api/dist/main.js'], { env, stdio: ['ignore', 'ignore', 'pipe'] });
  let errors = '';
  server.stderr.on('data', (chunk) => {
    errors += chunk;
  });

  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      if ((await fetch(`${base}/health/ready`)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }

  const bootstrap = await admin.call('identity/bootstrap', 'POST', {
    name: 'Admin Dossiê',
    organization: 'Moura Solar Dossiê Test',
    email: 'admin-dossier@mourasolar.test',
    password,
  }, { 'x-bootstrap-token': env.BOOTSTRAP_TOKEN });
  assert.equal(bootstrap.status, 201);
});

after(async () => {
  if (server) server.kill();
  await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await db.$disconnect();
});

test('SPEC-013: Criação de Cliente e Representante Legal', async () => {
  // 1. Create customer
  const custRes = await admin.call('customers', 'POST', {
    kind: 'COMPANY',
    legalName: 'Usina Solar Minas Gerais SA',
    tradeName: 'USMG Solar',
    taxId: '12.345.678/0001-99',
    phone: '(31) 98765-4321',
    email: 'contato@usmg.test',
  });
  assert.equal(custRes.status, 201);
  customerId = custRes.body.id;
  assert.ok(customerId);

  // 2. Create customer representative
  const repRes = await admin.call(`customers/${customerId}/representatives`, 'POST', {
    name: 'Carlos Alberto Silva',
    documentNumber: '111.222.333-44',
    role: 'LEGAL_REPRESENTATIVE',
  });
  assert.equal(repRes.status, 201);
  assert.equal(repRes.body.name, 'Carlos Alberto Silva');
  assert.equal(repRes.body.role, 'LEGAL_REPRESENTATIVE');

  // 3. List representatives
  const listReps = await admin.call(`customers/${customerId}/representatives`, 'GET');
  assert.equal(listReps.status, 200);
  assert.equal(listReps.body.length, 1);
  assert.equal(listReps.body[0].name, 'Carlos Alberto Silva');
});

test('SPEC-013: Validação de Magic Bytes rejeita payload malicioso', async () => {
  const fakePdfBase64 = Buffer.from('<html><script>alert("hacked")</script></html>').toString('base64');
  const res = await admin.call(`customers/${customerId}/document-uploads`, 'POST', {
    title: 'Tentativa Arquivo Malicioso',
    category: 'UTILITY_BILL',
    fileName: 'conta.pdf',
    declaredMime: 'application/pdf',
    fileSize: 42,
    fileBase64: fakePdfBase64,
  });
  assert.equal(res.status, 400);
  assert.match(res.body.message, /magic bytes/i);
});

test('SPEC-013: Upload direto de documento autêntico com preservação durável', async () => {
  const validPdfContent = '%PDF-1.4\n1 0 obj\n<< /Title (Conta de Luz Cemig) >>\nendobj\ntrailer\n<< >>\n%%EOF';
  const validPdfBase64 = Buffer.from(validPdfContent).toString('base64');

  const uploadRes = await admin.call(`customers/${customerId}/document-uploads`, 'POST', {
    title: 'Conta de Energia Cemig - Fev/2026',
    category: 'UTILITY_BILL',
    fileName: 'conta-cemig-fev2026.pdf',
    declaredMime: 'application/pdf',
    fileSize: Buffer.byteLength(validPdfContent),
    fileBase64: validPdfBase64,
    purpose: 'Comprovação de consumo inicial e titularidade',
  });

  assert.equal(uploadRes.status, 201);
  assert.equal(uploadRes.body.origin, 'DOSSIER');
  assert.equal(uploadRes.body.category, 'UTILITY_BILL');
  assert.equal(uploadRes.body.status, 'ACTIVE');
  assert.ok(uploadRes.body.currentVersion);
  assert.equal(uploadRes.body.currentVersion.persistenceState, 'READY');
  assert.ok(uploadRes.body.currentVersion.sha256);

  documentId = uploadRes.body.id;
  versionId = uploadRes.body.currentVersion.id;
});

test('SPEC-013: Listagem consolidada e filtros do dossiê', async () => {
  const listAll = await admin.call(`customers/${customerId}/documents`, 'GET');
  assert.equal(listAll.status, 200);
  assert.ok(listAll.body.length >= 1);
  assert.equal(listAll.body[0].id, documentId);

  // Filter by category
  const filtered = await admin.call(`customers/${customerId}/documents?category=UTILITY_BILL`, 'GET');
  assert.equal(filtered.status, 200);
  assert.equal(filtered.body.length, 1);
  assert.equal(filtered.body[0].id, documentId);

  const emptyFilter = await admin.call(`customers/${customerId}/documents?category=PHOTO_AFTER`, 'GET');
  assert.equal(emptyFilter.status, 200);
  assert.equal(emptyFilter.body.length, 0);
});

test('SPEC-013: Download e visualização com registro em trilha de auditoria', async () => {
  const viewRes = await admin.call(
    `documents/${documentId}/versions/${versionId}/content?purpose=VIEW`,
    'GET',
  );
  assert.equal(viewRes.status, 200);
  assert.equal(viewRes.headers.get('content-type'), 'application/pdf');
  assert.match(viewRes.headers.get('content-disposition'), /inline/);
  assert.equal(viewRes.headers.get('cache-control'), 'private, no-store, max-age=0');
  assert.ok(viewRes.headers.get('etag'));

  // Verify audit event persisted in database
  const auditEvents = await db.documentAccessEvent.findMany({
    where: { targetId: documentId, versionId, purpose: 'VIEW' },
  });
  assert.equal(auditEvents.length, 1);
  assert.equal(auditEvents[0].outcome, 'SUCCESS');
  assert.equal(auditEvents[0].targetType, 'DOSSIER');
});

test('SPEC-013: Arquivamento lógico do documento', async () => {
  const archiveRes = await admin.call(`documents/${documentId}/archive`, 'POST', {
    reason: 'Documento substituído por retificação da Cemig',
  });
  assert.equal(archiveRes.status, 200);
  assert.equal(archiveRes.body.success, true);

  // Verify in list
  const listRes = await admin.call(`customers/${customerId}/documents`, 'GET');
  assert.equal(listRes.status, 200);
  const doc = listRes.body.find((d) => d.id === documentId);
  assert.ok(doc);
  assert.equal(doc.status, 'ARCHIVED');
});
