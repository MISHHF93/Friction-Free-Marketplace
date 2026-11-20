import Link from "next/link";
import { redirect } from "next/navigation";
import { LifeBuoy, PackageCheck, RotateCcw, ShoppingBag } from "lucide-react";
import { DashboardActionCard, DashboardListItem, DashboardShell, DashboardStatCard } from "@/components/dashboard-shell";
import { EscrowActions } from "@/components/payments/escrow-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderFollowUpForms } from "@/components/orders/order-actions";
import { getMarketplaceSession } from "@/lib/auth/session";
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
};

function money(amount: number, currency: string) {
  return formatMoney(Number(amount), currency);
}

function purchaseMilestone(transaction: TransactionRow) {
  if (transaction.status === "pending_payment") return "Payment authorization is still pending.";
  if (transaction.status === "paid") return "Payment is authorized. Waiting for seller capture or fulfillment.";
  if (transaction.status === "escrowed") return "Funds are held while seller fulfills the item.";
  if (transaction.status === "completed") return `Completed ${formatDate(transaction.completed_at ?? transaction.updated_at)}.`;
  if (transaction.status === "disputed") return "Dispute is open. Keep all evidence in the marketplace.";
  if (transaction.status === "refunded") return "Refund has been recorded on this purchase.";
  return `Last updated ${formatDate(transaction.updated_at)}.`;
}

async function getBuyerPurchases(userId: string) {
  const supabase = await createClient();
  const { data } = await (supabase as any)
    .from("transactions")
    .select("id,listing_id,status,total_amount,currency,created_at,updated_at,paid_at,delivered_at,completed_at")
    .eq("buyer_id", userId)
    .order("updated_at", { ascending: false })
    .limit(12);
  const transactions = (data ?? []) as TransactionRow[];
  const listingIds = [...new Set(transactions.map((transaction) => transaction.listing_id))];
  const { data: listings } = listingIds.length
    ? await (supabase as any).from("listings").select("id,title").in("id", listingIds)
    : { data: [] };
  const titleById = new Map(((listings ?? []) as Array<{ id: string; title: string }>).map((listing) => [listing.id, listing.title]));
  return transactions.map((transaction) => ({ ...transaction, title: titleById.get(transaction.listing_id) ?? "Marketplace purchase" }));
}

export default async function PurchasesPage() {
  const session = await getMarketplaceSession();
  if (!session) redirect("/login?next=/dashboard/purchases");
  const purchases = session.source === "supabase" ? await getBuyerPurchases(session.id) : session.source === "e2e" ? [
    { id: "44444444-4444-4444-8444-444444444444", listing_id: "verified-road-bike", status: "completed", total_amount: 20, currency: "USD", created_at: new Date().toISOString(), updated_at: new Date().toISOString(), paid_at: new Date().toISOString(), delivered_at: null, completed_at: new Date().toISOString(), title: "Preview completed order" },
    { id: "55555555-5555-4555-8555-555555555555", listing_id: "verified-road-bike", status: "escrowed", total_amount: 40, currency: "USD", created_at: new Date().toISOString(), updated_at: new Date().toISOString(), paid_at: new Date().toISOString(), delivered_at: null, completed_at: null, title: "Preview escrow order" }
  ] : [];
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
                {["paid", "escrowed", "shipped", "delivered", "completed"].map((step) => (
                  <li key={step} className={purchase.status === step ? "font-bold text-[#0c3f66]" : "text-muted-foreground"} aria-current={purchase.status === step ? "step" : undefined}>{step}</li>
                ))}
              </ol>
              <Button asChild size="sm" variant="outline"><Link href={`/listings/${purchase.listing_id}`}>View listing</Link></Button>
              <EscrowActions transactionId={purchase.id} role="buyer" status={purchase.status} amount={Number(purchase.total_amount)} currency={purchase.currency} />
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
