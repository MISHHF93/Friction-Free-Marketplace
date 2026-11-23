import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/payments/auth";
import { claimTransactionStatus } from "@/lib/payments/escrow";
import { recordTransactionEvent } from "@/lib/payments/audit";
import { notifyTransactionParties } from "@/lib/notifications/transaction-events";
import { listingAllowsPickup } from "@/lib/payments/pickup";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const supabase = createAdminClient() as any;
  const { data: transaction } = await supabase.from("transactions").select("id,seller_id,buyer_id,status,listing_id,metadata").eq("id", id).maybeSingle();
  if (!transaction || transaction.seller_id !== auth.user.id) return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
  if (transaction.status !== "escrowed") return NextResponse.json({ error: "Only held orders can be marked handed over." }, { status: 409 });
  const { data: listing } = transaction.listing_id
    ? await supabase.from("listings").select("pickup_available,fulfillment_modes").eq("id", transaction.listing_id).maybeSingle()
    : { data: null };
  if (!listingAllowsPickup(listing)) {
    return NextResponse.json({ error: "This listing is not offered for local pickup." }, { status: 409 });
  }
  const { data: payment } = await supabase.from("escrow_payments").select("status").eq("transaction_id", id).maybeSingle();
  if (payment?.status !== "held") return NextResponse.json({ error: "Pickup handoff starts after the payment is held." }, { status: 409 });

  const handedOverAt = new Date().toISOString();
  const metadata = { ...(transaction.metadata && typeof transaction.metadata === "object" ? transaction.metadata : {}), fulfillment_method: "pickup", seller_handoff_at: handedOverAt };
  const shipped = await claimTransactionStatus(supabase, id, "escrowed", "shipped", {
    shipped_at: handedOverAt,
    metadata
  });
  if (!shipped) return NextResponse.json({ error: "This order was already updated." }, { status: 409 });
  await recordTransactionEvent(supabase, {
    transaction_id: id,
    actor_id: auth.user.id,
    type: "handed_over",
    from_status: "escrowed",
    to_status: "shipped",
    message: "The seller marked the item handed over for local pickup."
  });
  await notifyTransactionParties(supabase, { transactionId: id, template: "order_handed_over", to: ["buyer"] });
  return NextResponse.json({ status: "shipped", fulfillmentMethod: "pickup" });
}
