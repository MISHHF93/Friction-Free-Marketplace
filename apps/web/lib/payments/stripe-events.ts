import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordTransactionEvent } from "@/lib/payments/audit";
import { centsToDollars } from "@/lib/payments/money";
import { upsertSellerAccountFromStripe } from "@/lib/payments/connect";
import { buildCaptureJournal, buildDisputeHoldJournal, postLedgerJournal } from "@/lib/financial/ledger";
import { canApplyTransactionStatus } from "@/lib/payments/stripe-mode";
import { isGenuinePostCompletionRefund, paymentSourcesForIntent, refundMayOverwriteStatus, refundStatusSources } from "@/lib/payments/webhook-guards";
import { OPEN_DISPUTE_STATUSES } from "@/lib/disputes/status";
import { getStripe } from "@/lib/stripe/server";

type Supabase = ReturnType<typeof createAdminClient>;

function assertWrite(error: { message?: string } | null | undefined, label: string) {
  if (error) throw new Error(`${label}: ${error.message ?? "write failed"}`);
}

export async function updatePaymentIntent(intent: Stripe.PaymentIntent) {
  const transactionId = intent.metadata?.transaction_id;
  if (!transactionId) return;
  const supabase = createAdminClient() as any;
  const { data: transaction, error: transactionError } = await supabase.from("transactions").select("*").eq("id", transactionId).maybeSingle();
  assertWrite(transactionError, "Load transaction");
  const { data: payment, error: paymentError } = await supabase.from("escrow_payments").select("*").eq("provider_payment_id", intent.id).maybeSingle();
  assertWrite(paymentError, "Load escrow payment");
  const chargeId = typeof intent.latest_charge === "string" ? intent.latest_charge : intent.latest_charge?.id ?? null;

  if (intent.status === "requires_action") {
    const paymentUpdate = await supabase.from("escrow_payments").update({ status: "requires_action" }).eq("provider_payment_id", intent.id).in("status", paymentSourcesForIntent("requires_action")).select("id");
    assertWrite(paymentUpdate.error, "Mark payment requires action");
    if (!paymentUpdate.data?.length) {
      await recordTransactionEvent(supabase, { transaction_id: transactionId, type: "payment_requires_action", from_status: transaction?.status, to_status: transaction?.status, provider_object_id: intent.id, message: "Ignored payment_intent requires_action because the payment had already moved on." });
      return;
    }
    await recordTransactionEvent(supabase, { transaction_id: transactionId, type: "payment_requires_action", from_status: transaction?.status, to_status: transaction?.status, provider_object_id: intent.id, message: "Buyer action is required before the payment can continue." });
    return;
  }

  if (intent.status === "requires_capture" && canApplyTransactionStatus(transaction?.status, "paid")) {
    const paymentUpdate = await supabase.from("escrow_payments").update({ status: "authorized", authorized_at: new Date().toISOString(), provider_charge_id: chargeId }).eq("provider_payment_id", intent.id).in("status", paymentSourcesForIntent("requires_capture")).select("id");
    assertWrite(paymentUpdate.error, "Authorize escrow payment");
    if (!paymentUpdate.data?.length) {
      await recordTransactionEvent(supabase, { transaction_id: transactionId, type: "payment_authorized", from_status: transaction?.status, to_status: transaction?.status, provider_object_id: intent.id, message: "Ignored a late requires_capture event because the payment was no longer authorizable." });
      return;
    }
    const transactionUpdate = await supabase.from("transactions").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", transactionId).in("status", ["pending_payment", "paid"]).select("id");
    assertWrite(transactionUpdate.error, "Mark transaction paid");
    await recordTransactionEvent(supabase, { transaction_id: transactionId, type: "payment_authorized", from_status: transaction?.status, to_status: "paid", provider_object_id: intent.id, amount: centsToDollars(intent.amount), currency: intent.currency, message: "Payment authorized; awaiting manual capture." });
  }

  if (intent.status === "succeeded" && canApplyTransactionStatus(transaction?.status, "escrowed")) {
    const paymentUpdate = await supabase.from("escrow_payments").update({ status: "held", captured_at: new Date().toISOString(), held_at: new Date().toISOString(), provider_charge_id: chargeId }).eq("provider_payment_id", intent.id).in("status", paymentSourcesForIntent("succeeded")).select("id");
    assertWrite(paymentUpdate.error, "Hold captured payment");
    if (!paymentUpdate.data?.length) {
      await recordTransactionEvent(supabase, { transaction_id: transactionId, type: "escrow_held", from_status: transaction?.status, to_status: transaction?.status, provider_object_id: intent.id, message: "Ignored payment_intent.succeeded because the payment was not authorized or capturing." });
      return;
    }
    const transactionUpdate = await supabase.from("transactions").update({ status: "escrowed", paid_at: new Date().toISOString() }).eq("id", transactionId).in("status", ["pending_payment", "paid"]).select("id");
    assertWrite(transactionUpdate.error, "Mark transaction escrowed");
    if (transaction && payment) {
      await postLedgerJournal(supabase, buildCaptureJournal({
        transactionId,
        totalAmount: Number(payment.amount),
        sellerNetAmount: Number(payment.seller_net_amount),
        platformFeeAmount: Number(payment.platform_fee_amount),
        currency: payment.currency,
        buyerId: transaction.buyer_id,
        sellerId: transaction.seller_id,
        providerPaymentId: intent.id,
        providerChargeId: chargeId,
      }));
      const receipt = await supabase.from("transaction_receipts").upsert({
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
      assertWrite(receipt.error, "Write transaction receipt");
    }
    await recordTransactionEvent(supabase, { transaction_id: transactionId, type: "escrow_held", from_status: transaction?.status, to_status: "escrowed", provider_object_id: intent.id, amount: centsToDollars(intent.amount_received), currency: intent.currency, message: "Payment captured and held pending seller release." });
  }

  if (intent.status === "requires_payment_method") {
    const paymentUpdate = await supabase.from("escrow_payments").update({ failure_code: intent.last_payment_error?.code ?? null }).eq("provider_payment_id", intent.id).in("status", paymentSourcesForIntent("requires_payment_method")).select("id");
    assertWrite(paymentUpdate.error, "Record payment method failure");
    if (!paymentUpdate.data?.length) return;
    await recordTransactionEvent(supabase, { transaction_id: transactionId, type: "failed", from_status: transaction?.status, to_status: transaction?.status, provider_object_id: intent.id, message: intent.last_payment_error?.message ?? "Payment needs a new method. The order was not cancelled." });
    return;
  }

  if (intent.status === "canceled" && canApplyTransactionStatus(transaction?.status, "cancelled")) {
    const paymentUpdate = await supabase.from("escrow_payments").update({ status: "cancelled", failure_code: intent.last_payment_error?.code ?? null }).eq("provider_payment_id", intent.id).in("status", paymentSourcesForIntent("canceled")).select("id");
    assertWrite(paymentUpdate.error, "Cancel escrow payment");
    if (!paymentUpdate.data?.length) {
      await recordTransactionEvent(supabase, { transaction_id: transactionId, type: "failed", from_status: transaction?.status, to_status: transaction?.status, provider_object_id: intent.id, message: "Ignored payment_intent.canceled because the payment was already held or settled." });
      return;
    }
    const transactionUpdate = await supabase.from("transactions").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", transactionId).in("status", ["pending_payment", "paid"]).select("id");
    assertWrite(transactionUpdate.error, "Cancel transaction");
    await recordTransactionEvent(supabase, { transaction_id: transactionId, type: "failed", from_status: transaction?.status, to_status: "cancelled", provider_object_id: intent.id, message: intent.last_payment_error?.message ?? "Payment was canceled." });
  }
}

export async function saveStripeDispute(dispute: Stripe.Dispute) {
  const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id;
  if (!chargeId) return;
  const charge = await getStripe().charges.retrieve(chargeId);
  const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!paymentIntentId) return;
  const supabase = createAdminClient() as any;
  const { data: payment, error: paymentError } = await supabase.from("escrow_payments").select("*").eq("provider_payment_id", paymentIntentId).maybeSingle();
  assertWrite(paymentError, "Load disputed payment");
  if (!payment?.transaction_id) return;
  const { data: transaction, error: transactionError } = await supabase.from("transactions").select("buyer_id,seller_id,status").eq("id", payment.transaction_id).single();
  assertWrite(transactionError, "Load disputed transaction");
  if (!transaction) return;

  const { data: byProvider, error: providerError } = await supabase.from("disputes").select("id").eq("provider_dispute_id", dispute.id).maybeSingle();
  assertWrite(providerError, "Load Stripe dispute");
  const { data: active, error: activeError } = await supabase.from("disputes").select("id").eq("transaction_id", payment.transaction_id).in("status", [...OPEN_DISPUTE_STATUSES]).maybeSingle();
  assertWrite(activeError, "Load active dispute");
  const existing = byProvider ?? active;
  const closed = dispute.status === "won" || dispute.status === "lost";
  const row = {
    transaction_id: payment.transaction_id,
    opened_by_id: transaction.buyer_id,
    respondent_id: transaction.seller_id,
    provider_dispute_id: dispute.id,
    provider_payment_id: paymentIntentId,
    status: closed ? "closed" : "under_review",
    reason: dispute.reason,
    evidence: dispute.evidence as unknown as Record<string, unknown>,
    metadata: { stripe_status: dispute.status, amount: dispute.amount, currency: dispute.currency },
    resolved_at: closed ? new Date().toISOString() : null
  };
  if (existing) {
    const update = await supabase.from("disputes").update(row).eq("id", existing.id);
    assertWrite(update.error, "Update dispute");
  } else {
    const insert = await supabase.from("disputes").insert(row);
    assertWrite(insert.error, "Insert dispute");
  }
  if (!closed && canApplyTransactionStatus(transaction.status, "disputed")) {
    const transactionUpdate = await supabase.from("transactions").update({ status: "disputed" }).eq("id", payment.transaction_id).in("status", ["paid", "escrowed", "shipped", "delivered"]).select("id");
    assertWrite(transactionUpdate.error, "Mark transaction disputed");
  }
  if (payment.status === "held" && !existing) {
    await postLedgerJournal(supabase, buildDisputeHoldJournal({
      transactionId: payment.transaction_id,
      totalAmount: Number(payment.amount),
      sellerNetAmount: Number(payment.seller_net_amount),
      platformFeeAmount: Number(payment.platform_fee_amount),
      disputedAmount: centsToDollars(dispute.amount),
      currency: payment.currency,
      buyerId: transaction.buyer_id,
      sellerId: transaction.seller_id,
      providerPaymentId: payment.provider_payment_id,
      providerChargeId: payment.provider_charge_id,
      providerDisputeId: dispute.id,
    }));
  }
  await recordTransactionEvent(supabase, { transaction_id: payment.transaction_id, type: closed ? "dispute_closed" : "dispute_opened", from_status: transaction.status, to_status: closed ? transaction.status : "disputed", provider_object_id: dispute.id, amount: centsToDollars(dispute.amount), currency: dispute.currency, message: `Stripe dispute ${dispute.status}: ${dispute.reason}` });
}

async function applyChargeRefund(charge: Stripe.Charge) {
  const supabase = createAdminClient() as any;
  const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  const query = supabase.from("escrow_payments").select("*");
  const { data: payment, error } = paymentIntentId
    ? await query.eq("provider_payment_id", paymentIntentId).maybeSingle()
    : await query.eq("provider_charge_id", charge.id).maybeSingle();
  assertWrite(error, "Load refunded payment");
  if (!payment) return;
  const { data: transaction, error: transactionError } = await supabase.from("transactions").select("status").eq("id", payment.transaction_id).maybeSingle();
  assertWrite(transactionError, "Load refunded transaction");
  if (!refundMayOverwriteStatus(payment.status)) {
    await recordTransactionEvent(supabase, { transaction_id: payment.transaction_id, type: "refund_succeeded", from_status: payment.status, to_status: payment.status, provider_object_id: charge.id, amount: centsToDollars(charge.amount_refunded), currency: charge.currency, message: `Ignored charge.refunded while the payment was ${payment.status}.` });
    return;
  }
  const refunded = centsToDollars(charge.amount_refunded);
  const fullyRefunded = charge.refunded || refunded >= Number(payment.amount);
  const paymentUpdate = fullyRefunded
    ? await supabase.from("escrow_payments").update({
      refunded_amount: refunded,
      status: "refunded",
      refunded_at: new Date().toISOString(),
      provider_charge_id: charge.id
    }).eq("id", payment.id).in("status", [...refundStatusSources]).select("id")
    : await supabase.from("escrow_payments").update({
      refunded_amount: refunded,
      provider_charge_id: charge.id
    }).eq("id", payment.id).in("status", [...refundStatusSources]).select("id");
  assertWrite(paymentUpdate.error, "Record refund");
  if (!paymentUpdate.data?.length) {
    await recordTransactionEvent(supabase, { transaction_id: payment.transaction_id, type: "refund_succeeded", from_status: payment.status, to_status: payment.status, provider_object_id: charge.id, amount: refunded, currency: charge.currency, message: "Ignored charge.refunded because the payment status had changed." });
    return;
  }
  if (isGenuinePostCompletionRefund(transaction?.status, fullyRefunded)) {
    const transactionUpdate = await supabase.from("transactions").update({ status: "refunded" }).eq("id", payment.transaction_id).eq("status", "completed").select("id");
    assertWrite(transactionUpdate.error, "Mark completed transaction refunded");
    const audit = await supabase.from("audit_logs").insert({
      actor_type: "system",
      action: "post_completion_refund",
      table_name: "transactions",
      record_id: payment.transaction_id,
      metadata: { charge_id: charge.id, refunded_amount: refunded }
    });
    assertWrite(audit.error, "Log post-completion refund");
    await recordTransactionEvent(supabase, { transaction_id: payment.transaction_id, type: "refund_succeeded", from_status: "completed", to_status: "refunded", provider_object_id: charge.id, amount: refunded, currency: charge.currency, message: "Genuine post-completion refund recorded for admin review." });
    return;
  }
  if (transaction?.status === "completed") {
    await recordTransactionEvent(supabase, { transaction_id: payment.transaction_id, type: "refund_succeeded", from_status: "completed", to_status: "completed", provider_object_id: charge.id, amount: refunded, currency: charge.currency, message: "Left a completed order unchanged because the Stripe refund was not a full post-completion refund." });
    return;
  }
  if (fullyRefunded && canApplyTransactionStatus(transaction?.status, "refunded")) {
    const transactionUpdate = await supabase.from("transactions").update({ status: "refunded" }).eq("id", payment.transaction_id).eq("status", transaction.status).select("id");
    assertWrite(transactionUpdate.error, "Mark transaction refunded");
  }
  await recordTransactionEvent(supabase, { transaction_id: payment.transaction_id, type: "refund_succeeded", from_status: payment.status, to_status: fullyRefunded ? "refunded" : payment.status, provider_object_id: charge.id, amount: refunded, currency: charge.currency, message: "Stripe reported a refund on this charge." });
}

async function applyTransfer(transfer: Stripe.Transfer) {
  const supabase = createAdminClient() as any;
  const status = transfer.reversed ? "cancelled" : "paid";
  const update = await supabase.from("payouts").update({
    status,
    provider_transfer_id: transfer.id,
    paid_at: status === "paid" ? new Date().toISOString() : null,
    failure_code: transfer.reversed ? "reversed" : null
  }).eq("provider_transfer_id", transfer.id).select("id");
  assertWrite(update.error, "Update transfer payout");
  if (!update.data?.length && transfer.metadata?.transaction_id) {
    const byTransaction = await supabase.from("payouts").update({
      status,
      provider_transfer_id: transfer.id,
      paid_at: status === "paid" ? new Date().toISOString() : null
    }).eq("transaction_id", transfer.metadata.transaction_id).is("provider_transfer_id", null);
    assertWrite(byTransaction.error, "Attach transfer to payout");
  }
}

async function applyPayout(payout: Stripe.Payout) {
  const supabase = createAdminClient() as any;
  const status = payout.status === "paid" ? "paid" : payout.status === "failed" || payout.status === "canceled" ? "failed" : "processing";
  const update = await supabase.from("payouts").update({
    status,
    provider_payout_id: payout.id,
    paid_at: status === "paid" ? new Date().toISOString() : null,
    failure_code: payout.failure_code ?? null
  }).eq("provider_payout_id", payout.id);
  assertWrite(update.error, "Update Stripe payout");
}

async function applyDeauthorized(accountId: string) {
  const supabase = createAdminClient() as any;
  const update = await supabase.from("seller_payment_accounts").update({
    status: "restricted",
    charges_enabled: false,
    payouts_enabled: false,
    disabled_reason: "application_deauthorized",
    last_synced_at: new Date().toISOString()
  }).eq("stripe_account_id", accountId);
  assertWrite(update.error, "Restrict deauthorized seller");
}

export async function ingestStripeEvent(event: Stripe.Event, source: "platform" | "connect") {
  if (source === "platform" && event.account) {
    return { status: 400, body: { error: "Connect events must use the Connect webhook endpoint." } };
  }
  if (source === "connect" && event.type.startsWith("account.") && !event.account) {
    return { status: 400, body: { error: "Connect account events must include event.account." } };
  }

  const supabase = createAdminClient() as Supabase as any;
  const stored = await supabase.from("stripe_webhook_events").insert({
    id: event.id,
    type: event.type,
    api_version: event.api_version,
    livemode: event.livemode,
    payload: event as unknown as Record<string, unknown>
  }).select("id").maybeSingle();
  if (stored.error?.code === "23505") return { status: 200, body: { received: true, duplicate: true } };
  assertWrite(stored.error, "Store webhook event");

  try {
  switch (event.type) {
    case "account.updated":
      await upsertSellerAccountFromStripe(supabase, event.data.object as Stripe.Account);
      break;
    case "account.application.deauthorized":
      await applyDeauthorized(event.account ?? "");
      break;
    case "payment_intent.amount_capturable_updated":
    case "payment_intent.succeeded":
    case "payment_intent.canceled":
    case "payment_intent.payment_failed":
    case "payment_intent.requires_action":
      await updatePaymentIntent(event.data.object as Stripe.PaymentIntent);
      break;
    case "charge.dispute.created":
    case "charge.dispute.updated":
    case "charge.dispute.closed":
      await saveStripeDispute(event.data.object as Stripe.Dispute);
      break;
    case "charge.refunded":
      await applyChargeRefund(event.data.object as Stripe.Charge);
      break;
    case "transfer.created":
    case "transfer.updated":
    case "transfer.reversed":
      await applyTransfer(event.data.object as Stripe.Transfer);
      break;
    case "payout.created":
    case "payout.updated":
    case "payout.paid":
    case "payout.failed":
    case "payout.canceled":
      await applyPayout(event.data.object as Stripe.Payout);
      break;
    default:
      break;
  }

  const processed = await supabase.from("stripe_webhook_events").update({ processed_at: new Date().toISOString(), processing_error: null }).eq("id", event.id);
  assertWrite(processed.error, "Mark webhook processed");
  return { status: 200, body: { received: true } };
  } catch (error) {
    await supabase.from("stripe_webhook_events").delete().eq("id", event.id).is("processed_at", null);
    throw error;
  }
}
