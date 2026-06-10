import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { generateAiListing } from "@/lib/ai/listing-generation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      return NextResponse.json({ error: "Sign in to generate an AI listing draft." }, { status: 401 });
    }
    const result = await generateAiListing(await request.json(), data.user.id);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid AI listing generation request.", issues: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Unable to generate a listing from photos.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
