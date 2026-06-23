import { defineConfig, devices } from '@playwright/test';

const seedEnv = {
  NEXT_PUBLIC_SUPABASE_URL: '',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
  DATABASE_URL: '',
  OPENAI_API_KEY: '',
  LEJ_ENABLE_TEST_ROLE: '1',
};

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  // Use the production server rather than Turbopack dev/HMR. This makes E2E
  // results representative of a deployed build and prevents dev chunk races
  // when multiple browser engines navigate at once.
  fullyParallel: false,
  workers: 2,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['iPhone 13'] },
    },
  ],
  webServer: [
    {
      command: 'npm run build && npm run start -- --hostname 127.0.0.1 --port 3100',
      url: 'http://127.0.0.1:3100/dashboard',
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      env: {
        ...seedEnv,
        LEJ_TEST_ROLE: 'FUND_MANAGER',
      },
    },
  ],
});
