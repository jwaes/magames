import { defineConfig, devices } from '@playwright/test'

// E2E/UI tests. Playwright starts the dev server itself, so `npm run test:e2e`
// works from a clean checkout (and in CI).
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: 'http://localhost:5178',
    trace: 'on-first-retry'
  },
  // Chromium with the iPad 6th-gen's CSS viewport in both orientations. Chromium
  // runs anywhere without extra system libs; the app uses only standard web APIs.
  projects: [
    {
      name: 'ipad-landscape',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1080, height: 810 }, hasTouch: true }
    },
    {
      name: 'ipad-portrait',
      use: { ...devices['Desktop Chrome'], viewport: { width: 810, height: 1080 }, hasTouch: true }
    }
  ],
  webServer: {
    command: 'npm run dev -- --port 5178',
    url: 'http://localhost:5178',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000
  }
})
