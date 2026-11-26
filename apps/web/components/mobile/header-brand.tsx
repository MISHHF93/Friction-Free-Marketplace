"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

// Top-level screens (no Back button) show the full logo on mobile; inner screens show only the mark
// on mobile so Back + page title fit on one row, while wider viewports always show the full logo.
const topLevelPaths = new Set(["/", "/browse", "/search", "/login", "/signup"]);

export function HeaderBrand({ full, compact }: { full: ReactNode; compact: ReactNode }) {
  const pathname = usePathname();
  if (topLevelPaths.has(pathname)) return <>{full}</>;
  return (
    <>
      <span className="md:hidden">{compact}</span>
      <span className="hidden md:inline-flex">{full}</span>
    </>
  );
}
