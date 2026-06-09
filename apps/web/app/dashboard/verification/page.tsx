import { CheckCircle2, FileText, LockKeyhole, ShieldCheck, UserCheck } from "lucide-react";
import { DashboardActionCard, DashboardListItem, DashboardProgressCard, DashboardShell, DashboardStatCard } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const checks = [
  { label: "Email", status: "Verified", detail: "Used for sign-in security, receipts, and account updates." },
  { label: "Phone", status: "Verified", detail: "Helps buyers and sellers trust active conversations." },
  { label: "Government ID", status: "Optional", detail: "May be required for higher-value protected transactions." },
  { label: "Payout profile", status: "Action needed", detail: "Required before seller payouts can be released." }
];

export default function VerificationPage() {
  return (
    <DashboardShell title="Verification center" description="Complete the checks that help protect your account, raise transaction limits, and make your profile easier to trust.">
      <div className="grid gap-5 sm:grid-cols-3">
        <DashboardProgressCard icon={UserCheck} label="Profile completion" value={78} detail="Add ID and payout details to complete the remaining checks." />
        <DashboardStatCard icon={ShieldCheck} label="Transaction limit" value="$2.5k" detail="ID verification can raise this to $10k." />
        <DashboardStatCard icon={LockKeyhole} label="Security checks" value="3/4" detail="One account check still needs attention." />
      </div>
      <Card>
        <CardHeader><CardTitle>Verification checklist</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          {checks.map((check) => (
            <DashboardListItem key={check.label} title={check.label} detail={check.detail} status={check.status}>
              <Button variant="outline" size="sm">Update</Button>
            </DashboardListItem>
          ))}
        </CardContent>
      </Card>
      <DashboardActionCard icon={FileText} title="How verification is used" description="Verification data supports account safety, transaction eligibility, account recovery, and compliance. It is not shown as public profile content.">
        <Button><CheckCircle2 className="h-4 w-4" /> Continue verification</Button>
      </DashboardActionCard>
    </DashboardShell>
  );
}
