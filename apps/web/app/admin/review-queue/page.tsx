import { AlertTriangle, BadgeCheck, Clock, FileWarning, Gavel, Image, MessageSquareWarning, ShieldCheck, UserCheck } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminLinks } from "@/lib/admin/navigation";
import { requireAdminPagePermission } from "@/lib/admin/permissions";
import { scoringFormulas } from "@/lib/trust-safety/engine";

const queueCards = [
  { icon: UserCheck, title: "Identity verification", value: "24", detail: "Pending identity, email, phone, and optional ID checks", sla: "12 due today" },
  { icon: MessageSquareWarning, title: "Scam messages", value: "13", detail: "Contact harvesting, off-platform payment, phishing, and courier scripts", sla: "4 critical" },
  { icon: Image, title: "Duplicate images", value: "8", detail: "Perceptual hash matches across sellers or recent high-risk listings", sla: "2 held" },
  { icon: FileWarning, title: "Suspicious pricing", value: "17", detail: "Below-baseline prices requiring ownership proof or ranking holds", sla: "6 high" },
  { icon: Gavel, title: "Disputes", value: "9", detail: "Escrow, delivery, authenticity, and condition disputes", sla: "3 SLA risk" },
  { icon: AlertTriangle, title: "Reports", value: "31", detail: "User, listing, message, and transaction reports awaiting triage", sla: "18 new" }
];

const reviewRows = [
  { priority: 98, severity: "critical", queue: "Fraud", subject: "Risk flag · duplicate_image", title: "Luxury watch photos reused by 3 sellers", action: "Hold listing, request proof of ownership", due: "45m" },
  { priority: 91, severity: "critical", queue: "Messages", subject: "Message · scam_message", title: "Buyer asked for gift cards and off-platform shipping", action: "Block message, warn counterparty", due: "1h" },
  { priority: 82, severity: "high", queue: "Identity", subject: "User · id_document", title: "Seller submitted optional ID for high-value category", action: "Manual document review", due: "4h" },
  { priority: 76, severity: "high", queue: "Listings", subject: "Listing · suspicious_pricing", title: "Camera priced 72% below market median", action: "Request serial or receipt", due: "Today" },
  { priority: 64, severity: "medium", queue: "Reports", subject: "Report · listing", title: "Buyer reported counterfeit item language", action: "Review listing evidence", due: "Tomorrow" }
];

const riskFlags = [
  "Block or hold messages with payment, courier, phishing, or contact-harvesting scores above threshold.",
  "Hold listings when duplicate images match another seller with high similarity.",
  "Ask for proof of ownership when listing price is materially below category p10/median.",
  "Escalate users with multiple open reports, confirmed risk flags, or fast dispute accumulation.",
  "Request optional ID verification for high-value, restricted, or repeated high-risk selling patterns."
];

export default async function AdminReviewQueuePage() {
  await requireAdminPagePermission("admin.access", { loginNext: "/admin/review-queue", deniedPath: "/admin" });

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
            {reviewRows.map((row) => (
              <div className="grid gap-3 rounded-2xl border border-border bg-background p-4 md:grid-cols-[0.2fr_0.8fr_1.4fr_1fr_0.4fr] md:items-center" key={row.title}>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Priority</p>
                  <p className="text-2xl font-black">{row.priority}</p>
                </div>
                <div>
                  <Badge className={row.severity === "critical" ? "border-red-200 bg-red-50 text-red-700" : row.severity === "high" ? "border-amber-200 bg-amber-50 text-amber-800" : ""}>{row.severity}</Badge>
                  <p className="mt-2 text-sm font-semibold">{row.queue}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{row.subject}</p>
                  <p className="font-semibold">{row.title}</p>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">{row.action}</p>
                <p className="flex items-center gap-1 text-sm font-semibold"><Clock className="h-4 w-4 text-primary" />{row.due}</p>
              </div>
            ))}
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
