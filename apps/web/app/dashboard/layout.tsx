import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Search, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { dashboardLinks, getSerializableDashboardLinks } from "@/components/dashboard-config";
import { DashboardMobileBottomNav, DashboardMobileNavigation, DashboardSidebar } from "@/components/dashboard-navigation";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { Button } from "@/components/ui/button";
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
    <section className="app-container-wide grid gap-5 pb-28 pt-6 sm:gap-6 sm:pt-8 lg:grid-cols-[minmax(16rem,18rem)_minmax(0,1fr)] lg:pb-10" aria-label="Authenticated user dashboard">
      <a className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-background focus:px-4 focus:py-2 focus:shadow" href="#dashboard-content">
        Skip to dashboard content
      </a>
      <DashboardSidebar links={navigationLinks} user={{ name: displayName, email: user.email ?? "No email on file", location: profile?.location_label ?? profile?.username ?? "Marketplace workspace" }} />
      <div className="min-w-0 space-y-6">
        <DashboardMobileNavigation links={navigationLinks} showQuickLinks={false} />
        <div className="overflow-hidden rounded-[1.75rem] border border-slate-900/10 bg-premium-dark p-4 text-white shadow-admin sm:rounded-[2rem] sm:p-6">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
            <div>
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-emerald-300">
                <ShieldCheck className="h-4 w-4" /> Protected dashboard
              </p>
              <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-4xl">Marketplace dashboard</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Welcome back, {displayName}. Manage listings, messages, offers, payments, verification, alerts, and assistant tools from one secure workspace.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center xl:flex xl:justify-end">
              <div className="grid gap-2 sm:flex sm:flex-wrap xl:justify-end">
                <Button asChild variant="trust" size="sm"><Link href="/dashboard/listings/create"><Plus className="h-4 w-4" /> New listing</Link></Button>
                <Button asChild variant="surface" size="sm"><Link href="/search"><Search className="h-4 w-4" /> Search market</Link></Button>
                <Button asChild variant="surface" size="sm"><Link href="/dashboard/ai-listing-creator"><Sparkles className="h-4 w-4" /> Assistant</Link></Button>
              </div>
              <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-white/10 p-3">
                <NotificationBell />
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 text-emerald-300">
                  <UserRound className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{displayName}</p>
                  <p className="truncate text-xs text-slate-300">{user.email ?? "Authenticated account"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div id="dashboard-content" className="space-y-6">
          {children}
        </div>
      </div>
      <DashboardMobileBottomNav links={navigationLinks} />
    </section>
  );
}
