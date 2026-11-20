import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowRight, CheckCircle2, Database, LockKeyhole, Route, SlidersHorizontal, Workflow } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { adminLinks } from "@/lib/admin/navigation";
import { can, permissionLabels, requireAdminPagePermission, rolePermissions, type AdminRole } from "@/lib/admin/permissions";
import { adminMutationsFor } from "@/lib/admin/mutations";
import { AdminRowActionMenu } from "@/components/admin/admin-row-actions";
import { getAdminPageConfig } from "@/lib/admin/platform";
import { getLiveAdminPage } from "@/lib/admin/live-pages";
import type { AdminPageConfig } from "@/lib/admin/platform";
import { cn } from "@/lib/utils";

export async function AuthorizedAdminFeaturePage({ slug, cursor }: { slug: string; cursor?: string }) {
  const base = getAdminPageConfig(slug);
  if (!base) notFound();
  const auth = await requireAdminPagePermission(base.permission, {
    loginNext: `/admin/${base.slug}`,
    deniedPath: "/admin"
  });
  const page = await getLiveAdminPage(slug, cursor);
  if (!page) notFound();

  return <AdminFeaturePage config={page.config} adminRole={auth.role} nextCursor={page.nextCursor} loadError={page.loadError} />;
}

export function AdminFeaturePage({ config, adminRole, nextCursor = null, loadError = null }: { config: AdminPageConfig; adminRole?: AdminRole; nextCursor?: string | null; loadError?: string | null }) {
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
          <Button variant="trust" type="button" disabled title={adminMutationsFor(config.slug).length ? "Choose a live record id from the admin API." : "This queue has no record mutation."}>{config.primaryAction}</Button>
          {can(adminRole ?? null, "fraud.review") ? <Button asChild variant="surface"><Link href="/admin/review-queue">Open review queue <ArrowRight className="ml-2 h-4 w-4" /></Link></Button> : null}
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
            <details className="pt-3">
              <summary className="inline-flex min-h-11 cursor-pointer list-none items-center rounded-xl border border-border px-3 text-sm font-bold">Filters</summary>
            <form className="mt-3 grid gap-2 sm:grid-cols-2" aria-label={`${config.title} table filters`}>
              <input className="form-control min-h-10" placeholder="Search users, listings, payments, or cases..." aria-label="Search admin table" />
              <select className="form-control min-h-10 font-semibold" aria-label="Filter by status">
                <option>All statuses</option>
                <option>Open</option>
                <option>Held</option>
                <option>Escalated</option>
                <option>Resolved</option>
              </select>
              <select className="form-control min-h-10 font-semibold" aria-label="Filter by risk">
                <option>All risk</option>
                <option>Critical</option>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
              <Button type="button" variant="surface" className="min-h-11 sm:col-span-2">Filter</Button>
            </form>
            </details>
          </CardHeader>
          <CardContent className="grid gap-3 p-4">
            {config.rows.length === 0 ? <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">No records in this queue.</p> : null}
            {config.rows.map((row, index) => (
              <article key={`${row.subject}-${index}`} className="grid gap-2 rounded-2xl border border-border p-4">
                {config.columns.map((column) => (
                  <p key={column.key} className="text-sm">
                    <span className="font-semibold">{column.label}: </span>
                    {column.key === "subject" ? <SeverityBadge severity={row.severity} value={row[column.key]} /> : column.key === "status" ? <StatusBadge value={row[column.key]} severity={row.severity} /> : <span className="text-muted-foreground">{row[column.key]}</span>}
                  </p>
                ))}
                <RiskScoreIndicator score={row.score || row.trust} />
                <AdminRowActionMenu slug={config.slug} targetId={row.id} subject={row.subject} primaryAction={row.action ?? config.primaryAction} actions={[...adminMutationsFor(config.slug)]} heldCents={Number(row.heldCents || 0)} sellerNetCents={Number(row.sellerNetCents || 0)} />
              </article>
            ))}
            {nextCursor ? <Button asChild variant="outline"><Link href={`/admin/${config.slug}?cursor=${encodeURIComponent(nextCursor)}`}>Next page</Link></Button> : null}
            {loadError ? <p className="text-sm text-destructive" role="alert">{loadError}</p> : null}
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
      <span className={cn("h-2.5 w-2.5 rounded-full bg-muted-foreground", severity === "critical" && "bg-safety-risk", severity === "high" && "bg-safety-warning", severity === "medium" && "bg-ai", severity === "positive" && "bg-trust")} />
      {value}
    </span>
  );
}

function StatusBadge({ value, severity }: { value: string; severity?: string }) {
  const variant = severity === "critical" ? "risk" : severity === "high" ? "warning" : severity === "positive" ? "trust" : "default";
  return <Badge variant={variant}>{value}</Badge>;
}

function RiskScoreIndicator({ score }: { score?: string }) {
  const value = Number(score);
  if (!score || !Number.isFinite(value)) return <p className="text-xs text-muted-foreground">No score</p>;
  const color = value >= 85 ? "bg-safety-risk" : value >= 70 ? "bg-safety-warning" : value >= 45 ? "bg-ai" : "bg-trust";
  return (
    <div className="min-w-28">
      <div className="flex justify-between text-xs font-bold"><span>{value}</span><span className="text-muted-foreground">score</span></div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary"><div className={cn("h-full rounded-full", color)} style={{ width: `${value}%` }} /></div>
    </div>
  );
}

