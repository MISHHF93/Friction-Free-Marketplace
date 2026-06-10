import { formatEnvError, localDevelopmentEnv, serverEnvSchema, shouldUseLocalDevelopmentEnv, type ServerEnv } from "@/lib/env.shared";

if (typeof window !== "undefined") {
  throw new Error("@/lib/env.server can only be imported from server-side code. Use publicEnv from @/lib/env in client code.");
}

export type { ServerEnv };

// Next.js evaluates app and route modules while collecting build metadata.
// Use inert placeholders only for that build-time pass; runtime validation still throws.
const buildTimeServerEnv: ServerEnv = {
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  NEXT_PUBLIC_APP_NAME: "Friction-Free Marketplace",
  NEXT_PUBLIC_SUPABASE_URL: "https://build-placeholder.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "build-time-placeholder",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_build_time_placeholder",
  NEXT_PUBLIC_POSTHOG_HOST: "https://app.posthog.com",
  SUPABASE_SERVICE_ROLE_KEY: "build-time-placeholder",
  STRIPE_SECRET_KEY: "sk_test_build_time_placeholder",
  STRIPE_WEBHOOK_SECRET: "whsec_build_time_placeholder",
  OPENAI_API_KEY: "sk-build-time-placeholder",
  MEILISEARCH_HOST: "http://127.0.0.1:7700",
  MEILISEARCH_API_KEY: "build-time-placeholder",
  ADMIN_WORKER_SECRET: "admin-worker-build-time-placeholder",
  RESEND_API_KEY: "re_build_time_placeholder",
  RESEND_FROM_EMAIL: "Friction-Free Marketplace <hello@example.com>",
  POSTHOG_KEY: "phc_build_time_placeholder",
  POSTHOG_HOST: "https://app.posthog.com"
};

function isProductionBuild() {
  return process.env.NEXT_PHASE === "phase-production-build" || process.env.npm_lifecycle_event === "build";
}

export function validateServerEnv(input: NodeJS.ProcessEnv = process.env): ServerEnv {
  const result = serverEnvSchema.safeParse(input);
  if (!result.success) {
    if (isProductionBuild()) {
      return buildTimeServerEnv;
    }

    if (shouldUseLocalDevelopmentEnv()) {
      return localDevelopmentEnv;
    }

    throw new Error(formatEnvError(result.error, "server"));
  }
  return result.data;
}

export const env = new Proxy({} as ServerEnv, {
  get(_target, property: keyof ServerEnv) {
    return validateServerEnv()[property];
  }
});
