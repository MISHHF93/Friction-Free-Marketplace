import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, CreditCard, ShieldCheck, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FinanceCard, MetricCard } from "@/components/ui-library";
import { NoncedJsonLd } from "@/components/security/nonce-script";
import { marketplaceJsonLd, pricingPlans } from "@/lib/public-site";

export const metadata: Metadata = {
  title: "Pricing | Friction-Free Marketplace",
  description: "Free to list and browse. Buyers pay a 5% protection fee at checkout; sellers keep their full price.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Pricing | Friction-Free Marketplace",
    description: "Clear buyer and seller pricing for trusted marketplace commerce.",
    url: "/pricing",
  },
};

export default function PricingPage() {
  return (
    <>
      <NoncedJsonLd data={marketplaceJsonLd("/pricing", "Pricing", metadata.description ?? "")} />

      <section className="app-container py-section-sm">
        <div className="rounded-shell border border-border bg-card p-6 shadow-panel sm:p-8 lg:p-10">
          <Badge variant="premium" className="w-fit">Pricing</Badge>
          <h1 className="mt-5 max-w-4xl text-hero">Simple, upfront pricing.</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
            Listing, browsing, and messaging are free. When a buyer pays in the app, a 5% buyer protection fee (minimum $0.99) is added at checkout, and the seller keeps their full price.
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
            <p className="brand-kicker">Example</p>
            <h2 className="mt-3 text-section">A $100 item, start to finish.</h2>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              The protection fee pays for card processing, holding the payment until handoff, dispute handling, and trust and safety review.
            </p>
          </div>
          <div className="grid gap-4">
            <FinanceCard title="Buyer pays" amount={105} detail="Item price plus the 5% buyer protection fee. Held until the buyer confirms they got the item." items={[{ label: "Item price", amount: 100 }, { label: "Buyer protection fee (5%)", amount: 5 }]} />
            <FinanceCard title="Seller receives" amount={100} detail="The full item price (plus any shipping the seller charged), paid out after the buyer confirms receipt." tone="premium" />
          </div>
        </div>
      </section>

      <section className="app-container section-y">
        <div className="grid gap-4">
          <MetricCard label="Secure payments" value="Stripe" detail="Cards are processed by Stripe; Friction-Free never stores card numbers." icon={CreditCard} tone="premium" />
          <MetricCard label="Payment held" value="Until handoff" detail="The seller is paid only after the buyer confirms they received the item." icon={WalletCards} tone="ai" />
          <MetricCard label="Disputes" value="Reviewed" detail="If something goes wrong, our team reviews the order and can refund the buyer." icon={ShieldCheck} tone="trust" />
        </div>
      </section>

      <section className="app-container py-section">
        <div className="rounded-shell border border-border bg-card p-6 shadow-panel sm:p-8 lg:p-10">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div>
              <p className="brand-kicker">Questions</p>
              <h2 className="mt-3 text-section">Selling at a larger scale?</h2>
              <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
                Talk with us about larger catalogs, team workflows, category-specific needs, fulfillment, and seller onboarding.
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
