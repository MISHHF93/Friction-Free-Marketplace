import { createAdminClient } from "@/lib/supabase/admin";
import { isDemoMarketplaceDataEnabled, isLiveDatabaseConfigured } from "@/lib/marketplace/demo-mode";
import { normalizePricingRows, PLACEHOLDER_AD_PRICING, type AdPricingRow } from "@/lib/ads/self-serve";
import type { AdPlacementKey } from "@/lib/ads/placements";

/** Pricing for display. Falls back to the labeled placeholders only in local demo/e2e. */
export async function loadAdPricingForDisplay(): Promise<AdPricingRow[]> {
  if (isLiveDatabaseConfigured()) {
    try {
      const supabase = createAdminClient() as any;
      const { data, error } = await supabase.from("ad_pricing").select("*");
      if (!error && Array.isArray(data) && data.length) return normalizePricingRows(data);
    } catch {
      // fall through
    }
  }
  if (isDemoMarketplaceDataEnabled() || process.env.FFM_E2E_AUTH === "true") return Object.values(PLACEHOLDER_AD_PRICING);
  return [];
}

/** Trusted price for checkout. Never falls back to placeholders. */
export async function loadAdPricingForCheckout(placement: AdPlacementKey): Promise<AdPricingRow | null> {
  const supabase = createAdminClient() as any;
  const { data, error } = await supabase.from("ad_pricing").select("*").eq("placement", placement).maybeSingle();
  if (error || !data) return null;
  return normalizePricingRows([data])[0] ?? null;
}
