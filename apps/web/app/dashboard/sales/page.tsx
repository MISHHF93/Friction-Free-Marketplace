import Link from "next/link";
import { Banknote, Box, Send, Store } from "lucide-react";
import { DashboardActionCard, DashboardListItem, DashboardShell, DashboardStatCard } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/i18n/format";

type SaleTransaction = {
  id: string;
  listing_id: string;
  status: string;
  total_amount: number;
  marketplace_fee_amount: number;
  currency: string;
  updated_at: string;
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

function sellerNextStep(status: string) {
  if (status === "pending_payment") return "Waiting on buyer payment authorization.";
  if (status === "paid") return "Capture or fulfillment action is next.";
  if (status === "escrowed") return "Fulfill the item and keep proof in messages.";
  if (status === "completed") return "Completed and ready for payout reconciliation.";
  if (status === "disputed") return "Dispute open. Respond with evidence.";
  return "Review transaction details and buyer messages.";
}

async function getSellerSales(userId: string) {
  const supabase = createClient();
  const { data } = await (supabase as any)
    .from("transactions")
    .select("id,listing_id,status,total_amount,marketplace_fee_amount,currency,updated_at")
    .eq("seller_id", userId)
    .order("updated_at", { ascending: false })
    .limit(12);
  const transactions = (data ?? []) as SaleTransaction[];
  const transactionIds = transactions.map((transaction) => transaction.id);
  const listingIds = [...new Set(transactions.map((transaction) => transaction.listing_id))];
  const [{ data: listings }, { data: payouts }] = await Promise.all([
    listingIds.length ? (supabase as any).from("listings").select("id,title").in("id", listingIds) : Promise.resolve({ data: [] }),
    transactionIds.length ? (supabase as any).from("payouts").select("transaction_id,status,amount,currency").in("transaction_id", transactionIds) : Promise.resolve({ data: [] })
  ]);
  const titleById = new Map(((listings ?? []) as Array<{ id: string; title: string }>).map((listing) => [listing.id, listing.title]));
  const payoutByTransaction = new Map(((payouts ?? []) as PayoutRow[]).map((payout) => [payout.transaction_id, payout]));
  return transactions.map((transaction) => ({ ...transaction, title: titleById.get(transaction.listing_id) ?? "Marketplace sale", payout: payoutByTransaction.get(transaction.id) }));
}

export default async function SalesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const sales = user ? await getSellerSales(user.id) : [];
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
            <DashboardListItem key={sale.id} title={sale.title} detail={`${money(sale.total_amount, sale.currency)} · ${sellerNextStep(sale.status)}`} status={sale.status}>
              <Button asChild size="sm"><Link href="/dashboard/messages">Manage</Link></Button>
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
