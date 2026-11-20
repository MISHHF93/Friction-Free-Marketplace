import { centsToDollars, dollarsToCents } from "@/lib/payments/money";
import { buildCaptureJournal, buildRefundJournal, buildReleaseJournal, postLedgerJournal } from "@/lib/financial/ledger";
import { claimEscrowPayment, claimTransactionStatus } from "@/lib/payments/escrow";
import { prepareEscrowAction } from "@/lib/payments/resume";
import { recordTransactionEvent } from "@/lib/payments/audit";
import { getStripe } from "@/lib/stripe/server";
import { releaseHeldEscrow } from "@/lib/payments/release-held";
import { reactivateReservedListing } from "@/lib/payments/record-outcome";
import { buildSettlementPlan, paymentAlreadySettled, planFromStored, settlementLegs, type SettlementOutcome, type SettlementPlan } from "@/lib/payments/settlement-plan";

const CLOSED = new Set(["closed", "resolved_buyer", "resolved_seller"]);

export function uncapturedDisputeAction(outcome: SettlementOutcome) {
  return outcome === "refund_buyer" ? "cancel" as const : "capture" as const;
}

function refundIdsOf(payment: { metadata?: { refund_ids?: unknown } | null }) {
  return Array.isArray(payment.metadata?.refund_ids) ? payment.metadata.refund_ids.filter((id: unknown) => typeof id === "string") : [];
}

export async function settleDispute(supabase: any, input: {
  disputeId: string;
  outcome: SettlementOutcome;
  actorId: string;
  reason: string;
}) {
  const { data: dispute } = await supabase.from("disputes").select("id,transaction_id,status,settlement_plan").eq("id", input.disputeId).maybeSingle();
  if (!dispute) return { error: "Dispute not found.", statusCode: 404 as const };
  const { data: transaction } = await supabase.from("transactions").select("*").eq("id", dispute.transaction_id).maybeSingle();
  const { data: payment } = await supabase.from("escrow_payments").select("*").eq("transaction_id", dispute.transaction_id).maybeSingle();
  if (!transaction || !payment) return { error: "Payment not found.", statusCode: 404 as const };

  const stored = planFromStored(dispute.settlement_plan);
  const candidate = stored ?? buildSettlementPlan({
    disputeId: dispute.id,
    outcome: input.outcome,
    originalAmountCents: dollarsToCents(Number(payment.amount)),
    originalSellerNetCents: dollarsToCents(Number(payment.seller_net_amount)),
    priorRefundedCents: dollarsToCents(Number(payment.refunded_amount ?? 0))
  });
  if (CLOSED.has(dispute.status) && paymentAlreadySettled(payment.status, candidate)) {
    return { ok: true as const, outcome: candidate.outcome, alreadySettled: true as const };
  }
  if (!stored && (payment.status === "authorized" || payment.status === "capturing")) {
    const prepared = await settleUncapturedDispute(supabase, { dispute, transaction, payment, outcome: input.outcome, reason: input.reason });
    if (prepared) return prepared;
  }
  if (!stored && payment.status !== "held") return { error: "The payment is not held, so this outcome cannot move money.", statusCode: 409 as const };

  const claimed = await supabase.rpc("claim_dispute_settlement", { p_dispute_id: dispute.id, p_plan: candidate });
  if (claimed.error || !claimed.data) return { error: claimed.error?.message ?? "The dispute could not be claimed.", statusCode: 409 as const };
  const claimedRow = Array.isArray(claimed.data) ? claimed.data[0] : claimed.data;
  const plan = planFromStored(claimedRow?.settlement_plan) ?? candidate;
  if (CLOSED.has(claimedRow?.status) && paymentAlreadySettled(payment.status, plan)) {
    return { ok: true as const, outcome: plan.outcome, alreadySettled: true as const };
  }

  const { data: payouts } = await supabase.from("payouts").select("metadata").eq("transaction_id", transaction.id);
  const payoutKeys = (payouts ?? []).map((payout: { metadata?: { settlement_key?: string } }) => payout.metadata?.settlement_key).filter((key: unknown) => typeof key === "string");
  const legs = settlementLegs(plan, { refundIds: refundIdsOf(payment), payoutKeys });
  const currentTransaction = { ...transaction, status: claimedRow?.status === "resolving" ? "resolving" : transaction.status };

  if (legs.refund) {
    const prepared = payment.status === "refunding" ? { payment } : await prepareEscrowAction(supabase, payment, "held", "refunding");
    if (!prepared.payment) return { error: "The refund could not be claimed.", statusCode: 409 as const };
    let refund;
    try {
      refund = await getStripe().refunds.create({
        payment_intent: payment.provider_payment_id,
        amount: plan.refundCents,
        reason: "requested_by_customer",
        metadata: { transaction_id: transaction.id, dispute_id: dispute.id, outcome: plan.outcome }
      }, { idempotencyKey: plan.refundKey });
    } catch (error) {
      await claimEscrowPayment(supabase, payment.id, "refunding", "held");
      return { error: error instanceof Error ? error.message : "Stripe refund failed.", statusCode: 502 as const };
    }
    const fullyRefunded = plan.releaseCents === 0;
    const refundIds = [...refundIdsOf(payment), plan.refundKey, refund.id];
    const recorded = await supabase.from("escrow_payments").update({
      status: fullyRefunded ? "refunded" : "held",
      refunded_amount: centsToDollars(plan.priorRefundedCents + plan.refundCents),
      refunded_at: fullyRefunded ? new Date().toISOString() : payment.refunded_at,
      metadata: { ...(payment.metadata ?? {}), refund_ids: refundIds }
    }).eq("id", payment.id).in("status", ["refunding", "refunded"]).select("id,status");
    const recordedRow = recorded.data?.[0];
    if (!recordedRow) {
      const current = await supabase.from("escrow_payments").select("status").eq("id", payment.id).maybeSingle();
      if (!(fullyRefunded && current.data?.status === "refunded")) return { error: "Refund could not be recorded.", statusCode: 409 as const };
    }
    if (fullyRefunded) await claimTransactionStatus(supabase, transaction.id, currentTransaction.status, "refunded");
    if (fullyRefunded) await reactivateReservedListing(supabase, transaction.listing_id);
    await postLedgerJournal(supabase, {
      ...buildRefundJournal({
        transactionId: transaction.id,
        totalAmount: Number(payment.amount),
        sellerNetAmount: Number(payment.seller_net_amount),
        platformFeeAmount: Number(payment.platform_fee_amount),
        refundAmount: centsToDollars(plan.refundCents),
        currency: payment.currency,
        buyerId: transaction.buyer_id,
        sellerId: transaction.seller_id,
        providerPaymentId: payment.provider_payment_id,
        providerChargeId: payment.provider_charge_id,
        providerRefundId: refund.id
      }),
      idempotencyKey: `ledger:refund:${plan.refundKey}`
    });
    payment.status = fullyRefunded ? "refunded" : "held";
    payment.refunded_amount = centsToDollars(plan.priorRefundedCents + plan.refundCents);
    payment.metadata = { ...(payment.metadata ?? {}), refund_ids: refundIds };
  }

  if (legs.release) {
    const { data: sellerAccount } = await supabase.from("seller_payment_accounts").select("stripe_account_id").eq("seller_id", transaction.seller_id).maybeSingle();
    if (!sellerAccount?.stripe_account_id) return { error: "Seller payout account not found.", statusCode: 409 as const };
    const fresh = payment.status === "held" ? payment : (await supabase.from("escrow_payments").select("*").eq("id", payment.id).maybeSingle()).data;
    const released = await releaseHeldEscrow(supabase, {
      transaction: { ...currentTransaction, status: fresh?.status === "held" ? "resolving" : currentTransaction.status },
      payment: fresh,
      sellerAccountId: sellerAccount.stripe_account_id,
      actorId: input.actorId,
      transferCents: plan.releaseCents,
      idempotencyKey: plan.releaseKey,
      payoutKey: plan.releaseKey,
      skipJournal: true
    });
    if ("error" in released && released.error) return released;
    const journal = buildReleaseJournal({
      transactionId: transaction.id,
      totalAmount: centsToDollars(plan.releaseCents),
      sellerNetAmount: centsToDollars(plan.releaseCents),
      platformFeeAmount: 0,
      currency: payment.currency,
      buyerId: transaction.buyer_id,
      sellerId: transaction.seller_id,
      providerPaymentId: payment.provider_payment_id,
      providerChargeId: payment.provider_charge_id,
      providerTransferId: "transferId" in released ? released.transferId : plan.releaseKey
    });
    await postLedgerJournal(supabase, { ...journal, idempotencyKey: `ledger:release:${plan.releaseKey}` });
  }

  await supabase.from("disputes").update({
    status: plan.outcome === "refund_buyer" ? "resolved_buyer" : plan.outcome === "release_seller" ? "resolved_seller" : "closed",
    resolution: `${plan.outcome}: ${input.reason}`,
    resolved_at: new Date().toISOString()
  }).eq("id", dispute.id).eq("status", "resolving");
  await recordTransactionEvent(supabase, {
    transaction_id: transaction.id,
    actor_id: input.actorId,
    type: "dispute_closed",
    from_status: "disputed",
    to_status: plan.releaseCents > 0 ? "completed" : "refunded",
    message: `Dispute closed with ${plan.outcome}. ${input.reason}`
  });
  return { ok: true as const, outcome: plan.outcome };
}

async function settleUncapturedDispute(supabase: any, input: {
  dispute: { id: string };
  transaction: { id: string; status: string; buyer_id: string; seller_id: string };
  payment: Record<string, any>;
  outcome: SettlementOutcome;
  reason: string;
}) {
  const { dispute, transaction, payment } = input;
  if (uncapturedDisputeAction(input.outcome) === "cancel") {
    try {
      await getStripe().paymentIntents.cancel(payment.provider_payment_id, {}, { idempotencyKey: `dispute:${dispute.id}:cancel` });
    } catch (error) {
      return { error: error instanceof Error ? error.message : "The authorization could not be cancelled.", statusCode: 502 as const };
    }
    const from = payment.status === "capturing" ? "capturing" : "authorized";
    const cancelled = await claimEscrowPayment(supabase, payment.id, from, "cancelled");
    if (!cancelled) return { error: "The authorization could not be cancelled.", statusCode: 409 as const };
    await claimTransactionStatus(supabase, transaction.id, transaction.status, "cancelled", { cancelled_at: new Date().toISOString() });
    await supabase.from("disputes").update({
      status: "resolved_buyer",
      resolution: `refund_buyer: ${input.reason}`,
      resolved_at: new Date().toISOString()
    }).eq("id", dispute.id);
    return { ok: true as const, outcome: "refund_buyer" as const };
  }

  const prepared = payment.status === "capturing" ? { payment } : await prepareEscrowAction(supabase, payment, "authorized", "capturing");
  if (!prepared.payment || prepared.payment.status !== "capturing") {
    return { error: "The authorization could not be captured.", statusCode: 409 as const };
  }
  let captured;
  try {
    captured = await getStripe().paymentIntents.capture(payment.provider_payment_id, {}, { idempotencyKey: `dispute:${dispute.id}:capture` });
  } catch (error) {
    await claimEscrowPayment(supabase, payment.id, "capturing", "authorized");
    return { error: error instanceof Error ? error.message : "Stripe capture failed.", statusCode: 502 as const };
  }
  const charge = typeof captured.latest_charge === "string" ? captured.latest_charge : captured.latest_charge?.id ?? null;
  const held = await supabase.from("escrow_payments").update({
    status: "held",
    provider_charge_id: charge,
    captured_at: new Date().toISOString(),
    held_at: new Date().toISOString()
  }).eq("id", payment.id).eq("status", "capturing").select("id");
  if (held.error || !held.data?.length) return { error: "Capture could not be recorded.", statusCode: 409 as const };
  payment.status = "held";
  payment.provider_charge_id = charge;
  await postLedgerJournal(supabase, buildCaptureJournal({
    transactionId: transaction.id,
    totalAmount: Number(payment.amount),
    sellerNetAmount: Number(payment.seller_net_amount),
    platformFeeAmount: Number(payment.platform_fee_amount),
    currency: payment.currency,
    buyerId: transaction.buyer_id,
    sellerId: transaction.seller_id,
    providerPaymentId: payment.provider_payment_id,
    providerChargeId: charge
  }));
  return null;
}
