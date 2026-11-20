import { describe, expect, it } from "vitest";
import { isEscrowTransition } from "@/lib/payments/escrow";
import { nextRefundedAmount } from "@/lib/payments/refund-amount";
import { isGenuinePostCompletionRefund, paymentSourcesForIntent, reconcileStuckPayment, refundMayOverwriteStatus } from "@/lib/payments/webhook-guards";

describe("escrow transition allow-list", () => {
  it("allows capture, release, refund, and their rollbacks only", () => {
    expect(isEscrowTransition("authorized", "capturing")).toBe(true);
    expect(isEscrowTransition("capturing", "held")).toBe(true);
    expect(isEscrowTransition("capturing", "authorized")).toBe(true);
    expect(isEscrowTransition("held", "releasing")).toBe(true);
    expect(isEscrowTransition("releasing", "held")).toBe(true);
    expect(isEscrowTransition("held", "refunding")).toBe(true);
    expect(isEscrowTransition("released", "held")).toBe(false);
    expect(isEscrowTransition("releasing", "refunded")).toBe(false);
  });
});

describe("webhook status guards", () => {
  it("does not let a late authorization event rewrite an in-flight capture or release", () => {
    expect(paymentSourcesForIntent("requires_capture")).toEqual(["requires_action", "authorized"]);
    expect(paymentSourcesForIntent("succeeded")).toEqual(["authorized", "capturing"]);
    expect(paymentSourcesForIntent("canceled")).not.toContain("held");
    expect(paymentSourcesForIntent("canceled")).not.toContain("releasing");
    expect(refundMayOverwriteStatus("releasing")).toBe(false);
    expect(refundMayOverwriteStatus("released")).toBe(false);
    expect(refundMayOverwriteStatus("held")).toBe(true);
  });

  it("treats only a full refund of a completed order as a post-completion refund", () => {
    expect(isGenuinePostCompletionRefund("completed", true)).toBe(true);
    expect(isGenuinePostCompletionRefund("completed", false)).toBe(false);
    expect(isGenuinePostCompletionRefund("escrowed", true)).toBe(false);
  });
});

describe("stuck payment reconcile", () => {
  it("maps Stripe state back onto capturing, releasing, and refunding rows", () => {
    expect(reconcileStuckPayment({ status: "capturing", intentStatus: "succeeded", hasTransfer: false, refundedCents: 0, amountCents: 1000 })).toBe("held");
    expect(reconcileStuckPayment({ status: "capturing", intentStatus: "requires_capture", hasTransfer: false, refundedCents: 0, amountCents: 1000 })).toBe("authorized");
    expect(reconcileStuckPayment({ status: "releasing", intentStatus: "succeeded", hasTransfer: true, refundedCents: 0, amountCents: 1000 })).toBe("released");
    expect(reconcileStuckPayment({ status: "releasing", intentStatus: "succeeded", hasTransfer: false, refundedCents: 0, amountCents: 1000 })).toBe("held");
    expect(reconcileStuckPayment({ status: "refunding", intentStatus: "succeeded", hasTransfer: false, refundedCents: 1000, amountCents: 1000 })).toBe("refunded");
  });
});

describe("refund amount dedupe", () => {
  it("does not add the same Stripe refund twice", () => {
    const first = nextRefundedAmount(0, "re_1", [], 10);
    const second = nextRefundedAmount(first.amount, "re_1", first.ids, 10);
    expect(first).toMatchObject({ amount: 10, duplicate: false });
    expect(second).toMatchObject({ amount: 10, duplicate: true });
  });
});
