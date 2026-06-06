import { env } from "@/lib/env.server";

export type MarketplaceEmail = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  tags?: Array<{ name: string; value: string }>;
};

export async function sendMarketplaceEmail(email: MarketplaceEmail) {
  if (!env.RESEND_API_KEY) {
    throw new Error("Missing RESEND_API_KEY.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: email.from ?? env.RESEND_FROM_EMAIL,
      to: email.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      tags: email.tags
    })
  });

  if (!response.ok) {
    throw new Error(`Resend email failed (${response.status}): ${await response.text()}`);
  }

  return (await response.json()) as { id: string };
}

export function listingPublishedEmail({ title, url }: { title: string; url: string }) {
  return {
    subject: `Your listing is live: ${title}`,
    html: `<h1>Your listing is live</h1><p>${title} is now discoverable in Friction-Free Marketplace.</p><p><a href="${url}">View listing</a></p>`,
    text: `Your listing is live: ${title}. View it at ${url}`
  };
}
