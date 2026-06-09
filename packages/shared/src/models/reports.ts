import { z } from "zod";
import { BaseEntitySchema, EntityIdSchema, JsonValueSchema, UrlSchema } from "./common";

export const ReportSubjectTypeSchema = z.enum(["user", "profile", "listing", "message", "transaction", "ai_output"]);
export type ReportSubjectType = z.infer<typeof ReportSubjectTypeSchema>;

export const ReportReasonSchema = z.enum(["fraud", "counterfeit", "prohibited_item", "harassment", "spam", "unsafe_ai_output", "other"]);
export type ReportReason = z.infer<typeof ReportReasonSchema>;

export const ReportStatusSchema = z.enum(["open", "triaged", "investigating", "action_taken", "dismissed", "closed"]);
export type ReportStatus = z.infer<typeof ReportStatusSchema>;

export const ReportPrioritySchema = z.enum(["low", "medium", "high", "urgent"]);
export type ReportPriority = z.infer<typeof ReportPrioritySchema>;

export const ReportEvidenceSchema = z.object({
  id: EntityIdSchema,
  label: z.string().trim().min(1).max(120),
  url: UrlSchema.nullable().optional(),
  metadata: z.record(JsonValueSchema).default({}),
});
export interface ReportEvidence extends z.infer<typeof ReportEvidenceSchema> {}

export const ReportSchema = BaseEntitySchema.extend({
  reporterId: EntityIdSchema.nullable(),
  subjectType: ReportSubjectTypeSchema,
  subjectId: EntityIdSchema,
  reason: ReportReasonSchema,
  status: ReportStatusSchema,
  priority: ReportPrioritySchema,
  description: z.string().trim().min(10).max(5_000),
  evidence: z.array(ReportEvidenceSchema).max(20),
  assignedTo: EntityIdSchema.nullable(),
  resolution: z.string().trim().max(2_000).nullable(),
});
export interface Report extends z.infer<typeof ReportSchema> {}

export const CreateReportDtoSchema = z.object({
  subjectType: ReportSubjectTypeSchema,
  subjectId: EntityIdSchema,
  reason: ReportReasonSchema,
  description: ReportSchema.shape.description,
  evidence: z.array(ReportEvidenceSchema).max(20).default([]),
});
export interface CreateReportDto extends z.infer<typeof CreateReportDtoSchema> {}

export const UpdateReportDtoSchema = z.object({
  status: ReportStatusSchema.optional(),
  priority: ReportPrioritySchema.optional(),
  assignedTo: EntityIdSchema.nullable().optional(),
  resolution: z.string().trim().max(2_000).nullable().optional(),
});
export interface UpdateReportDto extends z.infer<typeof UpdateReportDtoSchema> {}

export const ReportDtoSchema = ReportSchema;
export interface ReportDto extends z.infer<typeof ReportDtoSchema> {}
