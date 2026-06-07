"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { captureServerEvent } from "@/lib/analytics/posthog";

export type FavoriteActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const listingIdSchema = z.string().uuid("Choose a valid listing to favorite.");

async function requireAuthUser() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Sign in to manage favorites.");
  return { supabase, user: data.user };
}

function actionError(error: unknown, fallback = "Unable to update favorite.") {
  return { ok: false, error: error instanceof Error ? error.message : fallback } as const;
}

function revalidateFavoriteViews(listingId?: string) {
  revalidatePath("/dashboard/favorites");
  revalidatePath("/browse");
  revalidatePath("/search");
  if (listingId) revalidatePath(`/listings/${listingId}`);
}

export async function favoriteListingAction(listingIdInput: unknown): Promise<FavoriteActionResult<{ listingId: string; favorited: true }>> {
  try {
    const listingId = listingIdSchema.parse(listingIdInput);
    const { supabase, user } = await requireAuthUser();

    const { error } = await (supabase as any).from("favorites").upsert(
      { user_id: user.id, listing_id: listingId },
      { onConflict: "user_id,listing_id", ignoreDuplicates: true }
    );
    if (error) throw error;

    await captureServerEvent({ distinctId: user.id, event: "listing_favorited", properties: { listing_id: listingId } });
    revalidateFavoriteViews(listingId);
    return { ok: true, data: { listingId, favorited: true } };
  } catch (error) {
    return actionError(error, "Unable to favorite listing.");
  }
}

export async function unfavoriteListingAction(listingIdInput: unknown): Promise<FavoriteActionResult<{ listingId: string; favorited: false }>> {
  try {
    const listingId = listingIdSchema.parse(listingIdInput);
    const { supabase, user } = await requireAuthUser();

    const { error } = await (supabase as any).from("favorites").delete().eq("user_id", user.id).eq("listing_id", listingId);
    if (error) throw error;

    await captureServerEvent({ distinctId: user.id, event: "listing_unfavorited", properties: { listing_id: listingId } });
    revalidateFavoriteViews(listingId);
    return { ok: true, data: { listingId, favorited: false } };
  } catch (error) {
    return actionError(error, "Unable to remove favorite.");
  }
}

export async function toggleFavoriteAction(listingIdInput: unknown, nextFavoritedInput?: unknown): Promise<FavoriteActionResult<{ listingId: string; favorited: boolean }>> {
  const listingId = listingIdSchema.safeParse(listingIdInput);
  if (!listingId.success) return { ok: false, error: listingId.error.issues[0]?.message ?? "Choose a valid listing." };

  if (typeof nextFavoritedInput === "boolean") {
    return nextFavoritedInput ? favoriteListingAction(listingId.data) : unfavoriteListingAction(listingId.data);
  }

  try {
    const { supabase, user } = await requireAuthUser();
    const { data, error } = await (supabase as any)
      .from("favorites")
      .select("listing_id")
      .eq("user_id", user.id)
      .eq("listing_id", listingId.data)
      .maybeSingle();
    if (error) throw error;

    return data ? unfavoriteListingAction(listingId.data) : favoriteListingAction(listingId.data);
  } catch (error) {
    return actionError(error, "Unable to update favorite.");
  }
}

export async function toggleFavoriteFormAction(formData: FormData): Promise<void> {
  const listingId = String(formData.get("listingId") ?? "");
  const nextFavorited = String(formData.get("nextFavorited") ?? "true") === "true";
  await toggleFavoriteAction(listingId, nextFavorited);
}
