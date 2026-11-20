import Link from "next/link";
import { redirect } from "next/navigation";
import { isolatedPreviewCounts } from "@/lib/auth/e2e-session";
import { getMarketplaceSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
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
import { DashboardActionCard, DashboardEmptyState, DashboardListItem, DashboardSectionCard, DashboardShell, DashboardStatCard } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ActivityItem = { id: string; title: string; detail: string; status: string; href: string | null };

async function activityFor(userId: string) {
  const empty = { items: [] as ActivityItem[], trustScore: null as number | null };
  try {
    const supabase = await createClient();
    const [offers, payments, conversations, searches, trust] = await Promise.all([
      supabase.from("offers").select("id,status,amount,currency").or(`buyer_id.eq.${userId},seller_id.eq.${userId}`).order("updated_at", { ascending: false }).limit(4),
      supabase.from("transactions").select("id,status,total_amount,currency").or(`buyer_id.eq.${userId},seller_id.eq.${userId}`).order("updated_at", { ascending: false }).limit(4),
      supabase.from("conversations").select("id,status,last_message_at").or(`buyer_id.eq.${userId},seller_id.eq.${userId}`).order("updated_at", { ascending: false }).limit(4),
      supabase.from("saved_searches").select("id,name,query").eq("user_id", userId).order("updated_at", { ascending: false }).limit(4),
      supabase.from("trust_scores").select("score").eq("user_id", userId).maybeSingle()
    ]);
    const items: ActivityItem[] = [
      ...((offers.data ?? []) as Array<{ id: string; status: string; amount: number; currency: string }>).map((offer) => ({
        id: `offer-${offer.id}`,
        title: "Your offer",
        detail: `${offer.amount} ${offer.currency}`,
        status: offer.status,
        href: "/dashboard/offers"
      })),
      ...((payments.data ?? []) as Array<{ id: string; status: string; total_amount: number; currency: string }>).map((payment) => ({
        id: `payment-${payment.id}`,
        title: "Your payment",
        detail: `${payment.total_amount} ${payment.currency}`,
        status: payment.status,
        href: "/dashboard/purchases"
      })),
      ...((conversations.data ?? []) as Array<{ id: string; status: string }>).map((conversation) => ({
        id: `message-${conversation.id}`,
        title: "Your conversation",
        detail: "A message thread that includes this account.",
        status: conversation.status,
        href: `/dashboard/messages?conversation=${conversation.id}`
      })),
      ...((searches.data ?? []) as Array<{ id: string; name: string; query: string | null }>).map((search) => ({
        id: `search-${search.id}`,
        title: search.name,
        detail: search.query || "Saved search for this account.",
        status: "Saved",
        href: "/dashboard/saved-searches"
      }))
    ];
    return {
      items,
      trustScore: trust.data?.score == null ? null : Math.round(Number(trust.data.score))
    };
  } catch {
    return empty;
  }
}

async function countsFor(userId: string) {
  try {
    const supabase = await createClient();
    const [listings, offers, messages, orders] = await Promise.all([
      supabase.from("listings").select("id", { count: "exact", head: true }).eq("seller_id", userId).is("deleted_at", null),
      supabase.from("offers").select("id", { count: "exact", head: true }).or(`buyer_id.eq.${userId},seller_id.eq.${userId}`),
      supabase.from("conversations").select("id", { count: "exact", head: true }).or(`buyer_id.eq.${userId},seller_id.eq.${userId}`),
      supabase.from("transactions").select("id", { count: "exact", head: true }).or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    ]);
    return {
      listings: listings.count ?? 0,
      offers: offers.count ?? 0,
      messages: messages.count ?? 0,
      orders: orders.count ?? 0
    };
  } catch {
    return { listings: 0, offers: 0, messages: 0, orders: 0 };
  }
}

const quickActions = [
  { title: "Create listing", detail: "Publish with clear copy, pricing context, and photos.", href: "/dashboard/listings/create", icon: Tags },
  { title: "Open inbox", detail: "Reply to buyer and seller conversations.", href: "/dashboard/messages", icon: MessageSquare },
  { title: "Review offers", detail: "Accept, counter, or decline negotiations.", href: "/dashboard/offers", icon: Wallet },
  { title: "Set up payments", detail: "Configure protected checkout and payouts.", href: "/dashboard/payments", icon: CreditCard }
];

const recommendedActions = [
  { icon: UserCheck, title: "Finish verification", description: "Raise transaction limits and show stronger seller signals where they matter.", href: "/dashboard/verification", label: "Verify account" },
  { icon: Sparkles, title: "Use listing assistant", description: "Create a clear listing draft from photos, category, condition, and safety notes.", href: "/dashboard/ai-listing-creator", label: "Open assistant" },
  { icon: LineChart, title: "Review seller performance", description: "Check listing quality, response speed, pricing, and buyer interest in your seller workspace.", href: "/dashboard/seller", label: "Seller tools" }
];

export default async function DashboardPage({ searchParams }: { searchParams?: Promise<{ adminDenied?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const session = await getMarketplaceSession();
  if (!session) redirect("/login?next=/dashboard");
  const counts = session.source === "supabase" ? await countsFor(session.id) : isolatedPreviewCounts(session.id);
  const activity = session.source === "supabase" ? await activityFor(session.id) : { items: [], trustScore: null };
  const stats = [
    { label: "Your listings", value: String(counts.listings), detail: "Listings owned by this signed-in account.", icon: Tags },
    { label: "Your offers", value: String(counts.offers), detail: "Offers where you are the buyer or seller.", icon: Wallet },
    { label: "Your messages", value: String(counts.messages), detail: "Conversations that include this account.", icon: MessageSquare },
    { label: "Your orders", value: String(counts.orders), detail: "Purchases and sales for this account.", icon: CreditCard }
  ];

  return (
    <DashboardShell
      title={`${session.displayName}'s overview`}
      description={`Signed in as ${session.email || session.displayName}. These counts belong only to this account.`}
      actions={
        <>
          <Button asChild variant="trust"><Link href="/dashboard/listings/create">Create listing</Link></Button>
          <Button asChild variant="outline"><Link href="/dashboard/messages">Open messages</Link></Button>
        </>
      }
    >
      {resolvedSearchParams?.adminDenied ? (
        <p className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-950" role="status">
          This account is not authorized for the admin console.
        </p>
      ) : null}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => <DashboardStatCard key={stat.label} {...stat} />)}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <DashboardSectionCard icon={TrendingUp} title="Activity feed" description="Offers, payments, messages, and saved searches for this account." badge={String(activity.items.length)}>
          {activity.items.length === 0 ? (
            <DashboardEmptyState title="No activity yet" description="Offers, payments, messages, and saved searches for this account will show up here." />
          ) : activity.items.map((item) => (
            <DashboardListItem key={item.id} title={item.title} detail={item.detail} status={item.status}>
              {item.href ? <Button asChild size="sm" variant="outline"><Link href={item.href}>Open</Link></Button> : null}
            </DashboardListItem>
          ))}
        </DashboardSectionCard>
        <div className="grid gap-5">
          <DashboardSectionCard icon={ShieldCheck} title="Trust score" description="Calculated from this account's reviews, orders, and risk signals.">
            <p className="text-4xl font-black">{activity.trustScore ?? "—"}</p>
            <p className="text-sm text-muted-foreground">{activity.trustScore == null ? "This account has not been scored yet." : "Current stored trust score."}</p>
          </DashboardSectionCard>
          <DashboardSectionCard icon={Bell} title="Notification center" description="Alerts that belong to this signed-in account." badge={activity.items.length ? "From your records" : "None"}>
            {activity.items.length === 0 ? <DashboardEmptyState title="No notifications" description="This account has no offers, payments, messages, or saved searches yet." /> : null}
            <Button asChild variant="outline" className="w-full"><Link href="/dashboard/settings">Notification settings</Link></Button>
          </DashboardSectionCard>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <DashboardSectionCard icon={Bot} title="Assistant" description="Open the listing assistant for this account. It does not invent offers or inventory." badge="Assistant">
          <DashboardEmptyState title="No generated suggestions" description="Suggestions appear only after you run the assistant on your own listing." action={<Button asChild variant="ai"><Link href="/dashboard/ai-listing-creator">Open assistant</Link></Button>} />
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
