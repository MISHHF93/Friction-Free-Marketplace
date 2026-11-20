import { beforeEach, describe, expect, it, vi } from "vitest";

const enqueue = vi.fn();
vi.mock("@/lib/notifications/service", () => ({ enqueueTemplateNotification: (...args: unknown[]) => enqueue(...args) }));

import { renderNotificationTemplate } from "@/lib/notifications/templates";
import { notifyTransactionParties } from "@/lib/notifications/transaction-events";

function fakeDb(rows: Record<string, Record<string, unknown> | null>) {
  return {
    from(table: string) {
      const chain = { select: () => chain, eq: () => chain, maybeSingle: async () => ({ data: rows[table] ?? null }) };
      return chain;
    }
  };
}

describe("order lifecycle notifications", () => {
  beforeEach(() => enqueue.mockReset());

  it("renders shipped, delivered, auto-release and dispute-resolved templates", () => {
    expect(renderNotificationTemplate("order_shipped", { listingTitle: "Desk", carrier: "UPS", trackingNumber: "1Z99" }).body).toContain("UPS");
    expect(renderNotificationTemplate("order_delivered", { listingTitle: "Desk" }).title).toBe("Delivery confirmed");
    expect(renderNotificationTemplate("order_auto_released", { listingTitle: "Desk", amount: 20, currency: "USD" }).body).toContain("$20.00");
    expect(renderNotificationTemplate("dispute_resolved", { listingTitle: "Desk", reason: "refund" }).topic).toBe("disputes");
  });

  it("does not claim a payment is authorized when checkout only started", () => {
    const rendered = renderNotificationTemplate("payment_authorized", { listingTitle: "Desk", amount: 10, currency: "USD" });
    expect(rendered.title).toBe("Checkout started");
    expect(rendered.body).toContain("Nothing is charged yet");
  });

  it("notifies the requested parties with role-specific links", async () => {
    const db = fakeDb({
      transactions: { id: "t1", buyer_id: "b1", seller_id: "s1", listing_id: "l1", total_amount: 42, currency: "usd" },
      listings: { title: "Lamp" }
    });
    await expect(notifyTransactionParties(db, { transactionId: "t1", template: "order_auto_released", to: ["buyer", "seller"] })).resolves.toBe(true);
    expect(enqueue).toHaveBeenCalledTimes(2);
    expect(enqueue.mock.calls.map((call) => (call[0] as { userId: string }).userId).sort()).toEqual(["b1", "s1"]);
    const buyerCall = enqueue.mock.calls.find((call) => (call[0] as { userId: string }).userId === "b1")![0] as { input: { actionUrl: string; listingTitle: string; currency: string } };
    expect(buyerCall.input).toMatchObject({ actionUrl: "/dashboard/purchases", listingTitle: "Lamp", currency: "USD" });
  });

  it("never throws when notification delivery fails", async () => {
    enqueue.mockRejectedValueOnce(new Error("mail down"));
    const db = fakeDb({ transactions: { id: "t1", buyer_id: "b1", seller_id: "s1", listing_id: null }, listings: null });
    await expect(notifyTransactionParties(db, { transactionId: "t1", template: "order_shipped", to: ["buyer"] })).resolves.toBe(false);
  });
});
