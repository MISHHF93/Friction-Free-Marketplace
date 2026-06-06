export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/payments/auth";
import { recordTransactionEvent } from "@/lib/payments/audit";
import { centsToDollars, dollarsToCents } from "@/lib/payments/money";
import { getStripe } from "@/lib/stripe/server";

const refundSchema = z.object({ amountCents: z.number().int().positive().optional(), reason: z.enum(["duplicate", "fraudulent", "requested_by_customer"]).default("requested_by_customer") });

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const payload = refundSchema.safeParse(await request.json().catch(() => ({})));
  if (!payload.success) return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });

  const supabase = createAdminClient() as any;
  const { data: transaction } = await supabase.from("transactions").select("*").eq("id", params.id).single();
  if (!transaction || ![transaction.buyer_id, transaction.seller_id].includes(auth.user.id)) return NextResponse.json({ error: "Transaction not found." }, { status: 404 });

  const { data: payment } = await supabase.from("escrow_payments").select("*").eq("transaction_id", params.id).single();
  if (!payment) return NextResponse.json({ error: "Payment not found." }, { status: 404 });

  const amount = payload.data.amountCents ?? dollarsToCents(Number(payment.amount) - Number(payment.refunded_amount ?? 0));
  const refund = await getStripe().refunds.create({ payment_intent: payment.provider_payment_id, amount, reason: payload.data.reason, metadata: { transaction_id: params.id } });
  const refundedTotal = Number(payment.refunded_amount ?? 0) + centsToDollars(amount);
  const fullyRefunded = refundedTotal >= Number(payment.amount);

  await supabase.from("escrow_payments").update({ status: fullyRefunded ? "refunded" : payment.status, refunded_amount: refundedTotal, refunded_at: fullyRefunded ? new Date().toISOString() : payment.refunded_at }).eq("id", payment.id);
  if (fullyRefunded) await supabase.from("transactions").update({ status: "refunded" }).eq("id", params.id);
  if (fullyRefunded && transaction.listing_id) await supabase.from("listings").update({ status: "active" }).eq("id", transaction.listing_id).eq("status", "reserved");
  await supabase.from("transaction_receipts").update({ refunded_at: new Date().toISOString(), metadata: { refund_id: refund.id, refund_reason: payload.data.reason } }).eq("transaction_id", params.id);

  await recordTransactionEvent(supabase, {
    transaction_id: params.id,
    actor_id: auth.user.id,
    type: "refund_succeeded",
    from_status: transaction.status,
    to_status: fullyRefunded ? "refunded" : transaction.status,
    provider_object_id: refund.id,
    amount: centsToDollars(amount),
    currency: payment.currency,
    message: fullyRefunded ? "Payment fully refunded." : "Payment partially refunded."
  });

  return NextResponse.json({ status: fullyRefunded ? "refunded" : "partially_refunded", refundId: refund.id, amount });
}
