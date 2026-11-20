import { recordTransactionEvent } from "@/lib/payments/audit";
import { OPEN_DISPUTE_STATUSES } from "@/lib/disputes/status";
import { notifyTransactionParties } from "@/lib/notifications/transaction-events";

export const EXPIRED_AUTHORIZATION_RESOLUTION = "The card authorization expired before the seller accepted the order, so no money was taken. The order is cancelled.";

/** Applies only when Stripe cancels an intent that was never captured while the order is disputed. */
export function shouldCloseDisputeForExpiredAuthorization(input: { intentStatus: string; transactionStatus: string | null | undefined; paymentStatus: string | null | undefined }) {
  return input.intentStatus === "canceled"
    && input.transactionStatus === "disputed"
    && ["authorized", "requires_action"].includes(String(input.paymentStatus ?? ""));
}

/**
 * A dispute opened on an authorized-only payment has no money behind it once
 * the authorization lapses, so the dispute closes and the order cancels instead
 * of waiting on an admin forever.
 */
export async function closeDisputeForExpiredAuthorization(supabase: any, input: { transactionId: string; paymentId: string; intentId: string }) {
  const now = new Date().toISOString();
  const payment = await supabase.from("escrow_payments").update({ status: "cancelled" }).eq("id", input.paymentId).in("status", ["authorized", "requires_action"]).select("id");
  if (payment.error) throw new Error(`Cancel expired authorization: ${payment.error.message}`);
  if (!payment.data?.length) return false;
  const disputes = await supabase.from("disputes").update({ status: "closed", resolution: EXPIRED_AUTHORIZATION_RESOLUTION, resolved_at: now }).eq("transaction_id", input.transactionId).in("status", [...OPEN_DISPUTE_STATUSES]).select("id");
  if (disputes.error) throw new Error(`Close dispute: ${disputes.error.message}`);
  const cancelled = await supabase.from("transactions").update({ status: "cancelled", cancelled_at: now }).eq("id", input.transactionId).eq("status", "disputed").select("id");
  if (cancelled.error) throw new Error(`Cancel disputed order: ${cancelled.error.message}`);
  await recordTransactionEvent(supabase, {
    transaction_id: input.transactionId,
    type: "dispute_closed",
    from_status: "disputed",
    to_status: "cancelled",
    provider_object_id: input.intentId,
    message: EXPIRED_AUTHORIZATION_RESOLUTION
  });
  await notifyTransactionParties(supabase, { transactionId: input.transactionId, template: "dispute_resolved", to: ["buyer", "seller"], input: { reason: EXPIRED_AUTHORIZATION_RESOLUTION } });
  return true;
}
