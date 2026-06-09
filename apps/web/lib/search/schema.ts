import { z } from "zod";

export const LISTINGS_INDEX_UID = process.env.MEILISEARCH_LISTINGS_INDEX || "listings";
export const DISCOVERY_INDEX_UID = LISTINGS_INDEX_UID;

export const listingSearchableAttributes = [
  "title",
  "description",
  "category_name",
  "category_slug",
  "condition",
  "seller_display_name",
  "seo_tags",
  "attributes",
  "search_terms",
  "location_label",
  "location_city",
  "location_region"
];

export const listingFilterableAttributes = [
  "id",
  "status",
  "category_id",
  "category_slug",
  "condition",
  "currency",
  "price_amount",
  "seller_trust_score",
  "seller_completed_transactions",
  "seller_fraud_risk_level",
  "pickup_available",
  "fulfillment_modes",
  "ships_to",
  "location_city",
  "location_region",
  "location_country",
  "published_at",
  "created_at",
  "saved_count",
  "view_count",
  "conversion_score",
  "safety_score",
  "trend_score",
  "value_score",
  "_geo"
];

export const listingSortableAttributes = [
  "published_at",
  "created_at",
  "updated_at",
  "price_amount",
  "seller_trust_score",
  "seller_completed_transactions",
  "view_count",
  "saved_count",
  "trend_score",
  "value_score",
  "safety_score",
  "conversion_score",
  "_geo"
];

export const listingRankingRules = [
  "words",
  "typo",
  "proximity",
  "attribute",
  "sort",
  "exactness",
  "desc(safety_score)",
  "desc(seller_trust_score)",
  "desc(value_score)",
  "desc(trend_score)",
  "desc(published_at)"
];

export const listingFacets = [
  "category_slug",
  "condition",
  "location_city",
  "location_region",
  "location_country",
  "seller_fraud_risk_level",
  "pickup_available",
  "price_amount",
  "seller_trust_score"
];

export const discoverySearchableAttributes = listingSearchableAttributes;
export const discoveryFilterableAttributes = listingFilterableAttributes;
export const discoverySortableAttributes = listingSortableAttributes;
export const discoveryRankingRules = listingRankingRules;

export const discoverySortSchema = z.enum(["newest", "closest", "price_low", "price_high", "best_value", "safest_seller", "recommended", "trending"]);
export type DiscoverySort = z.infer<typeof discoverySortSchema>;

export const discoverySearchParamsSchema = z.object({
  q: z.string().trim().max(200).optional(),
  intent: z.string().trim().max(300).optional(),
  category: z.string().trim().max(80).optional(),
  location: z.string().trim().max(120).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusMiles: z.coerce.number().min(1).max(500).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  condition: z.array(z.string().trim().max(60)).max(12).optional(),
  minSellerTrust: z.coerce.number().min(0).max(100).optional(),
  verifiedOnly: z.coerce.boolean().optional(),
  paymentProtection: z.coerce.boolean().optional(),
  fulfillment: z.enum(["pickup", "delivery", "any"]).optional(),
  sort: discoverySortSchema.default("newest"),
  page: z.coerce.number().int().min(1).max(500).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(24),
  userId: z.string().uuid().optional(),
  sessionId: z.string().trim().max(160).optional(),
}).refine((params) => params.maxPrice === undefined || params.minPrice === undefined || params.maxPrice >= params.minPrice, {
  message: "maxPrice must be greater than or equal to minPrice.",
  path: ["maxPrice"],
});

export type DiscoverySearchParams = {
  q?: string;
  intent?: string;
  category?: string;
  location?: string;
  lat?: number;
  lng?: number;
  radiusMiles?: number;
  minPrice?: number;
  maxPrice?: number;
  condition?: string[];
  minSellerTrust?: number;
  verifiedOnly?: boolean;
  paymentProtection?: boolean;
  fulfillment?: "pickup" | "delivery" | "any";
  sort?: DiscoverySort;
  page?: number;
  limit?: number;
  userId?: string;
  sessionId?: string;
};

export type DiscoveryDocument = {
  id: string;
  title: string;
  description: string;
  category_id: string | null;
  category_slug: string;
  category_name: string;
  condition: string;
  status: string;
  price_amount: number;
  currency: string;
  location_city: string | null;
  location_region: string | null;
  location_country: string | null;
  location_label: string;
  latitude: number | null;
  longitude: number | null;
  _geo?: { lat: number; lng: number };
  pickup_available: boolean;
  ships_to: string[];
  seller_id: string;
  seller_display_name: string;
  seller_trust_score: number;
  seller_completed_transactions: number;
  seller_fraud_risk_level: string;
  image_url: string | null;
  seo_tags: string[];
  attributes: string[];
  search_terms: string[];
  fulfillment_modes: string[];
  view_count: number;
  saved_count: number;
  purchase_count: number;
  trend_score: number;
  value_score: number;
  safety_score: number;
  conversion_score: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};
