import { z } from "zod";
import { discoveryCategorySlugs } from "@/lib/search/filters";
import type { DiscoverySearchParams } from "@/lib/search/schema";

const categoryAliases: Record<string, string[]> = {
  vehicles: ["car", "truck", "suv", "motorcycle", "bike", "bicycle", "vehicle", "tires", "wheels", "auto parts"],
  electronics: ["phone", "iphone", "android", "laptop", "computer", "tablet", "camera", "tv", "television", "console", "switch", "playstation", "xbox", "headphones", "speaker"],
  furniture: ["sofa", "couch", "chair", "desk", "table", "bed", "dresser", "cabinet", "shelf", "furniture"],
  home: ["appliance", "washer", "dryer", "fridge", "refrigerator", "microwave", "vacuum", "decor", "kitchen", "household"],
  fashion: ["shirt", "jacket", "dress", "shoes", "sneakers", "bag", "handbag", "watch", "jewelry", "clothing"],
  tools: ["drill", "saw", "wrench", "tool", "compressor", "generator", "workbench", "ladder"],
  "real-estate": ["apartment", "condo", "house", "room", "rental", "rent", "workspace", "property", "real estate"],
  services: ["service", "repair", "cleaning", "moving", "installation", "delivery help", "tutor", "contractor"],
  collectibles: ["collectible", "memorabilia", "trading card", "graded card", "antique", "rare", "comic", "figurine"],
  sports: ["sports", "fitness", "gym", "weights", "golf", "hockey", "soccer", "basketball", "ski", "snowboard"],
  "baby-kids": ["baby", "kids", "child", "stroller", "crib", "toy", "car seat"],
  "free-items": ["free", "giveaway", "curb alert"],
  outdoors: ["camping", "tent", "kayak", "canoe", "hiking", "outdoor", "patio", "garden"],
  "books-media": ["book", "books", "vinyl", "record", "dvd", "blu-ray", "cd", "music", "movie", "itunes"],
};

const conditionAliases: Array<{ value: string[]; phrases: string[] }> = [
  { value: ["New"], phrases: ["brand new", "sealed", "unopened", "new"] },
  { value: ["Like new"], phrases: ["like new", "mint"] },
  { value: ["Excellent"], phrases: ["excellent"] },
  { value: ["Good"], phrases: ["good condition", "used"] },
  { value: ["Fair"], phrases: ["fair", "needs repair", "for parts"] },
];

export const itemClassificationSchema = z.object({
  originalQuery: z.string(),
  rewrittenQuery: z.string(),
  category: z.enum(discoveryCategorySlugs as [string, ...string[]]).optional(),
  categoryConfidence: z.number().min(0).max(1),
  categoryEvidence: z.array(z.string()).max(8),
  filters: z.object({
    category: z.string().optional(),
    minPrice: z.number().nonnegative().optional(),
    maxPrice: z.number().nonnegative().optional(),
    minSellerTrust: z.number().min(0).max(100).optional(),
    condition: z.array(z.string()).optional(),
    fulfillment: z.enum(["pickup", "delivery", "any"]).optional(),
  }),
  safetySignals: z.array(z.enum(["gift_card", "off_platform_payment", "regulated_goods"])),
  source: z.enum(["deterministic", "hybrid"]),
});

export type ItemClassification = z.infer<typeof itemClassificationSchema>;

function normalizedText(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[^\p{L}\p{N}\s$€£¥.,'-]/gu, " ").replace(/\s+/g, " ").trim();
}

function priceNumber(value: string) {
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export function classifyMarketplaceItem(query: string): ItemClassification {
  const normalized = normalizedText(query);
  const scores = new Map<string, { score: number; evidence: string[] }>();

  for (const [category, aliases] of Object.entries(categoryAliases)) {
    const evidence = aliases.filter((alias) => normalized.includes(alias));
    if (evidence.length) scores.set(category, { score: evidence.reduce((score, alias) => score + (alias.includes(" ") ? 2 : 1), 0), evidence });
  }

  const ranked = [...scores.entries()].sort((a, b) => b[1].score - a[1].score);
  const top = ranked[0];
  const total = ranked.reduce((sum, [, value]) => sum + value.score, 0);
  const category = top?.[0];
  const categoryConfidence = top ? Math.min(0.98, 0.5 + (top[1].score / Math.max(total, 1)) * 0.45) : 0.15;

  const range = normalized.match(/(?:between|from)\s*[$€£¥]?\s*([\d,.]+)\s*(?:and|to|-)\s*[$€£¥]?\s*([\d,.]+)/);
  const maximum = normalized.match(/(?:under|below|less than|up to|maximum|max)\s*[$€£¥]?\s*([\d,.]+)/);
  const minimum = normalized.match(/(?:over|above|more than|at least|minimum|min)\s*[$€£¥]?\s*([\d,.]+)/);
  const condition = conditionAliases.find((entry) => entry.phrases.some((phrase) => normalized.includes(phrase)))?.value;
  const fulfillment = normalized.includes("pickup")
    ? "pickup" as const
    : normalized.includes("delivery") || normalized.includes("shipped") || normalized.includes("shipping")
      ? "delivery" as const
      : undefined;
  const safetySignals: ItemClassification["safetySignals"] = [];
  if (/\b(gift card|itunes card|steam card|prepaid card)\b/.test(normalized)) safetySignals.push("gift_card");
  if (/\b(crypto only|wire transfer|western union|pay outside|off platform)\b/.test(normalized)) safetySignals.push("off_platform_payment");
  if (/\b(firearm|weapon|ammunition|prescription)\b/.test(normalized)) safetySignals.push("regulated_goods");

  const rewrittenQuery = normalized
    .replace(/(?:between|from)\s*[$€£¥]?\s*[\d,.]+\s*(?:and|to|-)\s*[$€£¥]?\s*[\d,.]+/g, "")
    .replace(/(?:under|below|less than|up to|maximum|max|over|above|more than|at least|minimum|min)\s*[$€£¥]?\s*[\d,.]+/g, "")
    .replace(/\s+/g, " ")
    .trim() || normalized;

  return itemClassificationSchema.parse({
    originalQuery: query,
    rewrittenQuery,
    category,
    categoryConfidence,
    categoryEvidence: top?.[1].evidence ?? [],
    filters: {
      category,
      minPrice: range ? priceNumber(range[1]) : minimum ? priceNumber(minimum[1]) : undefined,
      maxPrice: range ? priceNumber(range[2]) : maximum ? priceNumber(maximum[1]) : undefined,
      minSellerTrust: /\b(safe|trusted|verified)\b/.test(normalized) ? 85 : undefined,
      condition,
      fulfillment,
    },
    safetySignals,
    source: "deterministic",
  });
}

/**
 * Adds high-confidence inferred filters without replacing choices made
 * explicitly by the shopper. No model, network call, or API key is required.
 */
export function enrichSearchParamsWithClassification(params: DiscoverySearchParams): DiscoverySearchParams {
  if (!params.q?.trim()) return params;

  const classification = classifyMarketplaceItem(params.q);
  const inferred = classification.filters;
  const confidentCategory = classification.categoryConfidence >= 0.8 ? inferred.category : undefined;
  const cleanedQuery = classification.rewrittenQuery
    .replace(/\b(?:safe|trusted|verified)\b/g, "")
    .replace(/\b(?:with\s+)?(?:pickup|delivery|shipping|shipped)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return {
    ...params,
    q: cleanedQuery || params.q,
    category: params.category ?? confidentCategory,
    minPrice: params.minPrice ?? inferred.minPrice,
    maxPrice: params.maxPrice ?? inferred.maxPrice,
    condition: params.condition ?? inferred.condition,
    minSellerTrust: params.minSellerTrust ?? inferred.minSellerTrust,
    fulfillment: params.fulfillment ?? inferred.fulfillment,
  };
}
