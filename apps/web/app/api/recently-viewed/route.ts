import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchMarketplace } from "@/lib/search/discovery";

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ listings: [] });

    const { data, error } = await (supabase as any)
      .from("recently_viewed_listings")
      .select("listing_id, viewed_at")
      .eq("user_id", user.id)
      .order("viewed_at", { ascending: false })
      .limit(12);
    if (error) throw error;

    return NextResponse.json({ listingIds: data?.map((item: { listing_id: string }) => item.listing_id) ?? [] });
  } catch {
    const fallback = await searchMarketplace({ sort: "recommended", limit: 3 });
    return NextResponse.json({ listings: fallback.listings, source: fallback.source });
  }
}

export async function POST(request: Request) {
  const { listingId } = (await request.json()) as { listingId?: string };
  if (!listingId) return NextResponse.json({ error: "listingId is required." }, { status: 400 });

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: true, anonymous: true });

  const { error } = await (supabase as any).from("recently_viewed_listings").upsert({ user_id: user.id, listing_id: listingId, viewed_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
