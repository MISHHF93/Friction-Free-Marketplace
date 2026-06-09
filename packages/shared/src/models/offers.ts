import { z } from "zod";
import { BaseEntitySchema, EntityIdSchema, IsoDateTimeSchema, PositiveMoneySchema } from "./common";

export const OfferStatusSchema = z.enum(["pending", "accepted", "rejected", "countered", "expired", "withdrawn", "cancelled"]);
export type OfferStatus = z.infer<typeof OfferStatusSchema>;

export const OfferTypeSchema = z.enum(["buyer_offer", "seller_counter"]);
export type OfferType = z.infer<typeof OfferTypeSchema>;

export const OfferTermsSchema = z.object({
  includesShipping: z.boolean(),
  buyerNote: z.string().trim().max(1_000).nullable().optional(),
  sellerNote: z.string().trim().max(1_000).nullable().optional(),
});
export interface OfferTerms extends z.infer<typeof OfferTermsSchema> {}

export const OfferSchema = BaseEntitySchema.extend({
  listingId: EntityIdSchema,
  buyerId: EntityIdSchema,
  sellerId: EntityIdSchema,
  parentOfferId: EntityIdSchema.nullable(),
  type: OfferTypeSchema,
  status: OfferStatusSchema,
  amount: PositiveMoneySchema,
  quantity: z.number().int().positive(),
  terms: OfferTermsSchema,
  expiresAt: IsoDateTimeSchema,
  respondedAt: IsoDateTimeSchema.nullable(),
});
export interface Offer extends z.infer<typeof OfferSchema> {}

export const CreateOfferDtoSchema = z.object({
  listingId: EntityIdSchema,
  amount: PositiveMoneySchema,
  quantity: z.number().int().positive(),
  terms: OfferTermsSchema,
  expiresAt: IsoDateTimeSchema,
});
export interface CreateOfferDto extends z.infer<typeof CreateOfferDtoSchema> {}

export const CounterOfferDtoSchema = CreateOfferDtoSchema.extend({
  parentOfferId: EntityIdSchema,
});
export interface CounterOfferDto extends z.infer<typeof CounterOfferDtoSchema> {}

export const RespondToOfferDtoSchema = z.object({
  status: z.enum(["accepted", "rejected", "withdrawn", "cancelled"]),
  note: z.string().trim().max(1_000).nullable().optional(),
});
export interface RespondToOfferDto extends z.infer<typeof RespondToOfferDtoSchema> {}

export const OfferDtoSchema = OfferSchema;
export interface OfferDto extends z.infer<typeof OfferDtoSchema> {}
