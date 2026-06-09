import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchMarketplace } from "@/lib/search/discovery";
import { parseDiscoverySearchParamsFromUrl } from "@/lib/search/api";

type Row = Record<string, any>;

async function getPersonalizationSeed(userId: string | null) {
  if (!userId) return {};
  try {
    const supabase = createClient();
    const [{ data: views }, { data: favorites }, { data: savedSearches }] = await Promise.all([
      (supabase as any).from("recently_viewed_listings").select("listing_id").eq("user_id", userId).order("viewed_at", { ascending: false }).limit(8),
      (supabase as any).from("favorites").select("listing_id").eq("user_id", userId).order("created_at", { ascending: false }).limit(8),
      (supabase as any).from("saved_searches").select("query, filters").eq("user_id", userId).order("updated_at", { ascending: false }).limit(3),
    ]);

    const listingIds = Array.from(new Set([...(views ?? []), ...(favorites ?? [])].map((row: Row) => String(row.listing_id))));
    const { data: documents } = listingIds.length
      ? await (supabase as any).from("listing_search_documents").select("category_slug, seo_tags, title").in("id", listingIds)
      : { data: [] };

    const category = (savedSearches ?? []).map((row: Row) => row.filters?.category).find((value: unknown): value is string => typeof value === "string")
      ?? (documents ?? []).map((row: Row) => row.category_slug).find((value: unknown): value is string => typeof value === "string");
    const query = (savedSearches ?? []).map((row: Row) => row.query).find((value: unknown): value is string => typeof value === "string" && value.trim().length > 0)
      ?? (documents ?? []).flatMap((row: Row) => Array.isArray(row.seo_tags) ? row.seo_tags : []).slice(0, 3).join(" ");

    return { category, q: query || undefined };
  } catch {
    return {};
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const seed = await getPersonalizationSeed(user?.id ?? null);
  const params = parseDiscoverySearchParamsFromUrl(url);
  const result = await searchMarketplace({
    ...seed,
    ...params,
    q: params.q ?? seed.q,
    category: params.category ?? seed.category,
    sort: "recommended",
    limit: Number(url.searchParams.get("limit") ?? 8),
  });
  return NextResponse.json({ ...result, personalization: { used: Boolean(user), seed } });
}
