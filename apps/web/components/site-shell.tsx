import Link from "next/link";
import type { ReactNode } from "react";
import { ShieldCheck, Sparkles, Store } from "lucide-react";
import { publicPages, dashboardPages, adminPages } from "@/lib/page-data";

const navGroups = [
  { label: "Public", links: publicPages.slice(0, 5) },
  { label: "Dashboard", links: dashboardPages.slice(0, 6) },
  { label: "Admin", links: adminPages.slice(0, 4) }
];

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.16),_transparent_36rem),linear-gradient(180deg,_#f8fafc,_#eef2f7)]">
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-soft">
              <Store className="h-5 w-5" />
            </span>
            <span className="hidden sm:inline">Friction-Free</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground lg:flex">
            <Link className="hover:text-foreground" href="/browse">Browse</Link>
            <Link className="hover:text-foreground" href="/dashboard/buyer">Dashboard</Link>
            <Link className="hover:text-foreground" href="/admin">Admin</Link>
            <Link className="hover:text-foreground" href="/trust-and-safety">Trust & safety</Link>
          </nav>
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" /> Escrow-ready UX
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-border bg-card/70">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.2fr_2fr] lg:px-8">
          <div>
            <div className="mb-3 flex items-center gap-2 text-lg font-bold">
              <Sparkles className="h-5 w-5 text-primary" /> Complete UX map
            </div>
            <p className="max-w-md text-sm leading-6 text-muted-foreground">
              Next.js App Router pages for public discovery, buyer and seller tools, and admin operations, designed mobile-first with Tailwind and shadcn/ui-style primitives.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {navGroups.map((group) => (
              <div key={group.label}>
                <h3 className="mb-3 text-sm font-semibold">{group.label}</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {group.links.map((link) => (
                    <li key={link.key}>
                      <Link className="hover:text-foreground" href={link.route}>{link.title}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
