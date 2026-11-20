import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

const cancel = vi.fn(async () => ({}));
const capture = vi.fn(async () => {
  throw new Error("already captured");
});
const retrieve = vi.fn(async () => ({ status: "succeeded", latest_charge: "ch_1" }));

vi.mock("@/lib/stripe/server", () => ({
  getStripe: () => ({
    paymentIntents: { cancel, capture, retrieve },
    transfers: { create: async () => { throw new Error("no transfer"); } }
  })
}));

import { settleDispute } from "@/lib/payments/settlement";

const migration = readFileSync(resolve(__dirname, "../../../../supabase/migrations/20260728160000_round7_followups.sql"), "utf8");

function supabaseFor(paymentStatus: "authorized" | "held", claimFails = false) {
  const updates: Array<{ table: string; status?: string; filters: unknown[] }> = [];
  const filters: unknown[] = [];
  function client(table: string) {
    const api = {
      select() { return api; },
      eq(column: string, value: unknown) {
        filters.push([table, column, value]);
        return api;
      },
      in() { return api; },
      update(values: { status?: string }) {
        updates.push({ table, status: values.status, filters: [...filters] });
        return api;
      },
      maybeSingle: async () => {
        if (table === "disputes") return { data: { id: "d1", transaction_id: "t1", status: "opened", settlement_plan: null } };
        if (table === "transactions") return { data: { id: "t1", status: "disputed", listing_id: "listing-1", buyer_id: "buyer", seller_id: "seller" } };
        if (table === "escrow_payments") {
          return { data: { id: "p1", status: paymentStatus, amount: 20, seller_net_amount: 16, platform_fee_amount: 4, refunded_amount: 0, currency: "usd", provider_payment_id: "pi_1", metadata: {}, updated_at: new Date().toISOString() } };
        }
        if (table === "payouts") return { data: [] };
        return { data: null };
      },
      then(resolve: (value: { data: Array<{ id: string; status: string }>; error: null }) => void) {
        resolve({ data: [{ id: "row", status: paymentStatus === "authorized" ? "capturing" : "held" }], error: null });
      }
    };
    return api;
  }
  return {
    updates,
    filters,
    client: {
      from: client,
      rpc: async (name: string, args?: { p_plan?: { outcome?: string }; p_to?: string }) => {
        if (name === "claim_dispute_settlement") {
          if (claimFails) return { data: null, error: { message: "The dispute could not be claimed." } };
          return { data: { id: "d1", status: "resolving", settlement_plan: args?.p_plan }, error: null };
        }
        if (name === "claim_escrow_payment") return { data: { id: "p1", status: args?.p_to ?? "cancelled" }, error: null };
        return { data: "ok", error: null };
      }
    }
  };
}

describe("uncaptured dispute close", () => {
  it("claims the dispute and only resolves it from the resolving status", async () => {
    const db = supabaseFor("authorized");
    const result = await settleDispute(db.client, { disputeId: "d1", outcome: "refund_buyer", actorId: "admin", reason: "Buyer asked to cancel" });
    expect(result).toMatchObject({ ok: true, outcome: "refund_buyer" });
    expect(cancel).toHaveBeenCalled();
    expect(db.updates.some((update) => update.table === "disputes" && update.status === "resolved_buyer")).toBe(true);
    expect(db.filters).toContainEqual(["disputes", "status", "resolving"]);
  });

  it("does not close the dispute when the claim loses the race", async () => {
    const db = supabaseFor("authorized", true);
    const result = await settleDispute(db.client, { disputeId: "d1", outcome: "refund_buyer", actorId: "admin", reason: "Buyer asked to cancel" });
    expect(result).toMatchObject({ statusCode: 409 });
    expect(db.updates.some((update) => update.table === "disputes")).toBe(false);
  });

  it("keeps a captured PaymentIntent held when capture races a seller capture", async () => {
    const db = supabaseFor("authorized");
    await settleDispute(db.client, { disputeId: "d1", outcome: "release_seller", actorId: "admin", reason: "Release the captured funds" });
    expect(retrieve).toHaveBeenCalled();
    expect(db.updates.some((update) => update.table === "escrow_payments" && update.status === "held")).toBe(true);
    expect(db.updates.some((update) => update.table === "escrow_payments" && update.status === "authorized")).toBe(false);
  });
});

describe("round 7 migration", () => {
  it("limits the privilege flag to confirmation and allows an authorized claim", () => {
    const activate = migration.slice(migration.indexOf("function public.activate_auth_user_profile"), migration.indexOf("function public.handle_new_auth_user"));
    const signup = migration.slice(migration.indexOf("function public.handle_new_auth_user"), migration.indexOf("function public.claim_dispute_settlement"));
    expect(activate.indexOf("email_confirmed_at")).toBeLessThan(activate.indexOf("set_config('app.allow_privileged_user_update', 'on', true)"));
    expect(activate).toContain("set_config('app.allow_privileged_user_update', 'off', true)");
    expect(signup).not.toContain("allow_privileged_user_update");
    expect(migration).toContain("payment.status not in ('held', 'authorized', 'capturing')");
    expect(migration).toContain("role = 'buyer'");
    expect(migration).toContain("status = 'pending'");
  });
});
