import { centsToDollars, dollarsToCents } from "@/lib/payments/money";
import { buildRefundJournal, postLedgerJournal } from "@/lib/financial/ledger";
import { claimEscrowPayment, claimTransactionStatus, escrowActionKey } from "@/lib/payments/escrow";
import { prepareEscrowAction } from "@/lib/payments/resume";
import { recordTransactionEvent } from "@/lib/payments/audit";
import { getStripe } from "@/lib/stripe/server";
import { settlementAmounts } from "@/lib/payments/auto-release";
import { releaseHeldEscrow } from "@/lib/payments/release-held";

export async function settleDispute(supabase: any, input: {
  disputeId: string;
  outcome: "refund_buyer" | "release_seller" | "split";
  actorId: string;
  reason: string;
}) {
  const { data: dispute } = await supabase.from("disputes").select("id,transaction_id,status").eq("id", input.disputeId).maybeSingle();
  if (!dispute) return { error: "Dispute not found.", statusCode: 404 as const };
  const { data: transaction } = await supabase.from("transactions").select("*").eq("id", dispute.transaction_id).maybeSingle();
  const { data: payment } = await supabase.from("escrow_payments").select("*").eq("transaction_id", dispute.transaction_id).maybeSingle();
  if (!transaction || !payment) return { error: "Payment not found.", statusCode: 404 as const };
  if (payment.status !== "held") return { error: "The payment is not held, so this outcome cannot move money.", statusCode: 409 as const };

  const amountCents = dollarsToCents(Number(payment.amount) - Number(payment.refunded_amount ?? 0));
  const sellerNetCents = dollarsToCents(Number(payment.seller_net_amount));
  const plan = settlementAmounts(input.outcome, amountCents, sellerNetCents);

  if (plan.refundCents > 0) {
    const refundCents = plan.refundCents;
    const prepared = await prepareEscrowAction(supabase, payment, "held", "refunding");
    if (!prepared.payment) return { error: "The refund could not be claimed.", statusCode: 409 as const };
    let refund;
    try {
      refund = await getStripe().refunds.create({
        payment_intent: payment.provider_payment_id,
        amount: refundCents,
        reason: "requested_by_customer",
        metadata: { transaction_id: transaction.id, dispute_id: dispute.id, outcome: input.outcome }
      }, { idempotencyKey: escrowActionKey("refund", transaction.id, payment.id, `dispute:${input.outcome}:${refundCents}`) });
    } catch (error) {
      await claimEscrowPayment(supabase, payment.id, "refunding", "held");
      return { error: error instanceof Error ? error.message : "Stripe refund failed.", statusCode: 502 as const };
    }
    const fullyRefunded = plan.releaseCents === 0;
    await supabase.from("escrow_payments").update({
      status: fullyRefunded ? "refunded" : "held",
      refunded_amount: centsToDollars(dollarsToCents(Number(payment.refunded_amount ?? 0)) + refundCents),
      refunded_at: fullyRefunded ? new Date().toISOString() : payment.refunded_at
    }).eq("id", payment.id).eq("status", "refunding");
    if (fullyRefunded) await claimTransactionStatus(supabase, transaction.id, transaction.status, "refunded");
    await postLedgerJournal(supabase, buildRefundJournal({
      transactionId: transaction.id,
      totalAmount: Number(payment.amount),
      sellerNetAmount: Number(payment.seller_net_amount),
      platformFeeAmount: Number(payment.platform_fee_amount),
      refundAmount: centsToDollars(refundCents),
      currency: payment.currency,
      buyerId: transaction.buyer_id,
      sellerId: transaction.seller_id,
      providerPaymentId: payment.provider_payment_id,
      providerChargeId: payment.provider_charge_id,
      providerRefundId: refund.id
    }));
    payment.status = fullyRefunded ? "refunded" : "held";
  }

  if (plan.releaseCents > 0) {
    const { data: sellerAccount } = await supabase.from("seller_payment_accounts").select("stripe_account_id").eq("seller_id", transaction.seller_id).maybeSingle();
    if (!sellerAccount?.stripe_account_id) return { error: "Seller payout account not found.", statusCode: 409 as const };
    const current = payment.status === "held" ? payment : (await supabase.from("escrow_payments").select("*").eq("id", payment.id).maybeSingle()).data;
    const released = await releaseHeldEscrow(supabase, {
      transaction,
      payment: current,
      sellerAccountId: sellerAccount.stripe_account_id,
      actorId: input.actorId,
      transferCents: input.outcome === "split" ? plan.releaseCents : undefined
    });
    if ("error" in released && released.error) return released;
  }

  await recordTransactionEvent(supabase, {
    transaction_id: transaction.id,
    actor_id: input.actorId,
    type: "dispute_closed",
    from_status: transaction.status,
    to_status: plan.releaseCents > 0 ? "completed" : "refunded",
    message: `Dispute closed with ${input.outcome}. ${input.reason}`
  });
  return { ok: true as const, outcome: input.outcome };
}
