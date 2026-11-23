import { createClient } from "@/lib/supabase/server";
import { isAdPlacementKey, type AdPlacementKey } from "@/lib/ads/placements";
import { isAdStatus, type AdStatus } from "@/lib/ads/self-serve";

export type AdvertiserCampaign = {
  id: string;
  placement: AdPlacementKey;
  title: string;
  image_path: string;
  target_url: string;
  status: AdStatus;
  starts_at: string;
  ends_at: string | null;
  run_days: number;
  price_cents: number;
  currency: string;
  rejection_reason: string | null;
  created_at: string;
  impressions: number;
  clicks: number;
};

export const E2E_ADVERTISER_ID = "11111111-1111-4111-8111-111111111111";

function e2eAdvertiserCampaigns(): AdvertiserCampaign[] {
  const now = Date.now();
  const day = 86_400_000;
  const iso = (offset: number) => new Date(now + offset).toISOString();
  return [
    { id: "00000000-0000-4000-8000-0000000ad101", placement: "home_top_banner", title: "Weekend vintage pop-up", image_path: "/icon-1024.png", target_url: "https://vintage.example.com/popup", status: "active", starts_at: iso(-2 * day), ends_at: iso(5 * day), run_days: 7, price_cents: 14000, currency: "usd", rejection_reason: null, created_at: iso(-3 * day), impressions: 1840, clicks: 37 },
    { id: "00000000-0000-4000-8000-0000000ad102", placement: "search_inline", title: "Bike tune-up special", image_path: "/icon-1024.png", target_url: "https://bikes.example.com/tune", status: "paid_pending_review", starts_at: iso(day), ends_at: iso(15 * day), run_days: 14, price_cents: 21000, currency: "usd", rejection_reason: null, created_at: iso(-1 * 3_600_000), impressions: 0, clicks: 0 },
    { id: "00000000-0000-4000-8000-0000000ad103", placement: "dashboard_card", title: "Moving sale", image_path: "/icon-1024.png", target_url: "https://moving.example.com", status: "pending_payment", starts_at: iso(2 * day), ends_at: iso(5 * day), run_days: 3, price_cents: 1500, currency: "usd", rejection_reason: null, created_at: iso(-600_000), impressions: 0, clicks: 0 },
    { id: "00000000-0000-4000-8000-0000000ad104", placement: "category_top", title: "Free shipping week", image_path: "/icon-1024.png", target_url: "https://shop.example.com", status: "rejected", starts_at: iso(-5 * day), ends_at: iso(2 * day), run_days: 7, price_cents: 7000, currency: "usd", rejection_reason: "The landing page did not match the ad.", created_at: iso(-6 * day), impressions: 0, clicks: 0 }
  ];
}

export async function loadAdvertiserCampaigns(session: { id: string; source: string }): Promise<AdvertiserCampaign[]> {
  if (session.source === "e2e") {
    if (process.env.NODE_ENV === "production" || process.env.FFM_E2E_AUTH !== "true") return [];
    return session.id === E2E_ADVERTISER_ID ? e2eAdvertiserCampaigns() : [];
  }
  if (session.source !== "supabase") return [];
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("ad_campaigns")
    .select("id,placement,title,image_path,target_url,status,starts_at,ends_at,run_days,price_cents,currency,rejection_reason,created_at")
    .eq("advertiser_id", session.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error || !Array.isArray(data)) return [];
  const ids = (data as Array<{ id: string }>).map((row) => row.id);
  const totals = new Map<string, { impressions: number; clicks: number }>();
  if (ids.length) {
    const { data: events } = await supabase.from("ad_events").select("campaign_id,impressions,clicks").in("campaign_id", ids);
    for (const row of (events ?? []) as Array<{ campaign_id: string; impressions: number; clicks: number }>) {
      const current = totals.get(row.campaign_id) ?? { impressions: 0, clicks: 0 };
      current.impressions += Number(row.impressions ?? 0);
      current.clicks += Number(row.clicks ?? 0);
      totals.set(row.campaign_id, current);
    }
  }
  return (data as Array<Record<string, unknown>>).flatMap((row) => {
    const placement = String(row.placement ?? "");
    if (!isAdPlacementKey(placement) || !isAdStatus(row.status)) return [];
    const stats = totals.get(String(row.id)) ?? { impressions: 0, clicks: 0 };
    return [{
      id: String(row.id),
      placement,
      title: String(row.title ?? ""),
      image_path: String(row.image_path ?? ""),
      target_url: String(row.target_url ?? ""),
      status: row.status,
      starts_at: String(row.starts_at ?? ""),
      ends_at: (row.ends_at as string | null) ?? null,
      run_days: Number(row.run_days ?? 0),
      price_cents: Number(row.price_cents ?? 0),
      currency: String(row.currency ?? "usd"),
      rejection_reason: (row.rejection_reason as string | null) ?? null,
      created_at: String(row.created_at ?? ""),
      ...stats
    }];
  });
}
