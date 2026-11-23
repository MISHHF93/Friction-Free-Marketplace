import Link from "next/link";
import { redirect } from "next/navigation";
import { Eye, Megaphone, MousePointerClick } from "lucide-react";
import { DashboardShell, DashboardStatCard } from "@/components/dashboard-shell";
import { ResumeAdPayment } from "@/components/ads/resume-ad-payment";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMarketplaceSession } from "@/lib/auth/session";
import { loadAdvertiserCampaigns } from "@/lib/ads/advertiser";
import { AD_PLACEMENTS } from "@/lib/ads/placements";
import { advertiserStatusLabel, ctrLabel, formatCents } from "@/lib/ads/self-serve";

export const dynamic = "force-dynamic";

function day(value: string | null) {
  if (!value) return "no end";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "unknown";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

export default async function MyAdsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await getMarketplaceSession();
  if (!session) redirect("/login?next=/dashboard/ads");
  const params = await searchParams;
  const checkout = typeof params.checkout === "string" ? params.checkout : null;
  const campaigns = await loadAdvertiserCampaigns(session);
  const live = campaigns.filter((ad) => ad.status === "active" || ad.status === "approved");
  const impressions = campaigns.reduce((sum, ad) => sum + ad.impressions, 0);
  const clicks = campaigns.reduce((sum, ad) => sum + ad.clicks, 0);

  const notice = checkout === "success"
    ? <p role="status" className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">Payment received. An admin will review your ad before it goes live. You’ll get a notification and an email.</p>
    : checkout === "cancelled"
      ? <p role="status" className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900">Checkout was cancelled. Nothing was charged. You can finish payment below.</p>
      : null;

  return (
    <DashboardShell
      title="My ads"
      description="Sponsored placements you bought, their review status, and how they perform."
      notice={notice}
      actions={<Button asChild><Link href="/advertise">New ad</Link></Button>}
    >
      <div className="grid gap-5 sm:grid-cols-3">
        <DashboardStatCard icon={Megaphone} label="Live ads" value={String(live.length)} detail="Approved ads that are scheduled or running." />
        <DashboardStatCard icon={Eye} label="Impressions" value={impressions.toLocaleString("en-US")} detail="Times your ads were shown." />
        <DashboardStatCard icon={MousePointerClick} label="Clicks" value={clicks.toLocaleString("en-US")} detail={`Click-through rate ${ctrLabel(impressions, clicks)}.`} />
      </div>
      <Card>
        <CardHeader><CardTitle>Your ads</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          {campaigns.length ? campaigns.map((ad) => (
            <article key={ad.id} data-ad-row={ad.status} className="grid gap-2 rounded-2xl border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-bold tracking-tight">{ad.title}</h3>
                  <p className="text-sm text-muted-foreground">{AD_PLACEMENTS[ad.placement].name} · {day(ad.starts_at)} – {day(ad.ends_at)} · {ad.run_days} {ad.run_days === 1 ? "day" : "days"}</p>
                </div>
                <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold">{advertiserStatusLabel(ad.status, ad.starts_at, ad.ends_at)}</span>
              </div>
              <p className="text-sm">
                {formatCents(ad.price_cents, ad.currency)} · {ad.impressions.toLocaleString("en-US")} impressions · {ad.clicks.toLocaleString("en-US")} clicks · CTR {ctrLabel(ad.impressions, ad.clicks)}
              </p>
              {ad.status === "rejected" && ad.rejection_reason ? <p className="text-sm text-muted-foreground">Reason: {ad.rejection_reason}</p> : null}
              {ad.status === "draft" || ad.status === "pending_payment" ? <div><ResumeAdPayment campaignId={ad.id} /></div> : null}
            </article>
          )) : (
            <div className="grid gap-3 rounded-2xl border border-dashed border-border bg-secondary/50 p-5 text-sm text-muted-foreground">
              <p>You haven’t bought any ads yet.</p>
              <div><Button asChild size="sm"><Link href="/advertise">Advertise on Friction-Free</Link></Button></div>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
