export const DISCOVERY_INDEX_UID = "marketplace_listings";

export const discoverySearchableAttributes = [
  "title",
  "description",
  "category_name",
  "category_slug",
  "condition",
  "seller_display_name",
  "seo_tags",
  "attributes",
  "location_label"
];

export const discoveryFilterableAttributes = [
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
  "ships_to",
  "location_city",
  "location_region",
  "published_at",
  "created_at",
  "saved_count",
  "view_count",
  "conversion_score",
  "_geo"
];

export const discoverySortableAttributes = [
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
  "_geo_point"
];

export const discoveryRankingRules = [
  "words",
  "typo",
  "proximity",
  "attribute",
  "sort",
  "exactness",
  "desc(safety_score)",
  "desc(value_score)",
  "desc(trend_score)",
  "desc(published_at)"
];

export type DiscoverySort = "newest" | "closest" | "best_value" | "safest_seller" | "recommended" | "trending";

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
