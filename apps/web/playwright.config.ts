import { defineConfig, devices } from "@playwright/test";

// chrome-headless-shell hangs on accessibility queries and axe evaluate in this environment.
process.env.PLAYWRIGHT_CHROMIUM_USE_HEADLESS_SHELL ??= "0";

// Chromium-only flags; WebKit rejects them.
const chromiumLaunch = { args: ["--no-sandbox", "--disable-dev-shm-usage"] };

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  workers: Number(process.env.PLAYWRIGHT_WORKERS ?? 2),
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3001",
    trace: "on-first-retry",
    serviceWorkers: "block",
    // The dev server compiles routes on first hit and the inert test env waits on unreachable services, so allow more time there.
    navigationTimeout: process.env.PLAYWRIGHT_USE_PROD === "true" ? 15_000 : 30_000
  },
  webServer: process.env.PLAYWRIGHT_SKIP_WEB_SERVER
    ? undefined
    : {
        command: process.env.PLAYWRIGHT_USE_PROD === "true" ? "bash scripts/start-playwright-prod.sh" : "npm run dev",
        url: "http://127.0.0.1:3001",
        reuseExistingServer: !process.env.CI && process.env.PLAYWRIGHT_USE_PROD !== "true",
        env: {
          NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3001",
          NEXT_PUBLIC_APP_NAME: "Friction-Free Marketplace",
          NEXT_PUBLIC_SUPABASE_URL: "https://local-dev-inert.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "local-dev-inert",
          SUPABASE_SERVICE_ROLE_KEY: "local-dev-inert",
          STRIPE_SECRET_KEY: "sk_test_local_dev_inert",
          STRIPE_WEBHOOK_SECRET: "whsec_local_dev_inert",
          NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_local_dev_inert",
          OPENAI_API_KEY: "sk-local-dev-inert",
          MEILISEARCH_HOST: "http://127.0.0.1:7700",
          MEILISEARCH_API_KEY: "local-dev-inert",
          ADMIN_WORKER_SECRET: "admin-worker-local-dev-inert",
          RESEND_API_KEY: "re_local_dev_inert",
          RESEND_FROM_EMAIL: "Friction-Free Marketplace <hello@ffm-local.test>",
          SUPPORT_EMAIL: "support@ffm-local.test",
          POSTHOG_KEY: "phc_local_dev_inert",
          POSTHOG_HOST: "https://app.posthog.com",
          NEXT_PUBLIC_POSTHOG_HOST: "https://app.posthog.com",
          ...process.env,
          FFM_E2E_AUTH: "true",
          MARKETPLACE_DEMO_MODE: "true",
          NEXT_DIST_DIR: ".next-playwright",
          NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3001",
          HOSTNAME: "127.0.0.1",
          PORT: "3001"
        },
        timeout: 120_000
      },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], launchOptions: chromiumLaunch } },
    { name: "pixel-7", use: { ...devices["Pixel 7"], deviceScaleFactor: 2, launchOptions: chromiumLaunch }, testMatch: /mobile-layout\.spec\.ts|core-flows\.spec\.ts|a11y\.spec\.ts|money-actions\.spec\.ts/ },
    {
      name: "iphone-14",
      use: { ...devices["iPhone 14"], browserName: "chromium", defaultBrowserType: "chromium", launchOptions: chromiumLaunch },
      testMatch: /mobile-layout\.spec\.ts|core-flows\.spec\.ts|a11y\.spec\.ts|money-actions\.spec\.ts/
    },
    {
      name: "iphone-webkit",
      use: { ...devices["iPhone 14"], browserName: "webkit", defaultBrowserType: "webkit" },
      testMatch: /a11y\.spec\.ts|money-actions\.spec\.ts/
    }
  ]
});
