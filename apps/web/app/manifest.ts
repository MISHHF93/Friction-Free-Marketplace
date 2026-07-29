import type { MetadataRoute } from "next";
import { brandChrome, brandProfile } from "@/lib/brand-profile";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: brandProfile.legalName,
    short_name: brandProfile.shortName,
    description: brandProfile.promise,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: brandChrome.canvas,
    theme_color: brandChrome.lumenBlue,
    orientation: "any",
    categories: ["shopping", "business"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any"
      },
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      },
      {
        src: "/icon-1024.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "any"
      }
    ]
  };
}
