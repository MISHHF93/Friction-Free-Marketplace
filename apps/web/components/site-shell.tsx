import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronDown, UserRound } from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { BrandLogo } from "@/components/brand/brand-logo";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { buttonVariants } from "@/components/ui/button";
import { ToastCenter } from "@/components/ui/toast-center";
import { ConditionalHeaderSearch } from "@/components/header-search";
import { brandProfile } from "@/lib/brand-profile";
import { getMarketplaceSession } from "@/lib/auth/session";
import { AppShell, DesktopNav, MobileBackBar, MobileTabBar, PageTitleMirror } from "@/components/mobile/mobile-chrome";
import { HeaderBrand } from "@/components/mobile/header-brand";
import { MenuDisclosure } from "@/components/menu-disclosure";
import { cn } from "@/lib/utils";

const footerLinks = [
  { href: "/pricing", label: "Pricing" },
  { href: "/advertise", label: "Advertise" },
  { href: "/safety", label: "Safety" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/contact", label: "Contact" }
];

async function AuthNav() {
  const session = await getMarketplaceSession();

  if (!session) {
    return (
      <>
        <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "whitespace-nowrap")}>
          Log in
        </Link>
        <Link href="/signup" className={cn(buttonVariants({ variant: "trust", size: "sm" }), "whitespace-nowrap shadow-trust")}>
          Sign up
        </Link>
      </>
    );
  }

  return (
    <>
      <NotificationBell />
      <MenuDisclosure
        className="group relative"
        label={`Open user menu for ${session.displayName}`}
        summaryClassName="flex h-10 cursor-pointer list-none items-center gap-1 rounded-full border border-border bg-card px-2.5 text-sm font-bold shadow-sm transition hover:bg-secondary [&::-webkit-details-marker]:hidden"
        summary={
          <>
            {/* The signed-in name stays visible so people always know which account they are acting as. */}
            <UserRound className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="max-w-[5.5rem] truncate">{session.displayName}</span>
            <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" aria-hidden="true" />
          </>
        }
      >
        <div className="fixed inset-x-0 bottom-0 z-50 w-full rounded-t-3xl border border-border bg-card p-2 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-soft md:absolute md:inset-x-auto md:bottom-auto md:right-0 md:top-full md:mt-2 md:w-56 md:rounded-2xl md:pb-2">
          <Link href="/dashboard" className="block min-h-11 rounded-xl px-3 py-2 text-sm font-medium hover:bg-secondary">Dashboard</Link>
          <Link href="/dashboard/orders" className="block min-h-11 rounded-xl px-3 py-2 text-sm font-medium hover:bg-secondary">Orders</Link>
          <Link href="/account/settings" className="block min-h-11 rounded-xl px-3 py-2 text-sm font-medium hover:bg-secondary">Account settings</Link>
          <Link href="/dashboard/messages" className="block min-h-11 rounded-xl px-3 py-2 text-sm font-medium hover:bg-secondary">Messages</Link>
          <div className="mt-1 border-t border-border pt-1">
            <LogoutButton className="min-h-11 w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground" label="Log out" />
          </div>
        </div>
      </MenuDisclosure>
    </>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <ToastCenter />
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="app-container flex flex-col gap-2 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <MobileBackBar />
              <HeaderBrand
                full={
                  <div className="min-w-0">
                    <BrandLogo href="/" size="sm" showTagline={false} className="min-w-0 whitespace-nowrap" />
                    <PageTitleMirror />
                  </div>
                }
                compact={
                  <div className="flex min-w-0 items-center gap-2">
                    <BrandLogo href="/" size="sm" variant="mark" showTagline={false} />
                    <div className="min-w-0"><PageTitleMirror /></div>
                  </div>
                }
              />
            </div>
            <DesktopNav />
            <div className="flex shrink-0 items-center gap-1.5">
              <AuthNav />
            </div>
          </div>
          <ConditionalHeaderSearch />
        </div>
      </header>
      {/* min-h keeps the footer below the fold on short pages, so it never fills the screen above the tab bar. */}
      <main id="main-content" className="min-h-[100dvh] px-3 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-4 md:pb-12" tabIndex={-1}>{children}</main>
      <MobileTabBar />
      <footer className="border-t border-border bg-secondary pb-24 pt-6 text-foreground md:pb-8">
        <div className="app-container space-y-3">
          <BrandLogo href="/" size="sm" showTagline={false} />
          <nav aria-label="Footer navigation">
            <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold">
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:underline">{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Friction-Free Marketplace. {brandProfile.promise}</p>
        </div>
      </footer>
    </AppShell>
  );
}
