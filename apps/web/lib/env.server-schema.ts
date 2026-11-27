import { z } from "zod";
import { optionalString, optionalUrl, publicEnvSchema } from "@/lib/env.shared";

const requiredString = (name: string) =>
  z.string({ error: `${name} is required.` }).trim().min(1, `${name} is required.`);

export const serverEnvSchema = publicEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: requiredString("SUPABASE_SERVICE_ROLE_KEY"),
  STRIPE_SECRET_KEY: requiredString("STRIPE_SECRET_KEY"),
  STRIPE_WEBHOOK_SECRET: requiredString("STRIPE_WEBHOOK_SECRET"),
  STRIPE_CONNECT_WEBHOOK_SECRET: optionalString("STRIPE_CONNECT_WEBHOOK_SECRET"),
  OPENAI_API_KEY: optionalString("OPENAI_API_KEY"),
  MEILISEARCH_HOST: optionalUrl("MEILISEARCH_HOST"),
  MEILISEARCH_API_KEY: optionalString("MEILISEARCH_API_KEY"),
  SEARCH_SYNC_SECRET: optionalString("SEARCH_SYNC_SECRET"),
  ADMIN_WORKER_SECRET: optionalString("ADMIN_WORKER_SECRET"),
  SCHEDULED_JOB_SECRET: optionalString("SCHEDULED_JOB_SECRET"),
  RESEND_API_KEY: optionalString("RESEND_API_KEY"),
  RESEND_FROM_EMAIL: requiredString("RESEND_FROM_EMAIL"),
  SUPPORT_EMAIL: requiredString("SUPPORT_EMAIL"),
  POSTHOG_KEY: optionalString("POSTHOG_KEY"),
  POSTHOG_HOST: z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().url().default("https://app.posthog.com")
  ),
  MARKETPLACE_DEMO_MODE: z.enum(["true", "false"]).optional()
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export const localDevelopmentEnv: ServerEnv = {
  NEXT_PUBLIC_APP_URL: "http://localhost:3001",
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
  SCHEDULED_JOB_SECRET: "scheduled-job-local-dev-placeholder",
  RESEND_API_KEY: "re_local_dev_placeholder",
  RESEND_FROM_EMAIL: "Friction-Free Marketplace <hello@example.com>",
  SUPPORT_EMAIL: "support@example.com",
  POSTHOG_KEY: "phc_local_dev_placeholder",
  POSTHOG_HOST: "https://app.posthog.com"
};
