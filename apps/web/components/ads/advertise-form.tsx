"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { newAdRequestKey } from "@/lib/ads/request-key";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RemoteImage } from "@/components/ui/remote-image";
import { AD_PLACEMENTS, type AdPlacementKey } from "@/lib/ads/placements";
import {
  formatCents,
  RUN_LENGTH_OPTIONS,
  SELF_SERVE_PLACEMENT_GROUPS,
  validateAdvertiserTarget,
  type AdPricingRow
} from "@/lib/ads/self-serve";

type Step = "details" | "review";

const noopSubscribe = () => () => {};

/** False during SSR and before hydration, so controls are not used before their handlers exist. */
function useHydrated() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

function addDays(isoDay: string, days: number) {
  const date = new Date(`${isoDay}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function prettyDay(isoDay: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${isoDay}T00:00:00.000Z`));
}

export function AdvertiseForm({ pricing, today, defaultAdvertiser }: { pricing: AdPricingRow[]; today: string; defaultAdvertiser: string }) {
  const byKey = useMemo(() => new Map(pricing.filter((row) => row.self_serve_enabled).map((row) => [row.placement, row])), [pricing]);
  const firstKey = (pricing.find((row) => row.self_serve_enabled)?.placement ?? "home_top_banner") as AdPlacementKey;
  const [step, setStep] = useState<Step>("details");
  const [placement, setPlacement] = useState<AdPlacementKey>(firstKey);
  const [title, setTitle] = useState("");
  const [advertiserName, setAdvertiserName] = useState(defaultAdvertiser);
  const [targetUrl, setTargetUrl] = useState("");
  const [altText, setAltText] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [runDays, setRunDays] = useState<number>(7);
  const [imagePath, setImagePath] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const requestKey = useRef<string | null>(null);
  const hydrated = useHydrated();

  const price = byKey.get(placement);
  const runOptions = RUN_LENGTH_OPTIONS.filter((days) => !price || (days >= price.min_days && days <= price.max_days));
  const total = price ? price.price_cents_per_day * runDays : 0;
  const anyPlaceholder = pricing.some((row) => row.is_placeholder);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/uploads/advertiser-creative", { method: "POST", body });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || typeof payload.path !== "string") throw new Error(typeof payload.error === "string" ? payload.error : "Upload failed.");
      setImagePath(payload.path);
    } catch (uploadError) {
      setImagePath("");
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function toReview(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!price) return setError("Choose a placement.");
    if (!imagePath) return setError("Upload your ad image first.");
    if (!title.trim()) return setError("Add a headline.");
    if (!advertiserName.trim()) return setError("Add your business or display name.");
    if (!validateAdvertiserTarget(targetUrl)) return setError("The link must be a full https:// address, for example https://yourshop.com.");
    if (!runOptions.includes(runDays as (typeof RUN_LENGTH_OPTIONS)[number])) return setError("Choose a run length.");
    requestKey.current = newAdRequestKey();
    setStep("review");
  }

  async function pay() {
    setError(null);
    setPaying(true);
    try {
      const response = await fetch("/api/ads/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": requestKey.current ?? "" },
        body: JSON.stringify({ placement, title: title.trim(), altText: altText.trim() || undefined, advertiserName: advertiserName.trim(), targetUrl: targetUrl.trim(), imagePath, startDate, runDays })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || typeof payload.url !== "string") throw new Error(typeof payload.error === "string" ? payload.error : "Could not start checkout.");
      window.location.assign(payload.url);
    } catch (payError) {
      setError(payError instanceof Error ? payError.message : "Could not start checkout.");
      setPaying(false);
    }
  }

  if (!pricing.length) {
    return <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">Self-serve advertising is not open yet. Please check back soon.</p>;
  }

  if (step === "review" && price) {
    const endDay = addDays(startDate, runDays);
    return (
      <section aria-labelledby="ad-review-heading" className="grid gap-5">
        <h2 id="ad-review-heading" className="text-xl font-black tracking-tight">Review and pay</h2>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Sponsored</p>
          <div className="overflow-hidden rounded-2xl border border-border bg-card" style={{ aspectRatio: AD_PLACEMENTS[placement].aspectRatio }}>
            {preview ? <RemoteImage src={preview} alt={altText || title} className="h-full w-full object-cover" /> : null}
          </div>
          <p className="mt-2 text-sm font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground break-all">{advertiserName} · {targetUrl}</p>
        </div>
        <dl className="grid gap-2 rounded-2xl border border-border p-4 text-sm" data-testid="ad-price-summary">
          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Placement</dt><dd className="text-right font-semibold">{AD_PLACEMENTS[placement].name}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Runs</dt><dd className="text-right font-semibold">{prettyDay(startDate)} – {prettyDay(endDay)}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Price per day</dt><dd className="text-right font-semibold">{formatCents(price.price_cents_per_day, price.currency)}{price.is_placeholder ? " (placeholder)" : ""}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Days</dt><dd className="text-right font-semibold">{runDays}</dd></div>
          <div className="flex justify-between gap-3 border-t border-border pt-2 text-base"><dt className="font-bold">Total</dt><dd className="text-right font-black" data-testid="ad-total">{formatCents(total, price.currency)}</dd></div>
        </dl>
        <p className="text-sm leading-6 text-muted-foreground">
          You pay now through Stripe. An admin reviews every ad before it goes live. If your ad is not approved, you get a full refund. Your run starts on the start date or when it is approved, whichever is later, and always lasts the full {runDays} {runDays === 1 ? "day" : "days"}.
        </p>
        {error ? <p role="alert" className="text-sm font-semibold text-destructive">{error}</p> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <Button type="button" variant="outline" onClick={() => setStep("details")} disabled={paying}>Back to edit</Button>
          <Button type="button" onClick={pay} disabled={paying}>{paying ? "Opening Stripe…" : `Pay ${formatCents(total, price.currency)} with Stripe`}</Button>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={toReview} className="grid gap-5" noValidate data-hydrated={hydrated ? "true" : "false"}>
      <fieldset className="grid gap-3">
        <legend className="mb-1 text-sm font-semibold">Where should it appear?</legend>
        {SELF_SERVE_PLACEMENT_GROUPS.map((group) => {
          const keys = group.keys.filter((key) => byKey.has(key));
          if (!keys.length) return null;
          return (
            <div key={group.label} className="grid gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{group.label}</p>
              {keys.map((key) => {
                const row = byKey.get(key)!;
                const id = `placement-${key}`;
                return (
                  <label key={key} htmlFor={id} className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-2xl border p-3 ${placement === key ? "border-primary bg-primary/5" : "border-border"}`}>
                    <input id={id} type="radio" name="placement" value={key} checked={placement === key} onChange={() => setPlacement(key)} className="mt-1" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{AD_PLACEMENTS[key].name}</span>
                      <span className="block text-sm text-muted-foreground">{AD_PLACEMENTS[key].description}</span>
                    </span>
                    <span className="shrink-0 text-right text-sm font-bold">{formatCents(row.price_cents_per_day, row.currency)}<span className="block text-xs font-normal text-muted-foreground">per day</span></span>
                  </label>
                );
              })}
            </div>
          );
        })}
        {anyPlaceholder ? <p className="text-xs text-muted-foreground">Prices marked per day are placeholder launch prices and may change before you pay.</p> : null}
      </fieldset>

      <div className="grid gap-2">
        <Label htmlFor="ad-image">Ad image</Label>
        <input id="ad-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => onFile(event.target.files?.[0])} className="form-control" aria-describedby="ad-image-help" />
        <p id="ad-image-help" className="text-xs text-muted-foreground">JPG, PNG or WebP, up to 2 MB. Shape: {AD_PLACEMENTS[placement].aspectRatio.replace(" / ", ":")}.</p>
        {preview ? (
          <div className="overflow-hidden rounded-2xl border border-border" style={{ aspectRatio: AD_PLACEMENTS[placement].aspectRatio }}>
            <RemoteImage src={preview} alt="Ad image preview" className="h-full w-full object-cover" />
          </div>
        ) : null}
        {uploading ? <p className="text-sm text-muted-foreground" role="status">Uploading…</p> : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="ad-title">Headline</Label>
        <Input id="ad-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="ad-advertiser">Business or display name</Label>
        <Input id="ad-advertiser" value={advertiserName} onChange={(event) => setAdvertiserName(event.target.value)} maxLength={120} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="ad-link">Link (https)</Label>
        <Input id="ad-link" type="url" inputMode="url" placeholder="https://yourshop.com" value={targetUrl} onChange={(event) => { setTargetUrl(event.target.value); setError(null); }} maxLength={2000} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="ad-alt">Image description (optional)</Label>
        <Input id="ad-alt" value={altText} onChange={(event) => setAltText(event.target.value)} maxLength={200} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="ad-start">Start date</Label>
          <Input id="ad-start" type="date" min={today} value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ad-days">Run length</Label>
          <select id="ad-days" className="form-control" value={runDays} onChange={(event) => setRunDays(Number(event.target.value))}>
            {runOptions.map((days) => <option key={days} value={days}>{days} {days === 1 ? "day" : "days"}</option>)}
          </select>
        </div>
      </div>
      <p className="text-sm font-semibold" aria-live="polite">Total: {price ? formatCents(total, price.currency) : "—"}</p>
      {error ? <p role="alert" className="text-sm font-semibold text-destructive">{error}</p> : null}
      <Button type="submit" disabled={uploading || !hydrated}>Continue to payment</Button>
    </form>
  );
}
