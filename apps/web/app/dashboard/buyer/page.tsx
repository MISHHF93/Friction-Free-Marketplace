import Link from "next/link";
import { Heart, MessageSquare, ReceiptText, Search, ShieldCheck, ShoppingBag } from "lucide-react";
import { DashboardActionCard, DashboardListItem, DashboardSectionCard, DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";

const buyerJourney = [
  { title: "Discover", detail: "Search by item, budget, condition, fulfillment, and location.", href: "/search", status: "Find" },
  { title: "Evaluate", detail: "Compare listing details, seller trust, payment readiness, and safety signals.", href: "/browse", status: "Review" },
  { title: "Negotiate", detail: "Keep questions, offers, and handoff details inside protected conversations.", href: "/dashboard/offers", status: "Agree" },
  { title: "Complete", detail: "Track protected payment, fulfillment, inspection, and support milestones.", href: "/dashboard/purchases", status: "Track" }
];

export default function BuyerDashboardPage() {
  return (
    <DashboardShell
      kicker="Buying workspace"
      title="Find the right item with less uncertainty."
      description="Your buyer workspace keeps discovery, shortlists, conversations, offers, purchases, and safety guidance connected."
      actions={<Button asChild variant="trust"><Link href="/search"><Search className="h-4 w-4" /> Start a search</Link></Button>}
    >
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <DashboardActionCard icon={Search} title="Search" description="Use plain-language search and practical filters to narrow the marketplace.">
          <Button asChild variant="outline" className="w-full"><Link href="/search">Search marketplace</Link></Button>
        </DashboardActionCard>
        <DashboardActionCard icon={Heart} title="Favorites" description="Keep promising listings together while you compare price, condition, and trust.">
          <Button asChild variant="outline" className="w-full"><Link href="/dashboard/favorites">Open favorites</Link></Button>
        </DashboardActionCard>
        <DashboardActionCard icon={ReceiptText} title="Offers" description="Review sent offers, counteroffers, expiry times, and next actions.">
          <Button asChild variant="outline" className="w-full"><Link href="/dashboard/offers">Manage offers</Link></Button>
        </DashboardActionCard>
        <DashboardActionCard icon={ShoppingBag} title="Purchases" description="Follow payment, fulfillment, inspection, dispute, and receipt status.">
          <Button asChild variant="outline" className="w-full"><Link href="/dashboard/purchases">Track purchases</Link></Button>
        </DashboardActionCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <DashboardSectionCard icon={ShoppingBag} title="A clearer buying journey" description="Each stage leads to a working marketplace workflow." badge="Buyer flow">
          {buyerJourney.map((item) => (
            <DashboardListItem key={item.title} title={item.title} detail={item.detail} status={item.status}>
              <Button asChild size="sm" variant="outline"><Link href={item.href}>Open</Link></Button>
            </DashboardListItem>
          ))}
        </DashboardSectionCard>
        <DashboardSectionCard icon={ShieldCheck} title="Before you commit" description="Keep these safeguards in place for every exchange." badge="Safety">
          {[
            "Review the seller’s verification and trust signals.",
            "Keep negotiation and evidence inside marketplace messages.",
            "Use protected checkout instead of off-platform payment.",
            "Confirm the item and handoff terms before releasing funds."
          ].map((item) => <DashboardListItem key={item} title={item} />)}
          <Button asChild variant="surface" className="w-full"><Link href="/dashboard/trust-safety">Open safety center</Link></Button>
        </DashboardSectionCard>
      </div>

      <DashboardSectionCard icon={MessageSquare} title="Continue the conversation" description="Return to active marketplace conversations and keep transaction context together.">
        <Button asChild variant="ai"><Link href="/dashboard/messages">Open messages</Link></Button>
      </DashboardSectionCard>
    </DashboardShell>
  );
}
