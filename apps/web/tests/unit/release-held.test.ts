import { beforeEach, describe, expect, it, vi } from "vitest";

const transfers = vi.fn();
vi.mock("@/lib/stripe/server", () => ({ getStripe: () => ({ transfers: { create: (...args: unknown[]) => transfers(...args) } }) }));
vi.mock("@/lib/payments/resume", () => ({ prepareEscrowAction: async (_db: unknown, payment: Record<string, unknown>) => ({ payment: { ...payment, status: "releasing" } }) }));
vi.mock("@/lib/payments/escrow", () => ({ claimEscrowPayment: vi.fn(async () => true), claimTransactionStatus: vi.fn(async () => true), escrowActionKey: (...parts: string[]) => parts.join(":") }));
vi.mock("@/lib/financial/ledger", () => ({ buildReleaseJournal: (input: unknown) => input, postLedgerJournal: vi.fn(async () => null) }));
vi.mock("@/lib/payments/audit", () => ({ recordTransactionEvent: vi.fn(async () => null) }));

import { releaseHeldEscrow } from "@/lib/payments/release-held";

function db(sellerStatus = "active") {
  const writes: Array<{ table: string; values: unknown }> = [];
  return {
    writes,
    from(table: string) {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        insert: async (values: unknown) => { writes.push({ table, values }); return { error: null }; },
        upsert: async (values: unknown) => { writes.push({ table, values }); return { error: null }; },
        update: (values: unknown) => { writes.push({ table, values }); return chain; },
        maybeSingle: async () => ({ data: table === "users" ? { status: sellerStatus } : null, error: null }),
        then: (resolve: (v: unknown) => void) => resolve({ data: [{ id: "x" }], error: null })
      };
      return chain;
    }
  };
}

const transaction = { id: "t1", buyer_id: "b1", seller_id: "s1", listing_id: "l1", status: "delivered", item_amount: 100, shipping_amount: 0, tax_amount: 0 };

describe("releaseHeldEscrow (single release path)", () => {
  beforeEach(() => transfers.mockReset().mockResolvedValue({ id: "tr_1", transfer_group: "transaction_t1" }));

  it("caps the transfer at what remains after a partial refund", async () => {
    const payment = { id: "p1", status: "held", amount: 100, seller_net_amount: 90, platform_fee_amount: 10, refunded_amount: 30, currency: "USD", provider_charge_id: "ch_1" };
    const result = await releaseHeldEscrow(db(), { transaction, payment, sellerAccountId: "acct_1" });
    expect(transfers).toHaveBeenCalledTimes(1);
    expect((transfers.mock.calls[0][0] as { amount: number }).amount).toBe(7000);
    expect(result).toMatchObject({ status: "completed", transferredAmount: 70 });
  });

  it("transfers the full seller net with no refund", async () => {
    const payment = { id: "p1", status: "held", amount: 100, seller_net_amount: 90, platform_fee_amount: 10, refunded_amount: 0, currency: "USD", provider_charge_id: "ch_1" };
    await releaseHeldEscrow(db(), { transaction, payment, sellerAccountId: "acct_1" });
    expect((transfers.mock.calls[0][0] as { amount: number }).amount).toBe(9000);
  });

  it("refuses when everything was refunded and when the seller is restricted", async () => {
    const refunded = { id: "p1", status: "held", amount: 100, seller_net_amount: 90, platform_fee_amount: 10, refunded_amount: 100, currency: "USD", provider_charge_id: "ch_1" };
    await expect(releaseHeldEscrow(db(), { transaction, payment: refunded, sellerAccountId: "acct_1" })).resolves.toMatchObject({ statusCode: 409 });
    const payment = { ...refunded, refunded_amount: 0 };
    await expect(releaseHeldEscrow(db("suspended"), { transaction, payment, sellerAccountId: "acct_1" })).resolves.toMatchObject({ statusCode: 409 });
    expect(transfers).not.toHaveBeenCalled();
  });

  it("writes the receipt with the amount actually transferred", async () => {
    const database = db();
    const payment = { id: "p1", status: "held", amount: 100, seller_net_amount: 90, platform_fee_amount: 10, refunded_amount: 30, currency: "USD", provider_charge_id: "ch_1" };
    await releaseHeldEscrow(database, { transaction, payment, sellerAccountId: "acct_1" });
    const receipt = database.writes.find((write) => write.table === "transaction_receipts")!.values as { seller_net_amount: number };
    expect(receipt.seller_net_amount).toBe(70);
  });
});

describe("buyer release route uses the shared path", () => {
  it("does not create its own Stripe transfer", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync("app/api/stripe/transactions/[id]/release/route.ts", "utf8");
    expect(source).toContain("releaseHeldEscrow");
    expect(source).not.toContain("transfers.create");
  });
});
