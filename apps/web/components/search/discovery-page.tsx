import type React from "react";
import Link from "next/link";
import {
  Bell,
  BrainCircuit,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  Grid3X3,
  ListFilter,
  MapPin,
  PackageOpen,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Truck,
  WalletCards,
  X
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RemoteImage } from "@/components/ui/remote-image";
import { FavoriteToggleForm } from "@/components/favorites/favorite-toggle-form";
import { SaveSearchForm } from "@/components/saved-searches/save-search-form";
import { getFavoriteListingIds } from "@/lib/saves/user-saves";
import { searchMarketplace } from "@/lib/search/discovery";
import type { DiscoveryDocument, DiscoverySearchParams } from "@/lib/search/schema";
import {
  discoveryCategorySlugs,
  discoveryConditionOptions,
  discoveryPageSize,
  discoveryParamEntries,
  discoverySortOptions,
  getDiscoveryActiveChips,
  parseDiscoveryParamsFromRecord,
  serializeDiscoveryParams,
  titleizeDiscoveryValue
} from "@/lib/search/filters";
import { cn } from "@/lib/utils";

type SearchParams = Record<string, string | string[] | undefined>;


function titleize(value: string) {
  return titleizeDiscoveryValue(value);
}

function topFacetEntries(facets: Record<string, Record<string, number>>, field: string, limit = 5) {
  return Object.entries(facets[field] ?? {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit);
}

function ActiveFilterChips({ params }: { params: DiscoverySearchParams }) {
  const chips = getDiscoveryActiveChips(params);

  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map(({ label, value }) => (
        <Badge key={`${label}-${value}`} variant="trust">{label}: {value}</Badge>
      ))}
    </div>
  );
}

function FacetLinkList({ title, field, facets, currentHref }: { title: string; field: "category" | "condition" | "location"; facets: Record<string, Record<string, number>>; currentHref: string }) {
  const facetField = field === "category" ? "category_slug" : field === "location" ? "location_city" : "condition";
  const entries = topFacetEntries(facets, facetField);
  if (entries.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
      <div className="grid gap-1">
        {entries.map(([value, count]) => {
          const params = new URLSearchParams(currentHref);
          params.set(field, value);
          return (
            <Link key={value} href={`?${params.toString()}`} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm transition hover:bg-secondary">
              <span>{titleize(value)}</span>
              <span className="text-muted-foreground">{count}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function hiddenInputs(params: DiscoverySearchParams, omit: Array<keyof DiscoverySearchParams> = []) {
  return discoveryParamEntries(params, omit).map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />);
}

function currentSearchString(params: DiscoverySearchParams, overrides: Partial<Record<keyof DiscoverySearchParams, string | number | boolean | undefined>> = {}) {
  return serializeDiscoveryParams(params, overrides);
}

export async function DiscoveryPage({ searchParams, mode = "browse" }: { searchParams: SearchParams; mode?: "browse" | "search" }) {
  const params = parseDiscoveryParamsFromRecord(searchParams, { sort: mode === "browse" ? "recommended" : "newest", limit: discoveryPageSize });
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [results, recommended, trending, broadRecommendations, favoriteIds] = await Promise.all([
    searchMarketplace(params),
    searchMarketplace({ ...params, sort: "recommended", limit: 3 }),
    searchMarketplace({ category: params.category, sort: "trending", limit: 3 }),
    searchMarketplace({ sort: "recommended", limit: 3 }),
    user ? getFavoriteListingIds(user.id) : Promise.resolve(new Set<string>())
  ]);

  const currentHref = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    currentHref.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }

  const priceStats = results.facetStats.price_amount;
  const trustStats = results.facetStats.seller_trust_score;
  const totalPages = Math.max(1, Math.ceil(results.total / discoveryPageSize));
  const currentPage = Math.max(params.page ?? 1, 1);
  const modeHref = mode === "search" ? "/search" : "/browse";
  const emptyRecommendations = recommended.listings.length ? recommended.listings : broadRecommendations.listings;

  return (
    <section className="app-container-wide section-y">
      <SearchHeader mode={mode} params={params} resultsTotal={results.total} source={results.source} priceStats={priceStats} />

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(15rem,17rem)_minmax(0,1fr)] xl:gap-6 2xl:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="hidden space-y-4 lg:sticky lg:top-24 lg:block lg:h-fit">
          <FilterSidebar params={params} modeHref={modeHref} trustStats={trustStats} />
          <FacetPanel facets={results.facets} currentHref={currentHref.toString()} />
          <SavedSearchPanel params={params} userSignedIn={Boolean(user)} modeHref={modeHref} />
        </aside>

        <div className="space-y-6">
          <div className="grid gap-3 rounded-3xl border border-border/80 bg-white/80 p-3 shadow-md backdrop-blur md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div className="flex flex-wrap gap-2">
              <MobileFilterDrawer params={params} modeHref={modeHref} trustStats={trustStats} />
              <ListModeIndicator />
              <SavedSearchQuickAction params={params} userSignedIn={Boolean(user)} modeHref={modeHref} />
            </div>
            <SortMenu params={params} modeHref={modeHref} />
          </div>

          <ActiveFilterChips params={params} />

          {results.listings.length ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:gap-5 2xl:grid-cols-3" aria-label="Listing grid">
                {results.listings.map((listing, index) => <DiscoveryListingCard key={listing.id} listing={listing} isFavorited={favoriteIds.has(listing.id)} featured={index === 0 && currentPage === 1} />)}
              </div>
              <PaginationControls currentPage={currentPage} totalPages={totalPages} total={results.total} params={params} modeHref={modeHref} />
            </>
          ) : (
            <EmptyResultsRecommendations modeHref={modeHref} recommendations={emptyRecommendations} />
          )}

          <AiAssistantPanel params={params} modeHref={modeHref} />
          <DiscoveryRail title="Recommended for this buyer" icon={<Sparkles className="h-5 w-5" />} listings={recommended.listings} />
          <DiscoveryRail title="Trending listings" icon={<Flame className="h-5 w-5" />} listings={trending.listings} />
          <DiscoveryRail title="Recently viewed" icon={<Clock className="h-5 w-5" />} listings={results.listings.slice(0, 3)} />
        </div>
      </div>
    </section>
  );
}

function SearchHeader({ mode, params, resultsTotal, source, priceStats }: { mode: "browse" | "search"; params: DiscoverySearchParams; resultsTotal: number; source: string; priceStats?: { min: number; max: number } }) {
  const modeHref = mode === "search" ? "/search" : "/browse";
  const sourceLabel = source === "meilisearch" ? "Live marketplace index" : source === "database" ? "Marketplace inventory" : "Curated local preview";

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-soft sm:rounded-[2rem]">
      <div className="bg-premium-dark p-4 text-white sm:p-6 lg:p-8">
        <Badge variant="dark">{mode === "search" ? "AI search" : "Marketplace discovery"}</Badge>
        <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,23rem)] lg:items-end">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">Find trusted listings faster</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">Search, browse, filter, save, and compare listings with AI ranking, trust signals, protected payment cues, and fast marketplace controls.</p>
          </div>
          <div className="rounded-2xl border border-brand-steel bg-brand-slate p-4 text-sm text-slate-200">
            <p className="font-bold text-white">{sourceLabel}</p>
            <p>{resultsTotal.toLocaleString()} matching listings across verified seller, payment, fulfillment, and category filters.</p>
            {priceStats ? <p className="mt-2">Indexed price range: ${Math.round(priceStats.min).toLocaleString()}-{Math.round(priceStats.max).toLocaleString()}</p> : null}
          </div>
        </div>
      </div>
      <form className="grid gap-3 p-3 sm:p-4 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_12rem_10rem_auto]" action={modeHref}>
        {hiddenInputs(params, ["q", "location", "radiusMiles", "page"])}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" aria-hidden="true" />
          <Input className="pl-10" name="q" defaultValue={params.q} placeholder="Search bikes, sofas, camera kits..." />
        </div>
        <Input name="location" defaultValue={params.location} placeholder="Austin, TX" />
        <Input name="radiusMiles" defaultValue={params.radiusMiles} placeholder="Radius" type="number" min="1" />
        <Button variant="trust" className="md:col-span-2 lg:col-span-1"><SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> Search</Button>
      </form>
    </div>
  );
}

function FilterSidebar({ params, modeHref, trustStats }: { params: DiscoverySearchParams; modeHref: string; trustStats?: { min: number; max: number } }) {
  return (
    <Card>
      <CardHeader className="p-4 sm:p-5">
        <CardTitle className="flex items-center gap-2"><ListFilter className="h-5 w-5 text-primary" aria-hidden="true" /> Filters</CardTitle>
        <CardDescription>Narrow results without losing trust and safety context.</CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
        <form className="space-y-4" action={modeHref}>
          {hiddenInputs(params, ["category", "location", "radiusMiles", "minPrice", "maxPrice", "condition", "minSellerTrust", "verifiedOnly", "paymentProtection", "fulfillment", "page"])}
          <FilterFields params={params} trustStats={trustStats} />
          <Button className="w-full" variant="trust">Apply filters</Button>
          <Button asChild variant="ghost" className="w-full"><Link href={modeHref}>Clear filters</Link></Button>
        </form>
      </CardContent>
    </Card>
  );
}

function FilterFields({ params, trustStats }: { params: DiscoverySearchParams; trustStats?: { min: number; max: number } }) {
  return (
    <>
      <label className="grid gap-2 text-sm font-semibold">Category
        <select name="category" defaultValue={params.category ?? ""} className="h-11 rounded-xl border border-input bg-card px-3 text-sm shadow-xs">
          <option value="">All categories</option>
          {discoveryCategorySlugs.map((category) => <option key={category} value={category}>{titleize(category)}</option>)}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-semibold">Location
        <Input name="location" defaultValue={params.location} placeholder="City, state, or country" />
      </label>
      <label className="grid gap-2 text-sm font-semibold">Location radius
        <Input name="radiusMiles" defaultValue={params.radiusMiles} type="number" min="1" placeholder="25 miles" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-2 text-sm font-semibold">Min price<Input name="minPrice" defaultValue={params.minPrice} type="number" min="0" /></label>
        <label className="grid gap-2 text-sm font-semibold">Max price<Input name="maxPrice" defaultValue={params.maxPrice} type="number" min="0" /></label>
      </div>
      <label className="grid gap-2 text-sm font-semibold">Condition
        <select name="condition" defaultValue={params.condition?.join(",") ?? ""} className="h-11 rounded-xl border border-input bg-card px-3 text-sm shadow-xs">
          <option value="">Any condition</option>
          {discoveryConditionOptions.map((condition) => <option key={condition} value={condition}>{condition}</option>)}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-semibold">Seller trust level
        <Input name="minSellerTrust" defaultValue={params.minSellerTrust} type="number" min="0" max="100" placeholder="80" />
      </label>
      {trustStats ? <p className="text-xs text-muted-foreground">Current seller trust range: {Math.round(trustStats.min)}-{Math.round(trustStats.max)}.</p> : null}
      <label className="grid gap-2 text-sm font-semibold">Delivery / pickup
        <select name="fulfillment" defaultValue={params.fulfillment ?? ""} className="h-11 rounded-xl border border-input bg-card px-3 text-sm shadow-xs">
          <option value="">Any fulfillment</option>
          <option value="pickup">Pickup available</option>
          <option value="delivery">Shipping/delivery available</option>
          <option value="any">Either pickup or delivery</option>
        </select>
      </label>
      <label className="flex items-start gap-3 rounded-2xl border border-border bg-secondary/60 p-3 text-sm font-semibold">
        <input type="checkbox" name="verifiedOnly" value="true" defaultChecked={params.verifiedOnly} className="mt-1" />
        <span><span className="block">Verified sellers only</span><span className="text-xs font-normal text-muted-foreground">Uses seller trust and marketplace safety signals.</span></span>
      </label>
      <label className="flex items-start gap-3 rounded-2xl border border-border bg-secondary/60 p-3 text-sm font-semibold">
        <input type="checkbox" name="paymentProtection" value="true" defaultChecked={params.paymentProtection} className="mt-1" />
        <span><span className="block">Payment protection available</span><span className="text-xs font-normal text-muted-foreground">Prioritizes listings with safer seller/payment readiness.</span></span>
      </label>
    </>
  );
}

function MobileFilterDrawer({ params, modeHref, trustStats }: { params: DiscoverySearchParams; modeHref: string; trustStats?: { min: number; max: number } }) {
  return (
    <details className="group relative lg:hidden">
      <summary className="inline-flex h-10 cursor-pointer list-none items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-bold shadow-sm [&::-webkit-details-marker]:hidden">
        <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
        Filters
      </summary>
      <div className="fixed inset-0 z-50 bg-slate-950/40 p-2 backdrop-blur-sm sm:p-3">
        <div className="ml-auto h-full w-full max-w-md overflow-y-auto rounded-3xl border border-border bg-card p-4 shadow-soft motion-mobile-panel">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black">Filter listings</h2>
            <span className="rounded-xl bg-secondary p-2 text-muted-foreground"><X className="h-4 w-4" aria-hidden="true" /></span>
          </div>
          <form className="mt-5 space-y-4" action={modeHref}>
            {hiddenInputs(params, ["category", "location", "radiusMiles", "minPrice", "maxPrice", "condition", "minSellerTrust", "verifiedOnly", "paymentProtection", "fulfillment", "page"])}
            <FilterFields params={params} trustStats={trustStats} />
            <Button className="w-full" variant="trust">Apply filters</Button>
          </form>
        </div>
      </div>
    </details>
  );
}

function FacetPanel({ facets, currentHref }: { facets: Record<string, Record<string, number>>; currentHref: string }) {
  return (
    <Card>
      <CardHeader><CardTitle>Indexed facets</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <FacetLinkList title="Popular categories" field="category" facets={facets} currentHref={currentHref} />
        <FacetLinkList title="Nearby cities" field="location" facets={facets} currentHref={currentHref} />
        <FacetLinkList title="Top conditions" field="condition" facets={facets} currentHref={currentHref} />
      </CardContent>
    </Card>
  );
}

function SavedSearchPanel({ params, userSignedIn, modeHref }: { params: DiscoverySearchParams; userSignedIn: boolean; modeHref: string }) {
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-primary" aria-hidden="true" /> Save this search</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>Save this query and get alerts when newly published listings match your filters.</p>
        {userSignedIn ? <SaveSearchForm params={params} /> : <Button asChild variant="outline" className="w-full"><Link href={`/login?next=${modeHref}`}>Sign in to create alert</Link></Button>}
      </CardContent>
    </Card>
  );
}

function SavedSearchQuickAction({ params, userSignedIn, modeHref }: { params: DiscoverySearchParams; userSignedIn: boolean; modeHref: string }) {
  if (!userSignedIn) {
    return <Button asChild variant="outline" size="sm"><Link href={`/login?next=${modeHref}`}><Bell className="h-4 w-4" aria-hidden="true" /> Save search</Link></Button>;
  }
  return (
    <details className="relative">
      <summary className="inline-flex h-9 cursor-pointer list-none items-center gap-2 rounded-lg border border-border bg-card px-3 text-xs font-bold shadow-xs [&::-webkit-details-marker]:hidden">
        <Bell className="h-4 w-4" aria-hidden="true" />
        Save search
      </summary>
      <div className="absolute left-0 z-30 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-3 shadow-soft">
        <SaveSearchForm params={params} />
      </div>
    </details>
  );
}

function SortMenu({ params, modeHref }: { params: DiscoverySearchParams; modeHref: string }) {
  return (
    <form className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:justify-end" action={modeHref}>
      {hiddenInputs(params, ["sort", "page"])}
      <label className="sr-only" htmlFor="discovery-sort">Sort listings</label>
      <select id="discovery-sort" name="sort" defaultValue={params.sort ?? "newest"} className="h-10 min-w-0 rounded-xl border border-input bg-card px-3 text-sm font-bold shadow-xs">
        {discoverySortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <Button size="sm" variant="surface">Sort</Button>
    </form>
  );
}

function ListModeIndicator() {
  return (
    <div className="inline-flex rounded-xl border border-border bg-card p-1 shadow-xs" aria-label="Current result view">
      <Button type="button" size="sm" variant="trust" className="h-8 px-3"><Grid3X3 className="h-4 w-4" aria-hidden="true" /> List view</Button>
    </div>
  );
}

function DiscoveryListingCard({ listing, isFavorited, featured = false }: { listing: DiscoveryDocument; isFavorited: boolean; featured?: boolean }) {
  return (
    <Card className={cn("group overflow-hidden shadow-md transition hover:-translate-y-1 hover:shadow-soft", featured && "border-premium bg-premium-soft/60")}>
      <div className="relative">
            {listing.image_url ? <RemoteImage src={listing.image_url} alt={listing.title} className="h-40 w-full object-cover transition duration-300 group-hover:scale-105 sm:h-44" /> : <div className="flex h-40 items-center justify-center bg-secondary sm:h-44"><PackageOpen className="h-10 w-10 text-primary" aria-hidden="true" /></div>}
        {featured ? <Badge variant="premium" className="absolute left-3 top-3 shadow-md">Top match</Badge> : null}
      </div>
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="grid gap-3 sm:flex sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <Badge variant={listing.seller_trust_score >= 80 ? "trust" : "default"}>{listing.category_name}</Badge>
            <h3 className="mt-3 text-lg font-bold tracking-tight">{listing.title}</h3>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-4 w-4" aria-hidden="true" /> {listing.location_label || "Location available after contact"}</p>
          </div>
          <p className="text-xl font-bold sm:text-right">${listing.price_amount.toLocaleString()}</p>
        </div>
        <div className="grid gap-2 rounded-xl bg-secondary px-3 py-2 text-sm">
          <span className="flex items-center gap-1 font-medium"><ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" /> Trust {Math.round(listing.seller_trust_score)}</span>
          <span className="text-muted-foreground">{listing.condition} · value {Math.round(listing.value_score)} · trending {Math.round(listing.trend_score)}</span>
          <span className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {listing.pickup_available ? <span className="inline-flex items-center gap-1"><Truck className="h-3.5 w-3.5" aria-hidden="true" /> Pickup</span> : null}
            {listing.ships_to.length ? <span className="inline-flex items-center gap-1"><WalletCards className="h-3.5 w-3.5" aria-hidden="true" /> Payment-ready seller</span> : null}
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button asChild className="w-full"><Link href={`/listings/${listing.id}`}>View details</Link></Button>
          <FavoriteToggleForm listingId={listing.id} isFavorited={isFavorited} variant="outline" className="w-full" labelWhenOn="Saved" labelWhenOff="Favorite" />
        </div>
      </CardContent>
    </Card>
  );
}

function DiscoveryRail({ title, icon, listings }: { title: string; icon: React.ReactNode; listings: DiscoveryDocument[] }) {
  return (
    <Card>
      <CardHeader className="p-4 sm:p-6"><CardTitle className="flex items-center gap-2">{icon}{title}</CardTitle></CardHeader>
      <CardContent className="grid gap-3 p-4 pt-0 sm:p-6 sm:pt-0 md:grid-cols-3">
        {listings.length ? listings.map((listing) => (
          <Link href={`/listings/${listing.id}`} key={listing.id} className="rounded-xl border border-border p-4 transition hover:border-primary/50">
            <p className="font-semibold">{listing.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">${listing.price_amount.toLocaleString()} · Trust {listing.seller_trust_score}</p>
          </Link>
        )) : <p className="text-sm text-muted-foreground">More recommendations appear as inventory and search signals grow.</p>}
      </CardContent>
    </Card>
  );
}

function AiAssistantPanel({ params, modeHref }: { params: DiscoverySearchParams; modeHref: string }) {
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><BrainCircuit className="h-5 w-5 text-primary" aria-hidden="true" /> AI search assistant panel</CardTitle>
        <CardDescription>Describe the outcome you want and let search convert it into safer filters.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>Try natural language such as “safe mirrorless camera under $1,600 near Seattle with pickup and payment protection.”</p>
        <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]" action={modeHref}>
          {hiddenInputs(params, ["q", "sort", "page"])}
          <Input name="q" placeholder="Find a safe starter road bike under $1,300" />
          <input type="hidden" name="sort" value="recommended" />
          <Button variant="ai">Try AI search</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function EmptyResultsRecommendations({ modeHref, recommendations }: { modeHref: string; recommendations: DiscoveryDocument[] }) {
  return (
    <Card className="border-dashed">
      <CardContent className="space-y-6 p-4 text-center sm:p-6 lg:p-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-ai-soft text-ai">
          <Search className="h-7 w-7" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tight">No listings matched these filters.</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Try widening your radius, lowering the trust threshold, clearing price limits, or switching to AI recommended sort.</p>
        </div>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild variant="trust"><Link href={modeHref}>Clear filters</Link></Button>
          <Button asChild variant="outline"><Link href={`${modeHref}?sort=recommended`}>Use recommended sort</Link></Button>
        </div>
        {recommendations.length ? (
          <div className="grid gap-3 pt-2 text-left md:grid-cols-3">
            {recommendations.map((listing) => (
              <Link href={`/listings/${listing.id}`} className="rounded-2xl border border-border bg-card p-4 transition hover:border-primary/50" key={listing.id}>
                <p className="font-bold">{listing.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">${listing.price_amount.toLocaleString()} · {listing.category_name}</p>
              </Link>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function PaginationControls({ currentPage, totalPages, total, params, modeHref }: { currentPage: number; totalPages: number; total: number; params: DiscoverySearchParams; modeHref: string }) {
  const previous = currentPage > 1 ? `${modeHref}?${currentSearchString(params, { page: currentPage - 1 })}` : null;
  const next = currentPage < totalPages ? `${modeHref}?${currentSearchString(params, { page: currentPage + 1 })}` : null;

  return (
    <nav className="flex flex-col gap-3 rounded-3xl border border-border bg-card/90 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between" aria-label="Search results pagination">
      <p className="text-sm text-muted-foreground">Page {currentPage} of {totalPages} · {total.toLocaleString()} results</p>
      <div className="grid grid-cols-2 gap-2 sm:flex">
        <Button asChild={Boolean(previous)} disabled={!previous} variant="outline">
          {previous ? <Link href={previous}><ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous</Link> : <span><ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous</span>}
        </Button>
        <Button asChild={Boolean(next)} disabled={!next} variant="outline">
          {next ? <Link href={next}>Next <ChevronRight className="h-4 w-4" aria-hidden="true" /></Link> : <span>Next <ChevronRight className="h-4 w-4" aria-hidden="true" /></span>}
        </Button>
      </div>
    </nav>
  );
}
