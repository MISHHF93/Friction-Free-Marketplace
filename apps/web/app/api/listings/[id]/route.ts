export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deleteListing, updateListing } from "@/lib/listings/persistence";

function errorResponse(error: unknown, status = 500) {
  const message = error instanceof Error ? error.message : "Unable to process listing request.";
  const resolvedStatus = typeof error === "object" && error && "status" in error && typeof error.status === "number" ? error.status : status;
  return NextResponse.json({ error: message }, { status: resolvedStatus });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: listingId } = await params;
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in to view this listing." }, { status: 401 });

    const { data, error } = await supabase
      .from("listings")
      .select("*, listing_images(*)")
      .eq("id", listingId)
      .eq("seller_id", user.id)
      .is("deleted_at", null)
      .single();

    if (error) throw error;
    return NextResponse.json({ listing: data });
  } catch (error) {
    return errorResponse(error, 404);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: listingId } = await params;
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in to edit this listing." }, { status: 401 });

    const { data: owned, error: ownerError } = await supabase.from("listings").select("id").eq("id", listingId).eq("seller_id", user.id).single();
    if (ownerError || !owned) return NextResponse.json({ error: "Listing not found." }, { status: 404 });

    const listing = await updateListing(supabase, listingId, await request.json(), user.id);
    return NextResponse.json({ listing });
  } catch (error) {
    return errorResponse(error, 400);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: listingId } = await params;
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in to delete this listing." }, { status: 401 });

    await deleteListing(supabase, listingId, user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, 400);
  }
}
