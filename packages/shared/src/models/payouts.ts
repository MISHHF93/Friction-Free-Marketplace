import { z } from "zod";
import { BaseEntitySchema, EntityIdSchema, IsoDateTimeSchema, PositiveMoneySchema } from "./common";

export const PayoutStatusSchema = z.enum(["pending", "in_transit", "paid", "failed", "cancelled"]);
export type PayoutStatus = z.infer<typeof PayoutStatusSchema>;

export const PayoutFailureCodeSchema = z.enum(["account_closed", "insufficient_funds", "invalid_account", "risk_review", "unknown"]);
export type PayoutFailureCode = z.infer<typeof PayoutFailureCodeSchema>;

export const PayoutBreakdownSchema = z.object({
  grossSales: PositiveMoneySchema,
  refunds: PositiveMoneySchema,
  disputes: PositiveMoneySchema,
  platformFees: PositiveMoneySchema,
  processingFees: PositiveMoneySchema,
  netPayout: PositiveMoneySchema,
});
export interface PayoutBreakdown extends z.infer<typeof PayoutBreakdownSchema> {}

export const PayoutSchema = BaseEntitySchema.extend({
  sellerId: EntityIdSchema,
  stripeAccountId: z.string().trim().min(1).max(255),
  stripePayoutId: z.string().trim().min(1).max(255).nullable(),
  status: PayoutStatusSchema,
  breakdown: PayoutBreakdownSchema,
  transactionIds: z.array(EntityIdSchema),
  periodStart: IsoDateTimeSchema,
  periodEnd: IsoDateTimeSchema,
  expectedArrivalAt: IsoDateTimeSchema.nullable(),
  paidAt: IsoDateTimeSchema.nullable(),
  failureCode: PayoutFailureCodeSchema.nullable(),
  failureMessage: z.string().trim().max(500).nullable(),
});
export interface Payout extends z.infer<typeof PayoutSchema> {}

export const CreatePayoutDtoSchema = z.object({
  sellerId: EntityIdSchema,
  transactionIds: z.array(EntityIdSchema).min(1),
  periodStart: IsoDateTimeSchema,
  periodEnd: IsoDateTimeSchema,
});
export interface CreatePayoutDto extends z.infer<typeof CreatePayoutDtoSchema> {}

export const PayoutDtoSchema = PayoutSchema;
export interface PayoutDto extends z.infer<typeof PayoutDtoSchema> {}
