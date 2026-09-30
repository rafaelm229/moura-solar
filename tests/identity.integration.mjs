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
const schema = `test_${randomUUID().replaceAll('-', '')}`;
url.searchParams.set('schema', schema);
const env = {
  ...process.env,
  PATH: `${process.cwd()}/.bin:/tmp/moura-solar-tools:${process.env.PATH}`,
  DATABASE_URL: url.toString(),
  NODE_ENV: 'test',
  API_PORT: '3319',
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
const base = 'http://localhost:3319/api/v1';
const password = 'Integration-password-2026';
class Client {
  cookies = new Map();
  async call(path, method = 'GET', body, key = randomUUID(), headers = {}) {
    const response = await fetch(`${base}/identity/${path}`, {
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
    return { status: response.status, body: await response.json() };
  }
}
const admin = new Client();
const seller = new Client();
const second = new Client();
let roles;
let sellerId;
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
  // Only the unique schema created by this test is removed; never the configured database.
  await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await db.$disconnect();
});
test('bootstrap requires secret, initializes seven approved roles once', async () => {
  const input = {
    name: 'Admin Teste',
    email: 'admin@example.test',
    password,
    organization: 'Moura Teste',
  };
  assert.equal((await admin.call('bootstrap', 'POST', input)).status, 403);
  assert.equal(
    (
      await admin.call('bootstrap', 'POST', input, undefined, {
        'x-bootstrap-token': env.BOOTSTRAP_TOKEN,
      })
    ).status,
    201,
  );
  assert.equal(
    (
      await admin.call('bootstrap', 'POST', input, undefined, {
        'x-bootstrap-token': env.BOOTSTRAP_TOKEN,
      })
    ).status,
    409,
  );
  assert.equal((await admin.call('login', 'POST', { email: input.email, password })).status, 201);
  roles = (await admin.call('roles')).body;
  assert.equal(roles.length, 7);
  assert.equal(await db.auditEvent.count({ where: { action: 'identity.bootstrap' } }), 1);
});
test('CSRF rejects cross-origin commands', async () => {
  assert.equal(
    (await admin.call('logout', 'POST', undefined, undefined, { origin: 'https://evil.example' }))
      .status,
    403,
  );
  assert.equal((await admin.call('me')).status, 200);
});
test('invitation is atomic and idempotent; token is never persisted raw', async () => {
  const input = {
    name: 'Vendedor Teste',
    email: 'seller@example.test',
    roleId: roles.find((r) => r.name === 'Vendedor').id,
  };
  const key = randomUUID();
  const a = await admin.call('invitations', 'POST', input, key);
  const b = await admin.call('invitations', 'POST', input, key);
  assert.equal(a.status, 201);
  assert.deepEqual(a.body, b.body);
  sellerId = a.body.id;
  assert.equal(await db.user.count({ where: { email: input.email } }), 1);
  assert.equal(
    (await admin.call('invitations', 'POST', { ...input, name: 'Changed' }, key)).status,
    409,
  );
  const persisted = await db.accessLink.findFirst({ where: { membershipId: sellerId } });
  assert.notEqual(persisted.hash, a.body.token);
  assert.equal(
    (await seller.call('accept-link', 'POST', { token: a.body.token, password })).status,
    201,
  );
  assert.equal(
    (await seller.call('accept-link', 'POST', { token: a.body.token, password })).status,
    400,
  );
  assert.equal((await seller.call('login', 'POST', { email: input.email, password })).status, 201);
  assert.equal((await second.call('login', 'POST', { email: input.email, password })).status, 201);
});
test('seller denied every administrative API even with direct calls', async () => {
  for (const path of ['members', 'roles', 'permissions', 'teams', 'team-candidates'])
    assert.equal((await seller.call(path)).status, 403, path);
  assert.equal(
    (
      await seller.call('invitations', 'POST', {
        name: 'Escalation',
        email: 'evil@example.test',
        roleId: roles[0].id,
      })
    ).status,
    403,
  );
  assert.equal((await seller.call(`members/${sellerId}/recovery`, 'POST')).status, 403);
  assert.equal(await db.user.count({ where: { email: 'evil@example.test' } }), 0);
  const context = (await seller.call('me')).body;
  assert.ok(
    context.grants.some((g) => g.permission === 'proposals:view_margin' && g.scope === 'own'),
  );
  assert.ok(!context.grants.some((g) => g.permission === 'users:manage'));
});
test('logout affects only the selected device', async () => {
  assert.equal((await seller.call('logout', 'POST')).status, 201);
  assert.equal((await seller.call('me')).status, 401);
  assert.equal((await second.call('me')).status, 200);
});
test('refresh rotates, reuse revokes family but not other sessions', async () => {
  await seller.call('login', 'POST', { email: 'seller@example.test', password });
  const previous = seller.cookies.get('ms_refresh');
  assert.equal((await seller.call('refresh', 'POST')).status, 201);
  assert.notEqual(seller.cookies.get('ms_refresh'), previous);
  const stolen = new Client();
  stolen.cookies.set('ms_refresh', previous);
  assert.equal((await stolen.call('refresh', 'POST')).status, 401);
  assert.equal((await seller.call('me')).status, 401);
  assert.equal((await second.call('me')).status, 200);
});
test('recovery changes password, revokes every device and invalidates old links', async () => {
  const old = await admin.call(`members/${sellerId}/recovery`, 'POST');
  const fresh = await admin.call(`members/${sellerId}/recovery`, 'POST');
  assert.equal(
    (await seller.call('accept-link', 'POST', { token: old.body.token, password })).status,
    400,
  );
  assert.equal(
    (
      await seller.call('accept-link', 'POST', {
        token: fresh.body.token,
        password: password + '-new',
      })
    ).status,
    201,
  );
  assert.equal((await second.call('me')).status, 401);
  assert.equal(
    (await second.call('login', 'POST', { email: 'seller@example.test', password })).status,
    401,
  );
  assert.equal(
    (
      await second.call('login', 'POST', {
        email: 'seller@example.test',
        password: password + '-new',
      })
    ).status,
    201,
  );
});
test('optimistic concurrency prevents overwrite; blocking revokes sessions', async () => {
  const member = (await admin.call('members')).body.find((m) => m.id === sellerId);
  const body = { version: member.version, roleId: member.roleId, status: 'blocked' };
  const results = await Promise.all([
    admin.call(`members/${sellerId}`, 'PATCH', body),
    admin.call(`members/${sellerId}`, 'PATCH', body),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  assert.equal((await second.call('me')).status, 401);
  assert.equal((await admin.call(`members/${sellerId}/recovery`, 'POST')).status, 409);
});
test('last administrator protection rolls back mutation and audit', async () => {
  const member = (await admin.call('me')).body;
  const response = await admin.call(`members/${member.id}`, 'PATCH', {
    version: member.version,
    roleId: member.roleId,
    status: 'blocked',
  });
  assert.equal(response.status, 409);
  assert.equal((await admin.call('me')).status, 200);
  assert.equal((await db.membership.findUnique({ where: { id: member.id } })).status, 'active');
});
test('organization isolation rejects foreign role and team assignments', async () => {
  const org = await db.organization.create({ data: { name: 'Other', slug: 'other' } });
  const role = await db.role.create({ data: { name: 'Foreign', organizationId: org.id } });
  assert.equal(
    (
      await admin.call('invitations', 'POST', {
        name: 'Wrong',
        email: 'wrong@example.test',
        roleId: role.id,
      })
    ).status,
    404,
  );
  assert.equal(await db.user.count({ where: { email: 'wrong@example.test' } }), 0);
  assert.equal(
    (await admin.call('teams', 'POST', { name: 'Invalid', memberIds: [randomUUID()] })).status,
    400,
  );
});
test('role edits cannot eliminate administration and unknown permissions rejected', async () => {
  const role = roles.find((r) => r.name === 'Administrador');
  assert.equal(
    (
      await admin.call(`roles/${role.id}`, 'PATCH', {
        name: role.name,
        version: role.version,
        grants: [],
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await admin.call('roles', 'POST', {
        name: 'Invalid',
        grants: [{ permission: 'unknown:all', scope: 'organization' }],
      })
    ).status,
    400,
  );
});
test('audit is append-only at database level', async () => {
  await assert.rejects(db.auditEvent.deleteMany(), /immutable|imutável/i);
});

test('administrator lists and revokes another user session', async () => {
  const member = (await admin.call('members')).body.find((m) => m.id === sellerId);
  assert.equal(
    (
      await admin.call(`members/${sellerId}`, 'PATCH', {
        version: member.version,
        roleId: member.roleId,
        status: 'active',
      })
    ).status,
    200,
  );
  await seller.call('login', 'POST', { email: 'seller@example.test', password: password + '-new' });
  const sessions = await admin.call(`members/${sellerId}/sessions`);
  assert.equal(sessions.status, 200);
  assert.equal(sessions.body.length, 1);
  assert.equal((await admin.call(`sessions/${sessions.body[0].id}/revoke`, 'POST')).status, 201);
  assert.equal((await seller.call('me')).status, 401);
});
test('API restart preserves identity and active sessions', async () => {
  server.kill('SIGTERM');
  await new Promise((resolve) => server.once('exit', resolve));
  server = spawn('node', ['apps/api/dist/main.js'], { env, stdio: 'ignore' });
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      if ((await fetch(`${base}/health/ready`)).ok) break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.equal((await admin.call('me')).status, 200);
  assert.ok((await admin.call('members')).body.some((m) => m.id === sellerId));
});
test('login attempt limits are shared and do not reveal account existence', async () => {
  const client = new Client();
  for (let attempt = 0; attempt < 10; attempt++)
    assert.equal(
      (await client.call('login', 'POST', { email: 'absent@example.test', password })).status,
      401,
    );
  assert.equal(
    (await client.call('login', 'POST', { email: 'absent@example.test', password })).status,
    429,
  );
});
