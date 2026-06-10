import { discoverySearchParamsSchema, type DiscoverySearchParams } from "@/lib/search/schema";
import { parseDiscoveryParamsFromUrl } from "@/lib/search/filters";

export function parseDiscoverySearchParamsFromUrl(url: URL): DiscoverySearchParams {
  return parseDiscoveryParamsFromUrl(url, { sort: "newest" });
}

export async function parseDiscoverySearchParamsFromRequest(request: Request): Promise<DiscoverySearchParams> {
  const body = await request.json();
  return discoverySearchParamsSchema.parse(body);
}
