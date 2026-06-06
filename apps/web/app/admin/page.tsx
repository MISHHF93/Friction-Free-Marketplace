import Link from "next/link";
import { ArrowRight, CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminLinks } from "@/lib/admin/navigation";
import { adminPageConfigs, overviewCards } from "@/lib/admin/platform";
import { permissionLabels, rolePermissions } from "@/lib/admin/permissions";

export default function AdminDashboardPage() {
  return (
    <DashboardShell title="Admin platform" description="A complete role-gated operations console for marketplace trust, commerce, analytics, AI, and compliance." links={adminLinks}>
      <section className="rounded-[2rem] border border-border bg-slate-950 p-6 text-white shadow-soft sm:p-8 lg:p-10">
        <Badge className="border-white/20 bg-white/10 text-white"><ShieldCheck className="mr-2 h-3.5 w-3.5" /> Admin control plane</Badge>
        <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight sm:text-6xl">Operate the entire marketplace from one accountable platform.</h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">Manage users, listings, reports, disputes, fraud, payments, transactions, AI tasks, search performance, revenue, trust score overrides, suspensions, bans, and audit history with role-based controls.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild><Link href="/admin/review-queue">Open review queue <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
          <Button className="border-white/20 bg-transparent text-white hover:bg-white/10" asChild><Link href="/admin/audit-logs">View audit logs</Link></Button>
        </div>
      </section>

      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {overviewCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardHeader>
                <span className="rounded-2xl bg-primary/10 p-3 text-primary"><Icon className="h-5 w-5" /></span>
                <CardTitle>{card.title}</CardTitle>
                <p className="text-3xl font-black">{card.value}</p>
              </CardHeader>
              <CardContent className="text-sm leading-6 text-muted-foreground">{card.detail}</CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {adminPageConfigs.map((feature) => {
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
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
