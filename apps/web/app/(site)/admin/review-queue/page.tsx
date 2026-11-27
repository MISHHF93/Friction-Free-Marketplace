import { AlertTriangle, BadgeCheck, Clock, FileWarning, Gavel, Image, MessageSquareWarning, ShieldCheck, UserCheck } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminLinks } from "@/lib/admin/navigation";
import { requireAdminPagePermission } from "@/lib/admin/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { scoringFormulas } from "@/lib/trust-safety/engine";
import { getAdminTrustSafetyDashboard } from "@/lib/trust-safety/service";
import { updateReviewQueueItemAction } from "@/app/admin/review-queue/actions";

const riskFlags = [
  "Block or hold messages with payment, courier, phishing, or contact-harvesting scores above threshold.",
  "Hold listings when duplicate images match another seller with high similarity.",
  "Ask for proof of ownership when listing price is materially below category p10/median.",
  "Escalate users with multiple open reports, confirmed risk flags, or fast dispute accumulation.",
  "Request optional ID verification for high-value, restricted, or repeated high-risk selling patterns."
];

export default async function AdminReviewQueuePage() {
  await requireAdminPagePermission("admin.access", { loginNext: "/admin/review-queue", deniedPath: "/admin" });
  const dashboard = await getAdminTrustSafetyDashboard(createAdminClient() as any, 75);
  const queueCards = [
    { icon: UserCheck, title: "Identity verification", value: dashboard.metrics.pendingVerifications.toString(), detail: "Pending identity, document, category, and proof checks", sla: `${dashboard.verifications.filter((item: any) => item.check_type === "id_document").length} ID reviews` },
    { icon: MessageSquareWarning, title: "Scam messages", value: dashboard.riskFlags.filter((flag: any) => flag.flag_type === "scam_message").length.toString(), detail: "Contact harvesting, off-platform payment, phishing, and courier scripts", sla: `${dashboard.riskFlags.filter((flag: any) => flag.severity === "critical").length} critical` },
    { icon: Image, title: "Duplicate images", value: dashboard.riskFlags.filter((flag: any) => flag.flag_type === "duplicate_image").length.toString(), detail: "Perceptual hash matches across sellers or recent high-risk listings", sla: "image review" },
    { icon: FileWarning, title: "Suspicious pricing", value: dashboard.riskFlags.filter((flag: any) => flag.flag_type === "suspicious_pricing").length.toString(), detail: "Below-baseline prices requiring ownership proof or ranking holds", sla: "pricing proof" },
    { icon: Gavel, title: "Disputes", value: dashboard.metrics.openDisputes.toString(), detail: "Escrow, delivery, authenticity, and condition disputes", sla: "SLA tracked" },
    { icon: AlertTriangle, title: "Reports", value: dashboard.metrics.openReports.toString(), detail: "User, listing, message, and transaction reports awaiting triage", sla: "triage" }
  ];

  return (
    <DashboardShell title="Trust & safety review queue" description="A unified analyst workspace for verification, reports, disputes, fraud signals, automated flags, and marketplace trust decisions." links={adminLinks}>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {queueCards.map((queue) => {
          const Icon = queue.icon;
          return (
            <Card key={queue.title}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-2xl bg-primary/10 p-3 text-primary"><Icon className="h-5 w-5" /></span>
                  <Badge>{queue.sla}</Badge>
                </div>
                <CardTitle>{queue.title}</CardTitle>
                <p className="text-4xl font-black">{queue.value}</p>
              </CardHeader>
              <CardContent className="text-sm leading-6 text-muted-foreground">{queue.detail}</CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Badge>Severity ranked</Badge>
                <CardTitle className="mt-3">Admin review queue</CardTitle>
              </div>
              <Button>Assign next case</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.queueItems.map((row: any) => (
              <div className="grid gap-3 rounded-2xl border border-border bg-background p-4 md:grid-cols-[0.2fr_0.8fr_1.4fr_1fr_0.65fr] md:items-center" key={row.id}>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Priority</p>
                  <p className="text-2xl font-black">{row.priority}</p>
                </div>
                <div>
                  <Badge className={row.severity === "critical" ? "border-red-200 bg-red-50 text-red-700" : row.severity === "high" ? "border-amber-200 bg-amber-50 text-amber-800" : ""}>{row.severity}</Badge>
                  <p className="mt-2 text-sm font-semibold capitalize">{row.queue}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{row.subject_type} · {row.source}</p>
                  <p className="font-semibold">{row.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{row.summary}</p>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">{row.metadata?.recommended_action ?? row.decision ?? "Investigate evidence and decide next action."}</p>
                <div className="grid gap-2">
                  <p className="flex items-center gap-1 text-sm font-semibold"><Clock className="h-4 w-4 text-primary" />{row.due_at ? new Date(row.due_at).toLocaleString() : "No SLA"}</p>
                  <form action={updateReviewQueueItemAction} className="flex flex-wrap gap-2">
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="decision" value="Reviewed from trust and safety queue" />
                    <input type="hidden" name="decisionReason" value={row.summary} />
                    <Button name="status" value="investigating" size="sm" variant="outline">Assign</Button>
                    <Button name="status" value="actioned" size="sm">Action</Button>
                  </form>
                </div>
              </div>
            ))}
            {dashboard.queueItems.length === 0 ? <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">No active trust and safety queue items.</div> : null}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <BadgeCheck className="h-6 w-6 text-primary" />
              <CardTitle>Scoring formulas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
              {Object.entries(scoringFormulas).map(([name, formula]) => (
                <div className="rounded-xl bg-secondary p-3" key={name}>
                  <p className="font-semibold text-foreground">{name}</p>
                  <p>{formula}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <ShieldCheck className="h-6 w-6 text-primary" />
              <CardTitle>Automated risk flags</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm leading-6 text-muted-foreground">
                {riskFlags.map((flag) => (
                  <li className="flex gap-2" key={flag}><AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-primary" />{flag}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
