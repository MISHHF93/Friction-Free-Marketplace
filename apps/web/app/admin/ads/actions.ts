"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminPagePermission } from "@/lib/admin/permissions";
import { AD_CREATIVES_BUCKET, isAdPlacementKey } from "@/lib/ads/placements";
import { isAllowedAdTarget } from "@/lib/ads/redirect";
import { publicEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export type AdCampaignFormState = { error: string | null };

const empty: AdCampaignFormState = { error: null };

function field(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseWindow(formData: FormData) {
  const startsAt = field(formData, "starts_at");
  const endsAt = field(formData, "ends_at");
  const start = startsAt ? new Date(startsAt) : new Date();
  if (Number.isNaN(start.valueOf())) throw new Error("Enter a valid start date.");
  let end: Date | null = null;
  if (endsAt) {
    end = new Date(endsAt);
    if (Number.isNaN(end.valueOf())) throw new Error("Enter a valid end date.");
    if (end <= start) throw new Error("The end date must be after the start date.");
  }
  return { starts_at: start.toISOString(), ends_at: end ? end.toISOString() : null };
}

function payloadFrom(formData: FormData, imagePath: string) {
  const placement = field(formData, "placement");
  if (!isAdPlacementKey(placement)) throw new Error("Choose a placement.");
  const title = field(formData, "title");
  const altText = field(formData, "alt_text");
  const advertiserName = field(formData, "advertiser_name");
  const targetUrl = field(formData, "target_url");
  const categorySlug = field(formData, "category_slug") || null;
  if (!title || title.length > 120) throw new Error("Enter a title up to 120 characters.");
  if (!altText || altText.length > 200) throw new Error("Enter alt text up to 200 characters.");
  if (!advertiserName || advertiserName.length > 120) throw new Error("Enter the advertiser name.");
  if (!isAllowedAdTarget(targetUrl, publicEnv.NEXT_PUBLIC_APP_URL)) {
    throw new Error("The destination must be an internal path or an https URL.");
  }
  if (!imagePath || imagePath.includes("..")) throw new Error("Upload a campaign image.");
  const priority = Number(field(formData, "priority") || "0");
  const weight = Number(field(formData, "weight") || "1");
  if (!Number.isInteger(priority) || priority < -1000 || priority > 1000) throw new Error("Priority must be a whole number.");
  if (!Number.isInteger(weight) || weight < 1 || weight > 1000) throw new Error("Weight must be between 1 and 1000.");
  const { starts_at, ends_at } = parseWindow(formData);
  return {
    placement,
    title,
    alt_text: altText,
    advertiser_name: advertiserName,
    target_url: targetUrl,
    image_path: imagePath,
    category_slug: categorySlug,
    is_active: field(formData, "is_active") === "on" || field(formData, "is_active") === "true",
    priority,
    weight,
    starts_at,
    ends_at
  };
}

async function writeAudit(actorId: string, action: string, recordId: string | null, metadata: Record<string, unknown>) {
  const supabase = createAdminClient() as any;
  await supabase.from("audit_logs").insert({
    actor_id: actorId,
    actor_type: "admin",
    action,
    table_name: "ad_campaigns",
    record_id: recordId,
    metadata: { source: "admin_ads", ...metadata }
  });
}

export async function createAdCampaign(_state: AdCampaignFormState, formData: FormData): Promise<AdCampaignFormState> {
  const auth = await requireAdminPagePermission("ads.manage", { loginNext: "/admin/ads/new", deniedPath: "/admin" });
  try {
    const imagePath = field(formData, "image_path");
    const payload = payloadFrom(formData, imagePath);
    const supabase = auth.supabase as any;
    const inserted = await supabase.from("ad_campaigns").insert({
      ...payload,
      created_by: auth.adminUser.id,
      updated_by: auth.adminUser.id
    }).select("id").maybeSingle();
    if (inserted.error || !inserted.data?.id) throw new Error(inserted.error?.message ?? "Could not create the campaign.");
    await writeAudit(auth.adminUser.id, "ad_campaign.created", inserted.data.id, { placement: payload.placement, title: payload.title });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not create the campaign." };
  }
  revalidatePath("/admin/ads");
  redirect("/admin/ads");
  return empty;
}

export async function updateAdCampaign(_state: AdCampaignFormState, formData: FormData): Promise<AdCampaignFormState> {
  const auth = await requireAdminPagePermission("ads.manage", { loginNext: "/admin/ads", deniedPath: "/admin" });
  const id = field(formData, "id");
  if (!id) return { error: "Missing campaign." };
  try {
    const imagePath = field(formData, "image_path");
    const payload = payloadFrom(formData, imagePath);
    const supabase = auth.supabase as any;
    const updated = await supabase.from("ad_campaigns").update({
      ...payload,
      updated_by: auth.adminUser.id
    }).eq("id", id).select("id");
    if (updated.error || !updated.data?.length) throw new Error(updated.error?.message ?? "Could not update the campaign.");
    await writeAudit(auth.adminUser.id, "ad_campaign.updated", id, { placement: payload.placement, title: payload.title, is_active: payload.is_active });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not update the campaign." };
  }
  revalidatePath("/admin/ads");
  revalidatePath(`/admin/ads/${id}`);
  redirect("/admin/ads");
  return empty;
}

export async function setAdCampaignActive(formData: FormData) {
  const auth = await requireAdminPagePermission("ads.manage", { loginNext: "/admin/ads", deniedPath: "/admin" });
  const id = field(formData, "id");
  const isActive = field(formData, "is_active") === "true";
  const supabase = auth.supabase as any;
  const updated = await supabase.from("ad_campaigns").update({ is_active: isActive, updated_by: auth.adminUser.id }).eq("id", id).select("id,title");
  if (updated.error) throw new Error(updated.error.message);
  await writeAudit(auth.adminUser.id, isActive ? "ad_campaign.resumed" : "ad_campaign.paused", id, { title: updated.data?.[0]?.title ?? null });
  revalidatePath("/admin/ads");
}

export { AD_CREATIVES_BUCKET };
