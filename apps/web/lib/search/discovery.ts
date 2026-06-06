import { createAdminClient } from "@/lib/supabase/admin";
import { listings as demoListings } from "@/lib/marketplace-data";
import { isSearchConfigured, searchDiscoveryIndex, upsertDiscoveryDocuments } from "@/lib/search/meilisearch";
import type { DiscoveryDocument, DiscoverySearchParams } from "@/lib/search/schema";

export type DiscoveryResult = {
  listings: DiscoveryDocument[];
  total: number;
  facets: Record<string, Record<string, number>>;
  source: "meilisearch" | "database" | "demo";
};

type Row = Record<string, unknown>;

function numberOrNull(value: unknown) {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(number) ? number : null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function rowToDiscoveryDocument(row: Row): DiscoveryDocument {
  const latitude = numberOrNull(row.latitude);
  const longitude = numberOrNull(row.longitude);
  const document: DiscoveryDocument = {
    id: String(row.id),
    title: String(row.title ?? "Untitled listing"),
    description: String(row.description ?? ""),
    category_id: typeof row.category_id === "string" ? row.category_id : null,
    category_slug: String(row.category_slug ?? "other"),
    category_name: String(row.category_name ?? "Other"),
    condition: String(row.condition ?? "Unspecified"),
    status: String(row.status ?? "active"),
    price_amount: Number(row.price_amount ?? 0),
    currency: String(row.currency ?? "USD"),
    location_city: typeof row.location_city === "string" ? row.location_city : null,
    location_region: typeof row.location_region === "string" ? row.location_region : null,
    location_country: typeof row.location_country === "string" ? row.location_country : null,
    location_label: String(row.location_label ?? [row.location_city, row.location_region].filter(Boolean).join(", ")),
    latitude,
    longitude,
    pickup_available: Boolean(row.pickup_available),
    ships_to: stringArray(row.ships_to),
    seller_id: String(row.seller_id),
    seller_display_name: String(row.seller_display_name ?? "Verified seller"),
    seller_trust_score: Number(row.seller_trust_score ?? 0),
    seller_completed_transactions: Number(row.seller_completed_transactions ?? 0),
    seller_fraud_risk_level: String(row.seller_fraud_risk_level ?? "low"),
    image_url: typeof row.image_url === "string" ? row.image_url : null,
    seo_tags: stringArray(row.seo_tags),
    attributes: stringArray(row.attributes),
    view_count: Number(row.view_count ?? 0),
    saved_count: Number(row.saved_count ?? 0),
    purchase_count: Number(row.purchase_count ?? 0),
    trend_score: Number(row.trend_score ?? 0),
    value_score: Number(row.value_score ?? 0),
    safety_score: Number(row.safety_score ?? 0),
    conversion_score: Number(row.conversion_score ?? 0),
    published_at: typeof row.published_at === "string" ? row.published_at : null,
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString())
  };

  if (latitude !== null && longitude !== null) document._geo = { lat: latitude, lng: longitude };
  return document;
}

function demoDocuments(): DiscoveryDocument[] {
  return demoListings.map((listing, index) => {
    const published = new Date(Date.now() - index * 36 * 60 * 60 * 1000).toISOString();
    const trust = listing.trustScore;
    const priceSignal = Math.max(1, 2000 - listing.price) / 20;
    return {
      id: listing.id,
      title: listing.title,
      description: listing.description,
      category_id: null,
      category_slug: listing.category.toLowerCase().replace(/\s+/g, "-"),
      category_name: listing.category,
      condition: listing.condition,
      status: "active",
      price_amount: listing.price,
      currency: "USD",
      location_city: listing.location.split(", ")[0] ?? null,
      location_region: listing.location.split(", ")[1] ?? null,
      location_country: "US",
      location_label: listing.location,
      latitude: [30.2672, 40.6782, 47.6061][index] ?? null,
      longitude: [-97.7431, -73.9442, -122.3321][index] ?? null,
      _geo: { lat: [30.2672, 40.6782, 47.6061][index]!, lng: [-97.7431, -73.9442, -122.3321][index]! },
      pickup_available: true,
      ships_to: ["US"],
      seller_id: `demo-seller-${index}`,
      seller_display_name: listing.seller,
      seller_trust_score: trust,
      seller_completed_transactions: 20 + index * 8,
      seller_fraud_risk_level: "low",
      image_url: null,
      seo_tags: listing.highlights,
      attributes: listing.highlights,
      view_count: 350 - index * 60,
      saved_count: 42 - index * 7,
      purchase_count: 0,
      trend_score: 95 - index * 8,
      value_score: Math.round((trust * 0.65 + priceSignal) * 10) / 10,
      safety_score: trust,
      conversion_score: trust + 10 - index * 5,
      published_at: published,
      created_at: published,
      updated_at: published
    };
  });
}

function matchesFallback(document: DiscoveryDocument, params: DiscoverySearchParams) {
  const q = (params.intent || params.q || "").toLowerCase();
  const haystack = [document.title, document.description, document.category_name, document.condition, document.seller_display_name, ...document.seo_tags].join(" ").toLowerCase();
  return (!q || haystack.includes(q)) &&
    (!params.category || document.category_slug === params.category) &&
    (params.minPrice === undefined || document.price_amount >= params.minPrice) &&
    (params.maxPrice === undefined || document.price_amount <= params.maxPrice) &&
    (!params.condition?.length || params.condition.includes(document.condition)) &&
    (params.minSellerTrust === undefined || document.seller_trust_score >= params.minSellerTrust);
}

function sortFallback(documents: DiscoveryDocument[], params: DiscoverySearchParams) {
  return [...documents].sort((a, b) => {
    switch (params.sort) {
      case "best_value": return b.value_score - a.value_score;
      case "safest_seller": return b.safety_score - a.safety_score;
      case "trending": return b.trend_score - a.trend_score;
      case "recommended": return b.conversion_score - a.conversion_score;
      case "newest":
      case "closest":
      default: return Date.parse(b.published_at ?? b.created_at) - Date.parse(a.published_at ?? a.created_at);
    }
  });
}

export async function searchMarketplace(params: DiscoverySearchParams): Promise<DiscoveryResult> {
  if (isSearchConfigured()) {
    const response = await searchDiscoveryIndex(params);
    return {
      listings: response.hits,
      total: response.estimatedTotalHits ?? response.hits.length,
      facets: response.facetDistribution ?? {},
      source: "meilisearch"
    };
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await (supabase as any).from("listing_search_documents").select("*").eq("status", "active").limit(200);
    if (error) throw error;
    const filtered = sortFallback((data ?? []).map((row: Row) => rowToDiscoveryDocument(row)).filter((doc: DiscoveryDocument) => matchesFallback(doc, params)), params);
    return { listings: filtered.slice(0, params.limit ?? 24), total: filtered.length, facets: {}, source: "database" };
  } catch {
    const filtered = sortFallback(demoDocuments().filter((doc) => matchesFallback(doc, params)), params);
    return { listings: filtered.slice(0, params.limit ?? 24), total: filtered.length, facets: {}, source: "demo" };
  }
}

export async function indexActiveListings(limit = 500) {
  const supabase = createAdminClient();
  const { data, error } = await (supabase as any).from("listing_search_documents").select("*").eq("status", "active").order("updated_at", { ascending: false }).limit(limit);
  if (error) throw error;
  const documents = (data ?? []).map((row: Row) => rowToDiscoveryDocument(row));
  const task = await upsertDiscoveryDocuments(documents);
  return { indexed: documents.length, task };
}
