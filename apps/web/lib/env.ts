import { formatEnvError, localDevelopmentPublicEnv, publicEnvSchema, shouldUseLocalDevelopmentEnv, type PublicEnv } from "@/lib/env.shared";

export type { PublicEnv };

// Next.js evaluates app and route modules while collecting build metadata.
// Use inert placeholders only for that build-time pass; runtime validation still throws.
const buildTimePublicEnv: PublicEnv = {
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  NEXT_PUBLIC_APP_NAME: "Friction-Free Marketplace",
  NEXT_PUBLIC_SUPABASE_URL: "https://build-placeholder.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "build-time-placeholder",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_build_time_placeholder",
  NEXT_PUBLIC_POSTHOG_HOST: "https://app.posthog.com"
};

function isProductionBuild() {
  return process.env.NEXT_PHASE === "phase-production-build" || process.env.npm_lifecycle_event === "build";
}

function urlOrFallback(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  try {
    return new URL(value).toString().replace(/\/$/, "");
  } catch {
    return fallback;
  }
}

function valueOrFallback(value: string | undefined, fallback: string) {
  return value?.trim() || fallback;
}

function getDeploymentUrl(input: Record<string, string | undefined>) {
  if (input.NEXT_PUBLIC_APP_URL) return input.NEXT_PUBLIC_APP_URL;
  if (input.VERCEL_PROJECT_PRODUCTION_URL) return `https://${input.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (input.VERCEL_URL) return `https://${input.VERCEL_URL}`;
  return "http://localhost:3000";
}

function getRuntimePublicFallbackEnv(input: Record<string, string | undefined>): PublicEnv {
  return {
    NEXT_PUBLIC_APP_URL: urlOrFallback(getDeploymentUrl(input), "http://localhost:3000"),
    NEXT_PUBLIC_APP_NAME: valueOrFallback(input.NEXT_PUBLIC_APP_NAME, "Friction-Free Marketplace"),
    NEXT_PUBLIC_SUPABASE_URL: urlOrFallback(input.NEXT_PUBLIC_SUPABASE_URL, "https://runtime-placeholder.supabase.co"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: valueOrFallback(input.NEXT_PUBLIC_SUPABASE_ANON_KEY, "runtime-public-placeholder"),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: valueOrFallback(input.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, "pk_test_runtime_public_placeholder"),
    NEXT_PUBLIC_POSTHOG_KEY: input.NEXT_PUBLIC_POSTHOG_KEY?.trim() || undefined,
    NEXT_PUBLIC_POSTHOG_HOST: urlOrFallback(input.NEXT_PUBLIC_POSTHOG_HOST, "https://app.posthog.com")
  };
}

export function validatePublicEnv(input: Record<string, string | undefined>): PublicEnv {
  const result = publicEnvSchema.safeParse(input);
  if (!result.success) {
    if (isProductionBuild()) {
      return buildTimePublicEnv;
    }

    if (shouldUseLocalDevelopmentEnv()) {
      return localDevelopmentPublicEnv;
    }

    if (input.VERCEL === "1") {
      return getRuntimePublicFallbackEnv(input);
    }

    throw new Error(formatEnvError(result.error, "client"));
  }
  return result.data;
}

export const publicEnv = validatePublicEnv({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  VERCEL: process.env.VERCEL,
  VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  VERCEL_URL: process.env.VERCEL_URL
});
