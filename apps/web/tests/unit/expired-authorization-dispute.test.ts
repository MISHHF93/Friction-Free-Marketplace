import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/payments/audit", () => ({ recordTransactionEvent: vi.fn(async () => null) }));
vi.mock("@/lib/notifications/transaction-events", () => ({ notifyTransactionParties: vi.fn(async () => true) }));

import { closeDisputeForExpiredAuthorization, shouldCloseDisputeForExpiredAuthorization } from "@/lib/payments/expired-authorization-dispute";

describe("dispute on an authorization that expired", () => {
  it("applies only to a cancelled, never-captured intent on a disputed order", () => {
    expect(shouldCloseDisputeForExpiredAuthorization({ intentStatus: "canceled", transactionStatus: "disputed", paymentStatus: "authorized" })).toBe(true);
    expect(shouldCloseDisputeForExpiredAuthorization({ intentStatus: "canceled", transactionStatus: "disputed", paymentStatus: "held" })).toBe(false);
    expect(shouldCloseDisputeForExpiredAuthorization({ intentStatus: "canceled", transactionStatus: "paid", paymentStatus: "authorized" })).toBe(false);
    expect(shouldCloseDisputeForExpiredAuthorization({ intentStatus: "succeeded", transactionStatus: "disputed", paymentStatus: "authorized" })).toBe(false);
  });

  it("closes the dispute and cancels the order instead of leaving it stuck", async () => {
    const state = { payment: "authorized", dispute: "opened", transaction: "disputed" };
    const db = {
      from(table: string) {
        let patch: Record<string, string> = {};
        const chain: any = {
          update: (values: Record<string, string>) => { patch = values; return chain; },
          eq: () => chain,
          in: () => chain,
          select: async () => {
            if (table === "escrow_payments") state.payment = patch.status;
            if (table === "disputes") state.dispute = patch.status;
            if (table === "transactions") state.transaction = patch.status;
            return { data: [{ id: "x" }], error: null };
          }
        };
        return chain;
      }
    };
    await expect(closeDisputeForExpiredAuthorization(db, { transactionId: "t1", paymentId: "p1", intentId: "pi_1" })).resolves.toBe(true);
    expect(state).toEqual({ payment: "cancelled", dispute: "closed", transaction: "cancelled" });
  });
});
