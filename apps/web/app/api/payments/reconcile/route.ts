import { NextResponse } from "next/server";
import { env } from "@/lib/env.server";
import { authorizeJobRequest } from "@/lib/security/secrets";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";
import { dollarsToCents } from "@/lib/payments/money";
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
    .select("id,status,provider_payment_id,transaction_id,amount,currency")
    .in("status", ["capturing", "releasing", "refunding"])
    .lt("updated_at", cutoff)
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const stripe = getStripe();
  let repaired = 0;
  for (const row of rows ?? []) {
    if (!row.provider_payment_id) continue;
    const intent = await stripe.paymentIntents.retrieve(row.provider_payment_id);
    const charge = typeof intent.latest_charge === "string" ? null : intent.latest_charge;
    const transfers = row.status === "releasing"
      ? await stripe.transfers.list({ transfer_group: `transaction_${row.transaction_id}`, limit: 10 })
      : { data: [] };
    const next = reconcileStuckPayment({
      status: row.status,
      intentStatus: intent.status,
      hasTransfer: transfers.data.some((transfer: { reversed?: boolean | null }) => !transfer.reversed),
      refundedCents: charge?.amount_refunded ?? 0,
      amountCents: dollarsToCents(Number(row.amount))
    });
    if (!next || next === row.status) continue;
    const updated = await supabase.from("escrow_payments").update({ status: next }).eq("id", row.id).eq("status", row.status).select("id");
    if (!updated.data?.length) continue;
    if (next === "held") await supabase.from("transactions").update({ status: "escrowed" }).eq("id", row.transaction_id).eq("status", "paid");
    if (next === "released") await supabase.from("transactions").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", row.transaction_id).in("status", ["escrowed", "shipped", "delivered"]);
    if (next === "refunded") await supabase.from("transactions").update({ status: "refunded" }).eq("id", row.transaction_id).in("status", ["paid", "escrowed", "shipped", "delivered", "disputed"]);
    if (next === "cancelled") await supabase.from("transactions").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", row.transaction_id).in("status", ["pending_payment", "paid"]);
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
