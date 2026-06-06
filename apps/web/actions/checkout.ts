"use server";

import { redirect } from "next/navigation";
import { env } from "@/lib/env";

export async function startCheckoutAction(listingId: string) {
  const response = await fetch(`${env.NEXT_PUBLIC_APP_URL}/api/stripe/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ listingId }),
    cache: "no-store"
  });

  if (!response.ok) throw new Error(await response.text());
  const payload = (await response.json()) as { url?: string };
  if (!payload.url) throw new Error("Stripe checkout session was not created.");
  redirect(payload.url);
}
