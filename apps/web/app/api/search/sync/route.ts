import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env.server";
import { configureDiscoveryIndex } from "@/lib/search/meilisearch";
import { indexListingsById, rebuildDiscoveryIndex, removeListingFromSearch, syncListingToSearch } from "@/lib/search/discovery";
import { authorizeJobRequest } from "@/lib/security/secrets";

const syncRequestSchema = z.object({
  mode: z.enum(["configure", "listing", "batch", "rebuild"]).default("rebuild"),
  listingId: z.string().uuid().optional(),
  listingIds: z.array(z.string().uuid()).max(500).optional(),
  limit: z.number().int().min(1).max(5000).default(500),
  wait: z.boolean().default(false),
  remove: z.boolean().default(false),
});

async function syncSearch(request: Request, body: unknown) {
  const authorization = authorizeJobRequest(request, env.SEARCH_SYNC_SECRET, "Unauthorized search sync request.");
  if (!authorization.ok) return NextResponse.json({ error: authorization.error }, { status: authorization.status });

  const parsed = syncRequestSchema.safeParse(body ?? {});
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const input = parsed.data;

  if (input.mode === "configure") {
    await configureDiscoveryIndex();
    return NextResponse.json({ ok: true, configured: true });
  }

  if (input.mode === "listing") {
    if (!input.listingId) return NextResponse.json({ error: "listingId is required for listing sync." }, { status: 400 });
    const result = input.remove
      ? await removeListingFromSearch(input.listingId)
      : await syncListingToSearch(input.listingId);
    return NextResponse.json({ ok: true, ...result });
  }

  if (input.mode === "batch") {
    if (!input.listingIds?.length) return NextResponse.json({ error: "listingIds are required for batch sync." }, { status: 400 });
    const result = await indexListingsById(input.listingIds, { waitForTasks: input.wait });
    return NextResponse.json({ ok: true, ...result });
  }

  const result = await rebuildDiscoveryIndex(input.limit, { waitForTasks: input.wait });
  return NextResponse.json({ ok: true, ...result });
}

export async function POST(request: Request) {
  const bodyText = await request.text();
  if (!bodyText) return syncSearch(request, {});
  try {
    return await syncSearch(request, JSON.parse(bodyText));
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    throw error;
  }
}

export function GET(request: Request) {
  return syncSearch(request, { mode: "rebuild", limit: 500 });
}
