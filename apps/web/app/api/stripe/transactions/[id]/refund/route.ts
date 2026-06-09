export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/payments/auth";
import { recordTransactionEvent } from "@/lib/payments/audit";
import { centsToDollars, dollarsToCents } from "@/lib/payments/money";
import { enqueueTemplateNotification } from "@/lib/notifications/service";
import { buildRefundJournal, postLedgerJournal } from "@/lib/financial/ledger";
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
  if (!["paid", "escrowed", "disputed"].includes(transaction.status)) return NextResponse.json({ error: "Transaction is not refundable in its current state." }, { status: 409 });

  const { data: payment } = await supabase.from("escrow_payments").select("*").eq("transaction_id", transactionId.data).single();
  if (!payment) return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  if (!["authorized", "held"].includes(payment.status)) return NextResponse.json({ error: "Payment is not refundable in its current state." }, { status: 409 });

  const refundedAmount = Number(payment.refunded_amount ?? 0);
  const remainingCents = dollarsToCents(Number(payment.amount) - refundedAmount);
  const amount = payload.data.amountCents ?? remainingCents;
  if (amount > remainingCents) return NextResponse.json({ error: "Refund amount exceeds the remaining refundable balance." }, { status: 400 });
  const refund = await getStripe().refunds.create(
    { payment_intent: payment.provider_payment_id, amount, reason: payload.data.reason, metadata: { transaction_id: transactionId.data } },
    { idempotencyKey: request.headers.get("idempotency-key") ?? `refund:${transactionId.data}:${payment.id}:${amount}:${payload.data.reason}` }
  );
  const refundedTotal = refundedAmount + centsToDollars(amount);
  const fullyRefunded = refundedTotal >= Number(payment.amount);

  await supabase.from("escrow_payments").update({ status: fullyRefunded ? "refunded" : payment.status, refunded_amount: refundedTotal, refunded_at: fullyRefunded ? new Date().toISOString() : payment.refunded_at }).eq("id", payment.id);
  if (fullyRefunded) await supabase.from("transactions").update({ status: "refunded" }).eq("id", transactionId.data);
  if (fullyRefunded && transaction.listing_id) await supabase.from("listings").update({ status: "active" }).eq("id", transaction.listing_id).eq("status", "reserved");
  await supabase.from("transaction_receipts").update({ refunded_at: new Date().toISOString(), metadata: { refund_id: refund.id, refund_reason: payload.data.reason } }).eq("transaction_id", transactionId.data);
  if (payment.status === "held") {
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
