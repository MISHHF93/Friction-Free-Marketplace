import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in to publish this listing." }, { status: 401 });

    const { data, error } = await supabase
      .from("listings")
      .update({ status: "active", published_at: new Date().toISOString() })
      .eq("id", params.id)
      .eq("seller_id", user.id)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ listing: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to publish listing.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
