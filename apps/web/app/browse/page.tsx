import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  Bot,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Heart,
  ListFilter,
  MapPin,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Truck,
} from "lucide-react";
import { FavoriteToggleForm } from "@/components/favorites/favorite-toggle-form";
import { SaveSearchForm } from "@/components/saved-searches/save-search-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState, ListingCard, MetricCard, SearchBar, TrustBadge } from "@/components/ui-library";
import { createClient } from "@/lib/supabase/server";
import { getFavoriteListingIds } from "@/lib/saves/user-saves";
import { searchMarketplace } from "@/lib/search/discovery";
import type { DiscoveryDocument, DiscoverySearchParams, DiscoverySort } from "@/lib/search/schema";
import { getPublicCategories, getTrustSafetyStats } from "@/lib/public-marketplace";
import { marketplaceJsonLd, publicCategories } from "@/lib/public-site";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Browse marketplace listings | Friction-Free Marketplace",
  description: "Browse premium marketplace listings with category navigation, trust-forward filters, AI assistance, saved searches, and protected checkout signals.",
  alternates: { canonical: "/browse" },
  openGraph: {
    title: "Browse premium marketplace listings",
    description: "Find trusted sellers and commerce-ready inventory across categories with modern marketplace filters.",
    url: "/browse",
  },
};

const pageSize = 18;

const sortOptions: Array<{ value: DiscoverySort; label: string }> = [
  { value: "recommended", label: "Recommended" },
  { value: "newest", label: "Newest" },
  { value: "best_value", label: "Best value" },
  { value: "safest_seller", label: "Safest seller" },
  { value: "price_low", label: "Price: low to high" },
  { value: "price_high", label: "Price: high to low" },
  { value: "trending", label: "Trending" },
];

const conditionOptions = ["New", "Like new", "Excellent", "Good", "Fair"];

type BrowseSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function numberParam(value: string | string[] | undefined) {
  const parsed = Number(first(value));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function booleanParam(value: string | string[] | undefined) {
  return first(value) === "true" || first(value) === "on";
}

function selectedList(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value.join(",") : value;
  return raw ? raw.split(",").map((item) => item.trim()).filter(Boolean) : undefined;
}

function sortParam(value: string | string[] | undefined): DiscoverySort {
  const raw = first(value);
  return sortOptions.some((option) => option.value === raw) ? raw as DiscoverySort : "recommended";
}

function parseBrowseParams(searchParams: BrowseSearchParams): DiscoverySearchParams {
  return {
    q: first(searchParams.q),
    category: first(searchParams.category),
    location: first(searchParams.location),
    minPrice: numberParam(searchParams.minPrice),
    maxPrice: numberParam(searchParams.maxPrice),
    condition: selectedList(searchParams.condition),
    minSellerTrust: numberParam(searchParams.minSellerTrust),
    verifiedOnly: booleanParam(searchParams.verifiedOnly),
    paymentProtection: booleanParam(searchParams.paymentProtection),
    fulfillment: first(searchParams.fulfillment) === "pickup" || first(searchParams.fulfillment) === "delivery" || first(searchParams.fulfillment) === "any" ? first(searchParams.fulfillment) as DiscoverySearchParams["fulfillment"] : undefined,
    sort: sortParam(searchParams.sort),
    page: Math.max(numberParam(searchParams.page) ?? 1, 1),
    limit: pageSize,
  };
}

function titleize(value: string) {
  return value.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function currentSearchString(params: DiscoverySearchParams, overrides: Partial<Record<keyof DiscoverySearchParams, string | number | boolean | undefined>> = {}) {
  const query = new URLSearchParams();
  const merged: Record<string, unknown> = { ...params, ...overrides };

  for (const [key, value] of Object.entries(merged)) {
    if (value === undefined || value === "" || value === false || key === "limit") continue;
    if (Array.isArray(value)) query.set(key, value.join(","));
    else query.set(key, String(value));
  }

  return query.toString();
}

function hiddenInputs(params: DiscoverySearchParams, omit: Array<keyof DiscoverySearchParams> = []) {
  return Object.entries(params).flatMap(([key, value]) => {
    if (omit.includes(key as keyof DiscoverySearchParams) || value === undefined || value === "" || value === false || key === "limit") return [];
    if (Array.isArray(value)) return <input key={key} type="hidden" name={key} value={value.join(",")} />;
    return <input key={key} type="hidden" name={key} value={String(value)} />;
  });
}

function toListingCard(listing: DiscoveryDocument, isFavorited: boolean) {
  return {
    id: listing.id,
    title: listing.title,
    price: Number(listing.price_amount),
    currency: listing.currency,
    href: `/listings/${listing.id}`,
    imageUrl: listing.image_url ?? undefined,
    imageAlt: listing.title,
    category: listing.category_name,
    condition: listing.condition,
    location: listing.location_label,
    sellerName: listing.seller_display_name,
    trustScore: Math.round(listing.seller_trust_score),
    isVerified: listing.seller_trust_score >= 80,
    isFavorite: isFavorited,
    badges: [
      listing.pickup_available ? "Pickup" : undefined,
      listing.ships_to.length ? "Ships" : undefined,
    ].filter(Boolean) as string[],
  };
}

export default async function BrowsePage({ searchParams }: { searchParams: Promise<BrowseSearchParams> }) {
  const resolvedSearchParams = await searchParams;
  const params = parseBrowseParams(resolvedSearchParams);
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [results, categoriesResult, stats, favoriteIds] = await Promise.all([
    searchMarketplace(params),
    getPublicCategories(24),
    getTrustSafetyStats(),
    user ? getFavoriteListingIds(user.id) : Promise.resolve(new Set<string>()),
  ]);

  const categoryCountBySlug = new Map(categoriesResult.categories.map((category) => [category.slug, category.listingCount]));
  const totalPages = Math.max(1, Math.ceil(results.total / pageSize));
  const currentPage = Math.max(params.page ?? 1, 1);
  const categoryLabel = params.category ? titleize(params.category) : "All categories";
  const resultLabel = results.total === 1 ? "listing" : "listings";

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(marketplaceJsonLd("/browse", "Browse marketplace listings", metadata.description ?? "")) }}
      />

      <section className="border-b border-border bg-surface-elevated/80">
        <div className="app-container py-6 sm:py-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.72fr)] lg:items-end">
            <div>
              <Badge variant="ai" className="w-fit gap-1">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Marketplace browse
              </Badge>
              <h1 className="mt-4 max-w-4xl text-section">Shop trusted listings with search, categories, and filters that feel natural.</h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
                Browse like a modern marketplace: start with a category, refine by price and trust, compare seller signals, and save searches when the right item is not available yet.
              </p>
            </div>
            <div className="grid gap-3 rounded-panel border border-border bg-card p-3 shadow-card">
              <SearchBar action="/browse" placeholder="Search item, brand, condition, or pickup area..." />
            </div>
          </div>
        </div>
      </section>

      <CategoryNavigation selectedCategory={params.category} counts={categoryCountBySlug} />

      <section className="app-container-wide py-6 sm:py-8">
        <TrustBanner stats={stats} />

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(15rem,18rem)_minmax(0,1fr)_minmax(16rem,20rem)]">
          <aside className="hidden space-y-4 lg:sticky lg:top-24 lg:block lg:h-fit" aria-label="Browse filters">
            <FilterSidebar params={params} />
          </aside>

          <main className="min-w-0 space-y-5">
            <ResultsToolbar params={params} total={results.total} source={results.source} categoryLabel={categoryLabel} />
            <ActiveFilterChips params={params} />

            {results.listings.length ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Marketplace listings">
                  {results.listings.map((listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={toListingCard(listing, favoriteIds.has(listing.id))}
                      favoriteAction={
                        <FavoriteToggleForm
                          listingId={listing.id}
                          isFavorited={favoriteIds.has(listing.id)}
                          labelWhenOn=""
                          labelWhenOff=""
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 rounded-full border-white/70 bg-white/90 text-slate-700 shadow-md backdrop-blur hover:text-rose-600"
                        />
                      }
                    />
                  ))}
                </div>
                <PaginationControls currentPage={currentPage} totalPages={totalPages} total={results.total} params={params} />
              </>
            ) : (
              <EmptyState
                tone="commerce"
                title="No listings match those filters"
                description="Try expanding the category, price range, trust threshold, or location. You can also save this search and get notified when matching inventory appears."
                action={<Button asChild><Link href="/browse">Clear filters</Link></Button>}
              />
            )}

            <section className="rounded-shell border border-border bg-card p-5 shadow-card sm:p-6" aria-labelledby="browse-footer-heading">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div>
                  <p className="brand-kicker">Marketplace footer</p>
                  <h2 id="browse-footer-heading" className="mt-2 text-2xl font-black tracking-tight">Not ready to buy yet?</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                    Save your filters, compare trusted sellers, and return when the right listing appears. Browse stays public and calm; dashboards are reserved for account workflows.
                  </p>
                </div>
                <div className="grid gap-2 sm:flex">
                  <Button asChild variant="outline"><Link href="/categories">Explore categories</Link></Button>
                  <Button asChild variant="trust"><Link href="/dashboard/listings/create">Sell an item</Link></Button>
                </div>
              </div>
            </section>
          </main>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:h-fit" aria-label="Browse assistant and saved searches">
            <AiAssistantCard params={params} />
            <SaveSearchModule params={params} isSignedIn={Boolean(user)} resultLabel={`${results.total.toLocaleString()} ${resultLabel}`} />
          </aside>
        </div>
      </section>
    </>
  );
}

function CategoryNavigation({ selectedCategory, counts }: { selectedCategory?: string; counts: Map<string, number> }) {
  return (
    <nav className="border-b border-border bg-background/85 backdrop-blur" aria-label="Marketplace categories">
      <div className="app-container-wide">
        <div className="scroll-rail py-3">
          <Link
            href="/browse"
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-sm font-black transition",
              !selectedCategory ? "border-primary bg-commerce-soft text-primary shadow-xs" : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary",
            )}
            aria-current={!selectedCategory ? "page" : undefined}
          >
            All
          </Link>
          {publicCategories.map((category) => {
            const selected = selectedCategory === category.slug;
            const count = counts.get(category.slug) ?? 0;
            return (
              <Link
                key={category.slug}
                href={`/browse?category=${category.slug}`}
                aria-current={selected ? "page" : undefined}
                className={cn(
                  "group inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-black transition",
                  selected ? "border-primary bg-commerce-soft text-primary shadow-xs" : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary",
                )}
              >
                <category.icon className="h-4 w-4" aria-hidden="true" />
                {category.title}
                {count > 0 ? <span className="text-xs opacity-70">{count.toLocaleString()}</span> : null}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

function FilterSidebar({ params }: { params: DiscoverySearchParams }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="brand-icon brand-icon-sm brand-icon-commerce">
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <CardTitle className="text-lg">Filters</CardTitle>
            <CardDescription>Refine by price, trust, fulfillment, and condition.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form action="/browse" className="grid gap-5">
          {hiddenInputs(params, ["category", "minPrice", "maxPrice", "condition", "minSellerTrust", "verifiedOnly", "paymentProtection", "fulfillment", "page"])}

          <div className="form-field">
            <Label htmlFor="filter-category">Category</Label>
            <select id="filter-category" name="category" defaultValue={params.category ?? ""} className="form-control">
              <option value="">All categories</option>
              {publicCategories.map((category) => <option key={category.slug} value={category.slug}>{category.title}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="form-field">
              <Label htmlFor="filter-min-price">Min price</Label>
              <Input id="filter-min-price" name="minPrice" inputMode="numeric" defaultValue={params.minPrice ?? ""} placeholder="$0" />
            </div>
            <div className="form-field">
              <Label htmlFor="filter-max-price">Max price</Label>
              <Input id="filter-max-price" name="maxPrice" inputMode="numeric" defaultValue={params.maxPrice ?? ""} placeholder="$2,000" />
            </div>
          </div>

          <fieldset className="grid gap-3">
            <legend className="form-label">Condition</legend>
            {conditionOptions.map((condition) => (
              <label key={condition} className="flex items-center gap-2 rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm font-semibold">
                <input type="checkbox" name="condition" value={condition} defaultChecked={params.condition?.includes(condition)} className="h-4 w-4 accent-primary" />
                {condition}
              </label>
            ))}
          </fieldset>

          <div className="form-field">
            <Label htmlFor="filter-trust">Minimum seller trust</Label>
            <select id="filter-trust" name="minSellerTrust" defaultValue={params.minSellerTrust ?? ""} className="form-control">
              <option value="">Any trust score</option>
              <option value="70">70+ emerging sellers</option>
              <option value="80">80+ trusted sellers</option>
              <option value="90">90+ premium sellers</option>
            </select>
          </div>

          <fieldset className="grid gap-3">
            <legend className="form-label">Commerce signals</legend>
            <label className="flex items-start gap-3 rounded-2xl border border-border bg-card px-3 py-3 text-sm font-semibold">
              <input type="checkbox" name="verifiedOnly" defaultChecked={params.verifiedOnly} className="mt-0.5 h-4 w-4 accent-primary" />
              <span>
                Verified sellers
                <span className="block text-xs font-normal leading-5 text-muted-foreground">Prioritize strong seller trust and account history.</span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-2xl border border-border bg-card px-3 py-3 text-sm font-semibold">
              <input type="checkbox" name="paymentProtection" defaultChecked={params.paymentProtection} className="mt-0.5 h-4 w-4 accent-primary" />
              <span>
                Payment protection
                <span className="block text-xs font-normal leading-5 text-muted-foreground">Show listings likely to support protected checkout.</span>
              </span>
            </label>
          </fieldset>

          <div className="form-field">
            <Label htmlFor="filter-fulfillment">Fulfillment</Label>
            <select id="filter-fulfillment" name="fulfillment" defaultValue={params.fulfillment ?? "any"} className="form-control">
              <option value="any">Pickup or shipping</option>
              <option value="pickup">Local pickup</option>
              <option value="delivery">Ships nationwide</option>
            </select>
          </div>

          <div className="grid gap-2">
            <Button type="submit" variant="trust">
              Apply filters
            </Button>
            <Button asChild variant="outline">
              <Link href="/browse">Reset</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ResultsToolbar({ params, total, source, categoryLabel }: { params: DiscoverySearchParams; total: number; source: string; categoryLabel: string }) {
  return (
    <div className="rounded-panel border border-border bg-card p-4 shadow-card">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div>
          <p className="text-sm font-bold text-muted-foreground">{categoryLabel}</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight">
            {total.toLocaleString()} {total === 1 ? "listing" : "listings"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Ranked with seller trust, safety, value, freshness, and buyer conversion signals. Source: {source}.</p>
        </div>
        <div className="grid gap-2 sm:flex sm:items-center">
          <details className="lg:hidden">
            <summary className={cn("cursor-pointer list-none [&::-webkit-details-marker]:hidden", "ui-button ui-button-outline")}>
              <ListFilter className="h-4 w-4" aria-hidden="true" />
              Filters
            </summary>
            <div className="mt-3 rounded-panel border border-border bg-card p-3 shadow-panel">
              <FilterSidebar params={params} />
            </div>
          </details>
          <form action="/browse" className="flex items-center gap-2">
            {hiddenInputs(params, ["sort", "page"])}
            <Label htmlFor="browse-sort" className="sr-only">Sort listings</Label>
            <select id="browse-sort" name="sort" defaultValue={params.sort ?? "recommended"} className="form-control min-h-11 min-w-44 font-bold" aria-label="Sort listings">
              {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <Button type="submit" variant="outline">Sort</Button>
          </form>
        </div>
      </div>
    </div>
  );
}

function ActiveFilterChips({ params }: { params: DiscoverySearchParams }) {
  const chips = [
    params.q ? ["Search", params.q] : undefined,
    params.category ? ["Category", titleize(params.category)] : undefined,
    params.location ? ["Location", params.location] : undefined,
    params.minPrice !== undefined ? ["From", `$${params.minPrice}`] : undefined,
    params.maxPrice !== undefined ? ["To", `$${params.maxPrice}`] : undefined,
    params.condition?.length ? ["Condition", params.condition.join(", ")] : undefined,
    params.minSellerTrust !== undefined ? ["Trust", `${params.minSellerTrust}+`] : undefined,
    params.verifiedOnly ? ["Verified", "Yes"] : undefined,
    params.paymentProtection ? ["Protected checkout", "Likely"] : undefined,
    params.fulfillment && params.fulfillment !== "any" ? ["Fulfillment", titleize(params.fulfillment)] : undefined,
  ].filter(Boolean) as string[][];

  if (!chips.length) return null;

  return (
    <div className="flex flex-wrap gap-2" aria-label="Active filters">
      {chips.map(([label, value]) => (
        <Badge key={`${label}-${value}`} variant="trust">{label}: {value}</Badge>
      ))}
      <Button asChild size="sm" variant="ghost">
        <Link href="/browse">Clear all</Link>
      </Button>
    </div>
  );
}

function AiAssistantCard({ params }: { params: DiscoverySearchParams }) {
  const prompt = [
    params.q ? `"${params.q}"` : "what you want",
    params.category ? `in ${titleize(params.category)}` : "across categories",
    params.maxPrice ? `under $${params.maxPrice}` : "with your budget",
  ].join(" ");

  return (
    <Card className="card-ai">
      <CardHeader>
        <span className="brand-icon brand-icon-ai">
          <Bot className="h-5 w-5" aria-hidden="true" />
        </span>
        <CardTitle>AI shopping assistant</CardTitle>
        <CardDescription>Use plain language to narrow the market without opening a dashboard.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="rounded-2xl bg-white/65 p-3 text-sm leading-6">
          Try: <span className="font-semibold">Find {prompt}, verified seller, pickup this week.</span>
        </div>
        <Button asChild variant="ai">
          <Link href={`/assistant?intent=${encodeURIComponent(params.q ?? "marketplace browsing")}`}>
            Ask assistant <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function SaveSearchModule({ params, isSignedIn, resultLabel }: { params: DiscoverySearchParams; isSignedIn: boolean; resultLabel: string }) {
  return (
    <Card>
      <CardHeader>
        <span className="brand-icon brand-icon-premium">
          <Bell className="h-5 w-5" aria-hidden="true" />
        </span>
        <CardTitle>Save this search</CardTitle>
        <CardDescription>Watch this market and get alerted when matching listings appear. Current result set: {resultLabel}.</CardDescription>
      </CardHeader>
      <CardContent>
        {isSignedIn ? (
          <SaveSearchForm params={params} />
        ) : (
          <div className="grid gap-3">
            <p className="rounded-2xl bg-secondary/70 p-3 text-sm leading-6 text-muted-foreground">Sign in to save this exact search, receive alerts, and revisit filters later.</p>
            <Button asChild variant="trust"><Link href="/login">Sign in to save</Link></Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TrustBanner({ stats }: { stats: { source: string; activeListings: number; trustedSellers: number; completedTransactions: number; lowRiskRate: number } }) {
  return (
    <section className="rounded-shell border border-border bg-premium-dark p-4 text-white shadow-admin sm:p-5" aria-labelledby="browse-trust-banner-heading">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(26rem,0.9fr)] lg:items-center">
        <div>
          <div className="flex flex-wrap gap-2">
            <TrustBadge label="Seller signals" className="bg-white/95" />
            <TrustBadge label="Protected checkout" tone="premium" icon={<CreditCard className="h-3.5 w-3.5" aria-hidden="true" />} className="bg-white/95" />
            <TrustBadge label="Safer handoff" tone="ai" icon={<Truck className="h-3.5 w-3.5" aria-hidden="true" />} className="bg-white/95" />
          </div>
          <h2 id="browse-trust-banner-heading" className="mt-4 text-2xl font-black tracking-tight text-white">Browse with trust signals before you message.</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            Listing cards highlight seller trust, payment readiness, fulfillment options, and safety context so browsing feels like commerce, not an operations console.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <MetricCard label="Active listings" value={stats.activeListings.toLocaleString()} detail={`Source: ${stats.source}`} icon={Search} tone="ai" className="bg-white text-foreground" />
          <MetricCard label="Trusted sellers" value={stats.trustedSellers.toLocaleString()} detail="Accounts with stronger seller signals." icon={BadgeCheck} tone="trust" className="bg-white text-foreground" />
          <MetricCard label="Completed trades" value={stats.completedTransactions.toLocaleString()} detail="Recorded marketplace transactions." icon={Heart} tone="premium" className="bg-white text-foreground" />
          <MetricCard label="Low-risk mix" value={`${stats.lowRiskRate}%`} detail="Current scored account mix." icon={ShieldCheck} tone="commerce" className="bg-white text-foreground" />
        </div>
      </div>
    </section>
  );
}

function PaginationControls({ currentPage, totalPages, total, params }: { currentPage: number; totalPages: number; total: number; params: DiscoverySearchParams }) {
  if (totalPages <= 1) return null;

  const previous = Math.max(1, currentPage - 1);
  const next = Math.min(totalPages, currentPage + 1);

  return (
    <nav className="flex flex-col gap-3 rounded-panel border border-border bg-card p-4 shadow-card sm:flex-row sm:items-center sm:justify-between" aria-label="Listing pagination">
      <p className="text-sm text-muted-foreground">
        Page <span className="font-bold text-foreground">{currentPage}</span> of <span className="font-bold text-foreground">{totalPages}</span> · {total.toLocaleString()} results
      </p>
      <div className="flex gap-2">
        <Button asChild variant="outline" aria-disabled={currentPage <= 1}>
          <Link href={`/browse?${currentSearchString(params, { page: previous })}`}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Previous
          </Link>
        </Button>
        <Button asChild variant="outline" aria-disabled={currentPage >= totalPages}>
          <Link href={`/browse?${currentSearchString(params, { page: next })}`}>
            Next
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </nav>
  );
}
