import { createClient } from "@/lib/supabase/server";
import { searchMarketplace } from "@/lib/search/discovery";
import type { DiscoveryDocument } from "@/lib/search/schema";

type Row = Record<string, any>;

export type FavoriteDashboardItem = DiscoveryDocument & {
  favorited_at: string;
};

export type SavedSearchDashboardItem = {
  id: string;
  name: string;
  query: string | null;
  filters: Record<string, unknown>;
  alert_enabled: boolean;
  alert_frequency: "instant" | "daily" | "weekly" | "never";
  last_notified_at: string | null;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
  match_count: number;
  unread_notification_count: number;
};

export type SavedSearchMatchItem = {
  id: string;
  saved_search_id: string;
  saved_search_name: string;
  listing_id: string;
  listing_title: string;
  listing_price_amount: number;
  listing_location_label: string;
  notification_id: string | null;
  delivered_at: string;
  action_url: string;
  is_unread: boolean;
};

export type SaveStats = {
  favoritesCount: number;
  alertCount: number;
  offerReadyCount: number;
  savedSearchCount: number;
  newMatchCount: number;
  digestCount: number;
};

function rowToDiscoveryDocument(row: Row): DiscoveryDocument {
  return {
    id: String(row.id),
    title: String(row.title ?? "Untitled listing"),
    description: String(row.description ?? ""),
    category_id: row.category_id == null ? null : String(row.category_id),
    category_slug: String(row.category_slug ?? "other"),
    category_name: String(row.category_name ?? "Marketplace"),
    condition: String(row.condition ?? "Unspecified"),
    status: String(row.status ?? "active"),
    price_amount: Number(row.price_amount ?? 0),
    currency: String(row.currency ?? "USD"),
    location_city: typeof row.location_city === "string" ? row.location_city : null,
    location_region: typeof row.location_region === "string" ? row.location_region : null,
    location_country: typeof row.location_country === "string" ? row.location_country : null,
    location_label: typeof row.location_label === "string" ? row.location_label : "Location available after contact",
    latitude: typeof row.latitude === "number" ? row.latitude : null,
    longitude: typeof row.longitude === "number" ? row.longitude : null,
    pickup_available: Boolean(row.pickup_available),
    ships_to: Array.isArray(row.ships_to) ? row.ships_to.map(String) : [],
    seller_id: String(row.seller_id ?? ""),
    seller_display_name: String(row.seller_display_name ?? "Verified seller"),
    seller_trust_score: Number(row.seller_trust_score ?? 0),
    seller_completed_transactions: Number(row.seller_completed_transactions ?? 0),
    seller_fraud_risk_level: String(row.seller_fraud_risk_level ?? "low"),
    image_url: typeof row.image_url === "string" ? row.image_url : null,
    seo_tags: Array.isArray(row.seo_tags) ? row.seo_tags.map(String) : [],
    attributes: Array.isArray(row.attributes) ? row.attributes.map(String) : [],
    view_count: Number(row.view_count ?? 0),
    saved_count: Number(row.saved_count ?? 0),
    purchase_count: Number(row.purchase_count ?? 0),
    trend_score: Number(row.trend_score ?? 0),
    value_score: Number(row.value_score ?? 0),
    safety_score: Number(row.safety_score ?? 0),
    conversion_score: Number(row.conversion_score ?? 0),
    published_at: typeof row.published_at === "string" ? row.published_at : null,
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString())
  };
}

export async function getFavoriteListingIds(userId: string): Promise<Set<string>> {
  try {
    const supabase = createClient();
    const { data, error } = await (supabase as any).from("favorites").select("listing_id").eq("user_id", userId);
    if (error) throw error;
    return new Set((data ?? []).map((row: Row) => String(row.listing_id)));
  } catch {
    return new Set();
  }
}

export async function getFavoritesDashboard(userId: string): Promise<{ favorites: FavoriteDashboardItem[]; stats: Pick<SaveStats, "favoritesCount" | "alertCount" | "offerReadyCount">; source: "database" | "demo" }> {
  try {
    const supabase = createClient();
    const { data: favorites, error: favoritesError } = await (supabase as any)
      .from("favorites")
      .select("listing_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (favoritesError) throw favoritesError;

    const rows = (favorites ?? []) as Row[];
    const ids = rows.map((row) => String(row.listing_id));
    if (!ids.length) return { favorites: [], stats: { favoritesCount: 0, alertCount: 0, offerReadyCount: 0 }, source: "database" };

    const { data: listingRows, error: listingsError } = await (supabase as any).from("listing_search_documents").select("*").in("id", ids);
    if (listingsError) throw listingsError;

    const favoritedAt = new Map(rows.map((row) => [String(row.listing_id), String(row.created_at)]));
    const orderedListings = ((listingRows ?? []) as Row[])
      .map((row) => ({ ...rowToDiscoveryDocument(row), favorited_at: favoritedAt.get(String(row.id)) ?? new Date().toISOString() }))
      .sort((a, b) => Date.parse(b.favorited_at) - Date.parse(a.favorited_at));

    return {
      favorites: orderedListings,
      stats: {
        favoritesCount: orderedListings.length,
        alertCount: orderedListings.filter((listing) => listing.saved_count > 0 || listing.trend_score > 0).length,
        offerReadyCount: orderedListings.filter((listing) => listing.seller_trust_score >= 85).length
      },
      source: "database"
    };
  } catch {
    const demo = (await searchMarketplace({ limit: 6 })).listings.map((listing) => ({ ...listing, favorited_at: listing.updated_at }));
    return { favorites: demo, stats: { favoritesCount: demo.length, alertCount: 3, offerReadyCount: demo.filter((listing) => listing.seller_trust_score >= 85).length }, source: "demo" };
  }
}

async function getRecentSavedSearchMatches(userId: string, searches: SavedSearchDashboardItem[]): Promise<SavedSearchMatchItem[]> {
  const supabase = createClient();
  const { data: deliveries, error } = await (supabase as any)
    .from("saved_search_alert_deliveries")
    .select("id, saved_search_id, listing_id, notification_id, delivered_at")
    .eq("user_id", userId)
    .order("delivered_at", { ascending: false })
    .limit(6);
  if (error) throw error;

  const rows = (deliveries ?? []) as Row[];
  if (!rows.length) return [];

  const searchNameById = new Map(searches.map((search) => [search.id, search.name]));
  const listingIds = Array.from(new Set(rows.map((row) => String(row.listing_id))));
  const notificationIds = Array.from(new Set(rows.map((row) => row.notification_id).filter(Boolean).map(String)));

  const [{ data: listings, error: listingsError }, { data: notifications, error: notificationsError }] = await Promise.all([
    (supabase as any).from("listing_search_documents").select("id, title, price_amount, location_label").in("id", listingIds),
    notificationIds.length
      ? (supabase as any).from("notifications").select("id, action_url, read_at").in("id", notificationIds).eq("user_id", userId)
      : Promise.resolve({ data: [], error: null })
  ]);
  if (listingsError || notificationsError) throw listingsError ?? notificationsError;

  const listingsById = new Map(((listings ?? []) as Row[]).map((listing) => [String(listing.id), listing]));
  const notificationsById = new Map(((notifications ?? []) as Row[]).map((notification) => [String(notification.id), notification]));

  return rows.map((row) => {
    const listing = listingsById.get(String(row.listing_id));
    const notification = row.notification_id ? notificationsById.get(String(row.notification_id)) : undefined;
    return {
      id: String(row.id),
      saved_search_id: String(row.saved_search_id),
      saved_search_name: searchNameById.get(String(row.saved_search_id)) ?? "Saved search",
      listing_id: String(row.listing_id),
      listing_title: String(listing?.title ?? "Matched listing"),
      listing_price_amount: Number(listing?.price_amount ?? 0),
      listing_location_label: String(listing?.location_label ?? "Location available after contact"),
      notification_id: row.notification_id ? String(row.notification_id) : null,
      delivered_at: String(row.delivered_at),
      action_url: typeof notification?.action_url === "string" ? notification.action_url : `/listings/${String(row.listing_id)}`,
      is_unread: !notification?.read_at
    };
  });
}

export async function getSavedSearchesDashboard(userId: string): Promise<{ searches: SavedSearchDashboardItem[]; recentMatches: SavedSearchMatchItem[]; stats: Pick<SaveStats, "savedSearchCount" | "newMatchCount" | "digestCount">; source: "database" | "demo" }> {
  try {
    const supabase = createClient();
    const [{ data: searches, error: searchesError }, { data: deliveries, error: deliveriesError }, { data: notifications, error: notificationsError }] = await Promise.all([
      (supabase as any).from("saved_searches").select("*").eq("user_id", userId).order("updated_at", { ascending: false }),
      (supabase as any).from("saved_search_alert_deliveries").select("saved_search_id").eq("user_id", userId),
      (supabase as any).from("notifications").select("payload, read_at").eq("user_id", userId).eq("type", "saved_search_match")
    ]);
    if (searchesError || deliveriesError || notificationsError) throw searchesError ?? deliveriesError ?? notificationsError;

    const matchCounts = new Map<string, number>();
    for (const delivery of (deliveries ?? []) as Row[]) {
      const id = String(delivery.saved_search_id);
      matchCounts.set(id, (matchCounts.get(id) ?? 0) + 1);
    }

    const unreadCounts = new Map<string, number>();
    for (const notification of (notifications ?? []) as Row[]) {
      if (notification.read_at) continue;
      const id = typeof notification.payload?.saved_search_id === "string" ? notification.payload.saved_search_id : null;
      if (id) unreadCounts.set(id, (unreadCounts.get(id) ?? 0) + 1);
    }

    const mapped = ((searches ?? []) as Row[]).map((row) => ({
      id: String(row.id),
      name: String(row.name),
      query: typeof row.query === "string" ? row.query : null,
      filters: row.filters && typeof row.filters === "object" && !Array.isArray(row.filters) ? row.filters : {},
      alert_enabled: Boolean(row.alert_enabled),
      alert_frequency: row.alert_frequency,
      last_notified_at: typeof row.last_notified_at === "string" ? row.last_notified_at : null,
      last_checked_at: typeof row.last_checked_at === "string" ? row.last_checked_at : null,
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
      match_count: matchCounts.get(String(row.id)) ?? 0,
      unread_notification_count: unreadCounts.get(String(row.id)) ?? 0
    })) as SavedSearchDashboardItem[];

    const recentMatches = await getRecentSavedSearchMatches(userId, mapped);

    return {
      searches: mapped,
      recentMatches,
      stats: {
        savedSearchCount: mapped.length,
        newMatchCount: mapped.reduce((sum, search) => sum + search.unread_notification_count, 0),
        digestCount: mapped.filter((search) => ["daily", "weekly"].includes(search.alert_frequency)).length
      },
      source: "database"
    };
  } catch {
    const searches: SavedSearchDashboardItem[] = [
      { id: "00000000-0000-4000-8000-000000000001", name: "Carbon road bikes", query: "road bike carbon under 1500", filters: { maxPrice: 1500, category: "sports" }, alert_enabled: true, alert_frequency: "instant", last_notified_at: null, last_checked_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), match_count: 4, unread_notification_count: 2 },
      { id: "00000000-0000-4000-8000-000000000002", name: "Local MacBook pickup", query: "M1 MacBook Pro 14 local pickup", filters: { pickup_available: true }, alert_enabled: true, alert_frequency: "daily", last_notified_at: null, last_checked_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), match_count: 9, unread_notification_count: 1 }
    ];
    const recentMatches: SavedSearchMatchItem[] = [
      { id: "demo-match-1", saved_search_id: searches[0].id, saved_search_name: searches[0].name, listing_id: "demo-road-bike", listing_title: "Carbon endurance road bike", listing_price_amount: 1295, listing_location_label: "Portland, OR", notification_id: null, delivered_at: new Date().toISOString(), action_url: "/search?q=road+bike+carbon", is_unread: true },
      { id: "demo-match-2", saved_search_id: searches[1].id, saved_search_name: searches[1].name, listing_id: "demo-macbook", listing_title: "MacBook Pro 14 local pickup", listing_price_amount: 1420, listing_location_label: "Seattle, WA", notification_id: null, delivered_at: new Date().toISOString(), action_url: "/search?q=M1+MacBook+Pro+14", is_unread: true }
    ];
    return { searches, recentMatches, stats: { savedSearchCount: searches.length, newMatchCount: 3, digestCount: 1 }, source: "demo" };
  }
}
