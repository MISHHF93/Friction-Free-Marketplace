import type React from "react";
import Link from "next/link";
import { Bell, BrainCircuit, Clock, Flame, MapPin, Search, ShieldCheck, SlidersHorizontal, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FavoriteToggleForm } from "@/components/favorites/favorite-toggle-form";
import { SaveSearchForm } from "@/components/saved-searches/save-search-form";
import { getFavoriteListingIds } from "@/lib/saves/user-saves";
import { searchMarketplace } from "@/lib/search/discovery";
import type { DiscoveryDocument, DiscoverySearchParams, DiscoverySort } from "@/lib/search/schema";

const sortOptions: Array<{ value: DiscoverySort; label: string; description: string }> = [
  { value: "newest", label: "Newest", description: "Latest active listings first" },
  { value: "closest", label: "Closest", description: "Uses radius when coordinates are supplied" },
  { value: "price_low", label: "Price: low", description: "Lowest price first" },
  { value: "price_high", label: "Price: high", description: "Highest price first" },
  { value: "best_value", label: "Best value", description: "Price advantage plus seller quality" },
  { value: "safest_seller", label: "Safest seller", description: "Trust, low risk, completed sales" },
  { value: "trending", label: "Trending", description: "Views, saves, and freshness signals" }
];

const conditions = ["New", "Like new", "Excellent", "Good", "Fair"];
const categories = ["electronics", "home", "outdoors", "collectibles", "vehicles", "services", "fashion", "baby-kids", "sports", "books-media"];

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function number(value: string | string[] | undefined) {
  const parsed = Number(first(value));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function selectedList(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value.join(",") : value;
  return raw ? raw.split(",").map((item) => item.trim()).filter(Boolean) : undefined;
}

function parseDiscoveryParams(searchParams: SearchParams): DiscoverySearchParams {
  return {
    q: first(searchParams.q),
    category: first(searchParams.category),
    location: first(searchParams.location),
    lat: number(searchParams.lat),
    lng: number(searchParams.lng),
    radiusMiles: number(searchParams.radiusMiles),
    minPrice: number(searchParams.minPrice),
    maxPrice: number(searchParams.maxPrice),
    condition: selectedList(searchParams.condition),
    minSellerTrust: number(searchParams.minSellerTrust),
    sort: (first(searchParams.sort) as DiscoverySort | undefined) ?? "newest",
    limit: 18
  };
}


function titleize(value: string) {
  return value.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function topFacetEntries(facets: Record<string, Record<string, number>>, field: string, limit = 5) {
  return Object.entries(facets[field] ?? {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit);
}

function ActiveFilterChips({ params }: { params: DiscoverySearchParams }) {
  const chips = [
    params.q ? ["Query", params.q] : undefined,
    params.category ? ["Category", titleize(params.category)] : undefined,
    params.location ? ["Location", params.location] : undefined,
    params.minPrice !== undefined ? ["Min price", `$${params.minPrice}`] : undefined,
    params.maxPrice !== undefined ? ["Max price", `$${params.maxPrice}`] : undefined,
    params.condition?.length ? ["Condition", params.condition.join(", ")] : undefined,
    params.minSellerTrust !== undefined ? ["Seller trust", `${params.minSellerTrust}+`] : undefined
  ].filter(Boolean) as string[][];

  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map(([label, value]) => (
        <Badge key={`${label}-${value}`}>{label}: {value}</Badge>
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
  return Object.entries(params).flatMap(([key, value]) => {
    if (omit.includes(key as keyof DiscoverySearchParams) || value === undefined || value === "") return [];
    if (Array.isArray(value)) return <input key={key} type="hidden" name={key} value={value.join(",")} />;
    return <input key={key} type="hidden" name={key} value={String(value)} />;
  });
}

export async function DiscoveryPage({ searchParams, mode = "browse" }: { searchParams: SearchParams; mode?: "browse" | "search" }) {
  const params = parseDiscoveryParams(searchParams);
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [results, recommended, trending, favoriteIds] = await Promise.all([
    searchMarketplace(params),
    searchMarketplace({ ...params, sort: "recommended", limit: 3 }),
    searchMarketplace({ category: params.category, sort: "trending", limit: 3 }),
    user ? getFavoriteListingIds(user.id) : Promise.resolve(new Set<string>())
  ]);

  const currentHref = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    currentHref.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }

  const priceStats = results.facetStats.price_amount;
  const trustStats = results.facetStats.seller_trust_score;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <Badge>{mode === "search" ? "AI search" : "Marketplace discovery"}</Badge>
        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <h1 className="text-4xl font-black tracking-tight">Find trusted listings faster</h1>
            <p className="mt-3 max-w-3xl text-muted-foreground">Keyword search, categories, radius, price, condition, seller trust, and AI buyer intent are ranked through a Meilisearch discovery index.</p>
          </div>
          <div className="rounded-2xl bg-secondary p-4 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">Source: {results.source}</p>
            <p>{results.total} matching listings with recommendations, trending inventory, and saved-search alert support.</p>
            <p className="mt-2">Filters: price, category, location, condition, and seller trust score.</p>
            {priceStats ? <p className="mt-2">Indexed price range: ${Math.round(priceStats.min).toLocaleString()}–${Math.round(priceStats.max).toLocaleString()}</p> : null}
          </div>
        </div>

        <form className="mt-6 grid gap-3 lg:grid-cols-[1fr_170px_170px_auto]" action={mode === "search" ? "/search" : "/browse"}>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input className="pl-10" name="q" defaultValue={params.q} placeholder="Search bikes, sofas, camera kits..." />
          </div>
          <Input name="location" defaultValue={params.location} placeholder="Austin, TX" />
          <Input name="radiusMiles" defaultValue={params.radiusMiles} placeholder="Radius miles" type="number" min="1" />
          <Button><SlidersHorizontal className="h-4 w-4" /> Search</Button>
        </form>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
          <Card>
            <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
            <CardContent>
              <form className="space-y-4" action={mode === "search" ? "/search" : "/browse"}>
                {hiddenInputs(params, ["category", "location", "minPrice", "maxPrice", "condition", "minSellerTrust", "sort"])}
                <label className="grid gap-2 text-sm font-semibold">Category
                  <select name="category" defaultValue={params.category ?? ""} className="h-11 rounded-lg border border-input bg-background px-3 text-sm">
                    <option value="">All categories</option>
                    {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-semibold">Location
                  <Input name="location" defaultValue={params.location} placeholder="City, state, or country" />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="grid gap-2 text-sm font-semibold">Min price<Input name="minPrice" defaultValue={params.minPrice} type="number" min="0" /></label>
                  <label className="grid gap-2 text-sm font-semibold">Max price<Input name="maxPrice" defaultValue={params.maxPrice} type="number" min="0" /></label>
                </div>
                <label className="grid gap-2 text-sm font-semibold">Condition
                  <select name="condition" defaultValue={params.condition?.join(",") ?? ""} className="h-11 rounded-lg border border-input bg-background px-3 text-sm">
                    <option value="">Any condition</option>
                    {conditions.map((condition) => <option key={condition} value={condition}>{condition}</option>)}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-semibold">Minimum seller trust<Input name="minSellerTrust" defaultValue={params.minSellerTrust} type="number" min="0" max="100" placeholder="90" /></label>
                {trustStats ? <p className="text-xs text-muted-foreground">Current seller trust range: {Math.round(trustStats.min)}–{Math.round(trustStats.max)}.</p> : null}
                <Button className="w-full">Apply filters</Button>
                <Button asChild variant="ghost" className="w-full"><Link href={mode === "search" ? "/search" : "/browse"}>Clear filters</Link></Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Indexed facets</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FacetLinkList title="Popular categories" field="category" facets={results.facets} currentHref={currentHref.toString()} />
              <FacetLinkList title="Nearby cities" field="location" facets={results.facets} currentHref={currentHref.toString()} />
              <FacetLinkList title="Top conditions" field="condition" facets={results.facets} currentHref={currentHref.toString()} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Save this search</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Save this query and the alert job will notify you when newly published listings match your filters.</p>
              {user ? <SaveSearchForm params={params} /> : <Button asChild variant="outline" className="w-full"><Link href="/login?next=/search">Sign in to create alert</Link></Button>}
            </CardContent>
          </Card>
        </aside>

        <div className="space-y-6">
          <ActiveFilterChips params={params} />
          <div className="flex flex-wrap gap-2">
            {sortOptions.map((option) => (
              <form key={option.value} action={mode === "search" ? "/search" : "/browse"}>
                {hiddenInputs(params, ["sort"])}
                <input type="hidden" name="sort" value={option.value} />
                <Button type="submit" variant={params.sort === option.value ? "default" : "outline"} size="sm">{option.label}</Button>
              </form>
            ))}
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {results.listings.map((listing) => <DiscoveryListingCard key={listing.id} listing={listing} isFavorited={favoriteIds.has(listing.id)} />)}
          </div>

          {results.listings.length === 0 && (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No listings matched this search. Broaden the radius, remove filters, or use AI intent search for alternatives.</CardContent></Card>
          )}

          <DiscoveryRail title="Recommended for this buyer" icon={<Sparkles className="h-5 w-5" />} listings={recommended.listings} />
          <DiscoveryRail title="Trending listings" icon={<Flame className="h-5 w-5" />} listings={trending.listings} />
          <DiscoveryRail title="Recently viewed" icon={<Clock className="h-5 w-5" />} listings={results.listings.slice(0, 3)} />

          <Card className="border-primary/30 bg-primary/5">
            <CardHeader><CardTitle className="flex items-center gap-2"><BrainCircuit className="h-5 w-5" /> AI buyer intent search</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Send natural language such as “safe mirrorless camera under $1,600 near Seattle” to <code>/api/search/intent</code>. The endpoint extracts filters, rewrites the query, and runs recommended ranking.</p>
              <form className="grid gap-3 md:grid-cols-[1fr_auto]" action="/search">
                <Input name="q" placeholder="Find a safe starter road bike under $1,300" />
                <input type="hidden" name="sort" value="recommended" />
                <Button>Try intent search</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

function DiscoveryListingCard({ listing, isFavorited }: { listing: DiscoveryDocument; isFavorited: boolean }) {
  return (
    <Card className="overflow-hidden">
      {listing.image_url ? <img src={listing.image_url} alt={listing.title} className="h-44 w-full object-cover" /> : <div className="h-44 bg-gradient-to-br from-emerald-100 via-sky-100 to-white" />}
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Badge>{listing.category_name}</Badge>
            <h3 className="mt-3 text-lg font-bold tracking-tight">{listing.title}</h3>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-4 w-4" /> {listing.location_label || "Location available after contact"}</p>
          </div>
          <p className="text-xl font-bold">${listing.price_amount.toLocaleString()}</p>
        </div>
        <div className="grid gap-2 rounded-xl bg-secondary px-3 py-2 text-sm">
          <span className="flex items-center gap-1 font-medium"><ShieldCheck className="h-4 w-4 text-primary" /> Trust {listing.seller_trust_score}</span>
          <span className="text-muted-foreground">{listing.condition} · value {Math.round(listing.value_score)} · trending {Math.round(listing.trend_score)}</span>
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
      <CardHeader><CardTitle className="flex items-center gap-2">{icon}{title}</CardTitle></CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        {listings.map((listing) => (
          <Link href={`/listings/${listing.id}`} key={listing.id} className="rounded-xl border border-border p-4 transition hover:border-primary/50">
            <p className="font-semibold">{listing.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">${listing.price_amount.toLocaleString()} · Trust {listing.seller_trust_score}</p>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
