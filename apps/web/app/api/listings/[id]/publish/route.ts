export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { setListingStatus } from "@/lib/listings/persistence";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: listingId } = await params;
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in to publish this listing." }, { status: 401 });

    const { data: owned, error: ownerError } = await supabase.from("listings").select("id").eq("id", listingId).eq("seller_id", user.id).single();
    if (ownerError || !owned) return NextResponse.json({ error: "Listing not found." }, { status: 404 });

    const listing = await setListingStatus(supabase, listingId, "active", user.id);
    return NextResponse.json({ listing });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to publish listing.";
    const status = typeof error === "object" && error && "status" in error && typeof error.status === "number" ? error.status : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
