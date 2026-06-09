import Link from "next/link";
import { AlertTriangle, CheckCircle2, ShieldCheck, Star, TrendingUp, UserCheck } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { TrustBadgeStrip, TrustScoreBadge } from "@/components/trust-safety/trust-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { scoringFormulas } from "@/lib/trust-safety/engine";
import { getUserTrustSafetySummary } from "@/lib/trust-safety/service";

const actions = [
  "Verify optional ID to unlock high-value categories and stronger public badges.",
  "Keep conversations and payments in-app to avoid scam-message warnings.",
  "Upload original photos and proof of ownership for expensive listings.",
  "Resolve reports and disputes quickly to protect seller and buyer scores."
];

export default async function TrustScorePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const summary = user ? await getUserTrustSafetySummary(supabase as any, user.id) : null;
  const trustScore = summary?.trustScore ?? { score: 0, sellerScore: 0, buyerScore: 0, fraudRiskLevel: "low", disputeRate: 0, signals: {}, modelVersion: "trust-engine-v1" };
  const identityPoints = Number(trustScore.signals.identity_points ?? 0);
  const riskHygiene = Math.max(0, 100 - (summary?.risk.score ?? 0));
  const factors = [
    { label: "Identity verification", value: identityPoints, detail: `${summary?.verification.filter((check) => check.status === "verified").length ?? 0} verification checks completed.`, icon: UserCheck },
    { label: "Seller trust score", value: trustScore.sellerScore, detail: "Completed sales, reviews, disputes, response, and risk hygiene.", icon: Star },
    { label: "Buyer reliability", value: trustScore.buyerScore, detail: "Completed purchases, dispute history, verification, and no-show risk.", icon: CheckCircle2 },
    { label: "Risk hygiene", value: riskHygiene, detail: summary?.risk.reasons.join(" ") ?? "Sign in to calculate risk hygiene.", icon: ShieldCheck }
  ];

  return (
    <DashboardShell title="Trust score" description="Transparent trust, seller, and buyer reliability signals with badges and improvement actions.">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden">
          <CardHeader className="bg-slate-950 text-white">
            <Badge className="border-white/20 bg-white/10 text-white">{trustScore.modelVersion}</Badge>
            <CardTitle className="mt-4 text-4xl font-black">Trusted marketplace profile</CardTitle>
            <p className="max-w-2xl text-sm leading-6 text-slate-300">Trust scores are contextual: seller trust helps buyers understand fulfillment quality, while buyer reliability helps sellers understand transaction dependability.</p>
          </CardHeader>
          <CardContent className="space-y-5 p-6">
            <div className="flex flex-wrap items-center gap-3">
              <TrustScoreBadge score={trustScore.score} label="Overall" />
              <TrustScoreBadge score={trustScore.sellerScore} label="Seller" />
              <TrustScoreBadge score={trustScore.buyerScore} label="Buyer" />
              <Badge variant={summary?.risk.severity === "critical" || summary?.risk.severity === "high" ? "risk" : summary?.risk.severity === "medium" ? "warning" : "trust"}>{summary?.risk.action ?? "sign in"}</Badge>
            </div>
            <TrustBadgeStrip badges={summary?.badges ?? []} />
            <div className="grid gap-3 sm:grid-cols-2">
              {factors.map((factor) => {
                const Icon = factor.icon;
                return (
                  <div className="rounded-2xl border border-border bg-background p-4" key={factor.label}>
                    <div className="flex items-center justify-between gap-3">
                      <Icon className="h-5 w-5 text-primary" />
                      <span className="text-2xl font-black">{factor.value}</span>
                    </div>
                    <p className="mt-3 font-semibold">{factor.label}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{factor.detail}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <TrendingUp className="h-6 w-6 text-primary" />
              <CardTitle>Improve your trust</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(summary?.risk.reasons ?? actions).map((action) => (
                <div className="flex gap-3 rounded-xl bg-secondary p-3 text-sm leading-6" key={action}>
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {action}
                </div>
              ))}
              <Button asChild className="w-full"><Link href="/dashboard/verification">Open verification center</Link></Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <AlertTriangle className="h-6 w-6 text-primary" />
              <CardTitle>How scoring works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
              <p>{scoringFormulas.identityVerification}</p>
              <p>{scoringFormulas.sellerTrust}</p>
              <p>{scoringFormulas.buyerReliability}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
