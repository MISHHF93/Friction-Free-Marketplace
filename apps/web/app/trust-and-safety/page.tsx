import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, FileText, LockKeyhole, MessageSquareWarning, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTrustSafetyStats } from "@/lib/public-marketplace";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Trust and safety | Friction-Free Marketplace",
  description: "Learn how Friction-Free Marketplace helps protect buyers and sellers with identity signals, moderation, protected payments, reports, and disputes.",
  alternates: { canonical: "/trust-and-safety" },
  openGraph: {
    title: "Trust and safety on Friction-Free Marketplace",
    description: "Marketplace safety policies, buyer protection, seller verification, reporting, and dispute support.",
    url: "/trust-and-safety"
  }
};

const protections = [
  { icon: ShieldCheck, title: "Seller signals", text: "Seller profiles show trust scores, completed transactions, risk levels, and verification badges." },
  { icon: LockKeyhole, title: "Protected payments", text: "Eligible checkout keeps payment status, release, refunds, and disputes connected to the order." },
  { icon: MessageSquareWarning, title: "Reporting and review", text: "Reports, listing review, media checks, and admin queues help remove unsafe content." },
  { icon: FileText, title: "Audit records", text: "Admin actions, risk changes, payment updates, and AI decisions are designed to leave a reviewable record." }
];

const steps = ["Search listings with trust filters before contacting a seller.", "Keep conversations and offers in platform messaging.", "Use protected checkout for eligible items instead of off-platform payment.", "Report suspicious listings, messages, seller requests, or delivery problems quickly."];

export default async function TrustAndSafetyPage() {
  const stats = await getTrustSafetyStats();

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-border bg-card p-6 shadow-soft sm:p-8 lg:p-10">
        <Badge>Trust center · {stats.source}</Badge>
        <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <h1 className="max-w-4xl text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">Marketplace protection for safer decisions.</h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">Trust and safety is built into search, listing details, seller profiles, checkout, messaging, and admin review so buyers and sellers can act with clearer information.</p>
          </div>
          <Card className="bg-primary text-primary-foreground">
            <CardHeader><CardTitle>Safety snapshot</CardTitle><CardDescription className="text-primary-foreground/75">Aggregated from marketplace data when available.</CardDescription></CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <Metric label="Active listings" value={stats.activeListings.toLocaleString()} />
              <Metric label="Checked sellers" value={stats.trustedSellers.toLocaleString()} />
              <Metric label="Transactions" value={stats.completedTransactions.toLocaleString()} />
              <Metric label="Low risk" value={`${stats.lowRiskRate}%`} />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {protections.map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <item.icon className="h-6 w-6 text-primary" />
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>{item.text}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-primary" /> Safer buying checklist</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {steps.map((step) => <p key={step} className="rounded-xl bg-secondary px-4 py-3 text-sm font-medium">{step}</p>)}
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/70">
          <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-700" /> Report a safety concern</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>If a listing looks counterfeit, a seller requests off-platform payment, or a message includes suspicious links, report it from the relevant listing, conversation, or transaction record.</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild><Link href="/browse">Find a listing</Link></Button>
              <Button asChild variant="outline"><Link href="/how-it-works">Learn the process</Link></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-primary-foreground/10 p-4">
      <p className="text-2xl font-black">{value}</p>
      <p className="text-xs text-primary-foreground/75">{label}</p>
    </div>
  );
}
