import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, LockKeyhole, ShieldCheck } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminLinks } from "@/lib/admin/navigation";
import { overviewCards, primaryAdminPageConfigs } from "@/lib/admin/platform";
import { can, permissionLabels, requireAdminPagePermission, rolePermissions, type AdminPermission } from "@/lib/admin/permissions";

export default async function AdminDashboardPage({ searchParams }: { searchParams?: Promise<{ permission?: string; adminDenied?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const auth = await requireAdminPagePermission("admin.access", { loginNext: "/admin", deniedPath: "/dashboard" });
  const availableFeatures = primaryAdminPageConfigs.filter((feature) => can(auth.role, feature.permission));
  const deniedPermission = resolvedSearchParams?.adminDenied && resolvedSearchParams.permission && resolvedSearchParams.permission in permissionLabels
    ? permissionLabels[resolvedSearchParams.permission as AdminPermission]
    : null;

  return (
    <DashboardShell title="Admin overview" description="A role-gated console for trust, safety, payments, analytics, and compliance work." links={adminLinks}>
      {deniedPermission ? (
        <Card className="border-amber-200 bg-amber-50 text-amber-950">
          <CardContent className="p-4 text-sm font-semibold">
            Your current admin role does not include access to {deniedPermission}.
          </CardContent>
        </Card>
      ) : null}

      <section className="rounded-[2rem] border border-border bg-slate-950 p-6 text-white shadow-soft sm:p-8 lg:p-10">
        <Badge variant="dark"><ShieldCheck className="mr-2 h-3.5 w-3.5" /> Admin console</Badge>
        <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight sm:text-6xl">Run marketplace operations with clear ownership and audit trails.</h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">Manage users, listings, reports, disputes, transactions, fraud alerts, AI logs, analytics, audit logs, and console settings with role-based controls.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild variant="trust"><Link href="/admin/listings">Open moderation queue <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
          <Button className="border-white/20 bg-white/10 text-white hover:bg-white/15" variant="outline" asChild><Link href="/admin/audit-logs">View audit logs</Link></Button>
        </div>
      </section>

      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {overviewCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardHeader>
                <span className="rounded-2xl bg-trust-soft p-3 text-trust"><Icon className="h-5 w-5" /></span>
                <CardTitle>{card.title}</CardTitle>
                <p className="text-3xl font-black">{card.value}</p>
              </CardHeader>
              <CardContent className="text-sm leading-6 text-muted-foreground">{card.detail}</CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Badge variant="warning"><AlertTriangle className="mr-1 h-3.5 w-3.5" /> Moderation queues</Badge>
                <CardTitle className="mt-3">Priority queue</CardTitle>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">High-priority listings, reports, disputes, fraud alerts, and payment exceptions.</p>
              </div>
              <Button asChild variant="surface"><Link href="/admin/review-queue">Open queue</Link></Button>
            </div>
          </CardHeader>
          <CardContent className="responsive-table-wrap">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/60 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {["Queue", "Volume", "Risk", "SLA", "Owner", "Actions"].map((column) => <th className="px-3 py-3 font-bold" key={column}>{column}</th>)}
                </tr>
              </thead>
              <tbody>
                {[
                  { queue: "Fraud alerts", volume: "42 open", risk: 91, sla: "9 critical", owner: "Risk", href: "/admin/fraud-alerts" },
                  { queue: "Listing moderation", volume: "86 pending", risk: 74, sla: "21 high-value", owner: "Moderation", href: "/admin/listings" },
                  { queue: "Reports", volume: "118 open", risk: 68, sla: "32 unassigned", owner: "Support", href: "/admin/reports" },
                  { queue: "Disputes", volume: "29 cases", risk: 82, sla: "$18.4k at risk", owner: "Trust", href: "/admin/disputes" }
                ].map((row) => (
                  <tr className="border-b border-border last:border-0" key={row.queue}>
                    <td className="px-3 py-4 font-bold">{row.queue}</td>
                    <td className="px-3 py-4 text-muted-foreground">{row.volume}</td>
                    <td className="px-3 py-4"><RiskIndicator value={row.risk} /></td>
                    <td className="px-3 py-4 text-muted-foreground">{row.sla}</td>
                    <td className="px-3 py-4"><Badge variant="ai">{row.owner}</Badge></td>
                    <td className="px-3 py-4"><Button asChild size="sm" variant="outline"><Link href={row.href}>Review</Link></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Badge variant="premium" className="w-fit"><Clock className="mr-1 h-3.5 w-3.5" /> Shift brief</Badge>
            <CardTitle>Recommended admin actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {[
              { title: "Freeze linked seller accounts", detail: "4 linked sellers, duplicate image hashes, and high chargeback risk.", href: "/admin/fraud-alerts", tone: "risk" as const },
              { title: "Review luxury refunds", detail: "Refunds in the luxury category are above the weekly target.", href: "/admin/revenue", tone: "warning" as const },
              { title: "Export sensitive actions", detail: "Daily audit export is ready for compliance review.", href: "/admin/audit-logs", tone: "trust" as const }
            ].map((item) => (
              <div className="rounded-2xl border border-border bg-card/80 p-4" key={item.title}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Badge variant={item.tone}>{item.tone}</Badge>
                    <h3 className="mt-3 font-black">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.detail}</p>
                  </div>
                  <Button asChild size="sm" variant="outline"><Link href={item.href}>Open</Link></Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
        {availableFeatures.map((feature) => {
          const Icon = feature.icon;
          return (
            <Link className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-1 hover:shadow-soft" href={`/admin/${feature.slug}`} key={feature.slug}>
              <div className="flex items-start justify-between gap-3">
                <span className="rounded-2xl bg-primary/10 p-3 text-primary"><Icon className="h-5 w-5" /></span>
                <ArrowRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
              </div>
              <h2 className="mt-4 text-xl font-bold">{feature.title}</h2>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{feature.description}</p>
              <Badge className="mt-4">{permissionLabels[feature.permission]}</Badge>
            </Link>
          );
        })}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <Badge className="w-fit"><LockKeyhole className="mr-2 h-3.5 w-3.5" /> Role-based permissions</Badge>
          <CardTitle>Permission matrix</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {Object.entries(rolePermissions).map(([role, permissions]) => (
            <div className="rounded-2xl border border-border bg-background p-4" key={role}>
              <h3 className="font-bold capitalize">{role.replace("_", " ")}</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {permissions.slice(0, 6).map((permission) => <li className="flex gap-2" key={permission}><CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />{permissionLabels[permission]}</li>)}
                {permissions.length > 6 ? <li className="text-xs font-semibold text-primary">+{permissions.length - 6} more permissions</li> : null}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}

function RiskIndicator({ value }: { value: number }) {
  const tone = value >= 85 ? "bg-red-500" : value >= 70 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="min-w-32">
      <div className="flex items-center justify-between gap-2 text-xs font-bold">
        <span>{value}</span>
        <span className="text-muted-foreground">risk</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
