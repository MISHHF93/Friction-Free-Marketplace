import { publicEnv } from "@/lib/env";

export type NotificationTopic = "messages" | "offers" | "payments" | "disputes" | "saved_searches" | "marketing";
export type NotificationChannel = "in_app" | "email";
export type NotificationTemplateKey =
  | "message_received"
  | "offer_received"
  | "offer_accepted"
  | "offer_declined"
  | "offer_countered"
  | "payment_authorized"
  | "payment_captured"
  | "payment_released"
  | "payment_refunded"
  | "dispute_opened"
  | "dispute_updated"
  | "saved_search_match";

export type NotificationTemplateInput = {
  actorName?: string | null;
  listingTitle?: string | null;
  amount?: string | number | null;
  currency?: string | null;
  messagePreview?: string | null;
  reason?: string | null;
  savedSearchName?: string | null;
  actionUrl?: string | null;
};

export type RenderedNotification = {
  type: NotificationTemplateKey;
  topic: NotificationTopic;
  title: string;
  body: string;
  actionUrl: string;
  emailSubject: string;
  emailText: string;
  emailHtml: string;
};

function money(amount?: string | number | null, currency = "USD") {
  if (amount === null || amount === undefined || amount === "") return "the transaction";
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount)) return `${currency} ${amount}`;
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(numericAmount);
}

function truncate(value: string, limit = 180) {
  return value.length <= limit ? value : `${value.slice(0, limit - 1)}...`;
}

function htmlEscape(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function emailHtml({ title, body, actionUrl }: { title: string; body: string; actionUrl: string }) {
  const absoluteActionUrl = new URL(actionUrl, publicEnv.NEXT_PUBLIC_APP_URL).toString();
  return [
    '<div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#0f172a">',
    `<h1 style="font-size:22px;margin:0 0 12px">${htmlEscape(title)}</h1>`,
    `<p style="margin:0 0 20px">${htmlEscape(body)}</p>`,
    `<a href="${absoluteActionUrl}" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;padding:10px 14px;border-radius:10px;font-weight:700">Open in Friction-Free</a>`,
    '<p style="margin-top:24px;color:#64748b;font-size:12px">You can change notification preferences from your marketplace settings.</p>',
    "</div>"
  ].join("");
}

function render(key: NotificationTemplateKey, topic: NotificationTopic, title: string, body: string, actionUrl: string): RenderedNotification {
  return {
    type: key,
    topic,
    title,
    body,
    actionUrl,
    emailSubject: title,
    emailText: `${title}\n\n${body}\n\nOpen: ${new URL(actionUrl, publicEnv.NEXT_PUBLIC_APP_URL).toString()}`,
    emailHtml: emailHtml({ title, body, actionUrl })
  };
}

export function renderNotificationTemplate(key: NotificationTemplateKey, input: NotificationTemplateInput = {}): RenderedNotification {
  const listingTitle = input.listingTitle ?? "your listing";
  const actorName = input.actorName ?? "A marketplace member";
  const actionUrl = input.actionUrl ?? "/dashboard";

  switch (key) {
    case "message_received":
      return render(key, "messages", `New message about ${listingTitle}`, truncate(input.messagePreview ? `${actorName}: ${input.messagePreview}` : `${actorName} sent you a marketplace message.`), actionUrl);
    case "offer_received":
      return render(key, "offers", `New offer on ${listingTitle}`, `${actorName} sent an offer for ${money(input.amount, input.currency ?? "USD")}.`, actionUrl);
    case "offer_accepted":
      return render(key, "offers", "Offer accepted", `An offer for ${money(input.amount, input.currency ?? "USD")} on ${listingTitle} was accepted.`, actionUrl);
    case "offer_declined":
      return render(key, "offers", "Offer declined", `An offer for ${money(input.amount, input.currency ?? "USD")} on ${listingTitle} was declined.`, actionUrl);
    case "offer_countered":
      return render(key, "offers", "Counter offer received", `A counter offer for ${money(input.amount, input.currency ?? "USD")} is waiting on ${listingTitle}.`, actionUrl);
    case "payment_authorized":
      return render(key, "payments", "Payment authorization started", `${money(input.amount, input.currency ?? "USD")} is being authorized for ${listingTitle}.`, actionUrl);
    case "payment_captured":
      return render(key, "payments", "Payment held for completion", `${money(input.amount, input.currency ?? "USD")} is now held for ${listingTitle} until the order is completed.`, actionUrl);
    case "payment_released":
      return render(key, "payments", "Payment released", `${money(input.amount, input.currency ?? "USD")} was released for ${listingTitle}.`, actionUrl);
    case "payment_refunded":
      return render(key, "payments", "Payment refunded", `${money(input.amount, input.currency ?? "USD")} was refunded for ${listingTitle}.`, actionUrl);
    case "dispute_opened":
      return render(key, "disputes", "Dispute opened", `A dispute was opened for ${listingTitle}${input.reason ? `: ${input.reason}` : "."}`, actionUrl);
    case "dispute_updated":
      return render(key, "disputes", "Dispute updated", `There is a new dispute update for ${listingTitle}${input.reason ? `: ${input.reason}` : "."}`, actionUrl);
    case "saved_search_match":
      return render(key, "saved_searches", `New match for ${input.savedSearchName ?? "your saved search"}`, `${listingTitle} matches one of your saved search alerts.`, actionUrl);
  }
}
