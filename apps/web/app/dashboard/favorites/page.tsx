import Link from "next/link";
import { BellRing, Heart, Share2, Tags } from "lucide-react";
import { FavoriteToggleForm } from "@/components/favorites/favorite-toggle-form";
import { DashboardActionCard, DashboardEmptyState, DashboardShell, DashboardStatCard } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getFavoritesDashboard } from "@/lib/saves/user-saves";

export default async function FavoritesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { favorites, stats, source } = user
    ? await getFavoritesDashboard(user.id)
    : { favorites: [], stats: { favoritesCount: 0, alertCount: 0, offerReadyCount: 0 }, source: "database" as const };

  return (
    <DashboardShell title="Favorites" description="Track saved listings, price movement, seller signals, and shortlist decisions across categories.">
      <div className="grid gap-5 sm:grid-cols-3">
        <DashboardStatCard icon={Heart} label="Saved listings" value={String(stats.favoritesCount)} detail={`${stats.alertCount} have activity or demand signals.`} />
        <DashboardStatCard icon={BellRing} label="Watched listings" value={String(stats.alertCount)} detail="Saved inventory can be monitored for price, availability, and seller changes." />
        <DashboardStatCard icon={Tags} label="Offer-ready" value={String(stats.offerReadyCount)} detail="Trusted sellers currently meet the offer-ready threshold." />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center justify-between gap-3">
            <span>Favorite listings</span>
            <Badge>{source === "database" ? "Live favorites" : "Demo favorites"}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {favorites.map((item) => (
            <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{item.title}</p>
                  <Badge>{item.category_name}</Badge>
                  {item.seller_trust_score >= 85 ? <Badge>Trusted seller</Badge> : null}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">${item.price_amount.toLocaleString()} · {item.condition} · saved {new Date(item.favorited_at).toLocaleDateString()}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm"><Link href={`/listings/${item.id}`}>Open listing</Link></Button>
                <FavoriteToggleForm listingId={item.id} isFavorited={true} variant="ghost" size="sm" labelWhenOn="Remove" />
              </div>
            </div>
          ))}
          {favorites.length === 0 ? (
            <DashboardEmptyState title="No favorites yet" description="Tap Favorite on any listing to build a shortlist and keep track of protected offers, seller trust, and availability." action={<Button asChild><Link href="/search">Find listings</Link></Button>} />
          ) : null}
        </CardContent>
      </Card>
      <DashboardActionCard icon={Share2} title="Build a shareable shortlist" description="Group favorites into private collections for roommates, family members, or purchasing teams before making offers.">
        <Button asChild><Link href="/search">Find more listings</Link></Button>
      </DashboardActionCard>
    </DashboardShell>
  );
}
