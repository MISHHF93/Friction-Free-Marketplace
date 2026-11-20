import { isDemoMarketplaceDataEnabled } from "@/lib/marketplace/demo-mode";

export async function loadDemoListings() {
  if (process.env.NODE_ENV === "production") return [];
  if (!isDemoMarketplaceDataEnabled()) return [];
  const catalog = await import("@/lib/dev/demo-catalog");
  return catalog.listings;
}
