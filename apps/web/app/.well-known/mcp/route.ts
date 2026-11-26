import { NextResponse } from "next/server";
import { getMcpDiscoveryPayload } from "@/lib/mcp/tools";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getMcpDiscoveryPayload());
}
