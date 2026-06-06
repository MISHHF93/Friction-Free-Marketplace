import { createAdminClient } from "@/lib/supabase/admin";
import { listings as demoListings } from "@/lib/marketplace-data";
import { rowToDiscoveryDocument, searchMarketplace, type DiscoveryResult } from "@/lib/search/discovery";
import type { DiscoveryDocument } from "@/lib/search/schema";

type Row = Record<string, unknown>;

export type PublicCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  listingCount: number;
};

export type SellerProfile = {
  id: string;
  displayName: string;
  username: string | null;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  locationLabel: string | null;
  headline: string | null;
  responseTimeMinutes: number | null;
  trustScore: number;
  sellerScore: number;
  completedTransactions: number;
  reviewCount: number;
  fraudRiskLevel: string;
  source: "database" | "demo";
};

export type TrustSafetyStats = {
  source: "database" | "demo";
  activeListings: number;
  trustedSellers: number;
  completedTransactions: number;
  lowRiskRate: number;
};

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function demoCategoryRows(): PublicCategory[] {
  const counts = new Map<string, number>();
  for (const listing of demoListings) {
    const slug = listing.category.toLowerCase().replace(/\s+/g, "-");
    counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }

  return [
    { slug: "electronics", name: "Electronics", description: "Cameras, computers, smart home gear, and trusted devices." },
    { slug: "home", name: "Home", description: "Furniture, decor, appliances, and local pickup home goods." },
    { slug: "outdoors", name: "Outdoors", description: "Bikes, camping gear, tools, and active lifestyle finds." },
    { slug: "vehicles", name: "Vehicles", description: "Cars, bikes, powersports, parts, and transport listings." },
    { slug: "collectibles", name: "Collectibles", description: "Rare goods, media, memorabilia, and authenticated finds." }
  ].map((category, index) => ({ id: `demo-${category.slug}`, listingCount: counts.get(category.slug) ?? (index < 3 ? 1 : 0), ...category }));
}

export async function getFeaturedListings(limit = 6): Promise<DiscoveryResult> {
  return searchMarketplace({ sort: "recommended", limit });
}

export async function getPublicCategories(limit = 8): Promise<{ categories: PublicCategory[]; source: "database" | "demo" }> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await (supabase as any)
      .from("categories")
      .select("id, slug, name, description, sort_order, listings:listing_search_documents(count)")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(limit);

    if (error) throw error;

    const categories = ((data ?? []) as Row[]).map((row) => ({
      id: stringValue(row.id, stringValue(row.slug)),
      slug: stringValue(row.slug, "other"),
      name: stringValue(row.name, "Other"),
      description: typeof row.description === "string" ? row.description : null,
      listingCount: Array.isArray(row.listings) ? numberValue((row.listings[0] as Row | undefined)?.count) : 0
    }));

    return { categories: categories.length ? categories : demoCategoryRows().slice(0, limit), source: categories.length ? "database" : "demo" };
  } catch {
    return { categories: demoCategoryRows().slice(0, limit), source: "demo" };
  }
}

export async function getCategoryPage(slug: string) {
  const [{ categories, source }, listings] = await Promise.all([
    getPublicCategories(20),
    searchMarketplace({ category: slug, sort: "recommended", limit: 18 })
  ]);
  const category = categories.find((item) => item.slug === slug) ?? {
    id: slug,
    slug,
    name: slug.split("-").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" "),
    description: "Trusted listings in this marketplace category.",
    listingCount: listings.total
  };

  return { category: { ...category, listingCount: listings.total || category.listingCount }, listings, categories, source };
}

export async function getListingById(id: string): Promise<DiscoveryDocument | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await (supabase as any).from("listing_search_documents").select("*").eq("id", id).eq("status", "active").maybeSingle();
    if (error) throw error;
    if (data) return rowToDiscoveryDocument(data as Row);
  } catch {
    // Fall back below.
  }

  const result = await searchMarketplace({ limit: 200 });
  return result.listings.find((listing) => listing.id === id) ?? null;
}

export async function getSellerProfile(id: string): Promise<{ seller: SellerProfile | null; listings: DiscoveryDocument[] }> {
  try {
    const supabase = createAdminClient();
    const [{ data: profile, error: profileError }, { data: trust, error: trustError }, { data: listingRows, error: listingsError }] = await Promise.all([
      (supabase as any).from("profiles").select("user_id, display_name, username, bio, avatar_url, banner_url, location_label, seller_headline, response_time_minutes").eq("user_id", id).maybeSingle(),
      (supabase as any).from("trust_scores").select("score, seller_score, completed_transactions, review_count, fraud_risk_level").eq("user_id", id).maybeSingle(),
      (supabase as any).from("listing_search_documents").select("*").eq("seller_id", id).eq("status", "active").order("published_at", { ascending: false }).limit(12)
    ]);

    if (profileError || trustError || listingsError) throw profileError ?? trustError ?? listingsError;
    if (profile) {
      const trustRow = (trust ?? {}) as Row;
      return {
        seller: {
          id,
          displayName: stringValue((profile as Row).display_name, "Verified seller"),
          username: typeof (profile as Row).username === "string" ? (profile as Row).username as string : null,
          bio: typeof (profile as Row).bio === "string" ? (profile as Row).bio as string : null,
          avatarUrl: typeof (profile as Row).avatar_url === "string" ? (profile as Row).avatar_url as string : null,
          bannerUrl: typeof (profile as Row).banner_url === "string" ? (profile as Row).banner_url as string : null,
          locationLabel: typeof (profile as Row).location_label === "string" ? (profile as Row).location_label as string : null,
          headline: typeof (profile as Row).seller_headline === "string" ? (profile as Row).seller_headline as string : null,
          responseTimeMinutes: numberValue((profile as Row).response_time_minutes, 0) || null,
          trustScore: numberValue(trustRow.score, 0),
          sellerScore: numberValue(trustRow.seller_score, 0),
          completedTransactions: numberValue(trustRow.completed_transactions, 0),
          reviewCount: numberValue(trustRow.review_count, 0),
          fraudRiskLevel: stringValue(trustRow.fraud_risk_level, "low"),
          source: "database"
        },
        listings: ((listingRows ?? []) as Row[]).map(rowToDiscoveryDocument)
      };
    }
  } catch {
    // Fall back below.
  }

  const all = await searchMarketplace({ limit: 200 });
  const sellerListings = all.listings.filter((listing) => listing.seller_id === id || listing.seller_display_name.toLowerCase().replace(/\s+/g, "-") === id);
  const first = sellerListings[0] ?? all.listings[0];
  if (!first) return { seller: null, listings: [] };

  return {
    seller: {
      id: first.seller_id,
      displayName: first.seller_display_name,
      username: first.seller_display_name.toLowerCase().replace(/\s+/g, "-"),
      bio: "Trusted marketplace seller with escrow-ready checkout, verified listing practices, and responsive buyer communication.",
      avatarUrl: null,
      bannerUrl: null,
      locationLabel: first.location_label,
      headline: "Verified seller focused on transparent, low-friction deals.",
      responseTimeMinutes: 45,
      trustScore: first.seller_trust_score,
      sellerScore: first.safety_score,
      completedTransactions: first.seller_completed_transactions,
      reviewCount: Math.max(6, Math.round(first.seller_completed_transactions / 2)),
      fraudRiskLevel: first.seller_fraud_risk_level,
      source: "demo"
    },
    listings: sellerListings.length ? sellerListings : all.listings.slice(0, 3)
  };
}

export async function getTrustSafetyStats(): Promise<TrustSafetyStats> {
  try {
    const supabase = createAdminClient();
    const [{ count: activeListings }, { data: scores, error }] = await Promise.all([
      (supabase as any).from("listings").select("id", { count: "exact", head: true }).eq("status", "active").is("deleted_at", null),
      (supabase as any).from("trust_scores").select("score, completed_transactions, fraud_risk_level").limit(500)
    ]);

    if (error) throw error;
    const scoreRows = (scores ?? []) as Row[];
    const trustedSellers = scoreRows.filter((row) => numberValue(row.score) >= 85).length;
    const completedTransactions = scoreRows.reduce((sum, row) => sum + numberValue(row.completed_transactions), 0);
    const lowRisk = scoreRows.filter((row) => stringValue(row.fraud_risk_level, "low") === "low").length;

    return {
      source: "database",
      activeListings: activeListings ?? 0,
      trustedSellers,
      completedTransactions,
      lowRiskRate: scoreRows.length ? Math.round((lowRisk / scoreRows.length) * 100) : 100
    };
  } catch {
    return { source: "demo", activeListings: demoListings.length, trustedSellers: 3, completedTransactions: 86, lowRiskRate: 98 };
  }
}
