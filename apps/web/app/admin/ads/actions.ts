"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminPagePermission } from "@/lib/admin/permissions";
import { isAdPlacementKey } from "@/lib/ads/placements";
import { isAllowedAdTarget } from "@/lib/ads/redirect";
import { publicEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { approveSelfServeAd, rejectSelfServeAd } from "@/lib/ads/payments";
import { enqueueTemplateNotification } from "@/lib/notifications/service";
import { getStripe } from "@/lib/stripe/server";

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


function adPaymentDeps() {
  return {
    supabase: createAdminClient() as any,
    stripe: getStripe(),
    notify: ({ userId, template, input }: { userId: string; template: "ad_payment_received" | "ad_approved" | "ad_rejected"; input: Record<string, string | number | null> }) =>
      enqueueTemplateNotification({ userId, template, input })
  };
}

function reviewRedirect(kind: "ok" | "error", message: string): never {
  redirect(`/admin/ads?${kind === "ok" ? "notice" : "error"}=${encodeURIComponent(message)}`);
}

export async function approveSelfServeAdAction(formData: FormData) {
  const auth = await requireAdminPagePermission("ads.manage", { loginNext: "/admin/ads", deniedPath: "/admin" });
  const id = field(formData, "id");
  let failure: string | null = null;
  try {
    await approveSelfServeAd(adPaymentDeps(), id, auth.adminUser.id);
  } catch (error) {
    failure = error instanceof Error ? error.message : "Could not approve the ad.";
  }
  revalidatePath("/admin/ads");
  if (failure) reviewRedirect("error", failure);
  reviewRedirect("ok", "Ad approved. The advertiser was notified.");
}

export async function rejectSelfServeAdAction(formData: FormData) {
  const auth = await requireAdminPagePermission("ads.manage", { loginNext: "/admin/ads", deniedPath: "/admin" });
  const id = field(formData, "id");
  const reason = field(formData, "reason");
  let failure: string | null = null;
  try {
    await rejectSelfServeAd(adPaymentDeps(), id, auth.adminUser.id, reason);
  } catch (error) {
    const fromStripe = typeof (error as { type?: unknown })?.type === "string" && String((error as { type: string }).type).startsWith("Stripe");
    failure = fromStripe
      ? "Stripe could not refund this payment, so the ad is still waiting for review. Check the Stripe dashboard and try again."
      : error instanceof Error ? error.message : "Could not reject the ad.";
  }
  revalidatePath("/admin/ads");
  if (failure) reviewRedirect("error", failure);
  reviewRedirect("ok", "Ad rejected and refunded. The advertiser was notified.");
}

export async function updateAdPricingAction(formData: FormData) {
  const auth = await requireAdminPagePermission("ads.manage", { loginNext: "/admin/ads/pricing", deniedPath: "/admin" });
  const placement = field(formData, "placement");
  let failure: string | null = null;
  try {
    if (!isAdPlacementKey(placement)) throw new Error("Unknown placement.");
    const dollars = Number(field(formData, "price_per_day"));
    const minDays = Number(field(formData, "min_days") || "1");
    const maxDays = Number(field(formData, "max_days") || "30");
    const cents = Math.round(dollars * 100);
    if (!Number.isFinite(dollars) || cents < 100 || cents > 10_000_000) throw new Error("Price per day must be between 1.00 and 100,000.00.");
    if (!Number.isInteger(minDays) || !Number.isInteger(maxDays) || minDays < 1 || maxDays < minDays || maxDays > 90) throw new Error("Days must be whole numbers, 1 to 90, with min ≤ max.");
    const supabase = auth.supabase as any;
    const updated = await supabase.from("ad_pricing").update({
      price_cents_per_day: cents,
      min_days: minDays,
      max_days: maxDays,
      self_serve_enabled: field(formData, "self_serve_enabled") === "on",
      is_placeholder: false,
      updated_by: auth.adminUser.id
    }).eq("placement", placement).select("placement");
    if (updated.error || !updated.data?.length) throw new Error(updated.error?.message ?? "Could not save the price.");
    await writeAudit(auth.adminUser.id, "ad_pricing.updated", null, { placement, price_cents_per_day: cents, min_days: minDays, max_days: maxDays });
  } catch (error) {
    failure = error instanceof Error ? error.message : "Could not save the price.";
  }
  revalidatePath("/admin/ads/pricing");
  redirect(`/admin/ads/pricing?${failure ? `error=${encodeURIComponent(failure)}` : "saved=1"}`);
}
