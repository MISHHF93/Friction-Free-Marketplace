/** Client-side Idempotency-Key for one checkout attempt. */
export function newAdRequestKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `ad-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}
