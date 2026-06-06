import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type DashboardLink = {
  href: string;
  label: string;
};

export function DashboardShell({
  title,
  description,
  links,
  children
}: {
  title: string;
  description: string;
  links: DashboardLink[];
  children: ReactNode;
}) {
  return (
    <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[260px_1fr] lg:px-8">
      <aside className="rounded-2xl border border-border bg-card p-4 shadow-sm lg:sticky lg:top-24 lg:h-fit">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Workspace</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        <nav className="grid gap-1">
          {links.map((link, index) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground",
                index === 0 && "bg-secondary text-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
