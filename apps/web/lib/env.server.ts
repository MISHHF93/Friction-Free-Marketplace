import { formatEnvError, shouldUseLocalDevelopmentEnv } from "@/lib/env.shared";
import { localDevelopmentEnv, serverEnvSchema, type ServerEnv } from "@/lib/env.server-schema";

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
  SCHEDULED_JOB_SECRET: "scheduled-job-build-time-placeholder",
  RESEND_API_KEY: "re_build_time_placeholder",
  RESEND_FROM_EMAIL: "Friction-Free Marketplace <hello@example.com>",
  SUPPORT_EMAIL: "support@example.com",
  POSTHOG_KEY: "phc_build_time_placeholder",
  POSTHOG_HOST: "https://app.posthog.com"
};

function isBuildOrCompilePhase() {
  const phase = process.env.NEXT_PHASE ?? "";
  const lifecycle = process.env.npm_lifecycle_event ?? "";
  return (
    phase === "phase-production-build" ||
    phase === "phase-export" ||
    lifecycle === "build" ||
    lifecycle === "web:build" ||
    (process.env.VERCEL === "1" && !process.env.NEXT_RUNTIME)
  );
}

export function validateServerEnv(input: NodeJS.ProcessEnv = process.env): ServerEnv {
  const result = serverEnvSchema.safeParse(input);
  if (!result.success) {
    if (isBuildOrCompilePhase()) {
      return buildTimeServerEnv;
    }

    if (shouldUseLocalDevelopmentEnv()) {
      return localDevelopmentEnv;
    }

    // Soft fallback during Vercel builds/previews when project secrets are incomplete.
    if (process.env.VERCEL === "1") {
      return buildTimeServerEnv;
    }

    throw new Error(formatEnvError(result.error, "server"));
  }
  const parsed = result.data;
  // Strict production checks only for live serverless runtime, not compile workers.
  if (process.env.NODE_ENV === "production" && !isBuildOrCompilePhase() && process.env.NEXT_RUNTIME) {
    const invalid: string[] = [];
    const appUrl = new URL(parsed.NEXT_PUBLIC_APP_URL);
    const localOrigin = ["localhost", "127.0.0.1"].includes(appUrl.hostname);
    if (appUrl.protocol !== "https:" && !localOrigin) invalid.push("NEXT_PUBLIC_APP_URL must use HTTPS.");
    for (const [name, value] of Object.entries(parsed)) {
      if (typeof value === "string" && /placeholder|example\.com|your-/i.test(value)) {
        invalid.push(`${name} contains a placeholder value.`);
      }
    }
    const secretMode = parsed.STRIPE_SECRET_KEY.startsWith("sk_live_") ? "live" : parsed.STRIPE_SECRET_KEY.startsWith("sk_test_") ? "test" : "invalid";
    const publicMode = parsed.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.startsWith("pk_live_") ? "live" : parsed.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.startsWith("pk_test_") ? "test" : "invalid";
    if (secretMode === "invalid" || secretMode !== publicMode) invalid.push("Stripe public and secret keys must use the same valid mode.");
    if (invalid.length) throw new Error(["Invalid production environment.", ...invalid.map((issue) => `- ${issue}`)].join("\n"));
  }
  return parsed;
}

export const env = new Proxy({} as ServerEnv, {
  get(_target, property: keyof ServerEnv) {
    return validateServerEnv()[property];
  }
});
