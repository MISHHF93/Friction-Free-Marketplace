"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Heart, Home, MessageSquare, ReceiptText, Search, Settings, ShieldCheck, ShoppingBag, Store, Tags, UserCheck, type LucideIcon } from "lucide-react";
import type { DashboardLink } from "@/components/dashboard-shell";
import { cn } from "@/lib/utils";


const iconByHref: Record<string, LucideIcon> = {
  "/dashboard": Home,
  "/dashboard/listings": Tags,
  "/dashboard/favorites": Heart,
  "/dashboard/saved-searches": Search,
  "/dashboard/messages": MessageSquare,
  "/dashboard/offers": ReceiptText,
  "/dashboard/purchases": ShoppingBag,
  "/dashboard/sales": Store,
  "/dashboard/trust-score": ShieldCheck,
  "/dashboard/verification": UserCheck,
  "/dashboard/settings": Settings
};

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardSidebar({ links }: { links: DashboardLink[] }) {
  const pathname = usePathname();

  return (
    <aside className="hidden rounded-3xl border border-border bg-card/95 p-4 shadow-sm lg:sticky lg:top-24 lg:block lg:h-fit">
      <div className="mb-4 rounded-2xl bg-slate-950 p-4 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">User dashboard</p>
        <h2 className="mt-2 text-xl font-black tracking-tight">Your marketplace command center</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">Manage buying, selling, trust, verification, and account preferences from one protected workspace.</p>
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
                "group flex items-start gap-3 rounded-2xl px-3 py-2.5 text-sm transition-colors hover:bg-secondary hover:text-foreground",
                active ? "bg-primary text-primary-foreground shadow-soft hover:bg-primary hover:text-primary-foreground" : "text-muted-foreground"
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

export function DashboardMobileNavigation({ links }: { links: DashboardLink[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const activeHref = links.find((link) => isActivePath(pathname, link.href))?.href ?? "/dashboard";

  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-sm lg:hidden">
      <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground" htmlFor="dashboard-mobile-nav">
        Dashboard section
      </label>
      <select
        id="dashboard-mobile-nav"
        className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm font-semibold"
        value={activeHref}
        onChange={(event) => router.push(event.target.value)}
      >
        {links.map((link) => (
          <option key={link.href} value={link.href}>
            {link.label}
          </option>
        ))}
      </select>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Quick dashboard links">
        {links.slice(0, 6).map((link) => {
          const active = isActivePath(pathname, link.href);
          return (
            <Link key={link.href} href={link.href} className={cn("shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold", active ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground")}>
              {link.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
