import { createAdminClient } from "@/lib/supabase/admin";

export type AdEventKind = "impression" | "click";

export async function recordAdEvent(campaignId: string, event: AdEventKind) {
  const supabase = createAdminClient() as any;
  const { error } = await supabase.rpc("increment_ad_event", {
    p_campaign_id: campaignId,
    p_event: event
  });
  if (error) throw new Error(error.message ?? "Could not record the ad event.");
}
