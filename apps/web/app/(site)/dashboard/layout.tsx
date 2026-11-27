import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { DashboardDensity } from "@/components/dashboard-density";
import { AdminDeniedNotice } from "@/components/admin-denied-notice";
import { getMarketplaceSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getMarketplaceSession();

  if (!session) {
    redirect("/login?next=/dashboard");
  }

  return (
    <DashboardDensity>
      <section className="app-container grid gap-5 py-4" aria-label="Authenticated user dashboard">
        <a className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-background focus:px-4 focus:py-2 focus:shadow" href="#dashboard-content">
          Skip to dashboard content
        </a>
        <AdminDeniedNotice />
        <div id="dashboard-content" className="min-w-0 space-y-6">
          {children}
        </div>
      </section>
    </DashboardDensity>
  );
}
