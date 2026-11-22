export const AD_PLACEMENT_KEYS = [
  "home_top_banner",
  "home_inline",
  "search_inline",
  "category_top",
  "listing_detail_below",
  "dashboard_card"
] as const;

export type AdPlacementKey = (typeof AD_PLACEMENT_KEYS)[number];

export const SEARCH_INLINE_EVERY = 8;

export const AD_PLACEMENTS: Record<AdPlacementKey, { name: string; description: string; aspectRatio: string; belowFold: boolean }> = {
  home_top_banner: { name: "Home top banner", description: "Wide banner under the home hero.", aspectRatio: "16 / 5", belowFold: false },
  home_inline: { name: "Home inline", description: "In-feed unit between home sections.", aspectRatio: "16 / 9", belowFold: true },
  search_inline: { name: "Search inline", description: "Inserted every few search results.", aspectRatio: "16 / 9", belowFold: true },
  category_top: { name: "Category top", description: "Banner at the top of a category page.", aspectRatio: "16 / 5", belowFold: false },
  listing_detail_below: { name: "Listing detail", description: "Unit below the listing details.", aspectRatio: "16 / 9", belowFold: true },
  dashboard_card: { name: "Dashboard card", description: "Card on the signed-in dashboard.", aspectRatio: "16 / 9", belowFold: true }
};

export function isAdPlacementKey(value: string): value is AdPlacementKey {
  return (AD_PLACEMENT_KEYS as readonly string[]).includes(value);
}

export const AD_CREATIVES_BUCKET = "ad-creatives";
