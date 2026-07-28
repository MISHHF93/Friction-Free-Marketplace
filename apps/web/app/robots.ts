import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = publicEnv.NEXT_PUBLIC_APP_URL;

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/browse", "/categories", "/how-it-works", "/safety", "/pricing", "/company", "/contact", "/privacy", "/terms", "/seller", "/listings", "/sellers"],
        disallow: ["/admin", "/api", "/account", "/dashboard", "/customer-portal"]
      }
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl
  };
}
