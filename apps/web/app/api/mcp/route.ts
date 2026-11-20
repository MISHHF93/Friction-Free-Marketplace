import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { NextResponse } from "next/server";
import { mcpTools, runMcpTool } from "@/lib/mcp/tools";
import { consumeRateLimit, RateLimitUnavailableError } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

function mcpEnabled() {
  return process.env.FFM_MCP_ENABLED === "1";
}

function toolResult(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value) }] };
}

function createServer() {
  const server = new McpServer({ name: "friction-free-marketplace", version: "1.0.0" });
  server.tool("search_listings", "Search public listings by query, category, price, and location.", {
    query: z.string().trim().max(200).optional(),
    category: z.string().trim().max(80).optional(),
    minPrice: z.number().nonnegative().optional(),
    maxPrice: z.number().nonnegative().optional(),
    location: z.string().trim().max(120).optional()
  }, async (input) => toolResult(await runMcpTool("search_listings", input)));
  server.tool("get_listing", "Read one public listing. No private seller contact details are returned.", {
    id: z.string().trim().min(1).max(80)
  }, async (input) => toolResult(await runMcpTool("get_listing", input)));
  server.tool("get_seller_public_profile", "Read the public seller profile and active listings.", {
    id: z.string().trim().min(1).max(80)
  }, async (input) => toolResult(await runMcpTool("get_seller_public_profile", input)));
  server.tool("list_categories", "List public marketplace categories.", {}, async () => toolResult(await runMcpTool("list_categories", {})));
  return server;
}

async function handle(request: Request) {
  if (!mcpEnabled()) {
    return NextResponse.json({ error: "Marketplace MCP is disabled." }, { status: 404 });
  }
  const hops = Number(process.env.FFM_TRUSTED_PROXY_HOPS ?? "0");
  const forwarded = request.headers.get("x-forwarded-for")?.split(",").map((part) => part.trim()).filter(Boolean) ?? [];
  const address = Number.isInteger(hops) && hops > 0 ? forwarded[Math.max(0, forwarded.length - hops)] || "shared" : "shared";
  try {
    const limit = await consumeRateLimit(`mcp:${address}`, { limit: 30, windowMs: 60_000, policy: "mcp" });
    if (!limit.allowed) return NextResponse.json({ error: "Too many MCP requests." }, { status: 429 });
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) return NextResponse.json({ error: "MCP is unavailable." }, { status: 503 });
    throw error;
  }

  const server = createServer();
  const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true });
  await server.connect(transport);
  return transport.handleRequest(request);
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}

export async function DELETE() {
  if (!mcpEnabled()) return NextResponse.json({ error: "Marketplace MCP is disabled." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
