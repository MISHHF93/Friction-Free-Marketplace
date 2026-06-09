import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, CreditCard, FileText, ShieldCheck, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FinanceCard, MetricCard } from "@/components/ui-library";
import { marketplaceJsonLd, pricingPlans } from "@/lib/public-site";

export const metadata: Metadata = {
  title: "Pricing | Friction-Free Marketplace",
  description: "Transparent pricing for buyers, sellers, and platform operations, with success-based seller economics and professional commerce workflows.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Pricing | Friction-Free Marketplace",
    description: "Buyer, seller, and platform pricing for premium AI-powered marketplace commerce.",
    url: "/pricing",
  },
};

export default function PricingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(marketplaceJsonLd("/pricing", "Pricing", metadata.description ?? "")) }}
      />

      <section className="app-container py-section-sm">
        <div className="rounded-shell border border-border bg-card p-6 shadow-panel sm:p-8 lg:p-10">
          <Badge variant="premium" className="w-fit">Pricing</Badge>
          <h1 className="mt-5 max-w-4xl text-hero">Marketplace pricing designed around successful transactions.</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
            Buyers can discover and compare for free. Sellers pay when commerce happens. Platform operations get the reporting, controls, and risk context needed to scale responsibly.
          </p>
        </div>
      </section>

      <section className="app-container section-y">
        <div className="grid gap-5 lg:grid-cols-3">
          {pricingPlans.map((plan) => (
            <Card key={plan.name} className={plan.highlighted ? "card-commerce relative overflow-hidden" : "card-interactive"}>
              {plan.highlighted ? <Badge variant="trust" className="absolute right-5 top-5">Most relevant</Badge> : null}
              <CardHeader>
                <CardDescription>{plan.name}</CardDescription>
                <CardTitle className="text-4xl">{plan.price}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-3">
                  {plan.features.map((feature) => (
                    <p key={feature} className="flex gap-3 text-sm font-semibold">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-trust" aria-hidden="true" />
                      {feature}
                    </p>
                  ))}
                </div>
                <Button asChild variant={plan.highlighted ? "trust" : "outline"} className="mt-2">
                  <Link href={plan.href}>{plan.cta}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="app-container section-y">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div>
            <p className="brand-kicker">Financial model</p>
            <h2 className="mt-3 text-section">Premium commerce needs more than a listing fee.</h2>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              Pricing is designed to support payment processing, trust and safety workflows, dispute handling, seller payouts, reporting, and AI-assisted commerce tools.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FinanceCard title="Seller proceeds" amount={92500} detail="Example net payout on a $1,000 eligible order after platform and processing fees." items={[{ label: "Gross sale", amount: 100000 }, { label: "Platform fee", amount: -4500 }, { label: "Processing", amount: -3000 }]} />
            <FinanceCard title="Buyer discovery" amount={0} detail="Browsing, search, saved searches, and seller comparison remain free for buyers." tone="premium" />
          </div>
        </div>
      </section>

      <section className="app-container section-y">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Payments" value="Stripe" detail="Connect-ready seller onboarding, checkout, and payout flows." icon={CreditCard} tone="premium" />
          <MetricCard label="Reporting" value="Ledger" detail="Financial reporting and reconciliation-friendly data structures." icon={FileText} tone="commerce" />
          <MetricCard label="Trust" value="Review" detail="Moderation, disputes, risk checks, and support workflows." icon={ShieldCheck} tone="trust" />
          <MetricCard label="Payouts" value="Track" detail="Seller payout status and payment lifecycle visibility." icon={WalletCards} tone="ai" />
        </div>
      </section>

      <section className="app-container py-section">
        <div className="rounded-shell border border-border bg-card p-6 shadow-panel sm:p-8 lg:p-10">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div>
              <p className="brand-kicker">Questions</p>
              <h2 className="mt-3 text-section">Need custom platform economics?</h2>
              <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
                We can support custom platform fees, seller programs, category-specific economics, payout schedules, and operational reporting requirements.
              </p>
            </div>
            <Button asChild size="lg" variant="trust">
              <Link href="/contact">Contact us</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
