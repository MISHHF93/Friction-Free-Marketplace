export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/payments/auth";
import { recordTransactionEvent } from "@/lib/payments/audit";
import { enqueueTemplateNotification } from "@/lib/notifications/service";
import { buildDisputeHoldJournal, postLedgerJournal } from "@/lib/financial/ledger";

const disputeSchema = z.object({ reason: z.string().min(10), evidence: z.record(z.unknown()).default({}) });
const transactionIdSchema = z.string().uuid();

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const transactionId = transactionIdSchema.safeParse(id);
  if (!transactionId.success) return NextResponse.json({ error: "Invalid transaction id." }, { status: 400 });
  const payload = disputeSchema.safeParse(await request.json());
  if (!payload.success) return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });

  const supabase = createAdminClient() as any;
  const { data: transaction } = await supabase.from("transactions").select("*").eq("id", transactionId.data).single();
  if (!transaction || ![transaction.buyer_id, transaction.seller_id].includes(auth.user.id)) return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
  const { data: existingDispute } = await supabase
    .from("disputes")
    .select("id,status")
    .eq("transaction_id", transactionId.data)
    .in("status", ["opened", "under_review", "awaiting_buyer", "awaiting_seller"])
    .maybeSingle();
  if (existingDispute) {
    return NextResponse.json({ error: "An open dispute already exists for this transaction.", disputeId: existingDispute.id }, { status: 409 });
  }

  const { data: dispute, error } = await supabase.from("disputes").insert({
    transaction_id: transactionId.data,
    opened_by_id: auth.user.id,
    respondent_id: auth.user.id === transaction.buyer_id ? transaction.seller_id : transaction.buyer_id,
    reason: payload.data.reason,
    status: "opened",
    evidence: payload.data.evidence
  }).select("*").single();
  if (error) return NextResponse.json({ error: "Could not create dispute." }, { status: 500 });

  await supabase.from("transactions").update({ status: "disputed" }).eq("id", transactionId.data);
  const { data: payment } = await supabase.from("escrow_payments").select("*").eq("transaction_id", transactionId.data).maybeSingle();
  if (payment?.status === "held") {
    await postLedgerJournal(supabase, buildDisputeHoldJournal({
      transactionId: transactionId.data,
      totalAmount: Number(payment.amount),
      sellerNetAmount: Number(payment.seller_net_amount),
      platformFeeAmount: Number(payment.platform_fee_amount),
      currency: payment.currency,
      buyerId: transaction.buyer_id,
      sellerId: transaction.seller_id,
      providerPaymentId: payment.provider_payment_id,
      providerChargeId: payment.provider_charge_id,
      providerDisputeId: dispute.id,
    }));
  }
  await recordTransactionEvent(supabase, {
    transaction_id: transactionId.data,
    actor_id: auth.user.id,
    type: "dispute_opened",
    from_status: transaction.status,
    to_status: "disputed",
    provider_object_id: dispute.id,
    message: payload.data.reason
  });

  await Promise.all([
    enqueueTemplateNotification({
      userId: transaction.buyer_id,
      template: "dispute_opened",
      input: { reason: payload.data.reason, actionUrl: "/dashboard/purchases" },
      payload: { transaction_id: transactionId.data, dispute_id: dispute.id },
      supabase
    }),
    enqueueTemplateNotification({
      userId: transaction.seller_id,
      template: "dispute_opened",
      input: { reason: payload.data.reason, actionUrl: "/dashboard/sales" },
      payload: { transaction_id: transactionId.data, dispute_id: dispute.id },
      supabase
    })
  ]);

  return NextResponse.json({ status: "disputed", disputeId: dispute.id });
}
