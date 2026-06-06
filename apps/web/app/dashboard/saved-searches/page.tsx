import Link from "next/link";
import { Bell, Clock, Search, SlidersHorizontal } from "lucide-react";
import { DashboardActionCard, DashboardShell, DashboardStatCard } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const searches = [
  { query: "road bike carbon under 1500", cadence: "Instant", matches: 4 },
  { query: "M1 MacBook Pro 14 local pickup", cadence: "Daily digest", matches: 9 },
  { query: "Eames lounge verified sellers", cadence: "Weekly", matches: 2 }
];

export default function SavedSearchesPage() {
  return (
    <DashboardShell title="Saved searches" description="Automate discovery with saved filters, alert cadence, market movement, and recommendation controls.">
      <div className="grid gap-5 sm:grid-cols-3">
        <DashboardStatCard icon={Search} label="Saved searches" value="9" detail="3 have new matches since your last visit." />
        <DashboardStatCard icon={Bell} label="Instant alerts" value="5" detail="High-intent filters notify you immediately." />
        <DashboardStatCard icon={Clock} label="Digest searches" value="4" detail="Bundled into daily and weekly updates." />
      </div>
      <Card>
        <CardHeader><CardTitle>Search automations</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          {searches.map((search) => (
            <div key={search.query} className="rounded-2xl border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-semibold">{search.query}</p>
                <Badge>{search.cadence}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{search.matches} fresh matches · filters include category, radius, verification, price, and shipping preference.</p>
            </div>
          ))}
        </CardContent>
      </Card>
      <DashboardActionCard icon={SlidersHorizontal} title="Tune recommendation signals" description="Saved searches can boost ranking for preferred brands, trusted sellers, location radius, and price-drop sensitivity.">
        <Button asChild><Link href="/search">Create another search</Link></Button>
      </DashboardActionCard>
    </DashboardShell>
  );
}
