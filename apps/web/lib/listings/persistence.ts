import type { SupabaseClient } from "@supabase/supabase-js";
import type { Json } from "@/types/database";
import { listingFormSchema, listingPatchSchema, listingStatusSchema, slugifyListingTitle, type ListingFormInput } from "@/lib/listings/validation";

type Db = SupabaseClient<any>;

async function getCategoryId(supabase: Db, category: string, categoryId?: string | null) {
  if (categoryId) return categoryId;
  const { data } = await supabase.from("categories").select("id").eq("slug", category).maybeSingle();
  return data?.id ?? null;
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
      currency: input.currency
    }
  } satisfies Json;
}

export async function createListing(supabase: Db, sellerId: string, rawInput: unknown) {
  const input = listingFormSchema.parse(rawInput);
  const categoryId = await getCategoryId(supabase, input.category, input.categoryId);
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
      ships_to: input.fulfillmentOptions.includes("shipping") ? input.shipsTo : [],
      pickup_available: input.fulfillmentOptions.includes("pickup"),
      metadata: metadataFromInput(input),
      published_at: input.publish ? now : null
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
        moderation_result: { status: input.moderationStatus, source: "listing_creation" } as Json
      }))
    );
    if (imageError) throw imageError;
  }

  return listing;
}

export async function updateListing(supabase: Db, listingId: string, rawInput: unknown) {
  const existing = await supabase.from("listings").select("metadata").eq("id", listingId).single();
  if (existing.error) throw existing.error;

  const input = listingPatchSchema.parse(rawInput);
  const currentMetadata = (existing.data.metadata ?? {}) as Record<string, unknown>;
  const nextMetadata = {
    ...currentMetadata,
    ...(input.category ? { category_slug: input.category } : {}),
    ...(input.fulfillmentOptions ? { fulfillment_options: input.fulfillmentOptions } : {}),
    ...(input.seoTags ? { seo_tags: input.seoTags } : {}),
    ...(input.moderationStatus ? { moderation_status: input.moderationStatus } : {}),
    ...(input.moderationNotes !== undefined ? { moderation_notes: input.moderationNotes } : {}),
    ...(input.ai ? { ai_listing: input.ai, price_suggestion: { min: input.ai.priceMin ?? null, max: input.ai.priceMax ?? null, currency: input.currency ?? "USD" } } : {})
  } as Json;

  const categoryId = input.category ? await getCategoryId(supabase, input.category, input.categoryId) : undefined;
  const status = input.publish === true ? "active" : input.publish === false ? "draft" : undefined;

  const { data: listing, error } = await supabase
    .from("listings")
    .update({
      ...(categoryId !== undefined ? { category_id: categoryId } : {}),
      ...(input.title ? { title: input.title } : {}),
      ...(input.description ? { description: input.description } : {}),
      ...(input.condition ? { condition: input.condition } : {}),
      ...(status ? { status } : {}),
      ...(input.priceAmount !== undefined ? { price_amount: input.priceAmount } : {}),
      ...(input.currency ? { currency: input.currency } : {}),
      ...(input.quantity !== undefined ? { quantity: input.quantity } : {}),
      ...(input.locationCity ? { location_city: input.locationCity } : {}),
      ...(input.locationRegion ? { location_region: input.locationRegion } : {}),
      ...(input.locationCountry ? { location_country: input.locationCountry } : {}),
      ...(input.fulfillmentOptions ? { ships_to: input.fulfillmentOptions.includes("shipping") ? input.shipsTo ?? [] : [] } : {}),
      ...(input.fulfillmentOptions ? { pickup_available: input.fulfillmentOptions.includes("pickup") } : {}),
      metadata: nextMetadata,
      ...(input.publish === true ? { published_at: new Date().toISOString() } : {})
    })
    .eq("id", listingId)
    .select("*")
    .single();

  if (error) throw error;

  if (input.images) {
    await supabase.from("listing_images").delete().eq("listing_id", listingId);
    if (input.images.length > 0) {
      const { error: imageError } = await supabase.from("listing_images").insert(
        input.images.map((image, index) => ({
          listing_id: listingId,
          storage_path: image.storagePath,
          public_url: image.publicUrl || null,
          alt_text: image.altText || input.title || listing.title,
          sort_order: image.sortOrder ?? index,
          status: "ready" as const,
          moderation_result: { status: input.moderationStatus ?? "pending", source: "listing_edit" } as Json
        }))
      );
      if (imageError) throw imageError;
    }
  }

  return listing;
}


export async function setListingStatus(supabase: Db, listingId: string, rawStatus: unknown) {
  const status = listingStatusSchema.parse(rawStatus);
  const now = new Date().toISOString();
  const { data: listing, error } = await supabase
    .from("listings")
    .update({
      status,
      ...(status === "active" ? { published_at: now } : {})
    })
    .eq("id", listingId)
    .is("deleted_at", null)
    .select("*")
    .single();

  if (error) throw error;
  return listing;
}

export async function deleteListing(supabase: Db, listingId: string, sellerId: string) {
  const { error } = await supabase
    .from("listings")
    .update({ status: "removed", deleted_at: new Date().toISOString() })
    .eq("id", listingId)
    .eq("seller_id", sellerId)
    .is("deleted_at", null);

  if (error) throw error;
}
