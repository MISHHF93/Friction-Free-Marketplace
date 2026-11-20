import { describe, expect, it } from "vitest";
import { sellerConnectCountry } from "@/lib/payments/connect";
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

describe("seller connect country", () => {
  it("accepts the United States and Canada only", () => {
    expect(sellerConnectCountry("ca")).toBe("CA");
    expect(sellerConnectCountry("US")).toBe("US");
    expect(sellerConnectCountry("MX")).toBeNull();
    expect(sellerConnectCountry(null)).toBeNull();
  });
});

describe("transaction status guard", () => {
  it("allows forward moves and blocks replay over a finished order", () => {
    expect(canApplyTransactionStatus("pending_payment", "paid")).toBe(true);
    expect(canApplyTransactionStatus("escrowed", "paid")).toBe(false);
    expect(canApplyTransactionStatus("completed", "cancelled")).toBe(false);
    expect(canApplyTransactionStatus("escrowed", "refunded")).toBe(true);
    expect(canApplyTransactionStatus("completed", "refunded")).toBe(true);
    expect(canApplyTransactionStatus("cancelled", "refunded")).toBe(false);
    expect(canApplyTransactionStatus("paid", "cancelled")).toBe(true);
    expect(canApplyTransactionStatus(null, "paid")).toBe(true);
  });
});
