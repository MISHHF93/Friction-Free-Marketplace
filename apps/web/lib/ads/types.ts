import type { AdPlacementKey } from "@/lib/ads/placements";

export type AdCampaign = {
  id: string;
  placement: AdPlacementKey;
  title: string;
  image_path: string;
  alt_text: string;
  target_url: string;
  advertiser_name: string;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  priority: number;
  weight: number;
  category_slug: string | null;
};

export type AdCampaignStats = AdCampaign & {
  impressions: number;
  clicks: number;
};

export type AdTargetContext = {
  categorySlug?: string | null;
};
