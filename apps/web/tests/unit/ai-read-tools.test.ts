import { describe, expect, it } from "vitest";
import { executeMarketplaceReadTool } from "@/lib/ai/read-tools";

describe("marketplace AI read tools", () => {
  it("blocks write and escalation tools", async () => {
    const result = await executeMarketplaceReadTool("update_listing_draft", {
      listingId: "listing-1",
      patch: { price: 1 }
    });

    expect(result.ok).toBe(false);
    expect(result.result).toMatchObject({
      error: expect.stringContaining("explicit confirmation")
    });
  });

  it("caps live search results exposed to the model", async () => {
    const result = await executeMarketplaceReadTool("search_listings", {
      query: "bike",
      limit: 200
    });

    expect(result.ok).toBe(true);
    const payload = result.result as { listings: unknown[]; source: string };
    expect(payload.listings.length).toBeLessThanOrEqual(8);
    expect(["demo", "database", "meilisearch"]).toContain(payload.source);
  });

  it("labels pricing context as active-listing evidence, not an appraisal", async () => {
    const result = await executeMarketplaceReadTool("estimate_price", {
      itemSummary: "used road bike"
    });

    const payload = result.result as { caveat: string };
    expect(payload.caveat).toContain("not completed-sale appraisals");
  });
});
