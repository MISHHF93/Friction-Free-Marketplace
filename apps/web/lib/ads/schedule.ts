import type { AdCampaign, AdTargetContext } from "@/lib/ads/types";
import type { AdPlacementKey } from "@/lib/ads/placements";

export function isCampaignLive(campaign: Pick<AdCampaign, "is_active" | "starts_at" | "ends_at">, now = new Date()) {
  if (!campaign.is_active) return false;
  const start = new Date(campaign.starts_at);
  if (Number.isNaN(start.valueOf()) || start > now) return false;
  if (!campaign.ends_at) return true;
  const end = new Date(campaign.ends_at);
  if (Number.isNaN(end.valueOf())) return false;
  return end > now;
}

export function matchesAdTarget(campaign: Pick<AdCampaign, "category_slug">, context: AdTargetContext = {}) {
  const targeted = campaign.category_slug?.trim() ?? "";
  if (!targeted) return true;
  const current = context.categorySlug?.trim() ?? "";
  return current.length > 0 && current.toLowerCase() === targeted.toLowerCase();
}

export function eligibleCampaigns(
  campaigns: AdCampaign[],
  placement: AdPlacementKey,
  context: AdTargetContext = {},
  now = new Date()
) {
  return campaigns.filter((campaign) => campaign.placement === placement && isCampaignLive(campaign, now) && matchesAdTarget(campaign, context));
}

export function pickCampaign(
  campaigns: AdCampaign[],
  placement: AdPlacementKey,
  context: AdTargetContext = {},
  now = new Date(),
  random = Math.random
): AdCampaign | null {
  const eligible = eligibleCampaigns(campaigns, placement, context, now);
  if (!eligible.length) return null;
  const topPriority = Math.max(...eligible.map((campaign) => campaign.priority));
  const pool = eligible.filter((campaign) => campaign.priority === topPriority);
  const totalWeight = pool.reduce((sum, campaign) => sum + Math.max(1, campaign.weight), 0);
  let ticket = random() * totalWeight;
  for (const campaign of pool) {
    ticket -= Math.max(1, campaign.weight);
    if (ticket <= 0) return campaign;
  }
  return pool[pool.length - 1] ?? null;
}
