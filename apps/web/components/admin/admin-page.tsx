import Link from "next/link";
import { ArrowRight, CheckCircle2, Database, LockKeyhole, Route, Workflow } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { adminLinks } from "@/lib/admin/navigation";
import { permissionLabels } from "@/lib/admin/permissions";
import type { AdminPageConfig } from "@/lib/admin/platform";
import { cn } from "@/lib/utils";

export function AdminFeaturePage({ config }: { config: AdminPageConfig }) {
  const Icon = config.icon;
  return (
    <DashboardShell title={config.title} description={config.description} links={adminLinks}>
      <section className="rounded-[2rem] border border-border bg-card p-6 shadow-soft sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge className="gap-2"><LockKeyhole className="h-3.5 w-3.5" /> {permissionLabels[config.permission]}</Badge>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">{config.title}</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">{config.description}</p>
          </div>
          <span className="rounded-3xl bg-primary/10 p-4 text-primary"><Icon className="h-8 w-8" /></span>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button>{config.primaryAction}</Button>
          <Button asChild><Link href="/admin/review-queue">Open unified queue <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
        </div>
      </section>

      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {config.metrics.map((metric) => (
          <Card key={metric.label}>
            <CardHeader>
              <CardDescription>{metric.label}</CardDescription>
              <CardTitle className="text-3xl">{metric.value}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-muted-foreground">
              {metric.detail}
              {metric.trend ? <Badge className="ml-2">{metric.trend}</Badge> : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Badge>Operational table</Badge>
                <CardTitle className="mt-3">Active work</CardTitle>
                <CardDescription>Representative rows backed by the admin query layer and API route for this surface.</CardDescription>
              </div>
              <Button>Save view</Button>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {config.columns.map((column) => <th className="px-3 py-3 font-semibold" key={column.key}>{column.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {config.rows.map((row, index) => (
                  <tr className="border-b border-border last:border-0" key={`${row.subject}-${index}`}>
                    {config.columns.map((column) => (
                      <td className="px-3 py-4 align-top" key={column.key}>
                        {column.key === "subject" ? <SeverityBadge severity={row.severity} value={row[column.key]} /> : <span className="text-muted-foreground">{row[column.key]}</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-primary/10 p-2 text-primary"><Workflow className="h-5 w-5" /></span>
              <div>
                <CardTitle>Moderation workflow</CardTitle>
                <CardDescription>Standardized handoff from automation to human decision.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {config.workflows.map((step, index) => (
              <div className="rounded-2xl border border-border bg-background p-4" key={step.title}>
                <div className="flex items-center justify-between gap-3">
                  <Badge>{String(index + 1).padStart(2, "0")}</Badge>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{step.owner}</p>
                </div>
                <h3 className="mt-3 font-bold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.description}</p>
                <p className="mt-3 rounded-xl bg-secondary p-3 text-xs font-medium leading-5">Automation: {step.automation}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Route className="h-5 w-5 text-primary" /> Admin route</CardTitle></CardHeader>
          <CardContent className="text-sm font-semibold">/admin/{config.slug}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-primary" /> Database queries</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {config.queries.map((query) => <li className="flex gap-2" key={query}><CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />{query}</li>)}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Role-gated actions</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {config.actions.map((action) => <Badge key={action}>{action}</Badge>)}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}

function SeverityBadge({ severity, value }: { severity?: string; value: string }) {
  return (
    <span className="flex items-center gap-2 font-semibold">
      <span className={cn("h-2.5 w-2.5 rounded-full bg-slate-300", severity === "critical" && "bg-red-500", severity === "high" && "bg-amber-500", severity === "medium" && "bg-blue-500", severity === "positive" && "bg-emerald-500")} />
      {value}
    </span>
  );
}
