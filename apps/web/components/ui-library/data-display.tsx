import * as React from "react";
import { ArrowDownRight, ArrowUpRight, BarChart3, Loader2, PackageOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ComponentTone, IconComponent } from "./types";

export type MetricTrend = {
  label: string;
  direction?: "up" | "down" | "flat";
  tone?: Extract<ComponentTone, "trust" | "warning" | "risk" | "ai">;
};

export type MetricCardProps = React.HTMLAttributes<HTMLDivElement> & {
  label: string;
  value: React.ReactNode;
  detail?: string;
  icon?: IconComponent;
  trend?: MetricTrend;
  tone?: Extract<ComponentTone, "commerce" | "trust" | "ai" | "premium" | "warning" | "risk">;
};

const metricToneClassName: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  commerce: "brand-icon-commerce",
  trust: "brand-icon-trust",
  ai: "brand-icon-ai",
  premium: "brand-icon-premium",
  warning: "border-amber-200 bg-safety-warning-soft text-amber-800",
  risk: "brand-icon-risk",
};

export function MetricCard({ label, value, detail, icon: Icon = BarChart3, trend, tone = "commerce", className, ...props }: MetricCardProps) {
  return (
    <Card className={cn("card-interactive", className)} {...props}>
      <CardHeader className="p-4 pb-3 sm:p-6 sm:pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardDescription>{label}</CardDescription>
          <span className={cn("brand-icon brand-icon-sm", metricToneClassName[tone])}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <p className="text-metric tabular-nums">{value}</p>
          {trend ? <TrendBadge trend={trend} /> : null}
        </div>
      </CardHeader>
      {detail ? <CardContent className="p-4 pt-0 text-sm leading-6 text-muted-foreground sm:p-6 sm:pt-0">{detail}</CardContent> : null}
    </Card>
  );
}

export type StatsCardStat = {
  label: string;
  value: React.ReactNode;
  detail?: string;
  tone?: MetricCardProps["tone"];
};

export type StatsCardProps = React.HTMLAttributes<HTMLDivElement> & {
  title: string;
  description?: string;
  stats: StatsCardStat[];
};

export function StatsCard({ title, description, stats, className, ...props }: StatsCardProps) {
  return (
    <Card className={className} {...props}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-border/70 bg-secondary/45 p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">{stat.label}</p>
              <p className="mt-2 text-2xl font-black tracking-tight tabular-nums">{stat.value}</p>
              {stat.detail ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{stat.detail}</p> : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TrendBadge({ trend }: { trend: MetricTrend }) {
  const Icon = trend.direction === "down" ? ArrowDownRight : ArrowUpRight;
  const variant = trend.tone === "risk" ? "risk" : trend.tone === "warning" ? "warning" : trend.tone === "ai" ? "ai" : "trust";

  return (
    <Badge variant={variant} size="sm" className="gap-1">
      {trend.direction && trend.direction !== "flat" ? <Icon className="h-3 w-3" aria-hidden="true" /> : null}
      {trend.label}
    </Badge>
  );
}

export type ChartDatum = {
  label: string;
  value: number;
  tone?: Extract<ComponentTone, "commerce" | "trust" | "ai" | "premium" | "warning" | "risk">;
};

export type ChartCardProps = React.HTMLAttributes<HTMLDivElement> & {
  title: string;
  description?: string;
  data: ChartDatum[];
  valueFormatter?: (value: number) => string;
  caption?: string;
};

const chartToneClassName: Record<NonNullable<ChartDatum["tone"]>, string> = {
  commerce: "bg-commerce",
  trust: "bg-trust",
  ai: "bg-ai",
  premium: "bg-premium",
  warning: "bg-safety-warning",
  risk: "bg-safety-risk",
};

export function ChartCard({ title, description, data, valueFormatter = (value) => value.toLocaleString(), caption, className, ...props }: ChartCardProps) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <Card className={className} {...props}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{title}</CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          <span className="brand-icon brand-icon-sm brand-icon-ai">
            <BarChart3 className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3" role="img" aria-label={`${title} chart`}>
          {data.map((item) => {
            const width = `${Math.max(4, (item.value / max) * 100)}%`;

            return (
              <div key={item.label} className="grid gap-1">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold">{item.label}</span>
                  <span className="font-mono text-muted-foreground tabular-nums">{valueFormatter(item.value)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div className={cn("h-full rounded-full", chartToneClassName[item.tone ?? "commerce"])} style={{ width }} />
                </div>
              </div>
            );
          })}
        </div>
        {caption ? <p className="mt-4 text-xs leading-5 text-muted-foreground">{caption}</p> : null}
      </CardContent>
    </Card>
  );
}

export type EmptyStateProps = React.HTMLAttributes<HTMLDivElement> & {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  tone?: Extract<ComponentTone, "default" | "commerce" | "ai" | "trust" | "warning">;
};

export function EmptyState({ title, description, icon, action, tone = "default", className, ...props }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-panel border border-dashed border-border bg-card/70 px-6 py-12 text-center", className)} {...props}>
      <div className={cn("mb-4 brand-icon brand-icon-lg", tone === "commerce" && "brand-icon-commerce", tone === "ai" && "brand-icon-ai", tone === "trust" && "brand-icon-trust", tone === "warning" && "border-amber-200 bg-safety-warning-soft text-amber-800")}>
        {icon ?? <PackageOpen className="h-7 w-7" aria-hidden="true" />}
      </div>
      <h2 className="text-lg font-black tracking-tight">{title}</h2>
      {description ? <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export type LoadingStateProps = React.HTMLAttributes<HTMLDivElement> & {
  label?: string;
  variant?: "spinner" | "skeleton" | "page";
  rows?: number;
};

export function LoadingState({ label = "Loading", variant = "spinner", rows = 3, className, ...props }: LoadingStateProps) {
  if (variant === "skeleton") {
    return (
      <div className={cn("grid gap-3", className)} role="status" aria-live="polite" aria-label={label} {...props}>
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (variant === "page") {
    return (
      <div className={cn("flex min-h-[22rem] flex-col items-center justify-center gap-4 rounded-panel border border-border bg-card/70 p-8 text-center", className)} role="status" aria-live="polite" {...props}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <div>
          <p className="font-black">{label}</p>
          <p className="mt-1 text-sm text-muted-foreground">Preparing the latest marketplace data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground", className)} role="status" aria-live="polite" {...props}>
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
