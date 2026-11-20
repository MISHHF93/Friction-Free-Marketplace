import { describe, expect, it } from "vitest";
import { mcpTools, runMcpTool } from "@/lib/mcp/tools";

describe("marketplace MCP tools", () => {
  it("lists only the public read tools", () => {
    expect(mcpTools).toEqual(["search_listings", "get_listing", "get_seller_public_profile", "list_categories"]);
  });

  it("searches listings without private fields", async () => {
    const result = await runMcpTool("search_listings", { query: "bike", maxPrice: 5000 });
    expect(result).toEqual(expect.objectContaining({ listings: expect.any(Array) }));
    const listing = (result as { listings: Array<Record<string, unknown>> }).listings[0];
    if (listing) {
      expect(listing).not.toHaveProperty("email");
      expect(listing).toHaveProperty("title");
    }
  });

  it("reads one listing or reports that it is missing", async () => {
    const missing = await runMcpTool("get_listing", { id: "missing-listing" });
    expect(missing).toBeNull();
  });

  it("reads a public seller profile without an email address", async () => {
    const profile = await runMcpTool("get_seller_public_profile", { id: "demo-seller-0" });
    if (profile) expect(profile).not.toHaveProperty("email");
  });

  it("lists categories", async () => {
    const result = await runMcpTool("list_categories", {});
    expect(result).toEqual(expect.objectContaining({ categories: expect.any(Array) }));
  });

  it("rejects an unknown tool and an invalid search", async () => {
    await expect(runMcpTool("create_payment", {})).rejects.toThrow(/unknown/i);
    await expect(runMcpTool("search_listings", { minPrice: -1 })).rejects.toThrow();
  });
});
