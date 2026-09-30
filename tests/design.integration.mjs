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
const schema = `test_dsgn_${randomUUID().replaceAll('-', '')}`;
url.searchParams.set('schema', schema);

const env = {
  ...process.env,
  PATH: `${process.cwd()}/.bin:/tmp/moura-solar-tools:${process.env.PATH}`,
  DATABASE_URL: url.toString(),
  NODE_ENV: 'test',
  API_PORT: '3322',
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
const base = 'http://localhost:3322/api/v1';
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

let admin = new Client();
let testCustomerId;
let testUtilityUnitId;
let testOpportunityId;

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

  server = spawn('node', ['apps/api/dist/main.js'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(`${base}/health/ready`);
      if (res.ok) break;
    } catch {}
    if (attempt > 60) throw new Error('API server failed to start for design integration tests.');
    await new Promise((r) => setTimeout(r, 200));
  }

  // Bootstrap
  const bs = await admin.call(
    'identity/bootstrap',
    'POST',
    {
      name: 'Admin Teste',
      email: 'admin.design@example.test',
      organization: 'Moura Solar Design Teste',
      password,
    },
    { 'x-bootstrap-token': env.BOOTSTRAP_TOKEN },
  );
  assert.equal(bs.status, 201);

  // Login admin
  const loginRes = await admin.call('identity/login', 'POST', {
    email: 'admin.design@example.test',
    password,
  });
  assert.equal(loginRes.status, 201);

  // Setup Customer, Utility Unit, and Opportunity
  const custRes = await admin.call('customers', 'POST', {
    kind: 'PERSON',
    legalName: 'Cliente Dimensionamento Teste',
    taxId: '123.456.789-01',
    phone: '(81) 99999-0001',
    email: 'design.teste@example.test',
  });
  assert.equal(custRes.status, 201);
  testCustomerId = custRes.body.id;

  const ucRes = await admin.call(`customers/${testCustomerId}/utility-units`, 'POST', {
    distributorName: 'Neoenergia PE',
    externalCode: 'UC-DESIGN-001',
    consumerClass: 'RESIDENTIAL',
    tariffMode: 'CONVENTIONAL',
    connectionType: 'BIPHASIC',
    voltage: '220V',
  });
  assert.equal(ucRes.status, 201);
  testUtilityUnitId = ucRes.body.id;

  const optRes = await admin.call('opportunities', 'POST', {
    customerId: testCustomerId,
    utilityUnitId: testUtilityUnitId,
    title: 'Projeto Solar 15kWp Residencial',
    needSummary: 'Redução de conta de energia média de 600 kWh',
    estimatedConsumption: 600.0,
    priority: 'HOT',
    firstActivity: {
      type: 'CALL',
      subject: 'Alinhar dimensionamento e proposta',
      dueAt: new Date(Date.now() + 86400000).toISOString(),
    },
  });
  assert.equal(optRes.status, 201);
  testOpportunityId = optRes.body.id;
});

after(async () => {
  if (server) server.kill('SIGTERM');
  await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await db.$disconnect();
});

test('histórico de consumo: calcula média para n meses e sinaliza histórico incompleto quando n < 12', async () => {
  // Cadastra 4 competências de consumo
  const r1 = await admin.call(`utility-units/${testUtilityUnitId}/readings`, 'POST', {
    referenceMonth: '2026-05',
    consumptionKwh: 500.0,
  });
  assert.equal(r1.status, 200);

  const r2 = await admin.call(`utility-units/${testUtilityUnitId}/readings`, 'POST', {
    referenceMonth: '2026-06',
    consumptionKwh: 600.0,
  });
  assert.equal(r2.status, 200);

  const r3 = await admin.call(`utility-units/${testUtilityUnitId}/readings`, 'POST', {
    referenceMonth: '2026-07',
    consumptionKwh: 550.0,
  });
  assert.equal(r3.status, 200);

  const r4 = await admin.call(`utility-units/${testUtilityUnitId}/readings`, 'POST', {
    referenceMonth: '2026-08',
    consumptionKwh: 750.0,
  });
  assert.equal(r4.status, 200);

  // Consulta resumo de consumo da UC
  const summary = await admin.call(`utility-units/${testUtilityUnitId}/readings`, 'GET');
  assert.equal(summary.status, 200);
  assert.equal(summary.body.validMonthsCount, 4);
  assert.equal(summary.body.hasIncompleteHistory, true);
  // Média: (500 + 600 + 550 + 750) / 4 = 2400 / 4 = 600.0
  assert.equal(summary.body.averageMonthlyConsumptionKwh, 600.0);
  assert.equal(summary.body.annualizedConsumptionKwh, 7200.0);
});

test('sugestão de dimensionamento: calcula kWp, módulos e inversores compatíveis', async () => {
  const suggestion = await admin.call('designs/suggest', 'POST', {
    targetMonthlyGenerationKwh: 600.0,
    specificYield: 135.0,
    preferredModulePowerWp: 630,
  });
  assert.equal(suggestion.status, 200);
  assert.equal(suggestion.body.classification, 'ESTIMATED');
  assert.equal(suggestion.body.suggestedModuleQuantity, 8); // Math.ceil((600/135 * 1000) / 630) = ceil(7.05) = 8
  assert.equal(suggestion.body.suggestedDcPowerKwp, 5.04); // 8 * 630 / 1000 = 5.04 kWp
  assert.ok(suggestion.body.suggestedInverterPowerKw > 0);
  assert.ok(suggestion.body.estimatedMonthlyGenerationKwh >= 600.0);
});

test('criação de dimensionamento: inicializa versão 1 com itens e custos', async () => {
  const designRes = await admin.call(`opportunities/${testOpportunityId}/designs`, 'POST', {
    name: 'Dimensionamento Residencial 5kWp',
    systemType: 'ON_GRID',
    targetMonthlyGenerationKwh: 600.0,
    specificYield: 135.0,
  });
  assert.equal(designRes.status, 200);
  assert.equal(designRes.body.name, 'Dimensionamento Residencial 5kWp');
  assert.equal(designRes.body.versions.length, 1);

  const v1 = designRes.body.versions[0];
  assert.equal(v1.versionNumber, 1);
  assert.equal(v1.status, 'DRAFT');
  assert.ok(v1.dcPowerKwp > 0);
  assert.ok(v1.items.length >= 2);
  assert.ok(v1.pricing !== null);
  assert.ok(v1.pricing.totalEstimatedCost > 0);
  assert.ok(v1.pricing.finalPrice > v1.pricing.totalEstimatedCost);
});

test('cenário de aceite SPEC-005 item 16: alteração posterior no catálogo NÃO altera versão aprovada', async () => {
  // 1. Busca dimensionamento criado
  const list = await admin.call(`opportunities/${testOpportunityId}/designs`, 'GET');
  assert.equal(list.status, 200);
  const design = list.body[0];
  const v1 = design.versions[0];

  // 2. Aprova versão 1 (markup de 35% gera margem de ~25.9%, que está acima de 20%)
  const approveRes = await admin.call(`design-versions/${v1.id}/approve`, 'POST', {
    justification: 'Aprovado para proposta comercial',
  });
  assert.equal(approveRes.status, 200);
  assert.equal(approveRes.body.status, 'APPROVED');

  const frozenCost = approveRes.body.pricing.totalEstimatedCost;
  const frozenPrice = approveRes.body.pricing.finalPrice;
  const moduleItem = approveRes.body.items.find((i) => i.category === 'MODULE');
  assert.ok(moduleItem);
  const frozenModuleUnitCost = moduleItem.unitCost;

  // 3. Altera o custo do módulo no catálogo de R$ 650 para R$ 850
  const catalog = await admin.call('catalog?category=MODULE', 'GET');
  const modItem = catalog.body.find((i) => i.id === moduleItem.catalogItemId);
  assert.ok(modItem);

  const updateCat = await admin.call(`catalog/${modItem.id}`, 'PUT', {
    referenceCost: 850.0,
    expectedVersion: modItem.version,
  });
  assert.equal(updateCat.status, 200);
  assert.equal(updateCat.body.referenceCost, 850.0);

  // 4. Consulta a versão aprovada novamente: DEVE PERMANECER INALTERADA com R$ 650 e preços congelados
  const designAfter = await admin.call(`designs/${design.id}`, 'GET');
  assert.equal(designAfter.status, 200);
  const v1After = designAfter.body.versions.find((v) => v.id === v1.id);
  assert.equal(v1After.status, 'APPROVED');
  assert.equal(v1After.pricing.totalEstimatedCost, frozenCost);
  assert.equal(v1After.pricing.finalPrice, frozenPrice);
  const moduleAfter = v1After.items.find((i) => i.category === 'MODULE');
  assert.equal(moduleAfter.unitCost, frozenModuleUnitCost);

  // 5. Tentativa de atualizar a versão aprovada DEVE SER REJEITADA (imutável)
  const updateApproved = await admin.call(`design-versions/${v1.id}`, 'PUT', {
    markupPercent: 40.0,
    items: [],
  });
  assert.equal(updateApproved.status, 422);
  assert.equal(updateApproved.body.code, 'DESIGN_VERSION_IMMUTABLE');

  // 6. Criação de nova versão (v2) herda dados e permite atualizar com o novo catálogo
  const v2Res = await admin.call(`designs/${design.id}/versions`, 'POST', {});
  assert.equal(v2Res.status, 200);
  assert.equal(v2Res.body.versionNumber, 2);
  assert.equal(v2Res.body.status, 'DRAFT');
});

test('regra de alçada de margem (SPEC-005 item 9 e 16): margem < 20% exige justificativa de exceção explícita', async () => {
  const list = await admin.call(`opportunities/${testOpportunityId}/designs`, 'GET');
  const design = list.body[0];
  const v2 = design.versions.find((v) => v.versionNumber === 2);

  // Atualiza v2 com markup muito baixo (ex: 5%), gerando margem bruta de ~4.7% (abaixo de 20%)
  const updateV2 = await admin.call(`design-versions/${v2.id}`, 'PUT', {
    markupPercent: 5.0,
    items: v2.items.map((i) => ({
      catalogItemId: i.catalogItemId,
      kind: i.kind,
      category: i.category,
      description: i.description,
      unitOfMeasure: i.unitOfMeasure,
      quantity: i.quantity,
      unitCost: i.unitCost,
      costSource: i.costSource,
    })),
  });
  assert.equal(updateV2.status, 200);
  assert.ok(updateV2.body.pricing.grossMarginPercent < 20.0);

  // Tenta aprovar sem override: deve ser REJEITADO
  const rejectApprove = await admin.call(`design-versions/${v2.id}/approve`, 'POST', {
    justification: 'Tentando aprovar com margem baixa',
  });
  assert.equal(rejectApprove.status, 422);
  assert.equal(rejectApprove.body.code, 'LOW_MARGIN_APPROVAL_REQUIRED');

  // Fornece justificativa explícita de exceção comercial: deve ser APROVADO
  const approveWithOverride = await admin.call(`design-versions/${v2.id}/approve`, 'POST', {
    overrideLowMarginReason: 'Exceção autorizada pela diretoria comercial para cliente estratégico',
  });
  assert.equal(approveWithOverride.status, 200);
  assert.equal(approveWithOverride.body.status, 'APPROVED');
  assert.equal(
    approveWithOverride.body.justification,
    'Exceção autorizada pela diretoria comercial para cliente estratégico',
  );
});
