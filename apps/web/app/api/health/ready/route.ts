import { NextResponse } from "next/server";
import { validateServerEnv } from "@/lib/env.server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    validateServerEnv();
    return NextResponse.json(
      { status: "ready", service: "friction-free-marketplace" },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "not_ready",
        reason: error instanceof Error ? error.message : "Invalid runtime configuration."
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
