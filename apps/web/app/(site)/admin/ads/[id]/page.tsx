import { notFound } from "next/navigation";
import { requireAdminPagePermission } from "@/lib/admin/permissions";
import { AdCampaignForm } from "@/app/admin/ads/campaign-form";
import { isAdPlacementKey } from "@/lib/ads/placements";
import type { AdCampaign } from "@/lib/ads/types";

export const dynamic = "force-dynamic";

export default async function EditAdCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminPagePermission("ads.manage", { loginNext: "/admin/ads", deniedPath: "/admin" });
  const { id } = await params;
  const { data } = await (auth.supabase as any)
    .from("ad_campaigns")
    .select("id,placement,title,image_path,alt_text,target_url,advertiser_name,starts_at,ends_at,is_active,priority,weight,category_slug")
    .eq("id", id)
    .maybeSingle();
  if (!data || !isAdPlacementKey(String(data.placement))) notFound();
  return <AdCampaignForm campaign={data as AdCampaign} />;
}
