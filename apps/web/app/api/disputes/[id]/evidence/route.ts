export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/payments/auth";
import { requireAdminPermission } from "@/lib/admin/permissions";
import { isTrustedMutationOrigin } from "@/lib/security/request-origin";
import {
  DISPUTE_EVIDENCE_BUCKET,
  DISPUTE_EVIDENCE_MAX_BYTES,
  canSubmitDisputeEvidence,
  contentTypeForEvidence,
  evidenceExtension
} from "@/lib/disputes/evidence";
import { enqueueTemplateNotification } from "@/lib/notifications/service";

const idSchema = z.string().uuid();

async function loadDisputeAccess(disputeId: string, userId: string, asAdmin: boolean) {
  const supabase = createAdminClient() as any;
  const { data: dispute } = await supabase
    .from("disputes")
    .select("id,status,transaction_id,reason,opened_at,resolved_at")
    .eq("id", disputeId)
    .maybeSingle();
  if (!dispute) return { error: NextResponse.json({ error: "Dispute not found." }, { status: 404 }) };
  const { data: transaction } = await supabase
    .from("transactions")
    .select("id,buyer_id,seller_id,listing_id")
    .eq("id", dispute.transaction_id)
    .maybeSingle();
  if (!transaction) return { error: NextResponse.json({ error: "Dispute not found." }, { status: 404 }) };
  const isParty = transaction.buyer_id === userId || transaction.seller_id === userId;
  if (!isParty && !asAdmin) return { error: NextResponse.json({ error: "Dispute not found." }, { status: 404 }) };
  return { supabase, dispute, transaction, isParty };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return NextResponse.json({ error: "Invalid dispute id." }, { status: 400 });

  const adminAuth = await requireAdminPermission("disputes.decide");
  const isAdmin = !("error" in adminAuth);
  const auth = isAdmin ? { user: adminAuth.authUser } : await requireUser();
  if ("error" in auth) return auth.error;

  const access = await loadDisputeAccess(parsed.data, auth.user.id, isAdmin);
  if ("error" in access) return access.error;
  const { supabase, dispute } = access;
  const { data: rows } = await supabase
    .from("dispute_evidence")
    .select("id,actor_id,note,storage_path,mime_type,created_at")
    .eq("dispute_id", parsed.data)
    .order("created_at", { ascending: true });

  const items = await Promise.all(((rows ?? []) as Array<{ id: string; actor_id: string; note: string | null; storage_path: string | null; mime_type: string | null; created_at: string }>).map(async (row) => {
    let signedUrl: string | null = null;
    if (row.storage_path) {
      const signed = await supabase.storage.from(DISPUTE_EVIDENCE_BUCKET).createSignedUrl(row.storage_path, 60 * 10);
      signedUrl = signed.data?.signedUrl ?? null;
    }
    return { ...row, signedUrl };
  }));

  return NextResponse.json({
    disputeId: dispute.id,
    status: dispute.status,
    reason: dispute.reason,
    items
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return NextResponse.json({ error: "Invalid dispute id." }, { status: 400 });

  const access = await loadDisputeAccess(parsed.data, auth.user.id, false);
  if ("error" in access) return access.error;
  const { supabase, dispute, transaction } = access;
  if (!canSubmitDisputeEvidence(dispute.status)) {
    return NextResponse.json({ error: "Evidence can only be added while the dispute is open." }, { status: 409 });
  }

  const formData = await request.formData();
  const note = String(formData.get("note") ?? "").trim();
  const files = formData.getAll("photos").filter((value): value is File => value instanceof File && value.size > 0);
  if (!note && files.length === 0) {
    return NextResponse.json({ error: "Add a note or at least one photo." }, { status: 400 });
  }
  if (files.length > 8) return NextResponse.json({ error: "You can upload up to 8 photos at a time." }, { status: 400 });

  const created: string[] = [];
  if (note) {
    const inserted = await supabase.from("dispute_evidence").insert({
      dispute_id: parsed.data,
      actor_id: auth.user.id,
      note
    }).select("id").maybeSingle();
    if (inserted.error || !inserted.data) return NextResponse.json({ error: "The evidence note could not be saved." }, { status: 502 });
    created.push(inserted.data.id);
  }

  for (const file of files) {
    if (file.size > DISPUTE_EVIDENCE_MAX_BYTES) {
      return NextResponse.json({ error: "Photos must be 8 MB or smaller." }, { status: 400 });
    }
    const contentType = contentTypeForEvidence(file);
    if (!contentType) return NextResponse.json({ error: "Use a JPG, PNG, WebP, or HEIC photo." }, { status: 400 });
    const path = `${parsed.data}/${auth.user.id}/${crypto.randomUUID()}.${evidenceExtension(file.name, contentType)}`;
    const body = Buffer.from(await file.arrayBuffer());
    const uploaded = await supabase.storage.from(DISPUTE_EVIDENCE_BUCKET).upload(path, body, { contentType, upsert: false });
    if (uploaded.error) return NextResponse.json({ error: "A photo could not be uploaded. Please try again." }, { status: 502 });
    const inserted = await supabase.from("dispute_evidence").insert({
      dispute_id: parsed.data,
      actor_id: auth.user.id,
      storage_path: path,
      mime_type: contentType
    }).select("id").maybeSingle();
    if (inserted.error || !inserted.data) return NextResponse.json({ error: "The photo record could not be saved." }, { status: 502 });
    created.push(inserted.data.id);
  }

  const counterpartId = transaction.buyer_id === auth.user.id ? transaction.seller_id : transaction.buyer_id;
  if (counterpartId) {
    await enqueueTemplateNotification({
      userId: counterpartId,
      template: "dispute_updated",
      input: { reason: note || "New photo evidence was added.", actionUrl: transaction.buyer_id === counterpartId ? "/dashboard/purchases" : "/dashboard/sales" },
      payload: { transaction_id: transaction.id, dispute_id: parsed.data },
      supabase
    });
  }

  return NextResponse.json({ status: "saved", ids: created }, { headers: { "Cache-Control": "no-store" } });
}
