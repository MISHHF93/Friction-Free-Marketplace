import { describe, expect, it } from "vitest";
import {
  checkoutStripeIdempotencyKey,
  parseIdempotencyKey,
} from "@/lib/payments/idempotency";

describe("checkout idempotency", () => {
  it("accepts UUID and constrained client keys", () => {
    expect(parseIdempotencyKey("7f8a67d7-a45f-4cf1-b7bc-a13f2a314087")).toBe(
      "7f8a67d7-a45f-4cf1-b7bc-a13f2a314087"
    );
    expect(parseIdempotencyKey("checkout_attempt:1234")).toBe("checkout_attempt:1234");
  });

  it("rejects absent, short, or unsafe keys", () => {
    expect(parseIdempotencyKey(null)).toBeNull();
    expect(parseIdempotencyKey("short")).toBeNull();
    expect(parseIdempotencyKey("contains spaces and /slashes")).toBeNull();
  });

  it("builds a stable Stripe key independent of transaction creation", () => {
    const first = checkoutStripeIdempotencyKey("buyer-1", "attempt-1234");
    const retry = checkoutStripeIdempotencyKey("buyer-1", "attempt-1234");
    expect(first).toBe(retry);
    expect(first).not.toContain("transaction");
  });
});
