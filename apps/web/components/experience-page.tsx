import Link from "next/link";
import { ArrowRight, CheckCircle2, Database, Layers3, MousePointer2, PanelTop, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ExperiencePage as ExperiencePageType } from "@/lib/page-data";

const sections = [
  { key: "layout", label: "Layout", icon: PanelTop },
  { key: "components", label: "Components", icon: Layers3 },
  { key: "actions", label: "User actions", icon: MousePointer2 },
  { key: "states", label: "States", icon: RotateCcw },
  { key: "api", label: "API/data requirements", icon: Database }
] as const;

type SectionKey = (typeof sections)[number]["key"];

export function ExperiencePage({ page, related }: { page: ExperiencePageType; related: ExperiencePageType[] }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <section className="rounded-[2rem] border border-border bg-card p-6 shadow-soft sm:p-8 lg:p-10">
          <Badge>{page.eyebrow}</Badge>
          <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight text-foreground sm:text-5xl lg:text-6xl">{page.title}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">{page.promise}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button>Primary CTA</Button>
            <Button variant="outline">Secondary action</Button>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <Metric label="Persona" value={page.persona} />
            <Metric label="Route" value={page.route} />
            <Metric label="Responsive rule" value="Mobile-first, desktop-enhanced" />
          </div>
        </section>
        <aside className="rounded-[2rem] border border-border bg-slate-950 p-6 text-white shadow-soft sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-200">Experience canvas</p>
          <div className="mt-6 space-y-4">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <div className="flex items-start gap-3" key={section.key}>
                  <span className="mt-1 rounded-xl bg-white/10 p-2 text-teal-200"><Icon className="h-4 w-4" /></span>
                  <div>
                    <h2 className="font-semibold">{section.label}</h2>
                    <p className="text-sm leading-6 text-slate-300">{page[section.key as SectionKey][0]}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        {sections.map((section) => {
          const Icon = section.icon;
          const values = page[section.key as SectionKey];
          return (
            <Card className={section.key === "api" ? "lg:col-span-2" : ""} key={section.key}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="rounded-xl bg-primary/10 p-2 text-primary"><Icon className="h-5 w-5" /></span>
                  <div>
                    <CardTitle>{section.label}</CardTitle>
                    <CardDescription>{section.label} definition for {page.title.toLowerCase()}.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {values.map((value) => (
                    <li className="flex gap-3 rounded-xl bg-muted/60 p-3 text-sm leading-6" key={value}>
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{value}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <section className="mt-8 rounded-[2rem] border border-border bg-card p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Badge>Related pages</Badge>
            <h2 className="mt-3 text-2xl font-bold tracking-tight">Continue through the marketplace journey</h2>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {related.map((item) => (
            <Link className="group rounded-2xl border border-border bg-background p-5 transition hover:-translate-y-1 hover:shadow-soft" href={item.route} key={item.key}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{item.eyebrow}</p>
              <h3 className="mt-2 font-bold">{item.title}</h3>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{item.promise}</p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">Open page <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold leading-6">{value}</p>
    </div>
  );
}
