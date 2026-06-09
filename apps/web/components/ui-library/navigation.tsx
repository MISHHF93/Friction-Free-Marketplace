"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, Menu, Search, ShieldCheck, Store, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { NavItem } from "./types";

export type NavigationProps = React.HTMLAttributes<HTMLElement> & {
  brand?: React.ReactNode;
  logoHref?: string;
  items: NavItem[];
  actions?: React.ReactNode;
  search?: React.ReactNode;
  utility?: React.ReactNode;
  mobileLabel?: string;
};

export function Navigation({
  brand = "Friction-Free",
  logoHref = "/",
  items,
  actions,
  search,
  utility,
  mobileLabel = "Open navigation",
  className,
  ...props
}: NavigationProps) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <header className={cn("sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur-xl", className)} {...props}>
      <div className="app-container flex flex-col gap-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <Link href={logoHref} className="flex min-w-0 items-center gap-2 font-black tracking-tight" aria-label="Go to home">
            <span className="brand-icon brand-icon-lg brand-icon-commerce">
              <Store className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="truncate">{brand}</span>
          </Link>

          {search ? <div className="hidden min-w-0 flex-1 md:block lg:max-w-xl">{search}</div> : null}

          <nav className="hidden items-center gap-5 text-sm font-semibold text-muted-foreground lg:flex" aria-label="Primary navigation">
            {items.map((item) => (
              <NavigationLink key={item.href} item={item} />
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            {utility}
            {actions}
            <button
              type="button"
              className="brand-focus inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-xs lg:hidden"
              aria-label={mobileLabel}
              aria-expanded={open}
              aria-controls="mobile-primary-navigation"
              onClick={() => setOpen((value) => !value)}
            >
              {open ? <X className="h-4 w-4" aria-hidden="true" /> : <Menu className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
        </div>

        {search ? <div className="md:hidden">{search}</div> : null}

        {open ? (
          <div id="mobile-primary-navigation" className="motion-mobile-panel rounded-2xl border border-border bg-card p-3 shadow-soft lg:hidden">
            <nav className="grid gap-1" aria-label="Mobile primary navigation">
              {items.map((item) => (
                <NavigationLink key={item.href} item={item} mobile onNavigate={() => setOpen(false)} />
              ))}
            </nav>
          </div>
        ) : null}
      </div>
    </header>
  );
}

function NavigationLink({ item, mobile = false, onNavigate }: { item: NavItem; mobile?: boolean; onNavigate?: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.disabled ? "#" : item.href}
      aria-current={item.current ? "page" : undefined}
      aria-disabled={item.disabled || undefined}
      className={cn(
        "group inline-flex items-center gap-2 rounded-xl transition",
        mobile ? "px-3 py-2.5 text-sm font-bold hover:bg-secondary" : "whitespace-nowrap hover:text-foreground",
        item.current && (mobile ? "bg-commerce-soft text-commerce" : "text-foreground"),
        item.disabled && "pointer-events-none opacity-50",
      )}
      onClick={onNavigate}
    >
      {Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
      <span className="min-w-0">
        <span className="block truncate">{item.label}</span>
        {mobile && item.description ? <span className="block text-xs font-medium leading-5 text-muted-foreground">{item.description}</span> : null}
      </span>
      {item.badge ? <span className="shrink-0">{item.badge}</span> : null}
    </Link>
  );
}

export type SidebarProps = React.HTMLAttributes<HTMLElement> & {
  title: string;
  description?: string;
  eyebrow?: string;
  items: NavItem[];
  footer?: React.ReactNode;
  activeHref?: string;
};

export function Sidebar({ title, description, eyebrow = "Workspace", items, footer, activeHref, className, ...props }: SidebarProps) {
  return (
    <aside className={cn("brand-panel hidden p-4 lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto", className)} {...props}>
      <div className="mb-4 rounded-2xl bg-premium-dark p-4 text-white shadow-admin">
        <p className="text-eyebrow text-emerald-300">{eyebrow}</p>
        <h2 className="mt-2 text-xl font-black tracking-tight">{title}</h2>
        {description ? <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p> : null}
      </div>
      <nav className="grid gap-1" aria-label={title}>
        {items.map((item) => {
          const Icon = item.icon;
          const current = item.current ?? item.href === activeHref;

          return (
            <Link
              key={item.href}
              href={item.disabled ? "#" : item.href}
              aria-current={current ? "page" : undefined}
              aria-disabled={item.disabled || undefined}
              className={cn(
                "group flex items-start gap-3 rounded-2xl px-3 py-2.5 text-sm transition-all hover:-translate-y-0.5 hover:bg-secondary hover:text-foreground",
                current ? "bg-commerce-gradient text-white shadow-commerce hover:text-white" : "text-muted-foreground",
                item.disabled && "pointer-events-none opacity-50",
              )}
            >
              {Icon ? <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : null}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{item.label}</span>
                {item.description ? <span className={cn("block text-xs leading-5", current ? "text-white/75" : "text-muted-foreground")}>{item.description}</span> : null}
              </span>
              {item.badge ? <span className="shrink-0">{item.badge}</span> : null}
            </Link>
          );
        })}
      </nav>
      {footer ? <div className="mt-4 border-t border-border pt-4">{footer}</div> : null}
    </aside>
  );
}

export type FooterSection = {
  title: string;
  links: NavItem[];
};

export type FooterProps = React.HTMLAttributes<HTMLElement> & {
  brand?: React.ReactNode;
  tagline?: string;
  sections: FooterSection[];
  socialLinks?: NavItem[];
  legalLinks?: NavItem[];
  newsletter?: React.ReactNode;
};

export function Footer({
  brand = "Friction-Free",
  tagline = "AI-powered commerce with payment-grade trust and safer marketplace handoffs.",
  sections,
  socialLinks,
  legalLinks,
  newsletter,
  className,
  ...props
}: FooterProps) {
  return (
    <footer className={cn("border-t border-border bg-premium-dark text-white", className)} {...props}>
      <div className="app-container grid gap-10 py-10 sm:py-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)]">
        <div className="space-y-5">
          <Link href="/" className="inline-flex items-center gap-2 font-black tracking-tight text-white" aria-label="Go to home">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-trust-soft text-trust">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            {brand}
          </Link>
          <p className="max-w-md text-sm leading-6 text-slate-300">{tagline}</p>
          {newsletter}
          {socialLinks?.length ? (
            <nav className="flex flex-wrap gap-3" aria-label="Social links">
              {socialLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link key={link.href} href={link.href} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:text-white" aria-label={link.label}>
                    {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : <span className="text-xs font-bold">{link.label.slice(0, 2)}</span>}
                  </Link>
                );
              })}
            </nav>
          ) : null}
        </div>

        <nav className="grid gap-7 sm:grid-cols-2 xl:grid-cols-4" aria-label="Footer navigation">
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="font-bold text-white">{section.title}</h2>
              <ul className="mt-4 space-y-3 text-sm text-slate-300">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="hover:text-white" aria-current={link.current ? "page" : undefined}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="border-t border-white/10">
        <div className="app-container flex flex-col gap-3 py-5 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Friction-Free Marketplace. All rights reserved.</p>
          {legalLinks?.length ? (
            <nav className="flex flex-wrap gap-4" aria-label="Legal links">
              {legalLinks.map((link) => (
                <Link key={link.href} href={link.href} className="hover:text-white">
                  {link.label}
                </Link>
              ))}
            </nav>
          ) : null}
        </div>
      </div>
    </footer>
  );
}

export type SearchBarSuggestion = {
  label: string;
  href?: string;
};

export type SearchBarProps = Omit<React.FormHTMLAttributes<HTMLFormElement>, "onSubmit"> & {
  value?: string;
  name?: string;
  label?: string;
  placeholder?: string;
  submitLabel?: string;
  aiAssisted?: boolean;
  suggestions?: SearchBarSuggestion[];
  onValueChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
};

export function SearchBar({
  value,
  name = "q",
  label = "Search marketplace",
  placeholder = "Search listings, sellers, condition, budget, or pickup area...",
  submitLabel = "Search",
  aiAssisted = true,
  suggestions,
  onValueChange,
  onSubmit,
  action,
  className,
  ...props
}: SearchBarProps) {
  const [internalValue, setInternalValue] = React.useState(value ?? "");
  const inputValue = value ?? internalValue;
  const inputId = React.useId();

  return (
    <form
      role="search"
      className={cn("grid w-full gap-2", className)}
      onSubmit={(event) => {
        if (!onSubmit) return;
        event.preventDefault();
        onSubmit(inputValue);
      }}
      action={onSubmit ? undefined : action}
      {...props}
    >
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <div className="relative flex min-w-0 items-center rounded-2xl border border-input bg-card/95 p-1.5 shadow-input transition focus-within:border-primary focus-within:ring-3 focus-within:ring-ring/30">
        <Search className="pointer-events-none absolute left-4 h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <Input
          id={inputId}
          name={name}
          value={inputValue}
          placeholder={placeholder}
          className="min-h-10 border-0 bg-transparent pl-9 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          onChange={(event) => {
            setInternalValue(event.target.value);
            onValueChange?.(event.target.value);
          }}
        />
        {aiAssisted ? <Badge variant="ai" className="pointer-events-none hidden shrink-0 sm:inline-flex">AI</Badge> : null}
        <Button type="submit" size="sm" className="ml-2 hidden shrink-0 sm:inline-flex">
          {submitLabel}
        </Button>
      </div>
      {suggestions?.length ? (
        <div className="scroll-rail" aria-label="Suggested searches">
          {suggestions.map((suggestion) =>
            suggestion.href ? (
              <Link key={suggestion.label} href={suggestion.href} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0 rounded-full")}>
                {suggestion.label}
              </Link>
            ) : (
              <button
                key={suggestion.label}
                type="button"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0 rounded-full")}
                onClick={() => {
                  setInternalValue(suggestion.label);
                  onValueChange?.(suggestion.label);
                }}
              >
                {suggestion.label}
              </button>
            ),
          )}
        </div>
      ) : null}
    </form>
  );
}
