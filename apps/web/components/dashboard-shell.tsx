import type { ComponentType, ReactNode } from "react";
import { Bell, ListChecks, Package } from "lucide-react";
import type { DashboardLink } from "@/components/dashboard-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type { DashboardLink } from "@/components/dashboard-config";
export { dashboardLinks } from "@/components/dashboard-config";

export function DashboardShell({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  links?: DashboardLink[];
  children: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-card/90 p-5 shadow-sm sm:p-6">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          <Bell className="h-4 w-4" /> Protected workspace
        </p>
        <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{title}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">{description}</p>
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
