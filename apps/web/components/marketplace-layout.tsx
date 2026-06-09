import Link from "next/link";
import type React from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const sectionSpacing = {
  shell: "app-container",
  wideShell: "app-container-wide",
  section: "section-y-lg",
  compact: "section-y",
  grid: "grid gap-4 sm:gap-5 lg:gap-6",
  adaptiveGrid: "adaptive-grid",
  adaptiveGridSm: "adaptive-grid-sm"
};

export type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  action?: React.ReactNode;
  className?: string;
};

export function SectionHeader({ eyebrow, title, description, align = "left", action, className }: SectionHeaderProps) {
  return (
    <div className={cn("mb-7 flex flex-col gap-4 sm:mb-10", align === "center" ? "items-center text-center" : "md:flex-row md:items-end md:justify-between", className)}>
      <div className={cn("max-w-3xl", align === "center" && "mx-auto")}>
        {eyebrow ? <p className="brand-kicker">{eyebrow}</p> : null}
        <h2 className="mt-3 text-section text-foreground">{title}</h2>
        {description ? <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0 sm:w-fit">{action}</div> : null}
    </div>
  );
}

export type TrustBadgeProps = {
  icon: LucideIcon;
  label: string;
  description?: string;
  tone?: "emerald" | "sky" | "amber" | "slate";
  className?: string;
};

const trustBadgeTones = {
  emerald: "border-trust-border bg-trust-soft text-trust",
  sky: "border-ai-border bg-ai-soft text-ai",
  amber: "border-amber-200 bg-premium-soft text-premium-foreground",
  slate: "border-border bg-white text-brand-slate"
};

export function TrustBadge({ icon: Icon, label, description, tone = "emerald", className }: TrustBadgeProps) {
  return (
    <div className={cn("inline-flex min-w-0 items-center gap-3 rounded-2xl border px-3 py-2.5 shadow-sm backdrop-blur sm:px-4 sm:py-3", trustBadgeTones[tone], className)}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/70 sm:h-9 sm:w-9">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-black">{label}</span>
        {description ? <span className="block text-xs leading-5 opacity-75">{description}</span> : null}
      </span>
    </div>
  );
}

export type CategoryCardProps = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  count?: number;
  accent?: string;
};

export function CategoryCard({ title, description, href, icon: Icon, count, accent = "from-emerald-50 to-white" }: CategoryCardProps) {
  return (
    <Link href={href} className="group block h-full rounded-3xl border border-border/80 bg-card p-1 shadow-sm transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
      <div className={cn("flex h-full flex-col rounded-[1.35rem] bg-gradient-to-br p-4 sm:p-5", accent)}>
        <div className="flex items-start justify-between gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-primary shadow-md">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          {typeof count === "number" ? <Badge variant="trust" className="bg-white/90">{count.toLocaleString()} live</Badge> : null}
        </div>
        <h3 className="mt-5 text-lg font-black tracking-tight">{title}</h3>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{description}</p>
        <span className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-primary">
          Explore <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}

export type FeatureCardProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  badge?: string;
};

export function FeatureCard({ icon: Icon, title, description, badge }: FeatureCardProps) {
  return (
    <Card className="h-full overflow-hidden border-border/80 bg-card/95 shadow-md transition hover:-translate-y-0.5 hover:shadow-soft">
      <CardHeader className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ai-soft text-ai">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          {badge ? <Badge variant="ai">{badge}</Badge> : null}
        </div>
        <CardTitle className="pt-3 text-lg sm:text-xl">{title}</CardTitle>
        <CardDescription className="text-sm leading-6">{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}

export type StatCardProps = {
  label: string;
  value: string;
  detail?: string;
  icon?: LucideIcon;
};

export function StatCard({ label, value, detail, icon: Icon = Sparkles }: StatCardProps) {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-md backdrop-blur">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-trust" aria-hidden="true" />
      </div>
      <p className="mt-3 text-3xl font-black tracking-tight text-foreground">{value}</p>
      {detail ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p> : null}
    </div>
  );
}

export type CTASectionProps = {
  eyebrow?: string;
  title: string;
  description: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  points?: string[];
};

export function CTASection({ eyebrow = "Ready when you are", title, description, primaryHref, primaryLabel, secondaryHref, secondaryLabel, points = [] }: CTASectionProps) {
  return (
    <section className={cn(sectionSpacing.shell, "py-12 sm:py-16")}>
      <div className="overflow-hidden rounded-[2rem] border border-emerald-200/30 bg-premium-dark text-white shadow-trust">
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.2fr_0.8fr] lg:p-10">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">{eyebrow}</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{title}</h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">{description}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" variant="trust"><Link href={primaryHref}>{primaryLabel}</Link></Button>
              {secondaryHref && secondaryLabel ? <Button asChild size="lg" variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/15"><Link href={secondaryHref}>{secondaryLabel}</Link></Button> : null}
            </div>
          </div>
          {points.length ? (
            <div className="grid gap-3">
              {points.map((point) => (
                <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-3 text-sm font-semibold text-slate-100" key={point}>
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
                  {point}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
