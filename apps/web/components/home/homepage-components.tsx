import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, CheckCircle2, MapPin, Search, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MarketplaceSearchBar({ className }: { className?: string }) {
  return (
    <form action="/search" className={cn("rounded-[1.7rem] border border-border/80 bg-white/90 p-2 shadow-soft backdrop-blur", className)} role="search">
      <label htmlFor="homepage-marketplace-search" className="sr-only">
        Search the marketplace
      </label>
      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_12rem] lg:grid-cols-[minmax(0,1fr)_12rem_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            id="homepage-marketplace-search"
            name="q"
            placeholder="Search by item, budget, condition, or pickup area..."
            className="h-12 w-full rounded-2xl border border-transparent bg-secondary/70 pl-12 pr-4 text-sm font-medium outline-none transition placeholder:text-muted-foreground hover:border-primary/20 focus:border-primary focus:ring-2 focus:ring-ring"
          />
        </div>
        <label className="relative block">
          <span className="sr-only">Location</span>
          <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            name="location"
            placeholder="Nearby"
            className="h-12 w-full rounded-2xl border border-transparent bg-secondary/70 pl-11 pr-4 text-sm font-medium outline-none transition placeholder:text-muted-foreground hover:border-primary/20 focus:border-primary focus:ring-2 focus:ring-ring"
          />
        </label>
        <Button size="lg" type="submit" variant="trust" className="md:col-span-2 lg:col-span-1">
          Search
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 px-2 pb-1 text-xs text-muted-foreground">
        <Badge variant="ai">
          <Sparkles className="mr-1 h-3 w-3" aria-hidden="true" />
          AI assisted
        </Badge>
        <span>Try “sofa with pickup tonight”, “camera kit under $1,700”, or “laptop near downtown”.</span>
      </div>
    </form>
  );
}

export function ToolCard({
  icon: Icon,
  title,
  description,
  href,
  cta = "Explore"
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  cta?: string;
}) {
  return (
    <Card className="group h-full overflow-hidden shadow-md transition hover:-translate-y-0.5 hover:shadow-soft">
      <CardHeader className="p-4 sm:p-6">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ai-soft text-ai sm:h-12 sm:w-12">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <CardTitle className="pt-3 text-lg sm:text-xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Link href={href} className="inline-flex items-center gap-1 text-sm font-bold text-primary">
          {cta}
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
        </Link>
      </CardContent>
    </Card>
  );
}

export function IntelligenceCard({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: LucideIcon }) {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-md backdrop-blur">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-trust" aria-hidden="true" />
      </div>
      <p className="mt-3 text-3xl font-black tracking-tight text-foreground">{value}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
    </div>
  );
}

export function TestimonialCard({ quote, name, role }: { quote: string; name: string; role: string }) {
  return (
    <Card className="h-full shadow-md">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex gap-1 text-premium" aria-label="Five star rating">
          {Array.from({ length: 5 }).map((_, index) => (
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" key={index} />
          ))}
        </div>
        <CardDescription className="pt-3 text-base leading-7 text-foreground">“{quote}”</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="font-black">{name}</p>
        <p className="text-sm text-muted-foreground">{role}</p>
      </CardContent>
    </Card>
  );
}

export function AppPromotionPanel() {
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-emerald-200/30 bg-premium-dark text-white shadow-trust sm:rounded-[2rem]">
      <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.85fr)] lg:gap-8 lg:p-8 xl:p-10">
        <div>
          <Badge variant="dark">Mobile app preview</Badge>
          <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Take the marketplace with you.</h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
            The upcoming app keeps saved searches, listing alerts, secure chat, pickup reminders, payment status, and risk warnings in one clear flow.
          </p>
          <div className="mt-7 grid gap-3 sm:flex sm:flex-wrap">
            <Button asChild size="lg" variant="trust">
              <Link href="/signup">Join the app waitlist</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/15">
              <Link href="/assistant">Preview assistant</Link>
            </Button>
          </div>
        </div>
        <div className="rounded-[1.75rem] border border-white/10 bg-white/10 p-4">
          <div className="rounded-[1.35rem] bg-white p-4 text-foreground shadow-soft">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Listing alert</p>
            <h3 className="mt-3 text-xl font-black">Verified camera kit matched</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Lower risk, strong seller history, pickup details, and protected checkout available.</p>
            <div className="mt-4 grid gap-2">
              {["Saved search match", "Protected checkout available", "Pickup checklist ready"].map((item) => (
                <div className="flex items-center gap-2 rounded-2xl bg-secondary p-3 text-sm font-bold" key={item}>
                  <CheckCircle2 className="h-4 w-4 text-trust" aria-hidden="true" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
