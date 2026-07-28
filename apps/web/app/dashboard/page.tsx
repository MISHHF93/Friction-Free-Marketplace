import Link from "next/link";
import {
  Bell,
  Bot,
  CreditCard,
  Heart,
  LineChart,
  MessageSquare,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Tags,
  TrendingUp,
  UserCheck,
  Wallet,
  Zap
} from "lucide-react";
import { DashboardActionCard, DashboardListItem, DashboardProgressCard, DashboardSectionCard, DashboardShell, DashboardStatCard } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const stats = [
  { label: "Active listings", value: "12", detail: "3 drafts need photos or price updates.", icon: Tags },
  { label: "Open offers", value: "5", detail: "2 need a response before they expire today.", icon: Wallet },
  { label: "Unread messages", value: "8", detail: "Sorted by active purchases and sales.", icon: MessageSquare },
  { label: "Protected payments", value: "$2.1k", detail: "Authorized or pending release across your orders.", icon: CreditCard }
];

const activityFeed = [
  { title: "Counteroffer received", detail: "Vintage Herman Miller chair needs a response before 6 PM.", status: "Offer", href: "/dashboard/offers" },
  { title: "Payment authorized", detail: "Fuji X100VI purchase is ready for seller confirmation.", status: "Payment", href: "/dashboard/purchases" },
  { title: "Saved search matched", detail: "4 new road bikes under $1,500 matched your buyer filters.", status: "Search", href: "/dashboard/saved-searches" },
  { title: "Verification available", detail: "Completing ID verification can raise your protected transaction limit.", status: "Trust", href: "/dashboard/verification" }
];

const quickActions = [
  { title: "Create listing", detail: "Publish with clear copy, pricing context, and photos.", href: "/dashboard/listings/create", icon: Tags },
  { title: "Open inbox", detail: "Reply to buyer and seller conversations.", href: "/dashboard/messages", icon: MessageSquare },
  { title: "Review offers", detail: "Accept, counter, or decline negotiations.", href: "/dashboard/offers", icon: Wallet },
  { title: "Set up payments", detail: "Configure protected checkout and payouts.", href: "/dashboard/payments", icon: CreditCard }
];

const aiSuggestions = [
  "Add two detail photos to make your top listing easier to evaluate.",
  "Counter the camera offer at 94% of ask; buyer trust and intent are strong.",
  "Turn on alerts for electronics under $900 near your saved location.",
  "Complete payout verification before your next high-value sale closes."
];

const notificationItems = [
  { title: "New buyer message", detail: "A verified buyer asked about pickup timing.", status: "Unread" },
  { title: "Offer expires today", detail: "One counteroffer needs a response.", status: "Urgent" },
  { title: "Saved search alert", detail: "Fresh inventory matched your road bike filter.", status: "New" }
];

const recommendedActions = [
  { icon: UserCheck, title: "Finish verification", description: "Raise transaction limits and show stronger seller signals where they matter.", href: "/dashboard/verification", label: "Verify account" },
  { icon: Sparkles, title: "Use listing assistant", description: "Create a clear listing draft from photos, category, condition, and safety notes.", href: "/dashboard/ai-listing-creator", label: "Open assistant" },
  { icon: LineChart, title: "Review seller performance", description: "Check listing quality, response speed, pricing, and buyer interest in your seller workspace.", href: "/dashboard/seller", label: "Seller tools" }
];

export default function DashboardPage() {
  return (
    <DashboardShell
      title="Overview"
      description="A clear workspace for listings, messages, offers, payments, verification, and marketplace alerts."
      actions={
        <>
          <Button asChild variant="trust"><Link href="/dashboard/listings/create">Create listing</Link></Button>
          <Button asChild variant="outline"><Link href="/dashboard/messages">Open messages</Link></Button>
        </>
      }
    >
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => <DashboardStatCard key={stat.label} {...stat} />)}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <DashboardSectionCard icon={TrendingUp} title="Activity feed" description="Recent activity that may need your attention." badge="Live">
          {activityFeed.map((item, index) => (
            <DashboardListItem
              key={item.title}
              title={item.title}
              detail={item.detail}
              status={item.status}
              leading={<span className="flex h-8 w-8 items-center justify-center rounded-xl bg-trust text-xs font-black text-trust-foreground">{index + 1}</span>}
            >
              <Button asChild size="sm" variant="outline"><Link href={item.href}>Open</Link></Button>
            </DashboardListItem>
          ))}
        </DashboardSectionCard>
        <div className="grid gap-5">
          <DashboardProgressCard icon={ShieldCheck} label="Trust score" value={86} detail="Strong account health. Complete verification and respond faster to improve it." />
          <DashboardSectionCard icon={Bell} title="Notification center" description="Important marketplace alerts that need attention." badge="3 unread">
            {notificationItems.map((item) => (
              <DashboardListItem key={item.title} title={item.title} detail={item.detail} status={item.status} className="bg-secondary/70" />
            ))}
            <Button asChild variant="outline" className="w-full"><Link href="/dashboard/settings">Notification settings</Link></Button>
          </DashboardSectionCard>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <DashboardSectionCard icon={Bot} title="Assistant suggestions" description="Practical recommendations to improve listings and move deals forward." badge="Assistant">
          {aiSuggestions.map((suggestion) => (
            <DashboardListItem
              key={suggestion}
              title={suggestion}
              leading={<span className="rounded-2xl bg-ai-soft p-2 text-ai"><Sparkles className="h-4 w-4" /></span>}
              className="bg-ai-soft/40"
            />
          ))}
          <Button asChild variant="ai" className="w-full"><Link href="/dashboard/ai-listing-creator">Open assistant</Link></Button>
        </DashboardSectionCard>

        <DashboardSectionCard icon={Zap} title="Quick actions" description="Common buyer and seller tasks in one place." badge="Shortcuts">
          <div className="grid gap-3 sm:grid-cols-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.title} href={action.href} className="rounded-2xl border border-border/80 bg-card/80 p-4 shadow-xs transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-trust-soft text-trust"><Icon className="h-4 w-4" /></span>
                  <p className="mt-3 font-black">{action.title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{action.detail}</p>
                </Link>
              );
            })}
          </div>
        </DashboardSectionCard>
      </div>

      <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
        {recommendedActions.map((action) => (
          <DashboardActionCard key={action.title} icon={action.icon} title={action.title} description={action.description}>
            <Button asChild variant="outline" className="w-full"><Link href={action.href}>{action.label}</Link></Button>
          </DashboardActionCard>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
        <DashboardActionCard icon={ShoppingBag} title="Purchases" description="Track delivery, payment status, returns, and support cases for what you buy.">
          <Badge variant="trust">Buyer tools</Badge>
        </DashboardActionCard>
        <DashboardActionCard icon={Store} title="Sales" description="Monitor fulfillment, payout readiness, buyer communication, and checkout status.">
          <Badge variant="premium">Seller tools</Badge>
        </DashboardActionCard>
        <DashboardActionCard icon={Tags} title="Listings" description="Manage inventory, moderation status, listing quality, pricing, and buyer interest.">
          <Badge variant="ai">Inventory</Badge>
        </DashboardActionCard>
        <DashboardActionCard icon={Heart} title="Favorites" description="Keep shortlists organized and move quickly when prices change or sellers respond.">
          <Badge>Saved items</Badge>
        </DashboardActionCard>
      </div>
    </DashboardShell>
  );
}
