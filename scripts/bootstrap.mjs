import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
let muted = false;
const output = new Writable({
  write(chunk, encoding, callback) {
    if (!muted) process.stdout.write(chunk);
    callback();
  },
});
const terminal = createInterface({ input: process.stdin, output, terminal: true });
try {
  const name = await terminal.question('Nome do administrador: ');
  const email = await terminal.question('E-mail: ');
  const organization = await terminal.question('Organização: ');
  process.stdout.write('Senha (mínimo 12 caracteres; não será exibida): ');
  muted = true;
  const password = await terminal.question('');
  muted = false;
  process.stdout.write('\n');
  const origin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
  const api = process.env.API_INTERNAL_URL ?? 'http://localhost:3001/api/v1';
  if (!process.env.BOOTSTRAP_TOKEN) throw new Error('Configure BOOTSTRAP_TOKEN no ambiente.');
  const response = await fetch(`${api}/identity/bootstrap`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin,
      'x-requested-with': 'MouraSolar',
      'x-bootstrap-token': process.env.BOOTSTRAP_TOKEN,
    },
    body: JSON.stringify({ name, email, organization, password }),
  });
  if (!response.ok) throw new Error((await response.json()).message ?? 'Bootstrap recusado.');
  console.log(
    'Administrador criado. Entre pela web. O bootstrap está fechado para novas inicializações.',
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  terminal.close();
}
