import { describe, expect, it } from "vitest";
import { assertSellerPayoutsReady, PAYOUTS_REQUIRED_MESSAGE, sellerPayoutsReady } from "@/lib/listings/payout-readiness";

function db(row: unknown, error: unknown = null) {
  const chain = { select: () => chain, eq: () => chain, maybeSingle: async () => ({ data: row, error }) };
  return { from: () => chain };
}

describe("publish requires payouts", () => {
  it("treats only active accounts with charges enabled as ready", () => {
    expect(sellerPayoutsReady({ status: "active", charges_enabled: true })).toBe(true);
    expect(sellerPayoutsReady({ status: "active", charges_enabled: false })).toBe(false);
    expect(sellerPayoutsReady({ status: "onboarding", charges_enabled: true })).toBe(false);
    expect(sellerPayoutsReady(null)).toBe(false);
  });

  it("refuses publishing with a set-up-payouts message", async () => {
    await expect(assertSellerPayoutsReady(db(null), "s1")).rejects.toMatchObject({ message: PAYOUTS_REQUIRED_MESSAGE, status: 409 });
    await expect(assertSellerPayoutsReady(db({ status: "restricted", charges_enabled: false }), "s1")).rejects.toThrow(/Set up payouts/);
    await expect(assertSellerPayoutsReady(db(null, { message: "boom" }), "s1")).rejects.toMatchObject({ status: 409 });
  });

  it("allows publishing for a ready seller", async () => {
    await expect(assertSellerPayoutsReady(db({ status: "active", charges_enabled: true }), "s1")).resolves.toBeUndefined();
  });
});
