import { NextResponse } from "next/server";
import { env } from "@/lib/env.server";
import { authorizeJobRequest } from "@/lib/security/secrets";
import { createAdminClient } from "@/lib/supabase/admin";
import { autoReleaseEligible, isOpenDisputeStatus } from "@/lib/payments/auto-release";
import { releaseHeldEscrow } from "@/lib/payments/release-held";

export const dynamic = "force-dynamic";

async function autoRelease(request: Request) {
  const authorization = authorizeJobRequest(request, env.SCHEDULED_JOB_SECRET, "Unauthorized auto-release request.");
  if (!authorization.ok) return NextResponse.json({ error: authorization.error }, { status: authorization.status });

  const supabase = createAdminClient() as any;
  const { data: rows, error } = await supabase
    .from("transactions")
    .select("id,listing_id,buyer_id,seller_id,status,delivered_at,item_amount,shipping_amount,tax_amount")
    .eq("status", "delivered")
    .not("delivered_at", "is", null)
    .order("delivered_at", { ascending: true })
    .limit(25);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let released = 0;
  for (const transaction of rows ?? []) {
    const { data: payment } = await supabase.from("escrow_payments").select("*").eq("transaction_id", transaction.id).maybeSingle();
    const { data: disputes } = await supabase.from("disputes").select("status").eq("transaction_id", transaction.id);
    const hasOpenDispute = (disputes ?? []).some((dispute: { status?: string }) => isOpenDisputeStatus(dispute.status));
    if (!payment || !autoReleaseEligible({
      transactionStatus: transaction.status,
      deliveredAt: transaction.delivered_at,
      paymentStatus: payment.status,
      hasOpenDispute
    })) continue;
    const { data: sellerAccount } = await supabase.from("seller_payment_accounts").select("stripe_account_id").eq("seller_id", transaction.seller_id).maybeSingle();
    if (!sellerAccount?.stripe_account_id || !payment.provider_charge_id) continue;
    const result = await releaseHeldEscrow(supabase, { transaction, payment, sellerAccountId: sellerAccount.stripe_account_id, actorId: null });
    if ("transferId" in result || result.status === "completed") released += 1;
  }
  return NextResponse.json({ ok: true, released });
}

export function GET(request: Request) {
  return autoRelease(request);
}

export function POST(request: Request) {
  return autoRelease(request);
}
