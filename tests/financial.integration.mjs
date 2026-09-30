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
const schema = `test_fin_${randomUUID().replaceAll('-', '')}`;
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
let testAccountId;
let downPaymentReceivableId;
let secondReceiptId;

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
        `API server failed to start for financial integration tests. Stderr: ${serverStderr}`,
      );
    await new Promise((r) => setTimeout(r, 200));
  }

  // Bootstrap Admin
  const bs = await admin.call(
    'identity/bootstrap',
    'POST',
    {
      name: 'Admin Financeiro',
      email: 'admin.financial@example.test',
      organization: 'Moura Solar Finanças Teste',
      password,
    },
    { 'x-bootstrap-token': env.BOOTSTRAP_TOKEN },
  );
  assert.equal(bs.status, 201);

  // Login
  const loginRes = await admin.call('identity/login', 'POST', {
    email: 'admin.financial@example.test',
    password,
  });
  assert.equal(loginRes.status, 201);

  // Customer
  const custRes = await admin.call('customers', 'POST', {
    kind: 'COMPANY',
    legalName: 'Moura Solar Empreendimentos LTDA',
    tradeName: 'Moura Comercial',
    taxId: '12.345.678/0001-90',
    phone: '(81) 99999-8888',
    email: 'contato@mouraempreendimentos.test',
  });
  assert.equal(custRes.status, 201);
  testCustomerId = custRes.body.id;

  // Address
  await admin.call(`customers/${testCustomerId}/addresses`, 'POST', {
    street: 'Av. Engenheiro Domingos Ferreira',
    number: '1000',
    district: 'Boa Viagem',
    city: 'Recife',
    state: 'PE',
    postalCode: '51111-000',
    isPrimary: true,
  });

  // Utility Unit
  const ucRes = await admin.call(`customers/${testCustomerId}/utility-units`, 'POST', {
    distributorName: 'Neoenergia PE',
    externalCode: 'UC-FIN-12345',
    consumerClass: 'COMMERCIAL',
    tariffMode: 'CONVENTIONAL',
    connectionType: 'TRIPHASIC',
    voltage: '380V',
  });
  assert.equal(ucRes.status, 201);
  testUtilityUnitId = ucRes.body.id;

  // Opportunity
  const optRes = await admin.call('opportunities', 'POST', {
    customerId: testCustomerId,
    utilityUnitId: testUtilityUnitId,
    title: 'Usina Solar Comercial 30 kWp',
    needSummary: 'Redução de custos operacionais com energia solar',
    estimatedConsumption: 3500,
    firstActivity: {
      type: 'CALL',
      subject: 'Alinhamento financeiro inicial',
      dueAt: new Date(Date.now() + 86400000).toISOString(),
    },
  });
  assert.equal(optRes.status, 201);
  testOpportunityId = optRes.body.id;

  // Create Financial Account
  const accRes = await admin.call('financial/accounts', 'POST', {
    name: 'Banco Cora - Conta Principal Operacional',
    accountType: 'CHECKING',
    bankCode: '403',
    agency: '0001',
    accountNumber: '1234567-8',
  });
  assert.equal(accRes.status, 201);
  testAccountId = accRes.body.id;
});

after(async () => {
  if (server) server.kill('SIGKILL');
  await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await db.$disconnect();
});

test('1. Geração de plano de pagamento com entrada, parcelas e comissão estimada', async () => {
  const res = await admin.call(`opportunities/${testOpportunityId}/payment-plan/generate`, 'POST', {
    totalAmount: 40000,
    downPaymentAmount: 8000,
    installmentCount: 4,
    paymentMethod: 'PIX',
    notes: 'Plano com 20% de entrada e saldo em 4x',
  });

  assert.equal(res.status, 201);
  assert.ok(res.body.id);
  assert.equal(Number(res.body.totalAmount), 40000);
  assert.equal(Number(res.body.downPaymentAmount), 8000);
  assert.equal(res.body.receivables.length, 5); // 1 entrada + 4 parcelas

  const downPayment = res.body.receivables[0];
  assert.equal(downPayment.installmentNumber, 1);
  assert.equal(Number(downPayment.originalAmount), 8000);
  assert.equal(downPayment.status, 'OPEN');
  downPaymentReceivableId = downPayment.id;

  const installment1 = res.body.receivables[1];
  assert.equal(installment1.installmentNumber, 2);
  assert.equal(Number(installment1.originalAmount), 8000);
});

test('2. Consulta do resumo financeiro da oportunidade e Gate FINANCIAL pendente', async () => {
  const res = await admin.call(`opportunities/${testOpportunityId}/financial`);
  assert.equal(res.status, 200);

  assert.equal(Number(res.body.indicators.contractedRevenue), 40000);
  assert.equal(Number(res.body.indicators.receivedRevenue), 0);
  assert.equal(Number(res.body.indicators.openReceivables), 40000);
  assert.equal(res.body.financialGate.status, 'PENDING');
  assert.ok(res.body.activePaymentPlan);
  assert.equal(res.body.receivables.length, 5);
  assert.equal(res.body.commissions.length, 1);
  assert.equal(res.body.commissions[0].status, 'ESTIMATED');
});

test('3. Registro de recebimento parcial da entrada mantém Gate FINANCIAL pendente', async () => {
  const res = await admin.call('receipts', 'POST', {
    opportunityId: testOpportunityId,
    accountId: testAccountId,
    amount: 3000,
    paymentMethod: 'PIX',
    payerName: 'Moura Solar Empreendimentos LTDA',
    notes: 'Primeira parte do sinal de entrada',
  });

  assert.equal(res.status, 201);
  assert.ok(res.body.id);
  assert.equal(Number(res.body.amount), 3000);

  // Check financial summary
  const finRes = await admin.call(`opportunities/${testOpportunityId}/financial`);
  assert.equal(finRes.status, 200);
  assert.equal(Number(finRes.body.indicators.receivedRevenue), 3000);
  assert.equal(Number(finRes.body.indicators.openReceivables), 37000);
  assert.equal(finRes.body.financialGate.status, 'PENDING');

  const dp = finRes.body.receivables.find((r) => r.id === downPaymentReceivableId);
  assert.ok(dp);
  assert.equal(dp.status, 'PARTIALLY_PAID');
  assert.equal(Number(dp.paidAmount), 3000);
  assert.equal(Number(dp.outstandingAmount), 5000);
});

test('4. Quitação integral da entrada libera Gate FINANCIAL e adquire comissão', async () => {
  const res = await admin.call('receipts', 'POST', {
    opportunityId: testOpportunityId,
    accountId: testAccountId,
    amount: 5000,
    paymentMethod: 'PIX',
    payerName: 'Moura Solar Empreendimentos LTDA',
    notes: 'Complemento do sinal de entrada',
  });

  assert.equal(res.status, 201);
  secondReceiptId = res.body.id;

  const finRes = await admin.call(`opportunities/${testOpportunityId}/financial`);
  assert.equal(finRes.status, 200);
  assert.equal(Number(finRes.body.indicators.receivedRevenue), 8000);
  assert.equal(Number(finRes.body.indicators.openReceivables), 32000);
  assert.equal(finRes.body.financialGate.status, 'SATISFIED');

  const dp = finRes.body.receivables.find((r) => r.id === downPaymentReceivableId);
  assert.ok(dp);
  assert.equal(dp.status, 'PAID');
  assert.equal(Number(dp.outstandingAmount), 0);

  // Check commission acquired and payable generated
  assert.equal(finRes.body.commissions[0].status, 'ACQUIRED');
  assert.ok(finRes.body.commissions[0].payableId);
  assert.equal(finRes.body.payables.length, 1);
  assert.equal(finRes.body.payables[0].category, 'COMMISSION');
});

test('5. Estorno de recebimento reabre título e reverte Gate FINANCIAL para PENDING', async () => {
  const revRes = await admin.call(`receipts/${secondReceiptId}/reverse`, 'POST', {
    reason: 'Comprovante falso detectado pela auditoria',
  });
  assert.equal(revRes.status, 200);
  assert.equal(revRes.body.success, true);

  const finRes = await admin.call(`opportunities/${testOpportunityId}/financial`);
  assert.equal(finRes.status, 200);
  assert.equal(Number(finRes.body.indicators.receivedRevenue), 3000);
  assert.equal(Number(finRes.body.indicators.openReceivables), 37000);
  assert.equal(finRes.body.financialGate.status, 'PENDING');

  const dp = finRes.body.receivables.find((r) => r.id === downPaymentReceivableId);
  assert.ok(dp);
  assert.equal(dp.status, 'PARTIALLY_PAID');
  assert.equal(Number(dp.paidAmount), 3000);
  assert.equal(Number(dp.outstandingAmount), 5000);
});

test('6. Registro de conta a pagar, liquidação com pagamento e atualização do fluxo de caixa', async () => {
  // Create equipment payable
  const payRes = await admin.call('payables', 'POST', {
    opportunityId: testOpportunityId,
    category: 'EQUIPMENT',
    description: 'Inversor Solar Growatt 30kW Trifásico',
    recipient: 'Solar Distribuidora Nordeste',
    originalAmount: 18000,
    dueDate: '2026-11-10',
  });

  assert.equal(payRes.status, 201);
  assert.ok(payRes.body.id);
  assert.equal(payRes.body.status, 'OPEN');
  const payableId = payRes.body.id;

  // Liquidate payable with payment
  const pmtRes = await admin.call('payments', 'POST', {
    accountId: testAccountId,
    amount: 18000,
    paymentMethod: 'TED',
    documentNumber: 'TED-889900',
    notes: 'Pagamento de inversor solar',
    allocations: [{ payableId, allocatedAmount: 18000 }],
  });

  assert.equal(pmtRes.status, 201);
  assert.ok(pmtRes.body.id);

  // Check cash flow
  const cfRes = await admin.call('financial/cash-flow');
  assert.equal(cfRes.status, 200);
  assert.ok(cfRes.body.summary);
  assert.ok(cfRes.body.movements.length >= 3); // initial receipt + second receipt + reversal + payment

  const paymentMovement = cfRes.body.movements.find(
    (m) => m.type === 'PAYMENT' && Number(m.amount) === 18000,
  );
  assert.ok(paymentMovement);
  assert.equal(paymentMovement.direction, 'OUT');
});
