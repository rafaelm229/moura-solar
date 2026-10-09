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
const schema = `test_comm_${randomUUID().replaceAll('-', '')}`;
url.searchParams.set('schema', schema);

const env = {
  ...process.env,
  PATH: `${process.cwd()}/.bin:/tmp/moura-solar-tools:${process.env.PATH}`,
  DATABASE_URL: url.toString(),
  NODE_ENV: 'test',
  API_PORT: '3321',
  WEB_ORIGIN: 'http://localhost:3320',
  COOKIE_SECURE: 'false',
  ...storageEnv,
  IDENTITY_LINK_SECRET: 'integration-test-link-secret-at-least-32-characters',
  BOOTSTRAP_TOKEN: 'integration-test-bootstrap-at-least-32-characters',
};

const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
let server;
const base = 'http://localhost:3321/api/v1';
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
    return { status: response.status, body: parsedBody };
  }
}

const admin = new Client();
const seller = new Client();
const otherSeller = new Client();

before(async () => {
  const migration = spawnSync('pnpm', ['db:deploy'], { env, encoding: 'utf8' });
  assert.equal(migration.status, 0, migration.stdout + migration.stderr);

  server = spawn('node', ['apps/api/dist/main.js'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', () => {});
  server.stderr.on('data', () => {});

  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      const ping = await fetch(`${base}/health/ready`);
      if (ping.ok) break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    if (attempt === 29) throw new Error('API server failed to start within timeout');
  }

  // 1. Bootstrap admin
  const boot = await admin.call(
    'identity/bootstrap',
    'POST',
    {
      email: 'admin.comm@example.test',
      name: 'Admin Commercial',
      organization: 'Moura Solar Commercial Test',
      password,
    },
    { 'x-bootstrap-token': env.BOOTSTRAP_TOKEN },
  );
  assert.equal(boot.status, 201);

  // 2. Login admin
  const loginRes = await admin.call('identity/login', 'POST', {
    email: 'admin.comm@example.test',
    password,
  });
  assert.equal(loginRes.status, 201);

  // 3. Invite and accept seller
  const roles = await admin.call('identity/roles');
  const sellerRole = roles.body.find((r) => r.name === 'Vendedor');
  assert.ok(sellerRole);

  const invite = await admin.call(
    'identity/invitations',
    'POST',
    {
      email: 'seller.comm@example.test',
      name: 'Vendedor Commercial',
      roleId: sellerRole.id,
    },
    { 'idempotency-key': randomUUID() },
  );
  assert.equal(invite.status, 201);

  const accept = await seller.call('identity/accept-link', 'POST', {
    token: invite.body.token,
    password,
  });
  assert.equal(accept.status, 201);

  const sellerLogin = await seller.call('identity/login', 'POST', {
    email: 'seller.comm@example.test',
    password,
  });
  assert.equal(sellerLogin.status, 201);

  const secondInvite = await admin.call(
    'identity/invitations',
    'POST',
    {
      email: 'seller-two.comm@example.test',
      name: 'Segundo Vendedor Commercial',
      roleId: sellerRole.id,
    },
    { 'idempotency-key': randomUUID() },
  );
  assert.equal(secondInvite.status, 201);
  const secondAccept = await otherSeller.call('identity/accept-link', 'POST', {
    token: secondInvite.body.token,
    password,
  });
  assert.equal(secondAccept.status, 201);
  const secondLogin = await otherSeller.call('identity/login', 'POST', {
    email: 'seller-two.comm@example.test',
    password,
  });
  assert.equal(secondLogin.status, 201);
});

after(async () => {
  server?.kill();
  await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await db.$disconnect();
});

test('duplicate prevention blocks identical taxId unless overridden', async () => {
  const c1 = await seller.call('customers', 'POST', {
    kind: 'PERSON',
    legalName: 'Cliente Teste Duplicidade',
    taxId: '123.456.789-01',
    phone: '(11) 98765-4321',
    email: 'duplicado@example.test',
  });
  assert.equal(c1.status, 201);
  assert.equal(c1.body.legalName, 'Cliente Teste Duplicidade');

  // Attempt duplicate taxId
  const c2 = await seller.call('customers', 'POST', {
    kind: 'PERSON',
    legalName: 'Tentativa Duplicada',
    taxId: '123.456.789-01',
  });
  assert.equal(c2.status, 409);
  assert.equal(c2.body.code, 'CUSTOMER_POSSIBLE_DUPLICATE');

  // Override duplicate with explicit confirmation
  const c3 = await seller.call('customers', 'POST', {
    kind: 'PERSON',
    legalName: 'Cliente com Exceção Aprovada',
    taxId: '123.456.789-01',
    overrideDuplicate: true,
  });
  assert.equal(c3.status, 201);
});

test('customer creation writes a minimal correlated outbox event atomically', async () => {
  const requestId = `r1-customer-${randomUUID()}`;
  const legalName = `Cliente R1 ${randomUUID()}`;
  const created = await seller.call(
    'customers',
    'POST',
    { kind: 'PERSON', legalName, taxId: '987.654.321-00' },
    { 'x-request-id': requestId },
  );
  assert.equal(created.status, 201);

  const event = await db.integrationOutbox.findFirst({
    where: { dedupeKey: `CUSTOMER_CREATED:${created.body.id}` },
  });
  assert.ok(event, 'Cliente e evento outbox devem persistir juntos');
  assert.equal(event.eventType, 'CUSTOMER_CREATED');
  assert.equal(event.schemaVersion, 1);
  assert.equal(event.aggregateType, 'Customer');
  assert.equal(event.aggregateId, created.body.id);
  assert.equal(event.producer, 'customer');
  assert.equal(event.correlationId, requestId);
  assert.equal(event.publishedAt, null);
  assert.deepEqual(event.payload, { customerId: created.body.id });
  assert.equal(JSON.stringify(event.payload).includes(legalName), false);
  assert.equal(JSON.stringify(event.payload).includes('98765432100'), false);

  const failedLegalName = `Cliente R1 rollback ${randomUUID()}`;
  const eventCountBefore = await db.integrationOutbox.count({
    where: { eventType: 'CUSTOMER_CREATED' },
  });
  const auditCountBefore = await db.auditEvent.count({
    where: { action: 'commercial.customer_created' },
  });
  await db.$executeRawUnsafe(`
    CREATE FUNCTION "${schema}".reject_customer_outbox_for_test() RETURNS trigger AS $$
    BEGIN
      IF NEW.event_type = 'CUSTOMER_CREATED' THEN
        RAISE EXCEPTION 'forced customer outbox insert failure';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);
  await db.$executeRawUnsafe(`
    CREATE TRIGGER reject_customer_outbox_for_test
    BEFORE INSERT ON "${schema}"."integration_outbox"
    FOR EACH ROW EXECUTE FUNCTION "${schema}".reject_customer_outbox_for_test()
  `);
  const failed = await seller.call('customers', 'POST', {
    kind: 'PERSON',
    legalName: failedLegalName,
  });
  await db.$executeRawUnsafe(
    `DROP TRIGGER reject_customer_outbox_for_test ON "${schema}"."integration_outbox"`,
  );
  await db.$executeRawUnsafe(`DROP FUNCTION "${schema}".reject_customer_outbox_for_test()`);

  assert.equal(failed.status, 500);
  assert.equal(await db.customer.count({ where: { legalName: failedLegalName } }), 0);
  assert.equal(
    await db.integrationOutbox.count({ where: { eventType: 'CUSTOMER_CREATED' } }),
    eventCountBefore,
  );
  assert.equal(
    await db.auditEvent.count({ where: { action: 'commercial.customer_created' } }),
    auditCountBefore,
  );
});

test('opportunity creation emits minimal correlated event atomically with its first activity', async () => {
  const customer = await seller.call('customers', 'POST', {
    kind: 'PERSON',
    legalName: `Cliente da oportunidade ${randomUUID()}`,
  });
  assert.equal(customer.status, 201);

  const failedTitle = `Oportunidade rollback ${randomUUID()}`;
  const failedActivitySubject = `Atividade rollback ${randomUUID()}`;
  const auditCountBefore = await db.auditEvent.count({
    where: { action: 'commercial.opportunity_created' },
  });
  await db.$executeRawUnsafe(`
    CREATE FUNCTION "${schema}".reject_opportunity_outbox_for_test() RETURNS trigger AS $$
    BEGIN
      IF NEW.event_type = 'OPPORTUNITY_CREATED' THEN
        RAISE EXCEPTION 'forced opportunity outbox insert failure';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);
  await db.$executeRawUnsafe(`
    CREATE TRIGGER reject_opportunity_outbox_for_test
    BEFORE INSERT ON "${schema}"."integration_outbox"
    FOR EACH ROW EXECUTE FUNCTION "${schema}".reject_opportunity_outbox_for_test()
  `);
  const failed = await seller.call('opportunities', 'POST', {
    customerId: customer.body.id,
    title: failedTitle,
    needSummary: 'Dados que não devem ficar após falha',
    firstActivity: {
      type: 'CALL',
      subject: failedActivitySubject,
      dueAt: new Date(Date.now() + 86400000).toISOString(),
    },
  });
  await db.$executeRawUnsafe(
    `DROP TRIGGER reject_opportunity_outbox_for_test ON "${schema}"."integration_outbox"`,
  );
  await db.$executeRawUnsafe(`DROP FUNCTION "${schema}".reject_opportunity_outbox_for_test()`);

  assert.equal(failed.status, 500);
  assert.equal(await db.opportunity.count({ where: { title: failedTitle } }), 0);
  assert.equal(await db.activity.count({ where: { subject: failedActivitySubject } }), 0);
  assert.equal(
    await db.opportunityTransition.count({ where: { opportunity: { title: failedTitle } } }),
    0,
  );
  assert.equal(
    await db.auditEvent.count({ where: { action: 'commercial.opportunity_created' } }),
    auditCountBefore,
  );

  const requestId = `r1-opportunity-${randomUUID()}`;
  const title = `Oportunidade R1 ${randomUUID()}`;
  const activitySubject = `Contato inicial ${randomUUID()}`;
  const created = await seller.call(
    'opportunities',
    'POST',
    {
      customerId: customer.body.id,
      title,
      needSummary: 'Resumo comercial fora do payload do evento',
      firstActivity: {
        type: 'CALL',
        subject: activitySubject,
        dueAt: new Date(Date.now() + 86400000).toISOString(),
      },
    },
    { 'x-request-id': requestId },
  );
  assert.equal(created.status, 201);

  const event = await db.integrationOutbox.findFirst({
    where: { dedupeKey: `OPPORTUNITY_CREATED:${created.body.id}` },
  });
  assert.ok(event, 'Oportunidade e evento outbox devem persistir juntos');
  assert.equal(event.eventType, 'OPPORTUNITY_CREATED');
  assert.equal(event.schemaVersion, 1);
  assert.equal(event.aggregateType, 'Opportunity');
  assert.equal(event.aggregateId, created.body.id);
  assert.equal(event.producer, 'crm');
  assert.equal(event.correlationId, requestId);
  assert.equal(event.publishedAt, null);
  assert.deepEqual(event.payload, {
    opportunityId: created.body.id,
    customerId: customer.body.id,
  });
  assert.equal(JSON.stringify(event.payload).includes(title), false);
  assert.equal(JSON.stringify(event.payload).includes(activitySubject), false);
});

test('utility unit creation emits minimal correlated event atomically', async () => {
  const customer = await seller.call('customers', 'POST', {
    kind: 'PERSON',
    legalName: `Cliente UC R1 ${randomUUID()}`,
  });
  assert.equal(customer.status, 201);

  const failedCode = `FAIL-${randomUUID()}`;
  const auditCountBefore = await db.auditEvent.count({
    where: { action: 'commercial.utility_unit_created' },
  });
  const eventCountBefore = await db.integrationOutbox.count({
    where: { eventType: 'UTILITY_UNIT_CREATED' },
  });
  await db.$executeRawUnsafe(`
    CREATE FUNCTION "${schema}".reject_utility_unit_outbox_for_test() RETURNS trigger AS $$
    BEGIN
      IF NEW.event_type = 'UTILITY_UNIT_CREATED' THEN
        RAISE EXCEPTION 'forced utility unit outbox insert failure';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);
  await db.$executeRawUnsafe(`
    CREATE TRIGGER reject_utility_unit_outbox_for_test
    BEFORE INSERT ON "${schema}"."integration_outbox"
    FOR EACH ROW EXECUTE FUNCTION "${schema}".reject_utility_unit_outbox_for_test()
  `);
  const failed = await seller.call(`customers/${customer.body.id}/utility-units`, 'POST', {
    distributorName: 'Distribuidora R1 falha',
    externalCode: failedCode,
  });
  await db.$executeRawUnsafe(
    `DROP TRIGGER reject_utility_unit_outbox_for_test ON "${schema}"."integration_outbox"`,
  );
  await db.$executeRawUnsafe(`DROP FUNCTION "${schema}".reject_utility_unit_outbox_for_test()`);

  assert.equal(failed.status, 500);
  assert.equal(await db.utilityUnit.count({ where: { customerId: customer.body.id } }), 0);
  assert.equal(
    await db.auditEvent.count({ where: { action: 'commercial.utility_unit_created' } }),
    auditCountBefore,
  );
  assert.equal(
    await db.integrationOutbox.count({ where: { eventType: 'UTILITY_UNIT_CREATED' } }),
    eventCountBefore,
  );

  const requestId = `r1-utility-unit-${randomUUID()}`;
  const externalCode = `UC-${randomUUID()}`;
  const created = await seller.call(
    `customers/${customer.body.id}/utility-units`,
    'POST',
    {
      distributorName: 'Distribuidora R1 validada',
      externalCode,
    },
    { 'x-request-id': requestId },
  );
  assert.equal(created.status, 201);

  const event = await db.integrationOutbox.findFirst({
    where: { dedupeKey: `UTILITY_UNIT_CREATED:${created.body.id}` },
  });
  assert.ok(event, 'UC e evento outbox devem persistir juntos');
  assert.equal(event.eventType, 'UTILITY_UNIT_CREATED');
  assert.equal(event.schemaVersion, 1);
  assert.equal(event.aggregateType, 'UtilityUnit');
  assert.equal(event.aggregateId, created.body.id);
  assert.equal(event.producer, 'crm');
  assert.equal(event.correlationId, requestId);
  assert.equal(event.publishedAt, null);
  assert.deepEqual(event.payload, {
    utilityUnitId: created.body.id,
    customerId: customer.body.id,
  });
  assert.equal(JSON.stringify(event.payload).includes(externalCode), false);
  assert.equal(JSON.stringify(event.payload).includes('Distribuidora'), false);
});

test('optimistic concurrency prevents silent overwrite on customer updates', async () => {
  const created = await seller.call('customers', 'POST', {
    kind: 'COMPANY',
    legalName: 'Empresa Alfa Solar LTDA',
    taxId: '12.345.678/0001-90',
  });
  assert.equal(created.status, 201);
  const id = created.body.id;
  assert.equal(created.body.version, 1);

  // Valid update with expectedVersion 1
  const up1 = await seller.call(`customers/${id}`, 'PATCH', {
    expectedVersion: 1,
    tradeName: 'Alfa Solar',
  });
  assert.equal(up1.status, 200);
  assert.equal(up1.body.version, 2);
  assert.equal(up1.body.tradeName, 'Alfa Solar');

  // Stale update with expectedVersion 1 fails with 409 CONCURRENT_MODIFICATION
  const stale = await seller.call(`customers/${id}`, 'PATCH', {
    expectedVersion: 1,
    tradeName: 'Sobrescrita Proibida',
  });
  assert.equal(stale.status, 409);
  assert.equal(stale.body.code, 'CONCURRENT_MODIFICATION');
});

test('utility unit rejects duplicate code for same distributor', async () => {
  const cust = await seller.call('customers', 'POST', {
    kind: 'PERSON',
    legalName: 'Dono da UC',
  });
  assert.equal(cust.status, 201);

  const u1 = await seller.call(`customers/${cust.body.id}/utility-units`, 'POST', {
    distributorName: 'CEMIG',
    externalCode: 'CEMIG-100200',
    consumerClass: 'RESIDENTIAL',
  });
  assert.equal(u1.status, 201);

  const u2 = await seller.call(`customers/${cust.body.id}/utility-units`, 'POST', {
    distributorName: 'CEMIG',
    externalCode: 'CEMIG-100200',
  });
  assert.equal(u2.status, 409);
  assert.equal(u2.body.code, 'UTILITY_UNIT_ALREADY_EXISTS');
});

test('utility units and opportunities keep customer ownership inside the organization', async () => {
  const customerA = await seller.call('customers', 'POST', {
    kind: 'PERSON',
    legalName: 'Cliente Contexto A',
  });
  const customerB = await seller.call('customers', 'POST', {
    kind: 'PERSON',
    legalName: 'Cliente Contexto B',
  });
  assert.equal(customerA.status, 201);
  assert.equal(customerB.status, 201);

  const addressB = await seller.call(`customers/${customerB.body.id}/addresses`, 'POST', {
    postalCode: '30140071',
    street: 'Rua de teste',
    number: '10',
    city: 'Belo Horizonte',
    state: 'MG',
  });
  assert.equal(addressB.status, 201);

  const crossCustomerAddress = await seller.call(
    `customers/${customerA.body.id}/utility-units`,
    'POST',
    { distributorName: 'CEMIG Contexto', addressId: addressB.body.id },
  );
  assert.equal(crossCustomerAddress.status, 404);
  assert.equal(crossCustomerAddress.body.code, 'ADDRESS_NOT_FOUND');

  const unitB = await seller.call(`customers/${customerB.body.id}/utility-units`, 'POST', {
    distributorName: 'CEMIG Contexto',
    externalCode: 'CONTEXT-UNIT-B',
  });
  assert.equal(unitB.status, 201);

  const crossCustomerOpportunity = await seller.call('opportunities', 'POST', {
    customerId: customerA.body.id,
    utilityUnitId: unitB.body.id,
    title: 'Oportunidade sem vínculo cruzado',
    needSummary: 'Validar o vínculo de propriedade',
    firstActivity: {
      type: 'CALL',
      subject: 'Confirmar propriedade da unidade',
      dueAt: new Date(Date.now() + 86400000).toISOString(),
    },
  });
  assert.equal(crossCustomerOpportunity.status, 404);
  assert.equal(crossCustomerOpportunity.body.code, 'UTILITY_UNIT_NOT_FOUND');

  const opportunity = await seller.call('opportunities', 'POST', {
    customerId: customerA.body.id,
    title: 'Oportunidade com vínculo válido',
    needSummary: 'Validar o vínculo de propriedade',
    firstActivity: {
      type: 'CALL',
      subject: 'Confirmar propriedade da unidade',
      dueAt: new Date(Date.now() + 86400000).toISOString(),
    },
  });
  assert.equal(opportunity.status, 201);

  const crossCustomerUpdate = await seller.call(`opportunities/${opportunity.body.id}`, 'PATCH', {
    expectedVersion: 1,
    utilityUnitId: unitB.body.id,
  });
  assert.equal(crossCustomerUpdate.status, 404);
  assert.equal(crossCustomerUpdate.body.code, 'UTILITY_UNIT_NOT_FOUND');

  const unitA = await seller.call(`customers/${customerA.body.id}/utility-units`, 'POST', {
    distributorName: 'CEMIG Contexto',
    externalCode: 'CONTEXT-UNIT-A',
  });
  assert.equal(unitA.status, 201);

  const validOpportunity = await seller.call('opportunities', 'POST', {
    customerId: customerA.body.id,
    utilityUnitId: unitA.body.id,
    title: 'Oportunidade com UC do mesmo cliente',
    needSummary: 'Vínculo válido no mesmo cliente',
    firstActivity: {
      type: 'CALL',
      subject: 'Coletar dados da unidade',
      dueAt: new Date(Date.now() + 86400000).toISOString(),
    },
  });
  assert.equal(validOpportunity.status, 201);
  assert.equal(validOpportunity.body.utilityUnitId, unitA.body.id);

  const validUpdate = await seller.call(`opportunities/${opportunity.body.id}`, 'PATCH', {
    expectedVersion: 1,
    utilityUnitId: unitA.body.id,
  });
  assert.equal(validUpdate.status, 200);
  assert.equal(validUpdate.body.utilityUnitId, unitA.body.id);

  const saved = await db.opportunity.findUnique({ where: { id: opportunity.body.id } });
  assert.equal(saved.customerId, customerA.body.id);
  assert.equal(saved.utilityUnitId, unitA.body.id);
});

test('creating a utility unit and linking it to an opportunity is atomic and idempotent', async () => {
  const customer = await seller.call('customers', 'POST', {
    kind: 'PERSON',
    legalName: 'Cliente Vinculação Atômica',
  });
  assert.equal(customer.status, 201);

  const opportunity = await seller.call('opportunities', 'POST', {
    customerId: customer.body.id,
    title: 'Oportunidade para UC atômica',
    needSummary: 'Criar e vincular em um comando',
    firstActivity: {
      type: 'CALL',
      subject: 'Confirmar dados da UC',
      dueAt: new Date(Date.now() + 86400000).toISOString(),
    },
  });
  assert.equal(opportunity.status, 201);

  const payload = {
    expectedVersion: 1,
    distributorName: 'CEMIG Atomicidade',
    externalCode: 'ATOMIC-UC-01',
  };
  const idempotencyKey = 'atomic-utility-unit-001';
  const stale = await seller.call(
    `opportunities/${opportunity.body.id}/utility-unit`,
    'POST',
    { ...payload, expectedVersion: 2 },
    { 'idempotency-key': 'atomic-utility-unit-stale' },
  );
  assert.equal(stale.status, 409);
  assert.equal(stale.body.code, 'CONCURRENT_MODIFICATION');
  assert.equal(await db.utilityUnit.count({ where: { externalCode: payload.externalCode } }), 0);

  const created = await seller.call(
    `opportunities/${opportunity.body.id}/utility-unit`,
    'POST',
    payload,
    { 'idempotency-key': idempotencyKey },
  );
  assert.equal(created.status, 201);

  const replay = await seller.call(
    `opportunities/${opportunity.body.id}/utility-unit`,
    'POST',
    payload,
    { 'idempotency-key': idempotencyKey },
  );
  assert.equal(replay.status, 201);
  assert.equal(replay.body.id, created.body.id);

  const changedPayload = await seller.call(
    `opportunities/${opportunity.body.id}/utility-unit`,
    'POST',
    { ...payload, externalCode: 'ATOMIC-UC-02' },
    { 'idempotency-key': idempotencyKey },
  );
  assert.equal(changedPayload.status, 409);
  assert.equal(changedPayload.body.code, 'IDEMPOTENCY_CONFLICT');

  const savedOpportunity = await db.opportunity.findUnique({ where: { id: opportunity.body.id } });
  assert.equal(savedOpportunity.utilityUnitId, created.body.id);
  assert.equal(savedOpportunity.version, 2);
  assert.equal(await db.utilityUnit.count({ where: { customerId: customer.body.id } }), 1);
});

test('atomic utility unit creation enforces the opportunity owner scope', async () => {
  const customer = await seller.call('customers', 'POST', {
    kind: 'PERSON',
    legalName: 'Cliente Escopo do Vendedor',
  });
  assert.equal(customer.status, 201);
  const opportunity = await seller.call('opportunities', 'POST', {
    customerId: customer.body.id,
    title: 'Oportunidade de outro vendedor',
    needSummary: 'Confirmar escopo efetivo do vendedor',
    firstActivity: {
      type: 'CALL',
      subject: 'Confirmar permissões da oportunidade',
      dueAt: new Date(Date.now() + 86400000).toISOString(),
    },
  });
  assert.equal(opportunity.status, 201);

  const denied = await otherSeller.call(
    `opportunities/${opportunity.body.id}/utility-unit`,
    'POST',
    {
      expectedVersion: 1,
      distributorName: 'CEMIG Escopo',
      externalCode: 'SCOPE-DENIED-01',
    },
    { 'idempotency-key': 'utility-unit-scope-denied' },
  );
  assert.equal(denied.status, 403);
  assert.equal(denied.body.code, 'ACCESS_DENIED');
  assert.equal(await db.utilityUnit.count({ where: { customerId: customer.body.id } }), 0);
});

test('opportunity creation is atomic with first activity; transition requires explicit command', async () => {
  const cust = await seller.call('customers', 'POST', {
    kind: 'PERSON',
    legalName: 'Cliente Comercial Oportunidade',
    phone: '(31) 99999-8888',
    email: 'oportunidade@moura.test',
  });
  assert.equal(cust.status, 201);

  // Opportunity creation with required firstActivity
  const opp = await seller.call('opportunities', 'POST', {
    customerId: cust.body.id,
    title: 'Projeto Fotovoltaico Residencial 5 kWp',
    needSummary: 'Consumo médio de 600 kWh/mês',
    estimatedConsumption: 600,
    firstActivity: {
      type: 'CALL',
      subject: 'Ligar para coletar conta de energia',
      dueAt: new Date(Date.now() + 86400000).toISOString(),
    },
  });
  assert.equal(opp.status, 201);
  assert.equal(opp.body.state, 'NOVO');
  assert.ok(opp.body.code.startsWith('OPT-'));
  const oppId = opp.body.id;

  // Verify that an activity was created automatically
  const activities = await seller.call(`activities?opportunityId=${oppId}`);
  assert.equal(activities.status, 200);
  assert.equal(activities.body.length, 1);
  assert.equal(activities.body[0].subject, 'Ligar para coletar conta de energia');
  assert.equal(activities.body[0].status, 'OPEN');

  // Direct state mutation via PATCH is not possible
  const directPatch = await seller.call(`opportunities/${oppId}`, 'PATCH', {
    expectedVersion: 1,
    title: 'Título atualizado',
  });
  assert.equal(directPatch.status, 200);
  assert.equal(directPatch.body.state, 'NOVO'); // State stays NOVO!

  // The outbox failure must roll back the status, transition, activity and audit.
  const transitionCountBefore = await db.opportunityTransition.count({
    where: { opportunityId: oppId },
  });
  const activityCountBeforeQualification = await db.activity.count({
    where: { opportunityId: oppId },
  });
  const qualificationAuditCount = await db.auditEvent.count({
    where: { action: 'commercial.opportunity_qualified', entityId: oppId },
  });
  await db.$executeRawUnsafe(`
    CREATE FUNCTION "${schema}".reject_opportunity_qualified_outbox_for_test() RETURNS trigger AS $$
    BEGIN
      IF NEW.event_type = 'OPPORTUNITY_QUALIFIED' THEN
        RAISE EXCEPTION 'forced opportunity qualification outbox failure';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);
  await db.$executeRawUnsafe(`
    CREATE TRIGGER reject_opportunity_qualified_outbox_for_test
    BEFORE INSERT ON "${schema}"."integration_outbox"
    FOR EACH ROW EXECUTE FUNCTION "${schema}".reject_opportunity_qualified_outbox_for_test()
  `);
  const failedQualification = await seller.call(`opportunities/${oppId}/qualify`, 'POST', {
    expectedVersion: 2,
    confirmedNeedSummary: 'Necessidade confirmada: Sistema 5 kWp On-Grid',
    nextActivity: {
      type: 'TASK',
      subject: 'Realizar dimensionamento preliminar',
      dueAt: new Date(Date.now() + 172800000).toISOString(),
    },
  });
  await db.$executeRawUnsafe(
    `DROP TRIGGER reject_opportunity_qualified_outbox_for_test ON "${schema}"."integration_outbox"`,
  );
  await db.$executeRawUnsafe(
    `DROP FUNCTION "${schema}".reject_opportunity_qualified_outbox_for_test()`,
  );
  assert.equal(failedQualification.status, 500);
  const afterFailedQualification = await db.opportunity.findUnique({ where: { id: oppId } });
  assert.equal(afterFailedQualification.state, 'NOVO');
  assert.equal(afterFailedQualification.version, 2);
  assert.equal(
    await db.opportunityTransition.count({ where: { opportunityId: oppId } }),
    transitionCountBefore,
  );
  assert.equal(
    await db.activity.count({ where: { opportunityId: oppId } }),
    activityCountBeforeQualification,
  );
  assert.equal(
    await db.auditEvent.count({
      where: { action: 'commercial.opportunity_qualified', entityId: oppId },
    }),
    qualificationAuditCount,
  );

  // Qualify command moves state to QUALIFICADO and emits an event for its transition.
  const qualificationRequestId = `r1-qualified-${randomUUID()}`;
  const qualify = await seller.call(
    `opportunities/${oppId}/qualify`,
    'POST',
    {
      expectedVersion: 2,
      confirmedNeedSummary: 'Necessidade confirmada: Sistema 5 kWp On-Grid',
      nextActivity: {
        type: 'TASK',
        subject: 'Realizar dimensionamento preliminar',
        dueAt: new Date(Date.now() + 172800000).toISOString(),
      },
    },
    { 'x-request-id': qualificationRequestId },
  );
  assert.equal(qualify.status, 200);
  assert.equal(qualify.body.state, 'QUALIFICADO');
  const qualificationTransition = await db.opportunityTransition.findFirst({
    where: { opportunityId: oppId, command: 'qualify' },
  });
  assert.ok(qualificationTransition);
  const qualificationEvent = await db.integrationOutbox.findFirst({
    where: { dedupeKey: `OPPORTUNITY_QUALIFIED:${qualificationTransition.id}` },
  });
  assert.ok(qualificationEvent, 'Transição qualificada e evento outbox devem persistir juntos');
  assert.equal(qualificationEvent.eventType, 'OPPORTUNITY_QUALIFIED');
  assert.equal(qualificationEvent.schemaVersion, 1);
  assert.equal(qualificationEvent.aggregateType, 'Opportunity');
  assert.equal(qualificationEvent.aggregateId, oppId);
  assert.equal(qualificationEvent.producer, 'crm');
  assert.equal(qualificationEvent.correlationId, qualificationRequestId);
  assert.equal(qualificationEvent.publishedAt, null);
  assert.deepEqual(qualificationEvent.payload, {
    opportunityId: oppId,
    transitionId: qualificationTransition.id,
    customerId: cust.body.id,
    fromState: 'NOVO',
    toState: 'QUALIFICADO',
  });

  // Verify activity completion requires resultCode
  const currentActivities = await seller.call(`activities?opportunityId=${oppId}`);
  const openAct = currentActivities.body.find((a) => a.status === 'OPEN');
  assert.ok(openAct);

  const failComplete = await seller.call(`activities/${openAct.id}/complete`, 'POST', {
    expectedVersion: 1,
    resultCode: '',
  });
  assert.equal(failComplete.status, 400); // Validation failure on minLength(2)

  const successComplete = await seller.call(`activities/${openAct.id}/complete`, 'POST', {
    expectedVersion: 1,
    resultCode: 'SUCESSO_CONTATO',
    resultNotes: 'Cliente enviou a conta por email',
  });
  assert.equal(successComplete.status, 200);
  assert.equal(successComplete.body.status, 'COMPLETED');

  // Outbox failure must roll back the loss state, transition, activity cancellations and audit.
  const transitionCountBeforeLoss = await db.opportunityTransition.count({
    where: { opportunityId: oppId },
  });
  const activityCountBeforeLoss = await db.activity.count({
    where: { opportunityId: oppId, status: 'OPEN' },
  });
  const lossAuditCount = await db.auditEvent.count({
    where: { action: 'commercial.opportunity_lost', entityId: oppId },
  });
  await db.$executeRawUnsafe(`
    CREATE FUNCTION "${schema}".reject_opportunity_lost_outbox_for_test() RETURNS trigger AS $$
    BEGIN
      IF NEW.event_type = 'OPPORTUNITY_LOST' THEN
        RAISE EXCEPTION 'forced opportunity loss outbox failure';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);
  await db.$executeRawUnsafe(`
    CREATE TRIGGER reject_opportunity_lost_outbox_for_test
    BEFORE INSERT ON "${schema}"."integration_outbox"
    FOR EACH ROW EXECUTE FUNCTION "${schema}".reject_opportunity_lost_outbox_for_test()
  `);
  const failedLoss = await seller.call(`opportunities/${oppId}/lose`, 'POST', {
    expectedVersion: 3,
    lossReason: 'PRECO_ELEVADO',
    lossNotes: 'Falha esperada no outbox; não deve persistir.',
  });
  await db.$executeRawUnsafe(
    `DROP TRIGGER reject_opportunity_lost_outbox_for_test ON "${schema}"."integration_outbox"`,
  );
  await db.$executeRawUnsafe(`DROP FUNCTION "${schema}".reject_opportunity_lost_outbox_for_test()`);
  assert.equal(failedLoss.status, 500);
  const afterFailedLoss = await db.opportunity.findUnique({ where: { id: oppId } });
  assert.equal(afterFailedLoss.state, 'QUALIFICADO');
  assert.equal(afterFailedLoss.version, 3);
  assert.equal(
    await db.opportunityTransition.count({ where: { opportunityId: oppId } }),
    transitionCountBeforeLoss,
  );
  assert.equal(
    await db.activity.count({ where: { opportunityId: oppId, status: 'OPEN' } }),
    activityCountBeforeLoss,
  );
  assert.equal(
    await db.auditEvent.count({
      where: { action: 'commercial.opportunity_lost', entityId: oppId },
    }),
    lossAuditCount,
  );

  // Loss requires a reason, cancels open activities, and emits only transition IDs/state.
  const lossRequestId = `r1-opportunity-lost-${randomUUID()}`;
  const lose = await seller.call(
    `opportunities/${oppId}/lose`,
    'POST',
    {
      expectedVersion: 3,
      lossReason: 'PRECO_ELEVADO',
      lossNotes: 'Cliente optou por adiar a compra',
    },
    { 'x-request-id': lossRequestId },
  );
  assert.equal(lose.status, 200);
  assert.equal(lose.body.state, 'PERDIDO');
  const lossTransition = await db.opportunityTransition.findFirst({
    where: { opportunityId: oppId, command: 'lose' },
  });
  assert.ok(lossTransition);
  const lossEvent = await db.integrationOutbox.findFirst({
    where: { dedupeKey: `OPPORTUNITY_LOST:${lossTransition.id}` },
  });
  assert.ok(lossEvent, 'Perda, transição e evento outbox devem persistir juntos');
  assert.equal(lossEvent.eventType, 'OPPORTUNITY_LOST');
  assert.equal(lossEvent.schemaVersion, 1);
  assert.equal(lossEvent.aggregateType, 'Opportunity');
  assert.equal(lossEvent.aggregateId, oppId);
  assert.equal(lossEvent.producer, 'crm');
  assert.equal(lossEvent.correlationId, lossRequestId);
  assert.equal(lossEvent.publishedAt, null);
  assert.deepEqual(lossEvent.payload, {
    opportunityId: oppId,
    transitionId: lossTransition.id,
    fromState: 'QUALIFICADO',
    toState: 'PERDIDO',
  });

  // Seller without opportunities:reopen receives 403
  const sellerReopen = await seller.call(`opportunities/${oppId}/reopen`, 'POST', {
    expectedVersion: 4,
    justification: 'Vendedor tentando reabrir',
  });
  assert.equal(sellerReopen.status, 403);

  // Admin with opportunities:reopen succeeds and restores state to NOVO
  const adminReopen = await admin.call(`opportunities/${oppId}/reopen`, 'POST', {
    expectedVersion: 4,
    justification: 'Gerente/Admin aprovou reabertura após renegociação',
  });
  assert.equal(adminReopen.status, 200);
  assert.equal(adminReopen.body.state, 'NOVO');
});

test('archive customer is rejected when active opportunities exist', async () => {
  const cust = await seller.call('customers', 'POST', {
    kind: 'PERSON',
    legalName: 'Cliente com Oportunidade Ativa',
  });
  assert.equal(cust.status, 201);

  await seller.call('opportunities', 'POST', {
    customerId: cust.body.id,
    title: 'Projeto Ativo',
    needSummary: 'Residência',
    firstActivity: {
      type: 'TASK',
      subject: 'Contato',
      dueAt: new Date().toISOString(),
    },
  });

  // Seller without customers:archive receives 403
  const sellerArchive = await seller.call(`customers/${cust.body.id}/archive`, 'POST', {
    expectedVersion: 1,
  });
  assert.equal(sellerArchive.status, 403);

  // Admin with customers:archive receives 422 due to active opportunity
  const adminArchive = await admin.call(`customers/${cust.body.id}/archive`, 'POST', {
    expectedVersion: 1,
  });
  assert.equal(adminArchive.status, 422);
  assert.equal(adminArchive.body.code, 'CUSTOMER_HAS_ACTIVE_OPPORTUNITIES');
});
