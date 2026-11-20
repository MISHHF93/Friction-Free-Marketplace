import { describe, expect, it } from "vitest";
import { AUTO_RELEASE_AFTER_MS, autoReleaseEligible, settlementAmounts } from "@/lib/payments/auto-release";

const deliveredAt = new Date(Date.now() - AUTO_RELEASE_AFTER_MS - 1000).toISOString();

describe("auto release", () => {
  it("releases a delivered held payment only when no dispute is open and the wait has passed", () => {
    expect(autoReleaseEligible({ transactionStatus: "delivered", deliveredAt, paymentStatus: "held", hasOpenDispute: false })).toBe(true);
    expect(autoReleaseEligible({ transactionStatus: "delivered", deliveredAt, paymentStatus: "held", hasOpenDispute: true })).toBe(false);
    expect(autoReleaseEligible({ transactionStatus: "shipped", deliveredAt, paymentStatus: "held", hasOpenDispute: false })).toBe(false);
    expect(autoReleaseEligible({
      transactionStatus: "delivered",
      deliveredAt: new Date().toISOString(),
      paymentStatus: "held",
      hasOpenDispute: false
    })).toBe(false);
  });

  it("maps dispute outcomes onto refund and release amounts", () => {
    expect(settlementAmounts("refund_buyer", 1000, 800)).toEqual({ refundCents: 1000, releaseCents: 0 });
    expect(settlementAmounts("release_seller", 1000, 800)).toEqual({ refundCents: 0, releaseCents: 800 });
    expect(settlementAmounts("split", 1000, 800)).toEqual({ refundCents: 500, releaseCents: 400 });
  });
});