import Link from "next/link";
import { ArrowRightLeft, CheckCircle2, Clock, DollarSign, History } from "lucide-react";
import { DashboardActionCard, DashboardShell, DashboardStatCard } from "@/components/dashboard-shell";
import { OfferCard } from "@/components/marketplace-design-system";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { OfferStatus } from "@/lib/messaging/types";

type OfferRow = {
  id: string;
  conversation_id: string | null;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  created_by_id: string | null;
  amount: number;
  currency: string;
  message: string | null;
  status: OfferStatus;
  parent_offer_id: string | null;
  expires_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  withdrawn_at: string | null;
  created_at: string;
  updated_at: string;
  listing: { id: string; title: string; price_amount: number; currency: string; status: string } | null;
  offer_status_history?: Array<{ id: string; from_status: OfferStatus | null; to_status: OfferStatus; reason: string | null; created_at: string }>;
};

function displayStatus(status: OfferStatus) {
  return status === "declined" ? "rejected" : status;
}

export default async function OffersPage() {
  let userId = "";
  let offers: OfferRow[] = [];
  let setupError: string | null = null;

  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      userId = user.id;
      const { data, error } = await (supabase as any)
        .from("offers")
        .select(`
          id,conversation_id,listing_id,buyer_id,seller_id,created_by_id,amount,currency,message,status,parent_offer_id,expires_at,accepted_at,rejected_at,withdrawn_at,created_at,updated_at,
          listing:listings(id,title,price_amount,currency,status),
          offer_status_history(id,from_status,to_status,reason,created_at)
        `)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order("updated_at", { ascending: false })
        .order("created_at", { referencedTable: "offer_status_history", ascending: false })
        .limit(50);
      if (error) throw error;
      offers = (data ?? []) as OfferRow[];
    }
  } catch (error) {
    setupError = error instanceof Error ? error.message : "Offers could not be loaded right now.";
  }

  const now = Date.now();
  const openOffers = offers.filter((offer) => offer.status === "pending");
  const expiringSoon = openOffers.filter((offer) => offer.expires_at && new Date(offer.expires_at).getTime() - now <= 24 * 60 * 60 * 1000 && new Date(offer.expires_at).getTime() > now);
  const acceptedThisMonth = offers.filter((offer) => {
    if (!offer.accepted_at) return false;
    const acceptedAt = new Date(offer.accepted_at);
    const current = new Date();
    return acceptedAt.getUTCFullYear() === current.getUTCFullYear() && acceptedAt.getUTCMonth() === current.getUTCMonth();
  });

  return (
    <DashboardShell title="Offers" description="Review active offers, respond before they expire, and keep each negotiation tied to the listing conversation.">
      <div className="grid gap-5 sm:grid-cols-3">
        <DashboardStatCard icon={ArrowRightLeft} label="Open negotiations" value={openOffers.length.toString()} detail={`${openOffers.filter((offer) => offer.seller_id === userId).length} seller-side and ${openOffers.filter((offer) => offer.buyer_id === userId).length} buyer-side.`} />
        <DashboardStatCard icon={Clock} label="Expiring soon" value={expiringSoon.length.toString()} detail="Pending offers with expiration inside the next 24 hours." />
        <DashboardStatCard icon={CheckCircle2} label="Accepted this month" value={acceptedThisMonth.length.toString()} detail="Accepted offers ready for checkout or handoff." />
      </div>

      {setupError && (
        <Card className="border-destructive/40 bg-destructive/10">
          <CardHeader>
            <CardTitle>Offers need attention</CardTitle>
            <CardDescription>{setupError}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {!userId ? (
        <Card>
          <CardHeader>
            <CardTitle>Sign in to manage offers</CardTitle>
            <CardDescription>Only deal participants can view and act on their offers.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader><CardTitle>Negotiation inbox</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            {offers.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">No offers yet. Offers will appear here when a buyer starts one from an active listing conversation.</div>
            ) : offers.map((offer) => {
              const role = offer.buyer_id === userId ? "Buyer" : "Seller";
              const awaitingYou = offer.status === "pending" && offer.created_by_id !== userId;
              const latestHistory = offer.offer_status_history?.[0];
              return (
                <OfferCard
                  key={offer.id}
                  title={offer.listing?.title ?? "Marketplace listing"}
                  buyerName={role}
                  amount={offer.amount}
                  currency={offer.currency}
                  status={offer.status}
                  expiresAt={offer.expires_at ? new Date(offer.expires_at).toLocaleString() : undefined}
                  actions={
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {awaitingYou ? <Badge variant="warning">Awaiting you</Badge> : <Badge>{displayStatus(offer.status)}</Badge>}
                      {latestHistory && <Badge className="gap-1"><History className="h-3 w-3" />{latestHistory.from_status ?? "new"} → {displayStatus(latestHistory.to_status)}</Badge>}
                      {offer.conversation_id && <Button asChild size="sm"><Link href={`/dashboard/messages?conversation=${offer.conversation_id}`}>Review</Link></Button>}
                    </div>
                  }
                />
              );
            })}
          </CardContent>
        </Card>
      )}

      <DashboardActionCard icon={DollarSign} title="Offer protections" description="Only the right participant can accept, reject, withdraw, counter, or expire an offer. Each status change is recorded for support and review." />
    </DashboardShell>
  );
}
