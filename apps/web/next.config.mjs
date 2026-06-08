/** @type {import('next').NextConfig} */
const nextConfig = {};

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

if (!isNextLint && !isProductionBuild) {
  validateStartupEnvironment();
}

export default nextConfig;
