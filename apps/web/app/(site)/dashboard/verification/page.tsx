import { CheckCircle2, Clock, FileText, Flag, LockKeyhole, ShieldCheck, UserCheck } from "lucide-react";
import { DashboardActionCard, DashboardListItem, DashboardProgressCard, DashboardShell, DashboardStatCard } from "@/components/dashboard-shell";
import { TrustBadgeStrip, TrustScoreBadge } from "@/components/trust-safety/trust-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/server";
import { getUserTrustSafetySummary } from "@/lib/trust-safety/service";
import { createTrustSafetyReportAction, submitVerificationAction } from "@/app/dashboard/trust-safety/actions";

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

function statusVariant(status: string) {
  return status === "verified" ? "trust" : status === "pending" ? "warning" : status === "failed" || status === "expired" ? "risk" : "default";
}

function assuranceLabel(assurance: string) {
  switch (assurance) {
    case "provider_verified": return "Provider verified";
    case "self_attested_pending": return "Self-submitted · awaiting review";
    case "review_failed": return "Review unsuccessful";
    case "expired": return "Verification expired";
    default: return "Not submitted";
  }
}

export default async function VerificationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const summary = user ? await getUserTrustSafetySummary(supabase as any, user.id) : null;
  const checks = summary?.verification ?? [];
  const verifiedCount = checks.filter((check) => check.status === "verified").length;
  const pendingCount = checks.filter((check) => check.status === "pending").length;
  const completion = checks.length ? Math.round((verifiedCount / checks.length) * 100) : 0;
  const trustScore = summary?.trustScore ?? { score: 0, sellerScore: 0, buyerScore: 0 };

  return (
    <DashboardShell title="Verification" description="Complete the checks that help protect your account, and review your trust score.">
      <div className="flex flex-wrap items-center gap-3">
        <TrustScoreBadge score={trustScore.score} label="Overall" />
        <TrustScoreBadge score={trustScore.sellerScore} label="Seller" />
        <TrustScoreBadge score={trustScore.buyerScore} label="Buyer" />
        <Badge variant={summary?.risk.severity === "critical" || summary?.risk.severity === "high" ? "risk" : summary?.risk.severity === "medium" ? "warning" : "trust"}>
          {summary?.risk.action ?? "Sign in"}
        </Badge>
      </div>
      <TrustBadgeStrip badges={summary?.badges ?? []} />

      <div className="grid gap-5 sm:grid-cols-3">
        <DashboardProgressCard icon={UserCheck} label="Profile completion" value={completion} detail={`${verifiedCount} of ${checks.length || 7} verification checks are complete.`} />
        <DashboardStatCard icon={ShieldCheck} label="Risk action" value={summary?.risk.action ?? "Sign in"} detail={summary ? summary.risk.reasons[0] : "Sign in to calculate verification risk."} />
        <DashboardStatCard icon={LockKeyhole} label="Pending checks" value={pendingCount.toString()} detail="Manual reviews route to the trust and safety queue." />
      </div>

      <Card>
        <CardHeader><CardTitle>Verification checklist</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          {checks.map((check) => (
            <DashboardListItem
              key={check.checkType}
              title={check.label}
              detail={`${check.description} ${assuranceLabel(check.assurance)}.`}
              status={statusLabel(check.status)}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={statusVariant(check.status) as any}>{check.requiredFor.join(", ")}</Badge>
                <form action={submitVerificationAction} className="flex gap-2">
                  <input type="hidden" name="checkType" value={check.checkType} />
                  <input type="hidden" name="note" value={`Submitted ${check.label} from verification center`} />
                  <Button variant="outline" size="sm" disabled={check.status === "verified"}>
                    {check.status === "pending" ? <Clock className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                    {check.status === "verified" ? "Complete" : check.status === "pending" ? "Pending" : "Submit"}
                  </Button>
                </form>
              </div>
            </DashboardListItem>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Badge variant="warning" className="w-fit"><Flag className="mr-1 h-3.5 w-3.5" /> Report intake</Badge>
          <CardTitle>Report a safety issue</CardTitle>
          <CardDescription>Reports stay in the marketplace record with evidence and audit context.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createTrustSafetyReportAction} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="reason">Reason</Label>
              <Input id="reason" name="reason" placeholder="Suspicious listing, scam message, unsafe behavior..." required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" placeholder="Describe what happened and any safety concerns." />
            </div>
            <Button><Flag className="h-4 w-4" /> Submit report</Button>
          </form>
        </CardContent>
      </Card>

      <DashboardActionCard icon={FileText} title="How verification is used" description="A submission is not a verification. Public badges are awarded only after a provider or reviewer marks a check verified. Raw evidence is not shown as public profile content.">
      </DashboardActionCard>
    </DashboardShell>
  );
}
