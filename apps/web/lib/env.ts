import { formatEnvError, isNextBuildPhase, localDevelopmentPublicEnv, publicEnvSchema, shouldUseLocalDevelopmentEnv, type PublicEnv } from "@/lib/env.shared";

export type { PublicEnv };

// Next.js evaluates app and route modules while collecting build metadata.
// Use inert placeholders only for that build-time pass; runtime validation still throws.
const buildTimePublicEnv: PublicEnv = {
  NEXT_PUBLIC_APP_URL: "http://localhost:3001",
  NEXT_PUBLIC_APP_NAME: "Friction-Free Marketplace",
  NEXT_PUBLIC_SUPABASE_URL: "https://build-placeholder.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "build-time-placeholder",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_build_time_placeholder",
  NEXT_PUBLIC_POSTHOG_HOST: "https://app.posthog.com"
};

export function validatePublicEnv(input: NodeJS.ProcessEnv = process.env): PublicEnv {
  const result = publicEnvSchema.safeParse(input);
  if (!result.success) {
    if (isNextBuildPhase(input)) {
      return buildTimePublicEnv;
    }

    if (shouldUseLocalDevelopmentEnv(input)) {
      return localDevelopmentPublicEnv;
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
  NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST
});
