import Link from "next/link";
import { redirect } from "next/navigation";
import { Banknote, Box, Send, Store } from "lucide-react";
import { DashboardActionCard, DashboardListItem, DashboardShell, DashboardStatCard } from "@/components/dashboard-shell";
import { EscrowActions } from "@/components/payments/escrow-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMarketplaceSession } from "@/lib/auth/session";
import { loadE2ESales } from "@/lib/dev/e2e-fixtures";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/i18n/format";
import { acceptByDeadline, formatAcceptBy } from "@/lib/payments/uncaptured-order";

type SaleTransaction = {
  id: string;
  listing_id: string;
  status: string;
  total_amount: number;
  marketplace_fee_amount: number;
  currency: string;
  updated_at: string;
  paid_at: string | null;
  metadata?: unknown;
};

type PayoutRow = {
  transaction_id: string;
  status: string;
  amount: number;
  currency: string;
};

function money(amount: number, currency: string) {
  return formatMoney(Number(amount), currency);
}

function sellerNextStep(status: string, acceptBy?: string | null) {
  if (status === "pending_payment") return "Waiting on buyer payment authorization.";
  if (status === "paid") return acceptBy ? `Accept by ${acceptBy}.` : "Accept this order to capture payment.";
  if (status === "escrowed") return "Fulfill the item and keep proof in messages.";
  if (status === "completed") return "Completed and ready for payout reconciliation.";
  if (status === "disputed") return "Dispute open. Respond with evidence.";
  return "Review transaction details and buyer messages.";
}

async function getSellerSales(userId: string) {
  const supabase = await createClient();
  const { data } = await (supabase as any)
    .from("transactions")
    .select("id,listing_id,status,total_amount,marketplace_fee_amount,currency,updated_at,paid_at,metadata")
    .eq("seller_id", userId)
    .order("updated_at", { ascending: false })
    .limit(12);
  const transactions = (data ?? []) as SaleTransaction[];
  const transactionIds = transactions.map((transaction) => transaction.id);
  const listingIds = [...new Set(transactions.map((transaction) => transaction.listing_id))];
  const [{ data: listings }, { data: payouts }, { data: conversations }, { data: payments }, { data: disputes }] = await Promise.all([
    listingIds.length ? (supabase as any).from("listings").select("id,title,pickup_available,ships_to").in("id", listingIds) : Promise.resolve({ data: [] }),
    transactionIds.length ? (supabase as any).from("payouts").select("transaction_id,status,amount,currency").in("transaction_id", transactionIds) : Promise.resolve({ data: [] }),
    listingIds.length ? (supabase as any).from("conversations").select("id,listing_id").eq("seller_id", userId).in("listing_id", listingIds) : Promise.resolve({ data: [] }),
    transactionIds.length ? (supabase as any).from("escrow_payments").select("transaction_id,capture_before").in("transaction_id", transactionIds) : Promise.resolve({ data: [] }),
    transactionIds.length ? (supabase as any).from("disputes").select("id,transaction_id,status").in("transaction_id", transactionIds).in("status", ["opened", "awaiting_buyer", "awaiting_seller", "under_review"]) : Promise.resolve({ data: [] })
  ]);
  const titleById = new Map(((listings ?? []) as Array<{ id: string; title: string; pickup_available?: boolean; ships_to?: unknown }>).map((listing) => [listing.id, listing.title]));
  const listingById = new Map(((listings ?? []) as Array<{ id: string; pickup_available?: boolean; ships_to?: unknown }>).map((listing) => [listing.id, listing]));
  const disputeByTransaction = new Map(((disputes ?? []) as Array<{ id: string; transaction_id: string }>).map((dispute) => [dispute.transaction_id, dispute.id]));
  const payoutByTransaction = new Map(((payouts ?? []) as PayoutRow[]).map((payout) => [payout.transaction_id, payout]));
  const conversationByListing = new Map(((conversations ?? []) as Array<{ id: string; listing_id: string }>).map((conversation) => [conversation.listing_id, conversation.id]));
  const captureByTransaction = new Map(((payments ?? []) as Array<{ transaction_id: string; capture_before: string | null }>).map((payment) => [payment.transaction_id, payment.capture_before]));
  return transactions.map((transaction) => {
    const captureBefore = captureByTransaction.get(transaction.id) ?? null;
    const acceptBy = transaction.status === "paid" && transaction.paid_at
      ? formatAcceptBy(acceptByDeadline(transaction.paid_at, captureBefore))
      : null;
    const listing = listingById.get(transaction.listing_id);
    const fulfillmentMethod = transaction.metadata && typeof transaction.metadata === "object" && (transaction.metadata as { fulfillment_method?: string }).fulfillment_method === "pickup" ? "pickup" as const : null;
    return { ...transaction, title: titleById.get(transaction.listing_id) ?? "Marketplace sale", payout: payoutByTransaction.get(transaction.id), conversationId: conversationByListing.get(transaction.listing_id), acceptBy, pickupAvailable: Boolean(listing?.pickup_available), shipsAvailable: Array.isArray(listing?.ships_to) ? listing!.ships_to.length > 0 || !listing?.pickup_available : !listing?.pickup_available, fulfillmentMethod, disputeId: disputeByTransaction.get(transaction.id) ?? null };
  });
}

export default async function SalesPage() {
  const session = await getMarketplaceSession();
  if (!session) redirect("/login?next=/dashboard/sales");
  const sales = session.source === "supabase" ? await getSellerSales(session.id) : session.source === "e2e" ? await loadE2ESales(session.id) : [];
  const active = sales.filter((sale) => !["completed", "cancelled", "refunded"].includes(sale.status));
  const pendingPayout = sales.reduce((sum, sale) => sale.payout?.status === "pending" ? sum + Number(sale.payout.amount) : sum, 0);
  const completed = sales.filter((sale) => sale.status === "completed").length;
  const fulfillmentRate = sales.length ? Math.round((completed / sales.length) * 100) : 0;

  return (
    <DashboardShell title="Sales" description="Fulfill sold items, monitor escrow releases, view payout readiness, and protect seller performance.">
      <div className="grid gap-5 sm:grid-cols-3">
        <DashboardStatCard icon={Store} label="Active sales" value={String(active.length)} detail="Sales needing payment, fulfillment, or dispute action." />
        <DashboardStatCard icon={Banknote} label="Pending payout" value={money(pendingPayout, "USD")} detail="Pending payout records tied to seller transactions." />
        <DashboardStatCard icon={Box} label="Fulfillment rate" value={`${fulfillmentRate}%`} detail="Completed sales as a share of tracked seller transactions." />
      </div>
      <Card>
        <CardHeader><CardTitle>Seller fulfillment queue</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          {sales.length ? sales.map((sale) => (
            <DashboardListItem key={sale.id} title={sale.title} detail={`${money(sale.total_amount, sale.currency)} · ${sellerNextStep(sale.status, "acceptBy" in sale ? sale.acceptBy : null)}`} status={sale.status}>
              <Button asChild size="sm"><Link href={"conversationId" in sale && sale.conversationId ? `/dashboard/messages?conversation=${sale.conversationId}` : "/dashboard/messages"}>Manage</Link></Button>
              <EscrowActions transactionId={sale.id} role="seller" status={sale.status} amount={Number(sale.total_amount)} currency={sale.currency} pickupAvailable={"pickupAvailable" in sale ? Boolean(sale.pickupAvailable) : false} shipsAvailable={"shipsAvailable" in sale ? Boolean(sale.shipsAvailable) : true} fulfillmentMethod={"fulfillmentMethod" in sale ? sale.fulfillmentMethod : null} disputeId={"disputeId" in sale ? sale.disputeId : null} />
            </DashboardListItem>
          )) : (
            <div className="rounded-2xl border border-dashed border-border bg-secondary/50 p-5 text-sm text-muted-foreground">
              No sales yet. Published listings and accepted checkout transactions will appear here when buyers pay.
            </div>
          )}
        </CardContent>
      </Card>
      <DashboardActionCard icon={Send} title="Payout readiness" description="Connect payout details, resolve verification holds, upload tracking, and keep buyer communication in-app to reduce dispute risk.">
        <Button asChild variant="outline"><Link href="/dashboard/payments">Review payout setup</Link></Button>
      </DashboardActionCard>
    </DashboardShell>
  );
}
