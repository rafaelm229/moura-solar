import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { HttpException } from '@nestjs/common';

const derive = (
  password: string,
  salt: string,
  length: number,
  options: { N: number; r: number; p: number; maxmem: number },
): Promise<Buffer> =>
  new Promise((resolve, reject) =>
    scrypt(password, salt, length, options, (error, key) => (error ? reject(error) : resolve(key))),
  );
export const hash = (value: string): string => createHash('sha256').update(value).digest('hex');
export const token = (): string => randomBytes(32).toString('base64url');
export function fail(code: string, message: string, status = 400): never {
  throw new HttpException({ code, message }, status);
}
export async function passwordHash(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const key = (await derive(password, salt, 64, {
    N: 32768,
    r: 8,
    p: 1,
    maxmem: 67108864,
  })) as Buffer;
  return `scrypt$${salt}$${key.toString('hex')}`;
}
export async function verifyPassword(password: string, encoded: string | null): Promise<boolean> {
  const [, salt, expected] = (encoded ?? '').split('$');
  const key = (await derive(password, salt ?? 'invalid-account-dummy-salt', 64, {
    N: 32768,
    r: 8,
    p: 1,
    maxmem: 67108864,
  })) as Buffer;
  const target = Buffer.from(expected ?? '', 'hex');
  return target.length === key.length && timingSafeEqual(key, target);
}
export function cookieValue(header: string | undefined, name: string): string {
  return (
    header
      ?.split(';')
      .map((s) => s.trim())
      .find((s) => s.startsWith(`${name}=`))
      ?.slice(name.length + 1) ?? ''
  );
}

export function deviceLabel(agent: string): string {
  const browser = /Edg\//.test(agent)
    ? 'Edge'
    : /Firefox\//.test(agent)
      ? 'Firefox'
      : /Chrome\//.test(agent)
        ? 'Chrome'
        : /Safari\//.test(agent)
          ? 'Safari'
          : 'Navegador';
  const system = /Android/.test(agent)
    ? 'Android'
    : /iPhone/.test(agent)
      ? 'iPhone'
      : /iPad/.test(agent)
        ? 'iPad'
        : /Windows/.test(agent)
          ? 'Windows'
          : /Macintosh/.test(agent)
            ? 'macOS'
            : /Linux/.test(agent)
              ? 'Linux'
              : 'Dispositivo';
  return `${browser} · ${system}`;
}
