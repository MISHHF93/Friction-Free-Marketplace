import { z } from "zod";
import { AddressSchema, BaseEntitySchema, EntityIdSchema, IsoDateTimeSchema, PositiveMoneySchema } from "./common";

export const TransactionStatusSchema = z.enum([
  "pending_payment",
  "authorized",
  "paid",
  "fulfilled",
  "completed",
  "cancelled",
  "refunded",
  "disputed",
]);
export type TransactionStatus = z.infer<typeof TransactionStatusSchema>;

export const FulfillmentStatusSchema = z.enum(["not_started", "processing", "shipped", "delivered", "failed", "returned"]);
export type FulfillmentStatus = z.infer<typeof FulfillmentStatusSchema>;

export const TransactionTotalsSchema = z.object({
  subtotal: PositiveMoneySchema,
  shipping: PositiveMoneySchema,
  tax: PositiveMoneySchema,
  platformFee: PositiveMoneySchema,
  sellerProceeds: PositiveMoneySchema,
  total: PositiveMoneySchema,
});
export interface TransactionTotals extends z.infer<typeof TransactionTotalsSchema> {}

export const PaymentReferenceSchema = z.object({
  stripePaymentIntentId: z.string().trim().min(1).max(255),
  stripeChargeId: z.string().trim().min(1).max(255).nullable(),
  paymentMethodBrand: z.string().trim().min(1).max(40).nullable(),
  paymentMethodLast4: z.string().regex(/^[0-9]{4}$/).nullable(),
});
export interface PaymentReference extends z.infer<typeof PaymentReferenceSchema> {}

export const TransactionSchema = BaseEntitySchema.extend({
  listingId: EntityIdSchema,
  offerId: EntityIdSchema.nullable(),
  buyerId: EntityIdSchema,
  sellerId: EntityIdSchema,
  status: TransactionStatusSchema,
  fulfillmentStatus: FulfillmentStatusSchema,
  quantity: z.number().int().positive(),
  totals: TransactionTotalsSchema,
  payment: PaymentReferenceSchema.nullable(),
  shippingAddress: AddressSchema,
  paidAt: IsoDateTimeSchema.nullable(),
  fulfilledAt: IsoDateTimeSchema.nullable(),
  completedAt: IsoDateTimeSchema.nullable(),
  cancelledAt: IsoDateTimeSchema.nullable(),
});
export interface Transaction extends z.infer<typeof TransactionSchema> {}

export const CreateTransactionDtoSchema = z.object({
  listingId: EntityIdSchema,
  offerId: EntityIdSchema.nullable().optional(),
  quantity: z.number().int().positive(),
  shippingAddress: AddressSchema,
});
export interface CreateTransactionDto extends z.infer<typeof CreateTransactionDtoSchema> {}

export const UpdateTransactionStatusDtoSchema = z.object({
  status: TransactionStatusSchema,
  fulfillmentStatus: FulfillmentStatusSchema.optional(),
  reason: z.string().trim().max(500).nullable().optional(),
});
export interface UpdateTransactionStatusDto extends z.infer<typeof UpdateTransactionStatusDtoSchema> {}

export const TransactionDtoSchema = TransactionSchema;
export interface TransactionDto extends z.infer<typeof TransactionDtoSchema> {}
