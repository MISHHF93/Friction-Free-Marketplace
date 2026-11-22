import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Store } from "lucide-react";
import { PublicListingGrid } from "@/components/public-listing-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getFeaturedListings, getPublicCategories } from "@/lib/public-marketplace";
import { NoncedJsonLd } from "@/components/security/nonce-script";
import { marketplaceJsonLd } from "@/lib/public-site";
import { AdSlot } from "@/components/ads/ad-slot";

export const dynamic = "force-dynamic";

const promise = "Buy and sell locally with protected payment.";

export const metadata: Metadata = {
  title: `Friction-Free Marketplace | ${promise.replace(/\.$/, "")}`,
  description: promise,
  keywords: ["local marketplace", "protected payment", "buy and sell"],
  alternates: { canonical: "/" },
  openGraph: {
    title: "Friction-Free Marketplace",
    description: promise,
    url: "/",
    type: "website",
    siteName: "Friction-Free Marketplace",
  },
};

export default async function HomePage() {
  const [featured, categoryResult] = await Promise.all([
    getFeaturedListings(6),
    getPublicCategories(12),
  ]);

  return (
    <>
      <NoncedJsonLd data={marketplaceJsonLd("/", "Friction-Free Marketplace", promise)} />

      <section className="app-container relative isolate grid gap-8 py-8">
        <div className="relative z-10">
          <Badge variant="trust" className="w-fit">Local marketplace</Badge>
          <h1 className="mt-5 max-w-4xl text-hero text-balance">{promise}</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            Find local listings, message sellers, and pay with protection until you confirm you received the item.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" variant="trust">
              <Link href="/search">
                Search listings <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/dashboard/listings/create">Start selling</Link>
            </Button>
          </div>
        </div>
      </section>

      <AdSlot placement="home_top_banner" belowFold={false} className="app-container" />

      {categoryResult.categories.length ? (
        <section className="app-container section-y">
          <div className="mb-6">
            <h2 className="text-section">Browse by category</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Only categories with live marketplace inventory are shown.</p>
          </div>
          <div className="adaptive-grid">
            {categoryResult.categories.map((category) => (
              <Link key={category.slug} href={`/categories/${category.slug}`} className="card-base card-interactive p-5">
                <h3 className="text-xl font-black tracking-tight">{category.name}</h3>
                {category.description ? <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{category.description}</p> : null}
                <div className="mt-5 flex items-center justify-between gap-3">
                  <Badge variant="trust">{category.listingCount.toLocaleString("en-US")} live</Badge>
                  <span className="inline-flex items-center gap-1 text-sm font-bold text-primary">
                    Explore <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <AdSlot placement="home_inline" belowFold className="app-container" />

      <section className="app-container section-y">
        <div className="mb-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div>
            <h2 className="text-section">Latest listings</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Price, condition, and location are visible before you open a listing.</p>
          </div>
          <Button asChild variant="trust">
            <Link href="/search">Browse all listings</Link>
          </Button>
        </div>
        <PublicListingGrid listings={featured.listings} />
      </section>

      <section className="app-container py-section">
        <div className="overflow-hidden rounded-shell border border-white/15 bg-premium-dark p-6 text-white shadow-admin sm:p-8">
          <h2 className="max-w-3xl text-3xl font-black tracking-tight text-white sm:text-4xl">Ready to buy or sell?</h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-200">{promise}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="border border-white/20 bg-white text-premium-graphite shadow-md hover:bg-white/95">
              <Link href="/search">Search listings</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white">
              <Link href="/dashboard/listings/create"><Store className="h-4 w-4" /> Start selling</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
