import { NextResponse } from "next/server";
import { env } from "@/lib/env.server";
import { authorizeJobRequest } from "@/lib/security/secrets";
import { createAdminClient } from "@/lib/supabase/admin";
import { AUTO_RELEASE_AFTER_MS, AUTO_RELEASE_SHIPPED_MS, autoReleaseCandidateFilter, autoReleaseCheckColumn, autoReleaseEligible, durableAutoReleaseSkip, isOpenDisputeStatus, stampAutoReleaseCheck } from "@/lib/payments/auto-release";
import { releaseHeldEscrow } from "@/lib/payments/release-held";

export const dynamic = "force-dynamic";

async function loadCandidates(supabase: any, status: "delivered" | "shipped", column: "delivered_at" | "shipped_at", cutoff: string) {
  return supabase
    .from("transactions")
    .select("id,listing_id,buyer_id,seller_id,status,delivered_at,shipped_at,metadata")
    .eq("status", status)
    .lte(column, cutoff)
    .or(autoReleaseCandidateFilter)
    .order(autoReleaseCheckColumn, { ascending: true, nullsFirst: true })
    .limit(25);
}

async function autoRelease(request: Request) {
  const authorization = authorizeJobRequest(request, env.SCHEDULED_JOB_SECRET, "Unauthorized auto-release request.");
  if (!authorization.ok) return NextResponse.json({ error: authorization.error }, { status: authorization.status });

  const supabase = createAdminClient() as any;
  const now = Date.now();
  const [delivered, shipped] = await Promise.all([
    loadCandidates(supabase, "delivered", "delivered_at", new Date(now - AUTO_RELEASE_AFTER_MS).toISOString()),
    loadCandidates(supabase, "shipped", "shipped_at", new Date(now - AUTO_RELEASE_SHIPPED_MS).toISOString())
  ]);
  if (delivered.error || shipped.error) return NextResponse.json({ error: delivered.error?.message ?? shipped.error?.message }, { status: 500 });

  let released = 0;
  let skipped = 0;
  let failed = 0;
  for (const transaction of [...(delivered.data ?? []), ...(shipped.data ?? [])]) {
    try {
      const { data: payment } = await supabase.from("escrow_payments").select("*").eq("transaction_id", transaction.id).maybeSingle();
      const { data: disputes } = await supabase.from("disputes").select("status").eq("transaction_id", transaction.id);
      const hasOpenDispute = (disputes ?? []).some((dispute: { status?: string }) => isOpenDisputeStatus(dispute.status) || dispute.status === "resolving");
      const durableSkip = durableAutoReleaseSkip(payment?.status);
      if (durableSkip) {
        await supabase.from("transactions").update({
          metadata: { ...(transaction.metadata ?? {}), auto_release_ineligible: true, auto_release_skip_reason: durableSkip }
        }).eq("id", transaction.id);
        skipped += 1;
        continue;
      }
      const checkedAt = new Date().toISOString();
      if (!payment || !autoReleaseEligible({
        transactionStatus: transaction.status,
        deliveredAt: transaction.delivered_at,
        shippedAt: transaction.shipped_at,
        paymentStatus: payment?.status,
        hasOpenDispute,
        now
      })) {
        await supabase.from("transactions").update({
          metadata: stampAutoReleaseCheck(transaction.metadata, checkedAt)
        }).eq("id", transaction.id);
        skipped += 1;
        continue;
      }
      const { data: sellerAccount } = await supabase.from("seller_payment_accounts").select("stripe_account_id").eq("seller_id", transaction.seller_id).maybeSingle();
      if (!sellerAccount?.stripe_account_id || !payment.provider_charge_id) {
        await supabase.from("transactions").update({
          metadata: stampAutoReleaseCheck(transaction.metadata, checkedAt)
        }).eq("id", transaction.id);
        skipped += 1;
        continue;
      }
      const result = await releaseHeldEscrow(supabase, { transaction, payment, sellerAccountId: sellerAccount.stripe_account_id, actorId: null });
      if ("error" in result && result.error) failed += 1;
      else released += 1;
    } catch {
      await supabase.from("transactions").update({
        metadata: stampAutoReleaseCheck(transaction.metadata, new Date().toISOString())
      }).eq("id", transaction.id);
      failed += 1;
    }
  }
  return NextResponse.json({ ok: true, released, skipped, failed });
}

export function GET(request: Request) {
  return autoRelease(request);
}

export function POST(request: Request) {
  return autoRelease(request);
}
