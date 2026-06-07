import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { completeAgentTask, createAgentTask, recordAgentAuditEvent } from "@/lib/ai/audit";
import { getOpenAI } from "@/lib/openai/client";
import { captureServerEvent } from "@/lib/analytics/posthog";
import { LISTING_CATEGORIES, LISTING_CONDITIONS } from "@/lib/listings/validation";

export const aiListingGenerationRequestSchema = z.object({
  imageUrls: z.array(z.string().url()).min(1, "Upload at least one listing photo.").max(12, "Upload up to 12 photos."),
  sellerNotes: z.string().trim().max(1200, "Notes must be 1,200 characters or fewer.").optional(),
  location: z.string().trim().max(120, "Location must be 120 characters or fewer.").optional()
});

export const aiListingGenerationSchema = z.object({
  title: z.string().min(3).max(160),
  description: z.string().min(20).max(5000),
  category: z.enum(LISTING_CATEGORIES),
  categoryRationale: z.string().min(8).max(500),
  condition: z.enum(LISTING_CONDITIONS),
  conditionConfidence: z.number().min(0).max(1),
  conditionEvidence: z.array(z.string().min(2).max(180)).max(6),
  priceRange: z.object({
    min: z.number().min(0),
    max: z.number().min(0),
    currency: z.string().length(3),
    confidence: z.number().min(0).max(1),
    rationale: z.string().min(8).max(700)
  }),
  seoTags: z.array(z.string().min(2).max(40)).min(3).max(12),
  scamRiskWarning: z.object({
    needed: z.boolean(),
    riskScore: z.number().min(0).max(100),
    warning: z.string().max(700),
    riskFactors: z.array(z.string().min(2).max(180)).max(8)
  }),
  missingInformationQuestions: z.array(z.string().min(8).max(180)).max(8),
  rationale: z.string().min(12).max(1200)
});

export type AiListingGenerationRequest = z.infer<typeof aiListingGenerationRequestSchema>;
export type AiListingGeneration = z.infer<typeof aiListingGenerationSchema>;

export const AI_LISTING_GENERATION_MODEL = "gpt-4o-mini";

export function buildAiListingPrompt(input: AiListingGenerationRequest) {
  return {
    system: [
      "You are a trust-and-safety marketplace listing generation assistant.",
      "Generate an accurate seller draft from the images and optional seller notes.",
      `Category must be one of: ${LISTING_CATEGORIES.join(", ")}.`,
      `Condition must be one of: ${LISTING_CONDITIONS.join(", ")}.`,
      "Be conservative. Do not invent brand, model, authenticity, serial number, warranty, specs, accessories, dimensions, defects, provenance, or compatibility unless visible in images or explicitly provided in notes.",
      "Estimate a fair USD price range using visible condition, likely product class, and uncertainty. The priceRange.max value must be greater than or equal to priceRange.min. If the item is not identifiable, use a broad low-confidence range and ask clarifying questions.",
      "Add a scam-risk warning when the listing appears high-value, regulated, counterfeit-prone, payment/logistics risky, missing proof of authenticity, or otherwise suspicious. The warning field must be an empty string when not needed.",
      "Ask concise missing-information questions that would improve buyer trust or pricing accuracy.",
      "Write clean SEO tags without hashtags, duplicates, or unsafe claims."
    ].join("\n"),
    userText: [
      "Create a marketplace listing draft from these listing photos.",
      `Seller notes: ${input.sellerNotes?.trim() || "None provided."}`,
      `Location hint: ${input.location?.trim() || "Unknown."}`,
      "Return only fields that match the provided schema."
    ].join("\n")
  };
}

function summarizeInput(input: AiListingGenerationRequest) {
  return {
    imageCount: input.imageUrls.length,
    hasSellerNotes: Boolean(input.sellerNotes?.trim()),
    sellerNotesLength: input.sellerNotes?.length ?? 0,
    location: input.location || null
  };
}

function summarizeOutput(output: AiListingGeneration) {
  return {
    title: output.title,
    category: output.category,
    condition: output.condition,
    priceMin: output.priceRange.min,
    priceMax: output.priceRange.max,
    riskScore: output.scamRiskWarning.riskScore,
    warningNeeded: output.scamRiskWarning.needed,
    missingQuestionCount: output.missingInformationQuestions.length,
    seoTagCount: output.seoTags.length
  };
}

export async function generateAiListing(input: unknown, actorId?: string | null) {
  const startedAt = Date.now();
  const payload = aiListingGenerationRequestSchema.parse(input);
  const inputSummary = summarizeInput(payload);
  const taskId = await createAgentTask({ agent: "listing_creation", actorId, input: inputSummary });

  await recordAgentAuditEvent({
    agent: "listing_creation",
    actorId,
    taskId,
    action: "ai.listing_generation.started",
    status: "running",
    inputSummary
  });

  try {
    const openai = getOpenAI();
    const prompt = buildAiListingPrompt(payload);
    const completion = await openai.beta.chat.completions.parse({
      model: AI_LISTING_GENERATION_MODEL,
      temperature: 0.2,
      response_format: zodResponseFormat(aiListingGenerationSchema, "marketplace_listing_generation"),
      messages: [
        { role: "system", content: prompt.system },
        {
          role: "user",
          content: [
            { type: "text", text: prompt.userText },
            ...payload.imageUrls.map((url) => ({ type: "image_url" as const, image_url: { url, detail: "auto" as const } }))
          ]
        }
      ]
    });

    const parsedSuggestion = completion.choices[0]?.message.parsed;
    if (!parsedSuggestion) throw new Error("The AI did not return a valid listing draft.");
    const suggestion = parsedSuggestion.priceRange.max >= parsedSuggestion.priceRange.min
      ? parsedSuggestion
      : { ...parsedSuggestion, priceRange: { ...parsedSuggestion.priceRange, min: parsedSuggestion.priceRange.max, max: parsedSuggestion.priceRange.min } };

    const latencyMs = Date.now() - startedAt;
    const outputSummary = summarizeOutput(suggestion);
    const tokenUsage = completion.usage ? {
      prompt_tokens: completion.usage.prompt_tokens,
      completion_tokens: completion.usage.completion_tokens,
      total_tokens: completion.usage.total_tokens,
      model: AI_LISTING_GENERATION_MODEL
    } : { model: AI_LISTING_GENERATION_MODEL };

    await completeAgentTask({ taskId, output: outputSummary });
    await recordAgentAuditEvent({
      agent: "listing_creation",
      actorId,
      taskId,
      action: "ai.listing_generation.completed",
      status: "succeeded",
      latencyMs,
      inputSummary,
      outputSummary,
      safetyFlags: suggestion.scamRiskWarning.needed ? suggestion.scamRiskWarning.riskFactors : [],
      tokenUsage
    });
    if (actorId) {
      await captureServerEvent({
        distinctId: actorId,
        event: "ai_listing_generated",
        properties: { ...outputSummary, latency_ms: latencyMs, model: AI_LISTING_GENERATION_MODEL, token_usage: tokenUsage }
      }).catch(() => null);
    }

    return { suggestion, taskId, usage: tokenUsage, latencyMs };
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    const errorMessage = error instanceof Error ? error.message : "Unable to generate an AI listing.";
    await completeAgentTask({ taskId, errorMessage });
    await recordAgentAuditEvent({
      agent: "listing_creation",
      actorId,
      taskId,
      action: "ai.listing_generation.failed",
      status: "failed",
      latencyMs,
      inputSummary,
      errorMessage
    });
    throw error;
  }
}
