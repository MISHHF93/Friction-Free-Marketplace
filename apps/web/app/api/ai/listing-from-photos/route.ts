import { NextResponse } from "next/server";
import { z } from "zod";
import { getOpenAI } from "@/lib/openai/client";
import { aiListingResponseSchema, LISTING_CATEGORIES, LISTING_CONDITIONS } from "@/lib/listings/validation";

const requestSchema = z.object({
  imageUrls: z.array(z.string().url()).min(1).max(12),
  sellerNotes: z.string().max(1200).optional(),
  location: z.string().max(120).optional()
});

export async function POST(request: Request) {
  try {
    const payload = requestSchema.parse(await request.json());
    const openai = getOpenAI();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a trust-and-safety marketplace listing assistant. Return strict JSON with keys title, description, category, condition, priceRange, seoTags, fraudRiskScore, rationale. Category must be one of: ${LISTING_CATEGORIES.join(", ")}. Condition must be one of: ${LISTING_CONDITIONS.join(", ")}. Price in USD. Be conservative: do not invent brand, model, authenticity, serial, warranty, or specs unless visible or provided. Fraud risk score is 0-100 where 100 is highest risk.`
        },
        {
          role: "user",
          content: [
            { type: "text", text: `Generate a listing draft from these photos. Seller notes: ${payload.sellerNotes || "none"}. Location hint: ${payload.location || "unknown"}.` },
            ...payload.imageUrls.map((url) => ({ type: "image_url" as const, image_url: { url } }))
          ]
        }
      ]
    });

    const raw = completion.choices[0]?.message.content || "{}";
    const parsed = aiListingResponseSchema.parse(JSON.parse(raw));
    return NextResponse.json({ suggestion: parsed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate a listing from photos.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
