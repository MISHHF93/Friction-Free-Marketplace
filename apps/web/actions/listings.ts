"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createListing, updateListing } from "@/lib/listings/persistence";
import { captureServerEvent } from "@/lib/analytics/posthog";

async function requireAuthUser() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("You must be signed in to manage listings.");
  return { supabase, user: data.user };
}

export async function createListingAction(input: unknown) {
  const { supabase, user } = await requireAuthUser();
  const listing = await createListing(supabase as any, user.id, input);
  await captureServerEvent({ distinctId: user.id, event: "listing_created", properties: { listing_id: listing.id, status: listing.status } });
  revalidatePath("/dashboard/listings");
  revalidatePath("/browse");
  return listing;
}

export async function updateListingAction(listingId: string, input: unknown) {
  const { supabase, user } = await requireAuthUser();
  const listing = await updateListing(supabase as any, listingId, input);
  await captureServerEvent({ distinctId: user.id, event: "listing_updated", properties: { listing_id: listing.id, status: listing.status } });
  revalidatePath("/dashboard/listings");
  revalidatePath(`/listings/${listingId}`);
  return listing;
}
