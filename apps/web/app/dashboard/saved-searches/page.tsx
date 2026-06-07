import Link from "next/link";
import { Bell, Clock, Search, SlidersHorizontal } from "lucide-react";
import { SavedSearchActions } from "@/components/saved-searches/saved-search-actions";
import { DashboardActionCard, DashboardEmptyState, DashboardShell, DashboardStatCard } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getSavedSearchesDashboard } from "@/lib/saves/user-saves";

function searchHref(query: string | null, filters: Record<string, unknown>) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  Object.entries(filters).forEach(([key, value]) => {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") params.set(key, String(value));
  });
  return `/search${params.toString() ? `?${params.toString()}` : ""}`;
}

export default async function SavedSearchesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { searches, stats, source } = user
    ? await getSavedSearchesDashboard(user.id)
    : { searches: [], stats: { savedSearchCount: 0, newMatchCount: 0, digestCount: 0 }, source: "database" as const };

  return (
    <DashboardShell title="Saved searches" description="Automate discovery with saved filters, alert cadence, market movement, and recommendation controls.">
      <div className="grid gap-5 sm:grid-cols-3">
        <DashboardStatCard icon={Search} label="Saved searches" value={String(stats.savedSearchCount)} detail={`${stats.newMatchCount} unread matching-listing alerts.`} />
        <DashboardStatCard icon={Bell} label="Active alerts" value={String(searches.filter((search) => search.alert_enabled).length)} detail="Instant alerts notify you when newly published listings match." />
        <DashboardStatCard icon={Clock} label="Digest searches" value={String(stats.digestCount)} detail="Bundled into daily and weekly updates." />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center justify-between gap-3">
            <span>Search automations</span>
            <Badge>{source === "database" ? "Live saved searches" : "Demo saved searches"}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {searches.map((search) => (
            <div key={search.id} className="rounded-2xl border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{search.name}</p>
                    <Badge>{search.alert_enabled ? search.alert_frequency : "Paused"}</Badge>
                    {search.unread_notification_count > 0 ? <Badge>{search.unread_notification_count} new</Badge> : null}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{search.query || "Filter-only search"} · {search.match_count} delivered matches · updated {new Date(search.updated_at).toLocaleDateString()}</p>
                </div>
                <SavedSearchActions id={search.id} alertEnabled={search.alert_enabled} alertFrequency={search.alert_frequency} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                {Object.entries(search.filters).map(([key, value]) => <span key={key} className="rounded-full bg-secondary px-3 py-1">{key}: {String(value)}</span>)}
              </div>
              <Button asChild variant="ghost" size="sm" className="mt-3"><Link href={searchHref(search.query, search.filters)}>Run search</Link></Button>
            </div>
          ))}
          {searches.length === 0 ? (
            <DashboardEmptyState title="No saved searches yet" description="Save any marketplace query to receive in-app notifications when new active listings match your filters." action={<Button asChild><Link href="/search">Create a saved search</Link></Button>} />
          ) : null}
        </CardContent>
      </Card>
      <DashboardActionCard icon={SlidersHorizontal} title="Tune recommendation signals" description="Saved searches can boost ranking for preferred brands, trusted sellers, location radius, price-drop sensitivity, and alert cadence.">
        <Button asChild><Link href="/search">Create another search</Link></Button>
      </DashboardActionCard>
    </DashboardShell>
  );
}
