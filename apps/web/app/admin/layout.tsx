import type { ReactNode } from "react";
import Link from "next/link";
import { Activity, AlertTriangle, FileSearch, ShieldCheck, UserRound } from "lucide-react";
import { DashboardMobileNavigation, DashboardSidebar } from "@/components/dashboard-navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAdminLinksForRole } from "@/lib/admin/navigation";
import { can, permissionLabels, requireAdminPagePermission, rolePermissions } from "@/lib/admin/permissions";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const auth = await requireAdminPagePermission("admin.access", { loginNext: "/admin", deniedPath: "/dashboard" });
  const navigationLinks = getAdminLinksForRole(auth.role);
  const roleLabel = auth.role.replace("_", " ");
  const visiblePermissionLabels = rolePermissions[auth.role].slice(0, 4).map((permission) => permissionLabels[permission]);
  const quickLinks = [
    { href: "/admin/review-queue", label: "Review queue", icon: AlertTriangle, permission: "fraud.review" as const, variant: "trust" as const },
    { href: "/admin/reports", label: "Reports", icon: FileSearch, permission: "reports.review" as const, variant: "surface" as const },
    { href: "/admin/audit-logs", label: "Audit", icon: Activity, permission: "audit.read" as const, variant: "surface" as const }
  ].filter((link) => can(auth.role, link.permission));

  return (
    <section className="app-container-wide grid gap-5 py-6 sm:gap-6 sm:py-8 lg:grid-cols-[minmax(16rem,18rem)_minmax(0,1fr)]" aria-label="Admin dashboard">
      <a className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-background focus:px-4 focus:py-2 focus:shadow" href="#admin-content">
        Skip to admin content
      </a>
      <DashboardSidebar
        links={navigationLinks}
        eyebrow="Admin dashboard"
        title="Marketplace operations"
        description="Moderate marketplace activity, investigate risk, monitor commerce, and audit sensitive actions."
        user={{
          name: `${roleLabel} access`,
          email: auth.adminUser.email ?? auth.authUser.email ?? "Admin account",
          location: "Role-based admin workspace"
        }}
      />
      <div className="min-w-0 space-y-6">
        <DashboardMobileNavigation links={navigationLinks} />
        <div className="overflow-hidden rounded-[1.75rem] border border-slate-900/10 bg-premium-dark p-4 text-white shadow-admin sm:rounded-[2rem] sm:p-6">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
            <div>
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-sky-300">
                <ShieldCheck className="h-4 w-4" /> Admin-only workspace
              </p>
              <h1 className="mt-3 text-2xl font-black capitalize tracking-tight sm:text-4xl">Internal operations console</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                {roleLabel} access. Review marketplace activity, investigate risk, resolve payment and dispute issues, and audit sensitive actions with role-based controls.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {visiblePermissionLabels.map((label) => <Badge variant="dark" key={label}>{label}</Badge>)}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center xl:flex xl:justify-end">
              <div className="grid gap-2 sm:flex sm:flex-wrap xl:justify-end">
                {quickLinks.map((link) => {
                  const Icon = link.icon;
                  return <Button asChild variant={link.variant} size="sm" key={link.href}><Link href={link.href}><Icon className="h-4 w-4" /> {link.label}</Link></Button>;
                })}
              </div>
              <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-white/10 p-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 text-sky-300">
                  <UserRound className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold capitalize">{roleLabel}</p>
                  <p className="truncate text-xs text-slate-300">{auth.adminUser.email ?? auth.authUser.email ?? "Authenticated admin"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div id="admin-content" className="space-y-6">
          {children}
        </div>
      </div>
    </section>
  );
}
