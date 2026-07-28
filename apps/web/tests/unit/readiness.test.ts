import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  databaseError: null as Error | null,
  stripeError: null as Error | null,
}));

vi.mock("@/lib/env.server", () => ({
  validateServerEnv: () => ({
    NEXT_PUBLIC_APP_URL: "https://market.example",
    NEXT_PUBLIC_APP_NAME: "Friction-Free Marketplace",
    NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_example",
    NEXT_PUBLIC_POSTHOG_HOST: "https://app.posthog.com",
    SUPABASE_SERVICE_ROLE_KEY: "service-role",
    STRIPE_SECRET_KEY: "sk_test_example",
    STRIPE_WEBHOOK_SECRET: "whsec_example",
    SUPPORT_EMAIL: "support@market.example",
    POSTHOG_HOST: "https://app.posthog.com",
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        limit: async () => ({ error: state.databaseError }),
      }),
    }),
  }),
}));

vi.mock("@/lib/stripe/server", () => ({
  getStripe: () => ({
    balance: {
      retrieve: async () => {
        if (state.stripeError) throw state.stripeError;
        return {};
      },
    },
  }),
}));

import { evaluateReadiness, resetReadinessCacheForTests } from "@/lib/health/readiness";

describe("deployment readiness", () => {
  beforeEach(() => {
    state.databaseError = null;
    state.stripeError = null;
    resetReadinessCacheForTests();
  });

  it("reports ready when required providers respond", async () => {
    const result = await evaluateReadiness();
    expect(result.status).toBe("ready");
    expect(result.components.database).toEqual({ required: true, status: "ok" });
    expect(result.components.payments).toEqual({ required: true, status: "ok" });
    expect(result.components.search.status).toBe("degraded");
  });

  it("fails readiness without leaking provider errors", async () => {
    state.databaseError = new Error("secret database detail");
    state.stripeError = new Error("secret Stripe detail");
    const result = await evaluateReadiness();
    expect(result.status).toBe("not_ready");
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(result.components.database.status).toBe("error");
    expect(result.components.payments.status).toBe("error");
  });
});
