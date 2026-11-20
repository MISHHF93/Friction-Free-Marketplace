import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronDown, MapPin, Menu, MessageSquare, Search, UserRound } from "lucide-react";
import { logoutAction } from "@/app/auth/actions";
import { BrandLogo } from "@/components/brand/brand-logo";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { ToastCenter } from "@/components/ui/toast-center";
import { GlobalAssistant } from "@/components/ai/global-assistant";
import { brandProfile } from "@/lib/brand-profile";
import { getMarketplaceSession } from "@/lib/auth/session";
import { MobileBackBar, MobileTabBar, PhoneFrame } from "@/components/mobile/mobile-chrome";
import { MenuDisclosure } from "@/components/menu-disclosure";
import { cn } from "@/lib/utils";

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
      { href: "/dashboard/listings/create", label: "Start selling" }
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
      { href: "/safety", label: "Report a problem" }
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
  const session = await getMarketplaceSession();

  if (!session) {
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
      <MenuDisclosure
        className="group relative"
        label={`Open user menu for ${session.displayName}`}
        summaryClassName="flex h-10 cursor-pointer list-none items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-bold shadow-sm transition hover:bg-secondary [&::-webkit-details-marker]:hidden"
        summary={
          <>
          <UserRound className="h-4 w-4" />
          <span className="hidden max-w-28 truncate sm:inline">{session.displayName}</span>
          <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
          </>
        }
      >
        <div className="fixed bottom-0 left-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 rounded-t-3xl border border-border bg-card p-2 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-soft">
          <Link href="/dashboard" className="block rounded-xl px-3 py-2 text-sm font-medium hover:bg-secondary">Dashboard</Link>
          <Link href="/account/settings" className="block rounded-xl px-3 py-2 text-sm font-medium hover:bg-secondary">Account settings</Link>
          <Link href="/dashboard/messages" className="block rounded-xl px-3 py-2 text-sm font-medium hover:bg-secondary">Messages</Link>
          <form action={logoutAction} className="mt-1 border-t border-border pt-1">
            <button className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground" type="submit">
              Log out
            </button>
          </form>
        </div>
      </MenuDisclosure>
    </>
  );
}

function HeaderSearch({ id = "global-marketplace-search", placeholder = "Search listings, budget, condition, or pickup area..." }: { id?: string; placeholder?: string }) {
  return (
    <form action="/search" className="relative w-full" role="search">
      <label htmlFor={id} className="sr-only">Search trusted marketplace listings</label>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        id={id}
        name="q"
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-input bg-card pl-10 pr-4 text-sm font-medium shadow-sm outline-none transition placeholder:text-muted-foreground hover:border-primary focus:border-primary focus:ring-2 focus:ring-ring/30"
      />
    </form>
  );
}

function LocationSelector() {
  return (
    <MenuDisclosure
      className="group relative"
      label="Nearby. Choose marketplace location"
      summaryClassName="flex h-11 cursor-pointer list-none items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-bold shadow-sm transition hover:bg-secondary [&::-webkit-details-marker]:hidden"
      summary={
        <>
        <MapPin className="h-4 w-4 text-primary" />
        <span className="hidden sm:inline">Nearby</span>
        <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
        </>
      }
    >
      <div className="fixed bottom-0 left-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 rounded-t-3xl border border-border bg-card p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-soft">
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
    </MenuDisclosure>
  );
}

function CategoriesMenu() {
  return (
    <MenuDisclosure
      className="group relative"
      label="Open categories menu"
      summaryClassName="flex h-11 cursor-pointer list-none items-center gap-2 rounded-xl px-2 text-sm font-bold text-muted-foreground transition hover:text-foreground [&::-webkit-details-marker]:hidden"
      summary={
        <>
        <Menu className="h-4 w-4" />
        Categories
        <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
        </>
      }
    >
      <div className="fixed bottom-0 left-1/2 z-50 grid max-h-[70vh] w-full max-w-[480px] -translate-x-1/2 gap-2 overflow-y-auto rounded-t-3xl border border-border bg-card p-3 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-soft">
        {categoryLinks.map((category) => (
          <Link href={category.href} className="rounded-xl px-3 py-2 text-sm font-bold hover:bg-secondary" key={category.href}>
            {category.label}
          </Link>
        ))}
      </div>
    </MenuDisclosure>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <PhoneFrame>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <ToastCenter />
      <header className="sticky top-0 z-50 border-b border-border bg-background shadow-xs">
        <div className="flex flex-col gap-3 px-3 py-3">
          <div className="flex items-center justify-between gap-2 pt-[env(safe-area-inset-top)]">
            <div className="flex min-w-0 items-center gap-1">
              <MobileBackBar />
              <BrandLogo href="/" size="sm" showTagline={false} className="min-w-0" />
            </div>
            <div className="flex items-center gap-1.5">
              <GlobalAssistant />
              <AuthNav />
            </div>
          </div>
          <HeaderSearch id="global-marketplace-search" placeholder="Search listings" />
          <div className="flex gap-2">
            <LocationSelector />
            <CategoriesMenu />
          </div>
        </div>
      </header>
      <main id="main-content" className="px-3 pb-[calc(7rem+env(safe-area-inset-bottom))]" tabIndex={-1}>{children}</main>
      <MobileTabBar />
      <footer className="border-t border-border bg-premium-dark px-4 pb-28 pt-8 text-white">
        <div className="grid gap-8">
          <div className="space-y-5">
            <BrandLogo href="/" size="lg" tone="onDark" showTagline />
            <p className="max-w-md text-sm leading-6 text-slate-300">
              {brandProfile.promise}
            </p>
            <div className="flex flex-wrap gap-3">
              <Badge className="border-white/15 bg-white/10 text-white">Web · Android · iOS</Badge>
              <Button asChild variant="outline" className="border-white/15 bg-white/10 text-white hover:bg-white/15">
                <Link href="/contact">Contact support</Link>
              </Button>
            </div>
          </div>
          <nav className="grid gap-7" aria-label="Footer navigation">
            {footerSections.map((section) => (
              <div key={section.title}>
                <h2 className="font-bold text-white">{section.title}</h2>
                <ul className="mt-4 space-y-3 text-sm text-slate-300">
                  {section.links.map((link) => (
                    <li key={`${section.title}-${link.label}`}>
                      <Link href={link.href} className="hover:text-white">{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="border-t border-white/10">
          <div className="flex flex-col gap-3 py-5 text-sm text-slate-200">
            <p>© {new Date().getFullYear()} Friction-Free Marketplace. Built for safer local buying and selling.</p>
            <div className="flex flex-wrap gap-4">
              <Link href="/safety" className="hover:text-white">Safety</Link>
              <Link href="/pricing" className="hover:text-white">Fees</Link>
              <Link href="/company" className="hover:text-white">Company</Link>
              <Link href="/privacy" className="hover:text-white">Privacy</Link>
            </div>
          </div>
        </div>
      </footer>
    </PhoneFrame>
  );
}
