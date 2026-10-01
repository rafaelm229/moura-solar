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
const schema = `test_inv_${randomUUID().replaceAll('-', '')}`;
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
    return { status: response.status, body: await response.text(), headers: response.headers };
  }
}

const admin = new Client();
let organizationId;
let centralLocationId;
let vehicleLocationId;
let supplierId;
let catalogItemId;
let opportunityId;
let purchaseOrderId;

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

test('1. Bootstrap and authenticate admin', async () => {
  const bootstrapRes = await admin.call(
    'identity/bootstrap',
    'POST',
    {
      name: 'Admin Estoque',
      email: 'admin.estoque@test.moura',
      organization: 'Moura Solar Logística',
      password,
    },
    { 'x-bootstrap-token': env.BOOTSTRAP_TOKEN },
  );
  assert.equal(bootstrapRes.status, 201);

  const loginRes = await admin.call('identity/login', 'POST', {
    email: 'admin.estoque@test.moura',
    password,
  });
  assert.equal(loginRes.status, 201);
  organizationId = loginRes.body.organizationId;
  assert.ok(organizationId);
});

test('2. Create stock locations', async () => {
  const loc1 = await admin.call('inventory/locations', 'POST', {
    code: 'DEP-CENTRAL',
    name: 'Depósito Central Matriz',
    type: 'WAREHOUSE',
    address: 'Av. Industrial, 500 - Galpão 3',
  });
  assert.equal(loc1.status, 201);
  centralLocationId = loc1.body.id;
  assert.equal(loc1.body.code, 'DEP-CENTRAL');

  const loc2 = await admin.call('inventory/locations', 'POST', {
    code: 'VEIC-01',
    name: 'Van Instalação 01',
    type: 'VEHICLE',
  });
  assert.equal(loc2.status, 201);
  vehicleLocationId = loc2.body.id;

  const list = await admin.call('inventory/locations', 'GET');
  assert.equal(list.status, 200);
  assert.equal(list.body.length, 2);
});

test('3. Create supplier and catalog item', async () => {
  const sup = await admin.call('inventory/suppliers', 'POST', {
    code: 'SUP-WEG',
    name: 'WEG Solar Brasil',
    tradeName: 'WEG',
    documentNumber: '07.175.725/0001-63',
    contactName: 'Carlos WEG',
    email: 'solar@weg.test',
    category: 'SOLAR_EQUIPMENT',
    leadTimeDays: 14,
  });
  assert.equal(sup.status, 201);
  supplierId = sup.body.id;

  // Criar item no catálogo via Prisma
  const item = await db.catalogItem.create({
    data: {
      organizationId,
      sku: 'INV-GROWATT-5K',
      kind: 'INVERTER',
      category: 'INVERTER',
      name: 'Inversor Solar Growatt 5kW Monofásico 220V',
      manufacturer: 'Growatt',
      model: 'MIN 5000TL-X',
      unitOfMeasure: 'UN',
      powerRatingKw: 5.0,
      referenceCost: 3500.0,
      referencePrice: 4800.0,
    },
  });
  catalogItemId = item.id;
  assert.ok(catalogItemId);
});

test('4. Issue, approve purchase order and receive goods with seriais', async () => {
  // Criar Ordem de Compra
  const poRes = await admin.call('inventory/purchases', 'POST', {
    supplierId,
    code: 'PO-2026-001',
    notes: 'Compra de 5 inversores Growatt 5kW',
    items: [
      {
        catalogItemId,
        quantityOrdered: 5,
        unitCost: 3400.0,
      },
    ],
  });
  assert.equal(poRes.status, 201);
  purchaseOrderId = poRes.body.id;
  assert.equal(Number(poRes.body.totalAmount), 17000.0);

  // Recebimento físico de 5 unidades com seriais
  const recRes = await admin.call(`inventory/purchases/${purchaseOrderId}/receive`, 'POST', {
    purchaseOrderId,
    locationId: centralLocationId,
    code: 'REC-2026-001',
    invoiceNumber: 'NFe-889911',
    notes: 'Entrada conferida no galpão',
    items: [
      {
        catalogItemId,
        quantityReceived: 5,
        unitCost: 3400.0,
        serialNumbers: ['GRW-5K-001', 'GRW-5K-002', 'GRW-5K-003', 'GRW-5K-004', 'GRW-5K-005'],
      },
    ],
  });
  assert.equal(recRes.status, 201);

  // Verifica saldo atualizado
  const balances = await admin.call(
    `inventory/balances?locationId=${centralLocationId}&catalogItemId=${catalogItemId}`,
    'GET',
  );
  assert.equal(balances.status, 200);
  assert.equal(balances.body.length, 1);
  const bal = balances.body[0];
  assert.equal(Number(bal.physicalOnHand), 5);
  assert.equal(Number(bal.available), 5);
  assert.equal(Number(bal.reserved), 0);
  assert.equal(Number(bal.averageCost), 3400.0);

  // Verifica seriais cadastrados
  const serials = await admin.call(`inventory/serials?catalogItemId=${catalogItemId}`, 'GET');
  assert.equal(serials.status, 200);
  assert.equal(serials.body.length, 5);
  assert.equal(serials.body[0].status, 'IN_STOCK');
});

test('5. Reserve items for opportunity and validate available stock reduction', async () => {
  // Criar cliente e oportunidade via Prisma
  const customer = await db.customer.create({
    data: {
      organizationId,
      legalName: 'Padaria Estrela Solar Ltda',
      taxId: '12.345.678/0001-90',
    },
  });

  const opp = await db.opportunity.create({
    data: {
      organizationId,
      customerId: customer.id,
      ownerUserId: (await db.membership.findFirst({ where: { organizationId } })).userId,
      code: 'OPP-ESTRELA-01',
      title: 'Projeto Solar 5kWp Padaria Estrela',
      needSummary: 'Instalação de 5kWp para reduzir consumo diurno',
    },
  });
  opportunityId = opp.id;

  // Reservar 2 inversores
  const resKit = await admin.call('inventory/reservations', 'POST', {
    opportunityId,
    notes: 'Reserva automática após aprovação comercial',
    items: [
      {
        catalogItemId,
        locationId: centralLocationId,
        quantityNeeded: 2,
      },
    ],
  });
  assert.equal(resKit.status, 201);
  assert.equal(resKit.body.items.length, 1);
  assert.equal(Number(resKit.body.items[0].quantityReserved), 2);

  // Verifica saldo: físico = 5, reservado = 2, disponível = 3
  const balances = await admin.call(
    `inventory/balances?locationId=${centralLocationId}&catalogItemId=${catalogItemId}`,
    'GET',
  );
  const bal = balances.body[0];
  assert.equal(Number(bal.physicalOnHand), 5);
  assert.equal(Number(bal.reserved), 2);
  assert.equal(Number(bal.available), 3);

  // Tentativa de reservar mais do que o disponível (ex: 4 unidades quando só restam 3) deve falhar
  const failRes = await admin.call('inventory/reservations', 'POST', {
    opportunityId,
    items: [
      {
        catalogItemId,
        locationId: centralLocationId,
        quantityNeeded: 4,
      },
    ],
  });
  assert.equal(failRes.status, 400);
});

test('6. Consume reserved item on installation with serial tracking', async () => {
  // Consumir 1 inversor para a oportunidade
  const moveRes = await admin.call('inventory/movements', 'POST', {
    catalogItemId,
    type: 'CONSUME',
    quantity: 1,
    fromLocationId: centralLocationId,
    opportunityId,
    notes: 'Inversor instalado no cliente',
    serialNumbers: ['GRW-5K-001'],
  });
  assert.equal(moveRes.status, 201);

  // Verifica saldo: físico = 4, reservado = 1, disponível = 3
  const balances = await admin.call(
    `inventory/balances?locationId=${centralLocationId}&catalogItemId=${catalogItemId}`,
    'GET',
  );
  const bal = balances.body[0];
  assert.equal(Number(bal.physicalOnHand), 4);
  assert.equal(Number(bal.reserved), 1);
  assert.equal(Number(bal.available), 3);

  // Verifica serial agora marcado como INSTALLED
  const serials = await admin.call('inventory/serials?search=GRW-5K-001', 'GET');
  assert.equal(serials.status, 200);
  assert.equal(serials.body.length, 1);
  assert.equal(serials.body[0].status, 'INSTALLED');
  assert.equal(serials.body[0].opportunityId, opportunityId);
});

test('7. Transfer items between locations and audit trail', async () => {
  // Transferir 1 inversor do Central para a Van de Instalação
  const transferOut = await admin.call('inventory/movements', 'POST', {
    catalogItemId,
    type: 'TRANSFER_OUT',
    quantity: 1,
    fromLocationId: centralLocationId,
    toLocationId: vehicleLocationId,
    notes: 'Em trânsito para a equipe de campo',
  });
  assert.equal(transferOut.status, 201);

  const transferIn = await admin.call('inventory/movements', 'POST', {
    catalogItemId,
    type: 'TRANSFER_IN',
    quantity: 1,
    fromLocationId: centralLocationId,
    toLocationId: vehicleLocationId,
    notes: 'Recebido na van da equipe',
  });
  assert.equal(transferIn.status, 201);

  // Verifica saldos nos dois locais
  const balCentral = (
    await admin.call(
      `inventory/balances?locationId=${centralLocationId}&catalogItemId=${catalogItemId}`,
      'GET',
    )
  ).body[0];
  assert.equal(Number(balCentral.physicalOnHand), 3);
  assert.equal(Number(balCentral.available), 2);

  const balVehicle = (
    await admin.call(
      `inventory/balances?locationId=${vehicleLocationId}&catalogItemId=${catalogItemId}`,
      'GET',
    )
  ).body[0];
  assert.equal(Number(balVehicle.physicalOnHand), 1);
  assert.equal(Number(balVehicle.available), 1);

  // Verifica razão de movimentações
  const movements = await admin.call(`inventory/movements?catalogItemId=${catalogItemId}`, 'GET');
  assert.equal(movements.status, 200);
  assert.ok(movements.body.length >= 4);
});
