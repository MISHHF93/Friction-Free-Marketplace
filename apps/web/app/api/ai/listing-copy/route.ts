import { NextResponse } from "next/server";
import { z } from "zod";
import { getOpenAI } from "@/lib/openai/client";

const listingCopyRequestSchema = z.object({
  title: z.string().min(3),
  condition: z.string().min(2),
  notes: z.string().min(10).max(1200)
});

export async function POST(request: Request) {
  const payload = listingCopyRequestSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

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

  return NextResponse.json({ copy: completion.choices[0]?.message.content ?? "" });
}
