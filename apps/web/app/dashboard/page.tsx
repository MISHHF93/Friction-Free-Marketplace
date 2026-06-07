import Link from "next/link";
import { Heart, MessageSquare, Search, ShieldCheck, ShoppingBag, Tags, TrendingUp, Wallet } from "lucide-react";
import { DashboardActionCard, DashboardListItem, DashboardSectionCard, DashboardShell, DashboardStatCard } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";

const stats = [
  { label: "Active listings", value: "12", detail: "3 drafts are ready for photos or pricing updates.", icon: Tags },
  { label: "Open offers", value: "5", detail: "2 need a response before they expire today.", icon: Wallet },
  { label: "Unread messages", value: "8", detail: "Prioritized by active purchases and sales.", icon: MessageSquare },
  { label: "Trust score", value: "86", detail: "Strong profile with one verification action remaining.", icon: ShieldCheck }
];

const timeline = [
  "Counteroffer received for Vintage Herman Miller chair.",
  "Escrow payment cleared for Fuji X100VI purchase.",
  "Saved search matched 4 new road bikes under $1,500.",
  "Identity verification can raise your transaction limit to $10k."
];

export default function DashboardPage() {
  return (
    <DashboardShell
      title="Dashboard home"
      description="A personalized overview of your buying, selling, messaging, trust, and verification activity."
      actions={<Button asChild><Link href="/dashboard/listings">Manage listings</Link></Button>}
    >
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => <DashboardStatCard key={stat.label} {...stat} />)}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <DashboardSectionCard icon={TrendingUp} title="Today's priority queue" description="Time-sensitive actions across buying, selling, messaging, and verification." badge="4 actions">
          {timeline.map((item, index) => (
            <DashboardListItem key={item} title={item} leading={<span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-black text-primary-foreground">{index + 1}</span>} className="bg-secondary/70" />
          ))}
        </DashboardSectionCard>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
          <DashboardActionCard icon={Search} title="Resume discovery" description="Review saved searches, favorited listings, and fresh recommendations based on your marketplace activity.">
            <Button asChild variant="outline" className="w-full"><Link href="/dashboard/saved-searches">View saved searches</Link></Button>
          </DashboardActionCard>
          <DashboardActionCard icon={TrendingUp} title="Improve conversion" description="Publish a draft, answer messages faster, and complete verification to earn stronger buyer confidence.">
            <Button asChild className="w-full"><Link href="/dashboard/verification">Open verification center</Link></Button>
          </DashboardActionCard>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <DashboardActionCard icon={ShoppingBag} title="Purchases" description="Track delivery milestones, escrow status, returns, and support cases for everything you buy." />
        <DashboardActionCard icon={Tags} title="Listings" description="Manage inventory, AI moderation status, listing quality, pricing, and buyer interest." />
        <DashboardActionCard icon={Heart} title="Favorites" description="Keep shortlists organized and move quickly when prices drop or sellers accept offers." />
      </div>
    </DashboardShell>
  );
}
