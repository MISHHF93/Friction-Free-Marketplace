import Link from "next/link";
import { Activity, AlertTriangle, ArrowRight, CheckCircle2, Clock, Database, LockKeyhole, ShieldCheck } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { recordPlatformAdminAction } from "@/app/admin/actions";
import { adminLinks } from "@/lib/admin/navigation";
import { getPlatformAdministrationData } from "@/lib/admin/platform-administration";
import { can, permissionLabels, requireAdminPagePermission, rolePermissions, type AdminPermission } from "@/lib/admin/permissions";

export default async function AdminDashboardPage({ searchParams }: { searchParams?: Promise<{ permission?: string; adminDenied?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const auth = await requireAdminPagePermission("admin.access", { loginNext: "/admin", deniedPath: "/dashboard" });
  const platform = await getPlatformAdministrationData(auth.role);
  const availableAreas = platform.areas.filter((area) => area.allowed.read);
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
        <Badge variant="dark"><ShieldCheck className="mr-2 h-3.5 w-3.5" /> Platform administration</Badge>
        <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight sm:text-6xl">Operate users, listings, transactions, finance, fraud, AI, and reports with RBAC and audit trails.</h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">Every administrative surface declares its read/write permissions, API route, owner, and audit action. High-impact decisions require a reason and write to the shared audit stream.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild variant="trust"><Link href="/admin/review-queue">Open review queue <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
          <Button className="border-white/20 bg-white/10 text-white hover:bg-white/15" variant="outline" asChild><Link href="/admin/audit-logs">View audit logs</Link></Button>
        </div>
      </section>

      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {availableAreas.slice(0, 4).map((area) => (
          <Card key={area.key}>
            <CardHeader>
              <Badge variant={area.allowed.write ? "trust" : "default"} className="w-fit">{area.owner}</Badge>
              <CardTitle>{area.label}</CardTitle>
              <p className="text-3xl font-black">{area.metrics[0]?.value ?? "0"}</p>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-muted-foreground">{area.metrics[0]?.detail ?? area.description}</CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Badge variant="warning"><AlertTriangle className="mr-1 h-3.5 w-3.5" /> Area control plane</Badge>
                <CardTitle className="mt-3">Platform areas</CardTitle>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Live operating areas with route, API, owner, permissions, and primary audit action.</p>
              </div>
              <Button asChild variant="surface"><Link href="/api/admin/platform">Open API</Link></Button>
            </div>
          </CardHeader>
          <CardContent className="table-scroll p-0">
            <table className="table-base">
              <thead>
                <tr>
                  {["Area", "Primary metric", "Permission", "API", "Owner", "Actions"].map((column) => <th key={column}>{column}</th>)}
                </tr>
              </thead>
              <tbody>
                {availableAreas.map((area) => (
                  <tr key={area.key}>
                    <td className="font-bold">{area.label}</td>
                    <td className="text-muted-foreground">{area.metrics[0]?.value} · {area.metrics[0]?.label}</td>
                    <td><Badge variant={area.allowed.write ? "trust" : "warning"}>{permissionLabels[area.readPermission]}</Badge></td>
                    <td className="text-muted-foreground">{area.apiRoute}</td>
                    <td><Badge variant="ai">{area.owner}</Badge></td>
                    <td><Button asChild size="sm" variant="outline"><Link href={area.href}>Open</Link></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Badge variant="premium" className="w-fit"><Clock className="mr-1 h-3.5 w-3.5" /> Audited operation</Badge>
            <CardTitle>Record platform action</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={recordPlatformAdminAction} className="grid gap-3">
              <select className="form-control min-h-10 font-semibold" name="area" aria-label="Admin area">
                {availableAreas.filter((area) => area.allowed.write).map((area) => <option key={area.key} value={area.key}>{area.label}</option>)}
              </select>
              <input className="form-control min-h-10" name="action" defaultValue="platform.admin_review" aria-label="Audit action" />
              <input className="form-control min-h-10" name="targetType" placeholder="Target type, for example users or listings" aria-label="Target type" />
              <input className="form-control min-h-10" name="targetId" placeholder="Optional target UUID" aria-label="Target UUID" />
              <textarea className="form-control min-h-28 py-3" name="reason" placeholder="Reason code and decision context. Required for audit." required />
              <Button><Activity className="h-4 w-4" /> Record audited action</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
        {availableAreas.map((area) => (
          <Card key={area.key}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <Badge variant={area.allowed.write ? "trust" : "default"}>{area.allowed.write ? "write enabled" : "read only"}</Badge>
                <Button asChild size="sm" variant="ghost"><Link href={area.href}>Open <ArrowRight className="h-4 w-4" /></Link></Button>
              </div>
              <CardTitle>{area.label}</CardTitle>
              <p className="text-sm leading-6 text-muted-foreground">{area.description}</p>
            </CardHeader>
            <CardContent className="grid gap-3">
              {area.metrics.map((metric) => <div className="rounded-2xl border border-border bg-background p-3" key={metric.label}><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{metric.label}</p><p className="mt-1 text-2xl font-black">{metric.value}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{metric.detail}</p></div>)}
            </CardContent>
          </Card>
        ))}
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

      <Card className="mt-6">
        <CardHeader>
          <Badge className="w-fit"><Database className="mr-2 h-3.5 w-3.5" /> Audit logs</Badge>
          <CardTitle>Recent platform audit activity</CardTitle>
        </CardHeader>
        <CardContent className="table-scroll p-0">
          <table className="table-base">
            <thead>
              <tr>{["Action", "Table", "Actor", "Record", "Created"].map((column) => <th key={column}>{column}</th>)}</tr>
            </thead>
            <tbody>
              {platform.audit.map((entry) => (
                <tr key={String(entry.id)}>
                  <td className="font-bold">{String(entry.action)}</td>
                  <td className="text-muted-foreground">{String(entry.table_name ?? "platform")}</td>
                  <td><Badge variant="ai">{String(entry.actor_type ?? "admin")}</Badge></td>
                  <td className="text-muted-foreground">{String(entry.record_id ?? "none")}</td>
                  <td className="text-muted-foreground">{entry.created_at ? new Date(String(entry.created_at)).toLocaleString() : "Unknown"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
