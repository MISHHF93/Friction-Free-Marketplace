import { z } from "zod";
import { BaseEntitySchema, EntityIdSchema, IsoDateTimeSchema, JsonValueSchema } from "./common";

export const TrustSubjectTypeSchema = z.enum(["user", "buyer", "seller", "listing", "transaction"]);
export type TrustSubjectType = z.infer<typeof TrustSubjectTypeSchema>;

export const TrustLevelSchema = z.enum(["low", "medium", "high", "restricted"]);
export type TrustLevel = z.infer<typeof TrustLevelSchema>;

export const TrustScoreComponentSchema = z.object({
  identityVerification: z.number().min(0).max(100),
  transactionHistory: z.number().min(0).max(100),
  disputeRate: z.number().min(0).max(100),
  responsiveness: z.number().min(0).max(100),
  policyCompliance: z.number().min(0).max(100),
  aiRisk: z.number().min(0).max(100),
});
export interface TrustScoreComponent extends z.infer<typeof TrustScoreComponentSchema> {}

export const TrustScoreSchema = BaseEntitySchema.extend({
  subjectType: TrustSubjectTypeSchema,
  subjectId: EntityIdSchema,
  score: z.number().min(0).max(100),
  level: TrustLevelSchema,
  components: TrustScoreComponentSchema,
  reasons: z.array(z.string().trim().min(1).max(180)).max(20),
  reviewedBy: EntityIdSchema.nullable(),
  reviewedAt: IsoDateTimeSchema.nullable(),
  expiresAt: IsoDateTimeSchema.nullable(),
});
export interface TrustScore extends z.infer<typeof TrustScoreSchema> {}

export const TrustSignalSchema = BaseEntitySchema.extend({
  subjectType: TrustSubjectTypeSchema,
  subjectId: EntityIdSchema,
  signalType: z.string().trim().min(1).max(80),
  weight: z.number().min(-100).max(100),
  evidence: z.record(JsonValueSchema).default({}),
  observedAt: IsoDateTimeSchema,
});
export interface TrustSignal extends z.infer<typeof TrustSignalSchema> {}

export const UpsertTrustScoreDtoSchema = z.object({
  subjectType: TrustSubjectTypeSchema,
  subjectId: EntityIdSchema,
  score: z.number().min(0).max(100),
  level: TrustLevelSchema,
  components: TrustScoreComponentSchema,
  reasons: z.array(z.string().trim().min(1).max(180)).max(20).default([]),
  expiresAt: IsoDateTimeSchema.nullable().optional(),
});
export interface UpsertTrustScoreDto extends z.infer<typeof UpsertTrustScoreDtoSchema> {}

export const TrustScoreDtoSchema = TrustScoreSchema;
export interface TrustScoreDto extends z.infer<typeof TrustScoreDtoSchema> {}
