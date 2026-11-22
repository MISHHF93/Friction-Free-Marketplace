import { publicEnv } from "@/lib/env";
import { AD_CREATIVES_BUCKET } from "@/lib/ads/placements";

export function adCreativeSrc(imagePath: string): string | null {
  const path = imagePath.trim();
  if (!path || path.includes("..")) return null;
  if (path.startsWith("/") && !path.startsWith("//")) return path;
  if (/^https:\/\//i.test(path)) return path;
  const base = publicEnv.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${AD_CREATIVES_BUCKET}/${path.replace(/^\/+/, "")}`;
}
