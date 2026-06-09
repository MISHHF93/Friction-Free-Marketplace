import { z } from "zod";
import { BaseEntitySchema, EntityIdSchema, IsoDateTimeSchema, PositiveMoneySchema, UrlSchema } from "./common";

export const DisputeStatusSchema = z.enum([
  "opened",
  "awaiting_buyer",
  "awaiting_seller",
  "under_review",
  "escalated",
  "resolved",
  "closed",
]);
export type DisputeStatus = z.infer<typeof DisputeStatusSchema>;

export const DisputeReasonSchema = z.enum(["item_not_received", "not_as_described", "damaged", "unauthorized_payment", "seller_issue", "other"]);
export type DisputeReason = z.infer<typeof DisputeReasonSchema>;

export const DisputeResolutionSchema = z.enum(["refund_buyer", "release_to_seller", "partial_refund", "replacement", "no_action"]);
export type DisputeResolution = z.infer<typeof DisputeResolutionSchema>;

export const DisputeEvidenceSchema = z.object({
  id: EntityIdSchema,
  submittedBy: EntityIdSchema,
  note: z.string().trim().max(2_000).nullable(),
  attachmentUrls: z.array(UrlSchema).max(10),
  submittedAt: IsoDateTimeSchema,
});
export interface DisputeEvidence extends z.infer<typeof DisputeEvidenceSchema> {}

export const DisputeSchema = BaseEntitySchema.extend({
  transactionId: EntityIdSchema,
  buyerId: EntityIdSchema,
  sellerId: EntityIdSchema,
  status: DisputeStatusSchema,
  reason: DisputeReasonSchema,
  description: z.string().trim().min(10).max(5_000),
  disputedAmount: PositiveMoneySchema,
  evidence: z.array(DisputeEvidenceSchema).max(50),
  assignedTo: EntityIdSchema.nullable(),
  resolution: DisputeResolutionSchema.nullable(),
  resolutionNote: z.string().trim().max(2_000).nullable(),
  resolvedAt: IsoDateTimeSchema.nullable(),
});
export interface Dispute extends z.infer<typeof DisputeSchema> {}

export const CreateDisputeDtoSchema = z.object({
  transactionId: EntityIdSchema,
  reason: DisputeReasonSchema,
  description: DisputeSchema.shape.description,
  disputedAmount: PositiveMoneySchema,
  evidence: z.array(DisputeEvidenceSchema).max(20).default([]),
});
export interface CreateDisputeDto extends z.infer<typeof CreateDisputeDtoSchema> {}

export const UpdateDisputeDtoSchema = z.object({
  status: DisputeStatusSchema.optional(),
  assignedTo: EntityIdSchema.nullable().optional(),
  resolution: DisputeResolutionSchema.nullable().optional(),
  resolutionNote: z.string().trim().max(2_000).nullable().optional(),
});
export interface UpdateDisputeDto extends z.infer<typeof UpdateDisputeDtoSchema> {}

export const DisputeDtoSchema = DisputeSchema;
export interface DisputeDto extends z.infer<typeof DisputeDtoSchema> {}
