import { NextResponse } from "next/server";
import Stripe from "stripe";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordTransactionEvent } from "@/lib/payments/audit";
import { centsToDollars } from "@/lib/payments/money";
import { getStripe } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";

async function updateSellerAccount(account: Stripe.Account) {
  const supabase = createAdminClient() as any;
  const sellerId = typeof account.metadata?.seller_id === "string" ? account.metadata.seller_id : null;
  if (!sellerId) return;
  const status = account.charges_enabled && account.payouts_enabled ? "active" : account.requirements?.disabled_reason ? "restricted" : account.details_submitted ? "pending" : "onboarding";
  await supabase.from("seller_payment_accounts").upsert({
    seller_id: sellerId,
    provider: "stripe",
    stripe_account_id: account.id,
    status,
    charges_enabled: account.charges_enabled,
    payouts_enabled: account.payouts_enabled,
    details_submitted: account.details_submitted,
    disabled_reason: account.requirements?.disabled_reason ?? null,
    requirements_currently_due: account.requirements?.currently_due ?? [],
    requirements_eventually_due: account.requirements?.eventually_due ?? [],
    onboarding_completed_at: status === "active" ? new Date().toISOString() : null,
    metadata: { default_currency: account.default_currency, livemode: account.livemode }
  });
  if (status === "active") await recordTransactionEvent(supabase, { actor_id: sellerId, type: "seller_onboarding_completed", provider_object_id: account.id, message: "Seller completed Stripe Connect onboarding." });
}

async function updatePaymentIntent(intent: Stripe.PaymentIntent) {
  const transactionId = intent.metadata?.transaction_id;
  if (!transactionId) return;
  const supabase = createAdminClient() as any;
  const { data: transaction } = await supabase.from("transactions").select("*").eq("id", transactionId).maybeSingle();
  const { data: payment } = await supabase.from("escrow_payments").select("*").eq("provider_payment_id", intent.id).maybeSingle();
  const chargeId = typeof intent.latest_charge === "string" ? intent.latest_charge : intent.latest_charge?.id ?? null;

  if (intent.status === "requires_capture") {
    await supabase.from("escrow_payments").update({ status: "authorized", authorized_at: new Date().toISOString(), provider_charge_id: chargeId }).eq("provider_payment_id", intent.id);
    await supabase.from("transactions").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", transactionId);
    await recordTransactionEvent(supabase, { transaction_id: transactionId, type: "payment_authorized", from_status: transaction?.status, to_status: "paid", provider_object_id: intent.id, amount: centsToDollars(intent.amount), currency: intent.currency, message: "Payment authorized; awaiting manual capture." });
  }

  if (intent.status === "succeeded") {
    await supabase.from("escrow_payments").update({ status: "held", captured_at: new Date().toISOString(), held_at: new Date().toISOString(), provider_charge_id: chargeId }).eq("provider_payment_id", intent.id);
    await supabase.from("transactions").update({ status: "escrowed", paid_at: new Date().toISOString() }).eq("id", transactionId);
    if (transaction && payment) {
      await supabase.from("transaction_receipts").upsert({
        transaction_id: transactionId,
        buyer_id: transaction.buyer_id,
        seller_id: transaction.seller_id,
        provider: "stripe",
        provider_payment_id: intent.id,
        provider_charge_id: chargeId,
        subtotal_amount: transaction.item_amount,
        shipping_amount: transaction.shipping_amount,
        tax_amount: transaction.tax_amount,
        platform_fee_amount: payment.platform_fee_amount,
        seller_net_amount: payment.seller_net_amount,
        total_amount: payment.amount,
        currency: payment.currency,
        metadata: { payment_intent_status: intent.status }
      });
    }
    await recordTransactionEvent(supabase, { transaction_id: transactionId, type: "escrow_held", from_status: transaction?.status, to_status: "escrowed", provider_object_id: intent.id, amount: centsToDollars(intent.amount_received), currency: intent.currency, message: "Payment captured and held pending seller release." });
  }

  if (["canceled", "requires_payment_method"].includes(intent.status)) {
    await supabase.from("escrow_payments").update({ status: intent.status === "canceled" ? "cancelled" : "failed", failure_code: intent.last_payment_error?.code ?? null }).eq("provider_payment_id", intent.id);
    await supabase.from("transactions").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", transactionId);
    await recordTransactionEvent(supabase, { transaction_id: transactionId, type: "failed", from_status: transaction?.status, to_status: "cancelled", provider_object_id: intent.id, message: intent.last_payment_error?.message ?? "Payment was canceled or failed." });
  }
}

async function upsertStripeDispute(dispute: Stripe.Dispute) {
  const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id;
  if (!chargeId) return;
  const charge = await getStripe().charges.retrieve(chargeId);
  const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!paymentIntentId) return;
  const supabase = createAdminClient() as any;
  const { data: payment } = await supabase.from("escrow_payments").select("transaction_id").eq("provider_payment_id", paymentIntentId).maybeSingle();
  if (!payment?.transaction_id) return;
  const { data: transaction } = await supabase.from("transactions").select("buyer_id,seller_id,status").eq("id", payment.transaction_id).single();
  if (!transaction) return;
  await supabase.from("disputes").upsert({
    transaction_id: payment.transaction_id,
    opened_by_id: transaction.buyer_id,
    respondent_id: transaction.seller_id,
    provider_dispute_id: dispute.id,
    provider_payment_id: paymentIntentId,
    status: dispute.status === "won" || dispute.status === "lost" ? "closed" : "under_review",
    reason: dispute.reason,
    evidence: dispute.evidence as Record<string, unknown>,
    metadata: { stripe_status: dispute.status, amount: dispute.amount, currency: dispute.currency }
  }, { onConflict: "provider_dispute_id" });
  await supabase.from("transactions").update({ status: "disputed" }).eq("id", payment.transaction_id);
  await recordTransactionEvent(supabase, { transaction_id: payment.transaction_id, type: dispute.status === "won" || dispute.status === "lost" ? "dispute_closed" : "dispute_opened", from_status: transaction.status, to_status: "disputed", provider_object_id: dispute.id, amount: centsToDollars(dispute.amount), currency: dispute.currency, message: `Stripe dispute ${dispute.status}: ${dispute.reason}` });
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature || !env.STRIPE_WEBHOOK_SECRET) return NextResponse.json({ error: "Missing Stripe webhook signature or secret." }, { status: 400 });

  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid signature." }, { status: 400 });
  }

  const supabase = createAdminClient() as any;
  const { data: existing } = await supabase.from("stripe_webhook_events").select("id,processed_at").eq("id", event.id).maybeSingle();
  if (existing?.processed_at) return NextResponse.json({ received: true, duplicate: true });

  await supabase.from("stripe_webhook_events").upsert({ id: event.id, type: event.type, api_version: event.api_version, livemode: event.livemode, payload: event as unknown as Record<string, unknown> });

  try {
    switch (event.type) {
      case "account.updated":
        await updateSellerAccount(event.data.object as Stripe.Account);
        break;
      case "payment_intent.amount_capturable_updated":
      case "payment_intent.succeeded":
      case "payment_intent.canceled":
      case "payment_intent.payment_failed":
        await updatePaymentIntent(event.data.object as Stripe.PaymentIntent);
        break;
      case "charge.dispute.created":
      case "charge.dispute.updated":
      case "charge.dispute.closed":
        await upsertStripeDispute(event.data.object as Stripe.Dispute);
        break;
      default:
        break;
    }
    await supabase.from("stripe_webhook_events").update({ processed_at: new Date().toISOString(), processing_error: null }).eq("id", event.id);
  } catch (error) {
    await supabase.from("stripe_webhook_events").update({ processing_error: error instanceof Error ? error.message : "Unknown webhook error" }).eq("id", event.id);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
