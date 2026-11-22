import { cookies } from "next/headers";
import { E2E_ADS_COOKIE, e2eFixtureCampaign } from "@/lib/ads/e2e-campaign";
import type { AdPlacementKey } from "@/lib/ads/placements";
import type { AdCampaign } from "@/lib/ads/types";

export { E2E_ADS_COOKIE, e2eFixtureCampaign };

export async function e2eCampaignFor(placement: AdPlacementKey): Promise<AdCampaign | null> {
  if (process.env.FFM_E2E_AUTH !== "true") return null;
  try {
    const store = await cookies();
    const value = store.get(E2E_ADS_COOKIE)?.value;
    if (!value) return null;
    if (value !== "1" && value !== placement) return null;
    return e2eFixtureCampaign(placement);
  } catch {
    return null;
  }
}
