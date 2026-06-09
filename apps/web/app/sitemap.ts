import type { MetadataRoute } from "next";
import { publicCategories } from "@/lib/public-site";
import { publicEnv } from "@/lib/env";

const staticRoutes = [
  "",
  "/browse",
  "/categories",
  "/how-it-works",
  "/safety",
  "/pricing",
  "/company",
  "/contact",
  "/seller",
  "/search"
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = publicEnv.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const now = new Date();
  const categoryRoutes = publicCategories.map((category) => `/categories/${category.slug}`);

  return [...staticRoutes, ...categoryRoutes].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "" || route === "/browse" ? "daily" : "weekly",
    priority: route === "" ? 1 : route === "/browse" ? 0.9 : route.startsWith("/categories") ? 0.8 : 0.6
  }));
}
