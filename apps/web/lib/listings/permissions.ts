import type { SupabaseClient } from "@supabase/supabase-js";
import type { ListingLifecycleAction } from "@/lib/listings/validation";

type Db = SupabaseClient<any>;

export type ListingPermissionRecord = {
  id: string;
  seller_id: string;
  title: string | null;
  description: string | null;
  status: string;
  price_amount: number | string | null;
  quantity: number | null;
  category_id: string | null;
  location_city: string | null;
  location_region: string | null;
  pickup_available: boolean | null;
  ships_to: string[] | null;
  deleted_at: string | null;
  listing_images?: Array<{ id: string; status: string | null }>;
};

const allowedActionsByStatus: Record<string, ListingLifecycleAction[]> = {
  draft: ["edit", "delete", "publish", "archive"],
  active: ["edit", "delete", "archive", "mark_sold"],
  reserved: ["edit", "archive", "mark_sold"],
  paused: ["edit", "delete", "publish", "archive"],
  archived: ["edit", "delete", "publish"],
  expired: ["edit", "delete", "publish", "archive"],
  sold: ["archive"],
  removed: [],
};

export class ListingPermissionError extends Error {
  readonly status: 401 | 403 | 404 | 409 | 422;

  constructor(message: string, status: ListingPermissionError["status"] = 403) {
    super(message);
    this.name = "ListingPermissionError";
    this.status = status;
  }
}

export async function getListingForPermission(supabase: Db, listingId: string) {
  const { data, error } = await supabase
    .from("listings")
    .select("id,seller_id,title,description,status,price_amount,quantity,category_id,location_city,location_region,pickup_available,ships_to,deleted_at,listing_images(id,status)")
    .eq("id", listingId)
    .maybeSingle();

  if (error) throw error;
  return data as ListingPermissionRecord | null;
}

export function assertListingOwner(listing: ListingPermissionRecord | null, userId: string): asserts listing is ListingPermissionRecord {
  if (!listing || listing.deleted_at) {
    throw new ListingPermissionError("Listing not found.", 404);
  }

  if (listing.seller_id !== userId) {
    throw new ListingPermissionError("You do not have permission to manage this listing.", 403);
  }
}

export function assertListingLifecyclePermission(
  listing: ListingPermissionRecord | null,
  userId: string,
  action: ListingLifecycleAction,
) {
  assertListingOwner(listing, userId);

  const allowedActions = allowedActionsByStatus[listing.status] ?? [];
  if (!allowedActions.includes(action)) {
    throw new ListingPermissionError(`Cannot ${action.replace("_", " ")} a listing with status "${listing.status}".`, 409);
  }

  if (action === "publish") {
    assertListingPublishReady(listing);
  }
}

export function assertListingPublishReady(listing: ListingPermissionRecord) {
  const failures: string[] = [];
  const price = Number(listing.price_amount);
  const hasReadyImage = (listing.listing_images ?? []).some((image) => image.status === "ready");
  const hasFulfillment = Boolean(listing.pickup_available) || Boolean(listing.ships_to?.length);

  if (!listing.title || listing.title.trim().length < 3) failures.push("title");
  if (!listing.description || listing.description.trim().length < 20) failures.push("description");
  if (!listing.category_id) failures.push("category");
  if (!Number.isFinite(price) || price <= 0) failures.push("price");
  if (!listing.quantity || listing.quantity < 1) failures.push("quantity");
  if (!listing.location_city || !listing.location_region) failures.push("location");
  if (!hasFulfillment) failures.push("fulfillment");
  if (!hasReadyImage) failures.push("at least one ready photo");

  if (failures.length) {
    throw new ListingPermissionError(`Listing is not ready to publish. Missing: ${failures.join(", ")}.`, 422);
  }
}
