import Link from "next/link";
import { redirect } from "next/navigation";
import { isolatedPreviewCounts } from "@/lib/auth/e2e-session";
import { getMarketplaceSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { MessageSquare, Search, Tags } from "lucide-react";
import { DashboardListItem, DashboardSectionCard, DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdSlot } from "@/components/ads/ad-slot";

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

async function unreadMessagesFor(userId: string) {
  try {
    const supabase = await createClient();
    const { data: conversations } = await supabase.from("conversations").select("id").or(`buyer_id.eq.${userId},seller_id.eq.${userId}`).limit(200);
    const ids = ((conversations ?? []) as Array<{ id: string }>).map((conversation) => conversation.id);
    if (!ids.length) return 0;
    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .in("conversation_id", ids)
      .neq("sender_id", userId)
      .is("read_at", null)
      .is("deleted_at", null);
    return count ?? 0;
  } catch {
    return 0;
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

const ATTENTION_OFFER_STATUSES = new Set(["pending"]);
const ATTENTION_PAYMENT_STATUSES = new Set(["paid", "escrowed", "shipped", "delivered", "disputed"]);

export default async function DashboardPage() {
  const session = await getMarketplaceSession();
  if (!session) redirect("/login?next=/dashboard");
  const counts = session.source === "supabase" ? await countsFor(session.id) : isolatedPreviewCounts(session.id);
  const activity = session.source === "supabase" ? await activityFor(session.id) : { items: [] as ActivityItem[], trustScore: null };
  const unreadMessages = session.source === "supabase" ? await unreadMessagesFor(session.id) : 0;
  const hasActivity = counts.listings + counts.offers + counts.messages + counts.orders > 0 || activity.items.length > 0;
  const attentionItems = activity.items.filter((item) => {
    if (item.id.startsWith("offer-")) return ATTENTION_OFFER_STATUSES.has(item.status);
    if (item.id.startsWith("payment-")) return ATTENTION_PAYMENT_STATUSES.has(item.status);
    return false;
  });

  return (
    <DashboardShell
      title={`${session.displayName}'s overview`}
      description={session.email ? `Signed in as ${session.email}` : undefined}
      actions={
        <>
          <Button asChild variant="trust"><Link href="/dashboard/listings/create">Create listing</Link></Button>
          <Button asChild variant="outline"><Link href="/dashboard/messages">Open messages</Link></Button>
        </>
      }
    >
      <AdSlot placement="dashboard_card" belowFold />
      {hasActivity ? (
        <DashboardSectionCard icon={MessageSquare} title="Needs your attention" description="Unread messages, pending offers, and orders that still need a next step.">
          {unreadMessages ? (
            <DashboardListItem title={`You have ${unreadMessages} unread message${unreadMessages === 1 ? "" : "s"}`} detail="Reply in the thread to keep the sale moving." status="Unread">
              <Button asChild size="sm" variant="outline"><Link href="/dashboard/messages">Open</Link></Button>
            </DashboardListItem>
          ) : null}
          {attentionItems.length ? attentionItems.map((item) => (
            <DashboardListItem key={item.id} title={item.title} detail={item.detail} status={item.status}>
              {item.href ? <Button asChild size="sm" variant="outline"><Link href={item.href}>Open</Link></Button> : null}
            </DashboardListItem>
          )) : unreadMessages ? null : (
            <p className="text-sm text-muted-foreground">Nothing needs your attention right now.</p>
          )}
        </DashboardSectionCard>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <p className="text-sm leading-6 text-muted-foreground">Find something nearby, or list an item to sell. Protected checkout is available when you are ready to pay.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button asChild size="lg"><Link href="/search"><Search className="h-4 w-4" /> Find something</Link></Button>
              <Button asChild size="lg" variant="outline"><Link href="/dashboard/listings/create"><Tags className="h-4 w-4" /> Sell something</Link></Button>
            </div>
          </CardContent>
        </Card>
      )}
    </DashboardShell>
  );
}
