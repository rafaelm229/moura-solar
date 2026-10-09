import { storageEnv } from './storage-env.mjs';
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
const schema = `test_prop_${randomUUID().replaceAll('-', '')}`;
url.searchParams.set('schema', schema);

const env = {
  ...process.env,
  PATH: `${process.cwd()}/.bin:/tmp/moura-solar-tools:${process.env.PATH}`,
  DATABASE_URL: url.toString(),
  NODE_ENV: 'test',
  API_PORT: '3323',
  WEB_ORIGIN: 'http://localhost:3320',
  COOKIE_SECURE: 'false',
  ...storageEnv,
  IDENTITY_LINK_SECRET: 'integration-test-link-secret-at-least-32-characters',
  BOOTSTRAP_TOKEN: 'integration-test-bootstrap-at-least-32-characters',
};

const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
let server;
const base = 'http://localhost:3323/api/v1';
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
    const text = await response.text();
    let parsedBody = null;
    try {
      parsedBody = JSON.parse(text);
    } catch {
      parsedBody = text;
    }
    return { status: response.status, body: parsedBody, headers: response.headers };
  }
}

let admin = new Client();
let testCustomerId;
let testUtilityUnitId;
let testOpportunityId;
let approvedDesignVersionId;
let draftDesignVersionId;

before(async () => {
  await db.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  const migrate = spawnSync(
    'pnpm',
    ['--filter', '@moura-solar/database', 'exec', 'prisma', 'migrate', 'deploy'],
    {
      env,
      encoding: 'utf8',
    },
  );
  assert.equal(migrate.status, 0, migrate.stdout + migrate.stderr);

  let serverStderr = '';
  server = spawn('node', ['apps/api/dist/main.js'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', (d) => {
    process.stdout.write(d);
  });
  server.stderr.on('data', (d) => {
    serverStderr += d;
    process.stderr.write(d);
  });
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(`${base}/health/ready`);
      if (res.ok) break;
    } catch {}
    if (attempt > 60)
      throw new Error(
        `API server failed to start for proposal integration tests. Stderr: ${serverStderr}`,
      );
    await new Promise((r) => setTimeout(r, 200));
  }

  // Bootstrap Admin
  const bs = await admin.call(
    'identity/bootstrap',
    'POST',
    {
      name: 'Admin Propostas',
      email: 'admin.proposal@example.test',
      organization: 'Moura Solar Propostas Teste',
      password,
    },
    { 'x-bootstrap-token': env.BOOTSTRAP_TOKEN },
  );
  assert.equal(bs.status, 201);

  // Login
  const loginRes = await admin.call('identity/login', 'POST', {
    email: 'admin.proposal@example.test',
    password,
  });
  assert.equal(loginRes.status, 201);

  // Setup Customer
  const custRes = await admin.call('customers', 'POST', {
    kind: 'PERSON',
    legalName: 'Cliente Propostas Teste',
    taxId: '321.654.987-00',
    phone: '(31) 98765-4321',
    email: 'propostas.teste@example.test',
  });
  assert.equal(custRes.status, 201);
  testCustomerId = custRes.body.id;

  // Setup Utility Unit
  const ucRes = await admin.call(`customers/${testCustomerId}/utility-units`, 'POST', {
    distributorName: 'Cemig MG',
    externalCode: 'UC-PROP-001',
    consumerClass: 'RESIDENTIAL',
    tariffMode: 'CONVENTIONAL',
    connectionType: 'BIPHASIC',
    voltage: '220V',
  });
  assert.equal(ucRes.status, 201);
  testUtilityUnitId = ucRes.body.id;

  // Add 12 readings
  for (let m = 1; m <= 12; m++) {
    const month = m.toString().padStart(2, '0');
    await admin.call(
      `utility-units/${testUtilityUnitId}/readings`,
      'POST',
      {
        referenceMonth: `2025-${month}`,
        consumptionKwh: 500 + m * 10,
        billedAmount: 480 + m * 9,
      },
      { 'idempotency-key': `proposal-reading-create-2025-${month}` },
    );
  }

  // Setup Opportunity
  const optRes = await admin.call('opportunities', 'POST', {
    customerId: testCustomerId,
    utilityUnitId: testUtilityUnitId,
    title: 'Projeto Solar Residencial 8kWp',
    needSummary: 'Geração própria para compensação integral',
    estimatedConsumption: 565,
    firstActivity: {
      type: 'CALL',
      subject: 'Apresentação técnica preliminar',
      dueAt: new Date(Date.now() + 86400000).toISOString(),
    },
  });
  assert.equal(optRes.status, 201);
  testOpportunityId = optRes.body.id;

  // Create Design
  const designRes = await admin.call(`opportunities/${testOpportunityId}/designs`, 'POST', {
    name: 'Dimensionamento Telhado Principal',
    targetMonthlyGenerationKwh: 600.0,
    specificYield: 135.0,
  });
  assert.equal(designRes.status, 200);
  const designId = designRes.body.id;
  approvedDesignVersionId = designRes.body.versions[0].id;

  // Approve the first version
  const appRes = await admin.call(`design-versions/${approvedDesignVersionId}/approve`, 'POST', {});
  assert.equal(appRes.status, 200);

  // Create a second design version that will remain DRAFT
  const draftVersionRes = await admin.call(`designs/${designId}/versions`, 'POST', {});
  assert.equal(draftVersionRes.status, 200);
  draftDesignVersionId = draftVersionRes.body.id;
});

after(async () => {
  if (server) server.kill();
  await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await db.$disconnect();
});

test('tentativa de criar proposta para dimensionamento NÃO aprovado é rejeitada com HTTP 422', async () => {
  const res = await admin.call('proposals', 'POST', {
    opportunityId: testOpportunityId,
    designVersionId: draftDesignVersionId, // Status is DRAFT!
  });

  assert.equal(res.status, 422);
  assert.match(
    res.body.message ?? '',
    /Apenas dimensionamentos com status APROVADO podem ser convertidos em proposta/i,
  );
});

test('criação de proposta a partir de dimensionamento aprovado inicializa versão, congela snapshots e gera PDF READY', async () => {
  const res = await admin.call('proposals', 'POST', {
    opportunityId: testOpportunityId,
    designVersionId: approvedDesignVersionId,
    validityDays: 10,
    observations: 'Instalação prevista para 15 dias úteis após homologação.',
  });

  if (res.status !== 201) console.error('TEST 2 ERROR:', res.status, res.body);
  assert.equal(res.status, 201);
  assert.equal(res.body.code, 'PROP-0001');
  assert.equal(res.body.versions.length, 1);

  const version = res.body.versions[0];
  assert.equal(version.versionNumber, 1);
  assert.equal(version.status, 'READY');
  assert.equal(version.validityDays, 10);
  assert.equal(version.customerSnapshot.legalName, 'Cliente Propostas Teste');
  assert.equal(version.utilityUnitSnapshot.code, 'UC-PROP-001');
  assert.equal(version.documents.length, 1);
  assert.equal(version.documents[0].generationStatus, 'READY');
  assert.equal(version.documents[0].mimeType, 'application/pdf');
  assert.ok(version.documents[0].contentHash);
});

test('download de PDF retorna stream com Content-Type application/pdf e integridade ETag', async () => {
  const propList = await admin.call(`opportunities/${testOpportunityId}/proposals`);
  assert.equal(propList.status, 200);
  const versionId = propList.body[0].versions[0].id;

  const pdfRes = await fetch(`${base}/proposal-versions/${versionId}/pdf`, {
    headers: {
      origin: env.WEB_ORIGIN,
      'x-requested-with': 'MouraSolar',
      cookie: [...admin.cookies].map(([k, v]) => `${k}=${v}`).join('; '),
    },
  });

  assert.equal(pdfRes.status, 200);
  assert.equal(pdfRes.headers.get('content-type'), 'application/pdf');
  assert.ok(pdfRes.headers.get('content-disposition')?.includes('inline'));

  const arrayBuffer = await pdfRes.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  assert.ok(buffer.length > 1000);
  assert.equal(buffer.subarray(0, 5).toString('ascii'), '%PDF-');
});

test('registro de envio (WHATSAPP) atualiza validade (10 dias), transita oportunidade para PROPOSTA_APRESENTADA e agenda follow-up', async () => {
  const propList = await admin.call(`opportunities/${testOpportunityId}/proposals`);
  const versionId = propList.body[0].versions[0].id;

  const deliveryRes = await admin.call(`proposal-versions/${versionId}/deliveries`, 'POST', {
    channel: 'WHATSAPP',
    recipient: '(31) 98765-4321',
    notes: 'Proposta encaminhada via WhatsApp oficial para o decisor financeiro.',
  });

  assert.equal(deliveryRes.status, 200);
  assert.equal(deliveryRes.body.delivery.channel, 'WHATSAPP');
  assert.equal(deliveryRes.body.version.status, 'SENT');
  assert.ok(deliveryRes.body.version.validUntil);

  // Check Opportunity Stage has advanced to PROPOSTA_APRESENTADA (Gate B)
  const oppRes = await admin.call(`opportunities/${testOpportunityId}`);
  assert.equal(oppRes.status, 200);
  assert.equal(oppRes.body.state, 'PROPOSTA_APRESENTADA');

  // Check automated follow-up activity created
  const actRes = await admin.call(`activities?opportunityId=${testOpportunityId}`);
  assert.equal(actRes.status, 200);
  const followUp = actRes.body.find((a) => a.type === 'FOLLOW_UP');
  assert.ok(followUp, 'Atividade automática de follow-up deve existir');
  assert.equal(followUp.status, 'OPEN');
  assert.match(followUp.subject, /Acompanhar proposta PROP-0001, versão 1/);
});

test('registro de aceite marca proposta como ACCEPTED, avança oportunidade para CONTRATACAO e bloqueia novos aceites (HTTP 409)', async () => {
  const propList = await admin.call(`opportunities/${testOpportunityId}/proposals`);
  const versionId = propList.body[0].versions[0].id;

  await db.$executeRawUnsafe(`
    CREATE FUNCTION "${schema}".reject_outbox_for_test() RETURNS trigger AS $$
    BEGIN RAISE EXCEPTION 'forced outbox insert failure'; END;
    $$ LANGUAGE plpgsql
  `);
  await db.$executeRawUnsafe(`
    CREATE TRIGGER reject_outbox_for_test
    BEFORE INSERT ON "${schema}"."integration_outbox"
    FOR EACH ROW EXECUTE FUNCTION "${schema}".reject_outbox_for_test()
  `);
  const failedAcceptRes = await admin.call(`proposal-versions/${versionId}/accept`, 'POST', {
    method: 'MESSAGE',
    acceptedByName: 'Aceite com falha de persistência',
  });
  await db.$executeRawUnsafe(
    `DROP TRIGGER reject_outbox_for_test ON "${schema}"."integration_outbox"`,
  );
  await db.$executeRawUnsafe(`DROP FUNCTION "${schema}".reject_outbox_for_test()`);
  assert.equal(failedAcceptRes.status, 500);
  assert.equal(await db.proposalAcceptance.count({ where: { proposalVersionId: versionId } }), 0);
  assert.equal(
    await db.integrationOutbox.count({ where: { aggregateId: propList.body[0].id } }),
    0,
  );
  assert.equal((await db.proposalVersion.findUnique({ where: { id: versionId } })).status, 'SENT');

  const acceptRes = await admin.call(`proposal-versions/${versionId}/accept`, 'POST', {
    method: 'MESSAGE',
    acceptedByName: 'Dr. Roberto Silva (Proprietário)',
    notes: 'Aceite confirmado pelo cliente via WhatsApp corporativo.',
  });

  assert.equal(acceptRes.status, 200);
  assert.equal(acceptRes.body.acceptedByName, 'Dr. Roberto Silva (Proprietário)');

  const acceptance = await db.proposalAcceptance.findUnique({
    where: { id: acceptRes.body.id },
    select: { organizationId: true },
  });
  assert.ok(acceptance);
  const acceptedEvent = await db.integrationOutbox.findFirst({
    where: {
      organizationId: acceptance.organizationId,
      dedupeKey: `PROPOSAL_ACCEPTED:${acceptRes.body.id}`,
    },
  });
  assert.ok(acceptedEvent, 'Aceite e evento outbox devem persistir juntos');
  assert.equal(acceptedEvent.eventType, 'PROPOSAL_ACCEPTED');
  assert.equal(acceptedEvent.schemaVersion, 1);
  assert.equal(acceptedEvent.aggregateId, propList.body[0].id);
  assert.equal(acceptedEvent.correlationId, acceptRes.headers.get('x-request-id'));
  assert.deepEqual(acceptedEvent.payload, {
    acceptanceId: acceptRes.body.id,
    proposalVersionId: versionId,
    opportunityId: testOpportunityId,
  });

  // Verify Proposal details
  const updatedProp = await admin.call(`proposals/${propList.body[0].id}`);
  assert.equal(updatedProp.status, 200);
  assert.equal(updatedProp.body.acceptedVersionId, versionId);
  assert.equal(updatedProp.body.versions[0].status, 'ACCEPTED');

  // Verify Opportunity state is now CONTRATACAO
  const oppRes = await admin.call(`opportunities/${testOpportunityId}`);
  assert.equal(oppRes.status, 200);
  assert.equal(oppRes.body.state, 'CONTRATACAO');

  // Verify Contract Activity created
  const actRes = await admin.call(`activities?opportunityId=${testOpportunityId}`);
  assert.equal(actRes.status, 200);
  const contractActivity = actRes.body.find(
    (a) => a.type === 'MEETING' && a.subject.includes('Formalização Contratual'),
  );
  assert.ok(contractActivity, 'Atividade de formalização contratual deve ser criada');

  // SPEC-006 Item 19: Second acceptance attempt on the same opportunity must fail with 409 Conflict
  const secondAcceptRes = await admin.call(`proposal-versions/${versionId}/accept`, 'POST', {
    method: 'MESSAGE',
    acceptedByName: 'Outro Aceite',
  });
  assert.equal(secondAcceptRes.status, 409);
  assert.equal(
    await db.integrationOutbox.count({
      where: { dedupeKey: `PROPOSAL_ACCEPTED:${acceptRes.body.id}` },
    }),
    1,
    'Repetir o comando rejeitado não cria outro evento',
  );
});
