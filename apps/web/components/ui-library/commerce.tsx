import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Eye,
  Heart,
  ImagePlus,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Star,
  Store,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RemoteImage } from "@/components/ui/remote-image";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/i18n/format";
import type { ComponentSize, ComponentTone } from "./types";

export type PriceDisplayProps = React.HTMLAttributes<HTMLSpanElement> & {
  amount: number;
  currency?: string;
  locale?: string;
  suffix?: string;
  size?: ComponentSize;
  align?: "left" | "right";
  signed?: boolean;
};

export function PriceDisplay({
  amount,
  currency = "USD",
  locale,
  suffix,
  size = "md",
  align = "left",
  signed = false,
  className,
  ...props
}: PriceDisplayProps) {
  const unsigned = formatMoney(Math.abs(amount), currency, locale);
  const formatted = signed && amount !== 0 ? `${amount > 0 ? "+" : "−"}${unsigned}` : formatMoney(amount, currency, locale);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-baseline gap-1 font-black tracking-tight text-foreground [unicode-bidi:isolate]",
        size === "sm" && "text-lg",
        size === "md" && "text-2xl",
        size === "lg" && "text-3xl sm:text-4xl",
        align === "right" && "justify-end text-right",
        className,
      )}
      {...props}
    >
      {formatted}
      {suffix ? <span className="text-sm font-semibold text-muted-foreground">{suffix}</span> : null}
    </span>
  );
}

export type TrustBadgeTone = Extract<ComponentTone, "trust" | "ai" | "safety" | "premium" | "warning" | "risk"> | "neutral";

export type TrustBadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  label: string;
  tone?: TrustBadgeTone;
  score?: number;
  icon?: React.ReactNode;
};

const trustBadgeClassName: Record<TrustBadgeTone, string> = {
  trust: "status-trust",
  ai: "status-ai",
  safety: "status-safety",
  premium: "status-premium",
  warning: "status-warning",
  risk: "status-risk",
  neutral: "border-border bg-secondary text-secondary-foreground",
};

export function TrustBadge({ label, tone = "trust", score, icon, className, ...props }: TrustBadgeProps) {
  const describedLabel = typeof score === "number" ? `${label}, ${score} out of 100` : label;

  return (
    <span className={cn("status-badge gap-1.5", trustBadgeClassName[tone], className)} aria-label={describedLabel} {...props}>
      {icon ?? <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />}
      <span>{label}</span>
      {typeof score === "number" ? <span className="font-black tabular-nums">{score}</span> : null}
    </span>
  );
}

export type ListingCardListing = {
  id: string;
  title: string;
  price: number;
  currency?: string;
  href?: string;
  imageUrl?: string;
  imageAlt?: string;
  category?: string;
  condition?: string;
  location?: string;
  sellerName?: string;
  trustScore?: number;
  isVerified?: boolean;
  isFavorite?: boolean;
  badges?: string[];
};

export type ListingCardProps = React.HTMLAttributes<HTMLElement> & {
  listing: ListingCardListing;
  ctaLabel?: string;
  favoriteAction?: React.ReactNode;
};

export function ListingCard({ listing, ctaLabel = "View details", favoriteAction, className, ...props }: ListingCardProps) {
  const href = listing.href ?? `/listings/${listing.id}`;

  return (
    <article className={cn("h-full", className)} {...props}>
      <Card className="card-interactive group h-full overflow-hidden">
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary sm:aspect-[5/4] lg:aspect-[4/3]">
          <Link href={href} className="block h-full" aria-label={`${ctaLabel} for ${listing.title}`}>
            {listing.imageUrl ? (
              <RemoteImage src={listing.imageUrl} alt={listing.imageAlt ?? listing.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <ImagePlus className="h-10 w-10" aria-hidden="true" />
              </div>
            )}
          </Link>

          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3">
        {listing.category ? <Badge variant="premium" className="bg-card shadow-sm">{listing.category}</Badge> : <span />}
            {favoriteAction ?? (
              <button
                type="button"
          className="brand-focus inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md transition hover:-translate-y-0.5 hover:text-safety-risk"
                aria-label={`${listing.isFavorite ? "Remove" : "Save"} ${listing.title}`}
                aria-pressed={listing.isFavorite}
              >
                <Heart className={cn("h-4 w-4", listing.isFavorite && "fill-rose-500 text-rose-600")} aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center gap-2">
        {listing.isVerified ? <TrustBadge label="Verified payment" icon={<CreditCard className="h-3.5 w-3.5" aria-hidden="true" />} className="bg-card" /> : null}
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-bold text-foreground shadow-sm">
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
            {listing.isVerified ? <TrustBadge label="Verified seller" /> : null}
            {typeof listing.trustScore === "number" ? <TrustBadge label="Trust" tone="ai" score={listing.trustScore} /> : null}
            {listing.badges?.map((badge) => <Badge key={badge} variant="premium">{badge}</Badge>)}
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

export type SellerCardSeller = {
  id: string;
  name: string;
  href?: string;
  avatarUrl?: string;
  location?: string;
  rating?: number;
  reviewCount?: number;
  trustScore?: number;
  verified?: boolean;
  responseTime?: string;
  salesCount?: number;
};

export type SellerCardProps = React.HTMLAttributes<HTMLElement> & {
  seller: SellerCardSeller;
  action?: React.ReactNode;
};

export function SellerCard({ seller, action, className, ...props }: SellerCardProps) {
  const href = seller.href ?? `/sellers/${seller.id}`;

  return (
    <article className={cn("h-full", className)} {...props}>
      <Card className="card-interactive h-full">
        <CardHeader>
          <div className="flex items-start gap-4">
            <SellerAvatar name={seller.name} imageUrl={seller.avatarUrl} />
            <div className="min-w-0 flex-1">
              <CardTitle className="line-clamp-1">
                <Link href={href} className="hover:text-primary">{seller.name}</Link>
              </CardTitle>
              {seller.location ? (
                <CardDescription className="mt-1 flex items-center gap-1">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  {seller.location}
                </CardDescription>
              ) : null}
            </div>
            {seller.verified ? <TrustBadge label="Verified" /> : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <SellerStat label="Rating" value={typeof seller.rating === "number" ? seller.rating.toFixed(1) : "New"} icon={<Star className="h-3.5 w-3.5" />} />
            <SellerStat label="Sales" value={seller.salesCount?.toLocaleString() ?? "0"} />
            <SellerStat label="Trust" value={seller.trustScore ? `${seller.trustScore}` : "N/A"} />
          </div>
          {seller.responseTime ? <p className="text-sm text-muted-foreground">Usually responds in {seller.responseTime}</p> : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="outline" className="flex-1">
              <Link href={href}>View store</Link>
            </Button>
            {action}
          </div>
        </CardContent>
      </Card>
    </article>
  );
}

function SellerAvatar({ name, imageUrl }: { name: string; imageUrl?: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";

  return (
    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-commerce-soft font-black text-commerce ring-1 ring-commerce-border" aria-label={`${name} seller avatar`} role="img">
      {imageUrl ? <RemoteImage src={imageUrl} alt="" className="h-full w-full object-cover" /> : initials}
      <span className="absolute bottom-1 right-1 h-3 w-3 rounded-full border-2 border-card bg-trust" aria-hidden="true" />
    </div>
  );
}

function SellerStat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-secondary/70 p-3">
      <p className="flex items-center justify-center gap-1 text-sm font-black tabular-nums">
        {icon}
        {value}
      </p>
      <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
    </div>
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
  listingHref?: string;
  actions?: React.ReactNode;
};

const offerToneByStatus: Record<OfferStatus, string> = {
  pending: "status-warning offer-status-pending",
  accepted: "status-trust offer-status-accepted",
  countered: "status-ai offer-status-pending",
  declined: "border-slate-200 bg-slate-100 text-slate-600",
  expired: "status-risk",
  withdrawn: "border-slate-200 bg-slate-100 text-slate-600",
};

export function OfferCard({ title, buyerName, amount, currency, status = "pending", expiresAt, listingHref, actions, className, ...props }: OfferCardProps) {
  return (
    <Card className={cn("card-interactive overflow-hidden", className)} {...props}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="min-w-0">
          <CardTitle className="line-clamp-1">
            {listingHref ? <Link href={listingHref} className="hover:text-primary">{title}</Link> : title}
          </CardTitle>
          <CardDescription className="flex items-center gap-1 pt-1">
            <DollarSign className="h-4 w-4" aria-hidden="true" /> Offer from {buyerName}
          </CardDescription>
        </div>
        <span className={cn("status-badge capitalize", offerToneByStatus[status])}>{status}</span>
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

export type MessageThreadMessage = {
  id: string;
  body: string;
  senderName: string;
  timestamp?: string;
  isOwn?: boolean;
  avatarUrl?: string;
  status?: "sent" | "delivered" | "read";
};

export type MessageThreadProps = React.HTMLAttributes<HTMLDivElement> & {
  messages: MessageThreadMessage[];
  title?: string;
  composer?: React.ReactNode;
};

export function MessageThread({ messages, title = "Conversation", composer, className, ...props }: MessageThreadProps) {
  return (
    <section className={cn("card-base flex max-h-[min(44rem,calc(100vh-8rem))] flex-col overflow-hidden", className)} aria-label={title} {...props}>
      <div className="border-b border-border px-4 py-3 sm:px-5">
        <h2 className="font-black tracking-tight">{title}</h2>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5" role="log" aria-live="polite" aria-relevant="additions text">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </div>
      {composer ? <div className="border-t border-border p-3 sm:p-4">{composer}</div> : null}
    </section>
  );
}

function MessageBubble({ message }: { message: MessageThreadMessage }) {
  return (
    <div className={cn("flex w-full gap-2", message.isOwn ? "justify-end" : "justify-start")}>
      {!message.isOwn ? <SellerAvatar name={message.senderName} imageUrl={message.avatarUrl} /> : null}
      <div className={cn("max-w-[85%] rounded-3xl px-4 py-3 sm:max-w-[70%]", message.isOwn ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-card text-card-foreground shadow-sm")}>
        <p className="text-sm leading-6">{message.body}</p>
        <div className={cn("mt-2 flex flex-wrap items-center gap-1 text-xs", message.isOwn ? "text-primary-foreground" : "text-muted-foreground")}>
          <MessageCircle className="h-3 w-3" aria-hidden="true" />
          <span>{message.senderName}</span>
          {message.timestamp ? <span>· {message.timestamp}</span> : null}
          {message.status ? (
            <span className="inline-flex items-center gap-1 capitalize">
              · <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> {message.status}
            </span>
          ) : null}
        </div>
      </div>
      {message.isOwn ? <SellerAvatar name={message.senderName} imageUrl={message.avatarUrl} /> : null}
    </div>
  );
}

export type FinanceCardProps = React.HTMLAttributes<HTMLDivElement> & {
  title: string;
  amount: number;
  currency?: string;
  detail?: string;
  trend?: string;
  tone?: Extract<ComponentTone, "commerce" | "trust" | "premium" | "warning" | "risk">;
  items?: Array<{ label: string; amount: number; currency?: string }>;
};

const financeToneClassName: Record<NonNullable<FinanceCardProps["tone"]>, string> = {
  commerce: "card-commerce",
  trust: "card-commerce",
  premium: "card-premium",
  warning: "border-amber-200 bg-safety-warning-soft",
  risk: "card-danger",
};

export function FinanceCard({ title, amount, currency, detail, trend, tone = "commerce", items, className, ...props }: FinanceCardProps) {
  return (
    <Card className={cn(financeToneClassName[tone], className)} {...props}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardDescription>{title}</CardDescription>
            <PriceDisplay amount={amount} currency={currency} size="lg" signed={amount < 0} />
          </div>
          <span className="brand-icon brand-icon-commerce">
            <TrendingUp className="h-5 w-5" aria-hidden="true" />
          </span>
        </div>
        {detail ? <CardDescription>{detail}</CardDescription> : null}
        {trend ? <TrustBadge label={trend} tone={tone === "risk" ? "risk" : "trust"} /> : null}
      </CardHeader>
      {items?.length ? (
        <CardContent className="space-y-2">
          {items.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3 rounded-xl bg-white/55 px-3 py-2 text-sm">
              <span className="text-muted-foreground">{item.label}</span>
              <PriceDisplay amount={item.amount} currency={item.currency ?? currency} size="sm" align="right" signed={item.amount < 0} />
            </div>
          ))}
        </CardContent>
      ) : null}
    </Card>
  );
}

export function RiskNotice({ title, description, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { title: string; description: string }) {
  return (
    <div className={cn("rounded-2xl border border-amber-200 bg-safety-warning-soft p-4 text-amber-950", className)} role="status" {...props}>
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-black">{title}</p>
          <p className="mt-1 text-sm leading-6 opacity-85">{description}</p>
        </div>
      </div>
    </div>
  );
}
