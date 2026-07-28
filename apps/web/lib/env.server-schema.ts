import { z } from "zod";
import { publicEnvSchema } from "@/lib/env.shared";

const requiredString = (name: string) =>
  z.string({ required_error: `${name} is required.` }).trim().min(1, `${name} is required.`);

export const serverEnvSchema = publicEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: requiredString("SUPABASE_SERVICE_ROLE_KEY"),
  STRIPE_SECRET_KEY: requiredString("STRIPE_SECRET_KEY"),
  STRIPE_WEBHOOK_SECRET: requiredString("STRIPE_WEBHOOK_SECRET"),
  OPENAI_API_KEY: z.string().trim().min(1).optional(),
  MEILISEARCH_HOST: z.string().trim().url().optional(),
  MEILISEARCH_API_KEY: z.string().trim().min(1).optional(),
  SEARCH_SYNC_SECRET: z.string().trim().min(1).optional(),
  ADMIN_WORKER_SECRET: z.string().trim().min(1).optional(),
  SCHEDULED_JOB_SECRET: z.string().trim().min(1).optional(),
  RESEND_API_KEY: z.string().trim().min(1).optional(),
  RESEND_FROM_EMAIL: z.string().trim().min(3).default("Friction-Free Marketplace <hello@example.com>"),
  SUPPORT_EMAIL: requiredString("SUPPORT_EMAIL"),
  POSTHOG_KEY: z.string().trim().min(1).optional(),
  POSTHOG_HOST: z.string().trim().url().default("https://app.posthog.com"),
  APPLE_TEAM_ID: z.string().trim().min(1).optional(),
  ANDROID_SHA256_CERT_FINGERPRINTS: z.string().trim().min(1).optional(),
  MARKETPLACE_DEMO_MODE: z.enum(["true", "false"]).optional()
});

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
  SCHEDULED_JOB_SECRET: "scheduled-job-local-dev-placeholder",
  RESEND_API_KEY: "re_local_dev_placeholder",
  RESEND_FROM_EMAIL: "Friction-Free Marketplace <hello@example.com>",
  SUPPORT_EMAIL: "support@example.com",
  POSTHOG_KEY: "phc_local_dev_placeholder",
  POSTHOG_HOST: "https://app.posthog.com"
};
