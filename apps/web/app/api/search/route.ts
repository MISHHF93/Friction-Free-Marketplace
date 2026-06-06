import { NextResponse } from "next/server";
import { searchMarketplace } from "@/lib/search/discovery";
import type { DiscoverySearchParams, DiscoverySort } from "@/lib/search/schema";

function list(value: string | null) {
  return value ? value.split(",").map((item) => item.trim()).filter(Boolean) : undefined;
}

function number(value: string | null) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function paramsFromUrl(url: URL): DiscoverySearchParams {
  return {
    q: url.searchParams.get("q") ?? undefined,
    category: url.searchParams.get("category") ?? undefined,
    location: url.searchParams.get("location") ?? undefined,
    lat: number(url.searchParams.get("lat")),
    lng: number(url.searchParams.get("lng")),
    radiusMiles: number(url.searchParams.get("radiusMiles")),
    minPrice: number(url.searchParams.get("minPrice")),
    maxPrice: number(url.searchParams.get("maxPrice")),
    condition: list(url.searchParams.get("condition")),
    minSellerTrust: number(url.searchParams.get("minSellerTrust")),
    sort: (url.searchParams.get("sort") as DiscoverySort | null) ?? "newest",
    page: number(url.searchParams.get("page")),
    limit: number(url.searchParams.get("limit"))
  };
}

export async function GET(request: Request) {
  const result = await searchMarketplace(paramsFromUrl(new URL(request.url)));
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const body = (await request.json()) as DiscoverySearchParams;
  const result = await searchMarketplace(body);
  return NextResponse.json(result);
}
