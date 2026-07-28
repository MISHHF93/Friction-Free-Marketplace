import type { Metadata } from "next";
import type React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, MapPin, MessageSquare, ShieldCheck, Star, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RemoteImage } from "@/components/ui/remote-image";
import { PriceDisplay, TrustBadge, UserAvatar } from "@/components/marketplace-design-system";
import { PublicListingGrid } from "@/components/public-listing-grid";
import { getPublicSellerParams, getSellerProfile } from "@/lib/public-marketplace";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  return getPublicSellerParams(50);
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { seller } = await getSellerProfile(id);

  if (!seller) {
    return { title: "Seller not found | Friction-Free Marketplace", description: "This seller profile is not available." };
  }

  const description = seller.headline ?? seller.bio ?? `Shop active listings from ${seller.displayName} with marketplace trust and safety signals.`;

  return {
    title: `${seller.displayName} seller profile | Friction-Free Marketplace`,
    description,
    alternates: { canonical: `/sellers/${id}` },
    openGraph: {
      title: `${seller.displayName} on Friction-Free Marketplace`,
      description,
      url: `/sellers/${id}`,
      images: seller.avatarUrl ? [{ url: seller.avatarUrl, alt: seller.displayName }] : undefined
    }
  };
}

export default async function SellerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { seller, listings } = await getSellerProfile(id);
  if (!seller) notFound();

  const inventoryValue = listings.reduce((sum, listing) => sum + Number(listing.price_amount), 0);

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-soft">
      <div className="h-44 bg-trust-soft sm:h-56">
          {seller.bannerUrl ? <RemoteImage src={seller.bannerUrl} alt="" className="h-full w-full object-cover" /> : null}
        </div>
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_340px]">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <UserAvatar name={seller.displayName} imageUrl={seller.avatarUrl ?? undefined} size="lg" className="-mt-16 border-4 border-card bg-primary text-primary-foreground" />
            <div className="min-w-0 flex-1">
              <Badge>Seller profile · {seller.source}</Badge>
              <h1 className="mt-3 text-4xl font-black tracking-tight">{seller.displayName}</h1>
              {seller.headline ? <p className="mt-2 text-lg font-semibold text-primary">{seller.headline}</p> : null}
              <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">{seller.bio ?? "Verified marketplace seller with active inventory and transparent trust signals."}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <TrustBadge label={`${Math.round(seller.trustScore)}% overall trust`} />
                <TrustBadge label={`${seller.fraudRiskLevel} fraud risk`} tone={seller.fraudRiskLevel === "low" ? "success" : "warning"} />
                {seller.locationLabel ? <TrustBadge label={seller.locationLabel} tone="neutral" icon={<MapPin className="h-3.5 w-3.5" />} /> : null}
              </div>
            </div>
          </div>
          <Card className="bg-secondary/70">
            <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Seller snapshot</CardTitle></CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <Metric icon={<Star className="h-4 w-4" />} label="Seller score" value={`${Math.round(seller.sellerScore)}%`} />
              <Metric icon={<Store className="h-4 w-4" />} label="Completed transactions" value={seller.completedTransactions.toLocaleString()} />
              <Metric icon={<MessageSquare className="h-4 w-4" />} label="Reviews" value={seller.reviewCount.toLocaleString()} />
              <Metric icon={<Clock className="h-4 w-4" />} label="Typical response" value={seller.responseTimeMinutes ? `${seller.responseTimeMinutes} min` : "Ask seller"} />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Seller inventory</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight">Active listings from {seller.displayName}</h2>
            </div>
            <Button asChild variant="outline"><Link href={`/search?q=${encodeURIComponent(seller.displayName)}`}>Search seller</Link></Button>
          </div>
          <PublicListingGrid listings={listings} emptyTitle="No active listings" emptyDescription="This seller does not have active public inventory right now." />
        </div>
        <aside className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
          <Card>
            <CardHeader><CardTitle>Inventory value</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <PriceDisplay amount={inventoryValue} />
              <p className="text-sm text-muted-foreground">Total asking price across currently visible active listings.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Safe buying tips</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Use platform messaging, inspect listing details, and keep payment protection enabled for eligible purchases.</p>
              <Button asChild className="w-full" variant="outline"><Link href="/safety">Review trust policy</Link></Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </section>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-card px-3 py-2">
      <span className="flex items-center gap-2 text-muted-foreground">{icon}{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
