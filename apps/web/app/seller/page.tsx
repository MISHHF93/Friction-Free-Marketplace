import Link from "next/link";
import { Bot, ChartNoAxesCombined, PackagePlus, WalletCards } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const links = [
  { href: "/seller", label: "Seller overview" },
  { href: "/dashboard/listings", label: "Listings" },
  { href: "/dashboard/listings/create", label: "Create listing" },
  { href: "/dashboard/sales", label: "Sales" },
  { href: "/dashboard/messages", label: "Messages" },
  { href: "/dashboard/ai-listing-creator", label: "AI listing creator" }
];

const modules = [
  { icon: PackagePlus, title: "Inventory pipeline", text: "Draft, moderate, publish, pause, and relist products with Supabase-backed states." },
  { icon: WalletCards, title: "Payout readiness", text: "Stripe account and escrow release checkpoints are surfaced before every sale." },
  { icon: Bot, title: "AI listing studio", text: "OpenAI-powered title, description, category, and policy suggestions can slot into this shell." },
  { icon: ChartNoAxesCombined, title: "Seller analytics", text: "Track conversion, response time, trust lift, and price benchmarks." }
];

export default function SellerDashboardPage() {
  return (
    <DashboardShell title="Seller dashboard" description="A production shell for listing management, sales, payouts, seller analytics, and AI-assisted operations." links={links}>
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Seller command center</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">Launch, protect, and grow marketplace supply.</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">This workspace is ready for product creation forms, media uploads, Stripe onboarding, fulfillment workflows, and AI listing quality checks.</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button asChild><Link href="/dashboard/listings/create">Create listing</Link></Button>
          <Button asChild variant="outline"><Link href="/dashboard/ai-listing-creator">Use AI assistant</Link></Button>
        </div>
      </div>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {modules.map((module) => (
          <Card key={module.title}>
            <CardHeader><module.icon className="h-6 w-6 text-primary" /><CardTitle>{module.title}</CardTitle></CardHeader>
            <CardContent className="text-sm leading-6 text-muted-foreground">{module.text}</CardContent>
          </Card>
        ))}
      </div>
    </DashboardShell>
  );
}
