import { NextResponse } from "next/server";
import { z } from "zod";
import { getOpenAI } from "@/lib/openai/client";
import { consumeRateLimit, rateLimitHeaders } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";

const listingCopyRequestSchema = z.object({
  title: z.string().min(3),
  condition: z.string().min(2),
  notes: z.string().min(10).max(1200)
});

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Sign in to generate AI listing copy." }, { status: 401 });
  const rateLimit = consumeRateLimit(`ai-listing-copy:${user.id}`, { limit: 12, windowMs: 60_000 });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "AI copy generation is temporarily rate limited. Try again shortly." },
      { status: 429, headers: rateLimitHeaders(rateLimit) },
    );
  }

  const payload = listingCopyRequestSchema.safeParse(await request.json().catch(() => null));

  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  try {
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Create concise, accurate, trust-first marketplace listing copy. Do not invent specs or guarantees."
        },
        {
          role: "user",
          content: `Title: ${payload.data.title}\nCondition: ${payload.data.condition}\nSeller notes: ${payload.data.notes}`
        }
      ]
    });

    return NextResponse.json(
      { copy: completion.choices[0]?.message.content ?? "" },
      { headers: rateLimitHeaders(rateLimit) },
    );
  } catch (generationError) {
    console.error("AI listing copy generation failed", generationError);
    return NextResponse.json(
      { error: "Unable to generate listing copy right now." },
      { status: 500, headers: rateLimitHeaders(rateLimit) },
    );
  }
}
