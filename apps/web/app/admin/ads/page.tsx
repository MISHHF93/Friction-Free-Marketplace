import Link from "next/link";
import { requireAdminPagePermission } from "@/lib/admin/permissions";
import { AD_PLACEMENTS, isAdPlacementKey } from "@/lib/ads/placements";
import { setAdCampaignActive } from "@/app/admin/ads/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "unknown";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export const dynamic = "force-dynamic";

function ctr(impressions: number, clicks: number) {
  if (!impressions) return "—";
  return `${((clicks / impressions) * 100).toFixed(2)}%`;
}

export default async function AdminAdsPage() {
  const auth = await requireAdminPagePermission("ads.manage", { loginNext: "/admin/ads", deniedPath: "/admin" });
  const supabase = auth.supabase as any;
  const { data: campaigns } = await supabase
    .from("ad_campaigns")
    .select("id,placement,title,advertiser_name,starts_at,ends_at,is_active,priority,weight,category_slug")
    .order("updated_at", { ascending: false });
  const ids = ((campaigns ?? []) as Array<{ id: string }>).map((row) => row.id);
  const { data: events } = ids.length
    ? await supabase.from("ad_events").select("campaign_id,impressions,clicks").in("campaign_id", ids)
    : { data: [] };
  const totals = new Map<string, { impressions: number; clicks: number }>();
  for (const row of (events ?? []) as Array<{ campaign_id: string; impressions: number; clicks: number }>) {
    const current = totals.get(row.campaign_id) ?? { impressions: 0, clicks: 0 };
    current.impressions += Number(row.impressions ?? 0);
    current.clicks += Number(row.clicks ?? 0);
    totals.set(row.campaign_id, current);
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Sponsored placements</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Admin-managed banners only. There is no seller billing or third-party ad network.
          </p>
        </div>
        <Button asChild><Link href="/admin/ads/new">New campaign</Link></Button>
      </div>
      <Card>
        <CardHeader><CardTitle>Campaigns</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          {(campaigns ?? []).length ? (campaigns as Array<Record<string, unknown>>).map((campaign) => {
            const stats = totals.get(String(campaign.id)) ?? { impressions: 0, clicks: 0 };
            const placement = isAdPlacementKey(String(campaign.placement)) ? AD_PLACEMENTS[campaign.placement as keyof typeof AD_PLACEMENTS].name : String(campaign.placement);
            return (
              <div key={String(campaign.id)} className="grid gap-3 rounded-2xl border border-border p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="font-bold tracking-tight">{String(campaign.title)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {placement} · {String(campaign.advertiser_name)} · {campaign.is_active ? "Active" : "Paused"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatWhen(String(campaign.starts_at))} – {campaign.ends_at ? formatWhen(String(campaign.ends_at)) : "no end"}
                    {campaign.category_slug ? ` · ${String(campaign.category_slug)}` : ""}
                  </p>
                  <p className="mt-1 text-sm">
                    {stats.impressions.toLocaleString("en-US")} impressions · {stats.clicks.toLocaleString("en-US")} clicks · CTR {ctr(stats.impressions, stats.clicks)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline"><Link href={`/admin/ads/${campaign.id}`}>Edit</Link></Button>
                  <form action={setAdCampaignActive}>
                    <input type="hidden" name="id" value={String(campaign.id)} />
                    <input type="hidden" name="is_active" value={campaign.is_active ? "false" : "true"} />
                    <Button type="submit" size="sm" variant="outline">{campaign.is_active ? "Pause" : "Resume"}</Button>
                  </form>
                </div>
              </div>
            );
          }) : (
            <p className="text-sm text-muted-foreground">No campaigns yet. Create one to fill a public placement. Empty slots stay hidden.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
