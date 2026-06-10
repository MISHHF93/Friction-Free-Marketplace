import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { completeAgentTask, createAgentTask, recordAgentAuditEvent } from "@/lib/ai/audit";
import { getOpenAI } from "@/lib/openai/client";
import { captureServerEvent } from "@/lib/analytics/posthog";
import { LISTING_CATEGORIES, LISTING_CONDITIONS } from "@/lib/listings/validation";

const imageUrlSchema = z.string().url().refine((url) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}, "Image URLs must be public HTTP or HTTPS URLs.");

const aiListingImageInputSchema = z.object({
  url: imageUrlSchema,
  altText: z.string().trim().max(160).optional(),
  sortOrder: z.number().int().min(0).max(50).optional()
});

export const aiListingGenerationRequestSchema = z.object({
  images: z.array(aiListingImageInputSchema).max(12, "Upload up to 12 photos.").optional(),
  imageUrls: z.array(imageUrlSchema).max(12, "Upload up to 12 photos.").optional(),
  title: z.string().trim().min(3).max(160).optional(),
  titleHint: z.string().trim().min(3).max(160).optional(),
  notes: z.string().trim().max(1200, "Notes must be 1,200 characters or fewer.").optional(),
  sellerNotes: z.string().trim().max(1200, "Notes must be 1,200 characters or fewer.").optional(),
  location: z.string().trim().max(120, "Location must be 120 characters or fewer.").optional()
}).superRefine((value, ctx) => {
  const imageCount = (value.images?.length ?? 0) + (value.imageUrls?.length ?? 0);
  if (imageCount === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Upload at least one listing photo.",
      path: ["images"]
    });
  }
  if (imageCount > 12) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Upload up to 12 photos.",
      path: ["images"]
    });
  }
});

export const aiListingFraudIndicatorSchema = z.object({
  type: z.enum(["identity", "payment", "shipping", "authenticity", "prohibited_item", "price_anomaly", "image_mismatch", "missing_information", "other"]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  evidence: z.string().min(4).max(240),
  recommendation: z.string().min(4).max(240)
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
  fraudIndicators: z.object({
    riskScore: z.number().min(0).max(100),
    riskLevel: z.enum(["low", "medium", "high", "critical"]),
    reviewRequired: z.boolean(),
    indicators: z.array(aiListingFraudIndicatorSchema).max(8),
    buyerWarning: z.string().max(700)
  }),
  missingInformationQuestions: z.array(z.string().min(8).max(180)).max(8),
  rationale: z.string().min(12).max(1200)
});

export type AiListingGenerationRequest = z.infer<typeof aiListingGenerationRequestSchema>;
export type AiListingGeneration = z.infer<typeof aiListingGenerationSchema>;
export type AiListingFraudIndicator = z.infer<typeof aiListingFraudIndicatorSchema>;

type NormalizedAiListingGenerationRequest = {
  images: Array<{ url: string; altText?: string; sortOrder: number }>;
  title?: string;
  notes?: string;
  location?: string;
};

export const AI_LISTING_GENERATION_MODEL = "gpt-4o-mini";
export const AI_LISTING_GENERATION_PROMPT_VERSION = "listing-generation-v2";

export const AI_LISTING_GENERATION_PROMPT_TEMPLATE = {
  role: "You are a trust-and-safety marketplace listing generation assistant.",
  requiredOutputs: [
    "title",
    "description",
    "category suggestion",
    "condition estimate",
    "fair price range",
    "SEO tags",
    "structured fraud indicators",
    "scam-risk warning if needed",
    "missing information questions"
  ],
  guardrails: [
    "Generate an accurate seller draft from the images and optional seller notes.",
    "Be conservative. Do not invent brand, model, authenticity, serial number, warranty, specs, accessories, dimensions, defects, provenance, or compatibility unless visible in images or explicitly provided in notes.",
    "Use the provided title only as seller-supplied context. Improve it when the images and notes justify a clearer title, but do not add unsupported claims.",
    "Estimate a fair USD price range using visible condition, likely product class, and uncertainty. The priceRange.max value must be greater than or equal to priceRange.min. If the item is not identifiable, use a broad low-confidence range and ask clarifying questions.",
    "Always return fraudIndicators. Add indicator entries when the listing appears high-value, regulated, counterfeit-prone, payment/logistics risky, image-inconsistent, unusually priced, missing proof of authenticity, or otherwise suspicious.",
    "Set fraudIndicators.reviewRequired to true for high or critical risk, prohibited or regulated items, possible counterfeits, image/title mismatches, unsafe pickup/payment language, or materially missing information.",
    "Keep scamRiskWarning consistent with fraudIndicators. The warning field must be an empty string when not needed.",
    "Ask concise missing-information questions that would improve buyer trust or pricing accuracy.",
    "Write clean SEO tags without hashtags, duplicates, or unsafe claims."
  ]
} as const;


export function normalizeAiListingGenerationRequest(input: unknown): NormalizedAiListingGenerationRequest {
  const payload = aiListingGenerationRequestSchema.parse(input);
  const images = [
    ...(payload.images ?? []).map((image, index) => ({
      url: image.url,
      altText: image.altText,
      sortOrder: image.sortOrder ?? index
    })),
    ...(payload.imageUrls ?? []).map((url, index) => ({
      url,
      sortOrder: (payload.images?.length ?? 0) + index
    }))
  ]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, 12);

  return {
    images,
    title: payload.title ?? payload.titleHint,
    notes: payload.notes ?? payload.sellerNotes,
    location: payload.location
  };
}

export function buildAiListingPrompt(input: NormalizedAiListingGenerationRequest) {
  return {
    system: [
      AI_LISTING_GENERATION_PROMPT_TEMPLATE.role,
      `Prompt version: ${AI_LISTING_GENERATION_PROMPT_VERSION}.`,
      `Required outputs: ${AI_LISTING_GENERATION_PROMPT_TEMPLATE.requiredOutputs.join(", ")}.`,
      `Category must be one of: ${LISTING_CATEGORIES.join(", ")}.`,
      `Condition must be one of: ${LISTING_CONDITIONS.join(", ")}.`,
      ...AI_LISTING_GENERATION_PROMPT_TEMPLATE.guardrails
    ].join("\n"),
    userText: [
      "Create a marketplace listing draft from these listing photos.",
      `Seller supplied title: ${input.title?.trim() || "None provided."}`,
      `Seller notes: ${input.notes?.trim() || "None provided."}`,
      `Location hint: ${input.location?.trim() || "Unknown."}`,
      `Image notes: ${input.images.map((image, index) => `Image ${index + 1}${image.altText ? ` alt text: ${image.altText}` : ""}`).join("; ") || "No image notes."}`,
      "Return only fields that match the provided schema."
    ].join("\n")
  };
}

function summarizeInput(input: NormalizedAiListingGenerationRequest) {
  return {
    imageCount: input.images.length,
    hasTitle: Boolean(input.title?.trim()),
    titleLength: input.title?.length ?? 0,
    hasSellerNotes: Boolean(input.notes?.trim()),
    sellerNotesLength: input.notes?.length ?? 0,
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
    riskScore: output.fraudIndicators.riskScore,
    riskLevel: output.fraudIndicators.riskLevel,
    reviewRequired: output.fraudIndicators.reviewRequired,
    fraudIndicatorCount: output.fraudIndicators.indicators.length,
    warningNeeded: output.scamRiskWarning.needed || output.fraudIndicators.reviewRequired,
    missingQuestionCount: output.missingInformationQuestions.length,
    seoTagCount: output.seoTags.length
  };
}

function dedupeTags(tags: string[]) {
  const seen = new Set<string>();
  return tags
    .map((tag) => tag.trim().toLowerCase().replace(/^#/, ""))
    .filter((tag) => {
      if (!tag || seen.has(tag)) return false;
      seen.add(tag);
      return true;
    })
    .slice(0, 12);
}

function riskLevelFromScore(score: number): AiListingGeneration["fraudIndicators"]["riskLevel"] {
  if (score >= 85) return "critical";
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function normalizeSuggestion(suggestion: AiListingGeneration): AiListingGeneration {
  const min = Math.min(suggestion.priceRange.min, suggestion.priceRange.max);
  const max = Math.max(suggestion.priceRange.min, suggestion.priceRange.max);
  const riskScore = Math.max(0, Math.min(100, Math.round(suggestion.fraudIndicators.riskScore)));
  const riskFactors = suggestion.fraudIndicators.indicators.map((indicator) => indicator.evidence).slice(0, 8);
  const reviewRequired = suggestion.fraudIndicators.reviewRequired || riskScore >= 70;
  const buyerWarning = suggestion.fraudIndicators.buyerWarning || suggestion.scamRiskWarning.warning;

  return {
    ...suggestion,
    priceRange: {
      ...suggestion.priceRange,
      min,
      max,
      currency: suggestion.priceRange.currency.toUpperCase()
    },
    seoTags: dedupeTags(suggestion.seoTags),
    fraudIndicators: {
      ...suggestion.fraudIndicators,
      riskScore,
      riskLevel: riskLevelFromScore(riskScore),
      reviewRequired,
      buyerWarning
    },
    scamRiskWarning: {
      needed: suggestion.scamRiskWarning.needed || reviewRequired || riskScore >= 40,
      riskScore,
      warning: buyerWarning,
      riskFactors: suggestion.scamRiskWarning.riskFactors.length ? suggestion.scamRiskWarning.riskFactors : riskFactors
    }
  };
}

export async function generateAiListing(input: unknown, actorId?: string | null) {
  const startedAt = Date.now();
  const payload = normalizeAiListingGenerationRequest(input);
  const inputSummary = summarizeInput(payload);
  const taskId = await createAgentTask({ agent: "listing_creation", actorId, input: inputSummary });

  await recordAgentAuditEvent({
    agent: "listing_creation",
    actorId,
    taskId,
    action: "ai.listing_generation.started",
    status: "running",
    inputSummary: {
      ...inputSummary,
      promptVersion: AI_LISTING_GENERATION_PROMPT_VERSION
    }
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
            ...payload.images.map((image) => ({ type: "image_url" as const, image_url: { url: image.url, detail: "auto" as const } }))
          ]
        }
      ]
    });

    const parsedSuggestion = completion.choices[0]?.message.parsed;
    if (!parsedSuggestion) throw new Error("The AI did not return a valid listing draft.");
    const suggestion = normalizeSuggestion(parsedSuggestion);

    const latencyMs = Date.now() - startedAt;
    const outputSummary = summarizeOutput(suggestion);
    const tokenUsage = completion.usage ? {
      prompt_tokens: completion.usage.prompt_tokens,
      completion_tokens: completion.usage.completion_tokens,
      total_tokens: completion.usage.total_tokens,
      model: AI_LISTING_GENERATION_MODEL,
      prompt_version: AI_LISTING_GENERATION_PROMPT_VERSION
    } : { model: AI_LISTING_GENERATION_MODEL, prompt_version: AI_LISTING_GENERATION_PROMPT_VERSION };

    await completeAgentTask({ taskId, output: outputSummary });
    await recordAgentAuditEvent({
      agent: "listing_creation",
      actorId,
      taskId,
      action: "ai.listing_generation.completed",
      status: "succeeded",
      latencyMs,
      inputSummary: {
        ...inputSummary,
        promptVersion: AI_LISTING_GENERATION_PROMPT_VERSION
      },
      outputSummary,
      safetyFlags: suggestion.scamRiskWarning.needed || suggestion.fraudIndicators.reviewRequired
        ? suggestion.scamRiskWarning.riskFactors
        : [],
      toolCalls: [
        {
          tool: "openai.responses.vision_structured_listing_generation",
          model: AI_LISTING_GENERATION_MODEL,
          promptVersion: AI_LISTING_GENERATION_PROMPT_VERSION,
          imageCount: payload.images.length
        }
      ],
      tokenUsage
    });
    if (actorId) {
      await captureServerEvent({
        distinctId: actorId,
        event: "ai_listing_generated",
        properties: { ...outputSummary, latency_ms: latencyMs, model: AI_LISTING_GENERATION_MODEL, token_usage: tokenUsage }
      }).catch(() => null);
    }

    return { suggestion, taskId, usage: tokenUsage, latencyMs, promptVersion: AI_LISTING_GENERATION_PROMPT_VERSION };
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
      inputSummary: {
        ...inputSummary,
        promptVersion: AI_LISTING_GENERATION_PROMPT_VERSION
      },
      errorMessage
    });
    throw error;
  }
}
