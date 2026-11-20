import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/stripe/server", () => ({ getStripe: () => { throw new Error("tests pass a stripe stub"); } }));

import { ABANDONED_CHECKOUT_AFTER_MS, decideAbandonedCheckout, expireAbandonedCheckouts } from "@/lib/payments/expire-checkout";
import { openCheckoutStatuses } from "@/lib/payments/open-checkout";

type Tx = { id: string; status: string; created_at: string };

function memoryDb(transactions: Tx[], payments: Array<{ id: string; transaction_id: string; status: string; provider_payment_id: string | null }>) {
  const events: unknown[] = [];
  function table(name: string) {
    const filters: Array<(row: any) => boolean> = [];
    let patch: Record<string, unknown> | null = null;
    const rows = () => (name === "transactions" ? transactions : name === "escrow_payments" ? payments : []) as any[];
    const chain: any = {
      select: () => chain,
      order: () => chain,
      limit: () => chain,
      eq: (column: string, value: unknown) => { filters.push((row) => row[column] === value); return chain; },
      lt: (column: string, value: string) => { filters.push((row) => row[column] < value); return chain; },
      in: (column: string, values: unknown[]) => { filters.push((row) => values.includes(row[column])); return chain; },
      update: (values: Record<string, unknown>) => { patch = values; return chain; },
      insert: async (value: unknown) => { events.push(value); return { error: null }; },
      maybeSingle: async () => ({ data: rows().filter((row) => filters.every((f) => f(row)))[0] ?? null, error: null }),
      then: (resolve: (value: unknown) => void) => {
        const matched = rows().filter((row) => filters.every((f) => f(row)));
        if (patch) matched.forEach((row) => Object.assign(row, patch));
        resolve({ data: matched, error: null });
      }
    };
    return chain;
  }
  return { db: { from: table }, events };
}

describe("abandoned checkout expiry", () => {
  it("only cancels intents the buyer never finished", () => {
    expect(decideAbandonedCheckout("requires_payment_method")).toBe("cancel_intent");
    expect(decideAbandonedCheckout("requires_action")).toBe("cancel_intent");
    expect(decideAbandonedCheckout("canceled")).toBe("cancel_local");
    expect(decideAbandonedCheckout(null)).toBe("cancel_local");
    expect(decideAbandonedCheckout("requires_capture")).toBe("skip");
    expect(decideAbandonedCheckout("processing")).toBe("skip");
    expect(decideAbandonedCheckout("succeeded")).toBe("skip");
  });

  it("expires a stale unpaid checkout so the listing frees up, and leaves fresh or authorized ones alone", async () => {
    const now = Date.parse("2026-11-20T20:00:00Z");
    const old = new Date(now - ABANDONED_CHECKOUT_AFTER_MS - 60_000).toISOString();
    const fresh = new Date(now - 60_000).toISOString();
    const transactions: Tx[] = [
      { id: "abandoned", status: "pending_payment", created_at: old },
      { id: "authorized", status: "pending_payment", created_at: old },
      { id: "fresh", status: "pending_payment", created_at: fresh }
    ];
    const payments = [
      { id: "p1", transaction_id: "abandoned", status: "requires_action", provider_payment_id: "pi_abandoned" },
      { id: "p2", transaction_id: "authorized", status: "requires_action", provider_payment_id: "pi_authorized" },
      { id: "p3", transaction_id: "fresh", status: "requires_action", provider_payment_id: "pi_fresh" }
    ];
    const stripe = {
      paymentIntents: {
        retrieve: vi.fn(async (id: string) => ({ id, status: id === "pi_authorized" ? "requires_capture" : "requires_payment_method" })),
        cancel: vi.fn(async (id: string) => ({ id, status: "canceled" }))
      }
    };
    const { db } = memoryDb(transactions, payments);
    const result = await expireAbandonedCheckouts(db, { now, stripe });

    expect(result).toEqual({ expired: 1, skipped: 1, failed: 0 });
    expect(stripe.paymentIntents.cancel).toHaveBeenCalledTimes(1);
    expect(stripe.paymentIntents.cancel.mock.calls[0][0]).toBe("pi_abandoned");
    expect(transactions.find((t) => t.id === "abandoned")!.status).toBe("cancelled");
    expect(payments.find((p) => p.id === "p1")!.status).toBe("cancelled");
    expect(transactions.find((t) => t.id === "authorized")!.status).toBe("pending_payment");
    expect(transactions.find((t) => t.id === "fresh")!.status).toBe("pending_payment");
    // A cancelled checkout no longer counts as open, so the listing is available again.
    expect((openCheckoutStatuses as readonly string[]).includes("cancelled")).toBe(false);
  });
});
