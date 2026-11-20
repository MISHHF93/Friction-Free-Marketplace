import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  workers: Number(process.env.PLAYWRIGHT_WORKERS ?? 2),
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3001",
    trace: "on-first-retry"
  },
  webServer: process.env.PLAYWRIGHT_SKIP_WEB_SERVER
    ? undefined
    : {
        command: process.env.PLAYWRIGHT_USE_PROD === "true" ? "npx next start --hostname 127.0.0.1 -p 3001" : "npm run dev",
        url: "http://127.0.0.1:3001",
        reuseExistingServer: !process.env.CI && process.env.PLAYWRIGHT_USE_PROD !== "true",
        env: {
          NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3001",
          NEXT_PUBLIC_APP_NAME: "Friction-Free Marketplace",
          NEXT_PUBLIC_SUPABASE_URL: "https://local-dev-placeholder.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "local-dev-placeholder",
          SUPABASE_SERVICE_ROLE_KEY: "local-dev-placeholder",
          STRIPE_SECRET_KEY: "sk_test_local_dev_placeholder",
          STRIPE_WEBHOOK_SECRET: "whsec_local_dev_placeholder",
          NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_local_dev_placeholder",
          OPENAI_API_KEY: "sk-local-dev-placeholder",
          MEILISEARCH_HOST: "http://127.0.0.1:7700",
          MEILISEARCH_API_KEY: "local-dev-placeholder",
          ADMIN_WORKER_SECRET: "admin-worker-local-dev-placeholder",
          RESEND_API_KEY: "re_local_dev_placeholder",
          SUPPORT_EMAIL: "support@example.com",
          POSTHOG_KEY: "phc_local_dev_placeholder",
          POSTHOG_HOST: "https://app.posthog.com",
          NEXT_PUBLIC_POSTHOG_HOST: "https://app.posthog.com",
          ...process.env,
          FFM_E2E_AUTH: "true",
          MARKETPLACE_DEMO_MODE: "true",
          NEXT_DIST_DIR: ".next-playwright",
          NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3001"
        },
        timeout: 120_000
      },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "pixel-7", use: { ...devices["Pixel 7"], deviceScaleFactor: 2 }, testMatch: /mobile-layout\.spec\.ts|core-flows\.spec\.ts|a11y\.spec\.ts|money-actions\.spec\.ts/ },
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
