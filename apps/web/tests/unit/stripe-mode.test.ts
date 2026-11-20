import { describe, expect, it } from "vitest";
import { canApplyTransactionStatus, stripeSecretIsLive, stripeSecretMode } from "@/lib/payments/stripe-mode";

describe("stripe key mode", () => {
  it("treats restricted live keys as live", () => {
    expect(stripeSecretMode("rk_live_123")).toBe("live");
    expect(stripeSecretMode("sk_live_123")).toBe("live");
    expect(stripeSecretMode("rk_test_123")).toBe("test");
    expect(stripeSecretIsLive("rk_live_123")).toBe(true);
    expect(stripeSecretIsLive("sk_test_123")).toBe(false);
  });
});

describe("transaction status guard", () => {
  it("allows forward moves and blocks replay over a finished order", () => {
    expect(canApplyTransactionStatus("pending_payment", "paid")).toBe(true);
    expect(canApplyTransactionStatus("escrowed", "paid")).toBe(false);
    expect(canApplyTransactionStatus("completed", "cancelled")).toBe(false);
    expect(canApplyTransactionStatus("paid", "cancelled")).toBe(true);
    expect(canApplyTransactionStatus(null, "paid")).toBe(true);
  });
});
