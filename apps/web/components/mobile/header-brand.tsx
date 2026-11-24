"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

// Top-level screens (no Back button) show the full logo; inner screens show only the mark,
// so Back + page title fit on one row. Keep in sync with rootPaths in mobile-chrome.tsx.
const topLevelPaths = new Set(["/", "/browse", "/search", "/login", "/signup"]);

export function HeaderBrand({ full, compact }: { full: ReactNode; compact: ReactNode }) {
  const pathname = usePathname();
  return <>{topLevelPaths.has(pathname) ? full : compact}</>;
}
