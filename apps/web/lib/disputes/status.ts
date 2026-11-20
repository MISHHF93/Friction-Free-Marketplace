/** Disputes waiting on a party or an admin. */
export const OPEN_DISPUTE_STATUSES = ["opened", "awaiting_buyer", "awaiting_seller", "under_review"] as const;
/** Open disputes plus one whose settlement is in progress. Money must not move outside the settlement while any of these exist. */
export const UNSETTLED_DISPUTE_STATUSES = [...OPEN_DISPUTE_STATUSES, "resolving"] as const;

export function isUnsettledDisputeStatus(status: string | null | undefined) {
  return (UNSETTLED_DISPUTE_STATUSES as readonly string[]).includes(String(status ?? ""));
}
