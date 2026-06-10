import Link from "next/link";
import { AlertTriangle, FileWarning, Flag, Gavel, ShieldCheck, UserCheck } from "lucide-react";
import { DashboardActionCard, DashboardListItem, DashboardShell, DashboardStatCard } from "@/components/dashboard-shell";
import { TrustScoreBadge } from "@/components/trust-safety/trust-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/server";
import { getUserTrustSafetySummary } from "@/lib/trust-safety/service";
import { createTrustSafetyReportAction } from "@/app/dashboard/trust-safety/actions";

export default async function TrustSafetyCenterPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const summary = user ? await getUserTrustSafetySummary(supabase as any, user.id) : null;

  return (
    <DashboardShell title="Trust & Safety Center" description="Review verification, trust score, fraud signals, reports, disputes, and risk scoring in one place.">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard icon={ShieldCheck} label="Composite risk" value={summary ? String(summary.risk.score) : "Sign in"} detail={summary?.risk.reasons[0] ?? "Sign in to calculate current account risk."} />
        <DashboardStatCard icon={UserCheck} label="Trust score" value={summary ? String(Math.round(summary.trustScore.score)) : "0"} detail="Overall score from verification, history, reports, disputes, and risk flags." />
        <DashboardStatCard icon={FileWarning} label="Open reports" value={String(summary?.counts.openReports ?? 0)} detail="Open reports tied to your account as a reported party." />
        <DashboardStatCard icon={Gavel} label="Open disputes" value={String(summary?.counts.openDisputes ?? 0)} detail="Disputes influence payout, purchase, and selling trust decisions." />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.85fr]">
        <Card>
          <CardHeader>
            <Badge variant={summary?.risk.action === "hold" || summary?.risk.action === "restrict" ? "risk" : summary?.risk.action === "review" ? "warning" : "trust"} className="w-fit">
              <AlertTriangle className="mr-1 h-3.5 w-3.5" />
              {summary?.risk.recommendedWorkflow.replace(/_/g, " ") ?? "risk workflow"}
            </Badge>
            <CardTitle>Risk scoring and trust posture</CardTitle>
            <CardDescription>Composite risk is calculated from verification, reports, disputes, fraud signals, and score hygiene.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <TrustScoreBadge score={summary?.trustScore.score ?? 0} label="Overall" />
              <TrustScoreBadge score={summary?.trustScore.sellerScore ?? 0} label="Seller" />
              <TrustScoreBadge score={summary?.trustScore.buyerScore ?? 0} label="Buyer" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {(summary?.risk.reasons ?? ["No risk summary available until sign-in."]).map((reason) => (
                <div className="rounded-2xl border border-border bg-secondary/50 p-4 text-sm leading-6" key={reason}>{reason}</div>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {summary?.verification.slice(0, 4).map((check) => (
                <DashboardListItem key={check.checkType} title={check.label} detail={check.description} status={check.status.replace(/_/g, " ")} />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Badge variant="warning" className="w-fit"><Flag className="mr-1 h-3.5 w-3.5" /> Report intake</Badge>
            <CardTitle>Report a safety issue</CardTitle>
            <CardDescription>Reports route to the trust and safety queue with evidence, priority, and audit context.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createTrustSafetyReportAction} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="reason">Reason</Label>
                <Input id="reason" name="reason" placeholder="Suspicious listing, scam message, unsafe behavior..." required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" placeholder="Describe what happened, include relevant context, and mention any safety concerns." />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="reportedUserId">User ID</Label>
                  <Input id="reportedUserId" name="reportedUserId" placeholder="Optional" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="listingId">Listing ID</Label>
                  <Input id="listingId" name="listingId" placeholder="Optional" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="messageId">Message ID</Label>
                  <Input id="messageId" name="messageId" placeholder="Optional" />
                </div>
              </div>
              <Button><Flag className="h-4 w-4" /> Submit report</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <DashboardActionCard icon={UserCheck} title="Verification" description="Submit identity, payout, payment, and category proof checks. Manual checks create admin queue items.">
          <Button asChild variant="outline"><Link href="/dashboard/verification">Open verification</Link></Button>
        </DashboardActionCard>
        <DashboardActionCard icon={ShieldCheck} title="Trust scores" description="Scores combine verification, commerce history, reports, disputes, and fraud signals.">
          <Button asChild variant="outline"><Link href="/dashboard/trust-score">View score</Link></Button>
        </DashboardActionCard>
        <DashboardActionCard icon={Gavel} title="Disputes" description="Payment, delivery, authenticity, and condition disputes stay tied to the transaction record.">
          <Button asChild variant="outline"><Link href="/dashboard/purchases">Open purchases</Link></Button>
        </DashboardActionCard>
      </div>
    </DashboardShell>
  );
}
