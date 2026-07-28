export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/payments/auth";
import { recordTransactionEvent } from "@/lib/payments/audit";
import { calculatePlatformFeeCents, centsToDollars, dollarsToCents, normalizeCurrency } from "@/lib/payments/money";
import { checkoutStripeIdempotencyKey, parseIdempotencyKey } from "@/lib/payments/idempotency";
import { enqueueTemplateNotification } from "@/lib/notifications/service";
import { getStripe } from "@/lib/stripe/server";
import { isTrustedMutationOrigin } from "@/lib/security/request-origin";

const paymentIntentRequestSchema = z.object({
  listingId: z.string().uuid(),
  shippingCents: z.number().int().min(0).max(25_000_00).default(0),
  taxCents: z.number().int().min(0).max(25_000_00).default(0)
});

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const idempotencyKey = parseIdempotencyKey(request.headers.get("idempotency-key"));
  if (!idempotencyKey) {
    return NextResponse.json(
      { error: "A valid Idempotency-Key header is required for checkout." },
      { status: 400 }
    );
  }

  const payload = paymentIntentRequestSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });

  const supabase = createAdminClient() as any;
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("id,title,seller_id,price_amount,currency,status,quantity")
    .eq("id", payload.data.listingId)
    .is("deleted_at", null)
    .single();

  if (listingError || !listing || listing.status !== "active" || listing.quantity < 1) {
    return NextResponse.json({ error: "Listing is not available for checkout." }, { status: 404 });
  }

  if (listing.seller_id === auth.user.id) {
    return NextResponse.json({ error: "Sellers cannot buy their own listings." }, { status: 400 });
  }

  const { data: sellerAccount } = await supabase
    .from("seller_payment_accounts")
    .select("stripe_account_id,status,charges_enabled,payouts_enabled")
    .eq("seller_id", listing.seller_id)
    .maybeSingle();

  if (!sellerAccount?.stripe_account_id || sellerAccount.status !== "active" || !sellerAccount.charges_enabled) {
    return NextResponse.json({ error: "Seller has not completed Stripe Connect onboarding." }, { status: 409 });
  }

  const itemCents = dollarsToCents(Number(listing.price_amount));
  const platformFeeCents = calculatePlatformFeeCents(itemCents + payload.data.shippingCents + payload.data.taxCents);
  const totalCents = itemCents + payload.data.shippingCents + payload.data.taxCents + platformFeeCents;
  const currency = normalizeCurrency(listing.currency);

  const expectedAmounts = {
    item: centsToDollars(itemCents),
    shipping: centsToDollars(payload.data.shippingCents),
    tax: centsToDollars(payload.data.taxCents),
    fee: centsToDollars(platformFeeCents),
  };
  let { data: transaction } = await supabase
    .from("transactions")
    .select("*")
    .eq("buyer_id", auth.user.id)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (transaction) {
    const sameRequest = transaction.listing_id === listing.id
      && Number(transaction.item_amount) === expectedAmounts.item
      && Number(transaction.shipping_amount) === expectedAmounts.shipping
      && Number(transaction.tax_amount) === expectedAmounts.tax
      && Number(transaction.marketplace_fee_amount) === expectedAmounts.fee;
    if (!sameRequest) {
      return NextResponse.json(
        { error: "This checkout key was already used for a different request." },
        { status: 409 }
      );
    }

    const { data: existingPayment } = await supabase
      .from("escrow_payments")
      .select("provider_payment_id")
      .eq("transaction_id", transaction.id)
      .maybeSingle();
    if (existingPayment?.provider_payment_id) {
      const existingIntent = await getStripe().paymentIntents.retrieve(existingPayment.provider_payment_id);
      return NextResponse.json({
        clientSecret: existingIntent.client_secret,
        paymentIntentId: existingIntent.id,
        transactionId: transaction.id,
        amount: existingIntent.amount,
        currency: existingIntent.currency,
        platformFee: platformFeeCents,
        captureMethod: "manual",
        duplicate: true
      });
    }
  } else {
    const inserted = await supabase.from("transactions").insert({
      listing_id: listing.id,
      buyer_id: auth.user.id,
      seller_id: listing.seller_id,
      status: "pending_payment",
      item_amount: expectedAmounts.item,
      shipping_amount: expectedAmounts.shipping,
      tax_amount: expectedAmounts.tax,
      marketplace_fee_amount: expectedAmounts.fee,
      currency: currency.toUpperCase(),
      idempotency_key: idempotencyKey,
      metadata: {
        checkout_kind: "full_purchase",
        seller_stripe_account_id: sellerAccount.stripe_account_id
      }
    }).select("*").single();
    transaction = inserted.data;

    if (inserted.error?.code === "23505") {
      const raced = await supabase
        .from("transactions")
        .select("*")
        .eq("buyer_id", auth.user.id)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
      transaction = raced.data;
    }
    if (!transaction) return NextResponse.json({ error: "Could not create transaction." }, { status: 500 });
  }

  const stripe = getStripe();
  const paymentIntent = await stripe.paymentIntents.create(
    {
      amount: totalCents,
      currency,
      capture_method: "manual",
      automatic_payment_methods: { enabled: true },
      description: `Friction-Free Marketplace purchase: ${listing.title}`,
      metadata: {
        transaction_id: transaction.id,
        listing_id: listing.id,
        buyer_id: auth.user.id,
        seller_id: listing.seller_id,
        platform_fee_cents: String(platformFeeCents),
        seller_net_cents: String(totalCents - platformFeeCents)
      },
      transfer_group: `transaction_${transaction.id}`
    },
    { idempotencyKey: checkoutStripeIdempotencyKey(auth.user.id, idempotencyKey) }
  );

  await supabase.from("escrow_payments").upsert({
    transaction_id: transaction.id,
    provider: "stripe",
    provider_payment_id: paymentIntent.id,
    status: paymentIntent.status === "requires_capture" ? "authorized" : "requires_action",
    amount: centsToDollars(totalCents),
    currency: currency.toUpperCase(),
    platform_fee_amount: centsToDollars(platformFeeCents),
    seller_net_amount: centsToDollars(totalCents - platformFeeCents),
    capture_before: (paymentIntent as unknown as { capture_before?: number }).capture_before ? new Date((paymentIntent as unknown as { capture_before: number }).capture_before * 1000).toISOString() : null,
    metadata: { client_secret_last4: paymentIntent.client_secret?.slice(-4), checkout_idempotency_key: idempotencyKey }
  }, { onConflict: "transaction_id" });

  await recordTransactionEvent(supabase, {
    transaction_id: transaction.id,
    actor_id: auth.user.id,
    type: "payment_intent_created",
    to_status: "pending_payment",
    provider_object_id: paymentIntent.id,
    amount: centsToDollars(totalCents),
    currency,
    message: "Manual-capture PaymentIntent created. Funds will be authorized before capture."
  });

  await Promise.all([
    enqueueTemplateNotification({
      userId: auth.user.id,
      template: "payment_authorized",
      input: { listingTitle: listing.title, amount: centsToDollars(totalCents), currency: currency.toUpperCase(), actionUrl: "/dashboard/purchases" },
      payload: { transaction_id: transaction.id, listing_id: listing.id, payment_intent_id: paymentIntent.id },
      supabase
    }),
    enqueueTemplateNotification({
      userId: listing.seller_id,
      template: "payment_authorized",
      input: { listingTitle: listing.title, amount: centsToDollars(totalCents), currency: currency.toUpperCase(), actionUrl: "/dashboard/sales" },
      payload: { transaction_id: transaction.id, listing_id: listing.id, payment_intent_id: paymentIntent.id },
      supabase
    })
  ]);

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    transactionId: transaction.id,
    amount: totalCents,
    currency,
    platformFee: platformFeeCents,
    captureMethod: "manual"
  });
}
