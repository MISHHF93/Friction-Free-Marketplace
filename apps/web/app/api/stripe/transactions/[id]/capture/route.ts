export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/payments/auth";
import { recordTransactionEvent } from "@/lib/payments/audit";
import { centsToDollars } from "@/lib/payments/money";
import { enqueueTemplateNotification } from "@/lib/notifications/service";
import { buildCaptureJournal, postLedgerJournal } from "@/lib/financial/ledger";
import { claimEscrowPayment, claimTransactionStatus, escrowActionKey } from "@/lib/payments/escrow";
import { prepareEscrowAction } from "@/lib/payments/resume";
import { getStripe } from "@/lib/stripe/server";

const transactionIdSchema = z.string().uuid();

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const transactionId = transactionIdSchema.safeParse(id);
  if (!transactionId.success) return NextResponse.json({ error: "Invalid transaction id." }, { status: 400 });

  const supabase = createAdminClient() as any;
  const { data: transaction } = await supabase.from("transactions").select("*").eq("id", transactionId.data).single();
  if (!transaction || ![transaction.buyer_id, transaction.seller_id].includes(auth.user.id)) return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
  if (auth.user.id !== transaction.seller_id) return NextResponse.json({ error: "Only the seller can capture authorized funds for this transaction." }, { status: 403 });
  if (transaction.status !== "paid") return NextResponse.json({ error: "Transaction is not ready for capture." }, { status: 409 });

  const { data: payment } = await supabase.from("escrow_payments").select("*").eq("transaction_id", transactionId.data).single();
  if (!payment) return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  if (payment.status === "held" && payment.provider_charge_id) {
    return NextResponse.json({ status: "escrowed", alreadyCaptured: true, chargeId: payment.provider_charge_id });
  }
  if (!["authorized", "capturing"].includes(payment.status)) return NextResponse.json({ error: "Payment must be authorized before capture." }, { status: 409 });

  const prepared = await prepareEscrowAction(supabase, payment, "authorized", "capturing");
  const claimed = prepared.payment;
  if (!claimed || claimed.status !== "capturing") {
    if (claimed?.status === "held" && claimed.provider_charge_id) {
      return NextResponse.json({ status: "escrowed", alreadyCaptured: true, chargeId: claimed.provider_charge_id });
    }
    return NextResponse.json({ error: "This capture is already in progress." }, { status: 409 });
  }

  let captured;
  try {
    captured = await getStripe().paymentIntents.capture(
      payment.provider_payment_id,
      {},
      { idempotencyKey: escrowActionKey("capture", transactionId.data, String(claimed.id)) }
    );
  } catch (error) {
    await claimEscrowPayment(supabase, payment.id, "capturing", "authorized");
    const message = error instanceof Error ? error.message : "Stripe capture failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
  const charge = typeof captured.latest_charge === "string" ? captured.latest_charge : captured.latest_charge?.id ?? null;
  const previousStatus = transaction.status;

  const held = await supabase.from("escrow_payments").update({
    status: "held",
    provider_charge_id: charge,
    captured_at: new Date().toISOString(),
    held_at: new Date().toISOString(),
    metadata: { ...(payment.metadata ?? {}), stripe_status: captured.status }
  }).eq("id", payment.id).eq("status", "capturing").select("id");
  if (held.error) return NextResponse.json({ error: "Capture could not be recorded." }, { status: 409 });
  if (!held.data?.length) {
    const { data: current } = await supabase.from("escrow_payments").select("status,provider_charge_id").eq("id", payment.id).maybeSingle();
    if (current?.status === "held" && current.provider_charge_id && (!charge || current.provider_charge_id === charge)) {
      return NextResponse.json({ status: "escrowed", alreadyCaptured: true, chargeId: current.provider_charge_id });
    }
    return NextResponse.json({ error: "Capture could not be recorded." }, { status: 409 });
  }

  const escrowed = await claimTransactionStatus(supabase, transactionId.data, "paid", "escrowed", { paid_at: new Date().toISOString() });
  if (!escrowed) return NextResponse.json({ error: "Transaction was no longer paid." }, { status: 409 });
  await supabase.from("listings").update({ status: "reserved" }).eq("id", transaction.listing_id);
  await postLedgerJournal(supabase, buildCaptureJournal({
    transactionId: transactionId.data,
    totalAmount: Number(payment.amount),
    sellerNetAmount: Number(payment.seller_net_amount),
    platformFeeAmount: Number(payment.platform_fee_amount),
    currency: payment.currency,
    buyerId: transaction.buyer_id,
    sellerId: transaction.seller_id,
    providerPaymentId: payment.provider_payment_id,
    providerChargeId: charge,
  }));

  await recordTransactionEvent(supabase, {
    transaction_id: transactionId.data,
    actor_id: auth.user.id,
    type: "escrow_held",
    from_status: previousStatus,
    to_status: "escrowed",
    provider_object_id: payment.provider_payment_id,
    amount: Number(payment.amount),
    currency: payment.currency,
    message: "Authorized funds captured and held by the platform pending release."
  });

  await Promise.all([
    enqueueTemplateNotification({
      userId: transaction.buyer_id,
      template: "payment_captured",
      input: { amount: payment.amount, currency: payment.currency, actionUrl: "/dashboard/purchases" },
      payload: { transaction_id: transactionId.data, escrow_payment_id: payment.id },
      supabase
    }),
    enqueueTemplateNotification({
      userId: transaction.seller_id,
      template: "payment_captured",
      input: { amount: payment.amount, currency: payment.currency, actionUrl: "/dashboard/sales" },
      payload: { transaction_id: transactionId.data, escrow_payment_id: payment.id },
      supabase
    })
  ]);

  return NextResponse.json({ status: "escrowed", capturedAmount: centsToDollars(captured.amount_received) });
}
