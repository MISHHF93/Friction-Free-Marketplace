import { recordTransactionEvent } from "@/lib/payments/audit";
import { notifyTransactionParties } from "@/lib/notifications/transaction-events";
import { getStripe } from "@/lib/stripe/server";
import { isOpenDisputeStatus } from "@/lib/payments/auto-release";

/** Remind the seller after this much time on an authorized, uncaptured order. */
export const CAPTURE_REMIND_BEFORE_DEADLINE_MS = 24 * 60 * 60 * 1000;
/** Auto-cancel an uncaptured authorization this long after it was paid, unless Stripe expires sooner. */
export const UNCAPTURED_CANCEL_AFTER_MS = 72 * 60 * 60 * 1000;

export function acceptByDeadline(paidAt: string | Date, captureBefore?: string | Date | null): Date {
  const paidMs = new Date(paidAt).getTime();
  const autoCancelAt = paidMs + UNCAPTURED_CANCEL_AFTER_MS;
  const stripeMs = captureBefore ? new Date(captureBefore).getTime() : Number.NaN;
  const deadlineMs = Number.isFinite(stripeMs) ? Math.min(autoCancelAt, stripeMs) : autoCancelAt;
  return new Date(deadlineMs);
}

export function formatAcceptBy(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) return "the deadline";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export type UncapturedDecision = "cancel" | "remind" | "skip";

export function decideUncapturedOrder(input: {
  transactionStatus: string;
  paymentStatus: string;
  paidAt?: string | Date | null;
  captureBefore?: string | Date | null;
  reminderSentAt?: string | null;
  hasOpenDispute?: boolean;
  now?: number;
}): UncapturedDecision {
  if (input.hasOpenDispute) return "skip";
  if (input.transactionStatus !== "paid" || input.paymentStatus !== "authorized" || !input.paidAt) return "skip";
  const paidMs = new Date(input.paidAt).getTime();
  if (!Number.isFinite(paidMs)) return "skip";
  const now = input.now ?? Date.now();
  const cancelAt = acceptByDeadline(input.paidAt, input.captureBefore).getTime();
  if (now >= cancelAt) return "cancel";
  const remindAt = cancelAt - CAPTURE_REMIND_BEFORE_DEADLINE_MS;
  if (remindAt > paidMs && now >= remindAt && !input.reminderSentAt) return "remind";
  return "skip";
}

function reminderSentAt(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const value = (metadata as { capture_reminder_sent_at?: unknown }).capture_reminder_sent_at;
  return typeof value === "string" && value ? value : null;
}

function withMetadata(metadata: unknown, patch: Record<string, unknown>) {
  const base = metadata && typeof metadata === "object" && !Array.isArray(metadata) ? { ...(metadata as Record<string, unknown>) } : {};
  return { ...base, ...patch };
}

type UncapturedRow = {
  id: string;
  buyer_id: string;
  seller_id: string;
  status: string;
  paid_at: string | null;
  listing_id: string | null;
  metadata: unknown;
};

export async function remindAndCancelUncapturedOrders(
  supabase: any,
  options: { now?: number; limit?: number; stripe?: any } = {}
) {
  const now = options.now ?? Date.now();
  const { data: rows, error } = await supabase
    .from("transactions")
    .select("id,buyer_id,seller_id,status,paid_at,listing_id,metadata")
    .eq("status", "paid")
    .not("paid_at", "is", null)
    .order("paid_at", { ascending: true })
    .limit(options.limit ?? 50);
  if (error) throw new Error(error.message ?? "Could not load uncaptured orders.");

  let reminded = 0;
  let cancelled = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of (rows ?? []) as UncapturedRow[]) {
    try {
      const { data: payment } = await supabase
        .from("escrow_payments")
        .select("id,status,provider_payment_id,capture_before")
        .eq("transaction_id", row.id)
        .maybeSingle();
      const { data: disputes } = await supabase.from("disputes").select("status").eq("transaction_id", row.id);
      const hasOpenDispute = (disputes ?? []).some((dispute: { status?: string }) => isOpenDisputeStatus(dispute.status));
      const decision = decideUncapturedOrder({
        transactionStatus: row.status,
        paymentStatus: payment?.status ?? "",
        paidAt: row.paid_at,
        captureBefore: payment?.capture_before ?? null,
        reminderSentAt: reminderSentAt(row.metadata),
        hasOpenDispute,
        now
      });
      if (decision === "skip") {
        skipped += 1;
        continue;
      }
      const deadline = acceptByDeadline(row.paid_at!, payment?.capture_before ?? null);
      const deadlineLabel = formatAcceptBy(deadline);
      if (decision === "remind") {
        const sentAt = new Date(now).toISOString();
        await supabase.from("transactions").update({
          metadata: withMetadata(row.metadata, { capture_reminder_sent_at: sentAt })
        }).eq("id", row.id);
        await notifyTransactionParties(supabase, {
          transactionId: row.id,
          template: "order_capture_reminder",
          to: ["seller"],
          input: { deadline: deadlineLabel }
        });
        reminded += 1;
        continue;
      }

      if (payment?.provider_payment_id) {
        const stripe = options.stripe ?? getStripe();
        const intent = await stripe.paymentIntents.retrieve(payment.provider_payment_id);
        if (intent.status === "requires_capture") {
          await stripe.paymentIntents.cancel(
            payment.provider_payment_id,
            { cancellation_reason: "abandoned" },
            { idempotencyKey: `uncaptured-cancel:${row.id}` }
          );
        } else if (intent.status !== "canceled") {
          skipped += 1;
          continue;
        }
      }
      if (payment?.id) {
        await supabase.from("escrow_payments").update({ status: "cancelled" }).eq("id", payment.id).eq("status", "authorized");
      }
      const cancelledRow = await supabase
        .from("transactions")
        .update({
          status: "cancelled",
          cancelled_at: new Date(now).toISOString(),
          metadata: withMetadata(row.metadata, { uncaptured_auto_cancelled_at: new Date(now).toISOString() })
        })
        .eq("id", row.id)
        .eq("status", "paid")
        .select("id");
      if (!cancelledRow.data?.length) {
        skipped += 1;
        continue;
      }
      await recordTransactionEvent(supabase, {
        transaction_id: row.id,
        actor_id: null,
        type: "cancelled",
        from_status: "paid",
        to_status: "cancelled",
        provider_object_id: payment?.provider_payment_id ?? null,
        message: "Uncaptured authorization cancelled because the seller did not accept the order in time."
      });
      await notifyTransactionParties(supabase, {
        transactionId: row.id,
        template: "order_authorization_cancelled",
        to: ["buyer", "seller"],
        input: { deadline: deadlineLabel }
      });
      cancelled += 1;
    } catch {
      failed += 1;
    }
  }

  return { reminded, cancelled, skipped, failed };
}
