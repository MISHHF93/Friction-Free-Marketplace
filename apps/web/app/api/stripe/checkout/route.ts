import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { getStripe } from "@/lib/stripe/server";

const checkoutRequestSchema = z.object({
  listingId: z.string().min(1),
  title: z.string().min(3),
  amount: z.number().int().positive(),
  currency: z.string().length(3).default("usd")
});

export async function POST(request: Request) {
  const payload = checkoutRequestSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: payload.data.currency.toLowerCase(),
          unit_amount: payload.data.amount,
          product_data: {
            name: payload.data.title,
            metadata: { listingId: payload.data.listingId }
          }
        }
      }
    ],
    metadata: { listingId: payload.data.listingId },
    success_url: `${env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`,
    cancel_url: `${env.NEXT_PUBLIC_APP_URL}/listings/${payload.data.listingId}`
  });

  return NextResponse.json({ url: session.url });
}
