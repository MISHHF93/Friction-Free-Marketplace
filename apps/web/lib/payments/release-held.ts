import { centsToDollars, dollarsToCents } from "@/lib/payments/money";
import { buildReleaseJournal, postLedgerJournal } from "@/lib/financial/ledger";
import { claimEscrowPayment, claimTransactionStatus, escrowActionKey } from "@/lib/payments/escrow";
import { prepareEscrowAction } from "@/lib/payments/resume";
import { recordTransactionEvent } from "@/lib/payments/audit";
import { getStripe } from "@/lib/stripe/server";

export async function releaseHeldEscrow(supabase: any, input: {
  transaction: Record<string, any>;
  payment: Record<string, any>;
  sellerAccountId: string;
  actorId?: string | null;
  transferCents?: number;
  idempotencyKey?: string;
  payoutKey?: string;
  skipJournal?: boolean;
}) {
  const { transaction, payment, sellerAccountId } = input;
  if (payment.status === "released") return { status: "completed" as const, alreadyReleased: true };
  const seller = await supabase.from("users").select("status").eq("id", transaction.seller_id).maybeSingle();
  if (seller.data && ["suspended", "banned"].includes(seller.data.status)) {
    return { error: "Payout is frozen while the seller account is restricted.", statusCode: 409 as const };
  }
  const prepared = await prepareEscrowAction(supabase, payment, "held", "releasing");
  if (!prepared.payment || prepared.payment.status !== "releasing") {
    if (prepared.payment?.status === "released") return { status: "completed" as const, alreadyReleased: true };
    return { error: "This release is already in progress.", statusCode: 409 as const };
  }
  const refundedCents = dollarsToCents(Number(payment.refunded_amount ?? 0));
  const remainingCents = Math.max(0, dollarsToCents(Number(payment.amount)) - refundedCents);
  const requestedCents = input.transferCents ?? dollarsToCents(Number(payment.seller_net_amount));
  const amount = Math.max(0, Math.min(requestedCents, remainingCents));
  if (amount <= 0) return { error: "Nothing remains to release.", statusCode: 409 as const };
  const transferred = centsToDollars(amount);
  let transfer;
  try {
    transfer = await getStripe().transfers.create({
      amount,
      currency: String(payment.currency).toLowerCase(),
      destination: sellerAccountId,
      source_transaction: payment.provider_charge_id ?? undefined,
      transfer_group: `transaction_${transaction.id}`,
      metadata: { transaction_id: transaction.id, escrow_payment_id: payment.id }
    }, { idempotencyKey: input.idempotencyKey ?? escrowActionKey("release", transaction.id, payment.id, input.transferCents ? `partial:${amount}` : "") });
  } catch (error) {
    await claimEscrowPayment(supabase, payment.id, "releasing", "held");
    return { error: error instanceof Error ? error.message : "Stripe release failed.", statusCode: 502 as const };
  }
  await supabase.from("payouts").insert({
    transaction_id: transaction.id,
    seller_id: transaction.seller_id,
    provider: "stripe",
    provider_transfer_id: transfer.id,
    status: "paid",
    amount: transferred,
    currency: payment.currency,
    paid_at: new Date().toISOString(),
    metadata: { transfer_group: transfer.transfer_group, transfer_cents: amount, settlement_key: input.payoutKey ?? null }
  });
  await supabase.from("transaction_receipts").upsert({
    transaction_id: transaction.id,
    buyer_id: transaction.buyer_id,
    seller_id: transaction.seller_id,
    provider: "stripe",
    provider_payment_id: payment.provider_payment_id,
    provider_charge_id: payment.provider_charge_id,
    subtotal_amount: transaction.item_amount,
    shipping_amount: transaction.shipping_amount,
    tax_amount: transaction.tax_amount,
    platform_fee_amount: payment.platform_fee_amount,
    seller_net_amount: transferred,
    total_amount: payment.amount,
    currency: payment.currency,
    metadata: { transfer_id: transfer.id }
  });
  const releasedPayment = await supabase.from("escrow_payments").update({ status: "released", released_at: new Date().toISOString() }).eq("id", payment.id).eq("status", "releasing").select("id");
  if (releasedPayment.error) return { error: "Release could not be recorded.", statusCode: 409 as const };
  if (!releasedPayment.data?.length) {
    const { data: current } = await supabase.from("escrow_payments").select("status").eq("id", payment.id).maybeSingle();
    if (current?.status === "released") return { status: "completed" as const, alreadyReleased: true };
    return { error: "Release could not be recorded.", statusCode: 409 as const };
  }
  await claimTransactionStatus(supabase, transaction.id, transaction.status, "completed", { completed_at: new Date().toISOString() });
  if (transaction.listing_id) await supabase.from("listings").update({ status: "sold", quantity: 0 }).eq("id", transaction.listing_id);
  if (!input.skipJournal) await postLedgerJournal(supabase, buildReleaseJournal({
    transactionId: transaction.id,
    totalAmount: transferred,
    sellerNetAmount: transferred,
    platformFeeAmount: input.transferCents ? 0 : Number(payment.platform_fee_amount),
    currency: payment.currency,
    buyerId: transaction.buyer_id,
    sellerId: transaction.seller_id,
    providerPaymentId: payment.provider_payment_id,
    providerChargeId: payment.provider_charge_id,
    providerTransferId: transfer.id
  }));
  await recordTransactionEvent(supabase, {
    transaction_id: transaction.id,
    actor_id: input.actorId ?? null,
    type: "seller_payout_paid",
    from_status: transaction.status,
    to_status: "completed",
    provider_object_id: transfer.id,
    amount: transferred,
    currency: payment.currency,
    message: "Held funds released to the seller connected account."
  });
  return { status: "completed" as const, transferId: transfer.id as string, transferredAmount: transferred };
}
