import { describe, expect, it } from "vitest";
import { AUTO_RELEASE_AFTER_MS, AUTO_RELEASE_SHIPPED_MS, autoReleaseEligible } from "@/lib/payments/auto-release";
import { buildSettlementPlan, planFromStored, settlementLegs } from "@/lib/payments/settlement-plan";
import { isEscrowTransition } from "@/lib/payments/escrow";

const deliveredAt = new Date(Date.now() - AUTO_RELEASE_AFTER_MS - 1000).toISOString();
const shippedAt = new Date(Date.now() - AUTO_RELEASE_SHIPPED_MS - 1000).toISOString();

describe("auto release", () => {
  it("releases delivered payments after 3 days and shipped payments after 14 days", () => {
    expect(autoReleaseEligible({ transactionStatus: "delivered", deliveredAt, paymentStatus: "held", hasOpenDispute: false })).toBe(true);
    expect(autoReleaseEligible({ transactionStatus: "delivered", deliveredAt, paymentStatus: "held", hasOpenDispute: true })).toBe(false);
    expect(autoReleaseEligible({ transactionStatus: "shipped", shippedAt, paymentStatus: "held", hasOpenDispute: false })).toBe(true);
    expect(autoReleaseEligible({ transactionStatus: "shipped", shippedAt: new Date().toISOString(), paymentStatus: "held", hasOpenDispute: false })).toBe(false);
  });
});

describe("dispute settlement plan", () => {
  const disputeId = "11111111-1111-4111-8111-111111111111";

  it("prorates from the original amount and keeps that plan on retry", () => {
    const first = buildSettlementPlan({ disputeId, outcome: "split", originalAmountCents: 1000, originalSellerNetCents: 800, priorRefundedCents: 0 });
    const stored = planFromStored(first);
    const recomputed = buildSettlementPlan({ disputeId, outcome: "split", originalAmountCents: 1000, originalSellerNetCents: 800, priorRefundedCents: first.refundCents });
    expect(first).toMatchObject({ refundCents: 500, releaseCents: 400, refundKey: `dispute:${disputeId}:refund`, releaseKey: `dispute:${disputeId}:release` });
    expect(first.refundCents + first.releaseCents).toBeLessThanOrEqual(first.remainingCents);
    expect(stored).toEqual(first);
    expect(recomputed.refundCents).not.toBe(first.refundCents);
    expect(settlementLegs(first, { refundIds: [], payoutKeys: [] })).toEqual({ refund: true, release: true });
    expect(settlementLegs(first, { refundIds: [first.refundKey], payoutKeys: [] })).toEqual({ refund: false, release: true });
    expect(settlementLegs(first, { refundIds: [first.refundKey], payoutKeys: [first.releaseKey] })).toEqual({ refund: false, release: false });
  });

  it("allows the settlement release only after the dispute claim, not while disputed", () => {
    expect(isEscrowTransition("held", "releasing")).toBe(true);
    expect(isEscrowTransition("capturing", "cancelled")).toBe(true);
    expect(isEscrowTransition("releasing", "cancelled")).toBe(true);
    expect(isEscrowTransition("releasing", "authorized")).toBe(true);
  });
});
