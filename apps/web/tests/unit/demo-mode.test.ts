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

  it("requires an explicit production override", () => {
    expect(isDemoMarketplaceDataEnabled({
      NODE_ENV: "production",
      MARKETPLACE_DEMO_MODE: "true",
    })).toBe(true);
  });

  it("keeps placeholder-backed local development useful", () => {
    expect(isDemoMarketplaceDataEnabled({
      NODE_ENV: "development",
      SUPABASE_SERVICE_ROLE_KEY: "local-dev-placeholder",
    })).toBe(true);
  });
});
