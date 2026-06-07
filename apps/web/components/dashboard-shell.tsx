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
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-card/90 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              <Bell className="h-4 w-4" /> {kicker}
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{title}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">{description}</p>
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap gap-2 md:justify-end">{actions}</div> : null}
        </div>
      </div>
      {children}
    </div>
  );
}

export function DashboardStatCard({ label, value, detail, icon: Icon = Package }: { label: string; value: string; detail: string; icon?: ComponentType<{ className?: string }> }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <p className="text-3xl font-black">{value}</p>
      </CardHeader>
      <CardContent className="text-sm leading-6 text-muted-foreground">{detail}</CardContent>
    </Card>
  );
}

export function DashboardActionCard({ title, description, icon: Icon = ListChecks, children }: { title: string; description: string; icon?: ComponentType<{ className?: string }>; children?: ReactNode }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <Icon className="h-6 w-6 text-primary" />
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm leading-6 text-muted-foreground">
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
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Icon className="h-5 w-5 text-primary" />
              <CardTitle>{title}</CardTitle>
            </div>
            {description ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p> : null}
          </div>
          {badge ? <Badge>{badge}</Badge> : null}
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">{children}</CardContent>
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
    <div className={cn("flex flex-col gap-3 rounded-2xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="flex min-w-0 gap-3">
        {leading ? <div className="shrink-0">{leading}</div> : null}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{title}</p>
            {status ? <Badge>{status}</Badge> : null}
            {meta}
          </div>
          {detail ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{detail}</p> : null}
        </div>
      </div>
      {children ? <div className="flex shrink-0 flex-wrap gap-2">{children}</div> : null}
    </div>
  );
}

export function DashboardProgressCard({ label, value, detail, icon: Icon = ChevronRight }: { label: string; value: number; detail: string; icon?: ComponentType<{ className?: string }> }) {
  const boundedValue = Math.max(0, Math.min(100, value));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <p className="text-3xl font-black">{boundedValue}%</p>
      </CardHeader>
      <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
        <div className="h-2 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
          <div className="h-full rounded-full bg-primary" style={{ width: `${boundedValue}%` }} />
        </div>
        <p>{detail}</p>
      </CardContent>
    </Card>
  );
}

export function DashboardEmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="rounded-full bg-secondary p-4">
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
