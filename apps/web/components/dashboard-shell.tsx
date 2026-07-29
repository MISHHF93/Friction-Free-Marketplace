import type { ComponentType, ReactNode } from "react";
import { Bell, ChevronRight, ListChecks, Package } from "lucide-react";
import type { DashboardLink } from "@/components/dashboard-config";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type { DashboardLink } from "@/components/dashboard-config";
export { dashboardLinks } from "@/components/dashboard-config";

export function DashboardShell({
  title,
  description,
  kicker = "Protected workspace",
  actions,
  children
}: {
  title: string;
  description: string;
  kicker?: string;
  links?: DashboardLink[];
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="dashboard-shell">
      <div className="dashboard-hero">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
          <div>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-sky-300">
              <Bell className="h-4 w-4" /> {kicker}
            </p>
            <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-4xl">{title}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">{description}</p>
          </div>
          {actions ? <div className="grid gap-2 sm:flex sm:flex-wrap md:justify-end">{actions}</div> : null}
        </div>
      </div>
      {children}
    </div>
  );
}

export function DashboardStatCard({ label, value, detail, icon: Icon = Package }: { label: string; value: string; detail: string; icon?: ComponentType<{ className?: string }> }) {
  return (
    <Card className="dashboard-stat">
      <CardHeader className="p-4 pb-3 sm:p-6 sm:pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
          <span className="brand-icon brand-icon-sm brand-icon-trust"><Icon className="h-4 w-4" /></span>
        </div>
        <p className="text-3xl font-black">{value}</p>
      </CardHeader>
      <CardContent className="p-4 pt-0 text-sm leading-6 text-muted-foreground sm:p-6 sm:pt-0">{detail}</CardContent>
    </Card>
  );
}

export function DashboardActionCard({ title, description, icon: Icon = ListChecks, children }: { title: string; description: string; icon?: ComponentType<{ className?: string }>; children?: ReactNode }) {
  return (
    <Card className="card-interactive h-full">
      <CardHeader className="p-4 sm:p-6">
        <span className="brand-icon brand-icon-lg brand-icon-ai"><Icon className="h-5 w-5" /></span>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0 text-sm leading-6 text-muted-foreground sm:p-6 sm:pt-0">
        <p>{description}</p>
        {children}
      </CardContent>
    </Card>
  );
}

export function DashboardSectionCard({
  title,
  description,
  badge,
  icon: Icon = ListChecks,
  children,
  className
}: {
  title: string;
  description?: string;
  badge?: string;
  icon?: ComponentType<{ className?: string }>;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("shadow-card", className)}>
      <CardHeader className="p-4 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="brand-icon brand-icon-sm brand-icon-trust"><Icon className="h-4 w-4" /></span>
              <CardTitle>{title}</CardTitle>
            </div>
            {description ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p> : null}
          </div>
          {badge ? <Badge variant="ai">{badge}</Badge> : null}
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 p-4 pt-0 sm:p-6 sm:pt-0">{children}</CardContent>
    </Card>
  );
}

export function DashboardListItem({
  title,
  detail,
  meta,
  status,
  leading,
  children,
  className
}: {
  title: string;
  detail?: string;
  meta?: ReactNode;
  status?: string;
  leading?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("dashboard-list-item", className)}>
      <div className="flex min-w-0 gap-3">
        {leading ? <div className="shrink-0">{leading}</div> : null}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{title}</p>
            {status ? <Badge variant="trust">{status}</Badge> : null}
            {meta}
          </div>
          {detail ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{detail}</p> : null}
        </div>
      </div>
      {children ? <div className="grid shrink-0 gap-2 sm:flex sm:flex-wrap sm:justify-end">{children}</div> : null}
    </div>
  );
}

export function DashboardProgressCard({ label, value, detail, icon: Icon = ChevronRight }: { label: string; value: number; detail: string; icon?: ComponentType<{ className?: string }> }) {
  const boundedValue = Math.max(0, Math.min(100, value));

  return (
    <Card className="dashboard-stat">
      <CardHeader className="p-4 pb-3 sm:p-6 sm:pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
          <span className="brand-icon brand-icon-sm brand-icon-ai"><Icon className="h-4 w-4" /></span>
        </div>
        <p className="text-3xl font-black">{boundedValue}%</p>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0 text-sm leading-6 text-muted-foreground sm:p-6 sm:pt-0">
        <div className="h-2 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
      <div className="h-full rounded-full bg-trust" style={{ width: `${boundedValue}%` }} />
        </div>
        <p>{detail}</p>
      </CardContent>
    </Card>
  );
}

export function DashboardEmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <Card className="border-dashed bg-white/70">
      <CardContent className="flex flex-col items-center justify-center gap-4 p-5 text-center sm:p-8">
        <div className="brand-icon brand-icon-lg">
          <Package className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-bold">{title}</h3>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        {action}
      </CardContent>
    </Card>
  );
}
