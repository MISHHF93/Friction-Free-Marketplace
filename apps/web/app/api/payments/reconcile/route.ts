import { NextResponse } from "next/server";
import { env } from "@/lib/env.server";
import { authorizeJobRequest } from "@/lib/security/secrets";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";
import { dollarsToCents } from "@/lib/payments/money";
import { claimEscrowPayment } from "@/lib/payments/escrow";
import { recordReconciledPayment } from "@/lib/payments/record-outcome";
import { reconcileStuckPayment } from "@/lib/payments/webhook-guards";

export const dynamic = "force-dynamic";

const STUCK_MS = 10 * 60 * 1000;

async function reconcile(request: Request) {
  const authorization = authorizeJobRequest(request, env.SCHEDULED_JOB_SECRET, "Unauthorized payment reconcile request.");
  if (!authorization.ok) return NextResponse.json({ error: authorization.error }, { status: authorization.status });

  const supabase = createAdminClient() as any;
  const cutoff = new Date(Date.now() - STUCK_MS).toISOString();
  const { data: rows, error } = await supabase
    .from("escrow_payments")
    .select("id,status,provider_payment_id,provider_charge_id,transaction_id,amount,seller_net_amount,platform_fee_amount,refunded_amount,currency,metadata")
    .in("status", ["capturing", "releasing", "refunding"])
    .lt("updated_at", cutoff)
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const stripe = getStripe();
  let repaired = 0;
  for (const row of rows ?? []) {
    if (!row.provider_payment_id) continue;
    const intent = await stripe.paymentIntents.retrieve(row.provider_payment_id, { expand: ["latest_charge.refunds"] });
    const charge = typeof intent.latest_charge === "string" ? null : intent.latest_charge;
    const transfers = row.status === "releasing"
      ? await stripe.transfers.list({ transfer_group: `transaction_${row.transaction_id}`, limit: 10 })
      : { data: [] };
    const refundedCents = charge?.amount_refunded ?? 0;
    const next = reconcileStuckPayment({
      status: row.status,
      intentStatus: intent.status,
      hasTransfer: transfers.data.some((transfer: { reversed?: boolean | null }) => !transfer.reversed),
      refundedCents,
      amountCents: dollarsToCents(Number(row.amount))
    });
    if (!next || next === row.status) continue;
    const claimed = await claimEscrowPayment(supabase, row.id, row.status, next);
    if (!claimed) continue;
    const transfer = transfers.data.find((item: { id?: string; reversed?: boolean | null; amount?: number }) => !item.reversed);
    const refunds = charge && "refunds" in charge ? charge.refunds?.data ?? [] : [];
    const latestRefund = refunds.find((refund) => refund.id);
    await recordReconciledPayment(supabase, {
      payment: row,
      next,
      refundedCents,
      transferId: transfer?.id ?? null,
      transferCents: typeof transfer?.amount === "number" ? transfer.amount : null,
      refundId: latestRefund?.id ?? null
    });
    repaired += 1;
  }

  return NextResponse.json({ ok: true, repaired });
}

export function POST(request: Request) {
  return reconcile(request);
}

export function GET(request: Request) {
  return reconcile(request);
}
