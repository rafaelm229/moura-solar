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
const schema = `test_as_${randomUUID().replaceAll('-', '')}`;
url.searchParams.set('schema', schema);

const env = {
  ...process.env,
  PATH: `${process.cwd()}/.bin:/tmp/moura-solar-tools:${process.env.PATH}`,
  DATABASE_URL: url.toString(),
  NODE_ENV: 'test',
  API_PORT: '3326',
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
const base = 'http://localhost:3326/api/v1';
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
let customerId;
let opportunityId;
let projectId;
let warrantyCoverageId;
let monitoringSystemId;
let incidentId;
let ticketId;
let quoteId;

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

test('1. Bootstrap organization, authenticate admin and create Project', async () => {
  const bootstrapRes = await client.call(
    '/identity/bootstrap',
    'POST',
    {
      name: 'Admin Pós-Venda',
      email: 'admin.posvenda@example.test',
      password,
      organization: 'Moura Solar Pós-Venda Teste',
    },
    randomUUID(),
    { 'x-bootstrap-token': env.BOOTSTRAP_TOKEN },
  );
  assert.equal(bootstrapRes.status, 201);

  const loginRes = await client.call('/identity/login', 'POST', {
    email: 'admin.posvenda@example.test',
    password,
  });
  assert.equal(loginRes.status, 201);
  organizationId = loginRes.body.organizationId;

  // Create Customer
  const custRes = await client.call('/customers', 'POST', {
    kind: 'PERSON',
    legalName: 'Marcos Pós-Venda Solar',
    taxId: '98765432100',
  });
  assert.equal(custRes.status, 201);
  customerId = custRes.body.id;

  // Create Opportunity
  const oppRes = await client.call('/opportunities', 'POST', {
    customerId,
    title: 'Usina 10 kWp Solar Residencial',
    projectType: 'ON_GRID',
    needSummary: 'Instalação entregue com monitoramento',
    firstActivity: {
      type: 'CALL',
      subject: 'Primeiro contato técnico pós-venda',
      dueAt: new Date(Date.now() + 86400000).toISOString(),
    },
  });
  assert.equal(oppRes.status, 201);
  opportunityId = oppRes.body.id;

  // Create Operational Project via M8
  const prjRes = await client.call('/engineering/projects', 'POST', {
    opportunityId,
    code: 'PRJ-2026-TEST',
    title: 'Projeto Solar 10 kWp Marcos',
    nominalPowerKw: 10.0,
    estimatedMonthlyGenerationKwh: 1250.0,
  });
  assert.equal(prjRes.status, 201);
  projectId = prjRes.body.id;
  assert.ok(projectId);
});

test('2. Register Warranty Coverage for installation and equipment', async () => {
  const warrantyRes = await client.call(`/after-sales/projects/${projectId}/warranties`, 'POST', {
    kind: 'INVERTER',
    providerType: 'MANUFACTURER',
    providerName: 'Solis Inverters Brasil',
    itemModel: 'Solis 10kW 3-Phase',
    serialNumber: 'SOL-10K-998877',
    startsAt: '2026-01-01',
    endsAt: '2031-01-01',
    terms: 'Garantia total de 5 anos contra defeitos de fabricação.',
  });
  assert.equal(warrantyRes.status, 201);
  warrantyCoverageId = warrantyRes.body.id;
  assert.equal(warrantyRes.body.itemModel, 'Solis 10kW 3-Phase');

  // Verify list warranties
  const listRes = await client.call(`/after-sales/projects/${projectId}/warranties`, 'GET');
  assert.equal(listRes.status, 200);
  assert.equal(listRes.body.length, 1);
});

test('3. Setup Monitoring System and validate Telemetry Principle 1 (Absence != Zero)', async () => {
  // Create Monitoring System
  const monRes = await client.call(`/after-sales/projects/${projectId}/monitoring`, 'POST', {
    provider: 'SolisCloud',
    externalPlantId: 'PLANT-SOLIS-9922',
    connectionType: 'WIFI',
    inverterModel: 'Solis 10kW 3-Phase',
    notes: 'Instalado com datalogger Wi-Fi na rede do cliente.',
  });
  assert.equal(monRes.status, 201);
  monitoringSystemId = monRes.body.id;
  assert.equal(monRes.body.status, 'ACTIVE');

  // SPEC-011 Principle 1: Reading without telemetry (omitted or null realizedGenerationKwh)
  const readingNullRes = await client.call(
    `/after-sales/monitoring/${monitoringSystemId}/readings`,
    'POST',
    {
      period: '2026-08',
      expectedGenerationKwh: 1250.0,
      realizedGenerationKwh: null,
      notes: 'Datalogger offline por 30 dias (sem dados). Não presumir zero!',
    },
  );
  assert.equal(readingNullRes.status, 201);
  assert.equal(readingNullRes.body.realizedGenerationKwh, null);
  assert.equal(readingNullRes.body.performanceRatio, null); // MUST NOT be 0%

  // Reading with real telemetry data
  const readingOkRes = await client.call(
    `/after-sales/monitoring/${monitoringSystemId}/readings`,
    'POST',
    {
      period: '2026-09',
      expectedGenerationKwh: 1250.0,
      realizedGenerationKwh: 1187.5, // 95%
      notes: 'Geração normal apurada no portal.',
    },
  );
  assert.equal(readingOkRes.status, 201);
  assert.equal(Number(readingOkRes.body.realizedGenerationKwh), 1187.5);
  assert.equal(Number(readingOkRes.body.performanceRatio), 95.0);
});

test('4. Connectivity Incident: record outage and document restoration', async () => {
  // Record outage
  const incidentRes = await client.call(
    `/after-sales/monitoring/${monitoringSystemId}/incidents`,
    'POST',
    {
      reason: 'Cliente trocou roteador e operadora de internet (Claro para Vivo).',
      customerNetworkChanged: true,
    },
  );
  assert.equal(incidentRes.status, 201);
  incidentId = incidentRes.body.id;

  // Verify monitoring system transitioned to NO_TELEMETRY
  const monCheck = await client.call(`/after-sales/projects/${projectId}/monitoring`, 'GET');
  assert.equal(monCheck.status, 200);
  assert.equal(monCheck.body.status, 'NO_TELEMETRY');

  // Restore incident
  const restoreRes = await client.call(`/after-sales/incidents/${incidentId}/restore`, 'PATCH', {
    resolutionMethod: 'Roteiro de reconexão via WPS executado com o cliente ao telefone.',
  });
  assert.equal(restoreRes.status, 200);
  assert.ok(restoreRes.body.restoredAt);

  // Verify monitoring system returned to ACTIVE
  const monActiveCheck = await client.call(`/after-sales/projects/${projectId}/monitoring`, 'GET');
  assert.equal(monActiveCheck.status, 200);
  assert.equal(monActiveCheck.body.status, 'ACTIVE');
});

test('5. Support Ticket lifecycle: Open, Triage and Record Remote Guidance', async () => {
  // Open ticket
  const ticketRes = await client.call('/after-sales/tickets', 'POST', {
    customerId,
    projectId,
    type: 'ORIENTATION',
    priority: 'HIGH',
    channel: 'WHATSAPP',
    title: 'Dúvidas sobre faturamento e aplicativo',
    description: 'Cliente ligou com dúvidas sobre o valor compensado na conta de luz da Cemig.',
  });
  assert.equal(ticketRes.status, 201);
  ticketId = ticketRes.body.id;
  assert.ok(ticketRes.body.ticketNumber.startsWith('TK-'));
  assert.equal(ticketRes.body.status, 'OPEN');

  // Triage ticket
  const triageRes = await client.call(`/after-sales/tickets/${ticketId}/triage`, 'PATCH', {
    confirmedCoverage: 'COURTESY',
    rootCause: 'Dúvida operacional sobre ciclo de leitura da concessionária.',
    priority: 'MEDIUM',
  });
  assert.equal(triageRes.status, 200);
  assert.equal(triageRes.body.status, 'IN_TRIAGE');
  assert.equal(triageRes.body.confirmedCoverage, 'COURTESY');

  // Add remote guidance interaction
  const interRes = await client.call(`/after-sales/tickets/${ticketId}/interactions`, 'POST', {
    kind: 'REMOTE_GUIDANCE',
    visibility: 'INTERNAL',
    body: 'Explicado que os créditos da Cemig levam até 60 dias para abater na fatura completa.',
  });
  assert.equal(interRes.status, 201);

  // Verify first response time was recorded on ticket
  const ticketCheck = await client.call(`/after-sales/tickets/${ticketId}`, 'GET');
  assert.equal(ticketCheck.status, 200);
  assert.ok(ticketCheck.body.firstResponseAt);
});

test('6. Warranty Claim and RMA tracking', async () => {
  const claimRes = await client.call(`/after-sales/tickets/${ticketId}/warranty-claims`, 'POST', {
    coverageId: warrantyCoverageId,
    failureDescription: 'Erro 04 no inversor - falha interna de isolamento DC.',
    protocolNumber: 'SOLIS-BRA-2026-9911',
  });
  assert.equal(claimRes.status, 201);
  const claimId = claimRes.body.id;
  assert.equal(claimRes.body.status, 'DRAFT');

  // Advance claim to RMA
  const rmaRes = await client.call(`/after-sales/warranty-claims/${claimId}`, 'PATCH', {
    status: 'RMA',
    rmaCode: 'RMA-SOLIS-774411',
    replacementSerial: 'SOL-10K-REPLACE-001',
    costsReimbursed: 350.0,
  });
  assert.equal(rmaRes.status, 200);
  assert.equal(rmaRes.body.status, 'RMA');
  assert.equal(rmaRes.body.rmaCode, 'RMA-SOLIS-774411');
});

test('7. Service Visit Quote with atomic M8 WorkOrder & M6 Receivable provisioning', async () => {
  // Create visit quote
  const quoteRes = await client.call(`/after-sales/tickets/${ticketId}/quotes`, 'POST', {
    laborAmount: 250.0,
    displacementAmount: 120.0,
    materialsAmount: 80.0,
    discountAmount: 50.0,
    validUntil: '2026-11-30',
    notes: 'Visita técnica para substituição do equipamento em campo.',
  });
  assert.equal(quoteRes.status, 201);
  quoteId = quoteRes.body.id;
  assert.equal(Number(quoteRes.body.totalAmount), 400.0); // 250 + 120 + 80 - 50 = 400

  // Accept quote
  const acceptRes = await client.call(`/after-sales/quotes/${quoteId}/accept`, 'POST', {
    acceptedBy: 'Marcos Pós-Venda (Cliente)',
    acceptanceEvidence: 'Aceite registrado formalmente via WhatsApp com comprovante.',
  });
  assert.equal(acceptRes.status, 200);
  assert.equal(acceptRes.body.status, 'ACCEPTED');
  assert.ok(acceptRes.body.workOrderId, 'M8 WorkOrder must be provisioned');
  assert.ok(acceptRes.body.receivableId, 'M6 Receivable must be provisioned');

  // Verify WorkOrder exists in M8
  const wo = await db.workOrder.findUnique({
    where: { id: acceptRes.body.workOrderId },
  });
  assert.ok(wo);
  assert.ok(wo.code.startsWith('OS-VISITA-'));

  // Verify Receivable exists in M6
  const rec = await db.receivable.findUnique({
    where: { id: acceptRes.body.receivableId },
  });
  assert.ok(rec);
  assert.equal(Number(rec.originalAmount), 400.0);
  assert.equal(rec.status, 'OPEN');
});

test('8. Close Support Ticket with satisfaction survey rating (NPS 5)', async () => {
  const closeRes = await client.call(`/after-sales/tickets/${ticketId}/status`, 'PATCH', {
    status: 'CLOSED',
    resolutionSummary: 'Inversor substituído em garantia e visita faturada quitada.',
    satisfactionRating: 5,
  });
  assert.equal(closeRes.status, 200);
  assert.equal(closeRes.body.status, 'CLOSED');
  assert.equal(closeRes.body.satisfactionRating, 5);
  assert.ok(closeRes.body.closedAt);
});
