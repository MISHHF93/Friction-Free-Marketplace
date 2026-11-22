import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/stripe/server", () => ({ getStripe: () => { throw new Error("tests pass a stripe stub"); } }));
vi.mock("@/lib/notifications/transaction-events", () => ({
  notifyTransactionParties: vi.fn(async () => true)
}));
vi.mock("@/lib/payments/audit", () => ({
  recordTransactionEvent: vi.fn(async () => undefined)
}));

import { CAPTURE_REMIND_BEFORE_DEADLINE_MS, UNCAPTURED_CANCEL_AFTER_MS, acceptByDeadline, decideUncapturedOrder, remindAndCancelUncapturedOrders } from "@/lib/payments/uncaptured-order";
import { notifyTransactionParties } from "@/lib/notifications/transaction-events";

describe("uncaptured order deadline", () => {
  it("uses 72 hours after authorization unless Stripe's capture_before is sooner", () => {
    const paidAt = "2026-11-20T12:00:00.000Z";
    expect(acceptByDeadline(paidAt).toISOString()).toBe(new Date(Date.parse(paidAt) + UNCAPTURED_CANCEL_AFTER_MS).toISOString());
    expect(acceptByDeadline(paidAt, "2026-11-21T12:00:00.000Z").toISOString()).toBe("2026-11-21T12:00:00.000Z");
  });

  it("reminds 24 hours before the deadline and cancels at the deadline", () => {
    const paidAt = "2026-11-20T12:00:00.000Z";
    const paidMs = Date.parse(paidAt);
    const base = {
      transactionStatus: "paid",
      paymentStatus: "authorized",
      paidAt
    };
    expect(decideUncapturedOrder({ ...base, now: paidMs + 47 * 60 * 60 * 1000 })).toBe("skip");
    expect(decideUncapturedOrder({ ...base, now: paidMs + (UNCAPTURED_CANCEL_AFTER_MS - CAPTURE_REMIND_BEFORE_DEADLINE_MS) })).toBe("remind");
    expect(decideUncapturedOrder({ ...base, reminderSentAt: "2026-11-22T12:00:00.000Z", now: paidMs + 60 * 60 * 60 * 1000 })).toBe("skip");
    expect(decideUncapturedOrder({ ...base, now: paidMs + UNCAPTURED_CANCEL_AFTER_MS })).toBe("cancel");
    expect(decideUncapturedOrder({ ...base, hasOpenDispute: true, now: paidMs + UNCAPTURED_CANCEL_AFTER_MS })).toBe("skip");
    expect(decideUncapturedOrder({ ...base, paymentStatus: "held", now: paidMs + UNCAPTURED_CANCEL_AFTER_MS })).toBe("skip");
  });

  it("reminds once and cancels an uncaptured authorization through Stripe", async () => {
    const now = Date.parse("2026-11-23T13:00:00.000Z");
    const paidAt = new Date(now - UNCAPTURED_CANCEL_AFTER_MS - 60_000).toISOString();
    const remindPaidAt = new Date(now - (UNCAPTURED_CANCEL_AFTER_MS - CAPTURE_REMIND_BEFORE_DEADLINE_MS) - 60_000).toISOString();
    const transactions = [
      { id: "t-cancel", buyer_id: "b1", seller_id: "s1", status: "paid", paid_at: paidAt, listing_id: "l1", metadata: {} },
      { id: "t-remind", buyer_id: "b1", seller_id: "s1", status: "paid", paid_at: remindPaidAt, listing_id: "l1", metadata: {} }
    ];
    const payments = [
      { id: "p-cancel", transaction_id: "t-cancel", status: "authorized", provider_payment_id: "pi_cancel", capture_before: null },
      { id: "p-remind", transaction_id: "t-remind", status: "authorized", provider_payment_id: "pi_remind", capture_before: null }
    ];
    const disputes: Array<{ transaction_id: string; status: string }> = [];

    function table(name: string) {
      const filters: Array<(row: any) => boolean> = [];
      let patch: Record<string, unknown> | null = null;
      const rows = () => name === "transactions" ? transactions : name === "escrow_payments" ? payments : disputes;
      const chain: any = {
        select: () => chain,
        order: () => chain,
        limit: () => chain,
        eq: (column: string, value: unknown) => { filters.push((row) => row[column] === value); return chain; },
        not: (column: string, op: string, value: unknown) => {
          if (op === "is" && value === null) filters.push((row) => row[column] != null);
          return chain;
        },
        update: (values: Record<string, unknown>) => { patch = values; return chain; },
        maybeSingle: async () => ({ data: rows().filter((row) => filters.every((f) => f(row)))[0] ?? null, error: null }),
        then: (resolve: (value: unknown) => void) => {
          const matched = rows().filter((row) => filters.every((f) => f(row)));
          if (patch) matched.forEach((row) => Object.assign(row, patch));
          resolve({ data: matched, error: null });
        }
      };
      return chain;
    }

    const stripe = {
      paymentIntents: {
        retrieve: vi.fn(async (id: string) => ({ id, status: "requires_capture" })),
        cancel: vi.fn(async (id: string) => ({ id, status: "canceled" }))
      }
    };
    const result = await remindAndCancelUncapturedOrders({ from: table }, { now, stripe });
    expect(result.cancelled).toBe(1);
    expect(result.reminded).toBe(1);
    expect(stripe.paymentIntents.cancel).toHaveBeenCalledTimes(1);
    expect(stripe.paymentIntents.cancel.mock.calls[0][0]).toBe("pi_cancel");
    expect(transactions.find((row) => row.id === "t-cancel")!.status).toBe("cancelled");
    expect((transactions.find((row) => row.id === "t-remind")!.metadata as { capture_reminder_sent_at?: string }).capture_reminder_sent_at).toBeTruthy();
    expect(vi.mocked(notifyTransactionParties).mock.calls.some((call) => call[1].template === "order_capture_reminder")).toBe(true);
    expect(vi.mocked(notifyTransactionParties).mock.calls.some((call) => call[1].template === "order_authorization_cancelled")).toBe(true);
  });
});
