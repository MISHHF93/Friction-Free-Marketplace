import { describe, expect, it } from "vitest";
import { renderNotificationTemplate } from "@/lib/notifications/templates";

describe("notification templates", () => {
  it("renders message notifications with escaped email HTML and absolute links", () => {
    const notification = renderNotificationTemplate("message_received", {
      actorName: "Buyer <script>",
      listingTitle: "Vintage Camera",
      messagePreview: "Is this still available?",
      actionUrl: "/dashboard/messages?conversation=abc"
    });

    expect(notification.topic).toBe("messages");
    expect(notification.title).toContain("Vintage Camera");
    expect(notification.emailText).toContain("http://localhost:3000/dashboard/messages");
    expect(notification.emailHtml).toContain("Buyer &lt;script&gt;");
  });

  it("renders offer templates with money formatting", () => {
    const notification = renderNotificationTemplate("offer_received", {
      actorName: "Maya",
      listingTitle: "Desk",
      amount: 125.5,
      currency: "USD",
      actionUrl: "/dashboard/offers"
    });

    expect(notification.topic).toBe("offers");
    expect(notification.body).toContain("$125.50");
  });

  it("renders payment, dispute, and saved-search templates with expected topics", () => {
    expect(renderNotificationTemplate("payment_captured", { amount: 44, currency: "USD" }).topic).toBe("payments");
    expect(renderNotificationTemplate("dispute_opened", { reason: "Item not received" }).topic).toBe("disputes");
    expect(renderNotificationTemplate("saved_search_match", { savedSearchName: "Cameras", listingTitle: "Sony A7IV" }).topic).toBe("saved_searches");
  });
});
