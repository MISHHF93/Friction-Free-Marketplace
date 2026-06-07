import { z } from "zod";

export const LISTING_CATEGORIES = [
  "electronics",
  "home",
  "outdoors",
  "collectibles",
  "vehicles",
  "services",
  "fashion",
  "baby-kids",
  "sports",
  "books-media",
  "other",
] as const;

export const LISTING_CONDITIONS = [
  "new",
  "like-new",
  "excellent",
  "good",
  "fair",
  "for-parts",
] as const;
export const MODERATION_STATUSES = [
  "pending",
  "approved",
  "needs_review",
  "rejected",
] as const;
export const FULFILLMENT_OPTIONS = [
  "shipping",
  "pickup",
  "local_delivery",
] as const;
export const LISTING_STATUSES = [
  "draft",
  "active",
  "reserved",
  "sold",
  "paused",
  "expired",
  "removed",
] as const;

export const imageSchema = z.object({
  storagePath: z.string().min(3),
  publicUrl: z.string().url().optional().or(z.literal("")),
  altText: z.string().max(160).optional(),
  sortOrder: z.number().int().min(0).max(50).default(0),
});

const listingFormBaseSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters.")
    .max(160),
  description: z
    .string()
    .trim()
    .min(20, "Description must be at least 20 characters.")
    .max(5000),
  category: z.enum(LISTING_CATEGORIES),
  categoryId: z.string().uuid().optional().nullable(),
  condition: z.enum(LISTING_CONDITIONS),
  priceAmount: z.coerce
    .number()
    .min(0.01, "Price must be greater than 0.")
    .max(999999.99)
    .refine(
      (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8,
      "Price can include cents only.",
    ),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/)
    .default("USD"),
  quantity: z.coerce.number().int().min(1).max(999).default(1),
  locationCity: z.string().trim().min(2).max(80),
  locationRegion: z.string().trim().min(2).max(80),
  locationCountry: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/)
    .default("US"),
  shipsTo: z.array(z.string().trim().min(2).max(40)).max(30).default([]),
  fulfillmentOptions: z
    .array(z.enum(FULFILLMENT_OPTIONS))
    .min(1, "Choose shipping, pickup, or local delivery."),
  seoTags: z.array(z.string().trim().min(2).max(40)).max(12).default([]),
  ai: z
    .object({
      generated: z.boolean().default(false),
      priceMin: z.number().min(0).optional(),
      priceMax: z.number().min(0).optional(),
      fraudRiskScore: z.number().min(0).max(100).optional(),
      scamRiskWarning: z.string().max(700).optional(),
      riskFactors: z.array(z.string().max(180)).max(8).optional(),
      conditionConfidence: z.number().min(0).max(1).optional(),
      conditionEvidence: z.array(z.string().max(180)).max(6).optional(),
      categoryRationale: z.string().max(500).optional(),
      priceRationale: z.string().max(700).optional(),
      missingInformationQuestions: z
        .array(z.string().max(180))
        .max(8)
        .optional(),
      rationale: z.string().max(1200).optional(),
    })
    .default({ generated: false }),
  moderationStatus: z.enum(MODERATION_STATUSES).default("pending"),
  moderationNotes: z.string().max(1000).optional(),
  images: z.array(imageSchema).max(12).default([]),
  publish: z.boolean().default(false),
});

export const listingFormSchema = listingFormBaseSchema.refine(
  (data) =>
    data.fulfillmentOptions.includes("shipping") ||
    data.fulfillmentOptions.includes("pickup") ||
    data.fulfillmentOptions.includes("local_delivery"),
  {
    message: "Choose at least one fulfillment option.",
    path: ["fulfillmentOptions"],
  },
);

export const listingPatchSchema = listingFormBaseSchema
  .partial()
  .extend({ publish: z.boolean().optional() });
export const listingStatusSchema = z.enum(LISTING_STATUSES);

export const aiListingResponseSchema = z.object({
  title: z.string().min(3).max(160),
  description: z.string().min(20).max(5000),
  category: z.enum(LISTING_CATEGORIES),
  categoryRationale: z.string().max(500).optional(),
  condition: z.enum(LISTING_CONDITIONS),
  conditionConfidence: z.number().min(0).max(1).optional(),
  conditionEvidence: z.array(z.string()).max(6).optional(),
  priceRange: z.object({
    min: z.number().min(0),
    max: z.number().min(0),
    currency: z.string().default("USD"),
    confidence: z.number().min(0).max(1).optional(),
    rationale: z.string().max(700).optional(),
  }),
  seoTags: z.array(z.string()).max(12),
  scamRiskWarning: z
    .object({
      needed: z.boolean(),
      riskScore: z.number().min(0).max(100),
      warning: z.string().max(700),
      riskFactors: z.array(z.string()).max(8),
    })
    .optional(),
  fraudRiskScore: z.number().min(0).max(100).optional(),
  missingInformationQuestions: z.array(z.string()).max(8).optional(),
  rationale: z.string().max(1200),
});

export type ListingFormInput = z.infer<typeof listingFormSchema>;
export type AiListingResponse = z.infer<typeof aiListingResponseSchema>;

export function slugifyListingTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}
