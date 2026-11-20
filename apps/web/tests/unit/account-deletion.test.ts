import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { countOpenOrders, openOrdersDeletionMessage } from "@/lib/account/deletion";

function db(count: number | null, error: unknown = null) {
  const seen: Record<string, unknown> = {};
  const chain: any = {
    select: () => chain,
    or: (filter: string) => { seen.or = filter; return chain; },
    in: (_column: string, values: string[]) => { seen.statuses = values; return Promise.resolve({ count, error }); }
  };
  return { seen, client: { from: () => chain } };
}

describe("account deletion with open orders", () => {
  it("counts orders where the member is buyer or seller, across every open status", async () => {
    const { seen, client } = db(2);
    await expect(countOpenOrders(client, "u1")).resolves.toBe(2);
    expect(seen.or).toBe("buyer_id.eq.u1,seller_id.eq.u1");
    expect(seen.statuses).toEqual(expect.arrayContaining(["pending_payment", "paid", "escrowed", "shipped", "delivered", "disputed", "resolving"]));
  });

  it("fails closed when the check cannot run", async () => {
    await expect(countOpenOrders(db(null, { message: "down" }).client, "u1")).resolves.toBeNull();
  });

  it("explains how to unblock deletion", () => {
    expect(openOrdersDeletionMessage(1)).toContain("1 open order");
    expect(openOrdersDeletionMessage(3)).toContain("3 open orders");
  });

  it("refuses deletion in the server action and in the database function", () => {
    const action = readFileSync("app/auth/actions.ts", "utf8");
    expect(action.indexOf("countOpenOrders(admin, user.id)")).toBeLessThan(action.indexOf('rpc("anonymize_marketplace_account"'));
    const migration = readFileSync("../../supabase/migrations/20261120000000_r10_account_deletion_open_order_guard.sql", "utf8");
    expect(migration).toContain("account_has_open_orders");
  });
});
