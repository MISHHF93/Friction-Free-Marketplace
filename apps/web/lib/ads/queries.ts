import { createClient } from "@/lib/supabase/server";
import { e2eCampaignFor } from "@/lib/ads/e2e-fixture";
import { pickCampaign } from "@/lib/ads/schedule";
import type { AdPlacementKey } from "@/lib/ads/placements";
import type { AdCampaign, AdTargetContext } from "@/lib/ads/types";

function asCampaign(row: Record<string, unknown>): AdCampaign | null {
  if (typeof row.id !== "string" || typeof row.placement !== "string") return null;
  return {
    id: row.id,
    placement: row.placement as AdPlacementKey,
    title: String(row.title ?? ""),
    image_path: String(row.image_path ?? ""),
    alt_text: String(row.alt_text ?? ""),
    target_url: String(row.target_url ?? ""),
    advertiser_name: String(row.advertiser_name ?? ""),
    starts_at: String(row.starts_at ?? ""),
    ends_at: (row.ends_at as string | null) ?? null,
    is_active: Boolean(row.is_active),
    priority: Number(row.priority ?? 0),
    weight: Math.max(1, Number(row.weight ?? 1)),
    category_slug: typeof row.category_slug === "string" && row.category_slug ? row.category_slug : null
  };
}

export async function getCampaignForSlot(placement: AdPlacementKey, context: AdTargetContext = {}): Promise<AdCampaign | null> {
  const fixture = await e2eCampaignFor(placement);
  if (fixture) return fixture;

  try {
    const supabase = await createClient();
    const { data, error } = await (supabase as any)
      .from("ad_campaigns")
      .select("id,placement,title,image_path,alt_text,target_url,advertiser_name,starts_at,ends_at,is_active,priority,weight,category_slug")
      .eq("placement", placement)
      .eq("is_active", true)
      .lte("starts_at", new Date().toISOString());
    if (error || !data) return null;
    const campaigns = (data as Record<string, unknown>[]).map(asCampaign).filter((row): row is AdCampaign => Boolean(row));
    return pickCampaign(campaigns, placement, context);
  } catch {
    return null;
  }
}
