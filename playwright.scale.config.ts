import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/scale',
  fullyParallel: true,
  workers: Number(process.env.GAMAZON_BROWSER_WORKERS || (process.env.CI ? 4 : 8)),
  timeout: 60000,
  outputDir: 'test-results/scale',
  use: { baseURL: 'http://127.0.0.1:3000', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium-concurrent', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: process.env.GAMAZON_E2E_PRODUCTION === 'true' ? 'npm run start' : 'npm run dev',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
