// Explicit local-only demonstration seed; all business mutations go through NestJS.
const api = process.env.API_INTERNAL_URL ?? 'http://localhost:3001/api/v1';
const origin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
const password = process.env.SEED_PASSWORD;
if (
  process.env.NODE_ENV === 'production' ||
  !['localhost', '127.0.0.1'].includes(new URL(api).hostname)
)
  throw new Error('Seed permitido apenas em API local de desenvolvimento.');
if (!password || password.length < 12 || !process.env.BOOTSTRAP_TOKEN)
  throw new Error(
    'Defina SEED_PASSWORD (12+ caracteres) e BOOTSTRAP_TOKEN. Nenhuma senha padrão é incluída.',
  );
let cookies = '';
async function call(path, body, headers = {}) {
  const response = await fetch(`${api}/identity/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      origin,
      'x-requested-with': 'MouraSolar',
      'content-type': 'application/json',
      cookie: cookies,
      'idempotency-key': crypto.randomUUID(),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`${path}: ${data.message}`);
  const values = response.headers.getSetCookie();
  if (values.length) cookies = values.map((v) => v.split(';')[0]).join('; ');
  return data;
}
await call(
  'bootstrap',
  {
    name: 'Administrador demonstração',
    email: 'admin@example.test',
    organization: 'Moura Solar Demonstração',
    password,
  },
  { 'x-bootstrap-token': process.env.BOOTSTRAP_TOKEN },
);
await call('login', { email: 'admin@example.test', password });
const roles = await call('roles');
for (const [index, role] of roles.filter((r) => r.name !== 'Administrador').entries()) {
  const invitation = await call('invitations', {
    name: `${role.name} demonstração`,
    email: `perfil${index + 1}@example.test`,
    roleId: role.id,
  });
  await call('accept-link', { token: invitation.token, password });
}
await call('logout', {});
console.log(
  'Organização e sete perfis fictícios criados. A senha foi fornecida somente pelo ambiente.',
);
