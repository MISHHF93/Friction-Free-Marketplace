import { NextResponse } from "next/server";
import { env } from "@/lib/env.server";
import { configureDiscoveryIndex } from "@/lib/search/meilisearch";
import { indexActiveListings } from "@/lib/search/discovery";
import { hasValidBearerSecret } from "@/lib/security/secrets";

function authorized(request: Request) {
  if (!env.SEARCH_SYNC_SECRET) return process.env.NODE_ENV !== "production";
  return hasValidBearerSecret(request, env.SEARCH_SYNC_SECRET);
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized search sync request." }, { status: 401 });
  await configureDiscoveryIndex();
  const result = await indexActiveListings();
  return NextResponse.json({ ok: true, ...result });
}
