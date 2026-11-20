import { recordTransactionEvent } from "@/lib/payments/audit";
import { getStripe } from "@/lib/stripe/server";

/** An unpaid checkout older than this frees the listing for other buyers. */
export const ABANDONED_CHECKOUT_AFTER_MS = 45 * 60 * 1000;

/** PaymentIntent states where the buyer never finished paying, so it is safe to cancel. */
const CANCELLABLE_INTENT_STATUSES = new Set(["requires_payment_method", "requires_confirmation", "requires_action"]);

export type AbandonedCheckoutDecision = "cancel_intent" | "cancel_local" | "skip";

/**
 * Funds that are authorized, processing or captured belong to the webhook flow,
 * so only intents the buyer never completed are cancelled here.
 */
export function decideAbandonedCheckout(intentStatus: string | null | undefined): AbandonedCheckoutDecision {
  if (!intentStatus) return "cancel_local";
  if (intentStatus === "canceled") return "cancel_local";
  if (CANCELLABLE_INTENT_STATUSES.has(intentStatus)) return "cancel_intent";
  return "skip";
}

export function abandonedCheckoutCutoff(now = Date.now()) {
  return new Date(now - ABANDONED_CHECKOUT_AFTER_MS).toISOString();
}

type Row = { id: string; status: string; created_at: string };

export async function expireAbandonedCheckouts(supabase: any, options: { now?: number; limit?: number; stripe?: any } = {}) {
  const cutoff = abandonedCheckoutCutoff(options.now);
  const { data: rows, error } = await supabase
    .from("transactions")
    .select("id,status,created_at")
    .eq("status", "pending_payment")
    .lt("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(options.limit ?? 50);
  if (error) throw new Error(error.message ?? "Could not load abandoned checkouts.");

  let expired = 0;
  let skipped = 0;
  let failed = 0;
  for (const row of (rows ?? []) as Row[]) {
    try {
      const { data: payment } = await supabase
        .from("escrow_payments")
        .select("id,status,provider_payment_id")
        .eq("transaction_id", row.id)
        .maybeSingle();
      let intentStatus: string | null = null;
      if (payment?.provider_payment_id) {
        const stripe = options.stripe ?? getStripe();
        const intent = await stripe.paymentIntents.retrieve(payment.provider_payment_id);
        intentStatus = intent.status;
        const decision = decideAbandonedCheckout(intentStatus);
        if (decision === "skip") {
          skipped += 1;
          continue;
        }
        if (decision === "cancel_intent") {
          await stripe.paymentIntents.cancel(payment.provider_payment_id, { cancellation_reason: "abandoned" }, { idempotencyKey: `checkout-expire:${row.id}` });
        }
      }
      if (payment?.id) {
        await supabase.from("escrow_payments").update({ status: "cancelled" }).eq("id", payment.id).in("status", ["requires_action", "failed"]);
      }
      const cancelled = await supabase
        .from("transactions")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
        .eq("id", row.id)
        .eq("status", "pending_payment")
        .select("id");
      if (!cancelled.data?.length) {
        skipped += 1;
        continue;
      }
      await recordTransactionEvent(supabase, {
        transaction_id: row.id,
        actor_id: null,
        type: "cancelled",
        from_status: "pending_payment",
        to_status: "cancelled",
        provider_object_id: payment?.provider_payment_id ?? null,
        message: "Checkout expired because payment was not completed. The listing is available again."
      });
      expired += 1;
    } catch {
      failed += 1;
    }
  }
  return { expired, skipped, failed };
}
