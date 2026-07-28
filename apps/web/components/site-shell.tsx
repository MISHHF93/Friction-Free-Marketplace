import Link from "next/link";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { ChevronDown, MapPin, Menu, MessageSquare, Search, ShieldCheck, Store, UserRound } from "lucide-react";
import { logoutAction } from "@/app/auth/actions";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { ToastCenter } from "@/components/ui/toast-center";
import { GlobalAssistant } from "@/components/ai/global-assistant";
import { DEV_AUTH_BYPASS_COOKIE, isDevAuthBypassCookieValue } from "@/lib/auth/dev-bypass";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/browse", label: "Browse" },
  { href: "/categories", label: "Categories" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/safety", label: "Safety" },
  { href: "/pricing", label: "Pricing" }
];

const categoryLinks = [
  { href: "/categories/vehicles", label: "Vehicles" },
  { href: "/categories/electronics", label: "Electronics" },
  { href: "/categories/furniture", label: "Furniture" },
  { href: "/categories/home", label: "Home" },
  { href: "/categories/fashion", label: "Fashion" },
  { href: "/categories/tools", label: "Tools" },
  { href: "/categories/real-estate", label: "Real estate" },
  { href: "/categories/services", label: "Services" },
  { href: "/categories/free-items", label: "Free items" }
];

const footerSections = [
  {
    title: "Marketplace",
    links: [
      { href: "/browse", label: "Browse listings" },
      { href: "/search", label: "Search marketplace" },
      { href: "/categories", label: "Categories" },
      { href: "/categories/vehicles", label: "Vehicles" },
      { href: "/login?next=/dashboard/listings/create", label: "Start selling" }
    ]
  },
  {
    title: "Company",
    links: [
      { href: "/how-it-works", label: "How it works" },
      { href: "/pricing", label: "Pricing" },
      { href: "/company", label: "Company" },
      { href: "/assistant", label: "Marketplace assistant" },
      { href: "/contact", label: "Contact" }
    ]
  },
  {
    title: "Safety",
    links: [
      { href: "/safety", label: "Trust and safety" },
      { href: "/dashboard/trust-score", label: "Trust scores" },
      { href: "/dashboard/verification", label: "Verification" },
      { href: "/admin/fraud-alerts", label: "Fraud review" }
    ]
  },
  {
    title: "Legal",
    links: [
      { href: "/safety", label: "Community standards" },
      { href: "/pricing", label: "Fees" },
      { href: "/privacy", label: "Privacy policy" },
      { href: "/terms", label: "Terms of service" }
    ]
  }
];

async function AuthNav() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const cookieStore = await cookies();
  const hasDevBypass = isDevAuthBypassCookieValue(cookieStore.get(DEV_AUTH_BYPASS_COOKIE)?.value);

  if (!user && !hasDevBypass) {
    return (
      <>
        <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden sm:inline-flex")}>
          Log in
        </Link>
        <Link href="/signup" className={cn(buttonVariants({ variant: "trust", size: "sm" }), "shadow-trust")}>
          Sign up
        </Link>
      </>
    );
  }

  return (
    <>
      <Link href="/dashboard/messages" className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "relative")} aria-label="Open messages">
        <MessageSquare className="h-4 w-4" />
      </Link>
      <NotificationBell />
      <details className="group relative">
        <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-bold shadow-sm transition hover:bg-secondary [&::-webkit-details-marker]:hidden" aria-label="Open user menu">
          <UserRound className="h-4 w-4" />
          <span className="hidden max-w-28 truncate sm:inline">{user?.email ?? "Dev bypass"}</span>
          <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
        </summary>
        <div className="absolute right-0 z-50 mt-3 w-64 rounded-2xl border border-border bg-card p-2 shadow-soft motion-dropdown">
          <Link href="/dashboard" className="block rounded-xl px-3 py-2 text-sm font-medium hover:bg-secondary">Dashboard</Link>
          <Link href="/account/settings" className="block rounded-xl px-3 py-2 text-sm font-medium hover:bg-secondary">Account settings</Link>
          <Link href="/dashboard/messages" className="block rounded-xl px-3 py-2 text-sm font-medium hover:bg-secondary">Messages</Link>
          <form action={logoutAction} className="mt-1 border-t border-border pt-1">
            <button className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground" type="submit">
              Log out
            </button>
          </form>
        </div>
      </details>
    </>
  );
}

function HeaderSearch() {
  return (
    <form action="/search" className="relative w-full" role="search">
      <label htmlFor="global-marketplace-search" className="sr-only">Search trusted marketplace listings</label>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        id="global-marketplace-search"
        name="q"
        placeholder="Search listings, budget, condition, or pickup area..."
        className="h-11 w-full rounded-xl border border-input bg-card px-10 text-sm font-medium shadow-sm outline-none transition placeholder:text-muted-foreground hover:border-primary focus:border-primary focus:ring-2 focus:ring-ring/30"
      />
      <Badge variant="ai" className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 sm:inline-flex">AI</Badge>
    </form>
  );
}

function LocationSelector() {
  return (
    <details className="group relative">
      <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-bold shadow-sm transition hover:bg-secondary [&::-webkit-details-marker]:hidden" aria-label="Choose marketplace location">
        <MapPin className="h-4 w-4 text-primary" />
        <span className="hidden sm:inline">Nearby</span>
        <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
      </summary>
      <div className="fixed left-4 right-4 top-32 z-50 rounded-2xl border border-border bg-card p-4 shadow-soft motion-dropdown md:absolute md:left-0 md:right-auto md:top-auto md:mt-3 md:w-72">
        <p className="font-bold">Shop near you</p>
        <p className="mt-1 text-sm text-muted-foreground">Use location, pickup, shipping, and radius filters to narrow results.</p>
        <div className="mt-4 grid gap-2">
          {["Use current city", "Pickup near me", "Ships nationwide"].map((label) => (
            <Link href={`/search?location=${encodeURIComponent(label)}`} className="rounded-xl border border-border px-3 py-2 text-sm font-bold hover:border-primary/50 hover:bg-trust-soft" key={label}>
              {label}
            </Link>
          ))}
        </div>
      </div>
    </details>
  );
}

function CategoriesMenu() {
  return (
    <details className="group relative">
      <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-xl px-2 text-sm font-bold text-muted-foreground transition hover:text-foreground [&::-webkit-details-marker]:hidden" aria-label="Open categories menu">
        <Menu className="h-4 w-4" />
        Categories
        <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
      </summary>
      <div className="fixed left-4 right-4 top-32 z-50 grid gap-2 rounded-2xl border border-border bg-card p-3 shadow-soft motion-dropdown sm:grid-cols-3 md:absolute md:left-0 md:right-auto md:top-auto md:mt-3 md:w-[min(42rem,calc(100vw-2rem))]">
        {categoryLinks.map((category) => (
          <Link href={category.href} className="rounded-xl px-3 py-2 text-sm font-bold hover:bg-secondary" key={category.href}>
            {category.label}
          </Link>
        ))}
      </div>
    </details>
  );
}

function MobilePrimaryNav() {
  return (
    <details className="group relative shrink-0 md:hidden">
      <summary className="inline-flex h-9 cursor-pointer list-none items-center gap-2 rounded-lg border border-border bg-card px-3 text-xs font-bold shadow-xs transition hover:bg-secondary [&::-webkit-details-marker]:hidden" aria-label="Open mobile navigation">
        <Menu className="h-4 w-4" aria-hidden="true" />
        Menu
        <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="fixed left-4 right-4 top-32 z-50 rounded-2xl border border-border bg-card p-3 shadow-soft motion-dropdown">
        <nav className="grid gap-1" aria-label="Mobile primary navigation">
          {navLinks.map((link) => (
            <Link href={link.href} className="rounded-xl px-3 py-2 text-sm font-bold hover:bg-secondary" key={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </details>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <ToastCenter />
      <header className="sticky top-0 z-50 border-b border-border bg-background shadow-xs">
        <div className="app-container flex flex-col gap-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="flex min-w-0 items-center gap-2 font-black tracking-tight" aria-label="Friction-Free home">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-premium-dark text-white shadow-soft sm:h-11 sm:w-11">
                <Store className="h-5 w-5" />
              </span>
              <span className="hidden leading-tight sm:block">
                <span className="block font-display text-lg leading-none">Friction-Free</span>
                <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-primary">The trusted marketplace</span>
              </span>
            </Link>
            <div className="hidden items-center gap-2 xl:flex">
              <LocationSelector />
              <CategoriesMenu />
            </div>
            <div className="hidden min-w-0 flex-1 md:block xl:max-w-xl">
              <HeaderSearch />
            </div>
            <nav className="hidden items-center gap-5 text-sm font-semibold text-muted-foreground 2xl:flex" aria-label="Primary navigation">
              {navLinks.map((link) => (
                <Link key={link.href} className="whitespace-nowrap hover:text-foreground" href={link.href}>
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <GlobalAssistant />
              <Button asChild className="hidden shadow-trust sm:inline-flex" variant="trust">
                <Link href="/login?next=/dashboard/listings/create">Sell</Link>
              </Button>
              <AuthNav />
            </div>
          </div>
          <div className="grid gap-2 md:hidden">
            <HeaderSearch />
            <div className="flex min-w-0 flex-wrap gap-2">
              <MobilePrimaryNav />
              <LocationSelector />
              <CategoriesMenu />
              <Link href="/dashboard/listings/create" className={cn(buttonVariants({ variant: "trust", size: "sm" }), "shrink-0")}>Sell</Link>
            </div>
          </div>
        </div>
      </header>
      <main id="main-content" tabIndex={-1}>{children}</main>
      <footer className="border-t border-border bg-premium-dark text-white">
        <div className="app-container grid gap-10 py-10 sm:py-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)]">
          <div className="space-y-5">
            <Link href="/" className="inline-flex items-center gap-2 font-black tracking-tight text-white" aria-label="Friction-Free home">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-trust-soft text-trust">
                <ShieldCheck className="h-5 w-5" />
              </span>
              Friction-Free
            </Link>
            <p className="max-w-md text-sm leading-6 text-slate-300">
              A local marketplace for clearer listings, safer payments, verified seller signals, and better handoffs.
            </p>
            <div className="flex flex-wrap gap-3">
              <Badge className="border-white/15 bg-white/10 text-white">Web · Android · iOS</Badge>
              <Button asChild variant="outline" className="border-white/15 bg-white/10 text-white hover:bg-white/15">
                <Link href="/contact">Contact support</Link>
              </Button>
            </div>
          </div>
          <nav className="grid gap-7 sm:grid-cols-2 xl:grid-cols-4" aria-label="Footer navigation">
            {footerSections.map((section) => (
              <div key={section.title}>
                <h2 className="font-bold text-white">{section.title}</h2>
                <ul className="mt-4 space-y-3 text-sm text-slate-300">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="hover:text-white">{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="border-t border-white/10">
          <div className="app-container flex flex-col gap-3 py-5 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} Friction-Free Marketplace. Built for safer local buying and selling.</p>
            <div className="flex flex-wrap gap-4">
              <Link href="/safety" className="hover:text-white">Safety</Link>
              <Link href="/pricing" className="hover:text-white">Fees</Link>
              <Link href="/company" className="hover:text-white">Company</Link>
              <Link href="/account/settings" className="hover:text-white">Privacy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
