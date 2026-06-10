import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartCard, SearchBar } from "@/components/ui-library";
import { getPublicCategories } from "@/lib/public-marketplace";
import { marketplaceJsonLd, publicCategories } from "@/lib/public-site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Marketplace categories | Friction-Free Marketplace",
  description: "Browse premium marketplace categories for vehicles, electronics, furniture, home goods, tools, services, real estate, and collectibles.",
  alternates: { canonical: "/categories" },
  openGraph: {
    title: "Browse marketplace categories",
    description: "Explore AI-assisted, trust-forward marketplace categories with live listing counts and clear buyer intent.",
    url: "/categories",
  },
};

export default async function CategoriesPage() {
  const { categories, source } = await getPublicCategories(24);
  const countBySlug = new Map(categories.map((category) => [category.slug, category.listingCount]));
  const chartData = publicCategories.map((category) => ({
    label: category.title,
    value: countBySlug.get(category.slug) ?? 0,
    tone: category.tone,
  }));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(marketplaceJsonLd("/categories", "Marketplace categories", metadata.description ?? "")) }}
      />

      <section className="app-container py-section-sm">
        <div className="rounded-shell border border-border bg-card p-6 shadow-panel sm:p-8 lg:p-10">
          <Badge variant="premium" className="w-fit">Category directory</Badge>
          <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)] lg:items-end">
            <div>
              <h1 className="max-w-4xl text-hero">Find the right marketplace lane before you search.</h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
                Categories are designed around buyer intent, seller quality, fulfillment details, and trust signals, so discovery starts with context instead of noise.
              </p>
            </div>
            <SearchBar action="/search" placeholder="Search across every category..." />
          </div>
        </div>
      </section>

      <section className="app-container section-y">
        <div className="mb-8 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div>
            <p className="brand-kicker">All categories</p>
            <h2 className="mt-3 text-section">Commerce-first browsing with trust built in.</h2>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">
              Each category has a dedicated SEO route, clear search hints, and listing counts from {source} marketplace data.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/browse">Browse all listings</Link>
          </Button>
        </div>

        <div className="adaptive-grid">
          {publicCategories.map((category) => (
            <Link key={category.slug} href={`/categories/${category.slug}`} className="card-base card-interactive p-5">
              <span className={`brand-icon brand-icon-${category.tone}`}>
                <category.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-xl font-black tracking-tight">{category.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{category.description}</p>
              <p className="mt-4 rounded-2xl bg-secondary/70 px-3 py-2 text-sm text-muted-foreground">
                Try: <span className="font-semibold text-foreground">{category.searchHint}</span>
              </p>
              <div className="mt-5 flex items-center justify-between gap-3">
                <Badge variant="trust">{(countBySlug.get(category.slug) ?? 0).toLocaleString()} live</Badge>
                <span className="inline-flex items-center gap-1 text-sm font-bold text-primary">
                  Open <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="app-container section-y">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.85fr)]">
          <ChartCard
            title="Category supply snapshot"
            description="Counts help buyers understand current supply and help sellers identify where inventory is thin."
            data={chartData}
            caption={`Source: ${source} marketplace category data.`}
          />
          <Card className="card-commerce">
            <CardHeader>
              <span className="brand-icon brand-icon-commerce">
                <Search className="h-5 w-5" aria-hidden="true" />
              </span>
              <CardTitle>Search remains the fastest path.</CardTitle>
              <CardDescription>
                Category pages are entry points. Search can combine category, location, trust score, condition, payment readiness, and buyer intent.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="trust" className="w-full sm:w-auto">
                <Link href="/search">Open AI-assisted search</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}
