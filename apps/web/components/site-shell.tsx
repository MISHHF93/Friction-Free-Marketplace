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
import { MobileBackBar, MobileTabBar, PageTitleMirror, PhoneFrame } from "@/components/mobile/mobile-chrome";
import { MenuDisclosure } from "@/components/menu-disclosure";
import { cn } from "@/lib/utils";

const footerLinks = [
  { href: "/pricing", label: "Pricing" },
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
        <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
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
      <NotificationBell />
      <MenuDisclosure
        className="group relative"
        label={`Open user menu for ${session.displayName}`}
        summaryClassName="flex h-10 cursor-pointer list-none items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-bold shadow-sm transition hover:bg-secondary [&::-webkit-details-marker]:hidden"
        summary={
          <>
            <UserRound className="h-4 w-4" />
            <span className="max-w-24 truncate">{session.displayName}</span>
            <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
          </>
        }
      >
        <div className="fixed bottom-0 left-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 rounded-t-3xl border border-border bg-card p-2 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-soft">
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
    <PhoneFrame>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <ToastCenter />
      <header className="sticky top-0 z-50 border-b border-border bg-background">
        <div className="flex flex-col gap-2 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1">
              <MobileBackBar />
              <div className="min-w-0">
                <BrandLogo href="/" size="sm" showTagline={false} className="min-w-0" />
                <PageTitleMirror />
              </div>
            </div>
            <div className="flex items-center gap-1">
              <AuthNav />
            </div>
          </div>
          <ConditionalHeaderSearch />
        </div>
      </header>
      {/* min-h keeps the footer below the fold on short pages, so it never fills the screen above the tab bar. */}
      <main id="main-content" className="min-h-[100dvh] px-3 pb-[calc(5.5rem+env(safe-area-inset-bottom))]" tabIndex={-1}>{children}</main>
      <MobileTabBar />
      <footer className="border-t border-border bg-secondary px-4 pb-24 pt-4 text-foreground">
        <div className="space-y-3">
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
    </PhoneFrame>
  );
}
