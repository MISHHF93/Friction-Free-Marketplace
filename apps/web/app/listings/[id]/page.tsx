import type { Metadata } from "next";
import type React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Eye,
  Flag,
  Heart,
  ImagePlus,
  Info,
  MapPin,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Store,
  Truck,
  WalletCards
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import nextDynamic from "next/dynamic";
import { MediaViewer } from "@/components/media/media-viewer-lazy";
import type { MediaViewerItem } from "@/components/media/media-viewer-types";
import { createClient } from "@/lib/supabase/server";
import { FavoriteToggleForm } from "@/components/favorites/favorite-toggle-form";
import { isDemoMarketplaceDataEnabled } from "@/lib/marketplace/demo-mode";
import { quoteCheckoutAmounts } from "@/lib/payments/quote";
import { normalizeCurrency } from "@/lib/payments/money";
import { createAdminClient } from "@/lib/supabase/admin";

const ShareListingButton = nextDynamic(() => import("@/components/listings/share-listing-button").then((mod) => mod.ShareListingButton));
const ListingBuyBar = nextDynamic(() => import("@/components/payments/listing-buy-bar").then((mod) => mod.ListingBuyBar));
const StartConversationCard = nextDynamic(() => import("@/components/messaging/start-conversation-card").then((mod) => mod.StartConversationCard));
const MakeOfferSheet = nextDynamic(() => import("@/components/offers/make-offer-sheet").then((mod) => mod.MakeOfferSheet));
import { PriceDisplay, TrustBadge } from "@/components/marketplace-design-system";
import { AdSlot } from "@/components/ads/ad-slot";
import { PublicListingGrid } from "@/components/public-listing-grid";
import { getFeaturedListings, getListingById, getPublicListingParams } from "@/lib/public-marketplace";
import { getFavoriteListingIds } from "@/lib/saves/user-saves";
import type { DiscoveryDocument } from "@/lib/search/schema";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  return getPublicListingParams(50);
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListingById(id);

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
    alternates: { canonical: `/listings/${id}` },
    openGraph: {
      title: listing.title,
      description,
      url: `/listings/${id}`,
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
    const supabase = await createClient();
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
  const shipsTo = Array.isArray(listing.ships_to) ? listing.ships_to : fallback?.ships_to ?? [];

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
    ships_to: shipsTo,
    seller_id: listing.seller_id,
    seller_display_name: fallback?.seller_display_name ?? "Verified seller",
    seller_trust_score: fallback?.seller_trust_score ?? 0,
    seller_completed_transactions: fallback?.seller_completed_transactions ?? 0,
    seller_fraud_risk_level: fallback?.seller_fraud_risk_level ?? "low",
    image_url: imageUrl,
    seo_tags: Array.isArray(listing.metadata?.seo_tags) ? listing.metadata.seo_tags.filter((tag): tag is string => typeof tag === "string") : fallback?.seo_tags ?? [],
    attributes: fallback?.attributes ?? [],
    search_terms: fallback?.search_terms ?? [],
    fulfillment_modes: fallback?.fulfillment_modes ?? [],
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

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function numberValue(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function rewriteMarketplaceAssetUrl(url: string) {
  try {
    const parsed = new URL(url);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    if (supabaseUrl && /placeholder/i.test(parsed.hostname)) {
      return new URL(`${parsed.pathname}${parsed.search}`, supabaseUrl).toString();
    }
  } catch {
    // Keep the stored URL when it is not an absolute path we can rewrite.
  }
  return url;
}

function galleryImages(listing: DiscoveryDocument, dbListing: DbListing | null) {
  const urls = [
    ...(dbListing?.listing_images ?? []).flatMap((image) => image.public_url ? [{ src: rewriteMarketplaceAssetUrl(image.public_url), alt: image.alt_text || listing.title }] : []),
    ...(listing.image_url ? [{ src: rewriteMarketplaceAssetUrl(listing.image_url), alt: listing.title }] : [])
  ];
  const seen = new Set<string>();
  return urls.filter((image) => {
    if (seen.has(image.src)) return false;
    seen.add(image.src);
    return true;
  });
}

function buildAiInsights(listing: DiscoveryDocument, aiListing: Record<string, unknown> | null, fraudScore: number | null) {
  const generatedSummary = stringValue(aiListing?.conditionSummary) ?? stringValue(aiListing?.condition_summary) ?? stringValue(aiListing?.summary);
  const priceInsight = listing.value_score >= 80
    ? "Price appears consistent with the category, condition, and seller signals available."
    : listing.value_score >= 50
      ? "Price is within a reasonable range. Compare condition and seller history before offering."
      : "Price confidence is limited. Ask for receipts, serial numbers, or proof of condition.";
  const fraudInsight = fraudScore === null
    ? `${Math.round(listing.safety_score || listing.seller_trust_score)}% safety score based on public seller and listing signals.`
    : "Review seller and payment signals before you pay.";

  return [
    generatedSummary ?? `${listing.condition} ${listing.category_name.toLowerCase()} listing from ${listing.seller_display_name}.`,
    priceInsight,
    fraudInsight,
    listing.seo_tags.length ? `Relevant details: ${listing.seo_tags.slice(0, 4).join(", ")}.` : "No extra listing details are attached yet."
  ];
}


function buildSafetyWarnings(listing: DiscoveryDocument, fraudScore: number | null, isLiveDatabaseListing: boolean) {
  const warnings = [
    "Keep payment and communication inside Friction-Free when possible.",
    "Confirm condition, serial numbers, accessories, and pickup details before the handoff."
  ];

  if (!isLiveDatabaseListing) warnings.push("This sample listing cannot use live protected checkout.");
  if (fraudScore !== null && fraudScore >= 70) warnings.push("Risk is elevated. Avoid deposits, shipping pressure, or off-platform payment requests.");
  if (listing.seller_fraud_risk_level !== "low") warnings.push(`Seller risk is marked ${listing.seller_fraud_risk_level}. Review trust signals carefully.`);
  if (!listing.pickup_available && !listing.ships_to.length) warnings.push("The seller has not selected pickup or shipping options yet.");

  return warnings;
}

function riskTone(riskLevel: string): "success" | "warning" {
  return riskLevel === "low" ? "success" : "warning";
}

async function loadPayableOffer(offerId: string | undefined, listingId: string | undefined, buyerId: string | undefined, listingCurrency: string) {
  if (!offerId || !listingId || !buyerId || !/^[0-9a-f-]{36}$/i.test(offerId)) return null;
  try {
    const admin = createAdminClient() as any;
    const { data } = await admin.from("offers").select("id,amount,currency,status,buyer_id,listing_id,payment_due_at").eq("id", offerId).maybeSingle();
    if (!data || data.status !== "accepted" || data.buyer_id !== buyerId || data.listing_id !== listingId) return null;
    if (!data.payment_due_at || new Date(data.payment_due_at).getTime() <= Date.now()) return null;
    if (normalizeCurrency(String(data.currency)) !== normalizeCurrency(listingCurrency)) return null;
    return data as { id: string; amount: number; currency: string };
  } catch {
    return null;
  }
}

export default async function ListingDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<{ offer?: string }> }) {
  const { id } = await params;
  const offerId = (await searchParams)?.offer;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [favoriteIds, dbListing, discoveryListing] = await Promise.all([
    user ? getFavoriteListingIds(user.id) : Promise.resolve(new Set<string>()),
    getDatabaseListing(id),
    getListingById(id)
  ]);

  const listing = dbListing ? dbListingToDiscoveryDocument(dbListing, discoveryListing) : discoveryListing;
  if (!listing) notFound();

  const isLiveDatabaseListing = Boolean(dbListing);
  const isOwner = Boolean(user && user.id === listing.seller_id);
  const payableOffer = await loadPayableOffer(offerId, dbListing?.id, user?.id, listing.currency);
  const checkoutPrice = payableOffer ? Number(payableOffer.amount) : Number(listing.price_amount);
  const checkoutQuote = quoteCheckoutAmounts({
    priceAmount: checkoutPrice,
    itemAmount: payableOffer ? Number(payableOffer.amount) : undefined,
    metadata: dbListing?.metadata ?? null
  });
  const moderationStatus = typeof dbListing?.metadata?.moderation_status === "string" ? dbListing.metadata.moderation_status : "active";
  const aiListing = recordValue(dbListing?.metadata?.ai_listing);
  const fraudScore = numberValue(aiListing?.fraudRiskScore);
  const images = galleryImages(listing, dbListing);
  const aiInsights = buildAiInsights(listing, aiListing, fraudScore);
  const safetyWarnings = buildSafetyWarnings(listing, fraudScore, isLiveDatabaseListing);
  const related = await getFeaturedListings(6);
  const relatedListings = related.listings.filter((item) => item.id !== listing.id && item.category_slug === listing.category_slug).slice(0, 3);
  const recommendations = relatedListings.length ? relatedListings : related.listings.filter((item) => item.id !== listing.id).slice(0, 3);
  const reportHref = `/safety?report=listing&id=${encodeURIComponent(listing.id)}`;

  return (
    <main className="app-container section-y pb-28">
      <div className="mb-5 hidden flex-wrap gap-2 sm:flex">
        <Badge variant="trust"><ShieldCheck className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Protected checkout eligible</Badge>
        <Badge variant="ai"><Sparkles className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Listing signals reviewed</Badge>
      </div>

      <section className="grid min-w-0 max-w-full grid-cols-1 gap-6 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(19rem,24rem)] lg:items-start xl:grid-cols-[minmax(0,1fr)_26rem] xl:gap-8" aria-labelledby="listing-title">
        <ListingGallery title={listing.title} images={images} />
        <aside className="space-y-4 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <Card className="shadow-soft">
            <CardHeader className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="premium">{listing.condition}</Badge>
                <Badge>{listing.category_name}</Badge>
                <Badge variant={moderationStatus === "active" || moderationStatus === "approved" ? "trust" : "warning"}>{moderationStatus === "active" || moderationStatus === "approved" ? "Marketplace reviewed" : "Review pending"}</Badge>
              </div>
              <div className="space-y-3">
                <h1 id="listing-title" data-page-title={listing.title} className="text-2xl font-black tracking-tight sm:text-4xl">{listing.title}</h1>
                <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
                  {listing.location_label || "Location after contact"}
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-3xl border border-trust-border bg-trust-soft p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-trust">Price</p>
                <PriceDisplay amount={checkoutPrice} currency={listing.currency} size="lg" className="text-foreground" />
                {payableOffer ? <p className="mt-2 text-sm font-semibold text-trust">Accepted offer price. List price was {listing.price_amount} {listing.currency}.</p> : null}
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Use protected checkout when available. Ask for receipts or serial numbers before pickup.</p>
              </div>

              <div className="grid gap-2">
                <FavoriteToggleForm listingId={listing.id} isFavorited={favoriteIds.has(listing.id)} variant="outline" size="lg" className="w-full" />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <ShareListingButton title={listing.title} path={`/listings/${listing.id}`} className="w-full" />
                <Button asChild variant="outline" className="w-full">
                  <Link href={reportHref}><Flag className="h-4 w-4" aria-hidden="true" /> Report</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <SellerTrustCard listing={listing} fraudScore={fraudScore} />

          <ListingBuyBar
            amount={checkoutPrice}
            currency={listing.currency}
            label={payableOffer ? "Accepted offer" : "List price"}
            isOwner={isOwner}
            ownerEditHref={isOwner && isLiveDatabaseListing ? `/dashboard/listings/${listing.id}/edit` : undefined}
            offerAction={
              <MakeOfferSheet
                listingId={listing.id}
                currency={listing.currency}
                signedOut={!user}
                isOwner={isOwner}
                disabled={!isLiveDatabaseListing}
                triggerLabel="Offer"
                variant="outline"
                className="min-h-11"
              />
            }
            checkout={isLiveDatabaseListing ? { listingId: listing.id, offerId: payableOffer?.id, priceAmount: checkoutPrice, currency: listing.currency, shippingCents: checkoutQuote.shippingCents } : null}
            demoListingId={isLiveDatabaseListing ? null : listing.id}
          >
            {payableOffer ? null : offerId ? <p className="mb-3 text-sm text-muted-foreground">That offer cannot be paid. Checkout uses the list price only when you are the buyer on an accepted, unexpired offer in the same currency.</p> : null}
          </ListingBuyBar>

          <Card id="message-seller">
            <CardHeader>
              <CardTitle>Message seller</CardTitle>
              <CardDescription>Ask about availability, condition, pickup, shipping, or offer terms.</CardDescription>
            </CardHeader>
            <CardContent>
              <StartConversationCard listingId={listing.id} signedOut={!user} isOwner={Boolean(user && user.id === listing.seller_id)} editHref={user && user.id === listing.seller_id ? `/dashboard/listings/${listing.id}/edit` : undefined} disabled={!isLiveDatabaseListing} />
            </CardContent>
          </Card>
        </aside>
        <div className="min-w-0 max-w-full space-y-6 lg:col-start-1">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <DetailMetric icon={<Store className="h-4 w-4" aria-hidden="true" />} label="Category" value={listing.category_name} />
            <DetailMetric icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />} label="Published" value={formatDate(listing.published_at)} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
              <CardDescription>Seller details with marketplace signals to help you review the listing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-base leading-8 text-muted-foreground">{listing.description}</p>
              <div className="flex flex-wrap gap-2">
                {[...new Set([listing.condition, ...listing.seo_tags, ...listing.attributes].filter(Boolean))].slice(0, 12).map((tag) => <Badge key={tag}>{tag}</Badge>)}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <AiInsightsCard insights={aiInsights} fraudScore={fraudScore} />
          </div>

          <details className="rounded-2xl border border-border bg-card p-4">
            <summary className="cursor-pointer text-base font-bold">Safety and pickup</summary>
            <div className="mt-4 grid gap-4">
              <PaymentProtectionCard />
              <SafePickupCard pickupAvailable={listing.pickup_available} shipsTo={listing.ships_to} location={listing.location_label} />
              </div>
          </details>

          <AdSlot placement="listing_detail_below" categorySlug={listing.category_slug} belowFold />

          {recommendations.length ? (
            <section className="space-y-5" aria-labelledby="similar-listings-title">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                <div>
                  <p className="brand-kicker">Similar listings</p>
                  <h2 id="similar-listings-title" className="mt-2 text-3xl font-black tracking-tight">Compare before you decide.</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Review nearby alternatives and category matches with the same seller and payment signals.</p>
                </div>
                <Button asChild variant="outline"><Link href={`/categories/${listing.category_slug}`}>View category</Link></Button>
              </div>
              <PublicListingGrid listings={recommendations} />
            </section>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function DetailMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/80 bg-white/85 p-4 shadow-sm backdrop-blur">
      <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{icon}{label}</p>
      <p className="mt-1 font-bold text-foreground">{value}</p>
    </div>
  );
}

function ListingGallery({ title, images }: { title: string; images: Array<{ src: string; alt: string }> }) {
  const mediaItems: MediaViewerItem[] = images.map((image, index) => ({
    id: `${image.src}-${index}`,
    src: image.src,
    type: "image",
    title: `${title} media ${index + 1}`,
    alt: image.alt,
    contentType: "image/*"
  }));
  const primary = mediaItems[0];
  const thumbnails = mediaItems.slice(1, 5);

  return (
    <section className="min-w-0 max-w-full overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-soft sm:rounded-[2rem]" aria-label="Listing image gallery">
      <div className={cn("grid min-w-0 grid-cols-1 gap-3 p-2 sm:p-3", thumbnails.length ? "lg:grid-cols-[minmax(0,1fr)_12rem] xl:grid-cols-[minmax(0,1fr)_14rem]" : "")}>
        <div className="min-w-0 overflow-hidden rounded-[1.5rem] bg-secondary">
          {primary ? (
            <MediaViewer items={mediaItems} initialIndex={0} mode="gallery" surface="listingGallery" triggerLabel={`Open ${title} media gallery`} thumbnailClassName="h-72 w-full object-cover sm:h-96 lg:h-[30rem] xl:h-[32.5rem]" />
          ) : (
            <div className="flex h-16 w-full items-center justify-center gap-3 px-4 text-muted-foreground">
              <ImagePlus className="h-6 w-6 text-primary" aria-hidden="true" />
              <p className="text-sm font-bold">Photos are not available yet</p>
            </div>
          )}
        </div>
        {thumbnails.length ? <div className="grid min-w-0 grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-1">
          {thumbnails.map((image, index) => (
            <div className="overflow-hidden rounded-2xl border border-border bg-secondary" key={image.src}>
              <MediaViewer items={mediaItems} initialIndex={index + 1} mode="gallery" surface="listingGallery" triggerLabel={`Open ${title} media ${index + 2}`} thumbnailClassName="h-24 w-full object-cover sm:h-28 lg:h-[7rem] xl:h-[7.55rem]" />
            </div>
          ))}
        </div> : null}
      </div>
    </section>
  );
}

function SellerTrustCard({ listing, fraudScore }: { listing: DiscoveryDocument; fraudScore: number | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><BadgeCheck className="h-5 w-5 text-primary" aria-hidden="true" /> Seller trust</CardTitle>
        <CardDescription>Seller history and risk signals to review before you message or buy.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl bg-secondary p-4">
          <p className="font-semibold">Sold by <Link href={`/sellers/${listing.seller_id}`} className="text-primary hover:underline">{listing.seller_display_name}</Link></p>
          <div className="mt-3 flex flex-wrap gap-2">
            <TrustBadge label={`${Math.round(listing.seller_trust_score)}% trust`} />
            <TrustBadge label={`${listing.seller_completed_transactions.toLocaleString()} completed`} tone="info" />
            <TrustBadge label={`${listing.seller_fraud_risk_level} risk`} tone={riskTone(listing.seller_fraud_risk_level)} />
          </div>
        </div>
        <div className="grid gap-3 text-sm text-muted-foreground">
          <p className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" /> {fraudScore === null ? "Safety signals are based on seller, listing, and marketplace activity." : `Risk score is ${fraudScore}/100 for this listing.`}</p>
          <p className="flex items-start gap-2"><ScanSearch className="mt-0.5 h-4 w-4 text-ai" aria-hidden="true" /> Compare title, price, images, payment requests, and seller behavior before you commit.</p>
        </div>
      </CardContent>
    </Card>
  );
}

function AiInsightsCard({ insights, fraudScore }: { insights: string[]; fraudScore: number | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-ai" aria-hidden="true" /> Listing insights</CardTitle>
        <CardDescription>Helpful signals to review before messaging, offering, or buying.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight) => (
          <p className="flex gap-2 rounded-2xl bg-ai-soft p-3 text-sm leading-6 text-ai" key={insight}>
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {insight}
          </p>
        ))}
      </CardContent>
    </Card>
  );
}

function SafetyWarningsCard({ warnings }: { warnings: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-amber-700" aria-hidden="true" /> Safety warnings</CardTitle>
        <CardDescription>Keep the deal documented and avoid common marketplace scams.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {warnings.map((warning) => (
          <p className="flex gap-2 rounded-2xl bg-amber-50 p-3 text-sm leading-6 text-amber-900" key={warning}>
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {warning}
          </p>
        ))}
      </CardContent>
    </Card>
  );
}

function PaymentProtectionCard() {
  const points = ["Payment is authorized before handoff and captured only when the marketplace flow allows.", "Receipts, transaction status, refunds, and disputes stay connected to the listing.", "Avoid wire transfers, gift cards, crypto, or external payment requests."];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" aria-hidden="true" /> Payment protection</CardTitle>
        <CardDescription>For eligible listings, checkout authorizes payment before funds are captured.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {points.map((point) => (
          <p className="flex gap-2 text-sm leading-6 text-muted-foreground" key={point}>
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            {point}
          </p>
        ))}
      </CardContent>
    </Card>
  );
}

function SafePickupCard({ pickupAvailable, shipsTo, location }: { pickupAvailable: boolean; shipsTo: string[]; location: string }) {
  const guidance = [
    pickupAvailable ? `Meet in a public, well-lit place near ${location || "the agreed location"}.` : "Ask the seller to confirm pickup availability before making plans.",
    shipsTo.length ? `Shipping is marked for ${shipsTo.join(", ")}. Confirm carrier, tracking, insurance, and handoff terms.` : "Shipping is not selected. Be cautious with seller-arranged courier requests.",
    "Bring a friend for high-value pickups and inspect the item before confirming handoff."
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5 text-primary" aria-hidden="true" /> Safe pickup guidance</CardTitle>
        <CardDescription>Plan the handoff with the same care you would use for any important purchase.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {guidance.map((item) => (
          <p className="flex gap-2 text-sm leading-6 text-muted-foreground" key={item}>
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            {item}
          </p>
        ))}
      </CardContent>
    </Card>
  );
}
