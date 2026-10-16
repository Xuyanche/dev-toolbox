import { defineConfig } from '@playwright/test'
import process from 'node:process'

const preview = process.env.PLAYWRIGHT_PREVIEW === '1'
const url = preview ? 'http://127.0.0.1:4173' : 'http://127.0.0.1:5173'

export default defineConfig({
  testDir: './e2e',
  outputDir: './.cache/playwright-results',
  timeout: 30_000,
  workers: 1,
  use: { baseURL: url, channel: 'chrome', headless: true, screenshot: 'only-on-failure' },
  webServer: { command: preview ? 'npm run preview -- --host 127.0.0.1' : 'npm run dev -- --host 127.0.0.1', url, reuseExistingServer: true },
})
