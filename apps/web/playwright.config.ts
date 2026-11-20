import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3001",
    trace: "on-first-retry"
  },
  webServer: process.env.PLAYWRIGHT_SKIP_WEB_SERVER
    ? undefined
    : {
        command: "npm run dev",
        url: "http://127.0.0.1:3001",
        reuseExistingServer: !process.env.CI,
        env: {
          ...process.env,
          FFM_E2E_AUTH: "true",
          MARKETPLACE_DEMO_MODE: "true"
        },
        timeout: 120_000
      },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "pixel-7", use: { ...devices["Pixel 7"] }, testMatch: /mobile-layout\.spec\.ts|core-flows\.spec\.ts|a11y\.spec\.ts|money-actions\.spec\.ts/ },
    {
      name: "iphone-14",
      use: { ...devices["iPhone 14"], browserName: "chromium", defaultBrowserType: "chromium" },
      testMatch: /mobile-layout\.spec\.ts|core-flows\.spec\.ts|a11y\.spec\.ts|money-actions\.spec\.ts/
    },
    {
      name: "iphone-webkit",
      use: { ...devices["iPhone 14"], browserName: "webkit", defaultBrowserType: "webkit" },
      testMatch: /a11y\.spec\.ts|money-actions\.spec\.ts/
    }
  ]
});
