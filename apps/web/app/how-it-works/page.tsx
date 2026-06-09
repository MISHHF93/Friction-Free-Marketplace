import type { Metadata } from "next";
import type React from "react";
import Link from "next/link";
import { ArrowRight, CreditCard, MessageSquare, Search, ShieldCheck, Store, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CompactListingLink } from "@/components/public-listing-grid";
import { getFeaturedListings, getTrustSafetyStats } from "@/lib/public-marketplace";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "How it works | Friction-Free Marketplace",
  description: "Understand how buyers and sellers use Friction-Free Marketplace from search and messaging to protected checkout, pickup, delivery, and trust checks.",
  alternates: { canonical: "/how-it-works" },
  openGraph: {
    title: "How Friction-Free Marketplace works",
    description: "A step-by-step guide to marketplace search, seller profiles, checkout protection, and handoffs.",
    url: "/how-it-works"
  }
};

const buyerSteps = [
  { icon: Search, title: "Discover", text: "Browse categories or search by keywords, radius, price, condition, and seller trust." },
  { icon: ShieldCheck, title: "Evaluate", text: "Open listing details and seller profiles to review verification, risk, and transaction signals." },
  { icon: MessageSquare, title: "Coordinate", text: "Message sellers, ask questions, and keep important terms inside the marketplace." },
  { icon: CreditCard, title: "Checkout", text: "Use protected payment for eligible purchases and keep receipts, disputes, and refunds connected." }
];

const sellerSteps = [
  { icon: Store, title: "Create a listing", text: "Publish with category, condition, photos, price, pickup, and shipping details." },
  { icon: MessageSquare, title: "Respond to buyers", text: "Manage offers, questions, pickup scheduling, and buyer expectations." },
  { icon: Truck, title: "Complete the order", text: "Coordinate pickup or shipping after payment authorization, then confirm completion." }
];

export default async function HowItWorksPage() {
  const [featured, stats] = await Promise.all([getFeaturedListings(3), getTrustSafetyStats()]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-border bg-card p-6 shadow-soft sm:p-8 lg:p-10">
        <Badge>Marketplace guide · {stats.source}</Badge>
        <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_340px] lg:items-end">
          <div>
            <h1 className="max-w-4xl text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">From search to handoff, each step is easier to understand.</h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">The marketplace combines listing data, seller trust profiles, protected payment options, and safety guidance so buyers and sellers know what happens next.</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button asChild><Link href="/browse">Start browsing <ArrowRight className="h-4 w-4" /></Link></Button>
              <Button asChild variant="outline"><Link href="/seller">Start selling</Link></Button>
            </div>
          </div>
          <Card className="bg-secondary/70">
            <CardHeader><CardTitle>Marketplace today</CardTitle></CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <Metric label="Active listings" value={stats.activeListings.toLocaleString()} />
              <Metric label="Low-risk users" value={`${stats.lowRiskRate}%`} />
              <Metric label="Completed transactions" value={stats.completedTransactions.toLocaleString()} />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">For buyers</p>
        <div className="mt-4 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {buyerSteps.map((step, index) => <StepCard key={step.title} index={index + 1} {...step} />)}
        </div>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_0.85fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">For sellers</p>
          <div className="mt-4 grid gap-5 md:grid-cols-3 lg:grid-cols-1">
            {sellerSteps.map((step, index) => <StepCard key={step.title} index={index + 1} {...step} />)}
          </div>
        </div>
        <Card>
          <CardHeader><CardTitle>Try the process with current listings</CardTitle><CardDescription>Recommended listings from marketplace data when available.</CardDescription></CardHeader>
          <CardContent className="grid gap-3">
            {featured.listings.map((listing) => <CompactListingLink key={listing.id} listing={listing} />)}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function StepCard({ index, icon: Icon, title, text }: { index: number; icon: React.ComponentType<{ className?: string }>; title: string; text: string }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <Icon className="h-6 w-6 text-primary" />
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-black text-primary">{index}</span>
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{text}</CardDescription>
      </CardHeader>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between rounded-xl bg-card px-4 py-3"><span className="text-muted-foreground">{label}</span><strong>{value}</strong></div>;
}
