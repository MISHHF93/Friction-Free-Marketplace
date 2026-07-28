import { z } from "zod";

const requiredString = (name: string) => z.string({ required_error: `${name} is required.` }).trim().min(1, `${name} is required.`);
const requiredUrl = (name: string) => requiredString(name).url(`${name} must be a valid URL.`);

export const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: requiredUrl("NEXT_PUBLIC_APP_URL"),
  NEXT_PUBLIC_APP_NAME: z.string().trim().min(1).default("Friction-Free Marketplace"),
  NEXT_PUBLIC_SUPABASE_URL: requiredUrl("NEXT_PUBLIC_SUPABASE_URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: requiredString("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: requiredString("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().trim().min(1).optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().trim().url().default("https://app.posthog.com")
});

export const serverEnvSchema = publicEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: requiredString("SUPABASE_SERVICE_ROLE_KEY"),
  STRIPE_SECRET_KEY: requiredString("STRIPE_SECRET_KEY"),
  STRIPE_WEBHOOK_SECRET: requiredString("STRIPE_WEBHOOK_SECRET"),
  OPENAI_API_KEY: requiredString("OPENAI_API_KEY"),
  MEILISEARCH_HOST: requiredUrl("MEILISEARCH_HOST"),
  MEILISEARCH_API_KEY: requiredString("MEILISEARCH_API_KEY"),
  SEARCH_SYNC_SECRET: z.string().trim().min(1).optional(),
  ADMIN_WORKER_SECRET: z.string().trim().min(1).optional(),
  RESEND_API_KEY: requiredString("RESEND_API_KEY"),
  RESEND_FROM_EMAIL: z.string().trim().min(3).default("Friction-Free Marketplace <hello@example.com>"),
  SUPPORT_EMAIL: requiredString("SUPPORT_EMAIL"),
  POSTHOG_KEY: requiredString("POSTHOG_KEY"),
  POSTHOG_HOST: z.string().trim().url().default("https://app.posthog.com"),
  APPLE_TEAM_ID: z.string().trim().min(1).optional(),
  ANDROID_SHA256_CERT_FINGERPRINTS: z.string().trim().min(1).optional()
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

export const localDevelopmentEnv: ServerEnv = {
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  NEXT_PUBLIC_APP_NAME: "Friction-Free Marketplace",
  NEXT_PUBLIC_SUPABASE_URL: "https://local-dev-placeholder.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "local-dev-placeholder",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_local_dev_placeholder",
  NEXT_PUBLIC_POSTHOG_HOST: "https://app.posthog.com",
  SUPABASE_SERVICE_ROLE_KEY: "local-dev-placeholder",
  STRIPE_SECRET_KEY: "sk_test_local_dev_placeholder",
  STRIPE_WEBHOOK_SECRET: "whsec_local_dev_placeholder",
  OPENAI_API_KEY: "sk-local-dev-placeholder",
  MEILISEARCH_HOST: "http://127.0.0.1:7700",
  MEILISEARCH_API_KEY: "local-dev-placeholder",
  ADMIN_WORKER_SECRET: "admin-worker-local-dev-placeholder",
  RESEND_API_KEY: "re_local_dev_placeholder",
  RESEND_FROM_EMAIL: "Friction-Free Marketplace <hello@example.com>",
  SUPPORT_EMAIL: "support@example.com",
  POSTHOG_KEY: "phc_local_dev_placeholder",
  POSTHOG_HOST: "https://app.posthog.com"
};

export const localDevelopmentPublicEnv: PublicEnv = {
  NEXT_PUBLIC_APP_URL: localDevelopmentEnv.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_APP_NAME: localDevelopmentEnv.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_SUPABASE_URL: localDevelopmentEnv.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: localDevelopmentEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: localDevelopmentEnv.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_POSTHOG_HOST: localDevelopmentEnv.NEXT_PUBLIC_POSTHOG_HOST
};

export function shouldUseLocalDevelopmentEnv() {
  return process.env.NODE_ENV !== "production" && process.env.CI !== "true";
}

function summarizeZodError(error: z.ZodError) {
  return error.issues.map((issue) => {
    const variable = issue.path.join(".") || "environment";
    return `- ${variable}: ${issue.message}`;
  });
}

export function formatEnvError(error: z.ZodError, scope: "client" | "server") {
  const heading = scope === "client" ? "Invalid client environment variables" : "Invalid server environment variables";
  return [
    heading,
    ...summarizeZodError(error),
    "Copy apps/web/.env.example to apps/web/.env.local and fill in the required values."
  ].join("\n");
}
