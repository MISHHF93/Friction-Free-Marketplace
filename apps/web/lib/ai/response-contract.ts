import { z } from "zod";

export const AI_RESPONSE_CONTRACT_VERSION = "1.0";
export const AI_PROMPT_VERSION = "marketplace-copilot-2026-07-28";

const listingSummarySchema = z.object({
  id: z.string().min(1).max(120),
  title: z.string().min(1).max(240),
  price: z.number().finite(),
  currency: z.string().min(3).max(8),
  condition: z.string().max(80).nullable().optional(),
  category: z.string().max(120).nullable().optional(),
  location: z.string().max(160).nullable().optional(),
  seller: z.string().max(160).nullable().optional(),
  sellerTrustScore: z.number().finite().nullable().optional(),
  sellerRiskLevel: z.string().max(80).nullable().optional(),
  fulfillmentModes: z.array(z.string().max(80)).max(8).optional(),
  safetyScore: z.number().finite().nullable().optional(),
  valueScore: z.number().finite().nullable().optional(),
});

export const assistantBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string().min(1).max(8000) }),
  z.object({
    type: z.literal("listing_collection"),
    title: z.string().max(160),
    listings: z.array(listingSummarySchema).max(8),
  }),
  z.object({
    type: z.literal("listing_comparison"),
    title: z.string().max(160),
    listings: z.array(listingSummarySchema).min(2).max(6),
  }),
  z.object({
    type: z.literal("price_estimate"),
    currency: z.string().min(3).max(8),
    minimum: z.number().finite().nullable(),
    maximum: z.number().finite().nullable(),
    comparableCount: z.number().int().min(0).max(1000),
    caveat: z.string().max(500),
  }),
  z.object({
    type: z.literal("safety_notice"),
    severity: z.enum(["info", "warning", "critical"]),
    title: z.string().max(160),
    detail: z.string().max(1000),
  }),
  z.object({
    type: z.literal("navigation_action"),
    label: z.string().max(100),
    href: z.string().startsWith("/").max(500),
  }),
  z.object({
    type: z.literal("draft_action"),
    action: z.enum(["save_search", "update_listing_draft", "draft_message"]),
    label: z.string().max(120),
    requiresConfirmation: z.literal(true),
  }),
  z.object({
    type: z.literal("human_escalation"),
    title: z.string().max(160),
    reason: z.string().max(1000),
    href: z.string().startsWith("/").max(500),
  }),
]);

export const modelResponseSchema = z.object({
  answer: z.string().min(1).max(8000),
  recommendedActions: z.array(z.string().max(500)).max(8).default([]),
  toolPlan: z.array(z.object({
    tool: z.string().max(120),
    reason: z.string().max(500),
    arguments: z.record(z.unknown()).optional(),
  })).max(6).default([]),
  safetyFlags: z.array(z.string().max(500)).max(12).default([]),
  memoryUpdates: z.array(z.string().max(500)).max(8).default([]),
  auditSummary: z.string().max(1200).default("No audit summary supplied."),
  blocks: z.array(assistantBlockSchema).max(12).optional(),
});

export type AssistantBlock = z.infer<typeof assistantBlockSchema>;

export function parseModelResponse(value: unknown) {
  const parsed = modelResponseSchema.safeParse(value);
  if (parsed.success) return parsed.data;

  return {
    answer: "I could not safely structure that response. Please try asking in a different way.",
    recommendedActions: ["Try again with a more specific marketplace question"],
    toolPlan: [],
    safetyFlags: ["invalid_model_response"],
    memoryUpdates: [],
    auditSummary: "Model output failed the versioned response contract.",
    blocks: [{ type: "text" as const, text: "I could not safely structure that response. Please try asking in a different way." }],
  };
}
