const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,199}$/;

export function parseIdempotencyKey(value: string | null) {
  const key = value?.trim() ?? "";
  return IDEMPOTENCY_KEY_PATTERN.test(key) ? key : null;
}

export function checkoutStripeIdempotencyKey(buyerId: string, key: string) {
  return `checkout:${buyerId}:${key}`;
}
