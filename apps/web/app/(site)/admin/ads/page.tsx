import Link from "next/link";
import { requireAdminPagePermission } from "@/lib/admin/permissions";
import { AD_PLACEMENTS, isAdPlacementKey } from "@/lib/ads/placements";
import { approveSelfServeAdAction, rejectSelfServeAdAction, setAdCampaignActive } from "@/app/admin/ads/actions";
import { adCreativeSrc } from "@/lib/ads/creative-url";
import { formatCents } from "@/lib/ads/self-serve";
import { RemoteImage } from "@/components/ui/remote-image";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_payment: "Awaiting payment",
  paid_pending_review: "Paid, needs review",
  approved: "Approved",
  active: "Live",
  rejected: "Rejected (refunded)",
  expired: "Ended"
};

export default async function AdminAdsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = (await searchParams) ?? {};
  const notice = typeof params.notice === "string" ? params.notice : null;
  const errorMessage = typeof params.error === "string" ? params.error : null;
  const auth = await requireAdminPagePermission("ads.manage", { loginNext: "/admin/ads", deniedPath: "/admin" });
  const supabase = auth.supabase as any;
  const { data: campaigns } = await supabase
    .from("ad_campaigns")
    .select("id,placement,title,advertiser_name,starts_at,ends_at,is_active,priority,weight,category_slug,source,status,image_path,alt_text,target_url,run_days,price_cents,currency,paid_at,advertiser_id")
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

  const review = ((campaigns ?? []) as Array<Record<string, unknown>>).filter((campaign) => campaign.status === "paid_pending_review");

  return (
    <div className="grid gap-5">
      {notice ? <p role="status" className="rounded-2xl border border-emerald-300 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">{notice}</p> : null}
      {errorMessage ? <p role="alert" className="rounded-2xl border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-900">{errorMessage}</p> : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Sponsored placements</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            House campaigns you create here, plus paid self-serve ads from advertisers. Paid ads only serve after you approve them.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link href="/admin/ads/pricing">Pricing</Link></Button>
          <Button asChild><Link href="/admin/ads/new">New campaign</Link></Button>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>Awaiting review ({review.length})</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          {review.length ? review.map((campaign) => {
            const id = String(campaign.id);
            const src = adCreativeSrc(String(campaign.image_path ?? ""));
            const placementKey = String(campaign.placement);
            const meta = isAdPlacementKey(placementKey) ? AD_PLACEMENTS[placementKey] : null;
            return (
              <article key={id} data-ad-review={id} className="grid gap-3 rounded-2xl border border-border p-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
                <div className="overflow-hidden rounded-xl border border-border bg-muted" style={{ aspectRatio: meta?.aspectRatio ?? "16 / 9" }}>
                  {src ? <RemoteImage src={src} alt={String(campaign.alt_text ?? campaign.title)} className="h-full w-full object-cover" /> : null}
                </div>
                <div className="grid min-w-0 gap-2">
                  <p className="font-bold tracking-tight">{String(campaign.title)}</p>
                  <p className="text-sm text-muted-foreground">{meta?.name ?? placementKey} · {String(campaign.advertiser_name)} · {Number(campaign.run_days)} days from {formatWhen(String(campaign.starts_at))}</p>
                  <p className="break-all text-sm">Link: {String(campaign.target_url)}</p>
                  <p className="text-sm">Paid {formatCents(Number(campaign.price_cents ?? 0), String(campaign.currency ?? "usd"))}{campaign.paid_at ? ` on ${formatWhen(String(campaign.paid_at))}` : ""}</p>
                  <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start">
                    <form action={approveSelfServeAdAction}>
                      <input type="hidden" name="id" value={id} />
                      <Button type="submit" size="sm">Approve</Button>
                    </form>
                    <form action={rejectSelfServeAdAction} className="grid gap-2">
                      <input type="hidden" name="id" value={id} />
                      <Label htmlFor={`reason-${id}`}>Reason for rejecting (sent to the advertiser)</Label>
                      <Textarea id={`reason-${id}`} name="reason" required maxLength={500} rows={2} />
                      <div><Button type="submit" size="sm" variant="outline">Reject and refund</Button></div>
                    </form>
                  </div>
                </div>
              </article>
            );
          }) : (
            <p className="text-sm text-muted-foreground">No paid ads are waiting for review.</p>
          )}
        </CardContent>
      </Card>
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
                    {placement} · {String(campaign.advertiser_name)} · {campaign.source === "self_serve" ? `Self-serve, ${STATUS_LABELS[String(campaign.status)] ?? String(campaign.status)}` : "House"} · {campaign.is_active ? "Active" : "Paused"}
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
