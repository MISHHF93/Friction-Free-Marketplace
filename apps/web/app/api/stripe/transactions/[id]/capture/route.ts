export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/payments/auth";
import { recordTransactionEvent } from "@/lib/payments/audit";
import { centsToDollars } from "@/lib/payments/money";
import { getStripe } from "@/lib/stripe/server";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const supabase = createAdminClient() as any;
  const { data: transaction } = await supabase.from("transactions").select("*").eq("id", params.id).single();
  if (!transaction || ![transaction.buyer_id, transaction.seller_id].includes(auth.user.id)) return NextResponse.json({ error: "Transaction not found." }, { status: 404 });

  const { data: payment } = await supabase.from("escrow_payments").select("*").eq("transaction_id", params.id).single();
  if (!payment) return NextResponse.json({ error: "Payment not found." }, { status: 404 });

  const captured = await getStripe().paymentIntents.capture(payment.provider_payment_id);
  const charge = typeof captured.latest_charge === "string" ? captured.latest_charge : captured.latest_charge?.id ?? null;
  const previousStatus = transaction.status;

  await supabase.from("escrow_payments").update({
    status: "held",
    provider_charge_id: charge,
    captured_at: new Date().toISOString(),
    held_at: new Date().toISOString(),
    metadata: { ...(payment.metadata ?? {}), stripe_status: captured.status }
  }).eq("id", payment.id);

  await supabase.from("transactions").update({ status: "escrowed", paid_at: new Date().toISOString() }).eq("id", params.id);
  await supabase.from("listings").update({ status: "reserved" }).eq("id", transaction.listing_id);

  await recordTransactionEvent(supabase, {
    transaction_id: params.id,
    actor_id: auth.user.id,
    type: "escrow_held",
    from_status: previousStatus,
    to_status: "escrowed",
    provider_object_id: payment.provider_payment_id,
    amount: Number(payment.amount),
    currency: payment.currency,
    message: "Authorized funds captured and held by the platform pending release."
  });

  return NextResponse.json({ status: "escrowed", capturedAmount: centsToDollars(captured.amount_received) });
}
