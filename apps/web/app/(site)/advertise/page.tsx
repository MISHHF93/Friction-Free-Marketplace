import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdvertiseForm } from "@/components/ads/advertise-form";
import { getMarketplaceSession } from "@/lib/auth/session";
import { loadAdPricingForDisplay } from "@/lib/ads/pricing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Advertise | Friction-Free Marketplace",
  description: "Buy a sponsored placement on Friction-Free Marketplace. Pick a spot, upload your banner, pay with Stripe, and go live after review.",
  alternates: { canonical: "/advertise" }
};

export default async function AdvertisePage() {
  const session = await getMarketplaceSession();
  const pricing = session ? await loadAdPricingForDisplay() : [];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <section className="app-container py-section-sm">
      <div className="mx-auto grid w-full max-w-xl gap-6">
        <div className="rounded-shell border border-border bg-card p-5 shadow-panel sm:p-8">
          <Badge variant="premium" className="w-fit">Advertise</Badge>
          <h1 className="mt-4 text-3xl font-black tracking-tight">Put your business in front of local buyers</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Pick a spot, upload a banner, choose how many days, and pay with Stripe. Every ad is reviewed before it goes live and is always labeled “Sponsored”. If we don’t approve it, you get a full refund.
          </p>
          {session ? (
            <p className="mt-3 text-sm"><Link className="font-semibold underline underline-offset-4" href="/dashboard/ads">See my ads</Link></p>
          ) : null}
        </div>
        <div className="rounded-shell border border-border bg-card p-5 shadow-panel sm:p-8">
          {session ? (
            <AdvertiseForm pricing={pricing} today={today} defaultAdvertiser={session.displayName} />
          ) : (
            <div className="grid gap-4">
              <p className="text-sm leading-6 text-muted-foreground">Sign in or create a free account to buy an ad. You can track impressions and clicks from your dashboard.</p>
              <Button asChild><Link href="/login?next=/advertise">Sign in to advertise</Link></Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
