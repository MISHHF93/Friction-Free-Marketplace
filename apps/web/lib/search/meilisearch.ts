import { LISTINGS_INDEX_UID, listingFacets, listingFilterableAttributes, listingRankingRules, listingSearchableAttributes, listingSortableAttributes, type DiscoveryDocument, type DiscoverySearchParams } from "@/lib/search/schema";

type MeiliSearchHit = DiscoveryDocument & { _formatted?: Partial<Record<keyof DiscoveryDocument, string>>; _rankingScore?: number };

type MeiliSearchResponse = {
  hits: MeiliSearchHit[];
  estimatedTotalHits?: number;
  limit: number;
  offset: number;
  processingTimeMs: number;
  facetDistribution?: Record<string, Record<string, number>>;
  facetStats?: Record<string, { min: number; max: number }>;
};

type MeiliTask = {
  uid: number;
  status: "enqueued" | "processing" | "succeeded" | "failed" | "canceled";
  error?: { message?: string; code?: string };
};

export function isSearchConfigured() {
  return Boolean(
    process.env.MEILISEARCH_HOST &&
      process.env.MEILISEARCH_API_KEY &&
      process.env.MEILISEARCH_API_KEY !== "local-dev-placeholder"
  );
}

function getSearchEnv() {
  const host = process.env.MEILISEARCH_HOST;
  const apiKey = process.env.MEILISEARCH_API_KEY;
  if (!host || !apiKey) throw new Error("MEILISEARCH_HOST and MEILISEARCH_API_KEY are required for marketplace search.");
  return { host: host.replace(/\/$/, ""), apiKey };
}

async function meiliRequest<T>(path: string, init: RequestInit = {}) {
  const { host, apiKey } = getSearchEnv();
  const response = await fetch(`${host}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Meilisearch request failed (${response.status}): ${body}`);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function compactFilters(filters: Array<string | undefined>) {
  return filters.filter(Boolean) as string[];
}

function quote(value: string) {
  return JSON.stringify(value);
}

function locationFilter(location?: string) {
  if (!location) return undefined;
  const parts = location.split(",").map((part) => part.trim()).filter(Boolean);
  const terms = parts.length > 0 ? parts : [location.trim()];
  const clauses = terms.flatMap((term) => [
    `location_city = ${quote(term)}`,
    `location_region = ${quote(term)}`,
    `location_country = ${quote(term.toUpperCase())}`
  ]);
  return clauses.length ? `(${clauses.join(" OR ")})` : undefined;
}

export function buildMeiliSearchPayload(params: DiscoverySearchParams) {
  const limit = Math.min(Math.max(params.limit ?? 24, 1), 60);
  const page = Math.max(params.page ?? 1, 1);
  const filter = compactFilters([
    'status = "active"',
    params.category ? `category_slug = ${quote(params.category)}` : undefined,
    params.minPrice !== undefined ? `price_amount >= ${params.minPrice}` : undefined,
    params.maxPrice !== undefined ? `price_amount <= ${params.maxPrice}` : undefined,
    params.condition?.length ? `condition IN [${params.condition.map(quote).join(", ")}]` : undefined,
    locationFilter(params.location),
    params.minSellerTrust !== undefined ? `seller_trust_score >= ${params.minSellerTrust}` : undefined,
    params.verifiedOnly ? "seller_trust_score >= 80" : undefined,
    params.paymentProtection ? "seller_trust_score >= 80" : undefined,
    params.fulfillment === "pickup" ? "fulfillment_modes = \"pickup\"" : undefined,
    params.fulfillment === "delivery" ? "(fulfillment_modes = \"shipping\" OR fulfillment_modes = \"local_delivery\")" : undefined,
    params.lat !== undefined && params.lng !== undefined && params.radiusMiles !== undefined
      ? `_geoRadius(${params.lat}, ${params.lng}, ${Math.round(params.radiusMiles * 1609.344)})`
      : undefined
  ]);

  const sort = (() => {
    switch (params.sort) {
      case "closest":
        return params.lat !== undefined && params.lng !== undefined ? [`_geoPoint(${params.lat}, ${params.lng}):asc`] : ["published_at:desc"];
      case "price_low":
        return ["price_amount:asc", "seller_trust_score:desc"];
      case "price_high":
        return ["price_amount:desc", "seller_trust_score:desc"];
      case "best_value":
        return ["value_score:desc", "seller_trust_score:desc", "published_at:desc"];
      case "safest_seller":
        return ["safety_score:desc", "seller_trust_score:desc", "published_at:desc"];
      case "trending":
        return ["trend_score:desc", "published_at:desc"];
      case "recommended":
        return ["conversion_score:desc", "safety_score:desc", "published_at:desc"];
      case "newest":
      default:
        return ["published_at:desc", "created_at:desc"];
    }
  })();

  return {
    q: params.intent || params.q || "",
    limit,
    offset: (page - 1) * limit,
    filter,
    sort,
    attributesToHighlight: ["title", "description"],
    facets: listingFacets,
    showRankingScore: true
  };
}

export async function configureDiscoveryIndex() {
  await meiliRequest(`/indexes/${LISTINGS_INDEX_UID}`, {
    method: "PUT",
    body: JSON.stringify({ uid: LISTINGS_INDEX_UID, primaryKey: "id" })
  });

  await meiliRequest(`/indexes/${LISTINGS_INDEX_UID}/settings`, {
    method: "PATCH",
    body: JSON.stringify({
      searchableAttributes: listingSearchableAttributes,
      filterableAttributes: listingFilterableAttributes,
      sortableAttributes: listingSortableAttributes,
      rankingRules: listingRankingRules,
      displayedAttributes: ["*"],
      synonyms: {
        couch: ["sofa", "sectional"],
        bike: ["bicycle", "cycle"],
        cellphone: ["phone", "smartphone"],
        pickup: ["local pickup", "collect"],
        shipping: ["delivery", "ship"]
      },
      typoTolerance: { enabled: true, minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 } },
      faceting: { maxValuesPerFacet: 100 },
      pagination: { maxTotalHits: 5000 }
    })
  });
}

export async function searchDiscoveryIndex(params: DiscoverySearchParams) {
  return meiliRequest<MeiliSearchResponse>(`/indexes/${LISTINGS_INDEX_UID}/search`, {
    method: "POST",
    body: JSON.stringify(buildMeiliSearchPayload(params))
  });
}

export async function upsertDiscoveryDocuments(documents: DiscoveryDocument[]) {
  if (documents.length === 0) return { taskUid: null };
  return meiliRequest<{ taskUid: number }>(`/indexes/${LISTINGS_INDEX_UID}/documents`, {
    method: "POST",
    body: JSON.stringify(documents)
  });
}

export async function deleteDiscoveryDocuments(ids: string[]) {
  if (ids.length === 0) return { taskUid: null };
  return meiliRequest<{ taskUid: number }>(`/indexes/${LISTINGS_INDEX_UID}/documents/delete-batch`, {
    method: "POST",
    body: JSON.stringify(ids)
  });
}

export async function waitForMeiliTask(taskUid: number, timeoutMs = 15_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const task = await meiliRequest<MeiliTask>(`/tasks/${taskUid}`);
    if (task.status === "succeeded") return task;
    if (task.status === "failed" || task.status === "canceled") {
      throw new Error(`Meilisearch task ${taskUid} ${task.status}: ${task.error?.message ?? task.error?.code ?? "unknown error"}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Timed out waiting for Meilisearch task ${taskUid}.`);
}
