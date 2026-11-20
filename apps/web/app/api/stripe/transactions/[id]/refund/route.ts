export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/payments/auth";
import { recordTransactionEvent } from "@/lib/payments/audit";
import { centsToDollars, dollarsToCents } from "@/lib/payments/money";
import { enqueueTemplateNotification } from "@/lib/notifications/service";
import { buildRefundJournal, postLedgerJournal } from "@/lib/financial/ledger";
import { claimEscrowPayment, claimTransactionStatus, escrowActionKey } from "@/lib/payments/escrow";
import { prepareEscrowAction, refundPlan } from "@/lib/payments/resume";
import { nextRefundedAmount } from "@/lib/payments/refund-amount";
import { getStripe } from "@/lib/stripe/server";

const refundSchema = z.object({ amountCents: z.number().int().positive().optional(), reason: z.enum(["duplicate", "fraudulent", "requested_by_customer"]).default("requested_by_customer") });
const transactionIdSchema = z.string().uuid();

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const transactionId = transactionIdSchema.safeParse(id);
  if (!transactionId.success) return NextResponse.json({ error: "Invalid transaction id." }, { status: 400 });
  const payload = refundSchema.safeParse(await request.json().catch(() => ({})));
  if (!payload.success) return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });

  const supabase = createAdminClient() as any;
  const { data: transaction } = await supabase.from("transactions").select("*").eq("id", transactionId.data).single();
  if (!transaction || ![transaction.buyer_id, transaction.seller_id].includes(auth.user.id)) return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
  if (auth.user.id !== transaction.seller_id) return NextResponse.json({ error: "Only the seller can refund this transaction." }, { status: 403 });
  if (!["paid", "escrowed", "shipped", "delivered", "disputed"].includes(transaction.status)) return NextResponse.json({ error: "Transaction is not refundable in its current state." }, { status: 409 });

  const { data: payment } = await supabase.from("escrow_payments").select("*").eq("transaction_id", transactionId.data).single();
  if (!payment) return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  const resumingHeldRefund = payment.status === "refunding" && Boolean(payment.captured_at || payment.held_at);
  const resumingAuthorizationCancel = payment.status === "refunding" && !payment.captured_at && !payment.held_at;
  if (!["authorized", "held", "refunding"].includes(payment.status)) return NextResponse.json({ error: "Payment is not refundable in its current state." }, { status: 409 });

  if (payment.status === "authorized" || resumingAuthorizationCancel) {
    const prepared = payment.status === "refunding" ? { payment } : await prepareEscrowAction(supabase, payment, "authorized", "refunding");
    if (!prepared.payment || prepared.payment.status !== "refunding") return NextResponse.json({ error: "This refund is already in progress." }, { status: 409 });
    try {
      await getStripe().paymentIntents.cancel(payment.provider_payment_id, {}, {
        idempotencyKey: escrowActionKey("cancel", transactionId.data, payment.id)
      });
    } catch (error) {
      await claimEscrowPayment(supabase, payment.id, "refunding", "authorized");
      const message = error instanceof Error ? error.message : "Stripe cancel failed.";
      return NextResponse.json({ error: message }, { status: 502 });
    }
    const cancelledPayment = await supabase.from("escrow_payments").update({ status: "cancelled" }).eq("id", payment.id).eq("status", "refunding").select("id");
    if (cancelledPayment.error || !cancelledPayment.data?.length) return NextResponse.json({ error: "Cancellation could not be recorded." }, { status: 409 });
    const cancelled = await claimTransactionStatus(supabase, transactionId.data, transaction.status, "cancelled", { cancelled_at: new Date().toISOString() });
    if (!cancelled) return NextResponse.json({ error: "Transaction could not be cancelled." }, { status: 409 });
    if (transaction.listing_id) await supabase.from("listings").update({ status: "active" }).eq("id", transaction.listing_id).eq("status", "reserved");
    await recordTransactionEvent(supabase, {
      transaction_id: transactionId.data,
      actor_id: auth.user.id,
      type: "cancelled",
      from_status: transaction.status,
      to_status: "cancelled",
      provider_object_id: payment.provider_payment_id,
      message: "Uncaptured authorization was cancelled instead of refunded."
    });
    return NextResponse.json({ status: "cancelled", captureReleased: true });
  }

  const refundedAmount = Number(payment.refunded_amount ?? 0);
  const remainingCents = dollarsToCents(Number(payment.amount) - refundedAmount);
  const requestedCents = payload.data.amountCents ?? remainingCents;
  const preparedRefund = await prepareEscrowAction(supabase, payment, "held", "refunding");
  if (!preparedRefund.payment || preparedRefund.payment.status !== "refunding") return NextResponse.json({ error: "This refund is already in progress." }, { status: 409 });
  const activePayment = preparedRefund.payment;
  const plan = refundPlan(activePayment, {
    amountCents: requestedCents,
    reason: payload.data.reason,
    idempotencyKey: escrowActionKey("refund", transactionId.data, payment.id, `${requestedCents}:${payload.data.reason}`)
  });
  if (plan.amountCents > remainingCents) return NextResponse.json({ error: "Refund amount exceeds the remaining refundable balance." }, { status: 400 });
  if (!plan.resumed) {
    await supabase.from("escrow_payments").update({
      metadata: {
        ...(activePayment.metadata ?? {}),
        claim_token: crypto.randomUUID(),
        refund_in_flight: { amountCents: plan.amountCents, reason: plan.reason, idempotencyKey: plan.idempotencyKey }
      }
    }).eq("id", payment.id).eq("status", "refunding");
  }
  const amount = plan.amountCents;
  let refund;
  try {
    refund = await getStripe().refunds.create(
      { payment_intent: payment.provider_payment_id, amount, reason: plan.reason as "duplicate" | "fraudulent" | "requested_by_customer", metadata: { transaction_id: transactionId.data } },
      { idempotencyKey: plan.idempotencyKey }
    );
  } catch (error) {
    await claimEscrowPayment(supabase, payment.id, "refunding", "held");
    const message = error instanceof Error ? error.message : "Stripe refund failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
  const knownRefunds = Array.isArray(payment.metadata?.refund_ids) ? payment.metadata.refund_ids.filter((id: unknown) => typeof id === "string") : [];
  const recorded = nextRefundedAmount(refundedAmount, refund.id, knownRefunds, centsToDollars(amount));
  const refundedTotal = recorded.amount;
  const fullyRefunded = refundedTotal >= Number(payment.amount);

  const recordedRefund = await supabase.from("escrow_payments").update({
    status: fullyRefunded ? "refunded" : "held",
    refunded_amount: refundedTotal,
    refunded_at: fullyRefunded ? new Date().toISOString() : payment.refunded_at,
    metadata: { ...(payment.metadata ?? {}), refund_ids: recorded.ids }
  }).eq("id", payment.id).eq("status", "refunding").select("id");
  if (recordedRefund.error || !recordedRefund.data?.length) return NextResponse.json({ error: "Refund could not be recorded." }, { status: 409 });
  if (fullyRefunded) {
    const refunded = await claimTransactionStatus(supabase, transactionId.data, transaction.status, "refunded");
    if (!refunded) return NextResponse.json({ error: "Transaction could not be marked refunded." }, { status: 409 });
  }
  if (fullyRefunded && transaction.listing_id) await supabase.from("listings").update({ status: "active" }).eq("id", transaction.listing_id).eq("status", "reserved");
  await supabase.from("transaction_receipts").update({ refunded_at: new Date().toISOString(), metadata: { refund_id: refund.id, refund_reason: payload.data.reason } }).eq("transaction_id", transactionId.data);
  if (!recorded.duplicate && (payment.status === "held" || resumingHeldRefund)) {
    await postLedgerJournal(supabase, buildRefundJournal({
      transactionId: transactionId.data,
      totalAmount: Number(payment.amount),
      sellerNetAmount: Number(payment.seller_net_amount),
      platformFeeAmount: Number(payment.platform_fee_amount),
      refundAmount: centsToDollars(amount),
      currency: payment.currency,
      buyerId: transaction.buyer_id,
      sellerId: transaction.seller_id,
      providerPaymentId: payment.provider_payment_id,
      providerChargeId: payment.provider_charge_id,
      providerRefundId: refund.id,
    }));
  }

  await recordTransactionEvent(supabase, {
    transaction_id: transactionId.data,
    actor_id: auth.user.id,
    type: "refund_succeeded",
    from_status: transaction.status,
    to_status: fullyRefunded ? "refunded" : transaction.status,
    provider_object_id: refund.id,
    amount: centsToDollars(amount),
    currency: payment.currency,
    message: fullyRefunded ? "Payment fully refunded." : "Payment partially refunded."
  });

  await Promise.all([
    enqueueTemplateNotification({
      userId: transaction.buyer_id,
      template: "payment_refunded",
      input: { amount: centsToDollars(amount), currency: payment.currency, actionUrl: "/dashboard/purchases" },
      payload: { transaction_id: transactionId.data, escrow_payment_id: payment.id, refund_id: refund.id },
      supabase
    }),
    enqueueTemplateNotification({
      userId: transaction.seller_id,
      template: "payment_refunded",
      input: { amount: centsToDollars(amount), currency: payment.currency, actionUrl: "/dashboard/sales" },
      payload: { transaction_id: transactionId.data, escrow_payment_id: payment.id, refund_id: refund.id },
      supabase
    })
  ]);

  return NextResponse.json({ status: fullyRefunded ? "refunded" : "partially_refunded", refundId: refund.id, amount });
}
