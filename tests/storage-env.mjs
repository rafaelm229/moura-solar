import { existsSync, readFileSync } from 'node:fs';

// Read only storage settings; never print .env or credentials in test output.
const local = existsSync('.env')
  ? Object.fromEntries(
      readFileSync('.env', 'utf8')
        .split('\n')
        .map((line) => line.match(/^([A-Z_]+)=(.*)$/))
        .filter(Boolean)
        .map(([, key, value]) => [key, value.replace(/^['"]|['"]$/g, '')]),
    )
  : {};
export const storageEnv = {
  S3_ENDPOINT: process.env.TEST_S3_ENDPOINT ?? 'http://localhost:9000',
  S3_ACCESS_KEY: process.env.TEST_S3_ACCESS_KEY ?? local.S3_ACCESS_KEY ?? 'moura-local',
  S3_SECRET_KEY: process.env.TEST_S3_SECRET_KEY ?? local.S3_SECRET_KEY ?? 'change-me-minio',
  S3_BUCKET: process.env.TEST_S3_BUCKET ?? 'moura-solar-tests',
  S3_BACKEND: 'MINIO',
  CLAMD_HOST: process.env.TEST_CLAMD_HOST ?? 'localhost',
  CLAMD_PORT: process.env.TEST_CLAMD_PORT ?? '3310',
};
