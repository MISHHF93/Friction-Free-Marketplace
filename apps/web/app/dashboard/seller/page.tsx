import Link from "next/link";
import { BadgeCheck, CreditCard, MessageSquare, Plus, ReceiptText, Sparkles, Store, Tags } from "lucide-react";
import { DashboardActionCard, DashboardListItem, DashboardSectionCard, DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";

const sellerJourney = [
  { title: "Create a clear listing", detail: "Add useful photos, condition details, a fair price, and realistic fulfillment options.", href: "/dashboard/listings/create", status: "List" },
  { title: "Respond with context", detail: "Keep buyer questions, offers, availability, and handoff details together.", href: "/dashboard/messages", status: "Reply" },
  { title: "Confirm the sale", detail: "Review accepted terms, protected payment status, and buyer expectations.", href: "/dashboard/sales", status: "Fulfill" },
  { title: "Receive payout", detail: "Complete seller onboarding and monitor payout readiness after fulfillment.", href: "/dashboard/payments", status: "Payout" }
];

export default function SellerDashboardPage() {
  return (
    <DashboardShell
      kicker="Selling workspace"
      title="Sell professionally without making it complicated."
      description="Create trustworthy listings, respond to buyers, manage offers and sales, and keep payment readiness visible."
      actions={<Button asChild variant="trust"><Link href="/dashboard/listings/create"><Plus className="h-4 w-4" /> Create listing</Link></Button>}
    >
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <DashboardActionCard icon={Tags} title="Inventory" description="Manage drafts, active listings, sold items, and listing quality.">
          <Button asChild variant="outline" className="w-full"><Link href="/dashboard/listings">Manage listings</Link></Button>
        </DashboardActionCard>
        <DashboardActionCard icon={ReceiptText} title="Offers" description="Accept, decline, or counter buyer offers with a clear audit trail.">
          <Button asChild variant="outline" className="w-full"><Link href="/dashboard/offers">Review offers</Link></Button>
        </DashboardActionCard>
        <DashboardActionCard icon={Store} title="Sales" description="Track fulfillment, buyer communication, and completed exchanges.">
          <Button asChild variant="outline" className="w-full"><Link href="/dashboard/sales">Open sales</Link></Button>
        </DashboardActionCard>
        <DashboardActionCard icon={CreditCard} title="Payments" description="Complete seller onboarding and monitor protected payment readiness.">
          <Button asChild variant="outline" className="w-full"><Link href="/dashboard/payments">Payment settings</Link></Button>
        </DashboardActionCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <DashboardSectionCard icon={Store} title="From listing to payout" description="Every step leads to a working seller workflow." badge="Seller flow">
          {sellerJourney.map((item) => (
            <DashboardListItem key={item.title} title={item.title} detail={item.detail} status={item.status}>
              <Button asChild size="sm" variant="outline"><Link href={item.href}>Open</Link></Button>
            </DashboardListItem>
          ))}
        </DashboardSectionCard>
        <DashboardSectionCard icon={BadgeCheck} title="Seller readiness" description="Complete these foundations before a high-value sale." badge="Trust">
          {[
            "Use accurate photos and disclose meaningful flaws.",
            "Complete identity and payout verification.",
            "Keep response times and fulfillment promises realistic.",
            "Use protected payment and preserve handoff evidence."
          ].map((item) => <DashboardListItem key={item} title={item} />)}
          <Button asChild variant="surface" className="w-full"><Link href="/dashboard/verification">Verification center</Link></Button>
        </DashboardSectionCard>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <DashboardActionCard icon={Sparkles} title="Listing assistant" description="Turn photos and item details into a clearer structured draft.">
          <Button asChild variant="ai" className="w-full"><Link href="/dashboard/ai-listing-creator">Open assistant</Link></Button>
        </DashboardActionCard>
        <DashboardActionCard icon={MessageSquare} title="Buyer conversations" description="Keep buyer questions and transaction context in one protected place.">
          <Button asChild variant="outline" className="w-full"><Link href="/dashboard/messages">Open messages</Link></Button>
        </DashboardActionCard>
      </div>
    </DashboardShell>
  );
}
