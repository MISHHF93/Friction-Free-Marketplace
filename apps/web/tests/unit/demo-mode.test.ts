import { describe, expect, it } from "vitest";
import { isDemoMarketplaceDataEnabled } from "@/lib/marketplace/demo-mode";

describe("marketplace demo-data policy", () => {
  it("never silently enables demo inventory in production", () => {
    expect(isDemoMarketplaceDataEnabled({
      NODE_ENV: "production",
      SUPABASE_SERVICE_ROLE_KEY: "local-dev-placeholder",
      NEXT_PUBLIC_SUPABASE_URL: "https://local-dev-placeholder.supabase.co",
    })).toBe(false);
  });

  it("ignores the demo flag in production and unknown environments", () => {
    expect(isDemoMarketplaceDataEnabled({
      NODE_ENV: "production",
      MARKETPLACE_DEMO_MODE: "true",
    })).toBe(false);
    expect(isDemoMarketplaceDataEnabled({
      NODE_ENV: "staging",
      MARKETPLACE_DEMO_MODE: "true",
    })).toBe(false);
  });

  it("does not invent inventory when the database is not configured", () => {
    expect(isDemoMarketplaceDataEnabled({
      NODE_ENV: "development",
      SUPABASE_SERVICE_ROLE_KEY: "local-dev-placeholder",
    })).toBe(false);
  });
});
