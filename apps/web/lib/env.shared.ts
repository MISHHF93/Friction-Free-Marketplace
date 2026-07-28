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

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export const localDevelopmentPublicEnv: PublicEnv = {
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  NEXT_PUBLIC_APP_NAME: "Friction-Free Marketplace",
  NEXT_PUBLIC_SUPABASE_URL: "https://local-dev-placeholder.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "local-dev-placeholder",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_local_dev_placeholder",
  NEXT_PUBLIC_POSTHOG_HOST: "https://app.posthog.com"
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
