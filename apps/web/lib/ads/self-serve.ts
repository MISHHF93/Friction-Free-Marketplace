import { AD_PLACEMENT_KEYS, type AdPlacementKey } from "@/lib/ads/placements";

export const AD_STATUSES = [
  "draft",
  "pending_payment",
  "paid_pending_review",
  "approved",
  "active",
  "rejected",
  "expired"
] as const;

export type AdStatus = (typeof AD_STATUSES)[number];

export const SERVABLE_AD_STATUSES: readonly AdStatus[] = ["approved", "active"];

export const AD_CHECKOUT_KIND = "ad_campaign";

/** Placements a self-serve advertiser can buy, grouped the way the advertise form shows them. */
export const SELF_SERVE_PLACEMENT_GROUPS: Array<{ label: string; keys: AdPlacementKey[] }> = [
  { label: "Home", keys: ["home_top_banner", "home_inline"] },
  { label: "Search", keys: ["search_inline"] },
  { label: "Category", keys: ["category_top"] },
  { label: "Listing", keys: ["listing_detail_below"] },
  { label: "Dashboard", keys: ["dashboard_card"] }
];

export const RUN_LENGTH_OPTIONS = [1, 3, 7, 14, 30] as const;

export type AdPricingRow = {
  placement: AdPlacementKey;
  price_cents_per_day: number;
  currency: string;
  min_days: number;
  max_days: number;
  is_placeholder: boolean;
  self_serve_enabled: boolean;
};

/**
 * Placeholder prices, mirrored from the r12 migration. These are NOT final prices.
 * The owner sets real prices in /admin/ads/pricing. Only used to render the form in
 * local demo and e2e mode; checkout always prices from the ad_pricing table.
 */
export const PLACEHOLDER_AD_PRICING: Record<AdPlacementKey, AdPricingRow> = {
  home_top_banner: { placement: "home_top_banner", price_cents_per_day: 2000, currency: "usd", min_days: 1, max_days: 30, is_placeholder: true, self_serve_enabled: true },
  home_inline: { placement: "home_inline", price_cents_per_day: 1500, currency: "usd", min_days: 1, max_days: 30, is_placeholder: true, self_serve_enabled: true },
  search_inline: { placement: "search_inline", price_cents_per_day: 1500, currency: "usd", min_days: 1, max_days: 30, is_placeholder: true, self_serve_enabled: true },
  category_top: { placement: "category_top", price_cents_per_day: 1000, currency: "usd", min_days: 1, max_days: 30, is_placeholder: true, self_serve_enabled: true },
  listing_detail_below: { placement: "listing_detail_below", price_cents_per_day: 800, currency: "usd", min_days: 1, max_days: 30, is_placeholder: true, self_serve_enabled: true },
  dashboard_card: { placement: "dashboard_card", price_cents_per_day: 500, currency: "usd", min_days: 1, max_days: 30, is_placeholder: true, self_serve_enabled: true }
};

export function isAdStatus(value: unknown): value is AdStatus {
  return typeof value === "string" && (AD_STATUSES as readonly string[]).includes(value);
}

export function quoteAdPrice(pricing: Pick<AdPricingRow, "price_cents_per_day" | "min_days" | "max_days" | "self_serve_enabled">, runDays: number) {
  if (!pricing.self_serve_enabled) throw new Error("This placement is not open for self-serve ads.");
  if (!Number.isInteger(runDays) || runDays < pricing.min_days || runDays > pricing.max_days) {
    throw new Error(`Choose a run length between ${pricing.min_days} and ${pricing.max_days} days.`);
  }
  const perDay = Math.round(pricing.price_cents_per_day);
  if (!Number.isInteger(perDay) || perDay < 100) throw new Error("This placement has no valid price.");
  return perDay * runDays;
}

const DAY_MS = 86_400_000;

/** Start of the chosen calendar day (UTC), never earlier than now. */
export function buildAdWindow(startDate: string, runDays: number, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) throw new Error("Choose a start date.");
  const day = new Date(`${startDate}T00:00:00.000Z`);
  if (Number.isNaN(day.valueOf())) throw new Error("Choose a valid start date.");
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (day < today) throw new Error("The start date cannot be in the past.");
  if (day.valueOf() - today.valueOf() > 90 * DAY_MS) throw new Error("Start within the next 90 days.");
  const start = day < now ? now : day;
  return { starts_at: start.toISOString(), ends_at: new Date(start.valueOf() + runDays * DAY_MS).toISOString() };
}

/** When an approval lands after the planned start, the advertiser still gets the full run. */
export function windowOnApproval(startsAt: string, runDays: number, now = new Date()) {
  const start = new Date(startsAt);
  const effective = Number.isNaN(start.valueOf()) || start < now ? now : start;
  return {
    starts_at: effective.toISOString(),
    ends_at: new Date(effective.valueOf() + runDays * DAY_MS).toISOString(),
    status: (effective <= now ? "active" : "approved") as AdStatus
  };
}

const transitions: Record<AdStatus, AdStatus[]> = {
  draft: ["pending_payment"],
  pending_payment: ["pending_payment", "paid_pending_review", "draft"],
  paid_pending_review: ["approved", "active", "rejected"],
  approved: ["active", "expired"],
  active: ["expired"],
  rejected: [],
  expired: []
};

export function canTransitionAd(from: AdStatus, to: AdStatus) {
  return transitions[from].includes(to);
}

export function advertiserStatusLabel(status: AdStatus, startsAt: string, endsAt: string | null, now = new Date()) {
  switch (status) {
    case "draft":
      return "Draft. Payment not started";
    case "pending_payment":
      return "Waiting for payment";
    case "paid_pending_review":
      return "Paid. In review";
    case "approved":
      return new Date(startsAt) > now ? "Approved. Scheduled" : "Approved";
    case "active":
      return endsAt && new Date(endsAt) <= now ? "Ended" : "Live";
    case "rejected":
      return "Rejected. Refund issued";
    case "expired":
      return "Ended";
  }
}

export function formatCents(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

export function ctrLabel(impressions: number, clicks: number) {
  if (!impressions) return "—";
  return `${((clicks / impressions) * 100).toFixed(2)}%`;
}

export function normalizePricingRows(rows: unknown[]): AdPricingRow[] {
  const out: AdPricingRow[] = [];
  for (const raw of rows) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const placement = String(row.placement ?? "");
    if (!(AD_PLACEMENT_KEYS as readonly string[]).includes(placement)) continue;
    out.push({
      placement: placement as AdPlacementKey,
      price_cents_per_day: Number(row.price_cents_per_day ?? 0),
      currency: String(row.currency ?? "usd").toLowerCase(),
      min_days: Number(row.min_days ?? 1),
      max_days: Number(row.max_days ?? 30),
      is_placeholder: Boolean(row.is_placeholder),
      self_serve_enabled: row.self_serve_enabled !== false
    });
  }
  return out.sort((a, b) => AD_PLACEMENT_KEYS.indexOf(a.placement) - AD_PLACEMENT_KEYS.indexOf(b.placement));
}

export function validateAdvertiserTarget(url: string) {
  const trimmed = url.trim();
  if (trimmed.length > 2000) return null;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || !parsed.hostname.includes(".")) return null;
  return parsed.toString();
}
