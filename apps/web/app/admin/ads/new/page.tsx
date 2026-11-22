import { requireAdminPagePermission } from "@/lib/admin/permissions";
import { AdCampaignForm } from "@/app/admin/ads/campaign-form";

export const dynamic = "force-dynamic";

export default async function NewAdCampaignPage() {
  await requireAdminPagePermission("ads.manage", { loginNext: "/admin/ads/new", deniedPath: "/admin" });
  return <AdCampaignForm />;
}
