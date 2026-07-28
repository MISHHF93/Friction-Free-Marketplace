import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Friction-Free Marketplace",
    short_name: "FF Marketplace",
    description: "AI-powered trusted commerce for buyers and sellers.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#047857",
    orientation: "any",
    categories: ["shopping", "business"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-1024.png", sizes: "1024x1024", type: "image/png", purpose: "maskable" }
    ]
  };
}
