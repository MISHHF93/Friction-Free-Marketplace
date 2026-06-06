export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createListing } from "@/lib/listings/persistence";

function errorResponse(error: unknown, status = 500) {
  const message = error instanceof Error ? error.message : "Unable to process listing request.";
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in to view your listings." }, { status: 401 });

    const { data, error } = await supabase
      .from("listings")
      .select("*, listing_images(*)")
      .eq("seller_id", user.id)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ listings: data ?? [] });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in to create a listing." }, { status: 401 });

    const listing = await createListing(supabase, user.id, await request.json());
    return NextResponse.json({ listing }, { status: 201 });
  } catch (error) {
    return errorResponse(error, 400);
  }
}
