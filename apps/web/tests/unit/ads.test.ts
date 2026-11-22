import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { eligibleCampaigns, isCampaignLive, matchesAdTarget, pickCampaign } from "@/lib/ads/schedule";
import { isAllowedAdTarget, resolveAdTarget } from "@/lib/ads/redirect";
import type { AdCampaign } from "@/lib/ads/types";

const now = new Date("2026-11-22T18:00:00.000Z");

function campaign(overrides: Partial<AdCampaign> = {}): AdCampaign {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    placement: "home_top_banner",
    title: "Banner",
    image_path: "/icon-1024.png",
    alt_text: "Banner",
    target_url: "/search",
    advertiser_name: "FFM",
    starts_at: "2026-11-22T00:00:00.000Z",
    ends_at: "2026-11-23T00:00:00.000Z",
    is_active: true,
    priority: 1,
    weight: 1,
    category_slug: null,
    ...overrides
  };
}

describe("ad campaign scheduling", () => {
  it("is live only inside the active window", () => {
    expect(isCampaignLive(campaign(), now)).toBe(true);
    expect(isCampaignLive(campaign({ is_active: false }), now)).toBe(false);
    expect(isCampaignLive(campaign({ starts_at: "2026-11-22T19:00:00.000Z" }), now)).toBe(false);
    expect(isCampaignLive(campaign({ ends_at: "2026-11-22T17:00:00.000Z" }), now)).toBe(false);
    expect(isCampaignLive(campaign({ ends_at: null }), now)).toBe(true);
  });

  it("matches optional category targeting", () => {
    expect(matchesAdTarget(campaign(), { categorySlug: "electronics" })).toBe(true);
    expect(matchesAdTarget(campaign({ category_slug: "electronics" }), { categorySlug: "electronics" })).toBe(true);
    expect(matchesAdTarget(campaign({ category_slug: "electronics" }), { categorySlug: "sports" })).toBe(false);
    expect(matchesAdTarget(campaign({ category_slug: "electronics" }), {})).toBe(false);
  });

  it("picks the highest priority campaign and weights ties", () => {
    const low = campaign({ id: "low", priority: 1, weight: 99 });
    const highA = campaign({ id: "a", priority: 5, weight: 1 });
    const highB = campaign({ id: "b", priority: 5, weight: 3 });
    expect(pickCampaign([low, highA, highB], "home_top_banner", {}, now, () => 0)).toEqual(highA);
    expect(pickCampaign([low, highA, highB], "home_top_banner", {}, now, () => 0.9)).toEqual(highB);
    expect(eligibleCampaigns([low], "search_inline", {}, now)).toEqual([]);
  });
});

describe("ad click redirect allow-list", () => {
  const origin = "http://localhost:3001";

  it("allows same-origin internal paths and https destinations", () => {
    expect(resolveAdTarget("/search", origin)?.toString()).toBe("http://localhost:3001/search");
    expect(resolveAdTarget("/listings/abc?from=ad", origin)?.pathname).toBe("/listings/abc");
    expect(isAllowedAdTarget("https://example.com/event", origin)).toBe(true);
  });

  it("rejects open redirects and non-https schemes", () => {
    expect(resolveAdTarget("//evil.example", origin)).toBeNull();
    expect(resolveAdTarget("/\\evil.example", origin)).toBeNull();
    expect(resolveAdTarget("https://user:pass@example.com", origin)).toBeNull();
    expect(resolveAdTarget("http://example.com", origin)).toBeNull();
    expect(resolveAdTarget("javascript:alert(1)", origin)).toBeNull();
    expect(resolveAdTarget("https://localhost.evil.example/phish", origin)?.origin).toBe("https://localhost.evil.example");
    expect(resolveAdTarget("/@evil", origin)).toBeNull();
  });
});

describe("ad campaign RLS", () => {
  const dbUrl = process.env.FFM_LOCAL_DB_URL;
  const container = process.env.FFM_LOCAL_DB_CONTAINER;

  it.skipIf(!dbUrl && !container)("public reads only live campaigns and only ads.manage can write", () => {
    if (dbUrl && /supabase\.co|pooler/i.test(dbUrl)) throw new Error("Refusing to run against a hosted database.");
    const file = resolve(__dirname, "../../../../supabase/tests/r11_ads.sql");
    const output = container
      ? execFileSync("bash", ["-c", `docker exec -i ${container} psql -U postgres -v ON_ERROR_STOP=1 -q -t < "${file}"`], { encoding: "utf8" })
      : execFileSync("psql", [dbUrl!, "-v", "ON_ERROR_STOP=1", "-q", "-t", "-f", file], { encoding: "utf8" });
    const passes = output.split("\n").filter((line) => line.includes("PASS"));
    expect(passes).toHaveLength(5);
  });
});
