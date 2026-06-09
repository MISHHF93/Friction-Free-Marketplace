import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowRight, CheckCircle2, Database, LockKeyhole, MoreHorizontal, Route, SlidersHorizontal, Workflow } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { adminLinks } from "@/lib/admin/navigation";
import { permissionLabels, requireAdminPagePermission, rolePermissions, type AdminRole } from "@/lib/admin/permissions";
import { getAdminPageConfig, type AdminPageConfig } from "@/lib/admin/platform";
import { cn } from "@/lib/utils";

export async function AuthorizedAdminFeaturePage({ slug }: { slug: string }) {
  const config = getAdminPageConfig(slug);
  if (!config) notFound();

  const auth = await requireAdminPagePermission(config.permission, {
    loginNext: `/admin/${config.slug}`,
    deniedPath: "/admin"
  });

  return <AdminFeaturePage config={config} adminRole={auth.role} />;
}

export function AdminFeaturePage({ config, adminRole }: { config: AdminPageConfig; adminRole?: AdminRole }) {
  const Icon = config.icon;
  const visiblePermissions = adminRole ? rolePermissions[adminRole].length : null;

  return (
    <DashboardShell title={config.title} description={config.description} links={adminLinks}>
      <section className="overflow-hidden rounded-[1.75rem] border border-slate-800/20 bg-premium-dark p-4 text-white shadow-admin sm:rounded-[2rem] sm:p-6 lg:p-8">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
          <div>
            <Badge variant="dark" className="gap-2"><LockKeyhole className="h-3.5 w-3.5" /> {permissionLabels[config.permission]}</Badge>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">{config.title}</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">{config.description}</p>
            {adminRole ? <p className="mt-3 text-sm font-bold capitalize text-emerald-300">{adminRole.replace("_", " ")} role - {visiblePermissions} permissions available</p> : null}
          </div>
          <span className="rounded-3xl bg-white/10 p-4 text-emerald-300"><Icon className="h-8 w-8" /></span>
        </div>
        <div className="mt-6 grid gap-3 sm:flex sm:flex-wrap">
          <Button variant="trust">{config.primaryAction}</Button>
          <Button asChild variant="surface"><Link href="/admin/review-queue">Open review queue <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
        </div>
      </section>

      <div className="mt-6 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {config.metrics.map((metric) => (
          <Card key={metric.label} className="shadow-md">
            <CardHeader className="p-4 sm:p-6">
              <CardDescription>{metric.label}</CardDescription>
              <CardTitle className="text-3xl">{metric.value}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-sm leading-6 text-muted-foreground sm:p-6 sm:pt-0">
              {metric.detail}
              {metric.trend ? <Badge variant="ai" className="ml-2">{metric.trend}</Badge> : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <CardHeader>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
              <div>
                <Badge variant="premium">Work queue</Badge>
                <CardTitle className="mt-3">Active work</CardTitle>
                <CardDescription>Current items that need review, action, or follow-up.</CardDescription>
              </div>
              <div className="grid gap-2 sm:flex sm:flex-wrap sm:justify-end">
                <Button variant="surface"><SlidersHorizontal className="h-4 w-4" /> Save view</Button>
                <Button variant="outline">Export</Button>
              </div>
            </div>
            <form className="grid gap-2 pt-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_11rem_11rem_auto]" aria-label={`${config.title} table filters`}>
              <input className="h-10 rounded-xl border border-input bg-card px-3 text-sm shadow-xs outline-none focus:ring-2 focus:ring-ring" placeholder="Search users, listings, payments, or cases..." aria-label="Search admin table" />
              <select className="h-10 rounded-xl border border-input bg-card px-3 text-sm font-semibold shadow-xs" aria-label="Filter by status">
                <option>All statuses</option>
                <option>Open</option>
                <option>Held</option>
                <option>Escalated</option>
                <option>Resolved</option>
              </select>
              <select className="h-10 rounded-xl border border-input bg-card px-3 text-sm font-semibold shadow-xs" aria-label="Filter by risk">
                <option>All risk</option>
                <option>Critical</option>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
              <Button type="button" variant="surface" className="sm:col-span-2 xl:col-span-1">Filter</Button>
            </form>
          </CardHeader>
          <CardContent className="responsive-table-wrap">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {config.columns.map((column) => <th className="px-3 py-3 font-semibold" key={column.key}>{column.label}</th>)}
                  <th className="px-3 py-3 font-semibold">Risk</th>
                  <th className="px-3 py-3 font-semibold">Menu</th>
                </tr>
              </thead>
              <tbody>
                {config.rows.map((row, index) => (
                  <tr className="border-b border-border transition hover:bg-secondary/40 last:border-0" key={`${row.subject}-${index}`}>
                    {config.columns.map((column) => (
                      <td className="px-3 py-4 align-top" key={column.key}>
                        {column.key === "subject" ? <SeverityBadge severity={row.severity} value={row[column.key]} /> : column.key === "status" ? <StatusBadge value={row[column.key]} severity={row.severity} /> : <span className="text-muted-foreground">{row[column.key]}</span>}
                      </td>
                    ))}
                    <td className="px-3 py-4 align-top"><RiskScoreIndicator severity={row.severity} seed={index} /></td>
                    <td className="px-3 py-4 align-top"><AdminRowActionMenu subject={row.subject} primaryAction={row.action ?? config.primaryAction} /></td>
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
                <CardTitle>Review workflow</CardTitle>
                <CardDescription>Clear handoff from system checks to human decision.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {config.workflows.map((step, index) => (
              <div className="rounded-2xl border border-border bg-background p-4" key={step.title}>
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="ai">{String(index + 1).padStart(2, "0")}</Badge>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{step.owner}</p>
                </div>
                <h3 className="mt-3 font-bold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.description}</p>
                <p className="mt-3 rounded-xl bg-ai-soft p-3 text-xs font-bold leading-5 text-ai">System support: {step.automation}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-3">
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
          <CardHeader><CardTitle>Role-based actions</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {config.actions.map((action) => <Badge key={action} variant="trust">{action}</Badge>)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 border-amber-200 bg-amber-50/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-950"><AlertTriangle className="h-5 w-5" /> Confirmation required</CardTitle>
          <CardDescription className="text-amber-900">High-impact actions require confirmation, a reason code, and an audit record.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {["Ban or suspend an account", "Refund, release, or hold payment", "Change trust score or suppress a fraud signal"].map((policy) => (
            <div className="rounded-2xl border border-amber-200 bg-white/70 p-4 text-sm font-bold text-amber-950" key={policy}>{policy}</div>
          ))}
        </CardContent>
      </Card>
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

function StatusBadge({ value, severity }: { value: string; severity?: string }) {
  const variant = severity === "critical" ? "risk" : severity === "high" ? "warning" : severity === "positive" ? "trust" : "default";
  return <Badge variant={variant}>{value}</Badge>;
}

function RiskScoreIndicator({ severity, seed }: { severity?: string; seed: number }) {
  const value = severity === "critical" ? 96 : severity === "high" ? 82 : severity === "medium" ? 58 : severity === "positive" ? 16 : 34 + seed * 8;
  const color = value >= 85 ? "bg-red-500" : value >= 70 ? "bg-amber-500" : value >= 45 ? "bg-blue-500" : "bg-emerald-500";
  return (
    <div className="min-w-28">
      <div className="flex justify-between text-xs font-bold"><span>{value}</span><span className="text-muted-foreground">score</span></div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary"><div className={cn("h-full rounded-full", color)} style={{ width: `${value}%` }} /></div>
    </div>
  );
}

function AdminRowActionMenu({ subject, primaryAction }: { subject: string; primaryAction: string }) {
  return (
    <details className="relative">
      <summary className="inline-flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-xl border border-border bg-card shadow-xs hover:bg-secondary [&::-webkit-details-marker]:hidden" aria-label={`Open actions for ${subject}`}>
        <MoreHorizontal className="h-4 w-4" />
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-64 rounded-2xl border border-border bg-card p-2 shadow-soft">
        <Button type="button" variant="ghost" size="sm" className="w-full justify-start">Assign owner</Button>
        <Button type="button" variant="ghost" size="sm" className="w-full justify-start">Add internal note</Button>
        <ConfirmationDialog
          trigger={<Button type="button" variant="ghost" size="sm" className="w-full justify-start">{primaryAction}</Button>}
          title={`Confirm ${primaryAction}`}
          description={`This action affects ${subject}. Add a reason code and keep an audit record before proceeding.`}
          confirmLabel="Confirm action"
          tone="danger"
        />
      </div>
    </details>
  );
}
