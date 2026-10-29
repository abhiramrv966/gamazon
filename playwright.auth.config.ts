import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/auth',
  workers: 2,
  fullyParallel: true,
  timeout: 45000,
  outputDir: 'test-results/auth',
  use: { baseURL: 'http://127.0.0.1:3001', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium-auth', use: { ...devices['Desktop Chrome'] } }],
  webServer:
    process.env.GAMAZON_AUTH_EXTERNAL === 'true'
      ? undefined
      : [
          {
            command: 'node tests/fixtures/auth-provider.mjs',
            url: 'http://127.0.0.1:54329/__test__/health',
            reuseExistingServer: false,
          },
          {
            command: 'node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3001',
            url: 'http://127.0.0.1:3001/signin',
            timeout: 120000,
            reuseExistingServer: false,
            env: {
              NEXT_BUILD_DIR: '.next/auth-e2e',
              GAMAZON_DEMO: 'false',
              NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54329',
              NEXT_PUBLIC_SUPABASE_ANON_KEY: 'local-auth-contract-fixture',
              NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:3001',
            },
          },
        ],
});
