import { defineConfig } from '@playwright/test'

const port = 2905
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${port}`

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  retries: 0,
  reporter: 'list',
  use: { baseURL, locale: 'vi-VN', trace: 'retain-on-failure' },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: 'npm run dev', url: baseURL, reuseExistingServer: true, timeout: 30_000 },
})
