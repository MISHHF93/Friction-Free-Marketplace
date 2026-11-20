"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Home, MessageSquare, Plus, Search, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="app-backdrop min-h-screen">
      <div className="app-shell relative mx-auto min-h-screen w-full max-w-[480px] bg-background pt-[env(safe-area-inset-top)] shadow-[0_0_24px_rgba(16,21,28,0.06)]">
        {children}
      </div>
    </div>
  );
}

const tabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/search", label: "Search", icon: Search },
  { href: "/dashboard/listings/create", label: "Sell", icon: Plus, emphasize: true },
  { href: "/dashboard/messages", label: "Messages", icon: MessageSquare, badge: "messages" },
  { href: "/account", label: "Me", icon: UserRound }
] as const;

const rootPaths = new Set(["/", "/browse", "/search", "/login", "/signup"]);

function parentPath(pathname: string, search = "") {
  if (pathname.startsWith("/listings/")) return "/browse";
  if (pathname.startsWith("/dashboard/messages")) {
    return new URLSearchParams(search).has("conversation") ? "/dashboard/messages" : "/dashboard";
  }
  if (pathname.startsWith("/dashboard/listings/")) return "/dashboard/listings";
  if (pathname.startsWith("/dashboard/purchases") || pathname.startsWith("/dashboard/sales")) return "/dashboard";
  if (pathname.startsWith("/dashboard/")) return "/dashboard";
  if (pathname.startsWith("/account")) return "/";
  if (pathname.startsWith("/admin/")) return "/admin";
  const parts = pathname.split("/").filter(Boolean);
  return parts.length > 1 ? `/${parts.slice(0, -1).join("/")}` : "/";
}

export function MobileBackBar() {
  const pathname = usePathname();
  const router = useRouter();
  if (rootPaths.has(pathname)) return null;
  return (
    <button
      type="button"
      className="inline-flex h-11 min-w-11 items-center gap-1 rounded-xl px-2 text-sm font-bold active:scale-[0.98]"
      aria-label="Back"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(parentPath(pathname, window.location.search));
      }}
    >
      <ArrowLeft className="h-5 w-5" aria-hidden="true" />
      Back
    </button>
  );
}

function visiblePageTitle() {
  const explicit = document.querySelector("[data-page-title]");
  const explicitTitle = explicit?.getAttribute("data-page-title")?.trim() || explicit?.textContent?.trim();
  if (explicitTitle) return explicitTitle;
  const heading = document.querySelector("main h1");
  if (heading?.textContent?.trim()) return heading.textContent.trim();
  return document.title.replace(/\s*[·|—-]\s*.*$/, "").trim();
}

export function PageTitleMirror() {
  const pathname = usePathname();
  const titleRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const apply = () => {
      if (titleRef.current) titleRef.current.textContent = visiblePageTitle();
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });
    return () => observer.disconnect();
  }, [pathname]);
  return <p ref={titleRef} className="truncate text-sm font-black" aria-hidden="true" />;
}

export function MobileTabBar() {
  const pathname = usePathname();
  const [counts, setCounts] = useState({ messages: 0, offers: 0 });
  useEffect(() => {
    const viewport = window.visualViewport;
    const onResize = () => {
      const open = Boolean(viewport && window.innerHeight - viewport.height > 140);
      document.documentElement.classList.toggle("keyboard-open", open);
    };
    onResize();
    viewport?.addEventListener("resize", onResize);
    return () => viewport?.removeEventListener("resize", onResize);
  }, []);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/nav-counts")
      .then((response) => response.ok ? response.json() : { messages: 0, offers: 0 })
      .then((payload) => {
        if (!cancelled) setCounts({ messages: Number(payload.messages ?? 0), offers: Number(payload.offers ?? 0) });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return (
    <nav
      aria-label="App sections"
      className="app-tabs fixed bottom-0 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 border-t border-border bg-background/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="keep-grid grid grid-cols-5">
        {tabs.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const Icon = tab.icon;
          const count = "badge" in tab ? counts[tab.badge] : 0;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-11 flex-col items-center justify-center gap-0.5 px-1 py-1 text-[11px] font-bold active:scale-[0.98]",
                  active ? "text-primary" : "text-foreground"
                )}
              >
                <span className={cn("relative flex h-11 w-11 items-center justify-center rounded-2xl", "emphasize" in tab && tab.emphasize ? "bg-primary text-primary-foreground" : "")}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {count > 0 ? <span className="absolute right-0 top-0 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-black text-white">{count > 9 ? "9+" : count}</span> : null}
                </span>
                {tab.label}
                {count > 0 ? <span className="sr-only">{count} unread</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
