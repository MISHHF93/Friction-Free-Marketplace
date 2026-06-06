import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bot, CreditCard, ShieldCheck, Sparkles, Store, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicListingGrid } from "@/components/public-listing-grid";
import { getFeaturedListings, getPublicCategories, getTrustSafetyStats } from "@/lib/public-marketplace";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Friction-Free Marketplace | Trusted local commerce",
  description: "Browse verified marketplace listings, discover trusted sellers, and buy with escrow-ready checkout, AI search, and safety workflows.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Friction-Free Marketplace",
    description: "Trusted local and online commerce with verified sellers, protected checkout, and AI-assisted discovery.",
    url: "/",
    type: "website"
  }
};

const capabilities = [
  { icon: ShieldCheck, title: "Trust-first trading", text: "Identity, moderation, fraud-risk, and trust-score signals keep buyer decisions transparent." },
  { icon: CreditCard, title: "Protected checkout", text: "Escrow-ready payment flows help coordinate purchase authorization, release, refunds, and disputes." },
  { icon: Bot, title: "AI-assisted discovery", text: "Search and recommendation data powers safer, faster buyer matching and seller operations." }
];

export default async function HomePage() {
  const [featured, categoryResult, stats] = await Promise.all([getFeaturedListings(6), getPublicCategories(6), getTrustSafetyStats()]);

  return (
    <>
      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-20">
        <div className="flex flex-col justify-center">
          <Badge className="w-fit">Public marketplace</Badge>
          <h1 className="mt-6 max-w-4xl text-4xl font-black tracking-tight sm:text-6xl">
            Buy and sell with less friction, more trust, and clearer protection.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            Discover active listings, compare seller trust signals, and move from search to checkout with a marketplace built for safe local and online commerce.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg"><Link href="/browse">Browse listings <ArrowRight className="h-4 w-4" /></Link></Button>
            <Button asChild size="lg" variant="outline"><Link href="/how-it-works">How it works</Link></Button>
          </div>
        </div>
        <Card className="overflow-hidden shadow-soft">
          <div className="bg-gradient-to-br from-emerald-200 via-sky-100 to-white p-6">
            <div className="rounded-2xl border border-white/70 bg-white/80 p-5 backdrop-blur">
              <div className="mb-5 flex items-center gap-2 font-bold"><Sparkles className="h-5 w-5 text-primary" /> Marketplace pulse</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Metric label="Active listings" value={stats.activeListings.toLocaleString()} />
                <Metric label="Trusted sellers" value={stats.trustedSellers.toLocaleString()} />
                <Metric label="Completed trades" value={stats.completedTransactions.toLocaleString()} />
                <Metric label="Low-risk accounts" value={`${stats.lowRiskRate}%`} />
              </div>
              <p className="mt-4 text-xs text-muted-foreground">Data source: {stats.source}</p>
            </div>
          </div>
        </Card>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 pb-14 sm:px-6 lg:grid-cols-3 lg:px-8">
        {capabilities.map((capability) => (
          <Card key={capability.title}>
            <CardHeader>
              <capability.icon className="h-6 w-6 text-primary" />
              <CardTitle>{capability.title}</CardTitle>
              <CardDescription>{capability.text}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Categories</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">Shop by trusted category</h2>
          </div>
          <p className="text-sm text-muted-foreground">Source: {categoryResult.source}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categoryResult.categories.map((category) => (
            <Link key={category.slug} href={`/categories/${category.slug}`} className="rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-soft">
              <Store className="h-6 w-6 text-primary" />
              <h3 className="mt-3 text-lg font-bold">{category.name}</h3>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{category.description ?? "Browse trusted inventory in this category."}</p>
              <p className="mt-4 flex items-center gap-1 text-sm font-semibold"><TrendingUp className="h-4 w-4" /> {category.listingCount} active listings</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Featured inventory</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">Recommended verified listings</h2>
          </div>
          <Button asChild variant="outline"><Link href="/browse">View all</Link></Button>
        </div>
        <PublicListingGrid listings={featured.listings} />
      </section>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-background px-4 py-3 shadow-sm">
      <p className="text-2xl font-black tracking-tight">{value}</p>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  );
}
