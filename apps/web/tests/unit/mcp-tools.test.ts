import { afterEach, describe, expect, it } from "vitest";
import { GET as getMcpDiscovery } from "@/app/.well-known/mcp/route";
import { GET as getMcp, POST as postMcp } from "@/app/api/mcp/route";
import { getMcpDiscoveryPayload, isMcpEnabled, mcpTools, runMcpTool } from "@/lib/mcp/tools";

describe("marketplace MCP tools", () => {
  const originalFlag = process.env.FFM_MCP_ENABLED;

  afterEach(() => {
    if (originalFlag === undefined) delete process.env.FFM_MCP_ENABLED;
    else process.env.FFM_MCP_ENABLED = originalFlag;
  });

  it("lists only the public read tools", () => {
    expect(mcpTools).toEqual(["search_listings", "get_listing", "get_seller_public_profile", "list_categories"]);
  });

  it("is enabled by default and only disabled when FFM_MCP_ENABLED is 0 or false", () => {
    delete process.env.FFM_MCP_ENABLED;
    expect(isMcpEnabled()).toBe(true);
    expect(getMcpDiscoveryPayload().enabled).toBe(true);

    process.env.FFM_MCP_ENABLED = "0";
    expect(isMcpEnabled()).toBe(false);
    expect(getMcpDiscoveryPayload().tools).toEqual([]);

    process.env.FFM_MCP_ENABLED = "false";
    expect(isMcpEnabled()).toBe(false);
  });

  it("serves discovery metadata and Streamable HTTP tool list by default", async () => {
    delete process.env.FFM_MCP_ENABLED;

    const discoveryResponse = await getMcpDiscovery();
    expect(discoveryResponse.status).toBe(200);
    await expect(discoveryResponse.json()).resolves.toMatchObject({
      endpoint: "/api/mcp",
      transport: "streamable-http",
      enabled: true,
      tools: ["search_listings", "get_listing", "get_seller_public_profile", "list_categories"]
    });

    const browserGet = await getMcp(new Request("http://localhost/api/mcp", { headers: { accept: "text/html,application/json" } }));
    expect(browserGet.status).toBe(200);
    await expect(browserGet.json()).resolves.toMatchObject({ enabled: true, endpoint: "/api/mcp" });

    const rpcResponse = await postMcp(new Request("http://localhost/api/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream"
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} })
    }));
    expect(rpcResponse.status).toBe(200);
    const payload = await rpcResponse.json() as { result?: { tools?: Array<{ name: string }> } };
    expect(payload.result?.tools?.map((tool) => tool.name)).toEqual([
      "search_listings",
      "get_listing",
      "get_seller_public_profile",
      "list_categories"
    ]);
  });

  it("returns 404 from /api/mcp when explicitly disabled", async () => {
    process.env.FFM_MCP_ENABLED = "0";
    const response = await getMcp(new Request("http://localhost/api/mcp"));
    expect(response.status).toBe(404);
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
