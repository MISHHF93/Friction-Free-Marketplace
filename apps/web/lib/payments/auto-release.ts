export const AUTO_RELEASE_AFTER_MS = 3 * 24 * 60 * 60 * 1000;
export const AUTO_RELEASE_SHIPPED_MS = 14 * 24 * 60 * 60 * 1000;

const OPEN_DISPUTE_STATUSES = ["opened", "under_review", "awaiting_buyer", "awaiting_seller"];

export function isOpenDisputeStatus(status: string | null | undefined) {
  return OPEN_DISPUTE_STATUSES.includes(String(status ?? ""));
}

export const autoReleaseCandidateFilter = "metadata->>auto_release_ineligible.is.null,metadata->>auto_release_ineligible.neq.true";
export const autoReleaseCheckColumn = "metadata->>last_auto_release_check_at";

export function stampAutoReleaseCheck(metadata: Record<string, unknown> | null | undefined, checkedAt: string) {
  return { ...(metadata ?? {}), last_auto_release_check_at: checkedAt };
}

const terminalPaymentStatuses = new Set(["cancelled", "refunded", "released", "failed"]);

/** Only a finished payment is a permanent reason to stop retrying auto-release. */
export function durableAutoReleaseSkip(paymentStatus: string | null | undefined) {
  const status = String(paymentStatus ?? "");
  return terminalPaymentStatuses.has(status) ? status : null;
}

export function autoReleaseEligible(input: {
  transactionStatus: string;
  deliveredAt?: string | null;
  shippedAt?: string | null;
  paymentStatus: string;
  hasOpenDispute: boolean;
  now?: number;
}) {
  if (input.paymentStatus !== "held" || input.hasOpenDispute) return false;
  const now = input.now ?? Date.now();
  if (input.transactionStatus === "delivered" && input.deliveredAt) {
    const delivered = new Date(input.deliveredAt).getTime();
    return !Number.isNaN(delivered) && now - delivered >= AUTO_RELEASE_AFTER_MS;
  }
  if (input.transactionStatus === "shipped" && input.shippedAt) {
    const shipped = new Date(input.shippedAt).getTime();
    return !Number.isNaN(shipped) && now - shipped >= AUTO_RELEASE_SHIPPED_MS;
  }
  return false;
}
