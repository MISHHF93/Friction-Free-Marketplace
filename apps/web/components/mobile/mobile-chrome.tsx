"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Home, MessageSquare, Plus, Search, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/search", label: "Search", icon: Search },
  { href: "/dashboard/listings/create", label: "Sell", icon: Plus, emphasize: true },
  { href: "/dashboard/messages", label: "Messages", icon: MessageSquare },
  { href: "/account/settings", label: "Account", icon: UserRound }
] as const;

const rootPaths = new Set(["/", "/browse", "/search", "/login", "/signup"]);

export function MobileBackBar() {
  const pathname = usePathname();
  if (rootPaths.has(pathname)) return null;
  return (
    <Link href="/" className="inline-flex h-11 min-w-11 items-center gap-1 rounded-xl px-2 text-sm font-bold md:hidden" aria-label="Back to home">
      <ArrowLeft className="h-5 w-5" aria-hidden="true" />
      Back
    </Link>
  );
}

export function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="App sections"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5">
        {tabs.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const Icon = tab.icon;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] font-bold",
                  active ? "text-primary" : "text-foreground"
                )}
              >
                <span className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", "emphasize" in tab && tab.emphasize ? "bg-primary text-primary-foreground" : "")}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
