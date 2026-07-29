const isDevelopmentRuntime = process.env.NODE_ENV !== "production";
const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  isDevelopmentRuntime ? "'unsafe-eval'" : null,
  "https://js.stripe.com",
  "https://*.posthog.com"
].filter(Boolean).join(" ");

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self), payment=(self)" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "form-action 'self'",
      `script-src ${scriptSrc}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://*.posthog.com"
    ].join("; ")
  },
  // Never send HSTS in local development — browsers cache it and then force
  // https://localhost, which has no TLS listener and surfaces as ERR_CONNECTION_REFUSED.
  ...(isDevelopmentRuntime
    ? []
    : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }])
];

// Standalone output is for Docker/self-host. Vercel manages its own output packaging.
const useStandaloneOutput = process.env.VERCEL !== "1";

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(useStandaloneOutput ? { output: "standalone" } : {}),
  allowedDevOrigins: ["127.0.0.1"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders
      }
    ];
  }
};

const localDevelopmentEnvironment = {
  NEXT_PUBLIC_APP_URL: "http://localhost:3001",
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
  NEXT_PUBLIC_POSTHOG_HOST: "https://app.posthog.com"
};

const requiredEnvironmentVariables = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "OPENAI_API_KEY",
  "MEILISEARCH_HOST",
  "MEILISEARCH_API_KEY",
  "RESEND_API_KEY",
  "SUPPORT_EMAIL",
  "POSTHOG_KEY",
  "NEXT_PUBLIC_APP_URL"
];

const requiredUrlEnvironmentVariables = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "MEILISEARCH_HOST",
  "NEXT_PUBLIC_APP_URL"
];

function validateStartupEnvironment() {
  const errors = [];

  for (const variable of requiredEnvironmentVariables) {
    if (!process.env[variable]?.trim()) {
      errors.push(`- ${variable}: required value is missing.`);
    }
  }

  for (const variable of requiredUrlEnvironmentVariables) {
    const value = process.env[variable];
    if (!value) continue;

    try {
      new URL(value);
    } catch {
      errors.push(`- ${variable}: must be a valid URL.`);
    }
  }

  if (errors.length > 0) {
    throw new Error([
      "Invalid marketplace environment configuration.",
      ...errors,
      "Copy apps/web/.env.example to apps/web/.env.local and fill in the required values before starting Next.js."
    ].join("\n"));
  }
}

const isNextLint = process.argv.some((argument) => argument.includes("next-lint") || argument === "lint");
const isProductionBuild = process.argv.includes("build") || process.env.npm_lifecycle_event === "build" || process.env.VERCEL === "1";
const shouldHydrateLocalDevelopmentEnvironment = process.env.NODE_ENV !== "production" && process.env.CI !== "true";

if (!isProductionBuild && shouldHydrateLocalDevelopmentEnvironment) {
  for (const [key, value] of Object.entries(localDevelopmentEnvironment)) {
    process.env[key] ??= value;
  }
}

if (!isNextLint && !isProductionBuild) {
  validateStartupEnvironment();
}

export default nextConfig;
