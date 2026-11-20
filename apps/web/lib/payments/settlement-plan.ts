export type SettlementOutcome = "refund_buyer" | "release_seller" | "split";

export type SettlementPlan = {
  outcome: SettlementOutcome;
  originalAmountCents: number;
  originalSellerNetCents: number;
  priorRefundedCents: number;
  remainingCents: number;
  refundCents: number;
  releaseCents: number;
  refundKey: string;
  releaseKey: string;
};

export function settlementKeys(disputeId: string) {
  return {
    refundKey: `dispute:${disputeId}:refund`,
    releaseKey: `dispute:${disputeId}:release`
  };
}

export function buildSettlementPlan(input: {
  disputeId: string;
  outcome: SettlementOutcome;
  originalAmountCents: number;
  originalSellerNetCents: number;
  priorRefundedCents: number;
}): SettlementPlan {
  const original = Math.max(0, input.originalAmountCents);
  const prior = Math.min(original, Math.max(0, input.priorRefundedCents));
  const remaining = original - prior;
  const proratedNet = original === 0 ? 0 : Math.floor((Math.max(0, input.originalSellerNetCents) * remaining) / original);
  let refundCents = 0;
  let releaseCents = 0;
  if (input.outcome === "refund_buyer") refundCents = remaining;
  else if (input.outcome === "release_seller") releaseCents = Math.min(proratedNet, remaining);
  else {
    refundCents = Math.floor(remaining / 2);
    releaseCents = Math.min(Math.floor(proratedNet / 2), remaining - refundCents);
  }
  if (refundCents < 0 || releaseCents < 0 || refundCents + releaseCents > remaining) {
    throw new Error("Settlement plan is outside the remaining held funds.");
  }
  return {
    outcome: input.outcome,
    originalAmountCents: original,
    originalSellerNetCents: Math.max(0, input.originalSellerNetCents),
    priorRefundedCents: prior,
    remainingCents: remaining,
    refundCents,
    releaseCents,
    ...settlementKeys(input.disputeId)
  };
}

export function planFromStored(value: unknown): SettlementPlan | null {
  if (!value || typeof value !== "object") return null;
  const plan = value as Partial<SettlementPlan>;
  if (plan.outcome !== "refund_buyer" && plan.outcome !== "release_seller" && plan.outcome !== "split") return null;
  if (!Number.isInteger(plan.refundCents) || !Number.isInteger(plan.releaseCents) || typeof plan.refundKey !== "string" || typeof plan.releaseKey !== "string") return null;
  return plan as SettlementPlan;
}

export function settlementLegs(plan: SettlementPlan, state: { refundIds: string[]; payoutKeys: string[] }) {
  return {
    refund: plan.refundCents > 0 && !state.refundIds.includes(plan.refundKey),
    release: plan.releaseCents > 0 && !state.payoutKeys.includes(plan.releaseKey)
  };
}

export function paymentAlreadySettled(status: string | null | undefined, plan: SettlementPlan) {
  if (plan.releaseCents > 0 && plan.refundCents === 0) return status === "released";
  if (plan.refundCents > 0 && plan.releaseCents === 0) return status === "refunded";
  return status === "released" || status === "refunded";
}
