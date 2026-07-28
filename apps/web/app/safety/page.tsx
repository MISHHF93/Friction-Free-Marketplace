import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Flag, LockKeyhole, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard, TrustBadge } from "@/components/ui-library";
import { getTrustSafetyStats } from "@/lib/public-marketplace";
import { marketplaceJsonLd, safetyPillars } from "@/lib/public-site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Safety center | Friction-Free Marketplace",
  description: "Learn how Friction-Free Marketplace supports safer buying and selling with seller signals, protected payments, AI risk checks, reports, disputes, and audit trails.",
  alternates: { canonical: "/safety" },
  openGraph: {
    title: "Safety center | Friction-Free Marketplace",
    description: "Marketplace safety, trust signals, protected payment records, reports, disputes, and review workflows.",
    url: "/safety",
  },
};

const buyerChecklist = [
  "Compare seller trust, completed transactions, and payment readiness before making contact.",
  "Keep conversations, offers, pickup details, and payment questions inside marketplace messaging.",
  "Use protected checkout for eligible purchases instead of off-platform payment requests.",
  "Report suspicious listings, counterfeit claims, unsafe messages, or delivery problems quickly.",
];

const sellerChecklist = [
  "Publish clear condition, price, photo, pickup, and shipping details.",
  "Complete verification and payment setup before accepting higher-value buyers.",
  "Respond through marketplace messaging so terms and handoff details stay connected.",
  "Keep receipts, payout status, refund decisions, and dispute context attached to orders.",
];

export default async function SafetyPage() {
  const stats = await getTrustSafetyStats();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(marketplaceJsonLd("/safety", "Safety center", metadata.description ?? "")) }}
      />

      <section className="app-container py-section-sm">
        <div className="rounded-shell border border-border bg-card p-6 shadow-panel sm:p-8 lg:p-10">
          <Badge variant="trust" className="w-fit">Safety center</Badge>
          <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)] lg:items-end">
            <div>
              <h1 className="max-w-4xl text-hero">Trust and safety should be visible before money moves.</h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
                Friction-Free puts seller signals, payment readiness, risk checks, reporting, disputes, and audit trails close to the moments where buyers and sellers make decisions.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <TrustBadge label="Seller signals" />
                <TrustBadge label="Protected payment records" tone="premium" />
                <TrustBadge label="AI-assisted review" tone="ai" />
              </div>
            </div>
            <Card className="bg-premium-dark text-white">
              <CardHeader>
                <CardTitle className="text-white">Safety snapshot</CardTitle>
                <CardDescription className="text-slate-300">
                  A current marketplace-wide view of activity and trust signals.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <Snapshot label="Listings" value={stats.activeListings.toLocaleString()} />
                <Snapshot label="Sellers" value={stats.trustedSellers.toLocaleString()} />
                <Snapshot label="Trades" value={stats.completedTransactions.toLocaleString()} />
                <Snapshot label="Low risk" value={`${stats.lowRiskRate}%`} />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="app-container section-y">
        <div className="mb-8">
          <p className="brand-kicker">Protection model</p>
          <h2 className="mt-3 text-section">Four layers that keep the marketplace accountable.</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {safetyPillars.map((pillar) => (
            <Card key={pillar.title} className="card-interactive h-full">
              <CardHeader>
                <span className="brand-icon brand-icon-trust">
                  <pillar.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <CardTitle>{pillar.title}</CardTitle>
                <CardDescription>{pillar.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="app-container section-y">
        <div className="grid gap-6 lg:grid-cols-2">
          <SafetyChecklist title="Buyer safety checklist" items={buyerChecklist} />
          <SafetyChecklist title="Seller safety checklist" items={sellerChecklist} />
        </div>
      </section>

      <section className="app-container section-y">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Signal before contact" value="Review" detail="Seller history and listing quality are surfaced before messaging." icon={ShieldCheck} tone="trust" />
          <MetricCard label="Payment context" value="Connect" detail="Eligible checkout keeps payment records tied to the order." icon={LockKeyhole} tone="premium" />
          <MetricCard label="Report flow" value="Escalate" detail="Reports can route to review queues instead of disappearing into support." icon={Flag} tone="warning" />
          <MetricCard label="Risk response" value="Act" detail="Unsafe patterns should trigger moderation, disputes, or account controls." icon={AlertTriangle} tone="risk" />
        </div>
      </section>

      <section className="app-container py-section">
        <div className="rounded-shell border border-amber-200 bg-safety-warning-soft p-6 shadow-card sm:p-8 lg:p-10">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div>
              <p className="text-eyebrow text-amber-800">Report a concern</p>
              <h2 className="mt-3 text-section">If something feels wrong, keep the record in the marketplace.</h2>
              <p className="mt-4 max-w-3xl text-base leading-7 text-amber-950">
                Suspicious listings, counterfeit claims, off-platform payment pressure, unsafe messages, and transaction issues should be reported from the related listing, message, or order when possible.
              </p>
            </div>
            <div className="grid gap-3 sm:flex">
              <Button asChild variant="destructive" size="lg">
                <Link href="/contact">Contact safety</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/how-it-works">
                  Learn the process <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function SafetyChecklist({ title, items }: { title: string; items: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Clear guidance for safer marketplace decisions.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {items.map((item) => (
          <p key={item} className="flex gap-3 rounded-2xl bg-secondary/70 px-4 py-3 text-sm font-semibold">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-trust" aria-hidden="true" />
            {item}
          </p>
        ))}
      </CardContent>
    </Card>
  );
}

function Snapshot({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-300">{label}</p>
    </div>
  );
}
