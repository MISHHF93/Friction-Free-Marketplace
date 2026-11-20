"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Home, MessageSquare, Plus, Search, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

export function PhoneFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const wide = pathname.startsWith("/admin");
  return (
    <div className="app-backdrop min-h-screen">
      <div className={cn("app-shell relative mx-auto min-h-screen w-full bg-background shadow-[0_0_48px_rgba(16,21,28,0.08)]", wide ? "max-w-[760px]" : "max-w-[480px]")}>
        {children}
      </div>
    </div>
  );
}

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
    <Link href="/" className="inline-flex h-11 min-w-11 items-center gap-1 rounded-xl px-2 text-sm font-bold" aria-label="Back to home">
      <ArrowLeft className="h-5 w-5" aria-hidden="true" />
      Back
    </Link>
  );
}

export function MobileTabBar() {
  const pathname = usePathname();
  const wide = pathname.startsWith("/admin");
  return (
    <nav
      aria-label="App sections"
      className={cn("app-tabs fixed bottom-0 left-1/2 z-40 w-full -translate-x-1/2 border-t border-border bg-background/95 backdrop-blur", wide ? "max-w-[760px]" : "max-w-[480px]")}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="keep-grid grid grid-cols-5">
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
