import { DISCOVERY_INDEX_UID, discoveryFilterableAttributes, discoveryRankingRules, discoverySearchableAttributes, discoverySortableAttributes, type DiscoveryDocument, type DiscoverySearchParams } from "@/lib/search/schema";

type MeiliSearchHit = DiscoveryDocument & { _formatted?: Partial<Record<keyof DiscoveryDocument, string>>; _rankingScore?: number };

type MeiliSearchResponse = {
  hits: MeiliSearchHit[];
  estimatedTotalHits?: number;
  limit: number;
  offset: number;
  processingTimeMs: number;
  facetDistribution?: Record<string, Record<string, number>>;
};

export function isSearchConfigured() {
  return Boolean(process.env.MEILISEARCH_HOST && process.env.MEILISEARCH_API_KEY);
}

async function meiliRequest<T>(path: string, init: RequestInit = {}) {
  const host = process.env.MEILISEARCH_HOST;
  const apiKey = process.env.MEILISEARCH_API_KEY;
  if (!host || !apiKey) throw new Error("Missing MEILISEARCH_HOST or MEILISEARCH_API_KEY.");

  const response = await fetch(`${host.replace(/\/$/, "")}${path}`, {
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

export function buildMeiliSearchPayload(params: DiscoverySearchParams) {
  const limit = Math.min(Math.max(params.limit ?? 24, 1), 60);
  const page = Math.max(params.page ?? 1, 1);
  const filter = compactFilters([
    'status = "active"',
    params.category ? `category_slug = ${quote(params.category)}` : undefined,
    params.minPrice !== undefined ? `price_amount >= ${params.minPrice}` : undefined,
    params.maxPrice !== undefined ? `price_amount <= ${params.maxPrice}` : undefined,
    params.condition?.length ? `condition IN [${params.condition.map(quote).join(", ")}]` : undefined,
    params.minSellerTrust !== undefined ? `seller_trust_score >= ${params.minSellerTrust}` : undefined,
    params.lat !== undefined && params.lng !== undefined && params.radiusMiles !== undefined
      ? `_geoRadius(${params.lat}, ${params.lng}, ${Math.round(params.radiusMiles * 1609.344)})`
      : undefined
  ]);

  const sort = (() => {
    switch (params.sort) {
      case "closest":
        return params.lat !== undefined && params.lng !== undefined ? [`_geoPoint(${params.lat}, ${params.lng}):asc`] : ["published_at:desc"];
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
    facets: ["category_slug", "condition", "seller_fraud_risk_level", "pickup_available"],
    showRankingScore: true
  };
}

export async function configureDiscoveryIndex() {
  await meiliRequest(`/indexes/${DISCOVERY_INDEX_UID}`, {
    method: "PUT",
    body: JSON.stringify({ uid: DISCOVERY_INDEX_UID, primaryKey: "id" })
  });

  await meiliRequest(`/indexes/${DISCOVERY_INDEX_UID}/settings`, {
    method: "PATCH",
    body: JSON.stringify({
      searchableAttributes: discoverySearchableAttributes,
      filterableAttributes: discoveryFilterableAttributes,
      sortableAttributes: discoverySortableAttributes,
      rankingRules: discoveryRankingRules,
      typoTolerance: { enabled: true, minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 } },
      faceting: { maxValuesPerFacet: 100 },
      pagination: { maxTotalHits: 5000 }
    })
  });
}

export async function searchDiscoveryIndex(params: DiscoverySearchParams) {
  return meiliRequest<MeiliSearchResponse>(`/indexes/${DISCOVERY_INDEX_UID}/search`, {
    method: "POST",
    body: JSON.stringify(buildMeiliSearchPayload(params))
  });
}

export async function upsertDiscoveryDocuments(documents: DiscoveryDocument[]) {
  if (documents.length === 0) return { taskUid: null };
  return meiliRequest<{ taskUid: number }>(`/indexes/${DISCOVERY_INDEX_UID}/documents`, {
    method: "POST",
    body: JSON.stringify(documents)
  });
}

export async function deleteDiscoveryDocuments(ids: string[]) {
  if (ids.length === 0) return { taskUid: null };
  return meiliRequest<{ taskUid: number }>(`/indexes/${DISCOVERY_INDEX_UID}/documents/delete-batch`, {
    method: "POST",
    body: JSON.stringify(ids)
  });
}
