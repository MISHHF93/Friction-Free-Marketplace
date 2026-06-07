import { NextResponse } from "next/server";
import { generateAiListing } from "@/lib/ai/listing-generation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    const result = await generateAiListing(await request.json(), data.user?.id ?? null);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate a listing from photos.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
