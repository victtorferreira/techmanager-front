import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './test/e2e',
  fullyParallel: true,
  workers: 2,
  use: { baseURL: 'http://127.0.0.1:4173', channel: 'chrome', locale: 'en-US', timezoneId: 'America/Sao_Paulo', headless: true, screenshot: 'only-on-failure' },
  webServer: { command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4173 --strictPort', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI },
});
