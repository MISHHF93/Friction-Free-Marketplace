import { z } from "zod";
import { BaseEntitySchema, EntityIdSchema, IsoDateTimeSchema, JsonValueSchema, PositiveMoneySchema } from "./common";

export const LedgerAccountTypeSchema = z.enum(["platform_cash", "seller_payable", "buyer_receivable", "revenue", "fee_expense", "refund_reserve"]);
export type LedgerAccountType = z.infer<typeof LedgerAccountTypeSchema>;

export const LedgerEntryDirectionSchema = z.enum(["debit", "credit"]);
export type LedgerEntryDirection = z.infer<typeof LedgerEntryDirectionSchema>;

export const LedgerSourceTypeSchema = z.enum(["transaction", "payout", "refund", "dispute", "manual_adjustment", "stripe_event"]);
export type LedgerSourceType = z.infer<typeof LedgerSourceTypeSchema>;

export const LedgerAccountSchema = BaseEntitySchema.extend({
  ownerId: EntityIdSchema.nullable(),
  type: LedgerAccountTypeSchema,
  currency: PositiveMoneySchema.shape.currency,
  name: z.string().trim().min(1).max(120),
  isActive: z.boolean(),
});
export interface LedgerAccount extends z.infer<typeof LedgerAccountSchema> {}

export const LedgerEntrySchema = BaseEntitySchema.extend({
  ledgerTransactionId: EntityIdSchema,
  accountId: EntityIdSchema,
  direction: LedgerEntryDirectionSchema,
  amount: PositiveMoneySchema,
  sourceType: LedgerSourceTypeSchema,
  sourceId: EntityIdSchema,
  metadata: z.record(JsonValueSchema).default({}),
  postedAt: IsoDateTimeSchema,
});
export interface LedgerEntry extends z.infer<typeof LedgerEntrySchema> {}

export const LedgerTransactionSchema = BaseEntitySchema.extend({
  sourceType: LedgerSourceTypeSchema,
  sourceId: EntityIdSchema,
  description: z.string().trim().min(1).max(240),
  entries: z.array(LedgerEntrySchema).min(2),
  postedAt: IsoDateTimeSchema,
  voidedAt: IsoDateTimeSchema.nullable(),
});
export interface LedgerTransaction extends z.infer<typeof LedgerTransactionSchema> {}

export const CreateLedgerTransactionDtoSchema = z.object({
  sourceType: LedgerSourceTypeSchema,
  sourceId: EntityIdSchema,
  description: z.string().trim().min(1).max(240),
  entries: z
    .array(
      z.object({
        accountId: EntityIdSchema,
        direction: LedgerEntryDirectionSchema,
        amount: PositiveMoneySchema,
        metadata: z.record(JsonValueSchema).optional(),
      }),
    )
    .min(2),
});
export interface CreateLedgerTransactionDto extends z.infer<typeof CreateLedgerTransactionDtoSchema> {}

export const LedgerBalanceDtoSchema = z.object({
  accountId: EntityIdSchema,
  balance: PositiveMoneySchema,
  calculatedAt: IsoDateTimeSchema,
});
export interface LedgerBalanceDto extends z.infer<typeof LedgerBalanceDtoSchema> {}
