import type { AdPlacementKey } from "@/lib/ads/placements";
import type { AdCampaign } from "@/lib/ads/types";

export const E2E_ADS_COOKIE = "ffm_e2e_ads";
export const E2E_AD_CAMPAIGN_ID = "00000000-0000-4000-8000-00000000ad01";

export function e2eFixtureCampaign(placement: AdPlacementKey): AdCampaign {
  const now = Date.now();
  return {
    id: E2E_AD_CAMPAIGN_ID,
    placement,
    title: "Local spring market",
    image_path: "/icon-1024.png",
    alt_text: "Sponsored marketplace event banner",
    target_url: "/search",
    advertiser_name: "Friction-Free Marketplace",
    starts_at: new Date(now - 60_000).toISOString(),
    ends_at: new Date(now + 86_400_000).toISOString(),
    is_active: true,
    priority: 1,
    weight: 1,
    category_slug: null
  };
}
