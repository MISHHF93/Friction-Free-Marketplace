import { discoverySearchParamsSchema, discoverySortSchema, type DiscoverySearchParams } from "@/lib/search/schema";

function optionalString(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function optionalNumber(value: FormDataEntryValue | null) {
  const raw = optionalString(value);
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function optionalBoolean(value: FormDataEntryValue | null) {
  const raw = optionalString(value);
  if (!raw) return undefined;
  return raw === "true" || raw === "1" || raw === "on";
}

function optionalList(value: FormDataEntryValue | null) {
  const raw = optionalString(value);
  return raw ? raw.split(",").map((item) => item.trim()).filter(Boolean) : undefined;
}

export function parseDiscoverySearchParamsFromUrl(url: URL): DiscoverySearchParams {
  return discoverySearchParamsSchema.parse({
    q: optionalString(url.searchParams.get("q")),
    intent: optionalString(url.searchParams.get("intent")),
    category: optionalString(url.searchParams.get("category")),
    location: optionalString(url.searchParams.get("location")),
    lat: optionalNumber(url.searchParams.get("lat")),
    lng: optionalNumber(url.searchParams.get("lng")),
    radiusMiles: optionalNumber(url.searchParams.get("radiusMiles")),
    minPrice: optionalNumber(url.searchParams.get("minPrice")),
    maxPrice: optionalNumber(url.searchParams.get("maxPrice")),
    condition: optionalList(url.searchParams.get("condition")),
    minSellerTrust: optionalNumber(url.searchParams.get("minSellerTrust")),
    verifiedOnly: optionalBoolean(url.searchParams.get("verifiedOnly")),
    paymentProtection: optionalBoolean(url.searchParams.get("paymentProtection")),
    fulfillment: optionalString(url.searchParams.get("fulfillment")),
    sort: discoverySortSchema.catch("newest").parse(url.searchParams.get("sort") ?? "newest"),
    page: optionalNumber(url.searchParams.get("page")),
    limit: optionalNumber(url.searchParams.get("limit")),
    sessionId: optionalString(url.searchParams.get("sessionId")),
  });
}

export async function parseDiscoverySearchParamsFromRequest(request: Request): Promise<DiscoverySearchParams> {
  const body = await request.json();
  return discoverySearchParamsSchema.parse(body);
}
