import { createAdminClient } from "@/lib/supabase/admin";
import { listings as demoListings } from "@/lib/marketplace-data";
import { configureDiscoveryIndex, deleteDiscoveryDocuments, isSearchConfigured, searchDiscoveryIndex, upsertDiscoveryDocuments, waitForMeiliTask } from "@/lib/search/meilisearch";
import { enrichSearchParamsWithClassification } from "@/lib/search/item-classifier";
import { recordReliabilityEvent } from "@/lib/observability/reliability";
import { isDemoMarketplaceDataEnabled } from "@/lib/marketplace/demo-mode";
import type { DiscoveryDocument, DiscoverySearchParams } from "@/lib/search/schema";

export type DiscoveryResult = {
  listings: DiscoveryDocument[];
  total: number;
  facets: Record<string, Record<string, number>>;
  facetStats: Record<string, { min: number; max: number }>;
  source: "meilisearch" | "database" | "demo" | "unavailable";
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
    search_terms: stringArray(row.search_terms),
    fulfillment_modes: stringArray(row.fulfillment_modes),
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
      search_terms: [listing.title, listing.category, listing.condition, ...listing.highlights],
      fulfillment_modes: ["pickup", "shipping"],
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
  const location = params.location?.toLowerCase();
  const locationHaystack = [document.location_label, document.location_city, document.location_region, document.location_country].filter(Boolean).join(" ").toLowerCase();
  return (!q || haystack.includes(q)) &&
    (!location || locationHaystack.includes(location)) &&
    (!params.category || document.category_slug === params.category) &&
    (params.minPrice === undefined || document.price_amount >= params.minPrice) &&
    (params.maxPrice === undefined || document.price_amount <= params.maxPrice) &&
    (!params.condition?.length || params.condition.includes(document.condition)) &&
    (params.minSellerTrust === undefined || document.seller_trust_score >= params.minSellerTrust) &&
    (!params.verifiedOnly || document.seller_trust_score >= 80) &&
    (!params.paymentProtection || document.seller_trust_score >= 80) &&
    (params.fulfillment !== "pickup" || document.pickup_available) &&
    (params.fulfillment !== "delivery" || document.ships_to.length > 0);
}

function buildFallbackFacets(documents: DiscoveryDocument[]) {
  const count = (field: keyof DiscoveryDocument) =>
    documents.reduce<Record<string, number>>((acc, document) => {
      const value = document[field];
      if (value === null || value === undefined || value === "") return acc;
      const key = String(value);
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

  const numericStats = (field: "price_amount" | "seller_trust_score") => {
    const values = documents.map((document) => document[field]).filter((value) => Number.isFinite(value));
    return values.length ? { min: Math.min(...values), max: Math.max(...values) } : undefined;
  };

  return {
    facets: {
      category_slug: count("category_slug"),
      condition: count("condition"),
      location_city: count("location_city"),
      location_region: count("location_region"),
      seller_fraud_risk_level: count("seller_fraud_risk_level"),
      pickup_available: count("pickup_available")
    },
    facetStats: {
      ...(numericStats("price_amount") ? { price_amount: numericStats("price_amount")! } : {}),
      ...(numericStats("seller_trust_score") ? { seller_trust_score: numericStats("seller_trust_score")! } : {})
    }
  };
}

function sortFallback(documents: DiscoveryDocument[], params: DiscoverySearchParams) {
  return [...documents].sort((a, b) => {
    switch (params.sort) {
      case "price_low": return a.price_amount - b.price_amount;
      case "price_high": return b.price_amount - a.price_amount;
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
  const resolvedParams = enrichSearchParamsWithClassification(params);

  if (isSearchConfigured()) {
    try {
      const response = await searchDiscoveryIndex(resolvedParams);
      return {
        listings: response.hits,
        total: response.estimatedTotalHits ?? response.hits.length,
        facets: response.facetDistribution ?? {},
        facetStats: response.facetStats ?? {},
        source: "meilisearch"
      };
    } catch {
      recordReliabilityEvent({
        event: "search.provider_fallback",
        route: "searchMarketplace",
        status: "degraded",
        provider: "meilisearch",
        errorCode: "SEARCH_PROVIDER_UNAVAILABLE",
      });
      // Fall back to the database or demo data when the configured search service is unavailable.
    }
  }

  if (isDemoMarketplaceDataEnabled()) {
    const filtered = sortFallback(demoDocuments().filter((doc) => matchesFallback(doc, resolvedParams)), resolvedParams);
    const fallbackFacets = buildFallbackFacets(filtered);
    return { listings: filtered.slice(0, resolvedParams.limit ?? 24), total: filtered.length, ...fallbackFacets, source: "demo" };
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await (supabase as any).from("listing_search_documents").select("*").eq("status", "active").limit(200);
    if (error) throw error;
    const filtered = sortFallback((data ?? []).map((row: Row) => rowToDiscoveryDocument(row)).filter((doc: DiscoveryDocument) => matchesFallback(doc, resolvedParams)), resolvedParams);
    const fallbackFacets = buildFallbackFacets(filtered);
    return { listings: filtered.slice(0, resolvedParams.limit ?? 24), total: filtered.length, ...fallbackFacets, source: "database" };
  } catch {
    recordReliabilityEvent({
      event: "search.database_unavailable",
      route: "searchMarketplace",
      status: "error",
      provider: "supabase",
      errorCode: "SEARCH_DATABASE_UNAVAILABLE",
    });
    return { listings: [], total: 0, facets: {}, facetStats: {}, source: "unavailable" };
  }
}

export async function trackSearchEvent({
  params,
  resultCount,
  source,
  userId,
  sessionId,
  clickedListingId,
}: {
  params: DiscoverySearchParams;
  resultCount: number;
  source: DiscoveryResult["source"];
  userId?: string | null;
  sessionId?: string | null;
  clickedListingId?: string | null;
}) {
  try {
    const supabase = createAdminClient();
    const { error } = await (supabase as any).from("search_events").insert({
      user_id: userId ?? null,
      session_id: sessionId ?? params.sessionId ?? null,
      query: params.intent || params.q || null,
      filters: {
        category: params.category,
        location: params.location,
        lat: params.lat,
        lng: params.lng,
        radiusMiles: params.radiusMiles,
        minPrice: params.minPrice,
        maxPrice: params.maxPrice,
        condition: params.condition,
        minSellerTrust: params.minSellerTrust,
        verifiedOnly: params.verifiedOnly,
        paymentProtection: params.paymentProtection,
        fulfillment: params.fulfillment,
        sort: params.sort,
        source,
      },
      result_count: resultCount,
      clicked_listing_id: clickedListingId ?? null,
    });
    if (error) throw error;
    return { tracked: true };
  } catch (error) {
    console.error("Unable to record search event", { error });
    return { tracked: false };
  }
}

export async function indexActiveListings(limit = 500, options: { waitForTasks?: boolean } = {}) {
  await configureDiscoveryIndex();
  const supabase = createAdminClient();
  const { data, error } = await (supabase as any).from("listing_search_documents").select("*").eq("status", "active").order("updated_at", { ascending: false }).limit(limit);
  if (error) throw error;
  const documents = (data ?? []).map((row: Row) => rowToDiscoveryDocument(row));
  const task = await upsertDiscoveryDocuments(documents);
  if (options.waitForTasks && task.taskUid !== null) await waitForMeiliTask(task.taskUid);
  return { indexed: documents.length, task };
}

export async function indexListingsById(listingIds: string[], options: { waitForTasks?: boolean } = {}) {
  if (!isSearchConfigured()) return { skipped: true, reason: "search_not_configured", indexed: 0, deleted: 0 };
  await configureDiscoveryIndex();
  const supabase = createAdminClient();
  const { data, error } = await (supabase as any).from("listing_search_documents").select("*").in("id", listingIds);
  if (error) throw error;

  const activeDocuments = (data ?? [])
    .filter((row: Row) => row.status === "active")
    .map((row: Row) => rowToDiscoveryDocument(row));
  const activeIds = new Set(activeDocuments.map((document: DiscoveryDocument) => document.id));
  const staleIds = listingIds.filter((id) => !activeIds.has(id));

  const [upsertTask, deleteTask] = await Promise.all([
    upsertDiscoveryDocuments(activeDocuments),
    deleteDiscoveryDocuments(staleIds),
  ]);

  if (options.waitForTasks) {
    await Promise.all([
      upsertTask.taskUid !== null ? waitForMeiliTask(upsertTask.taskUid) : Promise.resolve(),
      deleteTask.taskUid !== null ? waitForMeiliTask(deleteTask.taskUid) : Promise.resolve(),
    ]);
  }

  return { indexed: activeDocuments.length, deleted: staleIds.length, upsertTask, deleteTask };
}

export async function rebuildDiscoveryIndex(limit = 1000, options: { waitForTasks?: boolean } = {}) {
  if (!isSearchConfigured()) return { skipped: true, reason: "search_not_configured", indexed: 0 };
  return indexActiveListings(limit, options);
}


export async function syncListingToSearch(listingId: string) {
  if (!isSearchConfigured()) return { skipped: true, reason: "search_not_configured" };

  const supabase = createAdminClient();
  const { data, error } = await (supabase as any)
    .from("listing_search_documents")
    .select("*")
    .eq("id", listingId)
    .maybeSingle();

  if (error) throw error;
  if (!data || data.status !== "active") {
    const task = await deleteDiscoveryDocuments([listingId]);
    return { synced: false, deleted: true, task };
  }

  const document = rowToDiscoveryDocument(data as Row);
  const task = await upsertDiscoveryDocuments([document]);
  return { synced: true, deleted: false, task };
}

export async function removeListingFromSearch(listingId: string) {
  if (!isSearchConfigured()) return { skipped: true, reason: "search_not_configured" };
  const task = await deleteDiscoveryDocuments([listingId]);
  return { synced: false, deleted: true, task };
}
