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
  ...storageEnv,
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

  // Verify initial project gate (CONTRACT) is created as PENDING
  const contractGate = res.body.projectGates.find((g) => g.gateType === 'CONTRACT');
  assert.ok(contractGate);
  assert.equal(contractGate.status, 'PENDING');

  const creationAudit = await db.auditEvent.findFirstOrThrow({
    where: { action: 'CONTRACT_CREATED', entityId: res.body.id },
  });
  const contractActivity = await db.activity.findFirstOrThrow({
    where: {
      opportunityId: testOpportunityId,
      subject: { contains: 'Assinatura de Contrato:' },
    },
  });
  const activityEvent = await db.integrationOutbox.findFirstOrThrow({
    where: {
      organizationId: creationAudit.organizationId,
      dedupeKey: `ACTIVITY_CREATED:${creationAudit.id}:${contractActivity.id}`,
    },
  });
  assert.equal(activityEvent.correlationId, res.headers.get('x-request-id'));
  assert.deepEqual(activityEvent.payload, {
    activityId: contractActivity.id,
    auditEventId: creationAudit.id,
    customerId: testCustomerId,
    opportunityId: testOpportunityId,
  });

  const contractEvent = await db.integrationOutbox.findFirstOrThrow({
    where: {
      organizationId: creationAudit.organizationId,
      dedupeKey: `CONTRACT_CREATED:${creationAudit.id}:${res.body.id}`,
    },
  });
  assert.equal(contractEvent.eventType, 'CONTRACT_CREATED');
  assert.equal(contractEvent.schemaVersion, 1);
  assert.equal(contractEvent.aggregateType, 'Contract');
  assert.equal(contractEvent.aggregateId, res.body.id);
  assert.equal(contractEvent.correlationId, res.headers.get('x-request-id'));
  assert.equal(contractEvent.publishedAt, null);
  assert.deepEqual(contractEvent.payload, {
    contractId: res.body.id,
    contractVersionId: activeVersion.id,
    acceptedProposalVersionId,
    auditEventId: creationAudit.id,
    opportunityId: testOpportunityId,
  });

  const replayRes = await admin.call('contracts', 'POST', {
    opportunityId: testOpportunityId,
    acceptedProposalVersionId,
    signingCity: 'Recife',
    notes: 'Condição especial com seguro de instalação por 12 meses',
  });
  assert.equal(replayRes.status, 201);
  assert.equal(replayRes.body.id, res.body.id);
  assert.equal(
    await db.integrationOutbox.count({
      where: {
        organizationId: creationAudit.organizationId,
        dedupeKey: {
          in: [
            `ACTIVITY_CREATED:${creationAudit.id}:${contractActivity.id}`,
            `CONTRACT_CREATED:${creationAudit.id}:${res.body.id}`,
          ],
        },
      },
    }),
    2,
  );
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
  const beforeActivityCount = await db.activity.count({
    where: { opportunityId: testOpportunityId },
  });
  const beforeAuditCount = await db.auditEvent.count({
    where: { action: 'CONTRACT_DELIVERED', entityId: contractId },
  });
  const beforeDeliveryCount = await db.contractDelivery.count({ where: { contractId } });
  const beforeContractEventCount = await db.integrationOutbox.count({
    where: { eventType: 'CONTRACT_DELIVERED' },
  });
  const beforeActivityEventCount = await db.integrationOutbox.count({
    where: { eventType: 'ACTIVITY_CREATED' },
  });

  await db.$executeRawUnsafe(`
    CREATE FUNCTION "${schema}".reject_activity_created_outbox_for_test() RETURNS trigger AS $$
    BEGIN
      IF NEW.event_type = 'CONTRACT_DELIVERED' THEN
        RAISE EXCEPTION 'forced contract outbox insert failure';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);
  await db.$executeRawUnsafe(`
    CREATE TRIGGER reject_activity_created_outbox_for_test
    BEFORE INSERT ON "${schema}"."integration_outbox"
    FOR EACH ROW EXECUTE FUNCTION "${schema}".reject_activity_created_outbox_for_test()
  `);
  const failedDeliveryRes = await admin.call(`contracts/${contractId}/deliveries`, 'POST', {
    channel: 'WHATSAPP',
    recipient: '5581988887777',
    notes: 'Falha injetada na outbox da atividade',
  });
  await db.$executeRawUnsafe(
    `DROP TRIGGER reject_activity_created_outbox_for_test ON "${schema}"."integration_outbox"`,
  );
  await db.$executeRawUnsafe(`DROP FUNCTION "${schema}".reject_activity_created_outbox_for_test()`);
  assert.equal(failedDeliveryRes.status, 500);
  assert.equal(await db.contractDelivery.count({ where: { contractId } }), beforeDeliveryCount);
  assert.equal(
    await db.activity.count({ where: { opportunityId: testOpportunityId } }),
    beforeActivityCount,
  );
  assert.equal(
    await db.auditEvent.count({ where: { action: 'CONTRACT_DELIVERED', entityId: contractId } }),
    beforeAuditCount,
  );
  assert.equal(
    await db.integrationOutbox.count({ where: { eventType: 'CONTRACT_DELIVERED' } }),
    beforeContractEventCount,
  );
  assert.equal(
    await db.integrationOutbox.count({ where: { eventType: 'ACTIVITY_CREATED' } }),
    beforeActivityEventCount,
  );
  assert.equal((await db.contract.findUnique({ where: { id: contractId } })).state, 'READY');

  const deliveryRes = await admin.call(`contracts/${contractId}/deliveries`, 'POST', {
    channel: 'WHATSAPP',
    recipient: '5581988887777',
    notes: 'Minuta contratual enviada ao cliente para assinatura',
  });

  assert.equal(deliveryRes.status, 201);
  assert.equal(deliveryRes.body.contract.state, 'SENT');
  assert.equal(deliveryRes.body.delivery.channel, 'WHATSAPP');
  const followUp = await db.activity.findFirst({
    where: {
      opportunityId: testOpportunityId,
      subject: { contains: 'Acompanhar Assinatura:' },
    },
    orderBy: { createdAt: 'desc' },
  });
  assert.ok(followUp, 'Entrega deve criar follow-up para assinatura');
  const deliveryAudit = await db.auditEvent.findFirst({
    where: { action: 'CONTRACT_DELIVERED', entityId: contractId },
    orderBy: { createdAt: 'desc' },
  });
  const activityEvent = await db.integrationOutbox.findFirst({
    where: {
      organizationId: followUp.organizationId,
      dedupeKey: `ACTIVITY_CREATED:${deliveryAudit.id}:${followUp.id}`,
    },
  });
  assert.ok(activityEvent, 'Atividade de follow-up deve emitir evento outbox');
  assert.equal(activityEvent.eventType, 'ACTIVITY_CREATED');
  assert.equal(activityEvent.schemaVersion, 1);
  assert.equal(activityEvent.aggregateType, 'Activity');
  assert.equal(activityEvent.aggregateId, followUp.id);
  assert.equal(activityEvent.correlationId, deliveryRes.headers.get('x-request-id'));
  assert.equal(activityEvent.publishedAt, null);
  assert.deepEqual(activityEvent.payload, {
    activityId: followUp.id,
    auditEventId: deliveryAudit.id,
    customerId: testCustomerId,
    opportunityId: testOpportunityId,
  });
  assert.equal(activityEvent.occurredAt.toISOString(), deliveryAudit.createdAt.toISOString());

  const contractEvent = await db.integrationOutbox.findFirst({
    where: {
      organizationId: followUp.organizationId,
      dedupeKey: `CONTRACT_DELIVERED:${deliveryAudit.id}:${deliveryRes.body.delivery.id}`,
    },
  });
  assert.ok(contractEvent, 'Entrega manual deve emitir evento de contrato');
  assert.equal(contractEvent.eventType, 'CONTRACT_DELIVERED');
  assert.equal(contractEvent.schemaVersion, 1);
  assert.equal(contractEvent.aggregateType, 'Contract');
  assert.equal(contractEvent.aggregateId, contractId);
  assert.equal(contractEvent.correlationId, deliveryRes.headers.get('x-request-id'));
  assert.equal(contractEvent.publishedAt, null);
  assert.deepEqual(contractEvent.payload, {
    contractId,
    deliveryId: deliveryRes.body.delivery.id,
    auditEventId: deliveryAudit.id,
    opportunityId: testOpportunityId,
  });
  assert.equal(contractEvent.occurredAt.toISOString(), deliveryAudit.createdAt.toISOString());
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

  const uploadAudit = await db.auditEvent.findFirstOrThrow({
    where: { action: 'CONTRACT_SIGNED_UPLOADED', entityId: contractId },
    orderBy: { createdAt: 'desc' },
  });
  const conferenceActivity = await db.activity.findFirstOrThrow({
    where: {
      opportunityId: testOpportunityId,
      subject: { contains: 'Conferência de Assinatura:' },
    },
    orderBy: { createdAt: 'desc' },
  });
  const activityEvent = await db.integrationOutbox.findFirstOrThrow({
    where: {
      organizationId: uploadAudit.organizationId,
      dedupeKey: `ACTIVITY_CREATED:${uploadAudit.id}:${conferenceActivity.id}`,
    },
  });
  assert.equal(activityEvent.correlationId, uploadRes.headers.get('x-request-id'));
  assert.deepEqual(activityEvent.payload, {
    activityId: conferenceActivity.id,
    auditEventId: uploadAudit.id,
    customerId: testCustomerId,
    opportunityId: testOpportunityId,
  });

  const uploadEvent = await db.integrationOutbox.findFirstOrThrow({
    where: {
      organizationId: uploadAudit.organizationId,
      dedupeKey: `CONTRACT_SIGNED_UPLOADED:${uploadAudit.id}:${uploadRes.body.document.id}`,
    },
  });
  assert.equal(uploadEvent.eventType, 'CONTRACT_SIGNED_UPLOADED');
  assert.equal(uploadEvent.schemaVersion, 1);
  assert.equal(uploadEvent.aggregateType, 'Contract');
  assert.equal(uploadEvent.aggregateId, contractId);
  assert.equal(uploadEvent.correlationId, uploadRes.headers.get('x-request-id'));
  assert.equal(uploadEvent.publishedAt, null);
  assert.deepEqual(uploadEvent.payload, {
    contractId,
    documentId: uploadRes.body.document.id,
    contractVersionId: uploadRes.body.document.contractVersionId,
    auditEventId: uploadAudit.id,
    opportunityId: testOpportunityId,
  });

  // Verify the contract gate has NOT been satisfied yet (SPEC-007 Item 4 & 9)
  const oppCheck = await admin.call(`opportunities/${testOpportunityId}`);
  assert.notEqual(
    oppCheck.body.state,
    'VENDIDO',
    'Upload não deve liberar o gate contratual prematuramente',
  );
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
  const rejectAudit = await db.auditEvent.findFirst({
    where: { action: 'CONTRACT_SIGNED_REJECTED', entityId: contractId },
    orderBy: { createdAt: 'desc' },
  });
  const rejectActivity = await db.activity.findFirst({
    where: {
      opportunityId: testOpportunityId,
      subject: { contains: 'Regularizar Assinatura do Contrato:' },
    },
    orderBy: { createdAt: 'desc' },
  });
  const rejectEvent = await db.integrationOutbox.findFirst({
    where: {
      organizationId: rejectActivity.organizationId,
      dedupeKey: `ACTIVITY_CREATED:${rejectAudit.id}:${rejectActivity.id}`,
    },
  });
  assert.ok(rejectEvent, 'Rejeição deve emitir evento da atividade de regularização');
  assert.equal(rejectEvent.correlationId, rejectRes.headers.get('x-request-id'));
  assert.deepEqual(rejectEvent.payload, {
    activityId: rejectActivity.id,
    auditEventId: rejectAudit.id,
    customerId: testCustomerId,
    opportunityId: testOpportunityId,
  });
  const rejectedReviewEvent = await db.integrationOutbox.findFirstOrThrow({
    where: {
      organizationId: rejectRes.body.review.organizationId,
      dedupeKey: `CONTRACT_SIGNED_REVIEWED:${rejectAudit.id}:${rejectRes.body.review.id}`,
    },
  });
  assert.equal(rejectedReviewEvent.eventType, 'CONTRACT_SIGNED_REVIEWED');
  assert.equal(rejectedReviewEvent.correlationId, rejectRes.headers.get('x-request-id'));
  assert.deepEqual(rejectedReviewEvent.payload, {
    contractId,
    reviewId: rejectRes.body.review.id,
    auditEventId: rejectAudit.id,
    opportunityId: testOpportunityId,
    decision: 'REJECTED',
  });
});

test('7. Conferência integral e liberação do gate contratual (SPEC-007 Item 11)', async () => {
  const listRes = await admin.call(`opportunities/${testOpportunityId}/contracts`);
  const contractId = listRes.body[0].id;

  // Upload corrected signed contract
  const fakeSignedPdf2 = Buffer.from('%PDF-1.4 Corrected Signed Contract Moura Solar Complete');
  await admin.call(`contracts/${contractId}/upload-signed`, 'POST', {
    fileName: 'contrato-assinado-corrigido.pdf',
    fileBase64: fakeSignedPdf2.toString('base64'),
    notes: 'Vias completas com todas as testemunhas',
  });

  const beforeReviewCount = await db.signedContractReview.count({ where: { contractId } });
  const beforeActivityCount = await db.activity.count({
    where: { opportunityId: testOpportunityId },
  });
  const beforeAuditCount = await db.auditEvent.count({
    where: { action: 'CONTRACT_VERIFIED_GATE_C', entityId: contractId },
  });
  const beforeReviewEventCount = await db.integrationOutbox.count({
    where: { eventType: 'CONTRACT_SIGNED_REVIEWED', aggregateId: contractId },
  });

  await db.$executeRawUnsafe(`
    CREATE FUNCTION "${schema}".reject_signed_review_outbox_for_test() RETURNS trigger AS $$
    BEGIN
      IF NEW.event_type = 'CONTRACT_SIGNED_REVIEWED' THEN
        RAISE EXCEPTION 'forced signed contract review outbox failure';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);
  await db.$executeRawUnsafe(`
    CREATE TRIGGER reject_signed_review_outbox_for_test
    BEFORE INSERT ON "${schema}"."integration_outbox"
    FOR EACH ROW EXECUTE FUNCTION "${schema}".reject_signed_review_outbox_for_test()
  `);
  const failedVerifyRes = await admin.call(`contracts/${contractId}/verify-signed`, 'POST', {
    partiesMatch: true,
    allPagesPresent: true,
    versionMatches: true,
    signaturesLegible: true,
    decision: 'VERIFIED',
  });
  await db.$executeRawUnsafe(
    `DROP TRIGGER reject_signed_review_outbox_for_test ON "${schema}"."integration_outbox"`,
  );
  await db.$executeRawUnsafe(`DROP FUNCTION "${schema}".reject_signed_review_outbox_for_test()`);
  assert.equal(failedVerifyRes.status, 500);
  assert.equal(await db.signedContractReview.count({ where: { contractId } }), beforeReviewCount);
  assert.equal(
    await db.activity.count({ where: { opportunityId: testOpportunityId } }),
    beforeActivityCount,
  );
  assert.equal(
    await db.auditEvent.count({
      where: { action: 'CONTRACT_VERIFIED_GATE_C', entityId: contractId },
    }),
    beforeAuditCount,
  );
  assert.equal(
    (await db.contract.findUnique({ where: { id: contractId } })).state,
    'SIGNED_UPLOADED',
  );
  assert.equal(
    await db.integrationOutbox.count({
      where: { eventType: 'CONTRACT_SIGNED_REVIEWED', aggregateId: contractId },
    }),
    beforeReviewEventCount,
  );

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
  const verifyAudit = await db.auditEvent.findFirst({
    where: { action: 'CONTRACT_VERIFIED_GATE_C', entityId: contractId },
    orderBy: { createdAt: 'desc' },
  });
  const engineeringActivity = await db.activity.findFirst({
    where: {
      opportunityId: testOpportunityId,
      subject: { contains: 'Engenharia & Executivo: Oportunidade' },
    },
    orderBy: { createdAt: 'desc' },
  });
  const verifyEvent = await db.integrationOutbox.findFirst({
    where: {
      organizationId: engineeringActivity.organizationId,
      dedupeKey: `ACTIVITY_CREATED:${verifyAudit.id}:${engineeringActivity.id}`,
    },
  });
  assert.ok(verifyEvent, 'Conferência aprovada deve emitir evento para a atividade técnica');
  assert.equal(verifyEvent.correlationId, verifyRes.headers.get('x-request-id'));
  assert.deepEqual(verifyEvent.payload, {
    activityId: engineeringActivity.id,
    auditEventId: verifyAudit.id,
    customerId: testCustomerId,
    opportunityId: testOpportunityId,
  });
  const verifiedReview = verifyRes.body.review;
  const verifiedReviewEvent = await db.integrationOutbox.findFirstOrThrow({
    where: {
      organizationId: verifiedReview.organizationId,
      dedupeKey: `CONTRACT_SIGNED_REVIEWED:${verifyAudit.id}:${verifiedReview.id}`,
    },
  });
  assert.equal(verifiedReviewEvent.eventType, 'CONTRACT_SIGNED_REVIEWED');
  assert.equal(verifiedReviewEvent.correlationId, verifyRes.headers.get('x-request-id'));
  assert.deepEqual(verifiedReviewEvent.payload, {
    contractId,
    reviewId: verifiedReview.id,
    auditEventId: verifyAudit.id,
    opportunityId: testOpportunityId,
    decision: 'VERIFIED',
  });

  // Verify Opportunity transitioned to VENDIDO after contract verification.
  const oppRes = await admin.call(`opportunities/${testOpportunityId}`);
  assert.equal(oppRes.status, 200);
  assert.equal(oppRes.body.state, 'VENDIDO');

  // Verify ProjectGate is SATISFIED
  const gates = verifyRes.body.contract.projectGates;
  const contractGate = gates.find((g) => g.gateType === 'CONTRACT');
  assert.ok(contractGate);
  assert.equal(contractGate.status, 'SATISFIED');
});

test('8. Registro de aditivo emite evento v1 atomicamente sem publicar motivo', async () => {
  const listRes = await admin.call(`opportunities/${testOpportunityId}/contracts`);
  assert.equal(listRes.status, 200);
  const contractId = listRes.body[0].id;
  const before = await db.contract.findUniqueOrThrow({ where: { id: contractId } });
  const beforeAuditCount = await db.auditEvent.count({
    where: { action: 'CONTRACT_AMENDMENT_CREATED', entityId: contractId },
  });
  const beforeEventCount = await db.integrationOutbox.count({
    where: { eventType: 'CONTRACT_AMENDMENT_RECORDED', aggregateId: contractId },
  });

  await db.$executeRawUnsafe(`
    CREATE FUNCTION "${schema}".reject_contract_amendment_outbox_for_test() RETURNS trigger AS $$
    BEGIN
      IF NEW.event_type = 'CONTRACT_AMENDMENT_RECORDED' THEN
        RAISE EXCEPTION 'forced contract amendment outbox failure';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);
  await db.$executeRawUnsafe(`
    CREATE TRIGGER reject_contract_amendment_outbox_for_test
    BEFORE INSERT ON "${schema}"."integration_outbox"
    FOR EACH ROW EXECUTE FUNCTION "${schema}".reject_contract_amendment_outbox_for_test()
  `);
  let failedAmendmentRes;
  try {
    failedAmendmentRes = await admin.call(`contracts/${contractId}/amendments`, 'POST', {
      reason: 'Termo confidencial usado para validar rollback',
    });
  } finally {
    await db.$executeRawUnsafe(
      `DROP TRIGGER reject_contract_amendment_outbox_for_test ON "${schema}"."integration_outbox"`,
    );
    await db.$executeRawUnsafe(
      `DROP FUNCTION "${schema}".reject_contract_amendment_outbox_for_test()`,
    );
  }
  assert.equal(failedAmendmentRes.status, 500);
  const afterFailure = await db.contract.findUniqueOrThrow({ where: { id: contractId } });
  assert.equal(afterFailure.state, before.state);
  assert.equal(afterFailure.notes, before.notes);
  assert.equal(
    await db.auditEvent.count({
      where: { action: 'CONTRACT_AMENDMENT_CREATED', entityId: contractId },
    }),
    beforeAuditCount,
  );
  assert.equal(
    await db.integrationOutbox.count({
      where: { eventType: 'CONTRACT_AMENDMENT_RECORDED', aggregateId: contractId },
    }),
    beforeEventCount,
  );

  const amendmentRes = await admin.call(`contracts/${contractId}/amendments`, 'POST', {
    reason: 'Aditivo confirmado pela pessoa responsável',
  });
  assert.equal(amendmentRes.status, 201);
  assert.equal(amendmentRes.body.state, 'AMENDED');
  assert.match(amendmentRes.body.notes, /Aditivo: Aditivo confirmado pela pessoa responsável/);
  const amendmentAudit = await db.auditEvent.findFirstOrThrow({
    where: { action: 'CONTRACT_AMENDMENT_CREATED', entityId: contractId },
    orderBy: { createdAt: 'desc' },
  });
  const event = await db.integrationOutbox.findFirstOrThrow({
    where: {
      organizationId: amendmentAudit.organizationId,
      dedupeKey: `CONTRACT_AMENDMENT_RECORDED:${amendmentAudit.id}`,
    },
  });
  assert.equal(event.eventType, 'CONTRACT_AMENDMENT_RECORDED');
  assert.equal(event.schemaVersion, 1);
  assert.equal(event.aggregateType, 'Contract');
  assert.equal(event.aggregateId, contractId);
  assert.equal(event.correlationId, amendmentRes.headers.get('x-request-id'));
  assert.equal(event.publishedAt, null);
  assert.deepEqual(event.payload, {
    contractId,
    auditEventId: amendmentAudit.id,
    opportunityId: testOpportunityId,
  });
  assert.equal(event.occurredAt.toISOString(), amendmentAudit.createdAt.toISOString());
});

test('9. Cancelamento registra evento v1 atomicamente sem publicar motivo', async () => {
  const listRes = await admin.call(`opportunities/${testOpportunityId}/contracts`);
  assert.equal(listRes.status, 200);
  const contractId = listRes.body[0].id;
  const before = await db.contract.findUniqueOrThrow({ where: { id: contractId } });
  const beforeAuditCount = await db.auditEvent.count({
    where: { action: 'CONTRACT_CANCELED', entityId: contractId },
  });
  const beforeEventCount = await db.integrationOutbox.count({
    where: { eventType: 'CONTRACT_CANCELED', aggregateId: contractId },
  });

  await db.$executeRawUnsafe(`
    CREATE FUNCTION "${schema}".reject_contract_canceled_outbox_for_test() RETURNS trigger AS $$
    BEGIN
      IF NEW.event_type = 'CONTRACT_CANCELED' THEN
        RAISE EXCEPTION 'forced contract cancellation outbox failure';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);
  await db.$executeRawUnsafe(`
    CREATE TRIGGER reject_contract_canceled_outbox_for_test
    BEFORE INSERT ON "${schema}"."integration_outbox"
    FOR EACH ROW EXECUTE FUNCTION "${schema}".reject_contract_canceled_outbox_for_test()
  `);
  let failedCancelRes;
  try {
    failedCancelRes = await admin.call(`contracts/${contractId}/cancel`, 'POST', {
      reason: 'Motivo confidencial usado para validar rollback',
    });
  } finally {
    await db.$executeRawUnsafe(
      `DROP TRIGGER reject_contract_canceled_outbox_for_test ON "${schema}"."integration_outbox"`,
    );
    await db.$executeRawUnsafe(
      `DROP FUNCTION "${schema}".reject_contract_canceled_outbox_for_test()`,
    );
  }
  assert.equal(failedCancelRes.status, 500);
  const afterFailure = await db.contract.findUniqueOrThrow({ where: { id: contractId } });
  assert.equal(afterFailure.state, before.state);
  assert.equal(afterFailure.notes, before.notes);
  assert.equal(
    await db.auditEvent.count({ where: { action: 'CONTRACT_CANCELED', entityId: contractId } }),
    beforeAuditCount,
  );
  assert.equal(
    await db.integrationOutbox.count({
      where: { eventType: 'CONTRACT_CANCELED', aggregateId: contractId },
    }),
    beforeEventCount,
  );

  const cancelRes = await admin.call(`contracts/${contractId}/cancel`, 'POST', {
    reason: 'Cancelamento confirmado pela pessoa responsável',
  });
  assert.equal(cancelRes.status, 200);
  assert.equal(cancelRes.body.state, 'CANCELED');
  const cancellationAudit = await db.auditEvent.findFirstOrThrow({
    where: { action: 'CONTRACT_CANCELED', entityId: contractId },
    orderBy: { createdAt: 'desc' },
  });
  const event = await db.integrationOutbox.findFirstOrThrow({
    where: {
      organizationId: cancellationAudit.organizationId,
      dedupeKey: `CONTRACT_CANCELED:${cancellationAudit.id}`,
    },
  });
  assert.equal(event.eventType, 'CONTRACT_CANCELED');
  assert.equal(event.schemaVersion, 1);
  assert.equal(event.aggregateType, 'Contract');
  assert.equal(event.aggregateId, contractId);
  assert.equal(event.correlationId, cancelRes.headers.get('x-request-id'));
  assert.equal(event.publishedAt, null);
  assert.deepEqual(event.payload, {
    contractId,
    auditEventId: cancellationAudit.id,
    opportunityId: testOpportunityId,
  });
  assert.equal(event.occurredAt.toISOString(), cancellationAudit.createdAt.toISOString());

  const repeatedCancelRes = await admin.call(`contracts/${contractId}/cancel`, 'POST', {
    reason: 'Repetição não deve criar novo fato',
  });
  assert.equal(repeatedCancelRes.status, 400);
  assert.equal(
    await db.integrationOutbox.count({
      where: { eventType: 'CONTRACT_CANCELED', aggregateId: contractId },
    }),
    beforeEventCount + 1,
  );
});
