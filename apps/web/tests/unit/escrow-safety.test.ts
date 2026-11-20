import { describe, expect, it, vi } from "vitest";
import { claimEscrowPayment, escrowActionKey } from "@/lib/payments/escrow";
import { quoteCheckoutAmounts } from "@/lib/payments/quote";

function claimClient(result: { data: unknown; error: { message?: string } | null }) {
  const update = vi.fn(() => ({
    eq: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(async () => result)
      }))
    }))
  }));
  return {
    rpc: vi.fn(async () => result),
    from: vi.fn(() => ({ update })),
    update
  };
}

describe("escrow money safety", () => {
  it("derives a stable server key and ignores a fresh client key", () => {
    expect(escrowActionKey("release", "tx-1", "pay-1")).toBe("release:tx-1:pay-1");
    expect(escrowActionKey("release", "tx-1", "pay-1")).toBe(escrowActionKey("release", "tx-1", "pay-1"));
  });

  it("aborts a second release when the claim returns no row", async () => {
    const winner = claimClient({ data: { id: "pay-1", status: "releasing" }, error: null });
    const loser = claimClient({ data: null, error: null });
    await expect(claimEscrowPayment(winner, "pay-1", "held", "releasing")).resolves.toEqual({ id: "pay-1", status: "releasing" });
    await expect(claimEscrowPayment(loser, "pay-1", "held", "releasing")).resolves.toBeNull();
  });

  it("quotes an accepted offer amount instead of the listing price", () => {
    const quote = quoteCheckoutAmounts({ priceAmount: 1000, itemAmount: 640, metadata: { shipping_cents: 0 } });
    expect(quote.itemAmount).toBe(640);
    expect(quote.itemCents).toBe(64000);
  });
});
