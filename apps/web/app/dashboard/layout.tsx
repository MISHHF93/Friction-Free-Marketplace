import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { ShieldCheck, UserRound } from "lucide-react";
import { dashboardLinks, getSerializableDashboardLinks } from "@/components/dashboard-config";
import { DashboardMobileNavigation, DashboardSidebar } from "@/components/dashboard-navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type DashboardProfile = {
  display_name: string | null;
  username: string | null;
  location_label: string | null;
};

async function getDashboardProfile(userId: string) {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("display_name,username,location_label")
      .eq("user_id", userId)
      .maybeSingle();

    return data as DashboardProfile | null;
  } catch {
    return null;
  }
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  const profile = await getDashboardProfile(user.id);
  const displayName = profile?.display_name ?? user.email ?? "Marketplace member";
  const navigationLinks = getSerializableDashboardLinks(dashboardLinks);

  return (
    <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[300px_1fr] lg:px-8" aria-label="Authenticated user dashboard">
      <a className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-background focus:px-4 focus:py-2 focus:shadow" href="#dashboard-content">
        Skip to dashboard content
      </a>
      <DashboardSidebar links={navigationLinks} user={{ name: displayName, email: user.email ?? "No email on file", location: profile?.location_label ?? profile?.username ?? "Marketplace workspace" }} />
      <div className="min-w-0 space-y-6">
        <DashboardMobileNavigation links={navigationLinks} />
        <div className="rounded-3xl border border-border bg-slate-950 p-5 text-white shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                <ShieldCheck className="h-4 w-4" /> Protected dashboard
              </p>
              <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">Welcome back, {displayName}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Manage listings, favorites, searches, messages, offers, transactions, trust, verification, and settings from one authenticated workspace.</p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <UserRound className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{displayName}</p>
                <p className="truncate text-xs text-slate-300">{user.email ?? "Authenticated account"}</p>
              </div>
            </div>
          </div>
        </div>
        <div id="dashboard-content" className="space-y-6">
          {children}
        </div>
      </div>
    </section>
  );
}
