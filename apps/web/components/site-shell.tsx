import Link from "next/link";
import type { ReactNode } from "react";
import { ShieldCheck, Store } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/browse", label: "Browse" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/seller", label: "Sell" },
  { href: "/admin", label: "Admin" }
];

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.16),_transparent_34rem),linear-gradient(180deg,_#f8fafc,_#eef2f7)]">
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-soft">
              <Store className="h-5 w-5" />
            </span>
            <span className="hidden sm:inline">Friction-Free</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            {navLinks.map((link) => (
              <Link key={link.href} className="hover:text-foreground" href={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden sm:inline-flex")}>
              Log in
            </Link>
            <Link href="/signup" className={buttonVariants({ size: "sm" })}>
              Get started
            </Link>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-border bg-card/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 text-sm text-muted-foreground sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" /> Escrow-ready marketplace infrastructure
          </div>
          <div className="flex flex-wrap gap-4">
            <Link href="/browse">Browse listings</Link>
            <Link href="/dashboard">Buyer dashboard</Link>
            <Link href="/seller">Seller dashboard</Link>
            <Link href="/admin">Admin console</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
