import { z } from "zod";
import { BaseEntitySchema, EntityIdSchema, IsoDateTimeSchema, JsonValueSchema } from "./common";

export const AiAgentTypeSchema = z.enum([
  "buyer_concierge",
  "seller_copilot",
  "listing_assistant",
  "pricing_advisor",
  "trust_safety_reviewer",
  "support_triage",
  "admin_analyst",
  "search_relevance_optimizer",
]);
export type AiAgentType = z.infer<typeof AiAgentTypeSchema>;

export const AiAgentStatusSchema = z.enum(["active", "inactive", "training", "disabled"]);
export type AiAgentStatus = z.infer<typeof AiAgentStatusSchema>;

export const AiRunStatusSchema = z.enum(["queued", "running", "completed", "failed", "cancelled"]);
export type AiRunStatus = z.infer<typeof AiRunStatusSchema>;

export const AiSafetyDecisionSchema = z.enum(["allow", "review", "block"]);
export type AiSafetyDecision = z.infer<typeof AiSafetyDecisionSchema>;

export const AiAgentCapabilitySchema = z.enum([
  "product_discovery",
  "listing_generation",
  "price_recommendation",
  "fraud_detection",
  "moderation",
  "customer_support",
  "financial_analysis",
  "search_ranking",
]);
export type AiAgentCapability = z.infer<typeof AiAgentCapabilitySchema>;

export const AiModelConfigSchema = z.object({
  provider: z.enum(["openai"]),
  model: z.string().trim().min(1).max(120),
  temperature: z.number().min(0).max(2),
  maxOutputTokens: z.number().int().positive().max(32_000),
});
export interface AiModelConfig extends z.infer<typeof AiModelConfigSchema> {}

export const AiAgentSchema = BaseEntitySchema.extend({
  name: z.string().trim().min(2).max(120),
  type: AiAgentTypeSchema,
  status: AiAgentStatusSchema,
  capabilities: z.array(AiAgentCapabilitySchema).min(1),
  modelConfig: AiModelConfigSchema,
  systemPromptVersion: z.string().trim().min(1).max(80),
  ownerTeam: z.string().trim().min(1).max(80),
});
export interface AiAgent extends z.infer<typeof AiAgentSchema> {}

export const AiToolCallSchema = z.object({
  id: EntityIdSchema,
  name: z.string().trim().min(1).max(120),
  input: z.record(JsonValueSchema),
  output: z.record(JsonValueSchema).nullable(),
  startedAt: IsoDateTimeSchema,
  completedAt: IsoDateTimeSchema.nullable(),
});
export interface AiToolCall extends z.infer<typeof AiToolCallSchema> {}

export const AiUsageSchema = z.object({
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
  estimatedCostMinor: z.number().int().nonnegative(),
  currency: z.string().regex(/^[A-Z]{3}$/),
});
export interface AiUsage extends z.infer<typeof AiUsageSchema> {}

export const AiSafetyReviewSchema = z.object({
  decision: AiSafetyDecisionSchema,
  categories: z.array(z.string().trim().min(1).max(80)).max(20),
  confidence: z.number().min(0).max(1),
  rationale: z.string().trim().max(1_000).nullable(),
});
export interface AiSafetyReview extends z.infer<typeof AiSafetyReviewSchema> {}

export const AiAgentRunSchema = BaseEntitySchema.extend({
  agentId: EntityIdSchema,
  actorId: EntityIdSchema.nullable(),
  subjectType: z.enum(["listing", "conversation", "transaction", "report", "dispute", "search_query", "user"]),
  subjectId: EntityIdSchema.nullable(),
  status: AiRunStatusSchema,
  input: z.record(JsonValueSchema),
  output: z.record(JsonValueSchema).nullable(),
  toolCalls: z.array(AiToolCallSchema),
  safetyReview: AiSafetyReviewSchema.nullable(),
  usage: AiUsageSchema.nullable(),
  errorMessage: z.string().trim().max(1_000).nullable(),
  startedAt: IsoDateTimeSchema,
  completedAt: IsoDateTimeSchema.nullable(),
});
export interface AiAgentRun extends z.infer<typeof AiAgentRunSchema> {}

export const CreateAiAgentRunDtoSchema = z.object({
  agentId: EntityIdSchema,
  subjectType: AiAgentRunSchema.shape.subjectType,
  subjectId: EntityIdSchema.nullable().optional(),
  input: z.record(JsonValueSchema),
});
export interface CreateAiAgentRunDto extends z.infer<typeof CreateAiAgentRunDtoSchema> {}

export const AiAgentDtoSchema = AiAgentSchema;
export interface AiAgentDto extends z.infer<typeof AiAgentDtoSchema> {}

export const AiAgentRunDtoSchema = AiAgentRunSchema;
export interface AiAgentRunDto extends z.infer<typeof AiAgentRunDtoSchema> {}
