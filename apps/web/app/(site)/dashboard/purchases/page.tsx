import Link from "next/link";
import { redirect } from "next/navigation";
import { LifeBuoy, PackageCheck, RotateCcw, ShoppingBag } from "lucide-react";
import { DashboardActionCard, DashboardListItem, DashboardShell, DashboardStatCard } from "@/components/dashboard-shell";
import { EscrowActions } from "@/components/payments/escrow-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderFollowUpForms } from "@/components/orders/order-actions";
import { getMarketplaceSession } from "@/lib/auth/session";
import { loadE2EPurchases } from "@/lib/dev/e2e-fixtures";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatMoney } from "@/lib/i18n/format";

type TransactionRow = {
  id: string;
  listing_id: string;
  status: string;
  total_amount: number;
  currency: string;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
  delivered_at: string | null;
  completed_at: string | null;
  metadata?: unknown;
};

function money(amount: number, currency: string) {
  return formatMoney(Number(amount), currency);
}

function purchaseMilestone(transaction: TransactionRow) {
  if (transaction.status === "pending_payment") return "Payment is still being confirmed.";
  if (transaction.status === "paid") return "You paid. The seller can now accept the order.";
  if (transaction.status === "escrowed") return "Your payment is held until you confirm you got the item.";
  if (transaction.status === "shipped") return "The seller marked this as shipped or handed over. Confirm when you have the item.";
  if (transaction.status === "delivered") return "The item was marked received. Release payment if everything looks right.";
  if (transaction.status === "completed") return "This order is done. Payment has been released.";
  if (transaction.status === "cancelled") return "This order was cancelled.";
  if (transaction.status === "disputed") return "A problem was reported. Keep all evidence in the marketplace.";
  if (transaction.status === "refunded") return "This payment was refunded.";
  return `Last updated ${formatDate(transaction.updated_at)}.`;
}

const purchaseSteps = [
  { label: "Paid", statuses: ["pending_payment", "paid", "escrowed"] },
  { label: "Shipped", statuses: ["shipped"] },
  { label: "Received", statuses: ["delivered"] },
  { label: "Done", statuses: ["completed"] }
];

async function getBuyerPurchases(userId: string) {
  const supabase = await createClient();
  const { data } = await (supabase as any)
    .from("transactions")
    .select("id,listing_id,status,total_amount,currency,created_at,updated_at,paid_at,delivered_at,completed_at,metadata")
    .eq("buyer_id", userId)
    .order("updated_at", { ascending: false })
    .limit(12);
  const transactions = (data ?? []) as TransactionRow[];
  const listingIds = [...new Set(transactions.map((transaction) => transaction.listing_id))];
  const { data: listings } = listingIds.length
    ? await (supabase as any).from("listings").select("id,title,pickup_available").in("id", listingIds)
    : { data: [] };
  const { data: disputes } = listingIds.length
    ? await (supabase as any).from("disputes").select("id,transaction_id,status").in("transaction_id", transactions.map((transaction) => transaction.id)).in("status", ["opened", "awaiting_buyer", "awaiting_seller", "under_review"])
    : { data: [] };
  const titleById = new Map(((listings ?? []) as Array<{ id: string; title: string; pickup_available?: boolean }>).map((listing) => [listing.id, listing.title]));
  const pickupById = new Map(((listings ?? []) as Array<{ id: string; pickup_available?: boolean }>).map((listing) => [listing.id, Boolean(listing.pickup_available)]));
  const disputeByTransaction = new Map(((disputes ?? []) as Array<{ id: string; transaction_id: string }>).map((dispute) => [dispute.transaction_id, dispute.id]));
  return transactions.map((transaction) => {
    const fulfillmentMethod = transaction.metadata && typeof transaction.metadata === "object" && (transaction.metadata as { fulfillment_method?: string }).fulfillment_method === "pickup" ? "pickup" as const : null;
    return { ...transaction, title: titleById.get(transaction.listing_id) ?? "Marketplace purchase", pickupAvailable: pickupById.get(transaction.listing_id) ?? false, fulfillmentMethod, disputeId: disputeByTransaction.get(transaction.id) ?? null };
  });
}

export default async function PurchasesPage() {
  const session = await getMarketplaceSession();
  if (!session) redirect("/login?next=/dashboard/purchases");
  const purchases = session.source === "supabase" ? await getBuyerPurchases(session.id) : session.source === "e2e" ? await loadE2EPurchases(session.id) : [];
  const active = purchases.filter((purchase) => !["completed", "cancelled", "refunded"].includes(purchase.status));
  const completed = purchases.filter((purchase) => purchase.status === "completed");
  const support = purchases.filter((purchase) => ["disputed", "refunded"].includes(purchase.status));

  return (
    <DashboardShell title="Purchases" description="Track checkout, escrow, shipping, pickup, inspection windows, returns, and support cases for buyer orders.">
      <div className="grid gap-5 sm:grid-cols-3">
        <DashboardStatCard icon={ShoppingBag} label="Active purchases" value={String(active.length)} detail="Paid, escrowed, or awaiting fulfillment." />
        <DashboardStatCard icon={PackageCheck} label="Completed" value={String(completed.length)} detail="Completed orders with protected payment history." />
        <DashboardStatCard icon={RotateCcw} label="Support cases" value={String(support.length)} detail="Disputed or refunded purchases." />
      </div>
      <Card>
        <CardHeader><CardTitle>Order timeline</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          {purchases.length ? purchases.map((purchase) => (
            <DashboardListItem key={purchase.id} title={purchase.title} detail={`${money(purchase.total_amount, purchase.currency)} · ${purchaseMilestone(purchase)}`} status={purchase.status}>
              <ol className="grid gap-1 text-xs" aria-label="Order status">
                {purchaseSteps.map((step) => {
                  const current = step.statuses.includes(purchase.status);
                  return (
                    <li key={step.label} className={current ? "font-bold text-[#0c3f66]" : "text-muted-foreground"} aria-current={current ? "step" : undefined}>{step.label}</li>
                  );
                })}
              </ol>
              <Button asChild size="sm" variant="outline"><Link href={`/listings/${purchase.listing_id}`}>View listing</Link></Button>
              <EscrowActions transactionId={purchase.id} role="buyer" status={purchase.status} amount={Number(purchase.total_amount)} currency={purchase.currency} pickupAvailable={"pickupAvailable" in purchase ? Boolean(purchase.pickupAvailable) : false} fulfillmentMethod={"fulfillmentMethod" in purchase ? purchase.fulfillmentMethod : null} disputeId={"disputeId" in purchase ? purchase.disputeId : null} />
            </DashboardListItem>
          )) : (
            <div className="rounded-2xl border border-dashed border-border bg-secondary/50 p-5 text-sm text-muted-foreground">
              No purchases yet. Start from a listing and use protected checkout to create a tracked order here.
            </div>
          )}
        </CardContent>
      </Card>
      <OrderFollowUpForms orders={purchases.map((purchase) => ({ id: purchase.id, title: purchase.title, status: purchase.status, amount: Number(purchase.total_amount), currency: purchase.currency }))} />
      <DashboardActionCard icon={LifeBuoy} title="Buyer protection" description="Open support cases, request returns, report unsafe meetup behavior, and keep every protected payment event in one ledger.">
        <Button asChild variant="outline"><Link href="/contact">Contact support</Link></Button>
      </DashboardActionCard>
    </DashboardShell>
  );
}
