import type { Metadata } from "next";
import type React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Eye, Heart, PackageCheck, ShieldCheck, Store, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { FavoriteToggleForm } from "@/components/favorites/favorite-toggle-form";
import { CheckoutCard } from "@/components/payments/checkout-card";
import { StartConversationCard } from "@/components/messaging/start-conversation-card";
import { PriceDisplay, TrustBadge } from "@/components/marketplace-design-system";
import { CompactListingLink } from "@/components/public-listing-grid";
import { getFeaturedListings, getListingById, getPublicListingParams } from "@/lib/public-marketplace";
import { getFavoriteListingIds } from "@/lib/saves/user-saves";
import type { DiscoveryDocument } from "@/lib/search/schema";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  return getPublicListingParams(50);
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const listing = await getListingById(params.id);

  if (!listing) {
    return {
      title: "Listing not found | Friction-Free Marketplace",
      description: "This marketplace listing could not be found or is no longer active."
    };
  }

  const description = listing.description.length > 155 ? `${listing.description.slice(0, 152)}...` : listing.description;

  return {
    title: `${listing.title} | Friction-Free Marketplace`,
    description,
    alternates: { canonical: `/listings/${params.id}` },
    openGraph: {
      title: listing.title,
      description,
      url: `/listings/${params.id}`,
      images: listing.image_url ? [{ url: listing.image_url, alt: listing.title }] : undefined
    }
  };
}

type DbListing = {
  id: string;
  title: string;
  description: string;
  condition: string | null;
  price_amount: number;
  currency: string;
  seller_id: string;
  location_city: string | null;
  location_region: string | null;
  ships_to: string[];
  pickup_available: boolean;
  metadata: Record<string, unknown> | null;
  listing_images?: Array<{ public_url: string | null; alt_text: string | null }>;
};

async function getDatabaseListing(id: string) {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("listings")
      .select("id,title,description,condition,price_amount,currency,seller_id,location_city,location_region,ships_to,pickup_available,metadata,listing_images(public_url,alt_text)")
      .eq("id", id)
      .eq("status", "active")
      .is("deleted_at", null)
      .single();
    if (error) return null;
    return data as DbListing;
  } catch {
    return null;
  }
}

function dbListingToDiscoveryDocument(listing: DbListing, fallback?: DiscoveryDocument | null): DiscoveryDocument {
  const imageUrl = listing.listing_images?.find((image) => image.public_url)?.public_url ?? fallback?.image_url ?? null;
  const locationLabel = [listing.location_city, listing.location_region].filter(Boolean).join(", ") || fallback?.location_label || "Ask seller";

  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    category_id: fallback?.category_id ?? null,
    category_slug: fallback?.category_slug ?? "other",
    category_name: fallback?.category_name ?? "Marketplace",
    condition: listing.condition ?? fallback?.condition ?? "Unspecified",
    status: "active",
    price_amount: Number(listing.price_amount),
    currency: listing.currency,
    location_city: listing.location_city,
    location_region: listing.location_region,
    location_country: fallback?.location_country ?? "US",
    location_label: locationLabel,
    latitude: fallback?.latitude ?? null,
    longitude: fallback?.longitude ?? null,
    _geo: fallback?._geo,
    pickup_available: listing.pickup_available,
    ships_to: listing.ships_to,
    seller_id: listing.seller_id,
    seller_display_name: fallback?.seller_display_name ?? "Verified seller",
    seller_trust_score: fallback?.seller_trust_score ?? 0,
    seller_completed_transactions: fallback?.seller_completed_transactions ?? 0,
    seller_fraud_risk_level: fallback?.seller_fraud_risk_level ?? "low",
    image_url: imageUrl,
    seo_tags: Array.isArray(listing.metadata?.seo_tags) ? listing.metadata.seo_tags.filter((tag): tag is string => typeof tag === "string") : fallback?.seo_tags ?? [],
    attributes: fallback?.attributes ?? [],
    view_count: fallback?.view_count ?? 0,
    saved_count: fallback?.saved_count ?? 0,
    purchase_count: fallback?.purchase_count ?? 0,
    trend_score: fallback?.trend_score ?? 0,
    value_score: fallback?.value_score ?? 0,
    safety_score: fallback?.safety_score ?? 0,
    conversion_score: fallback?.conversion_score ?? 0,
    published_at: fallback?.published_at ?? null,
    created_at: fallback?.created_at ?? new Date().toISOString(),
    updated_at: fallback?.updated_at ?? new Date().toISOString()
  };
}

function formatDate(value: string | null) {
  if (!value) return "Recently published";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export default async function ListingDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [favoriteIds, dbListing, discoveryListing] = await Promise.all([
    user ? getFavoriteListingIds(user.id) : Promise.resolve(new Set<string>()),
    getDatabaseListing(params.id),
    getListingById(params.id)
  ]);

  const listing = dbListing ? dbListingToDiscoveryDocument(dbListing, discoveryListing) : discoveryListing;
  if (!listing) notFound();

  const isLiveDatabaseListing = Boolean(dbListing);
  const moderationStatus = typeof dbListing?.metadata?.moderation_status === "string" ? dbListing.metadata.moderation_status : "active";
  const fraudScore = typeof (dbListing?.metadata?.ai_listing as Record<string, unknown> | undefined)?.fraudRiskScore === "number" ? (dbListing?.metadata?.ai_listing as { fraudRiskScore: number }).fraudRiskScore : null;
  const related = await getFeaturedListings(3);
  const relatedListings = related.listings.filter((item) => item.id !== listing.id && item.category_slug === listing.category_slug).slice(0, 3);
  const recommendations = relatedListings.length ? relatedListings : related.listings.filter((item) => item.id !== listing.id).slice(0, 3);

  return (
    <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-8">
      <div className="min-w-0">
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
          {listing.image_url ? (
            <img src={listing.image_url} alt={listing.title} className="h-72 w-full object-cover sm:h-[420px]" />
          ) : (
            <div className="flex h-72 w-full items-center justify-center bg-gradient-to-br from-emerald-100 via-sky-50 to-white sm:h-[420px]">
              <PackageCheck className="h-16 w-16 text-primary/60" aria-hidden="true" />
            </div>
          )}
          <div className="grid gap-4 p-5 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
            <DetailMetric icon={<Store className="h-4 w-4" />} label="Category" value={listing.category_name} />
            <DetailMetric icon={<CalendarDays className="h-4 w-4" />} label="Published" value={formatDate(listing.published_at)} />
            <DetailMetric icon={<Eye className="h-4 w-4" />} label="Views" value={listing.view_count.toLocaleString()} />
            <DetailMetric icon={<Heart className="h-4 w-4" />} label="Saves" value={listing.saved_count.toLocaleString()} />
          </div>
        </div>

        <Card className="mt-6">
          <CardHeader><CardTitle>Description</CardTitle></CardHeader>
          <CardContent className="space-y-5 text-muted-foreground">
            <p className="leading-7">{listing.description}</p>
            <div className="flex flex-wrap gap-2">
              {[listing.condition, ...listing.seo_tags, ...listing.attributes].filter(Boolean).slice(0, 10).map((tag) => <Badge key={tag}>{tag}</Badge>)}
            </div>
          </CardContent>
        </Card>

        {recommendations.length ? (
          <Card className="mt-6">
            <CardHeader><CardTitle>More listings to compare</CardTitle></CardHeader>
            <CardContent className="grid gap-3">
              {recommendations.map((item) => <CompactListingLink key={item.id} listing={item} />)}
            </CardContent>
          </Card>
        ) : null}
      </div>

      <aside className="lg:sticky lg:top-24 lg:h-fit">
        <Card className="shadow-soft">
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge>{listing.condition}</Badge>
              <Badge>{listing.category_name}</Badge>
              <Badge>moderation: {moderationStatus}</Badge>
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight">{listing.title}</h1>
              <PriceDisplay amount={listing.price_amount} currency={listing.currency} size="lg" />
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-2xl bg-secondary p-4 text-sm">
              <p className="font-semibold">Sold by <Link href={`/sellers/${listing.seller_id}`} className="text-primary hover:underline">{listing.seller_display_name}</Link></p>
              <div className="mt-3 flex flex-wrap gap-2">
                <TrustBadge label={`${Math.round(listing.seller_trust_score)}% trust`} />
                <TrustBadge label={`${listing.seller_fraud_risk_level} risk`} tone={listing.seller_fraud_risk_level === "low" ? "success" : "warning"} />
              </div>
              <p className="mt-3 flex items-center gap-1 text-muted-foreground"><ShieldCheck className="h-4 w-4 text-primary" /> {fraudScore === null ? "Safety signals from public listing data" : `AI fraud risk ${fraudScore}/100`}</p>
            </div>
            <div className="grid gap-3">
              {isLiveDatabaseListing ? <CheckoutCard listingId={listing.id} priceAmount={Number(listing.price_amount)} currency={listing.currency} /> : <Button size="lg" disabled>Checkout available on live database listings</Button>}
              <StartConversationCard listingId={listing.id} disabled={!user || user.id === listing.seller_id || !isLiveDatabaseListing} />
              <FavoriteToggleForm listingId={listing.id} isFavorited={favoriteIds.has(listing.id)} variant="ghost" className="w-full" />
            </div>
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><Truck className="h-4 w-4" /> {listing.pickup_available ? "Pickup available." : "Pickup not selected."} {listing.ships_to.length ? `Ships to ${listing.ships_to.join(", ")}.` : "Shipping not selected."}</p>
            <Button asChild variant="outline" className="w-full"><Link href="/browse">Back to browse</Link></Button>
          </CardContent>
        </Card>
      </aside>
    </section>
  );
}

function DetailMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-secondary p-3">
      <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{icon}{label}</p>
      <p className="mt-1 font-bold text-foreground">{value}</p>
    </div>
  );
}
