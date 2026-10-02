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
const schema = `test_aut_${randomUUID().replaceAll('-', '')}`;
url.searchParams.set('schema', schema);

const env = {
  ...process.env,
  PATH: `${process.cwd()}/.bin:/tmp/moura-solar-tools:${process.env.PATH}`,
  DATABASE_URL: url.toString(),
  NODE_ENV: 'test',
  API_PORT: '3327',
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
const base = 'http://localhost:3327/api/v1';
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
let adminUserId;
let attentionItemId;
let ruleId;
let goalId;
let notificationId;

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

test('1. Bootstrap organization and authenticate admin', async () => {
  const bootstrapRes = await client.call(
    '/identity/bootstrap',
    'POST',
    {
      name: 'Admin Automações',
      email: 'admin.automacoes@example.test',
      password,
      organization: 'Moura Solar Automações Teste',
    },
    randomUUID(),
    { 'x-bootstrap-token': env.BOOTSTRAP_TOKEN },
  );
  assert.equal(bootstrapRes.status, 201);

  const loginRes = await client.call('/identity/login', 'POST', {
    email: 'admin.automacoes@example.test',
    password,
  });
  assert.equal(loginRes.status, 201);

  const meRes = await client.call('/identity/me');
  assert.equal(meRes.status, 200);
  organizationId = meRes.body.organizationId;
  adminUserId = meRes.body.userId;
  assert.ok(organizationId);
  assert.ok(adminUserId);
});

test('2. Central de Atenção — Criação e Deduplicação (Critério 9)', async () => {
  const dedupKey = `opp-stalled-${randomUUID()}`;

  // Create attention item
  const res1 = await client.call('/automations/attention-items', 'POST', {
    sourceType: 'OPPORTUNITY',
    sourceId: randomUUID(),
    kind: 'ALERT',
    severity: 'HIGH',
    title: 'Oportunidade estagnada há mais de 15 dias',
    description: 'Sem atividades registradas pelo vendedor',
    reasonCode: 'STALLED_OPPORTUNITY',
    deduplicationKey: dedupKey,
  });
  assert.equal(res1.status, 201);
  assert.equal(res1.body.status, 'OPEN');
  assert.equal(res1.body.occurrenceCount, 1);
  attentionItemId = res1.body.id;

  // Post duplicate with same deduplicationKey
  const res2 = await client.call('/automations/attention-items', 'POST', {
    sourceType: 'OPPORTUNITY',
    sourceId: randomUUID(),
    kind: 'ALERT',
    severity: 'CRITICAL',
    title: 'Oportunidade estagnada há mais de 15 dias (URGENTE)',
    reasonCode: 'STALLED_OPPORTUNITY',
    deduplicationKey: dedupKey,
  });
  assert.equal(res2.status, 201);
  assert.equal(res2.body.id, attentionItemId); // Same record
  assert.equal(res2.body.occurrenceCount, 2); // Incremented
  assert.equal(res2.body.severity, 'CRITICAL');

  // List attention items
  const listRes = await client.call('/automations/attention-items?status=OPEN');
  assert.equal(listRes.status, 200);
  assert.ok(listRes.body.length >= 1);
});

test('3. Central de Atenção — Resolução Justificada e Reabertura Automática', async () => {
  // Reject resolution with empty reason
  const failRes = await client.call(
    `/automations/attention-items/${attentionItemId}/resolve`,
    'POST',
    { resolutionReason: '  ' },
  );
  assert.equal(failRes.status, 400);

  // Resolve with valid reason
  const resolveRes = await client.call(
    `/automations/attention-items/${attentionItemId}/resolve`,
    'POST',
    { resolutionReason: 'Vendedor contatou cliente e reagendou visita técnica.' },
  );
  assert.equal(resolveRes.status, 200);
  assert.equal(resolveRes.body.status, 'RESOLVED');
  assert.equal(
    resolveRes.body.resolutionReason,
    'Vendedor contatou cliente e reagendou visita técnica.',
  );

  // Re-triggering same deduplicationKey should re-open it
  const retriggerRes = await client.call('/automations/attention-items', 'POST', {
    sourceType: 'OPPORTUNITY',
    sourceId: randomUUID(),
    kind: 'ALERT',
    severity: 'HIGH',
    title: 'Oportunidade estagnada reincidente',
    reasonCode: 'STALLED_OPPORTUNITY',
    deduplicationKey: resolveRes.body.deduplicationKey,
  });
  assert.equal(retriggerRes.status, 201);
  assert.equal(retriggerRes.body.id, attentionItemId);
  assert.equal(retriggerRes.body.status, 'OPEN');
  assert.equal(retriggerRes.body.occurrenceCount, 3);
  assert.equal(retriggerRes.body.resolutionReason, null);

  // Discard item with justification
  const discardRes = await client.call(
    `/automations/attention-items/${attentionItemId}/discard`,
    'POST',
    { resolutionReason: 'Oportunidade foi arquivada a pedido da gerência comercial.' },
  );
  assert.equal(discardRes.status, 200);
  assert.equal(discardRes.body.status, 'DISCARDED');
});

test('4. Motor de Automações — Regras Versionadas (Critério 2)', async () => {
  const ruleKey = 'RULE_INVENTORY_RESTOCK_CHECK';

  // Create version 1
  const r1 = await client.call('/automations/rules', 'POST', {
    ruleKey,
    name: 'Alerta de Reposição de Estoque',
    triggerEvent: 'STOCK_LEVEL_BELOW_MINIMUM',
    actions: [
      {
        type: 'CREATE_ATTENTION_ITEM',
        params: { severity: 'HIGH', kind: 'ALERT', reasonCode: 'STOCK_DEPLETED' },
      },
    ],
  });
  assert.equal(r1.status, 201);
  assert.equal(r1.body.version, 1);
  assert.equal(r1.body.status, 'ACTIVE');
  ruleId = r1.body.id;

  // Create version 2 with same ruleKey
  const r2 = await client.call('/automations/rules', 'POST', {
    ruleKey,
    name: 'Alerta de Reposição de Estoque v2',
    triggerEvent: 'STOCK_LEVEL_BELOW_MINIMUM',
    actions: [
      {
        type: 'CREATE_ATTENTION_ITEM',
        params: { severity: 'CRITICAL', kind: 'ALERT', reasonCode: 'STOCK_DEPLETED' },
      },
    ],
  });
  assert.equal(r2.status, 201);
  assert.equal(r2.body.version, 2);
  assert.equal(r2.body.status, 'ACTIVE');

  // Verify v1 is now PAUSED
  const oldRule = await client.call(`/automations/rules/${ruleId}`);
  assert.equal(oldRule.status, 200);
  assert.equal(oldRule.body.status, 'PAUSED');
});

test('5. Motor de Automações — Avaliação e Idempotência Estrita (Critério 1)', async () => {
  const idempotencyKey = `evt-stock-eval-${randomUUID()}`;

  // Evaluate event
  const eval1 = await client.call('/automations/events/evaluate', 'POST', {
    eventName: 'STOCK_LEVEL_BELOW_MINIMUM',
    payload: { sourceId: 'sku-mod-550w', sku: 'MOD-MOURA-550W', quantity: 2 },
    idempotencyKey,
  });
  assert.equal(eval1.status, 200);
  assert.equal(eval1.body.idempotent, false);
  assert.equal(eval1.body.rulesMatched, 1);
  assert.equal(eval1.body.executions.length, 1);
  assert.equal(eval1.body.executions[0].status, 'COMPLETED');

  // Re-evaluate the exact same event
  const eval2 = await client.call('/automations/events/evaluate', 'POST', {
    eventName: 'STOCK_LEVEL_BELOW_MINIMUM',
    payload: { sourceId: 'sku-mod-550w', sku: 'MOD-MOURA-550W', quantity: 2 },
    idempotencyKey,
  });
  assert.equal(eval2.status, 200);
  assert.equal(eval2.body.idempotent, true);
  assert.equal(eval2.body.status, 'IDEMPOTENT_IGNORED');

  // List executions
  const execs = await client.call('/automations/executions');
  assert.equal(execs.status, 200);
  assert.ok(execs.body.length >= 1);
});

test('6. Notificações e Preferências do Usuário', async () => {
  // Create notification
  const notifRes = await client.call('/automations/notifications', 'POST', {
    recipientId: adminUserId,
    subject: 'Equipamento em Quarentena',
    body: 'Inversor 5 kW recebido com avaria física na embalagem.',
  });
  assert.equal(notifRes.status, 201);
  assert.equal(notifRes.body.status, 'UNREAD');
  notificationId = notifRes.body.id;

  // Check unread count
  const countRes = await client.call('/automations/notifications/unread-count');
  assert.equal(countRes.status, 200);
  assert.equal(countRes.body.count, 1);

  // Mark single as read
  const readRes = await client.call(`/automations/notifications/${notificationId}/read`, 'PATCH');
  assert.equal(readRes.status, 200);
  assert.equal(readRes.body.status, 'READ');

  const afterCount = await client.call('/automations/notifications/unread-count');
  assert.equal(afterCount.body.count, 0);

  // Configure user preferences
  const prefRes = await client.call('/automations/notification-preferences', 'PUT', {
    category: 'OPERATIONAL',
    channel: 'INTERNAL',
    enabled: true,
    quietHoursStart: '22:00',
    quietHoursEnd: '06:00',
  });
  assert.equal(prefRes.status, 200);
  assert.equal(prefRes.body.quietHoursStart, '22:00');

  // List preferences
  const listPref = await client.call('/automations/notification-preferences');
  assert.equal(listPref.status, 200);
  assert.ok(listPref.body.length >= 1);
});

test('7. Metas — Versionamento e Progresso (Princípio 3)', async () => {
  // Create goal
  const g1 = await client.call('/automations/goals', 'POST', {
    metricKey: 'SALES_VALUE',
    name: 'Meta Vendas Q4 2026',
    periodStart: '2026-10-01T00:00:00.000Z',
    periodEnd: '2026-12-31T23:59:59.000Z',
    targetValue: 2000000,
    unit: 'BRL',
  });
  assert.equal(g1.status, 201);
  assert.equal(g1.body.version, 1);
  assert.equal(g1.body.status, 'ACTIVE');
  goalId = g1.body.id;

  // List goals and check progress
  const listGoals = await client.call('/automations/goals');
  assert.equal(listGoals.status, 200);
  assert.ok(listGoals.body.length >= 1);
  const found = listGoals.body.find((g) => g.id === goalId);
  assert.ok(found);
  assert.equal(found.progressPercent, 0);

  // Version the goal
  const g2 = await client.call('/automations/goals', 'POST', {
    metricKey: 'SALES_VALUE',
    name: 'Meta Vendas Q4 2026 (Revisada)',
    periodStart: '2026-10-01T00:00:00.000Z',
    periodEnd: '2026-12-31T23:59:59.000Z',
    targetValue: 2500000,
    unit: 'BRL',
  });
  assert.equal(g2.status, 201);
  assert.equal(g2.body.version, 2);
  assert.equal(g2.body.status, 'ACTIVE');
});

test('8. Indicadores Operacionais e Projeções Calculadas (Princípio 2)', async () => {
  // Query calculated indicators
  const indRes = await client.call('/automations/indicators');
  assert.equal(indRes.status, 200);
  assert.ok(indRes.body.commercial);
  assert.ok(indRes.body.financial);
  assert.ok(indRes.body.operations);
  assert.ok(indRes.body.afterSales);
  assert.ok(indRes.body.attention);
  assert.ok(indRes.body.observability);
  assert.ok(indRes.body.observability.calculatedAt);

  // Recalculate projections
  const projRes = await client.call('/automations/projections/recalculate', 'POST');
  assert.equal(projRes.status, 200);
  assert.ok(Array.isArray(projRes.body));
  assert.equal(projRes.body.length, 2);
  assert.ok(projRes.body[0].metricKey);
  assert.ok(projRes.body[0].period);
});
