import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './test',
  timeout: 180000,
  expect: { timeout: 30000 },
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_URL || 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    channel: 'msedge',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium', channel: 'msedge' },
    },
  ],
});
