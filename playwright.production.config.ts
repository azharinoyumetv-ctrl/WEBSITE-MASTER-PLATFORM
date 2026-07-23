import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './production-tests',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  outputDir: '.playwright-production-results',
  reporter: [
    ['line'],
    ['html', { outputFolder: '.playwright-production-report', open: 'never' }],
  ],
  use: {
    baseURL: process.env.PRODUCTION_BASE_URL || 'https://store.dagangos.com',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'] },
    },
  ],
})
