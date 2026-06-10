export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { setListingStatus } from "@/lib/listings/persistence";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: listingId } = await params;
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in to mark this listing sold." }, { status: 401 });

    const listing = await setListingStatus(supabase, listingId, "sold", user.id);
    return NextResponse.json({ listing });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to mark listing sold.";
    const status = typeof error === "object" && error && "status" in error && typeof error.status === "number" ? error.status : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
