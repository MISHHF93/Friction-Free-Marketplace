import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Layers3, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicListingGrid } from "@/components/public-listing-grid";
import { getCategoryPage, getPublicCategories } from "@/lib/public-marketplace";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  const { categories } = await getPublicCategories(20);
  return categories.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { category } = await getCategoryPage(slug);
  return {
    title: `${category.name} listings | Friction-Free Marketplace`,
    description: category.description ?? `Browse trusted ${category.name} listings with verified seller signals and protected checkout support.`,
    alternates: { canonical: `/categories/${slug}` },
    openGraph: {
      title: `${category.name} listings`,
      description: category.description ?? `Browse trusted ${category.name} marketplace listings.`,
      url: `/categories/${slug}`
    }
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { category, listings, categories, source } = await getCategoryPage(slug);

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-border bg-card p-6 shadow-soft sm:p-8">
        <Badge>Category · {source}</Badge>
        <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_320px] lg:items-end">
          <div>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">{category.name} listings</h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">{category.description ?? "Explore active listings, verified sellers, and marketplace protection signals for this category."}</p>
          </div>
          <Card className="bg-secondary/70">
            <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Category quality</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p><strong className="text-foreground">{listings.total}</strong> active matches</p>
              <p>Sorted by recommendation score, seller safety, and buyer conversion signals.</p>
            </CardContent>
          </Card>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button asChild><Link href={`/browse?category=${category.slug}`}><SlidersHorizontal className="h-4 w-4" /> Filter this category</Link></Button>
          <Button asChild variant="outline"><Link href="/search">Search all listings <ArrowRight className="h-4 w-4" /></Link></Button>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-3 lg:sticky lg:top-24 lg:h-fit">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground"><Layers3 className="h-4 w-4" /> Categories</h2>
          <div className="grid gap-2">
            {categories.map((item) => (
              <Link key={item.slug} href={`/categories/${item.slug}`} className={`rounded-xl border px-4 py-3 text-sm font-semibold transition hover:border-primary/50 ${item.slug === category.slug ? "border-primary bg-primary/10 text-primary" : "border-border bg-card"}`}>
                {item.name} <span className="text-muted-foreground">({item.listingCount})</span>
              </Link>
            ))}
          </div>
        </aside>
        <div>
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Active inventory</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">Recommended in {category.name}</h2>
            </div>
          </div>
          <PublicListingGrid listings={listings.listings} emptyTitle={`No ${category.name} listings yet`} />
        </div>
      </div>
    </section>
  );
}
