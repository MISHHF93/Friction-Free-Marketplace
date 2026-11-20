import { centsToDollars } from "@/lib/payments/money";
import { buildRefundJournal, buildReleaseJournal, postLedgerJournal } from "@/lib/financial/ledger";
import { claimTransactionStatus } from "@/lib/payments/escrow";

export async function reactivateReservedListing(supabase: any, listingId: string | null | undefined) {
  if (!listingId) return;
  await supabase.from("listings").update({ status: "active" }).eq("id", listingId).eq("status", "reserved");
}

export async function recordReconciledPayment(supabase: any, input: {
  payment: Record<string, any>;
  next: string;
  refundedCents: number;
  transferId?: string | null;
}) {
  const { payment, next, refundedCents } = input;
  if (refundedCents > 0) {
    const ids = Array.isArray(payment.metadata?.refund_ids) ? payment.metadata.refund_ids : [];
    await supabase.from("escrow_payments").update({
      refunded_amount: centsToDollars(refundedCents),
      metadata: { ...(payment.metadata ?? {}), refund_ids: ids }
    }).eq("id", payment.id);
  }
  const { data: transaction } = await supabase.from("transactions").select("*").eq("id", payment.transaction_id).maybeSingle();
  if (!transaction) return;
  if (next === "held") await claimTransactionStatus(supabase, transaction.id, "paid", "escrowed");
  if (next === "cancelled") await claimTransactionStatus(supabase, transaction.id, transaction.status, "cancelled", { cancelled_at: new Date().toISOString() });
  if (next === "refunded") {
    await claimTransactionStatus(supabase, transaction.id, transaction.status, "refunded");
    await reactivateReservedListing(supabase, transaction.listing_id);
    await postLedgerJournal(supabase, buildRefundJournal({
      transactionId: transaction.id,
      totalAmount: Number(payment.amount),
      sellerNetAmount: Number(payment.seller_net_amount ?? payment.amount),
      platformFeeAmount: Number(payment.platform_fee_amount ?? 0),
      refundAmount: centsToDollars(refundedCents),
      currency: payment.currency,
      buyerId: transaction.buyer_id,
      sellerId: transaction.seller_id,
      providerPaymentId: payment.provider_payment_id,
      providerChargeId: payment.provider_charge_id,
      providerRefundId: payment.provider_charge_id
    }));
  }
  if (next === "released") {
    const amount = Number(payment.seller_net_amount ?? payment.amount);
    if (input.transferId) {
      await supabase.from("payouts").insert({
        transaction_id: transaction.id,
        seller_id: transaction.seller_id,
        provider: "stripe",
        provider_transfer_id: input.transferId,
        status: "paid",
        amount,
        currency: payment.currency,
        paid_at: new Date().toISOString(),
        metadata: { settlement_key: `reconcile:${payment.id}` }
      });
    }
    await claimTransactionStatus(supabase, transaction.id, transaction.status, "completed", { completed_at: new Date().toISOString() });
    await postLedgerJournal(supabase, buildReleaseJournal({
      transactionId: transaction.id,
      totalAmount: amount,
      sellerNetAmount: amount,
      platformFeeAmount: Number(payment.platform_fee_amount ?? 0),
      currency: payment.currency,
      buyerId: transaction.buyer_id,
      sellerId: transaction.seller_id,
      providerPaymentId: payment.provider_payment_id,
      providerChargeId: payment.provider_charge_id,
      providerTransferId: input.transferId
    }));
  }
}
