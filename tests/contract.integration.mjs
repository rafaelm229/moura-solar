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
const schema = `test_ctr_${randomUUID().replaceAll('-', '')}`;
url.searchParams.set('schema', schema);

const env = {
  ...process.env,
  PATH: `${process.cwd()}/.bin:/tmp/moura-solar-tools:${process.env.PATH}`,
  DATABASE_URL: url.toString(),
  NODE_ENV: 'test',
  API_PORT: '3324',
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
const base = 'http://localhost:3324/api/v1';
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
    return { status: response.status, body: buffer, headers: response.headers };
  }
}

let admin = new Client();
let testCustomerId;
let testUtilityUnitId;
let testOpportunityId;
let acceptedProposalVersionId;

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
        `API server failed to start for contract integration tests. Stderr: ${serverStderr}`,
      );
    await new Promise((r) => setTimeout(r, 200));
  }

  // Bootstrap Admin
  const bs = await admin.call(
    'identity/bootstrap',
    'POST',
    {
      name: 'Admin Contratos',
      email: 'admin.contract@example.test',
      organization: 'Moura Solar Contratos Teste',
      password,
    },
    { 'x-bootstrap-token': env.BOOTSTRAP_TOKEN },
  );
  assert.equal(bs.status, 201);

  // Login
  const loginRes = await admin.call('identity/login', 'POST', {
    email: 'admin.contract@example.test',
    password,
  });
  assert.equal(loginRes.status, 201);

  // Customer
  const custRes = await admin.call('customers', 'POST', {
    kind: 'PERSON',
    legalName: 'Carlos Eduardo Moura Cliente',
    taxId: '111.222.333-44',
    phone: '(81) 98888-7777',
    email: 'carlos.cliente@example.test',
  });
  assert.equal(custRes.status, 201);
  testCustomerId = custRes.body.id;

  // Address
  await admin.call(`customers/${testCustomerId}/addresses`, 'POST', {
    street: 'Av. Boa Viagem',
    number: '500',
    district: 'Boa Viagem',
    city: 'Recife',
    state: 'PE',
    postalCode: '51020-000',
    isPrimary: true,
  });

  // Utility Unit
  const ucRes = await admin.call(`customers/${testCustomerId}/utility-units`, 'POST', {
    distributorName: 'Neoenergia PE',
    externalCode: 'UC-CTR-999',
    consumerClass: 'RESIDENTIAL',
    tariffMode: 'CONVENTIONAL',
    connectionType: 'BIPHASIC',
    voltage: '220V',
  });
  assert.equal(ucRes.status, 201);
  testUtilityUnitId = ucRes.body.id;

  // Opportunity
  const optRes = await admin.call('opportunities', 'POST', {
    customerId: testCustomerId,
    utilityUnitId: testUtilityUnitId,
    title: 'Projeto Solar Fotovoltaico 7.2 kWp',
    needSummary: 'Instalação telhado residencial',
    estimatedConsumption: 650,
    firstActivity: {
      type: 'CALL',
      subject: 'Contato comercial inicial',
      dueAt: new Date(Date.now() + 86400000).toISOString(),
    },
  });
  assert.equal(optRes.status, 201);
  testOpportunityId = optRes.body.id;

  // Design
  const designRes = await admin.call(`opportunities/${testOpportunityId}/designs`, 'POST', {
    name: 'Dimensionamento Telhado Norte',
    targetMonthlyGenerationKwh: 960.0,
    specificYield: 135.0,
  });
  assert.equal(designRes.status, 200);
  const designVersionId = designRes.body.versions[0].id;

  // Approve design
  await admin.call(`design-versions/${designVersionId}/approve`, 'POST', {});

  // Create Proposal
  const propRes = await admin.call('proposals', 'POST', {
    opportunityId: testOpportunityId,
    designVersionId,
    validityDays: 15,
  });
  assert.equal(propRes.status, 201);
  const proposalVersionId = propRes.body.versions[0].id;

  // Generate Proposal PDF
  await admin.call(`proposal-versions/${proposalVersionId}/generate-pdf`, 'POST', {});

  // Send Proposal Delivery
  await admin.call(`proposal-versions/${proposalVersionId}/deliveries`, 'POST', {
    channel: 'WHATSAPP',
    recipient: '5581988887777',
    notes: 'Proposta enviada pelo consultor',
  });

  // Accept Proposal
  const acceptRes = await admin.call(`proposal-versions/${proposalVersionId}/accept`, 'POST', {
    method: 'MESSAGE',
    acceptedByName: 'Carlos Eduardo Moura Cliente',
    notes: 'Cliente confirmou por mensagem a contratação',
  });
  assert.equal(acceptRes.status, 200);
  acceptedProposalVersionId = proposalVersionId;
});

after(async () => {
  if (server) server.kill('SIGKILL');
  await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await db.$disconnect();
});

test('1. Geração de minuta contratual a partir de proposta aceita (SPEC-007 Item 5 e 7)', async () => {
  const res = await admin.call('contracts', 'POST', {
    opportunityId: testOpportunityId,
    acceptedProposalVersionId,
    signingCity: 'Recife',
    notes: 'Condição especial com seguro de instalação por 12 meses',
  });

  assert.equal(res.status, 201);
  assert.ok(res.body.id);
  assert.match(res.body.code, /^CTR-\d{4}-\d{4}$/);
  assert.equal(res.body.state, 'READY');

  // Verify documents: DOCX and PDF both generated
  const activeVersion = res.body.versions[0];
  assert.ok(activeVersion);
  assert.equal(activeVersion.status, 'READY');
  assert.equal(activeVersion.documents.length, 2);

  const docxDoc = activeVersion.documents.find((d) => d.type === 'DOCX_CONTRACT');
  const pdfDoc = activeVersion.documents.find((d) => d.type === 'PDF_CONTRACT');
  assert.ok(docxDoc, 'Documento DOCX deve estar presente');
  assert.ok(pdfDoc, 'Documento PDF deve estar presente');
  assert.ok(docxDoc.fileSize > 40000, 'Arquivo DOCX deve ter tamanho condizente');
  assert.ok(pdfDoc.fileSize > 5000, 'Arquivo PDF deve ter tamanho condizente');

  // Verify initial project gate (CONTRACT / Gate C) created as PENDING
  const contractGate = res.body.projectGates.find((g) => g.gateType === 'CONTRACT');
  assert.ok(contractGate);
  assert.equal(contractGate.status, 'PENDING');
});

test('2. Download da Minuta DOCX com placeholders preenchidos', async () => {
  const listRes = await admin.call(`opportunities/${testOpportunityId}/contracts`);
  assert.equal(listRes.status, 200);
  const contractId = listRes.body[0].id;

  const docxRes = await admin.call(`contracts/${contractId}/docx`);
  assert.equal(docxRes.status, 200);
  assert.ok(Buffer.isBuffer(docxRes.body));
  // DOCX is a zip file (magic number PK\x03\x04)
  assert.equal(docxRes.body[0], 0x50);
  assert.equal(docxRes.body[1], 0x4b);
  assert.equal(docxRes.body[2], 0x03);
  assert.equal(docxRes.body[3], 0x04);
});

test('3. Download do Contrato PDF institucional', async () => {
  const listRes = await admin.call(`opportunities/${testOpportunityId}/contracts`);
  const contractId = listRes.body[0].id;

  const pdfRes = await admin.call(`contracts/${contractId}/pdf`);
  assert.equal(pdfRes.status, 200);
  assert.ok(Buffer.isBuffer(pdfRes.body));
  const magic = pdfRes.body.subarray(0, 5).toString('ascii');
  assert.equal(magic, '%PDF-');
});

test('4. Registro de envio do contrato formal (SPEC-007 Item 8)', async () => {
  const listRes = await admin.call(`opportunities/${testOpportunityId}/contracts`);
  const contractId = listRes.body[0].id;

  const deliveryRes = await admin.call(`contracts/${contractId}/deliveries`, 'POST', {
    channel: 'WHATSAPP',
    recipient: '5581988887777',
    notes: 'Minuta contratual enviada ao cliente para assinatura',
  });

  assert.equal(deliveryRes.status, 201);
  assert.equal(deliveryRes.body.contract.state, 'SENT');
  assert.equal(deliveryRes.body.delivery.channel, 'WHATSAPP');
});

test('5. Upload de via assinada sem ativação prematura (SPEC-007 Item 4 e 9)', async () => {
  const listRes = await admin.call(`opportunities/${testOpportunityId}/contracts`);
  const contractId = listRes.body[0].id;

  const fakeSignedPdf = Buffer.from('%PDF-1.4 Fake Signed Contract Moura Solar');
  const uploadRes = await admin.call(`contracts/${contractId}/upload-signed`, 'POST', {
    fileName: 'contrato-assinado-carlos.pdf',
    fileBase64: fakeSignedPdf.toString('base64'),
    notes: 'Documento rubricado e assinado recebido via WhatsApp',
  });

  assert.equal(uploadRes.status, 201);
  assert.equal(uploadRes.body.contract.state, 'SIGNED_UPLOADED');

  // Verify that Gate C has NOT been satisfied yet (SPEC-007 Item 4 & 9)
  const oppCheck = await admin.call(`opportunities/${testOpportunityId}`);
  assert.notEqual(oppCheck.body.state, 'VENDIDO', 'Upload não deve liberar Gate C prematuramente');
});

test('6. Conferência com rejeição formal (SPEC-007 Item 10)', async () => {
  const listRes = await admin.call(`opportunities/${testOpportunityId}/contracts`);
  const contractId = listRes.body[0].id;

  const rejectRes = await admin.call(`contracts/${contractId}/verify-signed`, 'POST', {
    partiesMatch: true,
    allPagesPresent: false, // Faltando anexo de equipamentos
    versionMatches: true,
    signaturesLegible: true,
    decision: 'REJECTED',
    rejectionReason: 'Página do Anexo I (BOM) ilegível e faltando assinatura da testemunha 2',
  });

  assert.equal(rejectRes.status, 200);
  assert.equal(
    rejectRes.body.contract.state,
    'READY',
    'Contrato deve voltar a READY para novo envio/upload',
  );
  assert.equal(rejectRes.body.review.decision, 'REJECTED');
});

test('7. Conferência com aprovação integral e liberação do Gate C (SPEC-007 Item 11)', async () => {
  const listRes = await admin.call(`opportunities/${testOpportunityId}/contracts`);
  const contractId = listRes.body[0].id;

  // Upload corrected signed contract
  const fakeSignedPdf2 = Buffer.from('%PDF-1.4 Corrected Signed Contract Moura Solar Complete');
  await admin.call(`contracts/${contractId}/upload-signed`, 'POST', {
    fileName: 'contrato-assinado-corrigido.pdf',
    fileBase64: fakeSignedPdf2.toString('base64'),
    notes: 'Vias completas com todas as testemunhas',
  });

  // Verify signed with all 4 criteria satisfied
  const verifyRes = await admin.call(`contracts/${contractId}/verify-signed`, 'POST', {
    partiesMatch: true,
    allPagesPresent: true,
    versionMatches: true,
    signaturesLegible: true,
    decision: 'VERIFIED',
    notes: 'Conferência técnica e jurídica 100% aprovada',
  });

  assert.equal(verifyRes.status, 200);
  assert.equal(verifyRes.body.contract.state, 'ACTIVE');

  // Verify Opportunity transitioned to VENDIDO (Gate C superado!)
  const oppRes = await admin.call(`opportunities/${testOpportunityId}`);
  assert.equal(oppRes.status, 200);
  assert.equal(oppRes.body.state, 'VENDIDO');

  // Verify ProjectGate is SATISFIED
  const gates = verifyRes.body.contract.projectGates;
  const contractGate = gates.find((g) => g.gateType === 'CONTRACT');
  assert.ok(contractGate);
  assert.equal(contractGate.status, 'SATISFIED');
});
