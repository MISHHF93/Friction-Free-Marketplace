import Link from "next/link";
import { BellRing, Heart, Share2, Tags } from "lucide-react";
import { DashboardActionCard, DashboardEmptyState, DashboardShell, DashboardStatCard } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const favorites = [
  { title: "Fuji X100VI camera kit", price: "$1,625", status: "Price watched", note: "Seller accepts protected offers" },
  { title: "Herman Miller Aeron chair", price: "$640", status: "New message", note: "Local pickup available Saturday" },
  { title: "Specialized Roubaix Comp", price: "$1,450", status: "Fresh listing", note: "Matches your saved road-bike search" }
];

export default function FavoritesPage() {
  return (
    <DashboardShell title="Favorites" description="Track saved listings, price movement, seller signals, and shortlist decisions across categories.">
      <div className="grid gap-5 sm:grid-cols-3">
        <DashboardStatCard icon={Heart} label="Saved listings" value="18" detail="6 have price or availability changes." />
        <DashboardStatCard icon={BellRing} label="Alerts enabled" value="11" detail="Instant alerts are on for high-intent saves." />
        <DashboardStatCard icon={Tags} label="Offer-ready" value="4" detail="Sellers currently accept protected offers." />
      </div>
      <Card>
        <CardHeader><CardTitle>Favorite listings</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          {favorites.map((item) => (
            <div key={item.title} className="flex flex-col gap-3 rounded-2xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{item.title}</p><Badge>{item.status}</Badge></div>
                <p className="mt-1 text-sm text-muted-foreground">{item.price} · {item.note}</p>
              </div>
              <Button variant="outline" size="sm">Open listing</Button>
            </div>
          ))}
        </CardContent>
      </Card>
      <DashboardActionCard icon={Share2} title="Build a shareable shortlist" description="Group favorites into private collections for roommates, family members, or purchasing teams before making offers.">
        <Button asChild><Link href="/search">Find more listings</Link></Button>
      </DashboardActionCard>
      <DashboardEmptyState title="No archived favorites" description="Removed favorites and unavailable listings will appear here so you can restore or compare them later." />
    </DashboardShell>
  );
}
