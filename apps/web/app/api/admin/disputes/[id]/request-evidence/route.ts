export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminPermission } from "@/lib/admin/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { isTrustedMutationOrigin } from "@/lib/security/request-origin";
import { canSubmitDisputeEvidence } from "@/lib/disputes/evidence";
import { notifyTransactionParties } from "@/lib/notifications/transaction-events";

const bodySchema = z.object({
  party: z.enum(["buyer", "seller"]),
  reason: z.string().trim().min(8).max(500).optional()
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const auth = await requireAdminPermission("disputes.decide");
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const disputeId = z.string().uuid().safeParse(id);
  if (!disputeId.success) return NextResponse.json({ error: "Invalid dispute id." }, { status: 400 });
  const payload = bodySchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) return NextResponse.json({ error: "Choose the buyer or seller and include a short reason." }, { status: 400 });

  const supabase = createAdminClient() as any;
  const { data: dispute } = await supabase.from("disputes").select("id,status,transaction_id").eq("id", disputeId.data).maybeSingle();
  if (!dispute) return NextResponse.json({ error: "Dispute not found." }, { status: 404 });
  if (!canSubmitDisputeEvidence(dispute.status)) {
    return NextResponse.json({ error: "Evidence can only be requested on an open dispute." }, { status: 409 });
  }
  const nextStatus = payload.data.party === "buyer" ? "awaiting_buyer" : "awaiting_seller";
  const updated = await supabase.from("disputes").update({
    status: nextStatus,
    assigned_admin_id: auth.adminUser.id
  }).eq("id", disputeId.data).select("id,status").maybeSingle();
  if (updated.error || !updated.data) return NextResponse.json({ error: "The dispute could not be updated." }, { status: 502 });
  await notifyTransactionParties(supabase, {
    transactionId: dispute.transaction_id,
    template: "dispute_updated",
    to: [payload.data.party],
    input: { reason: payload.data.reason ?? "Please add evidence for this dispute." }
  });
  return NextResponse.json({ status: nextStatus });
}
