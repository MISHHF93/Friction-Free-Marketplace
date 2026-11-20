import { beforeEach, describe, expect, it, vi } from "vitest";

const updates: Array<{ values: Record<string, unknown>; filters: unknown[] }> = [];
let paymentStatus = "releasing";

function builder(table: string) {
  const state: { values?: Record<string, unknown>; filters: unknown[]; op?: string } = { filters: [] };
  const chain: Record<string, unknown> = {};
  const self = new Proxy(chain, {
    get(_target, property) {
      if (property === "then") {
        return (resolve: (value: unknown) => unknown) => {
          if (state.op === "update") {
            updates.push({ values: state.values ?? {}, filters: state.filters });
            const statusFilter = state.filters.find((filter) => Array.isArray(filter) && filter[0] === "status" && Array.isArray(filter[1])) as [string, string[]] | undefined;
            const allowed = !statusFilter || statusFilter[1].includes(paymentStatus);
            return Promise.resolve({ data: allowed ? [{ id: "pay-1" }] : [], error: null }).then(resolve);
          }
          return Promise.resolve({ data: [], error: null }).then(resolve);
        };
      }
      return (...args: unknown[]) => {
        if (property === "update") {
          state.op = "update";
          state.values = args[0] as Record<string, unknown>;
        }
        if (property === "insert") state.op = "insert";
        if (property === "eq" || property === "in" || property === "is") state.filters.push(args);
        if (property === "maybeSingle" || property === "single") {
          if (table === "transactions") return Promise.resolve({ data: { id: "tx-1", status: "escrowed", buyer_id: "b", seller_id: "s" }, error: null });
          if (table === "escrow_payments" && state.op !== "update") return Promise.resolve({ data: { id: "pay-1", status: paymentStatus, transaction_id: "tx-1", amount: 20, currency: "USD" }, error: null });
          if (table === "stripe_webhook_events") return Promise.resolve({ data: { id: "evt_1" }, error: null });
          return Promise.resolve({ data: null, error: null });
        }
        return self;
      };
    }
  });
  return self;
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => builder(table)
  })
}));

vi.mock("@/lib/stripe/server", () => ({ getStripe: () => ({}) }));
vi.mock("@/lib/payments/audit", () => ({ recordTransactionEvent: vi.fn(async () => undefined) }));
vi.mock("@/lib/financial/ledger", () => ({
  buildCaptureJournal: vi.fn(() => ({})),
  buildDisputeHoldJournal: vi.fn(() => ({})),
  postLedgerJournal: vi.fn(async () => undefined)
}));
vi.mock("@/lib/payments/connect", () => ({ upsertSellerAccountFromStripe: vi.fn() }));

describe("webhook arriving during an escrow claim", () => {
  beforeEach(() => {
    updates.length = 0;
    paymentStatus = "releasing";
  });

  it("does not move a releasing payment back to held when capture succeeds", async () => {
    const { updatePaymentIntent } = await import("@/lib/payments/stripe-events");
    await updatePaymentIntent({
      id: "pi_1",
      status: "succeeded",
      amount: 2000,
      amount_received: 2000,
      currency: "usd",
      metadata: { transaction_id: "tx-1" },
      latest_charge: "ch_1"
    } as never);

    const heldUpdate = updates.find((update) => update.values.status === "held");
    expect(heldUpdate?.filters).toEqual(expect.arrayContaining([["status", ["authorized", "capturing"]]]));
    expect(updates.some((update) => update.values.status === "escrowed")).toBe(false);
  });
});
