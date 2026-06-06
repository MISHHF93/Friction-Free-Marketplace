import { CheckCircle2, FileText, LockKeyhole, ShieldCheck, UserCheck } from "lucide-react";
import { DashboardActionCard, DashboardShell, DashboardStatCard } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const checks = [
  { label: "Email", status: "Verified", detail: "Used for account security and receipts." },
  { label: "Phone", status: "Verified", detail: "Improves message and offer confidence." },
  { label: "Government ID", status: "Optional", detail: "Unlocks higher-value protected transactions." },
  { label: "Payout profile", status: "Action needed", detail: "Required before seller payouts can be released." }
];

export default function VerificationPage() {
  return (
    <DashboardShell title="Verification center" description="Complete identity, contact, payout, and trust checks that unlock marketplace limits and stronger profile badges.">
      <div className="grid gap-5 sm:grid-cols-3">
        <DashboardStatCard icon={UserCheck} label="Profile completion" value="78%" detail="Add ID and payout details to finish verification." />
        <DashboardStatCard icon={ShieldCheck} label="Transaction limit" value="$2.5k" detail="Optional ID can raise this to $10k." />
        <DashboardStatCard icon={LockKeyhole} label="Security checks" value="3/4" detail="One sensitive action is awaiting review." />
      </div>
      <Card>
        <CardHeader><CardTitle>Verification checklist</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          {checks.map((check) => (
            <div key={check.label} className="flex flex-col gap-3 rounded-2xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{check.label}</p><Badge>{check.status}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{check.detail}</p></div>
              <Button variant="outline" size="sm">Update</Button>
            </div>
          ))}
        </CardContent>
      </Card>
      <DashboardActionCard icon={FileText} title="Privacy-first verification" description="Verification data is used for marketplace safety, transaction eligibility, account recovery, and policy compliance—not public profile display.">
        <Button><CheckCircle2 className="h-4 w-4" /> Continue verification</Button>
      </DashboardActionCard>
    </DashboardShell>
  );
}
