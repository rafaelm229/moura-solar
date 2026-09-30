import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const { PrismaClient } = require('@prisma/client');

const url = new URL(
  process.env.TEST_DATABASE_URL ?? 'postgresql://moura:m1-test-only@localhost:55439/moura_m1_test',
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
  S3_ENDPOINT: 'http://localhost:9000',
  S3_ACCESS_KEY: 'test',
  S3_SECRET_KEY: 'test',
  S3_BUCKET: 'test',
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

  // Qualify command moves state to QUALIFICADO
  const qualify = await seller.call(`opportunities/${oppId}/qualify`, 'POST', {
    expectedVersion: 2,
    confirmedNeedSummary: 'Necessidade confirmada: Sistema 5 kWp On-Grid',
    nextActivity: {
      type: 'TASK',
      subject: 'Realizar dimensionamento preliminar',
      dueAt: new Date(Date.now() + 172800000).toISOString(),
    },
  });
  assert.equal(qualify.status, 200);
  assert.equal(qualify.body.state, 'QUALIFICADO');

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

  // Lose opportunity requires lossReason and cancels open activities
  const lose = await seller.call(`opportunities/${oppId}/lose`, 'POST', {
    expectedVersion: 3,
    lossReason: 'PRECO_ELEVADO',
    lossNotes: 'Cliente optou por adiar a compra',
  });
  assert.equal(lose.status, 200);
  assert.equal(lose.body.state, 'PERDIDO');

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
