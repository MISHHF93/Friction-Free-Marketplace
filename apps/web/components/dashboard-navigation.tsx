"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Activity, AlertTriangle, Bot, ChevronRight, FileSearch, Gavel, Heart, Home, LineChart, ListChecks, MessageSquare, ReceiptText, Search, Settings, ShieldCheck, ShoppingBag, Sparkles, Store, Tags, UserCheck, Users, WalletCards, type LucideIcon } from "lucide-react";
import type { DashboardLink } from "@/components/dashboard-config";
import { cn } from "@/lib/utils";


const iconByHref: Record<string, LucideIcon> = {
  "/dashboard": Home,
  "/dashboard/buyer": ShoppingBag,
  "/dashboard/seller": Store,
  "/dashboard/listings": Tags,
  "/dashboard/ai-listing-creator": Sparkles,
  "/dashboard/favorites": Heart,
  "/dashboard/saved-searches": Search,
  "/dashboard/messages": MessageSquare,
  "/dashboard/offers": ReceiptText,
  "/dashboard/purchases": ShoppingBag,
  "/dashboard/sales": Store,
  "/dashboard/payments": WalletCards,
  "/dashboard/trust-safety": ShieldCheck,
  "/dashboard/trust-score": ShieldCheck,
  "/dashboard/verification": UserCheck,
  "/dashboard/settings": Settings,
  "/admin": ShieldCheck,
  "/admin/users": Users,
  "/admin/listings": ListChecks,
  "/admin/reports": FileSearch,
  "/admin/review-queue": ShieldCheck,
  "/admin/disputes": Gavel,
  "/admin/transactions": ReceiptText,
  "/admin/fraud-alerts": AlertTriangle,
  "/admin/ai-tasks": Bot,
  "/admin/search-analytics": Search,
  "/admin/revenue": LineChart,
  "/admin/gmv": LineChart,
  "/admin/fees": WalletCards,
  "/admin/payouts": WalletCards,
  "/admin/refunds": ReceiptText,
  "/admin/reconciliation": Activity,
  "/admin/audit-logs": Activity,
  "/admin/settings": Settings
};

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardMobileNavigation({ links, showQuickLinks = true }: { links: DashboardLink[]; showQuickLinks?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const activeHref = links.find((link) => isActivePath(pathname, link.href))?.href ?? links[0]?.href ?? "/dashboard";

  return (
      <div className="rounded-panel border border-border bg-card p-3 shadow-md lg:hidden">
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
                active ? "bg-trust text-trust-foreground shadow-trust" : "bg-secondary text-secondary-foreground hover:bg-secondary"
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
