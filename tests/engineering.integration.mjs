import { storageEnv } from './storage-env.mjs';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const { PrismaClient } = require('@prisma/client');

const url = new URL(
  process.env.TEST_DATABASE_URL ??
    process.env.DATABASE_URL ??
    'postgresql://moura:change-me-local@localhost:5433/moura_solar',
);
const schema = `test_eng_${randomUUID().replaceAll('-', '')}`;
url.searchParams.set('schema', schema);

const env = {
  ...process.env,
  PATH: `${process.cwd()}/.bin:/tmp/moura-solar-tools:${process.env.PATH}`,
  DATABASE_URL: url.toString(),
  NODE_ENV: 'test',
  API_PORT: '3325',
  WEB_ORIGIN: 'http://localhost:3320',
  COOKIE_SECURE: 'false',
  ...storageEnv,
  IDENTITY_LINK_SECRET: 'integration-test-link-secret-at-least-32-characters',
  BOOTSTRAP_TOKEN: 'integration-test-bootstrap-at-least-32-characters',
};

const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
let server;
const base = 'http://localhost:3325/api/v1';
const password = 'Integration-password-2026';

class Client {
  cookies = new Map();
  async call(path, method = 'GET', body, key = randomUUID(), headers = {}) {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: {
        origin: env.WEB_ORIGIN,
        'x-requested-with': 'MouraSolar',
        'content-type': 'application/json',
        'idempotency-key': key,
        cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; '),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    for (const cookie of response.headers.getSetCookie()) {
      const [name, value] = cookie.split(';')[0].split('=');
      this.cookies.set(name, value);
    }
    const text = await response.text();
    let parsed;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = text;
    }
    return { status: response.status, body: parsed };
  }
}

const client = new Client();
let organizationId;
let opportunityId;
let projectId;
let executiveDesignId;
let workOrderId;

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
      if ((await fetch(`${base}/health/ready`)).ok) return;
    } catch {}
    if (server.exitCode !== null) throw new Error(errors);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('API did not become ready: ' + errors);
});

after(async () => {
  server?.kill('SIGTERM');
  if (server && server.exitCode === null)
    await new Promise((resolve) => server.once('exit', resolve));
  await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await db.$disconnect();
});

test('1. Bootstrap organization, authenticate admin and seed base customer/opportunity', async () => {
  const bootstrapRes = await client.call(
    '/identity/bootstrap',
    'POST',
    {
      name: 'Admin Engenharia',
      email: 'admin.eng@example.test',
      password,
      organization: 'Moura Solar Engenharia Teste',
    },
    randomUUID(),
    { 'x-bootstrap-token': env.BOOTSTRAP_TOKEN },
  );
  assert.equal(bootstrapRes.status, 201);

  const loginRes = await client.call('/identity/login', 'POST', {
    email: 'admin.eng@example.test',
    password,
  });
  assert.equal(loginRes.status, 201);
  organizationId = loginRes.body.organizationId;

  // Create Customer
  const custRes = await client.call('/customers', 'POST', {
    kind: 'PERSON',
    legalName: 'Roberto Carlos Engenharia',
    taxId: '12345678901',
  });
  assert.equal(custRes.status, 201);
  const customerId = custRes.body.id;

  // Create Opportunity
  const oppRes = await client.call('/opportunities', 'POST', {
    customerId,
    title: 'Projeto Solar 7.5 kWp Residencial',
    projectType: 'ON_GRID',
    needSummary: 'Instalação telhado cerâmico colonial 7.5 kWp',
    firstActivity: {
      type: 'CALL',
      subject: 'Primeiro contato técnico',
      dueAt: new Date(Date.now() + 86400000).toISOString(),
    },
  });
  assert.equal(oppRes.status, 201);
  opportunityId = oppRes.body.id;
  assert.ok(opportunityId);
});

test('2. Create operational project and verify PREPARATION state', async () => {
  const createRes = await client.call('/engineering/projects', 'POST', {
    opportunityId,
    code: 'PRJ-ENG-001',
    title: 'Execução Solar 7.5 kWp Roberto Carlos',
    nominalPowerKw: 7.5,
    estimatedMonthlyGenerationKwh: 980,
    artNumber: 'ART-2026-ENG-001',
    notes: 'Telhado face norte, sem sombreamento.',
  });
  assert.equal(createRes.status, 201);
  projectId = createRes.body.id;
  assert.equal(createRes.body.state, 'PREPARATION');
  assert.equal(createRes.body.code, 'PRJ-ENG-001');
  assert.ok(createRes.body.homologation);
  assert.equal(createRes.body.homologation.stage, 'PREPARING');
});

test('3. Create executive design version and check transition to ENGINEERING', async () => {
  const designRes = await client.call(`/engineering/projects/${projectId}/designs`, 'POST', {
    stringsCount: 2,
    modulesPerString: 8,
    mpptCount: 2,
    tiltDegrees: 18,
    azimuthDegrees: 0,
    cableGaugeMm: 6,
    diagramUrl: 'https://storage.moura-solar.test/diagrams/prj-eng-001.pdf',
    notes: '2 strings de 8 módulos 550W conectadas nos MPPTs 1 e 2',
  });
  assert.equal(designRes.status, 201);
  executiveDesignId = designRes.body.id;
  assert.equal(designRes.body.versionNumber, 1);
  assert.equal(designRes.body.status, 'DRAFT');

  // Verify project state changed to ENGINEERING
  const proj = await client.call(`/engineering/projects/${projectId}`);
  assert.equal(proj.body.state, 'ENGINEERING');
});

test('4. Attempting to schedule project before executive design approval is rejected with 422', async () => {
  const scheduleAttempt = await client.call(`/engineering/projects/${projectId}`, 'PATCH', {
    state: 'READY_TO_SCHEDULE',
  });
  assert.equal(scheduleAttempt.status, 422);
  assert.match(scheduleAttempt.body.message, /Gate de Engenharia pendente/);
});

test('5. Approve executive design version and update homologation stage', async () => {
  const approveRes = await client.call(
    `/engineering/projects/${projectId}/designs/${executiveDesignId}/approve`,
    'POST',
  );
  assert.equal(approveRes.status, 200);
  assert.equal(approveRes.body.status, 'APPROVED');

  // Update Homologation
  const homolRes = await client.call(`/engineering/projects/${projectId}/homologation`, 'PUT', {
    distributor: 'CEMIG Distribuição S.A.',
    protocolNumber: 'PROT-CEMIG-2026-7788',
    stage: 'APPROVED',
    notes: 'Parecer de acesso aprovado sem exigências de reforço de rede',
  });
  assert.equal(homolRes.status, 200);
  assert.equal(homolRes.body.stage, 'APPROVED');

  // Verify project is now READY_TO_SCHEDULE
  const proj = await client.call(`/engineering/projects/${projectId}`);
  assert.equal(proj.body.state, 'READY_TO_SCHEDULE');
});

test('6. Issue field work order with automatic 8 checklist items across 6 sections', async () => {
  const woRes = await client.call(`/engineering/projects/${projectId}/work-orders`, 'POST', {
    code: 'OS-2026-0001',
    title: 'Montagem mecânica e elétrica - Equipe Alfa',
    scheduledDate: '2026-10-15',
    scheduledEndDate: '2026-10-16',
    vehiclePlate: 'SOL-2026',
  });
  assert.equal(woRes.status, 201);
  workOrderId = woRes.body.id;
  assert.equal(woRes.body.state, 'READY');
  assert.equal(woRes.body.checklistItems.length, 8);

  const sections = new Set(woRes.body.checklistItems.map((i) => i.section));
  assert.ok(sections.has('PREPARATION'));
  assert.ok(sections.has('SAFETY_ARRIVAL'));
  assert.ok(sections.has('EQUIPMENT'));
  assert.ok(sections.has('EXECUTION'));
  assert.ok(sections.has('COMMISSIONING'));
  assert.ok(sections.has('DELIVERY'));

  // Project state moved to SCHEDULED
  const proj = await client.call(`/engineering/projects/${projectId}`);
  assert.equal(proj.body.state, 'SCHEDULED');
});

test('7. Start work order, update checklist item (Voc measurement), and complete work order', async () => {
  // Start OS
  const startRes = await client.call(`/engineering/work-orders/${workOrderId}/state`, 'PATCH', {
    state: 'IN_PROGRESS',
  });
  assert.equal(startRes.status, 200);
  assert.equal(startRes.body.state, 'IN_PROGRESS');

  // Project moved to INSTALLING
  const projInstalling = await client.call(`/engineering/projects/${projectId}`);
  assert.equal(projInstalling.body.state, 'INSTALLING');

  // Get Voc measurement item
  const wo = await client.call(`/engineering/work-orders/${workOrderId}`);
  const vocItem = wo.body.checklistItems.find((i) => i.itemCode === 'COMM-01');
  assert.ok(vocItem);

  const checkRes = await client.call(`/engineering/checklist-items/${vocItem.id}`, 'PATCH', {
    status: 'OK',
    measurementValue: 452.8,
    notes: 'Tensão de circuito aberto Voc medida em 452.8 V em conformidade com o datasheet',
  });
  assert.equal(checkRes.status, 200);
  assert.equal(Number(checkRes.body.measurementValue), 452.8);

  // Complete OS
  const completeRes = await client.call(`/engineering/work-orders/${workOrderId}/state`, 'PATCH', {
    state: 'COMPLETED',
  });
  assert.equal(completeRes.status, 200);
  assert.equal(completeRes.body.state, 'COMPLETED');

  // Project moved to COMMISSIONING
  const projCommissioning = await client.call(`/engineering/projects/${projectId}`);
  assert.equal(projCommissioning.body.state, 'COMMISSIONING');
});

test('8. Record customer handover with touch signature and verified generation', async () => {
  const handoverRes = await client.call(`/engineering/projects/${projectId}/handover`, 'POST', {
    clientName: 'Roberto Carlos Silva',
    clientDocument: '123.456.789-01',
    generationVerifiedKw: 6.95,
    satisfactionRating: 5,
    signatureData:
      'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg==',
    notes:
      'Cliente acompanhou os testes, recebeu orientações sobre monitoramento no celular e assinou o termo.',
  });
  assert.equal(handoverRes.status, 200);
  assert.equal(handoverRes.body.clientName, 'Roberto Carlos Silva');
  assert.equal(Number(handoverRes.body.generationVerifiedKw), 6.95);
  assert.equal(handoverRes.body.satisfactionRating, 5);

  // Project state moved to DELIVERY
  const projDelivery = await client.call(`/engineering/projects/${projectId}`);
  assert.equal(projDelivery.body.state, 'DELIVERY');
  assert.ok(projDelivery.body.handover);
});
