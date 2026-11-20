export const AUTO_RELEASE_AFTER_MS = 3 * 24 * 60 * 60 * 1000;

const OPEN_DISPUTE_STATUSES = ["opened", "under_review", "awaiting_buyer", "awaiting_seller"];

export function isOpenDisputeStatus(status: string | null | undefined) {
  return OPEN_DISPUTE_STATUSES.includes(String(status ?? ""));
}

export function autoReleaseEligible(input: {
  transactionStatus: string;
  deliveredAt: string | null | undefined;
  paymentStatus: string;
  hasOpenDispute: boolean;
  now?: number;
}) {
  if (input.transactionStatus !== "delivered" || input.paymentStatus !== "held" || input.hasOpenDispute) return false;
  if (!input.deliveredAt) return false;
  const delivered = new Date(input.deliveredAt).getTime();
  if (Number.isNaN(delivered)) return false;
  return (input.now ?? Date.now()) - delivered >= AUTO_RELEASE_AFTER_MS;
}

export function settlementAmounts(outcome: "refund_buyer" | "release_seller" | "split", amountCents: number, sellerNetCents: number) {
  if (outcome === "refund_buyer") return { refundCents: amountCents, releaseCents: 0 };
  if (outcome === "release_seller") return { refundCents: 0, releaseCents: sellerNetCents };
  const refundCents = Math.floor(amountCents / 2);
  const releaseCents = Math.max(0, sellerNetCents - Math.floor(sellerNetCents / 2));
  return { refundCents, releaseCents };
}
