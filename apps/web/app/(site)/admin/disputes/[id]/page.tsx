import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPagePermission } from "@/lib/admin/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AdminDisputeEvidenceActions, AdminEvidenceGallery } from "@/components/admin/dispute-evidence-panel";
import { DISPUTE_EVIDENCE_BUCKET } from "@/lib/disputes/evidence";

export const dynamic = "force-dynamic";

export default async function AdminDisputeEvidencePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdminPagePermission("disputes.decide", { loginNext: `/admin/disputes/${id}`, deniedPath: "/admin" });
  const supabase = createAdminClient() as any;
  const { data: dispute } = await supabase
    .from("disputes")
    .select("id,status,reason,transaction_id,opened_at,resolved_at,opened_by_id")
    .eq("id", id)
    .maybeSingle();
  if (!dispute) notFound();
  const { data: rows } = await supabase
    .from("dispute_evidence")
    .select("id,actor_id,note,storage_path,mime_type,created_at")
    .eq("dispute_id", id)
    .order("created_at", { ascending: true });
  const items = await Promise.all(((rows ?? []) as Array<{ id: string; actor_id: string; note: string | null; storage_path: string | null; mime_type: string | null; created_at: string }>).map(async (row) => {
    let signedUrl: string | null = null;
    if (row.storage_path) {
      const signed = await supabase.storage.from(DISPUTE_EVIDENCE_BUCKET).createSignedUrl(row.storage_path, 60 * 10);
      signedUrl = signed.data?.signedUrl ?? null;
    }
    return { ...row, signedUrl };
  }));

  return (
    <main className="mx-auto grid w-full max-w-4xl gap-5 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dispute evidence</p>
          <h1 className="text-2xl font-black">Review submitted evidence</h1>
        </div>
        <Button asChild variant="outline"><Link href="/admin/disputes">Back to disputes</Link></Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{dispute.status}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <p><span className="font-semibold">Reason:</span> {dispute.reason}</p>
          <p><span className="font-semibold">Transaction:</span> {dispute.transaction_id}</p>
          <p><span className="font-semibold">Opened:</span> {dispute.opened_at ? new Date(dispute.opened_at).toLocaleString() : "Unknown"}</p>
          <AdminDisputeEvidenceActions disputeId={dispute.id} status={dispute.status} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Evidence</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminEvidenceGallery items={items} />
        </CardContent>
      </Card>
    </main>
  );
}
