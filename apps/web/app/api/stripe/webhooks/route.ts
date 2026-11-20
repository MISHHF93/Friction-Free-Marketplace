import { NextResponse } from "next/server";
import { env } from "@/lib/env.server";
import { ingestStripeEvent } from "@/lib/payments/stripe-events";
import { stripeSecretIsLive } from "@/lib/payments/stripe-mode";
import { getStripe } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";

const MAX_WEBHOOK_BYTES = 1_000_000;

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature || !env.STRIPE_WEBHOOK_SECRET) return NextResponse.json({ error: "Missing Stripe webhook signature or secret." }, { status: 400 });
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_WEBHOOK_BYTES) return NextResponse.json({ error: "Stripe webhook payload is too large." }, { status: 413 });

  const body = await request.text();
  if (body.length > MAX_WEBHOOK_BYTES) return NextResponse.json({ error: "Stripe webhook payload is too large." }, { status: 413 });
  let event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    console.error("Invalid Stripe webhook signature", error);
    return NextResponse.json({ error: "Invalid Stripe webhook signature." }, { status: 400 });
  }

  if (event.livemode !== stripeSecretIsLive(env.STRIPE_SECRET_KEY)) {
    return NextResponse.json({ error: "Stripe webhook livemode does not match configured Stripe key." }, { status: 400 });
  }

  try {
    const result = await ingestStripeEvent(event, "platform");
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error("Stripe webhook processing failed", error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
