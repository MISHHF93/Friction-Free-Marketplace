"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Activity, AlertTriangle, Bot, ChevronRight, FileSearch, Gavel, Heart, Home, LineChart, ListChecks, MessageSquare, ReceiptText, Search, Settings, ShieldCheck, ShoppingBag, Sparkles, Store, Tags, UserCheck, Users, WalletCards, type LucideIcon } from "lucide-react";
import type { DashboardLink } from "@/components/dashboard-config";
import { cn } from "@/lib/utils";


const iconByHref: Record<string, LucideIcon> = {
  "/dashboard": Home,
  "/dashboard/listings": Tags,
  "/dashboard/ai-listing-creator": Sparkles,
  "/dashboard/favorites": Heart,
  "/dashboard/saved-searches": Search,
  "/dashboard/messages": MessageSquare,
  "/dashboard/offers": ReceiptText,
  "/dashboard/purchases": ShoppingBag,
  "/dashboard/sales": Store,
  "/dashboard/payments": WalletCards,
  "/dashboard/trust-score": ShieldCheck,
  "/dashboard/verification": UserCheck,
  "/dashboard/settings": Settings,
  "/admin": ShieldCheck,
  "/admin/users": Users,
  "/admin/listings": ListChecks,
  "/admin/reports": FileSearch,
  "/admin/disputes": Gavel,
  "/admin/transactions": ReceiptText,
  "/admin/fraud-alerts": AlertTriangle,
  "/admin/ai-tasks": Bot,
  "/admin/search-analytics": Search,
  "/admin/revenue": LineChart,
  "/admin/audit-logs": Activity,
  "/admin/settings": Settings
};

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardSidebar({
  links,
  user,
  eyebrow = "User dashboard",
  title = "Your marketplace command center",
  description = "Manage buying, selling, trust, verification, and account preferences from one protected workspace."
}: {
  links: DashboardLink[];
  user?: { name: string; email: string; location: string };
  eyebrow?: string;
  title?: string;
  description?: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden rounded-3xl border border-border/80 bg-card/95 p-4 shadow-md backdrop-blur lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
      <div className="mb-4 rounded-2xl bg-premium-dark p-4 text-white shadow-admin">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">{eyebrow}</p>
        <h2 className="mt-2 text-xl font-black tracking-tight">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
        {user ? (
          <div className="mt-4 rounded-2xl bg-white/10 p-3 text-sm">
            <p className="truncate font-bold">{user.name}</p>
            <p className="truncate text-xs text-slate-300">{user.email}</p>
            <p className="mt-1 truncate text-xs text-slate-400">{user.location}</p>
          </div>
        ) : null}
      </div>
      <nav className="grid gap-1" aria-label="Dashboard navigation">
        {links.map((link) => {
          const Icon = iconByHref[link.href] ?? Home;
          const active = isActivePath(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex items-start gap-3 rounded-2xl px-3 py-2.5 text-sm transition-all hover:-translate-y-0.5 hover:bg-secondary hover:text-foreground",
                active ? "bg-gradient-to-r from-trust to-ai text-white shadow-trust hover:text-white" : "text-muted-foreground"
              )}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <span className="block font-semibold">{link.label}</span>
                {link.description ? <span className={cn("block text-xs leading-5", active ? "text-primary-foreground/75" : "text-muted-foreground")}>{link.description}</span> : null}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function DashboardMobileNavigation({ links, showQuickLinks = true }: { links: DashboardLink[]; showQuickLinks?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const activeHref = links.find((link) => isActivePath(pathname, link.href))?.href ?? links[0]?.href ?? "/dashboard";

  return (
    <div className="rounded-3xl border border-border/80 bg-card/95 p-3 shadow-md backdrop-blur lg:hidden">
      <label className="text-xs font-black uppercase tracking-[0.2em] text-primary" htmlFor="dashboard-mobile-nav">
        Dashboard section
      </label>
      <select
        id="dashboard-mobile-nav"
        className="mt-2 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm font-bold shadow-xs outline-none focus:ring-2 focus:ring-ring"
        value={activeHref}
        onChange={(event) => router.push(event.target.value)}
      >
        {links.map((link) => (
          <option key={link.href} value={link.href}>
            {link.label}
          </option>
        ))}
      </select>
      {showQuickLinks ? <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Quick dashboard links">
        {links.map((link) => {
          const Icon = iconByHref[link.href] ?? ChevronRight;
          const active = isActivePath(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors",
                active ? "bg-gradient-to-r from-trust to-ai text-white shadow-trust" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{link.label}</span>
            </Link>
          );
        })}
      </div> : null}
    </div>
  );
}

const mobileBottomHrefs = ["/dashboard", "/dashboard/listings", "/dashboard/messages", "/dashboard/offers", "/dashboard/settings"];

export function DashboardMobileBottomNav({ links }: { links: DashboardLink[] }) {
  const pathname = usePathname();
  const primaryLinks = mobileBottomHrefs
    .map((href) => links.find((link) => link.href === href))
    .filter((link): link is DashboardLink => Boolean(link));

  return (
    <nav className="fixed inset-x-2 bottom-2 z-40 rounded-3xl border border-border/80 bg-card/95 p-2 shadow-soft backdrop-blur sm:inset-x-3 sm:bottom-3 lg:hidden" aria-label="Dashboard bottom navigation">
      <div className="grid grid-cols-5 gap-1">
        {primaryLinks.map((link) => {
          const Icon = iconByHref[link.href] ?? ChevronRight;
          const active = isActivePath(pathname, link.href);
          return (
            <Link
              href={link.href}
              key={link.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-bold transition",
                active ? "bg-gradient-to-r from-trust to-ai text-white shadow-trust" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span className="max-w-full truncate">{link.label.replace("My ", "")}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
