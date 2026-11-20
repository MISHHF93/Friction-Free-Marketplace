export function stripeSecretMode(secret: string) {
  if (secret.startsWith("sk_live_") || secret.startsWith("rk_live_")) return "live" as const;
  if (secret.startsWith("sk_test_") || secret.startsWith("rk_test_")) return "test" as const;
  return "invalid" as const;
}

export function stripeSecretIsLive(secret: string) {
  return stripeSecretMode(secret) === "live";
}

const forwardStatuses = ["pending_payment", "paid", "escrowed", "shipped", "delivered", "completed"] as const;

/** Later checkout states must not be overwritten by an older webhook. */
export function canApplyTransactionStatus(current: string | null | undefined, next: string) {
  if (!current || current === next) return true;
  if (current === "resolving") return false;
  if (next === "refunded") return current !== "cancelled" && current !== "refunded" && current !== "completed" && current !== "resolving";
  if (["cancelled", "refunded", "disputed", "completed", "resolving"].includes(current)) return false;
  const from = forwardStatuses.indexOf(current as (typeof forwardStatuses)[number]);
  const to = forwardStatuses.indexOf(next as (typeof forwardStatuses)[number]);
  if (from === -1 || to === -1) return next === "cancelled" || next === "refunded" || next === "disputed";
  return to >= from;
}
