import { CheckCircle2, Clock, FileText, LockKeyhole, ShieldCheck, UserCheck } from "lucide-react";
import { DashboardActionCard, DashboardListItem, DashboardProgressCard, DashboardShell, DashboardStatCard } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getUserTrustSafetySummary } from "@/lib/trust-safety/service";
import { submitVerificationAction } from "@/app/dashboard/trust-safety/actions";

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

function statusVariant(status: string) {
  return status === "verified" ? "trust" : status === "pending" ? "warning" : status === "failed" || status === "expired" ? "risk" : "default";
}

export default async function VerificationPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const summary = user ? await getUserTrustSafetySummary(supabase as any, user.id) : null;
  const checks = summary?.verification ?? [];
  const verifiedCount = checks.filter((check) => check.status === "verified").length;
  const pendingCount = checks.filter((check) => check.status === "pending").length;
  const completion = checks.length ? Math.round((verifiedCount / checks.length) * 100) : 0;

  return (
    <DashboardShell title="Verification center" description="Complete the checks that help protect your account, raise transaction limits, and make your profile easier to trust.">
      <div className="grid gap-5 sm:grid-cols-3">
        <DashboardProgressCard icon={UserCheck} label="Profile completion" value={completion} detail={`${verifiedCount} of ${checks.length || 7} verification checks are complete.`} />
        <DashboardStatCard icon={ShieldCheck} label="Risk action" value={summary?.risk.action ?? "Sign in"} detail={summary ? summary.risk.reasons[0] : "Sign in to calculate verification risk."} />
        <DashboardStatCard icon={LockKeyhole} label="Pending checks" value={pendingCount.toString()} detail="Manual reviews route to the trust and safety queue." />
      </div>
      <Card>
        <CardHeader><CardTitle>Verification checklist</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          {checks.map((check) => (
            <DashboardListItem key={check.checkType} title={check.label} detail={check.description} status={statusLabel(check.status)}>
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
      <DashboardActionCard icon={FileText} title="How verification is used" description="Verification data supports account safety, transaction eligibility, account recovery, and compliance. It is not shown as public profile content.">
        <Button asChild><a href="/dashboard/trust-safety"><CheckCircle2 className="h-4 w-4" /> Open safety center</a></Button>
      </DashboardActionCard>
    </DashboardShell>
  );
}
