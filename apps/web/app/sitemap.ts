import type { MetadataRoute } from "next";
import { publicCategories } from "@/lib/public-site";
import { publicEnv } from "@/lib/env";
import { getPublicListingParams, getPublicSellerParams } from "@/lib/public-marketplace";

const staticRoutes = [
  "",
  "/browse",
  "/categories",
  "/how-it-works",
  "/safety",
  "/pricing",
  "/company",
  "/contact",
  "/privacy",
  "/terms",
  "/seller",
  "/search"
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = publicEnv.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const now = new Date();
  const [listings, sellers] = await Promise.all([
    getPublicListingParams(100).catch(() => []),
    getPublicSellerParams(100).catch(() => [])
  ]);
  const categoryRoutes = publicCategories.map((category) => `/categories/${category.slug}`);
  const listingRoutes = listings.map((listing) => `/listings/${listing.id}`);
  const sellerRoutes = sellers.map((seller) => `/sellers/${seller.id}`);

  return [...staticRoutes, ...categoryRoutes, ...listingRoutes, ...sellerRoutes].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "" || route === "/browse" ? "daily" : "weekly",
    priority: route === "" ? 1 : route === "/browse" ? 0.9 : route.startsWith("/categories") ? 0.8 : 0.6
  }));
}
