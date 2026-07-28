import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { generateAiListing } from "@/lib/ai/listing-generation";
import { consumeRateLimit, rateLimitHeaders } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      return NextResponse.json({ error: "Sign in to generate an AI listing draft." }, { status: 401 });
    }
    const rateLimit = consumeRateLimit(`ai-listing-photos:${data.user.id}`, { limit: 6, windowMs: 60_000 });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "AI photo analysis is temporarily rate limited. Try again shortly." },
        { status: 429, headers: rateLimitHeaders(rateLimit) },
      );
    }
    const result = await generateAiListing(await request.json().catch(() => null), data.user.id);
    return NextResponse.json({ ok: true, ...result }, { headers: rateLimitHeaders(rateLimit) });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid AI listing generation request.", issues: error.issues }, { status: 400 });
    }
    console.error("AI listing photo generation failed", error);
    return NextResponse.json({ error: "Unable to generate a listing from photos right now." }, { status: 500 });
  }
}
