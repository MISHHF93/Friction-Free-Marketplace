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
  RESEND_API_KEY: requiredString("RESEND_API_KEY"),
  RESEND_FROM_EMAIL: z.string().trim().min(3).default("Friction-Free Marketplace <hello@example.com>"),
  POSTHOG_KEY: requiredString("POSTHOG_KEY"),
  POSTHOG_HOST: z.string().trim().url().default("https://app.posthog.com")
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

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
