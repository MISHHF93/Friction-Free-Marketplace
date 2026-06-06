"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createListing, deleteListing, setListingStatus, updateListing } from "@/lib/listings/persistence";
import { captureServerEvent } from "@/lib/analytics/posthog";

const LISTING_IMAGE_BUCKET = "listing-images";
const MAX_FILES = 12;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

export type ListingImageUpload = {
  storagePath: string;
  publicUrl: string;
  altText: string;
  sortOrder: number;
};

export type ListingActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function requireAuthUser() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("You must be signed in to manage listings.");
  return { supabase, user: data.user };
}

function actionError(error: unknown, fallback = "Unable to manage listing.") {
  return { ok: false, error: error instanceof Error ? error.message : fallback } as const;
}

async function ensureListingOwner(supabase: ReturnType<typeof createClient>, listingId: string, sellerId: string) {
  const { data, error } = await supabase
    .from("listings")
    .select("id")
    .eq("id", listingId)
    .eq("seller_id", sellerId)
    .is("deleted_at", null)
    .single();

  if (error || !data) throw new Error("Listing not found.");
}

function revalidateListingViews(listingId?: string) {
  revalidatePath("/dashboard/listings");
  revalidatePath("/browse");
  if (listingId) {
    revalidatePath(`/dashboard/listings/${listingId}/edit`);
    revalidatePath(`/listings/${listingId}`);
  }
}

export async function createListingAction(input: unknown): Promise<ListingActionResult<{ id: string; status: string }>> {
  try {
    const { supabase, user } = await requireAuthUser();
    const listing = await createListing(supabase as any, user.id, input);
    await captureServerEvent({ distinctId: user.id, event: "listing_created", properties: { listing_id: listing.id, status: listing.status } });
    revalidateListingViews(listing.id);
    return { ok: true, data: { id: listing.id, status: listing.status } };
  } catch (error) {
    return actionError(error, "Unable to create listing.");
  }
}

export async function updateListingAction(listingId: string, input: unknown): Promise<ListingActionResult<{ id: string; status: string }>> {
  try {
    const { supabase, user } = await requireAuthUser();
    await ensureListingOwner(supabase, listingId, user.id);
    const listing = await updateListing(supabase as any, listingId, input);
    await captureServerEvent({ distinctId: user.id, event: "listing_updated", properties: { listing_id: listing.id, status: listing.status } });
    revalidateListingViews(listing.id);
    return { ok: true, data: { id: listing.id, status: listing.status } };
  } catch (error) {
    return actionError(error, "Unable to update listing.");
  }
}

export async function deleteListingAction(listingId: string): Promise<ListingActionResult<{ id: string }>> {
  try {
    const { supabase, user } = await requireAuthUser();
    await deleteListing(supabase as any, listingId, user.id);
    await captureServerEvent({ distinctId: user.id, event: "listing_deleted", properties: { listing_id: listingId } });
    revalidateListingViews(listingId);
    return { ok: true, data: { id: listingId } };
  } catch (error) {
    return actionError(error, "Unable to delete listing.");
  }
}

export async function changeListingStatusAction(listingId: string, status: unknown): Promise<ListingActionResult<{ id: string; status: string }>> {
  try {
    const { supabase, user } = await requireAuthUser();
    await ensureListingOwner(supabase, listingId, user.id);
    const listing = await setListingStatus(supabase as any, listingId, status);
    await captureServerEvent({ distinctId: user.id, event: "listing_status_changed", properties: { listing_id: listing.id, status: listing.status } });
    revalidateListingViews(listing.id);
    return { ok: true, data: { id: listing.id, status: listing.status } };
  } catch (error) {
    return actionError(error, "Unable to update listing status.");
  }
}

export async function uploadListingImagesAction(formData: FormData): Promise<ListingActionResult<ListingImageUpload[]>> {
  try {
    const { user } = await requireAuthUser();
    const files = formData.getAll("files").filter((value): value is File => value instanceof File);
    const existingCount = Number(formData.get("existingCount") ?? 0);

    if (files.length === 0) throw new Error("Choose at least one image.");
    if (files.length + existingCount > MAX_FILES) throw new Error(`Upload up to ${MAX_FILES} photos per listing.`);

    const admin = createAdminClient();
    const uploaded: ListingImageUpload[] = [];

    for (const [index, file] of files.entries()) {
      if (!ALLOWED_TYPES.has(file.type)) throw new Error(`${file.name} must be a JPEG, PNG, WebP, HEIC, or HEIF image.`);
      if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name} is larger than 8MB.`);

      const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const storagePath = `${user.id}/drafts/${crypto.randomUUID()}.${extension}`;
      const bytes = await file.arrayBuffer();
      const { error } = await admin.storage.from(LISTING_IMAGE_BUCKET).upload(storagePath, bytes, {
        contentType: file.type,
        upsert: false
      });
      if (error) throw error;

      const { data: publicData } = admin.storage.from(LISTING_IMAGE_BUCKET).getPublicUrl(storagePath);
      uploaded.push({
        storagePath,
        publicUrl: publicData.publicUrl,
        altText: file.name.replace(/\.[^.]+$/, ""),
        sortOrder: existingCount + index
      });
    }

    return { ok: true, data: uploaded };
  } catch (error) {
    return actionError(error, "Unable to upload listing photos.");
  }
}
