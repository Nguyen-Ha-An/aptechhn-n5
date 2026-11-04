import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://localhost:4173/', channel: process.env.PLAYWRIGHT_CHANNEL },
  projects: [
    { name: 'desktop', use: devices['Desktop Chrome'] },
    { name: 'mobile', use: { ...devices['iPhone 13'], browserName: 'chromium' } },
  ],
  webServer: {
    command: 'bun run dev --host 127.0.0.1 --port 4173',
    url: 'http://localhost:4173/',
    reuseExistingServer: !process.env.CI,
  },
});
