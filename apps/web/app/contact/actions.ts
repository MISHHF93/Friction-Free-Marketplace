"use server";

import { z } from "zod";
import { sendMarketplaceEmail } from "@/lib/email/resend";
import { env } from "@/lib/env.server";

export type ContactActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
};

const contactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  topic: z.enum(["buyer-support", "seller-onboarding", "safety-report", "partnership", "platform"]),
  message: z.string().trim().min(10).max(5000),
  website: z.string().max(0)
});

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character] ?? character);
}

export async function submitContactAction(_state: ContactActionState, formData: FormData): Promise<ContactActionState> {
  const parsed = contactSchema.safeParse({
    name: formString(formData, "name"),
    email: formString(formData, "email"),
    topic: formString(formData, "topic"),
    message: formString(formData, "message"),
    website: formString(formData, "website")
  });

  if (!parsed.success) {
    return { status: "error", message: "Check the required fields and try again." };
  }

  const { name, email, topic, message } = parsed.data;
  try {
    await sendMarketplaceEmail({
      to: env.SUPPORT_EMAIL,
      subject: `[Marketplace support] ${topic}: ${name}`,
      text: `From: ${name} <${email}>\nTopic: ${topic}\n\n${message}`,
      html: `<p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p><p><strong>Topic:</strong> ${escapeHtml(topic)}</p><p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>`,
      tags: [{ name: "category", value: "support" }]
    });
    return { status: "success", message: "Your message was sent. Support will reply by email." };
  } catch {
    return { status: "error", message: "Support could not receive the message right now. Please use the support email shown on this page." };
  }
}
