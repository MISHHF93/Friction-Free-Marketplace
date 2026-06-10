import { z } from "zod";
import {
  BaseEntitySchema,
  EntityIdSchema,
  ImageAssetSchema,
  JsonValueSchema,
  PositiveMoneySchema,
  SlugSchema,
} from "./common";

export const ListingStatusSchema = z.enum(["draft", "pending_review", "active", "paused", "sold", "archived", "rejected"]);
export type ListingStatus = z.infer<typeof ListingStatusSchema>;

export const ListingConditionSchema = z.enum(["new", "open_box", "excellent", "good", "fair", "for_parts"]);
export type ListingCondition = z.infer<typeof ListingConditionSchema>;

export const ListingModerationStatusSchema = z.enum(["unreviewed", "approved", "flagged", "rejected"]);
export type ListingModerationStatus = z.infer<typeof ListingModerationStatusSchema>;

export const ListingShippingOptionSchema = z.object({
  id: EntityIdSchema,
  label: z.string().trim().min(1).max(80),
  price: PositiveMoneySchema,
  estimatedMinDays: z.number().int().positive(),
  estimatedMaxDays: z.number().int().positive(),
});
export interface ListingShippingOption extends z.infer<typeof ListingShippingOptionSchema> {}

export const ListingAiMetadataSchema = z.object({
  generatedSummary: z.string().trim().max(500).nullable(),
  suggestedTags: z.array(z.string().trim().min(1).max(40)).max(20),
  qualityScore: z.number().min(0).max(1).nullable(),
  moderationRisk: z.number().min(0).max(1).nullable(),
  embeddingVersion: z.string().trim().min(1).max(80).nullable(),
});
export interface ListingAiMetadata extends z.infer<typeof ListingAiMetadataSchema> {}

export const ListingSchema = BaseEntitySchema.extend({
  sellerId: EntityIdSchema,
  title: z.string().trim().min(8).max(140),
  slug: SlugSchema,
  description: z.string().trim().min(40).max(10_000),
  categoryId: EntityIdSchema,
  condition: ListingConditionSchema,
  status: ListingStatusSchema,
  moderationStatus: ListingModerationStatusSchema,
  price: PositiveMoneySchema,
  inventoryQuantity: z.number().int().min(0),
  images: z.array(ImageAssetSchema).min(1).max(16),
  attributes: z.record(JsonValueSchema).default({}),
  tags: z.array(z.string().trim().min(1).max(40)).max(30),
  shippingOptions: z.array(ListingShippingOptionSchema).min(1),
  aiMetadata: ListingAiMetadataSchema,
  publishedAt: BaseEntitySchema.shape.createdAt.nullable(),
});
export interface Listing extends z.infer<typeof ListingSchema> {}

export const CreateListingDtoSchema = z.object({
  title: ListingSchema.shape.title,
  description: ListingSchema.shape.description,
  categoryId: EntityIdSchema,
  condition: ListingConditionSchema,
  price: PositiveMoneySchema,
  inventoryQuantity: ListingSchema.shape.inventoryQuantity,
  images: ListingSchema.shape.images,
  attributes: ListingSchema.shape.attributes.optional(),
  tags: ListingSchema.shape.tags.default([]),
  shippingOptions: ListingSchema.shape.shippingOptions,
});
export interface CreateListingDto extends z.infer<typeof CreateListingDtoSchema> {}

export const UpdateListingDtoSchema = CreateListingDtoSchema.partial().extend({
  status: z.enum(["draft", "pending_review", "active", "paused", "archived"]).optional(),
});
export interface UpdateListingDto extends z.infer<typeof UpdateListingDtoSchema> {}

export const ListingSummaryDtoSchema = ListingSchema.pick({
  id: true,
  sellerId: true,
  title: true,
  slug: true,
  condition: true,
  status: true,
  price: true,
  inventoryQuantity: true,
  images: true,
  tags: true,
  publishedAt: true,
});
export interface ListingSummaryDto extends z.infer<typeof ListingSummaryDtoSchema> {}

export const ListingDetailDtoSchema = ListingSchema;
export interface ListingDetailDto extends z.infer<typeof ListingDetailDtoSchema> {}
