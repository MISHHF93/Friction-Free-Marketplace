import Link from "next/link";
import { MapPin, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ListingCard as DesignListingCard } from "@/components/ui-library";
import type { DiscoveryDocument } from "@/lib/search/schema";
import { formatMoney } from "@/lib/i18n/format";

export function toDesignListing(listing: DiscoveryDocument) {
  return {
    id: listing.id,
    title: listing.title,
    price: Number(listing.price_amount),
    currency: listing.currency,
    imageUrl: listing.image_url ?? undefined,
    imageAlt: listing.title,
    category: listing.category_name,
    condition: listing.condition,
    location: listing.location_label,
    href: `/listings/${listing.id}`,
    sellerName: listing.seller_display_name,
    trustScore: Math.round(listing.seller_trust_score),
    isVerified: listing.seller_trust_score >= 80
  };
}

export function PublicListingGrid({ listings, emptyTitle = "No listings available yet", emptyDescription = "Try a broader search or check back as new listings are published." }: { listings: DiscoveryDocument[]; emptyTitle?: string; emptyDescription?: string }) {
  if (!listings.length) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={<Button asChild><Link href="/browse">Browse listings</Link></Button>}
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:gap-5 2xl:grid-cols-3">
      {listings.map((listing) => <DesignListingCard key={listing.id} listing={toDesignListing(listing)} />)}
    </div>
  );
}

export function CompactListingLink({ listing }: { listing: DiscoveryDocument }) {
  return (
    <Link href={`/listings/${listing.id}`} className="grid gap-2 rounded-2xl border border-border bg-card p-3 transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-soft sm:p-4">
      <div className="grid gap-1 sm:flex sm:items-start sm:justify-between sm:gap-3">
        <p className="font-semibold leading-6">{listing.title}</p>
        <p className="font-bold [unicode-bidi:isolate] sm:text-end">{formatMoney(Number(listing.price_amount), listing.currency)}</p>
      </div>
      <p className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-4 w-4" /> {listing.location_label || "Location after contact"}</p>
      <p className="flex items-center gap-1 text-sm text-muted-foreground"><ShieldCheck className="h-4 w-4 text-primary" /> {listing.seller_display_name} · {Math.round(listing.seller_trust_score)}% trust</p>
    </Link>
  );
}
