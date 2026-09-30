import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: { baseURL: 'http://localhost:3320', trace: 'retain-on-failure' },
  reporter: [['list'], ['html', { open: 'never' }]],
  webServer: [
    {
      command: 'node scripts/start-e2e-api.mjs',
      url: 'http://localhost:3318/api/v1/health/ready',
      reuseExistingServer: false,
      timeout: 60000,
    },
    {
      command: 'pnpm --filter @moura-solar/web exec next dev --hostname 127.0.0.1 --port 3320',
      url: 'http://localhost:3320',
      env: { API_INTERNAL_URL: 'http://localhost:3318/api/v1' },
      reuseExistingServer: false,
      timeout: 120000,
    },
  ],
});
