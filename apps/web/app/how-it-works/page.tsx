import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, CreditCard, MessageSquare, Search, ShieldCheck, Store, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard, SearchBar } from "@/components/ui-library";
import { getFeaturedListings, getTrustSafetyStats } from "@/lib/public-marketplace";
import { CompactListingLink } from "@/components/public-listing-grid";
import { howItWorksSteps, marketplaceJsonLd } from "@/lib/public-site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "How it works | Friction-Free Marketplace",
  description: "Learn how Friction-Free Marketplace supports premium buying and selling from AI-assisted search through messaging, protected checkout, and handoff.",
  alternates: { canonical: "/how-it-works" },
  openGraph: {
    title: "How Friction-Free Marketplace works",
    description: "A clear buyer and seller flow for search, trust signals, offers, protected payment, and handoff.",
    url: "/how-it-works",
  },
};

export default async function HowItWorksPage() {
  const [featured, stats] = await Promise.all([getFeaturedListings(4), getTrustSafetyStats()]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(marketplaceJsonLd("/how-it-works", "How Friction-Free Marketplace works", metadata.description ?? "")) }}
      />

      <section className="app-container py-section-sm">
        <div className="rounded-shell border border-border bg-card p-6 shadow-panel sm:p-8 lg:p-10">
          <Badge variant="ai" className="w-fit">Marketplace process</Badge>
          <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)] lg:items-end">
            <div>
              <h1 className="max-w-4xl text-hero">From search to handoff, every step has a clearer record.</h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
                Buyers get trust-rich discovery. Sellers get professional listing and payment workflows. The platform keeps context attached to listings, messages, offers, payments, and reports.
              </p>
            </div>
            <SearchBar action="/search" placeholder="Search a use case, item, or category..." />
          </div>
        </div>
      </section>

      <section className="app-container section-y">
        <div className="mb-8">
          <p className="brand-kicker">Customer journey</p>
          <h2 className="mt-3 text-section">A premium marketplace flow without dashboard clutter.</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {howItWorksSteps.map((step, index) => (
            <Card key={step.title} className="card-interactive h-full">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <span className="brand-icon brand-icon-ai">
                    <step.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <Badge variant="ai">Step {index + 1}</Badge>
                </div>
                <CardTitle>{step.title}</CardTitle>
                <CardDescription>{step.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="app-container section-y">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="card-commerce">
            <CardHeader>
              <Badge variant="trust" className="w-fit">For buyers</Badge>
              <CardTitle>Shop with more signal and less uncertainty.</CardTitle>
              <CardDescription>
                Buyers can search naturally, compare trust signals, message sellers, make offers, and use protected checkout when available.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {[
                "Search by budget, location, condition, fulfillment, and trust score.",
                "Compare seller history, payment readiness, and listing completeness.",
                "Keep messages, offers, pickup details, and payment status together.",
              ].map((item) => <ChecklistItem key={item}>{item}</ChecklistItem>)}
              <Button asChild variant="trust" className="mt-2 w-full sm:w-auto">
                <Link href="/browse">Start browsing</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="card-ai">
            <CardHeader>
              <Badge variant="ai" className="w-fit">For sellers</Badge>
              <CardTitle>Publish better listings and manage buyers professionally.</CardTitle>
              <CardDescription>
                Sellers get listing structure, AI copy support, offer handling, verification, protected payments, and performance context.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {[
                "Create listings with clear title, category, condition, price, photos, and fulfillment.",
                "Use AI assistance for listing copy, pricing context, and buyer questions.",
                "Enable payment and payout workflows before handling higher-value transactions.",
              ].map((item) => <ChecklistItem key={item}>{item}</ChecklistItem>)}
              <Button asChild variant="ai" className="mt-2 w-full sm:w-auto">
                <Link href="/dashboard/listings/create">Create a listing</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="app-container section-y">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div>
            <p className="brand-kicker">Platform layers</p>
            <h2 className="mt-3 text-section">The public experience is simple because the platform does the hard work.</h2>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              Trust, payments, AI, reporting, and support workflows should stay behind clear buyer and seller actions, not leak into an admin-like website.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <MetricCard label="Discovery" value="Search" detail="AI-assisted search, filters, recommendations, and category pages." icon={Search} tone="ai" />
            <MetricCard label="Communication" value="Message" detail="Threads, offers, terms, and handoff details stay attached." icon={MessageSquare} tone="commerce" />
            <MetricCard label="Payment" value="Protect" detail="Checkout, receipts, release, refunds, and disputes for eligible listings." icon={CreditCard} tone="premium" />
            <MetricCard label="Safety" value="Review" detail="Reports, moderation, risk checks, and audit-aware operations." icon={ShieldCheck} tone="trust" />
          </div>
        </div>
      </section>

      <section className="app-container section-y">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
          <Card>
            <CardHeader>
              <CardTitle>Try the flow with current listings</CardTitle>
              <CardDescription>Recommended marketplace listings when inventory data is available.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {featured.listings.map((listing) => <CompactListingLink key={listing.id} listing={listing} />)}
            </CardContent>
          </Card>
          <Card className="bg-premium-dark text-white">
            <CardHeader>
              <Badge variant="dark" className="w-fit">Marketplace today</Badge>
              <CardTitle className="text-white">Signals buyers and sellers can understand.</CardTitle>
              <CardDescription className="text-slate-300">Snapshot from {stats.source} marketplace data.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <Snapshot label="Listings" value={stats.activeListings.toLocaleString()} />
              <Snapshot label="Sellers" value={stats.trustedSellers.toLocaleString()} />
              <Snapshot label="Trades" value={stats.completedTransactions.toLocaleString()} />
              <Snapshot label="Low risk" value={`${stats.lowRiskRate}%`} />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="app-container py-section">
        <div className="rounded-shell border border-border bg-card p-6 shadow-panel sm:p-8 lg:p-10">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div>
              <p className="brand-kicker">Next step</p>
              <h2 className="mt-3 text-section">Start with public discovery, then move into buyer or seller tools.</h2>
            </div>
            <div className="grid gap-3 sm:flex">
              <Button asChild size="lg" variant="trust"><Link href="/browse">Browse listings</Link></Button>
              <Button asChild size="lg" variant="outline"><Link href="/pricing">View pricing</Link></Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function ChecklistItem({ children }: { children: string }) {
  return (
    <p className="flex gap-3 rounded-2xl bg-white/65 px-4 py-3 text-sm font-semibold">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-trust" aria-hidden="true" />
      {children}
    </p>
  );
}

function Snapshot({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-300">{label}</p>
    </div>
  );
}
