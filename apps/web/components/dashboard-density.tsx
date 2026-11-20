"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const compactPaths = ["/dashboard/messages", "/dashboard/listings/create"];

export function DashboardDensity({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const compact = compactPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  return <div className={compact ? "dashboard-compact" : undefined}>{children}</div>;
}
