import { NextResponse } from "next/server";
import { mcpTools } from "@/lib/mcp/tools";

export const dynamic = "force-dynamic";

export async function GET() {
  const enabled = process.env.FFM_MCP_ENABLED === "1";
  return NextResponse.json({
    name: "Friction-Free Marketplace",
    transport: "streamable-http",
    endpoint: "/api/mcp",
    enabled,
    tools: enabled ? mcpTools : [],
    authentication: "Read-only tools are public. Per-user tools are not enabled. The planned path is a Supabase user bearer token enforced by row-level security, never the service-role key.",
    payments: "Payment, refund, and payout actions are not available through MCP."
  });
}
