"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  CreditCard,
  DollarSign,
  Eye,
  Heart,
  ImagePlus,
  Loader2,
  MapPin,
  MessageCircle,
  PackageOpen,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  UploadCloud,
  X
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { RemoteImage } from "@/components/ui/remote-image";

export type AppNavLink = {
  href: string;
  label: string;
  current?: boolean;
};

const defaultFooterSections: AppFooterSection[] = [
  {
    title: "Marketplace",
    links: [
      { href: "/browse", label: "Browse listings" },
      { href: "/search", label: "Search" },
      { href: "/login?next=/dashboard/listings/create", label: "Start selling" }
    ]
  },
  {
    title: "Trust",
    links: [
      { href: "/how-it-works", label: "How it works" },
      { href: "/safety", label: "Trust & safety" },
      { href: "/pricing", label: "Pricing" }
    ]
  },
  {
    title: "Account",
    links: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/customer-portal", label: "Customer portal" },
      { href: "/assistant", label: "AI assistant" }
    ]
  }
];

const defaultBottomLinks: AppNavLink[] = [
  { href: "/safety", label: "Safety" },
  { href: "/pricing", label: "Pricing" }
];

export type AppHeaderProps = React.HTMLAttributes<HTMLElement> & {
  brand?: string;
  logoHref?: string;
  navLinks?: AppNavLink[];
  actions?: React.ReactNode;
  search?: React.ReactNode;
};

export function AppHeader({
  brand = "Friction-Free",
  logoHref = "/",
  navLinks = [],
  actions,
  search,
  className,
  ...props
}: AppHeaderProps) {
  return (
    <header className={cn("sticky top-0 z-50 border-b border-border/70 bg-background/95 backdrop-blur-xl", className)} {...props}>
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <Link href={logoHref} className="flex min-w-0 items-center gap-2 font-bold tracking-tight" aria-label={`${brand} home`}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-soft">
              <Store className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="truncate text-base sm:text-lg">{brand}</span>
          </Link>
          {search ? <div className="hidden min-w-0 flex-1 md:block lg:max-w-xl">{search}</div> : null}
          <nav className="hidden items-center gap-5 text-sm font-medium text-muted-foreground lg:flex" aria-label="Primary navigation">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                className={cn("whitespace-nowrap transition hover:text-foreground", link.current && "text-foreground")}
                href={link.href}
                aria-current={link.current ? "page" : undefined}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
        {navLinks.length ? (
          <nav className="flex gap-4 overflow-x-auto text-sm font-medium text-muted-foreground lg:hidden" aria-label="Primary navigation mobile">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                className={cn("shrink-0 pb-1 transition hover:text-foreground", link.current && "text-foreground")}
                href={link.href}
                aria-current={link.current ? "page" : undefined}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        ) : null}
        {search ? <div className="md:hidden">{search}</div> : null}
      </div>
    </header>
  );
}

export type AppFooterSection = {
  title: string;
  links: AppNavLink[];
};

export type AppFooterProps = React.HTMLAttributes<HTMLElement> & {
  brand?: string;
  tagline?: string;
  sections?: AppFooterSection[];
  bottomLinks?: AppNavLink[];
};

export function AppFooter({
  brand = "Friction-Free",
  tagline = "Escrow-ready marketplace infrastructure for trusted local commerce.",
  sections = defaultFooterSections,
  bottomLinks = defaultBottomLinks,
  className,
  ...props
}: AppFooterProps) {
  return (
    <footer className={cn("border-t border-border bg-card/90", className)} {...props}>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.4fr_2fr] lg:px-8">
        <div className="space-y-4">
          <Link href="/" className="inline-flex items-center gap-2 font-bold tracking-tight" aria-label={`${brand} home`}>
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            {brand}
          </Link>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">{tagline}</p>
        </div>
        <nav className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-label="Footer navigation">
          {sections.map((section) => (
            <div key={section.title} className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground">{section.title}</h2>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link className="transition hover:text-foreground" href={link.href} aria-current={link.current ? "page" : undefined}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="border-t border-border/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} {brand}. All rights reserved.</p>
          <div className="flex flex-wrap gap-4">
            {bottomLinks.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-foreground" aria-current={link.current ? "page" : undefined}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

export type ListingCardListing = {
  id: string;
  title: string;
  price: number;
  currency?: string;
  imageUrl?: string;
  imageAlt?: string;
  category?: string;
  condition?: string;
  location?: string;
  href?: string;
  sellerName?: string;
  trustScore?: number;
  isVerified?: boolean;
};

export type ListingCardProps = React.HTMLAttributes<HTMLElement> & {
  listing: ListingCardListing;
  ctaLabel?: string;
};

export function ListingCard({ listing, ctaLabel = "View details", className, ...props }: ListingCardProps) {
  const href = listing.href ?? `/listings/${listing.id}`;

  return (
    <article className={className} {...props}>
      <Card className="group h-full overflow-hidden rounded-3xl border-border/80 bg-white/95 shadow-md transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-soft">
        <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-trust-soft via-ai-soft to-premium-soft sm:aspect-[5/4] lg:aspect-[4/3]">
          <Link href={href} className="block h-full" aria-label={`${ctaLabel} for ${listing.title}`}>
            {listing.imageUrl ? (
              <RemoteImage
                src={listing.imageUrl}
                alt={listing.imageAlt ?? listing.title}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <ImagePlus className="h-10 w-10" aria-hidden="true" />
              </div>
            )}
          </Link>
          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3">
            {listing.category ? <Badge variant="premium" className="bg-card/90 shadow-sm backdrop-blur">{listing.category}</Badge> : <span />}
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-white/90 text-slate-700 shadow-md backdrop-blur transition hover:-translate-y-0.5 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Save ${listing.title} to favorites`}
            >
              <Heart className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center gap-2">
            {listing.isVerified ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-trust-border bg-white/95 px-2.5 py-1 text-xs font-bold text-trust shadow-sm backdrop-blur">
                <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
                Verified payment
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/90 px-2.5 py-1 text-xs font-bold text-slate-700 shadow-sm backdrop-blur">
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              Quick view
            </span>
          </div>
        </div>
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="grid gap-2 sm:flex sm:items-start sm:justify-between sm:gap-3">
            <div className="min-w-0 space-y-1">
              <h3 className="line-clamp-2 text-base font-bold tracking-tight sm:text-lg">
                <Link href={href} className="hover:text-primary">
                  {listing.title}
                </Link>
              </h3>
              {listing.location ? (
                <p className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{listing.location}</span>
                </p>
              ) : null}
            </div>
            <PriceDisplay amount={listing.price} currency={listing.currency} size="sm" className="text-primary sm:text-right" />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {listing.condition ? <Badge>{listing.condition}</Badge> : null}
            {listing.isVerified ? <TrustBadge label="Verified seller" tone="success" /> : null}
            {typeof listing.trustScore === "number" ? <TrustBadge label={`${listing.trustScore}% trust`} tone="info" /> : null}
          </div>
          {listing.sellerName ? <p className="text-sm text-muted-foreground">Listed by {listing.sellerName}</p> : null}
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Button asChild className="w-full" variant="trust">
              <Link href={href}>{ctaLabel}</Link>
            </Button>
            <Button asChild variant="outline" size="icon">
              <Link href={href} aria-label={`Quick view ${listing.title}`}>
                <Eye className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </article>
  );
}

export type TrustBadgeTone = "success" | "info" | "warning" | "neutral";

export type TrustBadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  label: string;
  tone?: TrustBadgeTone;
  icon?: React.ReactNode;
};

const trustBadgeToneClasses: Record<TrustBadgeTone, string> = {
  success: "border-trust-border bg-trust-soft text-trust",
  info: "border-ai-border bg-ai-soft text-ai",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  neutral: "border-border bg-secondary text-secondary-foreground"
};

export function TrustBadge({ label, tone = "success", icon, className, ...props }: TrustBadgeProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold", trustBadgeToneClasses[tone], className)}
      {...props}
    >
      {icon ?? <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />}
      {label}
    </span>
  );
}

export type PriceDisplayProps = React.HTMLAttributes<HTMLSpanElement> & {
  amount: number;
  currency?: string;
  locale?: string;
  suffix?: string;
  size?: "sm" | "md" | "lg";
};

export function PriceDisplay({ amount, currency = "USD", locale = "en-US", suffix, size = "md", className, ...props }: PriceDisplayProps) {
  const formatted = new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: amount % 1 === 0 ? 0 : 2 }).format(amount);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-baseline gap-1 font-bold tracking-tight text-foreground",
        size === "sm" && "text-lg",
        size === "md" && "text-2xl",
        size === "lg" && "text-3xl sm:text-4xl",
        className
      )}
      {...props}
    >
      {formatted}
      {suffix ? <span className="text-sm font-medium text-muted-foreground">{suffix}</span> : null}
    </span>
  );
}

export type UserAvatarProps = React.HTMLAttributes<HTMLDivElement> & {
  name: string;
  imageUrl?: string;
  size?: "sm" | "md" | "lg";
  status?: "online" | "away" | "offline";
};

export function UserAvatar({ name, imageUrl, size = "md", status, className, ...props }: UserAvatarProps) {
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?";

  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary ring-1 ring-border",
        size === "sm" && "h-8 w-8 text-xs",
        size === "md" && "h-10 w-10 text-sm",
        size === "lg" && "h-14 w-14 text-lg",
        className
      )}
      aria-label={`${name} avatar${status ? `, ${status}` : ""}`}
      role="img"
      {...props}
    >
      {imageUrl ? <RemoteImage src={imageUrl} alt="" className="h-full w-full rounded-full object-cover" /> : initials}
      {status ? (
        <span
          className={cn(
            "absolute bottom-0 right-0 block rounded-full border-2 border-card",
            size === "lg" ? "h-4 w-4" : "h-3 w-3",
            status === "online" && "bg-emerald-500",
            status === "away" && "bg-amber-500",
            status === "offline" && "bg-slate-300"
          )}
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}

export type SearchBarProps = Omit<React.FormHTMLAttributes<HTMLFormElement>, "onSubmit"> & {
  value?: string;
  placeholder?: string;
  submitLabel?: string;
  label?: string;
  onValueChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
};

export function SearchBar({
  value,
  placeholder = "Search listings, sellers, or categories",
  submitLabel = "Search",
  label = "Search marketplace",
  onValueChange,
  onSubmit,
  className,
  ...props
}: SearchBarProps) {
  const [internalValue, setInternalValue] = React.useState(value ?? "");
  const inputValue = value ?? internalValue;
  const inputId = React.useId();

  return (
    <form
      role="search"
      className={cn("flex w-full flex-col gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm sm:flex-row sm:items-center", className)}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.(inputValue);
      }}
      {...props}
    >
      <Label htmlFor={inputId} className="sr-only">
        {label}
      </Label>
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          id={inputId}
          value={inputValue}
          placeholder={placeholder}
          className="border-0 pl-9 shadow-none focus-visible:ring-0"
          onChange={(event) => {
            setInternalValue(event.target.value);
            onValueChange?.(event.target.value);
          }}
        />
      </div>
      <Button type="submit" className="sm:w-auto">
        {submitLabel}
      </Button>
    </form>
  );
}

export type CategoryPill = {
  id: string;
  label: string;
  href?: string;
  count?: number;
  selected?: boolean;
};

export type CategoryPillsProps = React.HTMLAttributes<HTMLDivElement> & {
  categories: CategoryPill[];
  onSelect?: (category: CategoryPill) => void;
};

export function CategoryPills({ categories, onSelect, className, ...props }: CategoryPillsProps) {
  return (
    <div className={cn("flex gap-2 overflow-x-auto pb-1", className)} role="list" aria-label="Marketplace categories" {...props}>
      {categories.map((category) => {
        const content = (
          <>
            <span>{category.label}</span>
            {typeof category.count === "number" ? <span className="text-xs opacity-70">{category.count}</span> : null}
          </>
        );
        const pillClassName = cn(
          buttonVariants({ variant: category.selected ? "default" : "outline", size: "sm" }),
          "shrink-0 rounded-full",
          category.selected && "shadow-soft"
        );

        return (
          <div key={category.id} role="listitem">
            {category.href ? (
              <Link href={category.href} className={pillClassName} aria-current={category.selected ? "page" : undefined}>
                {content}
              </Link>
            ) : (
              <button type="button" className={pillClassName} aria-pressed={category.selected} onClick={() => onSelect?.(category)}>
                {content}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export type EmptyStateProps = React.HTMLAttributes<HTMLDivElement> & {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
};

export function EmptyState({ title, description, icon, action, className, ...props }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/70 px-6 py-12 text-center", className)} {...props}>
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
        {icon ?? <PackageOpen className="h-7 w-7" aria-hidden="true" />}
      </div>
      <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      {description ? <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export type LoadingSpinnerProps = React.HTMLAttributes<HTMLDivElement> & {
  label?: string;
  size?: "sm" | "md" | "lg";
};

export function LoadingSpinner({ label = "Loading", size = "md", className, ...props }: LoadingSpinnerProps) {
  return (
    <div className={cn("inline-flex items-center gap-2 text-sm font-medium text-muted-foreground", className)} role="status" aria-live="polite" {...props}>
      <Loader2 className={cn("animate-spin", size === "sm" && "h-4 w-4", size === "md" && "h-5 w-5", size === "lg" && "h-7 w-7")} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export type ErrorMessageProps = React.HTMLAttributes<HTMLDivElement> & {
  title?: string;
  message: string;
  action?: React.ReactNode;
};

export function ErrorMessage({ title = "We could not load this section", message, action, className, ...props }: ErrorMessageProps) {
  return (
    <div className={cn("rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-destructive", className)} role="alert" {...props}>
      <div className="flex gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 space-y-1">
          <h2 className="font-semibold">{title}</h2>
          <p className="text-sm leading-6 text-destructive/90">{message}</p>
          {action ? <div className="pt-2">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}

export type ImageUploaderProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: string;
  description?: string;
  helperText?: string;
};

export const ImageUploader = React.forwardRef<HTMLInputElement, ImageUploaderProps>(
  ({ id, label = "Upload listing photos", description = "Drag images here or choose files from your device.", helperText = "PNG, JPG, or WebP up to 10MB each.", className, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const helperId = `${inputId}-helper`;

    return (
      <div className={cn("space-y-2", className)}>
        <Label htmlFor={inputId}>{label}</Label>
        <label
          htmlFor={inputId}
          className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card px-6 py-8 text-center transition hover:border-primary hover:bg-primary/5 focus-within:ring-2 focus-within:ring-ring"
        >
          <UploadCloud className="h-10 w-10 text-primary" aria-hidden="true" />
          <span className="mt-3 text-sm font-semibold text-foreground">{description}</span>
          <span id={helperId} className="mt-1 text-xs text-muted-foreground">
            {helperText}
          </span>
          <input ref={ref} id={inputId} type="file" accept="image/*" multiple className="sr-only" aria-describedby={helperId} {...props} />
        </label>
      </div>
    );
  }
);
ImageUploader.displayName = "ImageUploader";

export type LocationOption = {
  id: string;
  label: string;
  description?: string;
};

export type LocationPickerProps = React.FieldsetHTMLAttributes<HTMLFieldSetElement> & {
  label?: string;
  value?: string;
  options: LocationOption[];
  onValueChange?: (value: string) => void;
};

export function LocationPicker({ label = "Choose a location", value, options, onValueChange, className, ...props }: LocationPickerProps) {
  const groupName = React.useId();

  return (
    <fieldset className={cn("space-y-3", className)} {...props}>
      <legend className="text-sm font-semibold text-foreground">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={label}>
        {options.map((option) => {
          const selected = option.id === value;

          return (
            <label
              key={option.id}
              className={cn("flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-card p-3 transition hover:border-primary", selected && "border-primary bg-primary/5 ring-1 ring-primary")}
            >
              <input
                type="radio"
                name={groupName}
                value={option.id}
                checked={selected}
                onChange={() => onValueChange?.(option.id)}
                className="mt-1 h-4 w-4 accent-primary"
              />
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span>
                <span className="block text-sm font-semibold">{option.label}</span>
                {option.description ? <span className="block text-xs leading-5 text-muted-foreground">{option.description}</span> : null}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export type OfferStatus = "pending" | "accepted" | "countered" | "declined" | "expired" | "withdrawn";

export type OfferCardProps = React.HTMLAttributes<HTMLDivElement> & {
  title: string;
  buyerName: string;
  amount: number;
  currency?: string;
  status?: OfferStatus;
  expiresAt?: string;
  actions?: React.ReactNode;
};

const offerStatusClasses: Record<OfferStatus, string> = {
  pending: "bg-amber-50 text-amber-800 border-amber-200 offer-status-pending",
  accepted: "bg-emerald-50 text-emerald-700 border-emerald-200 offer-status-accepted",
  countered: "bg-ai-soft text-ai border-ai-border offer-status-pending",
  declined: "bg-slate-100 text-slate-600 border-slate-200",
  expired: "bg-destructive/10 text-destructive border-destructive/30",
  withdrawn: "bg-slate-100 text-slate-600 border-slate-200"
};

export function OfferCard({ title, buyerName, amount, currency, status = "pending", expiresAt, actions, className, ...props }: OfferCardProps) {
  return (
    <Card className={cn("overflow-hidden interactive-card", className)} {...props}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="min-w-0">
          <CardTitle className="line-clamp-1">{title}</CardTitle>
          <CardDescription className="flex items-center gap-1 pt-1">
            <DollarSign className="h-4 w-4" aria-hidden="true" /> Offer from {buyerName}
          </CardDescription>
        </div>
        <span className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold capitalize", offerStatusClasses[status])}>{status}</span>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 rounded-2xl bg-secondary p-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Offer amount</p>
            <PriceDisplay amount={amount} currency={currency} size="md" />
          </div>
          {expiresAt ? (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" /> Expires {expiresAt}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">{actions}</div> : null}
      </CardContent>
    </Card>
  );
}

export type MessageBubbleProps = React.HTMLAttributes<HTMLDivElement> & {
  body: string;
  senderName: string;
  timestamp?: string;
  isOwn?: boolean;
  avatarUrl?: string;
  status?: "sent" | "delivered" | "read";
};

export function MessageBubble({ body, senderName, timestamp, isOwn = false, avatarUrl, status, className, ...props }: MessageBubbleProps) {
  return (
    <div className={cn("flex w-full gap-2", isOwn ? "justify-end" : "justify-start", className)} {...props}>
      {!isOwn ? <UserAvatar name={senderName} imageUrl={avatarUrl} size="sm" /> : null}
      <div className={cn("max-w-[85%] rounded-3xl px-4 py-3 sm:max-w-[70%]", isOwn ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-card text-card-foreground shadow-sm")}>
        <p className="text-sm leading-6">{body}</p>
        <div className={cn("mt-2 flex items-center gap-1 text-xs", isOwn ? "text-primary-foreground/75" : "text-muted-foreground")}>
          <MessageCircle className="h-3 w-3" aria-hidden="true" />
          <span>{senderName}</span>
          {timestamp ? <span>· {timestamp}</span> : null}
          {status ? (
            <span className="inline-flex items-center gap-1 capitalize">
              · <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> {status}
            </span>
          ) : null}
        </div>
      </div>
      {isOwn ? <UserAvatar name={senderName} imageUrl={avatarUrl} size="sm" /> : null}
    </div>
  );
}

export { ArrowRight, Check, ChevronDown, Sparkles, Star, X };
