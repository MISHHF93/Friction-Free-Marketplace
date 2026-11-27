import { afterEach, describe, expect, it } from "vitest";
import { validatePublicEnv } from "@/lib/env";
import { validateServerEnv } from "@/lib/env.server";

const productionRuntime = {
  NODE_ENV: "production",
  VERCEL: "1",
  CI: "true",
  NEXT_RUNTIME: "nodejs"
} as NodeJS.ProcessEnv;

describe("environment validation", () => {
  afterEach(() => {
    delete process.env.NEXT_PHASE;
  });

  it("uses placeholders only while Next is compiling", () => {
    const compiled = validateServerEnv({ NEXT_PHASE: "phase-production-build", NODE_ENV: "production", VERCEL: "1" });
    expect(compiled.SUPABASE_SERVICE_ROLE_KEY).toContain("placeholder");

    expect(() => validateServerEnv({ ...productionRuntime })).toThrow(/required/i);
    expect(() => validatePublicEnv({ ...productionRuntime })).toThrow(/required/i);
  });

  it("allows blank optional analytics configuration", () => {
    const parsed = validatePublicEnv({
      ...productionRuntime,
      NEXT_PUBLIC_APP_URL: "https://market.example",
      NEXT_PUBLIC_APP_NAME: "Friction-Free Marketplace",
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_example",
      NEXT_PUBLIC_POSTHOG_KEY: "",
      NEXT_PUBLIC_POSTHOG_HOST: ""
    });

    expect(parsed.NEXT_PUBLIC_POSTHOG_KEY).toBeUndefined();
    expect(parsed.NEXT_PUBLIC_POSTHOG_HOST).toBe("https://app.posthog.com");
  });

  it("rejects placeholder secrets in a production runtime", () => {
    expect(() => validateServerEnv({
      ...productionRuntime,
      NEXT_PUBLIC_APP_URL: "https://market.example",
      NEXT_PUBLIC_APP_NAME: "Friction-Free Marketplace",
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_example",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-placeholder",
      STRIPE_SECRET_KEY: "sk_test_example",
      STRIPE_WEBHOOK_SECRET: "whsec_example",
      SUPPORT_EMAIL: "support@market.example",
      RESEND_FROM_EMAIL: "Friction-Free Marketplace <hello@market.example>"
    })).toThrow(/placeholder/i);
    expect(() => validateServerEnv({
      ...productionRuntime,
      NEXT_PUBLIC_APP_URL: "https://market.example",
      NEXT_PUBLIC_APP_NAME: "Friction-Free Marketplace",
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_example",
      SUPABASE_SERVICE_ROLE_KEY: "service-role",
      STRIPE_SECRET_KEY: "sk_test_example",
      STRIPE_WEBHOOK_SECRET: "whsec_example",
      SUPPORT_EMAIL: "support@market.example",
      RESEND_FROM_EMAIL: "Friction-Free Marketplace <hello@example.com>"
    })).toThrow(/RESEND_FROM_EMAIL contains a placeholder value/);
  });
});
