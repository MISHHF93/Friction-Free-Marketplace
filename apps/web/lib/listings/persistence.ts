import type { SupabaseClient } from "@supabase/supabase-js";
import type { Json } from "@/types/database";
import { evaluateListingFraud } from "@/lib/fraud/detection";
import {
  assertListingLifecyclePermission,
  getListingForPermission,
} from "@/lib/listings/permissions";
import {
  listingFormSchema,
  listingPatchSchema,
  listingStatusSchema,
  slugifyListingTitle,
  type ListingFormInput,
} from "@/lib/listings/validation";
import {
  removeListingFromSearch,
  syncListingToSearch,
} from "@/lib/search/discovery";

type Db = SupabaseClient<any>;

const LISTING_IMAGE_BUCKET = "listing-images";

type ListingAuditAction =
  | "listing.create"
  | "listing.update"
  | "listing.publish"
  | "listing.archive"
  | "listing.mark_sold"
  | "listing.delete";

async function writeListingAudit({
  supabase,
  actorId,
  action,
  listingId,
  oldValues,
  newValues,
  metadata = {},
}: {
  supabase: Db;
  actorId: string | null;
  action: ListingAuditAction;
  listingId: string;
  oldValues?: Json | null;
  newValues?: Json | null;
  metadata?: Record<string, Json>;
}) {
  const { error } = await supabase.from("audit_logs").insert({
    actor_id: actorId,
    actor_type: actorId ? "user" : "system",
    action,
    table_name: "listings",
    record_id: listingId,
    old_values: oldValues ?? null,
    new_values: newValues ?? null,
    metadata: {
      source: "listing_lifecycle_service",
      ...metadata,
    } satisfies Json,
  });

  if (error) throw error;
}

function actionForStatus(status: string): ListingAuditAction {
  if (status === "active") return "listing.publish";
  if (status === "archived") return "listing.archive";
  if (status === "sold") return "listing.mark_sold";
  return "listing.update";
}

async function getCategoryId(
  supabase: Db,
  category: string,
  categoryId?: string | null,
) {
  if (categoryId) return categoryId;
  const { data } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", category)
    .maybeSingle();
  return data?.id ?? null;
}

async function syncListingChange(listingId: string, remove = false) {
  try {
    return remove
      ? await removeListingFromSearch(listingId)
      : await syncListingToSearch(listingId);
  } catch (error) {
    console.error("Unable to sync listing search document", {
      listingId,
      error,
    });
    return { skipped: true, reason: "sync_failed" };
  }
}

async function applyFraudDetection(listingId: string) {
  const decision = await evaluateListingFraud(listingId);
  return decision?.blocked ?? false;
}

function metadataFromInput(input: ListingFormInput) {
  return {
    category_slug: input.category,
    fulfillment_options: input.fulfillmentOptions,
    seo_tags: input.seoTags,
    moderation_status: input.moderationStatus,
    moderation_notes: input.moderationNotes ?? null,
    ai_listing: input.ai,
    price_suggestion: {
      min: input.ai.priceMin ?? null,
      max: input.ai.priceMax ?? null,
      currency: input.currency,
    },
  } satisfies Json;
}

export async function createListing(
  supabase: Db,
  sellerId: string,
  rawInput: unknown,
) {
  const input = listingFormSchema.parse(rawInput);
  if (input.publish && input.images.length === 0) {
    throw new Error("Add at least one listing photo before publishing.");
  }
  const categoryId = await getCategoryId(
    supabase,
    input.category,
    input.categoryId,
  );
  const now = new Date().toISOString();
  const status = input.publish ? "active" : "draft";

  const { data: listing, error } = await supabase
    .from("listings")
    .insert({
      seller_id: sellerId,
      category_id: categoryId,
      title: input.title,
      slug: `${slugifyListingTitle(input.title)}-${crypto.randomUUID().slice(0, 8)}`,
      description: input.description,
      condition: input.condition,
      status,
      price_amount: input.priceAmount,
      currency: input.currency,
      quantity: input.quantity,
      location_city: input.locationCity,
      location_region: input.locationRegion,
      location_country: input.locationCountry,
      ships_to: input.fulfillmentOptions.includes("shipping")
        ? input.shipsTo
        : [],
      pickup_available: input.fulfillmentOptions.includes("pickup"),
      metadata: metadataFromInput(input),
      published_at: input.publish ? now : null,
    })
    .select("*")
    .single();

  if (error) throw error;

  if (input.images.length > 0) {
    const { error: imageError } = await supabase.from("listing_images").insert(
      input.images.map((image, index) => ({
        listing_id: listing.id,
        storage_path: image.storagePath,
        public_url: image.publicUrl || null,
        alt_text: image.altText || input.title,
        sort_order: image.sortOrder ?? index,
        status: "ready" as const,
        moderation_result: {
          status: input.moderationStatus,
          source: "listing_creation",
        } as Json,
      })),
    );
    if (imageError) throw imageError;
  }

  const blocked = await applyFraudDetection(listing.id);
  await syncListingChange(listing.id, blocked);
  await writeListingAudit({
    supabase,
    actorId: sellerId,
    action: "listing.create",
    listingId: listing.id,
    oldValues: null,
    newValues: listing as Json,
    metadata: {
      initial_status: status,
      requested_publish: input.publish,
      search_sync_removed: blocked,
    },
  });

  if (!blocked) return listing;

  const { data: blockedListing } = await supabase
    .from("listings")
    .select("*")
    .eq("id", listing.id)
    .single();
  return blockedListing ?? listing;
}

export async function updateListing(
  supabase: Db,
  listingId: string,
  rawInput: unknown,
  actorId?: string,
) {
  if (actorId) {
    const permissionListing = await getListingForPermission(supabase, listingId);
    assertListingLifecyclePermission(permissionListing, actorId, "edit");
  }

  const existing = await supabase
    .from("listings")
    .select("*, listing_images(storage_path)")
    .eq("id", listingId)
    .single();
  if (existing.error) throw existing.error;

  const input = listingPatchSchema.parse(rawInput);
  if (input.publish && input.images?.length === 0) {
    throw new Error("Add at least one listing photo before publishing.");
  }
  const currentMetadata = (existing.data.metadata ?? {}) as Record<
    string,
    unknown
  >;
  const nextMetadata = {
    ...currentMetadata,
    ...(input.category ? { category_slug: input.category } : {}),
    ...(input.fulfillmentOptions
      ? { fulfillment_options: input.fulfillmentOptions }
      : {}),
    ...(input.seoTags ? { seo_tags: input.seoTags } : {}),
    ...(input.moderationStatus
      ? { moderation_status: input.moderationStatus }
      : {}),
    ...(input.moderationNotes !== undefined
      ? { moderation_notes: input.moderationNotes }
      : {}),
    ...(input.ai
      ? {
          ai_listing: input.ai,
          price_suggestion: {
            min: input.ai.priceMin ?? null,
            max: input.ai.priceMax ?? null,
            currency: input.currency ?? "USD",
          },
        }
      : {}),
  } as Json;

  const categoryId = input.category
    ? await getCategoryId(supabase, input.category, input.categoryId)
    : undefined;
  const status =
    input.publish === true
      ? "active"
      : input.publish === false
        ? "draft"
        : undefined;

  const { data: listing, error } = await supabase
    .from("listings")
    .update({
      ...(categoryId !== undefined ? { category_id: categoryId } : {}),
      ...(input.title ? { title: input.title } : {}),
      ...(input.description ? { description: input.description } : {}),
      ...(input.condition ? { condition: input.condition } : {}),
      ...(status ? { status } : {}),
      ...(input.priceAmount !== undefined
        ? { price_amount: input.priceAmount }
        : {}),
      ...(input.currency ? { currency: input.currency } : {}),
      ...(input.quantity !== undefined ? { quantity: input.quantity } : {}),
      ...(input.locationCity ? { location_city: input.locationCity } : {}),
      ...(input.locationRegion
        ? { location_region: input.locationRegion }
        : {}),
      ...(input.locationCountry
        ? { location_country: input.locationCountry }
        : {}),
      ...(input.fulfillmentOptions
        ? {
            ships_to: input.fulfillmentOptions.includes("shipping")
              ? (input.shipsTo ?? [])
              : [],
          }
        : {}),
      ...(input.fulfillmentOptions
        ? { pickup_available: input.fulfillmentOptions.includes("pickup") }
        : {}),
      metadata: nextMetadata,
      ...(input.publish === true
        ? { published_at: new Date().toISOString() }
        : {}),
    })
    .eq("id", listingId)
    .select("*")
    .single();

  if (error) throw error;

  if (input.images) {
    const existingImagePaths = (
      (existing.data as { listing_images?: Array<{ storage_path: string }> })
        .listing_images ?? []
    ).map((image) => image.storage_path);
    const nextImagePaths = new Set(
      input.images.map((image) => image.storagePath),
    );
    const staleImagePaths = existingImagePaths.filter(
      (path) => !nextImagePaths.has(path),
    );

    await supabase.from("listing_images").delete().eq("listing_id", listingId);
    if (input.images.length > 0) {
      const { error: imageError } = await supabase
        .from("listing_images")
        .insert(
          input.images.map((image, index) => ({
            listing_id: listingId,
            storage_path: image.storagePath,
            public_url: image.publicUrl || null,
            alt_text: image.altText || input.title || listing.title,
            sort_order: image.sortOrder ?? index,
            status: "ready" as const,
            moderation_result: {
              status: input.moderationStatus ?? "pending",
              source: "listing_edit",
            } as Json,
          })),
        );
      if (imageError) throw imageError;
    }

    if (staleImagePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from(LISTING_IMAGE_BUCKET)
        .remove(staleImagePaths);
      if (storageError)
        console.error("Unable to remove stale listing images", {
          listingId,
          storageError,
        });
    }
  }

  const blocked = await applyFraudDetection(listing.id);
  await syncListingChange(listing.id, blocked || listing.status !== "active");
  await writeListingAudit({
    supabase,
    actorId: actorId ?? listing.seller_id ?? null,
    action: "listing.update",
    listingId: listing.id,
    oldValues: existing.data as Json,
    newValues: listing as Json,
    metadata: {
      search_sync_removed: blocked || listing.status !== "active",
    },
  });

  if (!blocked) return listing;

  const { data: blockedListing } = await supabase
    .from("listings")
    .select("*")
    .eq("id", listing.id)
    .single();
  return blockedListing ?? listing;
}

export async function setListingStatus(
  supabase: Db,
  listingId: string,
  rawStatus: unknown,
  actorId?: string,
) {
  const status = listingStatusSchema.parse(rawStatus);
  const now = new Date().toISOString();
  const lifecycleAction =
    status === "active"
      ? "publish"
      : status === "archived"
        ? "archive"
        : status === "sold"
          ? "mark_sold"
          : "edit";
  const permissionListing = await getListingForPermission(supabase, listingId);
  if (actorId) {
    assertListingLifecyclePermission(permissionListing, actorId, lifecycleAction);
  }
  const existing = await supabase
    .from("listings")
    .select("*")
    .eq("id", listingId)
    .single();
  if (existing.error) throw existing.error;
  const existingMetadata = (existing.data.metadata ?? {}) as Record<string, unknown>;
  const metadata =
    status === "sold"
      ? ({
          ...existingMetadata,
          lifecycle_event: "sold",
          sold_at: now,
        } as Json)
      : status === "archived"
        ? ({
            ...existingMetadata,
            lifecycle_event: "archived",
            archived_at: now,
          } as Json)
        : status === "active"
          ? ({
              ...existingMetadata,
              lifecycle_event: "published",
              last_published_at: now,
            } as Json)
          : undefined;

  const { data: listing, error } = await supabase
    .from("listings")
    .update({
      status,
      ...(status === "active" ? { published_at: now } : {}),
      ...(status === "sold" ? { quantity: 0, metadata } : {}),
      ...(status === "archived" || status === "active" ? { metadata } : {}),
    })
    .eq("id", listingId)
    .is("deleted_at", null)
    .select("*")
    .single();

  if (error) throw error;
  const blocked = status === "active" ? await applyFraudDetection(listing.id) : false;
  await syncListingChange(listing.id, blocked || status !== "active");
  await writeListingAudit({
    supabase,
    actorId: actorId ?? listing.seller_id ?? null,
    action: actionForStatus(status),
    listingId: listing.id,
    oldValues: existing.data as Json,
    newValues: listing as Json,
    metadata: {
      from_status: existing.data.status,
      to_status: status,
      search_sync_removed: blocked || status !== "active",
    },
  });

  if (!blocked) return listing;

  const { data: blockedListing } = await supabase
    .from("listings")
    .select("*")
    .eq("id", listing.id)
    .single();
  return blockedListing ?? listing;
}

export async function deleteListing(
  supabase: Db,
  listingId: string,
  sellerId: string,
) {
  const existing = await getListingForPermission(supabase, listingId);
  assertListingLifecyclePermission(existing, sellerId, "delete");

  const { data: images } = await supabase
    .from("listing_images")
    .select("storage_path")
    .eq("listing_id", listingId);
  const imagePaths = (images ?? [])
    .map((image) => image.storage_path)
    .filter(Boolean);
  const deletedAt = new Date().toISOString();

  const { error } = await supabase
    .from("listings")
    .update({ status: "removed", deleted_at: deletedAt })
    .eq("id", listingId)
    .eq("seller_id", sellerId)
    .is("deleted_at", null);

  if (error) throw error;
  await writeListingAudit({
    supabase,
    actorId: sellerId,
    action: "listing.delete",
    listingId,
    oldValues: existing as Json,
    newValues: {
      status: "removed",
      deleted_at: deletedAt,
    } as Json,
    metadata: {
      removed_image_count: imagePaths.length,
    },
  });

  if (imagePaths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from(LISTING_IMAGE_BUCKET)
      .remove(imagePaths);
    if (storageError)
      console.error("Unable to remove deleted listing images", {
        listingId,
        storageError,
      });
  }

  await syncListingChange(listingId, true);
}
