import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "friction-free-marketplace",
      release: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.RELEASE_SHA ?? "development",
      timestamp: new Date().toISOString()
    },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
