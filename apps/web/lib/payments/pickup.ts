export function listingAllowsPickup(listing: { pickup_available?: boolean | null; fulfillment_modes?: string[] | null } | null | undefined) {
  if (!listing) return false;
  if (listing.pickup_available) return true;
  return (listing.fulfillment_modes ?? []).includes("pickup");
}

export function listingAllowsShipping(listing: { ships_to?: unknown; fulfillment_modes?: string[] | null; pickup_available?: boolean | null } | null | undefined) {
  if (!listing) return true;
  const modes = listing.fulfillment_modes ?? [];
  if (modes.includes("shipping") || modes.includes("local_delivery")) return true;
  if (Array.isArray(listing.ships_to) && listing.ships_to.length > 0) return true;
  return !listingAllowsPickup(listing);
}

export function isPickupHandoff(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return false;
  return (metadata as { fulfillment_method?: unknown }).fulfillment_method === "pickup";
}
