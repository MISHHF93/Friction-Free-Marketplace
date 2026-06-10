import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bot, HeartHandshake, ShieldCheck, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/ui-library";
import { companyStats, marketplaceJsonLd } from "@/lib/public-site";

export const metadata: Metadata = {
  title: "Company | Friction-Free Marketplace",
  description: "Friction-Free Marketplace is building premium AI-powered commerce infrastructure for trusted buying, professional selling, and safer marketplace operations.",
  alternates: { canonical: "/company" },
  openGraph: {
    title: "Company | Friction-Free Marketplace",
    description: "Learn about the Friction-Free Marketplace mission, platform principles, and commerce operating model.",
    url: "/company",
  },
};

const principles = [
  {
    icon: ShieldCheck,
    title: "Trust before transaction",
    description: "Buyers should see seller, listing, payment, and safety signals before committing time or money.",
  },
  {
    icon: Bot,
    title: "AI with accountability",
    description: "AI should assist search, creation, and review while preserving clear records and human decision paths.",
  },
  {
    icon: Store,
    title: "Professional seller workflows",
    description: "Sellers need more than listing forms: offers, payments, payouts, reporting, and buyer communication matter.",
  },
  {
    icon: HeartHandshake,
    title: "Commerce without pressure",
    description: "A premium marketplace should feel calm, clear, and safe, not rushed by dark patterns.",
  },
];

export default function CompanyPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(marketplaceJsonLd("/company", "Company", metadata.description ?? "")) }}
      />

      <section className="app-container py-section-sm">
        <div className="rounded-shell border border-border bg-card p-6 shadow-panel sm:p-8 lg:p-10">
          <Badge variant="premium" className="w-fit">Company</Badge>
          <h1 className="mt-5 max-w-4xl text-hero">We are building marketplace infrastructure where trust is part of the product.</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
            Friction-Free is designed for AI-powered commerce, professional sellers, protected transactions, operational visibility, and safer buying decisions.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" variant="trust"><Link href="/browse">Explore marketplace</Link></Button>
            <Button asChild size="lg" variant="outline"><Link href="/contact">Contact team</Link></Button>
          </div>
        </div>
      </section>

      <section className="app-container section-y">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {companyStats.map((stat) => (
            <MetricCard key={stat.label} label={stat.label} value={stat.value} detail={stat.detail} icon={stat.icon} tone="commerce" />
          ))}
        </div>
      </section>

      <section className="app-container section-y">
        <div className="mb-8">
          <p className="brand-kicker">Principles</p>
          <h2 className="mt-3 text-section">What makes the platform feel premium.</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {principles.map((principle) => (
            <Card key={principle.title} className="card-interactive">
              <CardHeader>
                <span className="brand-icon brand-icon-trust">
                  <principle.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <CardTitle>{principle.title}</CardTitle>
                <CardDescription>{principle.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="app-container section-y">
        <Card className="bg-premium-dark text-white">
          <CardContent className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:p-10">
            <div>
              <p className="text-eyebrow text-emerald-300">Platform direction</p>
              <h2 className="mt-4 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">Marketplace website, buyer workspace, seller workspace, and admin operations should feel like one system.</h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                The architecture is intentionally modular so public discovery, AI commerce, financial reporting, trust workflows, and administration can scale without fracturing the product experience.
              </p>
            </div>
            <Button asChild size="lg" variant="trust">
              <Link href="/how-it-works">
                See how it works <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
