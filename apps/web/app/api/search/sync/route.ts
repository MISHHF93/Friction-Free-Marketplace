import { NextResponse } from "next/server";
import { configureDiscoveryIndex } from "@/lib/search/meilisearch";
import { indexActiveListings } from "@/lib/search/discovery";

function authorized(request: Request) {
  const token = process.env.SEARCH_SYNC_SECRET;
  if (!token) return process.env.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${token}`;
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized search sync request." }, { status: 401 });
  await configureDiscoveryIndex();
  const result = await indexActiveListings();
  return NextResponse.json({ ok: true, ...result });
}
