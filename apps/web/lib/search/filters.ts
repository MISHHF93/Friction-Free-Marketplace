import { discoverySearchParamsSchema, discoverySortSchema, type DiscoverySearchParams, type DiscoverySort } from "@/lib/search/schema";

export type DiscoverySearchParamRecord = Record<string, string | string[] | undefined>;

export const discoveryPageSize = 18;

export const discoverySortOptions: Array<{ value: DiscoverySort; label: string; description: string }> = [
  { value: "recommended", label: "Recommended", description: "Trust, relevance, value, and conversion signals" },
  { value: "newest", label: "Newest", description: "Latest active listings first" },
  { value: "closest", label: "Closest", description: "Uses radius when coordinates are supplied" },
  { value: "price_low", label: "Price: low", description: "Lowest price first" },
  { value: "price_high", label: "Price: high", description: "Highest price first" },
  { value: "best_value", label: "Best value", description: "Price advantage plus seller quality" },
  { value: "safest_seller", label: "Safest seller", description: "Trust, low risk, completed sales" },
  { value: "trending", label: "Trending", description: "Views, saves, and freshness signals" }
];

export const discoveryConditionOptions = ["New", "Like new", "Excellent", "Good", "Fair"];

export const discoveryCategorySlugs = [
  "vehicles",
  "electronics",
  "furniture",
  "home",
  "fashion",
  "tools",
  "real-estate",
  "services",
  "collectibles",
  "sports",
  "baby-kids",
  "free-items",
  "outdoors",
  "books-media"
];

export function firstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function optionalString(value: string | string[] | null | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() || undefined;
}

function optionalNumber(value: string | string[] | null | undefined) {
  const raw = optionalString(value);
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function optionalBoolean(value: string | string[] | null | undefined) {
  const raw = optionalString(value);
  if (!raw) return undefined;
  return raw === "true" || raw === "1" || raw === "on";
}

function optionalList(value: string | string[] | null | undefined) {
  const raw = Array.isArray(value) ? value.join(",") : value;
  return raw ? raw.split(",").map((item) => item.trim()).filter(Boolean) : undefined;
}

function optionalFulfillment(value: string | string[] | null | undefined): DiscoverySearchParams["fulfillment"] {
  const raw = optionalString(value);
  return raw === "pickup" || raw === "delivery" || raw === "any" ? raw : undefined;
}

function optionalSort(value: string | string[] | null | undefined, fallback: DiscoverySort): DiscoverySort {
  const raw = optionalString(value);
  return discoverySortSchema.catch(fallback).parse(raw ?? fallback);
}

export function normalizeDiscoveryParams(input: Partial<DiscoverySearchParams>, defaults: Partial<DiscoverySearchParams> = {}) {
  return discoverySearchParamsSchema.parse({
    ...defaults,
    ...input,
    page: Math.max(input.page ?? defaults.page ?? 1, 1),
    limit: input.limit ?? defaults.limit ?? discoveryPageSize
  });
}

export function parseDiscoveryParamsFromRecord(searchParams: DiscoverySearchParamRecord, defaults: Partial<DiscoverySearchParams> = {}) {
  return normalizeDiscoveryParams({
    q: optionalString(searchParams.q),
    intent: optionalString(searchParams.intent),
    category: optionalString(searchParams.category),
    location: optionalString(searchParams.location),
    lat: optionalNumber(searchParams.lat),
    lng: optionalNumber(searchParams.lng),
    radiusMiles: optionalNumber(searchParams.radiusMiles),
    minPrice: optionalNumber(searchParams.minPrice),
    maxPrice: optionalNumber(searchParams.maxPrice),
    condition: optionalList(searchParams.condition),
    minSellerTrust: optionalNumber(searchParams.minSellerTrust),
    verifiedOnly: optionalBoolean(searchParams.verifiedOnly),
    paymentProtection: optionalBoolean(searchParams.paymentProtection),
    fulfillment: optionalFulfillment(searchParams.fulfillment),
    sort: optionalSort(searchParams.sort, defaults.sort ?? "recommended"),
    page: optionalNumber(searchParams.page),
    limit: optionalNumber(searchParams.limit),
    sessionId: optionalString(searchParams.sessionId)
  }, defaults);
}

export function parseDiscoveryParamsFromUrl(url: URL, defaults: Partial<DiscoverySearchParams> = {}) {
  return parseDiscoveryParamsFromRecord(Object.fromEntries(url.searchParams.entries()), defaults);
}

export function serializeDiscoveryParams(params: DiscoverySearchParams, overrides: Partial<Record<keyof DiscoverySearchParams, string | number | boolean | string[] | undefined>> = {}) {
  const query = new URLSearchParams();
  const merged: Record<string, unknown> = { ...params, ...overrides };

  for (const [key, value] of Object.entries(merged)) {
    if (value === undefined || value === "" || value === false || key === "limit") continue;
    if (Array.isArray(value)) {
      if (value.length > 0) query.set(key, value.join(","));
    } else {
      query.set(key, String(value));
    }
  }

  return query.toString();
}

export function discoveryParamEntries(params: DiscoverySearchParams, omit: Array<keyof DiscoverySearchParams> = []) {
  return Object.entries(params).flatMap(([key, value]) => {
    if (omit.includes(key as keyof DiscoverySearchParams) || value === undefined || value === "" || value === false || key === "limit") return [];
    return [[key, Array.isArray(value) ? value.join(",") : String(value)] as const];
  });
}

export function titleizeDiscoveryValue(value: string) {
  return value.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getDiscoveryActiveChips(params: DiscoverySearchParams) {
  return [
    params.q ? { label: "Search", value: params.q } : undefined,
    params.category ? { label: "Category", value: titleizeDiscoveryValue(params.category) } : undefined,
    params.location ? { label: "Location", value: params.location } : undefined,
    params.minPrice !== undefined ? { label: "From", value: `$${params.minPrice}` } : undefined,
    params.maxPrice !== undefined ? { label: "To", value: `$${params.maxPrice}` } : undefined,
    params.condition?.length ? { label: "Condition", value: params.condition.join(", ") } : undefined,
    params.minSellerTrust !== undefined ? { label: "Trust", value: `${params.minSellerTrust}+` } : undefined,
    params.verifiedOnly ? { label: "Verified", value: "Yes" } : undefined,
    params.paymentProtection ? { label: "Protected checkout", value: "Likely" } : undefined,
    params.fulfillment && params.fulfillment !== "any" ? { label: "Fulfillment", value: titleizeDiscoveryValue(params.fulfillment) } : undefined
  ].filter((chip): chip is { label: string; value: string } => Boolean(chip));
}
