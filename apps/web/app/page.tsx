import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Bot, CreditCard, Search, ShieldCheck, Sparkles, Store, WalletCards } from "lucide-react";
import { PublicListingGrid } from "@/components/public-listing-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartCard, MetricCard, SearchBar, TrustBadge } from "@/components/ui-library";
import { getFeaturedListings, getPublicCategories, getTrustSafetyStats } from "@/lib/public-marketplace";
import { marketplaceJsonLd, publicCategories } from "@/lib/public-site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Friction-Free Marketplace | Premium AI-powered commerce",
  description: "Buy and sell with AI-assisted discovery, professional seller tools, protected checkout, trust signals, and marketplace safety workflows.",
  keywords: ["AI marketplace", "trusted commerce", "protected checkout", "seller tools", "local marketplace"],
  alternates: { canonical: "/" },
  openGraph: {
    title: "Friction-Free Marketplace | Premium AI-powered commerce",
    description: "A premium marketplace platform for clearer listings, safer payments, professional sellers, and AI-assisted commerce.",
    url: "/",
    type: "website",
    siteName: "Friction-Free Marketplace",
  },
};

export default async function HomePage() {
  const [featured, categoryResult, stats] = await Promise.all([
    getFeaturedListings(6),
    getPublicCategories(12),
    getTrustSafetyStats(),
  ]);

  const countBySlug = new Map(categoryResult.categories.map((category) => [category.slug, category.listingCount]));
  const categoryChart = publicCategories.slice(0, 5).map((category) => ({
    label: category.title,
    value: countBySlug.get(category.slug) ?? 0,
    tone: category.tone,
  }));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(marketplaceJsonLd("/", "Friction-Free Marketplace", metadata.description ?? "")),
        }}
      />

      <section className="app-container grid gap-10 py-section-sm lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)] lg:items-center">
        <div>
          <Badge variant="ai" className="w-fit gap-1">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            AI-powered trusted commerce
          </Badge>
          <h1 className="mt-5 max-w-5xl text-hero">
            A premium marketplace for safer buying, professional selling, and intelligent discovery.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            Friction-Free combines marketplace search, seller trust signals, protected checkout, AI listing tools, and financial workflows into one commerce-first platform.
          </p>
          <div className="mt-7">
            <SearchBar
              action="/search"
              suggestions={[
                { label: "verified camera kit", href: "/search?q=verified%20camera%20kit" },
                { label: "sofa with delivery", href: "/search?q=sofa%20with%20delivery" },
                { label: "trusted seller tools", href: "/categories/tools" },
              ]}
            />
          </div>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" variant="trust">
              <Link href="/browse">
                Browse marketplace <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/dashboard/listings/create">Start selling</Link>
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <TrustBadge label="Verified sellers" />
            <TrustBadge label="Protected checkout" tone="premium" icon={<CreditCard className="h-3.5 w-3.5" aria-hidden="true" />} />
            <TrustBadge label="AI risk checks" tone="ai" icon={<Bot className="h-3.5 w-3.5" aria-hidden="true" />} />
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 rounded-4xl bg-trust-soft/70 blur-3xl" aria-hidden="true" />
          <Card className="relative overflow-hidden bg-premium-dark text-white shadow-admin">
            <CardHeader>
              <Badge variant="dark" className="w-fit">Platform snapshot</Badge>
              <CardTitle className="text-3xl text-white">Trust and commerce signals in one view.</CardTitle>
              <CardDescription className="text-slate-300">Live marketplace metrics when configured, demo data during local development.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <HeroMetric label="Active listings" value={stats.activeListings.toLocaleString()} />
              <HeroMetric label="Trusted sellers" value={stats.trustedSellers.toLocaleString()} />
              <HeroMetric label="Completed trades" value={stats.completedTransactions.toLocaleString()} />
              <HeroMetric label="Low-risk mix" value={`${stats.lowRiskRate}%`} />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="app-container section-y">
        <div className="mb-8 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div>
            <p className="brand-kicker">Category discovery</p>
            <h2 className="mt-3 text-section">Browse by the way people actually shop.</h2>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">
              Category pages are built for discovery, SEO, and conversion with clear buyer intent, live counts, and trust-forward positioning.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/categories">View all categories</Link>
          </Button>
        </div>
        <div className="adaptive-grid">
          {publicCategories.slice(0, 8).map((category) => (
            <Link key={category.slug} href={`/categories/${category.slug}`} className="card-base card-interactive p-5">
              <span className={`brand-icon brand-icon-${category.tone}`}>
                <category.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-xl font-black tracking-tight">{category.title}</h3>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{category.description}</p>
              <div className="mt-5 flex items-center justify-between gap-3">
                <Badge variant="trust">{(countBySlug.get(category.slug) ?? 0).toLocaleString()} live</Badge>
                <span className="inline-flex items-center gap-1 text-sm font-bold text-primary">
                  Explore <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="app-container section-y">
        <div className="mb-8 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div>
            <p className="brand-kicker">Featured inventory</p>
            <h2 className="mt-3 text-section">Premium listing cards, built for buyer confidence.</h2>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">
              Each card prioritizes price, condition, location, seller identity, trust score, and payment readiness before pushing users into a detail page.
            </p>
          </div>
          <Button asChild variant="trust">
            <Link href="/browse">Browse all listings</Link>
          </Button>
        </div>
        <PublicListingGrid listings={featured.listings} />
      </section>

      <section className="app-container section-y">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
          <div>
            <p className="brand-kicker">Platform capabilities</p>
            <h2 className="mt-3 text-section">Commerce infrastructure that feels simple to buyers.</h2>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              The public website introduces a marketplace, but the platform underneath is ready for seller onboarding, offers, payments, risk review, reporting, and AI-assisted operations.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <MetricCard label="Buyer experience" value="Search" detail="Plain-language search, filters, saved searches, and trust-rich listing cards." icon={Search} tone="ai" />
            <MetricCard label="Seller experience" value="Sell" detail="Listing assistant, offers, payments, payout setup, and seller analytics." icon={Store} tone="commerce" />
            <MetricCard label="Trust layer" value="Protect" detail="Risk signals, reporting, disputes, moderation queues, and audit-aware decisions." icon={ShieldCheck} tone="trust" />
            <MetricCard label="Financial layer" value="Report" detail="Fees, payouts, ledger-ready reporting, and Stripe Connect workflows." icon={WalletCards} tone="premium" />
          </div>
        </div>
      </section>

      <section className="app-container section-y">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
          <ChartCard
            title="Category demand snapshot"
            description="Live category counts when Supabase is configured, with graceful demo data locally."
            data={categoryChart}
            caption={`Source: ${categoryResult.source} marketplace category data.`}
          />
          <Card className="card-ai">
            <CardHeader>
              <Badge variant="ai" className="w-fit">AI commerce</Badge>
              <CardTitle>Intelligence supports the transaction, not the other way around.</CardTitle>
              <CardDescription>
                AI helps buyers search, sellers create better listings, and operators spot risk. The system still keeps pricing, payment, and safety actions explicit.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {["Listing copy and categorization", "Buyer intent and ranking", "Risk and moderation signals", "Seller pricing context"].map((item) => (
                <p key={item} className="flex items-center gap-2 rounded-2xl bg-white/60 px-3 py-2 text-sm font-semibold">
                  <BadgeCheck className="h-4 w-4 text-ai" aria-hidden="true" />
                  {item}
                </p>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="app-container py-section">
        <div className="overflow-hidden rounded-shell border border-white/10 bg-premium-dark p-6 text-white shadow-admin sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div>
              <p className="text-eyebrow text-emerald-300">Ready to explore</p>
              <h2 className="mt-4 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">Build trust into every listing, offer, and transaction.</h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                Start with marketplace discovery, then move into professional buyer, seller, and platform workflows as the product scales.
              </p>
            </div>
            <div className="grid gap-3 sm:flex lg:grid">
              <Button asChild size="lg" variant="trust">
                <Link href="/browse">Browse marketplace</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/15">
                <Link href="/contact">Talk to us</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
      <p className="text-3xl font-black tracking-tight text-white">{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-300">{label}</p>
    </div>
  );
}
