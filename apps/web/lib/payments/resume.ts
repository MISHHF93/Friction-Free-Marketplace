import { claimEscrowPayment } from "@/lib/payments/escrow";

export const ESCROW_LEASE_MS = 2 * 60 * 1000;

export function escrowLeaseExpired(updatedAt: string | null | undefined, now = Date.now()) {
  if (!updatedAt) return false;
  const time = new Date(updatedAt).getTime();
  if (Number.isNaN(time)) return false;
  return now - time >= ESCROW_LEASE_MS;
}

export function refundPlan(payment: { metadata?: Record<string, any> | null }, fallback: { amountCents: number; reason: string; idempotencyKey: string }) {
  const stored = payment.metadata?.refund_in_flight;
  if (stored && Number.isInteger(stored.amountCents) && stored.amountCents > 0 && typeof stored.reason === "string" && typeof stored.idempotencyKey === "string") {
    return {
      amountCents: stored.amountCents as number,
      reason: stored.reason as string,
      idempotencyKey: stored.idempotencyKey as string,
      resumed: true
    };
  }
  return { ...fallback, resumed: false };
}

export async function prepareEscrowAction(supabase: any, payment: Record<string, any>, from: string, intermediate: string) {
  if (payment.status === intermediate) {
    if (!escrowLeaseExpired(payment.updated_at)) return { payment: null, resumed: false as const };
    const token = crypto.randomUUID();
    const renewed = await supabase.from("escrow_payments").update({
      updated_at: new Date().toISOString(),
      metadata: { ...(payment.metadata ?? {}), claim_token: token }
    }).eq("id", payment.id).eq("status", intermediate).eq("updated_at", payment.updated_at).select("*");
    const row = Array.isArray(renewed.data) ? renewed.data[0] : renewed.data;
    if (renewed.error || !row) return { payment: null, resumed: false as const };
    return { payment: row, resumed: true as const };
  }
  if (payment.status !== from) return { payment: null, resumed: false as const };
  const claimed = await claimEscrowPayment(supabase, String(payment.id), from, intermediate);
  if (!claimed) return { payment: null, resumed: false as const };
  return { payment: claimed as Record<string, unknown>, resumed: false as const };
}
