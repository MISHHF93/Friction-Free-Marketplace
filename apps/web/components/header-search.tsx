"use client";

import { usePathname } from "next/navigation";
import { Search } from "lucide-react";

function HeaderSearch({ id = "global-marketplace-search", placeholder = "Search listings" }: { id?: string; placeholder?: string }) {
  return (
    <form action="/search" className="relative w-full" role="search">
      <label htmlFor={id} className="sr-only">Search listings</label>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        id={id}
        name="q"
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-input bg-card pl-10 pr-4 text-sm font-medium shadow-sm outline-none transition placeholder:text-muted-foreground hover:border-primary focus:border-primary focus:ring-2 focus:ring-ring/30"
      />
    </form>
  );
}

export function ConditionalHeaderSearch() {
  const pathname = usePathname();
  // /search renders its own search form with filters; a second box there is redundant.
  if (pathname !== "/") return null;
  return <HeaderSearch />;
}
