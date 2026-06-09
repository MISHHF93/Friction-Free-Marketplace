import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Baby,
  BadgeCheck,
  BarChart3,
  BellRing,
  Bot,
  Building2,
  Car,
  CreditCard,
  DollarSign,
  Dumbbell,
  Gem,
  Gift,
  Headphones,
  Home,
  Laptop,
  LineChart,
  LockKeyhole,
  MapPin,
  MessageSquare,
  PackageCheck,
  Radar,
  ScanSearch,
  Search,
  ShieldCheck,
  Shirt,
  Sofa,
  Sparkles,
  Store,
  TrendingUp,
  Truck,
  Users,
  WalletCards,
  Wrench,
} from "lucide-react";
import { AppPromotionPanel, IntelligenceCard, MarketplaceSearchBar, TestimonialCard, ToolCard } from "@/components/home/homepage-components";
import { CategoryCard, CTASection, FeatureCard, SectionHeader, TrustBadge, sectionSpacing } from "@/components/marketplace-layout";
import { PublicListingGrid } from "@/components/public-listing-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getFeaturedListings, getPublicCategories, getTrustSafetyStats } from "@/lib/public-marketplace";
import type { DiscoveryDocument } from "@/lib/search/schema";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Friction-Free Marketplace | Safer local buying and selling",
  description: "Find verified local listings, compare seller signals, message clearly, and use protected checkout when it is available.",
  keywords: ["local marketplace", "verified sellers", "protected payments", "safe pickup", "listing assistant"],
  alternates: { canonical: "/" },
  openGraph: {
    title: "Friction-Free Marketplace | Safer local buying and selling",
    description: "A local marketplace with verified seller signals, clear listings, protected checkout, and practical safety tools.",
    url: "/",
    type: "website",
    siteName: "Friction-Free Marketplace"
  },
  twitter: {
    card: "summary_large_image",
    title: "Friction-Free Marketplace",
    description: "Local buying and selling with verified listings, protected payments, and clear trust signals."
  }
};

const categoryCards = [
  { slug: "vehicles", title: "Vehicles", description: "Cars, bikes, parts, and seller history you can review before you meet.", icon: Car, accent: "from-sky-50 to-white" },
  { slug: "electronics", title: "Electronics", description: "Phones, laptops, cameras, and gear with clear condition details.", icon: Laptop, accent: "from-indigo-50 to-white" },
  { slug: "furniture", title: "Furniture", description: "Sofas, tables, decor, and home finds with pickup details up front.", icon: Sofa, accent: "from-amber-50 to-white" },
  { slug: "home", title: "Home", description: "Appliances, lighting, storage, and everyday goods from local sellers.", icon: Home, accent: "from-emerald-50 to-white" },
  { slug: "fashion", title: "Fashion", description: "Clothing, sneakers, and accessories with seller signals and photos.", icon: Shirt, accent: "from-rose-50 to-white" },
  { slug: "tools", title: "Tools", description: "Power tools, workshop gear, and equipment with condition notes.", icon: Wrench, accent: "from-orange-50 to-white" },
  { slug: "real-estate", title: "Real estate", description: "Rentals, rooms, workspaces, and local property services.", icon: Building2, accent: "from-cyan-50 to-white" },
  { slug: "services", title: "Services", description: "Local help for repairs, moving, setup, and projects around town.", icon: Users, accent: "from-violet-50 to-white" },
  { slug: "collectibles", title: "Collectibles", description: "Rare goods, cards, art, and memorabilia with provenance notes.", icon: Gem, accent: "from-purple-50 to-white" },
  { slug: "sports", title: "Sports", description: "Fitness, outdoor gear, bikes, and team equipment for local pickup.", icon: Dumbbell, accent: "from-lime-50 to-white" },
  { slug: "baby-kids", title: "Baby/kids", description: "Strollers, toys, clothes, and family items with practical filters.", icon: Baby, accent: "from-pink-50 to-white" },
  { slug: "free-items", title: "Free items", description: "Giveaways, curb alerts, and reuse finds coordinated locally.", icon: Gift, accent: "from-slate-50 to-white" }
];

const trustStripItems = [
  { icon: BadgeCheck, label: "Seller checks", description: "Identity, profile, and account history signals" },
  { icon: CreditCard, label: "Protected payment", description: "Checkout support for eligible listings" },
  { icon: ScanSearch, label: "Risk review", description: "Checks for pricing, duplicate content, and unsafe requests" },
  { icon: MapPin, label: "Safer handoff", description: "Pickup and shipping guidance before you commit" },
  { icon: Headphones, label: "Support record", description: "Reports, disputes, and audit history stay connected" }
];

const assistantFeatures = [
  { icon: Bot, title: "Search help", description: "Describe what you need in plain language and narrow results by price, distance, condition, and seller trust.", badge: "Search" },
  { icon: Sparkles, title: "Listing help", description: "Turn photos and notes into a clear draft with condition details, category, title, and fulfillment notes.", badge: "Create" },
  { icon: DollarSign, title: "Pricing context", description: "Review category, condition, and nearby listing signals before setting a price or making an offer.", badge: "Pricing" },
  { icon: ShieldCheck, title: "Risk checks", description: "Flag suspicious prices, duplicate content, off-platform payment requests, and unusual account activity.", badge: "Safety" },
  { icon: MessageSquare, title: "Offer guidance", description: "Keep offers, counters, deposits, and deal history in one place so both sides have a clear record.", badge: "Offers" }
];

const sellerTools = [
  { icon: Sparkles, title: "Listing draft helper", description: "Create a clean title, description, category, and condition summary from photos and notes.", href: "/dashboard/ai-listing-creator", cta: "Draft a listing" },
  { icon: DollarSign, title: "Price guidance", description: "Compare condition, category, and nearby listings before choosing an asking price.", href: "/seller", cta: "Review seller tools" },
  { icon: LineChart, title: "Seller overview", description: "See views, saves, messages, offers, and listing quality in one workspace.", href: "/dashboard/seller", cta: "Open seller dashboard" },
  { icon: WalletCards, title: "Payment setup", description: "Enable protected checkout and payouts before you accept higher-value buyers.", href: "/dashboard/payments", cta: "Set up payments" }
];

const buyerTools = [
  { icon: Search, title: "Plain-language search", description: "Search by budget, distance, condition, pickup options, trust score, and must-have details.", href: "/search", cta: "Search marketplace" },
  { icon: BellRing, title: "Saved searches", description: "Get notified when listings match your budget, area, and category preferences.", href: "/dashboard/saved-searches", cta: "Create an alert" },
  { icon: MessageSquare, title: "Clear offers", description: "Make offers, counter, reserve, and keep deal context inside marketplace chat.", href: "/dashboard/offers", cta: "Manage offers" },
  { icon: ShieldCheck, title: "Trust comparison", description: "Review seller trust, payment readiness, condition details, and risk signals before you message.", href: "/trust-and-safety", cta: "Review safety signals" }
];

const howItWorksSteps = [
  { icon: Bot, title: "Say what you need", description: "Search by budget, style, distance, condition, pickup options, and required details." },
  { icon: Search, title: "Compare listings", description: "Review seller trust, item condition, payment readiness, and risk signals before you contact anyone." },
  { icon: MessageSquare, title: "Message or offer", description: "Keep questions, offers, counters, and reservation details in one marketplace thread." },
  { icon: LockKeyhole, title: "Use protected checkout", description: "For eligible listings, payment status, receipts, refunds, and disputes stay connected to the order." },
  { icon: Truck, title: "Complete the handoff", description: "Coordinate pickup, delivery, shipping, and proof of completion with a clear record." }
];

const testimonials = [
  {
    quote: "The seller signals and payment status help me decide which listings are worth a message.",
    name: "Maya R.",
    role: "Buyer preview participant"
  },
  {
    quote: "The listing helper made the description clearer and gave buyers the details they asked for.",
    name: "Jon Bell",
    role: "Seller preview participant"
  },
  {
    quote: "Risk warnings, pickup guidance, and offer history make the process feel more accountable.",
    name: "Ari Chen",
    role: "Marketplace advisor"
  }
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function medianPrice(listings: DiscoveryDocument[]) {
  const prices = listings.map((listing) => Number(listing.price_amount)).filter((price) => Number.isFinite(price) && price > 0).sort((a, b) => a - b);
  if (!prices.length) return null;
  return prices[Math.floor(prices.length / 2)] ?? null;
}

export default async function HomePage() {
  const [featured, categoryResult, stats] = await Promise.all([getFeaturedListings(6), getPublicCategories(20), getTrustSafetyStats()]);
  const countBySlug = new Map(categoryResult.categories.map((category) => [category.slug, category.listingCount]));
  const topCategory = categoryCards
    .map((category) => ({ ...category, count: countBySlug.get(category.slug) ?? 0 }))
    .sort((a, b) => b.count - a.count)[0];
  const featuredMedianPrice = medianPrice(featured.listings);

  return (
    <>
      <section className={cn(sectionSpacing.shell, "grid gap-8 py-10 sm:gap-10 sm:py-14 lg:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)] lg:items-center lg:py-18 xl:py-20")} aria-labelledby="homepage-hero-heading">
        <div className="flex flex-col justify-center">
          <Badge variant="ai" className="w-fit">
            <Sparkles className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Trusted local marketplace with AI help
          </Badge>
          <h1 id="homepage-hero-heading" className="mt-5 max-w-5xl text-hero text-foreground sm:mt-6">
            Buy and sell locally with clearer information and safer payment.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:mt-6 sm:text-lg sm:leading-8">
            Friction-Free helps people find verified listings, compare seller signals, message with context, and complete local deals with more confidence.
          </p>
          <div className="mt-7 grid gap-3 sm:flex sm:flex-wrap">
            <Button asChild size="lg" variant="trust">
              <Link href="/browse">Browse listings <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/dashboard/listings/create">Start selling</Link>
            </Button>
          </div>
          <div className="mt-6 grid gap-2 sm:flex sm:flex-wrap">
            <TrustBadge icon={ShieldCheck} label="AI scam checks" tone="emerald" />
            <TrustBadge icon={CreditCard} label="Protected checkout" tone="sky" />
            <TrustBadge icon={BadgeCheck} label="Verified sellers" tone="slate" />
          </div>
        </div>
        <div className="relative">
          <div className="absolute -inset-3 rounded-[2.5rem] bg-gradient-to-br from-emerald-200/60 via-sky-200/40 to-white blur-2xl sm:-inset-4" aria-hidden="true" />
          <div className="relative overflow-hidden rounded-[1.75rem] border border-white/70 bg-slate-950 p-3 text-white shadow-soft sm:rounded-[2rem] sm:p-5">
            <div className="rounded-[1.35rem] bg-[radial-gradient(circle_at_top_right,_rgba(20,184,166,0.45),_transparent_26rem)] p-4 sm:rounded-[1.5rem] sm:p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">Marketplace checks</p>
                  <h2 className="mt-3 text-2xl font-black">Useful signals before you commit</h2>
                </div>
                <Bot className="h-9 w-9 text-emerald-300" aria-hidden="true" />
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <IntelligenceCard label="Active listings" value={stats.activeListings.toLocaleString()} detail={`Live source: ${stats.source}`} icon={Store} />
                <IntelligenceCard label="Checked sellers" value={stats.trustedSellers.toLocaleString()} detail="Identity and account signals" icon={BadgeCheck} />
                <IntelligenceCard label="Completed trades" value={stats.completedTransactions.toLocaleString()} detail="Recorded marketplace transactions" icon={PackageCheck} />
                <IntelligenceCard label="Lower-risk accounts" value={`${stats.lowRiskRate}%`} detail="Current risk mix" icon={ShieldCheck} />
              </div>
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/10 p-4">
                <p className="text-sm font-semibold text-slate-100">Search assistant preview</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">&quot;Find a verified mirrorless camera kit under $1,700, low fraud risk, shipping available.&quot;</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={cn(sectionSpacing.shell, "pb-8")} aria-labelledby="marketplace-search-heading">
        <h2 id="marketplace-search-heading" className="sr-only">Marketplace search bar</h2>
        <MarketplaceSearchBar />
        <div className="scroll-rail mt-4">
          {categoryCards.slice(0, 8).map((category) => (
            <Link href={`/categories/${category.slug}`} className="shrink-0 rounded-full border border-border bg-white/85 px-3 py-1.5 text-sm font-bold text-muted-foreground shadow-xs transition hover:border-primary/40 hover:text-primary" key={category.slug}>
              {category.title}
            </Link>
          ))}
        </div>
      </section>

      <section className={cn(sectionSpacing.shell, sectionSpacing.section)}>
        <SectionHeader
          eyebrow="Popular categories"
          title="Start with the categories people use most."
          description="Browse local goods, services, vehicles, home finds, electronics, and high-value items with seller and safety signals visible from the start."
          action={<Button asChild variant="outline"><Link href="/browse">Browse all categories</Link></Button>}
        />
        <div className="adaptive-grid">
          {categoryCards.map((category) => (
            <CategoryCard
              key={category.slug}
              title={category.title}
              description={category.description}
              href={`/categories/${category.slug}`}
              icon={category.icon}
              count={countBySlug.get(category.slug)}
              accent={category.accent}
            />
          ))}
        </div>
      </section>

      <section className={cn(sectionSpacing.shell, sectionSpacing.section)}>
        <div className="rounded-[2rem] border border-border bg-white/70 p-5 shadow-sm backdrop-blur sm:p-8">
          <SectionHeader
            eyebrow="Marketplace assistant"
            title="Practical AI help where it saves time."
            description="The assistant helps with search, listing drafts, pricing context, offers, and risk checks without turning the marketplace into a black box."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
            {assistantFeatures.map((feature) => <FeatureCard key={feature.title} {...feature} />)}
          </div>
        </div>
      </section>

      <section className={cn(sectionSpacing.shell, sectionSpacing.section)}>
        <SectionHeader
          eyebrow="Featured listings"
          title="Fresh inventory with the right details up front."
          description="Featured cards use real marketplace data when available and show price, location, condition, seller trust, save actions, and payment readiness."
          action={<Button asChild variant="trust"><Link href="/search">Search listings</Link></Button>}
        />
        <PublicListingGrid
          listings={featured.listings}
          emptyTitle="No featured listings are available yet"
          emptyDescription="When inventory is live, listings will appear here with seller, payment, and safety details. You can still browse the marketplace or create a listing."
        />
      </section>

      <section className={cn(sectionSpacing.shell, "py-10")} aria-labelledby="trust-safety-strip-heading">
        <h2 id="trust-safety-strip-heading" className="sr-only">Trust and safety strip</h2>
        <div className="grid gap-3 rounded-[2rem] border border-border bg-white/80 p-3 shadow-md backdrop-blur sm:grid-cols-2 sm:p-4 lg:grid-cols-3 2xl:grid-cols-5">
          {trustStripItems.map((item) => (
            <TrustBadge key={item.label} icon={item.icon} label={item.label} description={item.description} tone="slate" className="h-full" />
          ))}
        </div>
      </section>

      <section className={cn(sectionSpacing.shell, sectionSpacing.section)}>
        <SectionHeader
          eyebrow="How it works"
          title="A clear path from search to handoff."
          description="The process helps you compare listings, message with context, use protected payment when available, and keep pickup or shipping details organized."
          align="center"
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          {howItWorksSteps.map((step, index) => (
            <Card key={step.title} className="relative shadow-md">
              <CardContent className="p-5 sm:p-5">
                <Badge className="mb-4" variant="ai">Step {index + 1}</Badge>
                <step.icon className="h-7 w-7 text-primary" aria-hidden="true" />
              <h3 className="mt-4 text-lg font-black">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className={cn(sectionSpacing.shell, sectionSpacing.section)}>
        <div className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-soft">
          <div className="grid gap-6 bg-[radial-gradient(circle_at_top_right,_rgba(20,184,166,0.16),_transparent_30rem)] p-4 sm:p-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-8 lg:p-8 xl:p-10">
          <SectionHeader
            eyebrow="Seller tools"
            title="Create better listings and manage buyers with less guesswork."
            description="Sellers get listing draft help, pricing context, buyer messages, offers, payment setup, and performance details in one workspace."
            className="mb-0"
            action={<Button asChild variant="trust"><Link href="/dashboard/listings/create">Create a listing</Link></Button>}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {sellerTools.map((tool) => <ToolCard key={tool.title} {...tool} />)}
          </div>
          </div>
        </div>
      </section>

      <section className={cn(sectionSpacing.shell, sectionSpacing.section)}>
        <SectionHeader
          eyebrow="Buyer tools"
          title="Find the right deal without sorting through noise."
          description="Buyer tools bring plain-language search, saved alerts, clear offers, and seller comparison into one calmer marketplace experience."
          action={<Button asChild variant="outline"><Link href="/dashboard/buyer">Open buyer dashboard</Link></Button>}
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {buyerTools.map((tool) => <ToolCard key={tool.title} {...tool} />)}
        </div>
      </section>

      <section className={cn(sectionSpacing.shell, sectionSpacing.section)}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:items-center xl:gap-8">
          <SectionHeader
            eyebrow="Local market signals"
            title="Use local context before you list, offer, or drive across town."
            description="Market signals combine active inventory, category demand, risk mix, and featured-listing prices so buyers and sellers can make better decisions."
            className="mb-0"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <IntelligenceCard label="Active inventory" value={stats.activeListings.toLocaleString()} detail={`Pulled from ${stats.source} marketplace data.`} icon={Radar} />
            <IntelligenceCard label="Top category" value={topCategory?.title ?? "Building"} detail={topCategory && topCategory.count > 0 ? `${topCategory.count.toLocaleString()} active listings.` : "Category demand appears as listings are published."} icon={TrendingUp} />
            <IntelligenceCard label="Featured median" value={featuredMedianPrice ? formatCurrency(featuredMedianPrice) : "Pending"} detail={featuredMedianPrice ? "Median price across currently featured results." : "Price guidance appears when live listings are available."} icon={BarChart3} />
            <IntelligenceCard label="Low-risk mix" value={`${stats.lowRiskRate}%`} detail="Share of scored accounts currently marked low risk." icon={ShieldCheck} />
          </div>
        </div>
      </section>

      <section className={cn(sectionSpacing.shell, sectionSpacing.section)}>
        <SectionHeader
          eyebrow="Testimonials"
          title="Early users are helping shape the marketplace."
          description="These preview notes reflect the product goals: clearer listings, safer payments, and fewer surprises during local deals."
          align="center"
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {testimonials.map((testimonial) => <TestimonialCard key={testimonial.name} {...testimonial} />)}
        </div>
      </section>

      <section className={cn(sectionSpacing.shell, sectionSpacing.section)}>
        <AppPromotionPanel />
      </section>

      <CTASection
        eyebrow="Build trust into every deal"
        title="Browse, list, message, and pay with a clearer record."
        description="Friction-Free brings search, seller signals, risk checks, messaging, offers, and payments together so buyers and sellers can make informed decisions."
        primaryHref="/browse"
        primaryLabel="Explore marketplace"
        secondaryHref="/dashboard/listings/create"
        secondaryLabel="Start selling"
        points={["Plain-language search", "Seller trust signals", "Protected payment options", "Risk and moderation checks"]}
      />
    </>
  );
}
