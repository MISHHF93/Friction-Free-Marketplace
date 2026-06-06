"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, UploadCloud, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LISTING_CATEGORIES, LISTING_CONDITIONS, type AiListingResponse } from "@/lib/listings/validation";

type UploadedImage = { storagePath: string; publicUrl?: string; altText?: string; sortOrder: number };
type ListingRecord = {
  id: string;
  title: string;
  description: string;
  condition: string | null;
  price_amount: number;
  currency: string;
  quantity: number;
  location_city: string | null;
  location_region: string | null;
  location_country: string | null;
  ships_to: string[];
  pickup_available: boolean;
  status: string;
  metadata: Record<string, unknown> | null;
  listing_images?: Array<{ storage_path: string; public_url: string | null; alt_text: string | null; sort_order: number }>;
};

type FormState = {
  title: string;
  description: string;
  category: (typeof LISTING_CATEGORIES)[number];
  condition: (typeof LISTING_CONDITIONS)[number];
  priceAmount: string;
  currency: string;
  quantity: string;
  locationCity: string;
  locationRegion: string;
  locationCountry: string;
  shipsTo: string;
  fulfillmentOptions: string[];
  seoTags: string;
  moderationStatus: "pending" | "approved" | "needs_review" | "rejected";
  moderationNotes: string;
  ai: {
    generated: boolean;
    priceMin?: number;
    priceMax?: number;
    fraudRiskScore?: number;
    conditionConfidence?: number;
    rationale?: string;
  };
  images: UploadedImage[];
};

const defaultState: FormState = {
  title: "",
  description: "",
  category: "electronics",
  condition: "good",
  priceAmount: "",
  currency: "USD",
  quantity: "1",
  locationCity: "",
  locationRegion: "",
  locationCountry: "US",
  shipsTo: "US",
  fulfillmentOptions: ["shipping", "pickup"],
  seoTags: "",
  moderationStatus: "pending",
  moderationNotes: "",
  ai: { generated: false },
  images: []
};

function getMetadataArray(metadata: Record<string, unknown> | null, key: string) {
  const value = metadata?.[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function listingToState(listing?: ListingRecord): FormState {
  if (!listing) return defaultState;
  const metadata = listing.metadata ?? {};
  const aiListing = typeof metadata.ai_listing === "object" && metadata.ai_listing !== null ? (metadata.ai_listing as FormState["ai"]) : { generated: false };
  const priceSuggestion = typeof metadata.price_suggestion === "object" && metadata.price_suggestion !== null ? (metadata.price_suggestion as { min?: number; max?: number }) : {};

  return {
    title: listing.title,
    description: listing.description,
    category: (typeof metadata.category_slug === "string" && LISTING_CATEGORIES.includes(metadata.category_slug as (typeof LISTING_CATEGORIES)[number])
      ? metadata.category_slug
      : "other") as FormState["category"],
    condition: (listing.condition && LISTING_CONDITIONS.includes(listing.condition as (typeof LISTING_CONDITIONS)[number]) ? listing.condition : "good") as FormState["condition"],
    priceAmount: String(listing.price_amount),
    currency: listing.currency,
    quantity: String(listing.quantity),
    locationCity: listing.location_city ?? "",
    locationRegion: listing.location_region ?? "",
    locationCountry: listing.location_country ?? "US",
    shipsTo: listing.ships_to?.join(", ") || "US",
    fulfillmentOptions: getMetadataArray(metadata, "fulfillment_options").length
      ? getMetadataArray(metadata, "fulfillment_options")
      : [listing.pickup_available ? "pickup" : "shipping"],
    seoTags: getMetadataArray(metadata, "seo_tags").join(", "),
    moderationStatus: (typeof metadata.moderation_status === "string" ? metadata.moderation_status : "pending") as FormState["moderationStatus"],
    moderationNotes: typeof metadata.moderation_notes === "string" ? metadata.moderation_notes : "",
    ai: { ...aiListing, priceMin: aiListing.priceMin ?? priceSuggestion.min, priceMax: aiListing.priceMax ?? priceSuggestion.max },
    images: (listing.listing_images ?? []).map((image, index) => ({
      storagePath: image.storage_path,
      publicUrl: image.public_url ?? undefined,
      altText: image.alt_text ?? undefined,
      sortOrder: image.sort_order ?? index
    }))
  };
}

function csv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function ListingForm({ listing }: { listing?: ListingRecord }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => listingToState(listing));
  const [sellerNotes, setSellerNotes] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const priceSuggestion = useMemo(() => {
    if (form.ai.priceMin === undefined || form.ai.priceMax === undefined) return null;
    return `$${form.ai.priceMin.toLocaleString()} - $${form.ai.priceMax.toLocaleString()}`;
  }, [form.ai.priceMax, form.ai.priceMin]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleFulfillment(option: string) {
    setForm((current) => {
      const next = current.fulfillmentOptions.includes(option)
        ? current.fulfillmentOptions.filter((item) => item !== option)
        : [...current.fulfillmentOptions, option];
      return { ...current, fulfillmentOptions: next };
    });
  }

  async function uploadPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    setBusy("Uploading photos");
    setError(null);
    const data = new FormData();
    files.forEach((file) => data.append("files", file));

    const response = await fetch("/api/listings/upload", { method: "POST", body: data });
    const body = await response.json();
    setBusy(null);
    if (!response.ok) {
      setError(body.error || "Photo upload failed.");
      return;
    }
    setForm((current) => ({ ...current, images: [...current.images, ...body.images].slice(0, 12) }));
  }

  async function generateWithAi() {
    if (form.images.length === 0) {
      setError("Upload at least one photo before using AI generation.");
      return;
    }
    setBusy("Generating AI listing");
    setError(null);
    const response = await fetch("/api/ai/listing-from-photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrls: form.images.map((image) => image.publicUrl).filter(Boolean), sellerNotes, location: `${form.locationCity}, ${form.locationRegion}` })
    });
    const body = await response.json();
    setBusy(null);
    if (!response.ok) {
      setError(body.error || "AI generation failed.");
      return;
    }

    const suggestion = body.suggestion as AiListingResponse;
    setForm((current) => ({
      ...current,
      title: suggestion.title,
      description: suggestion.description,
      category: suggestion.category,
      condition: suggestion.condition,
      priceAmount: String(Math.round((suggestion.priceRange.min + suggestion.priceRange.max) / 2)),
      currency: suggestion.priceRange.currency || "USD",
      seoTags: suggestion.seoTags.join(", "),
      moderationStatus: suggestion.fraudRiskScore >= 70 ? "needs_review" : "pending",
      moderationNotes: suggestion.fraudRiskScore >= 70 ? "AI flagged this draft for elevated fraud risk. Review before publishing." : current.moderationNotes,
      ai: {
        generated: true,
        priceMin: suggestion.priceRange.min,
        priceMax: suggestion.priceRange.max,
        fraudRiskScore: suggestion.fraudRiskScore,
        rationale: suggestion.rationale
      }
    }));
    setSuccess("AI generated a draft. Review every field before publishing.");
  }

  function payload(publish: boolean) {
    return {
      title: form.title,
      description: form.description,
      category: form.category,
      condition: form.condition,
      priceAmount: Number(form.priceAmount),
      currency: form.currency,
      quantity: Number(form.quantity),
      locationCity: form.locationCity,
      locationRegion: form.locationRegion,
      locationCountry: form.locationCountry,
      shipsTo: csv(form.shipsTo),
      fulfillmentOptions: form.fulfillmentOptions,
      seoTags: csv(form.seoTags),
      moderationStatus: form.moderationStatus,
      moderationNotes: form.moderationNotes,
      ai: form.ai,
      images: form.images.map((image, index) => ({ ...image, sortOrder: index })),
      publish
    };
  }

  async function submitListing(publish: boolean) {
    setBusy(publish ? "Publishing listing" : "Saving draft");
    setError(null);
    setSuccess(null);

    const response = await fetch(listing ? `/api/listings/${listing.id}` : "/api/listings", {
      method: listing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload(publish))
    });
    const body = await response.json();
    setBusy(null);
    if (!response.ok) {
      setError(body.error || "Unable to save listing.");
      return;
    }
    setSuccess(publish ? "Listing published." : "Draft saved.");
    router.push("/dashboard/listings");
    router.refresh();
  }

  async function deleteListing() {
    if (!listing) return;
    setBusy("Deleting listing");
    setError(null);
    const response = await fetch(`/api/listings/${listing.id}`, { method: "DELETE" });
    const body = await response.json();
    setBusy(null);
    if (!response.ok) {
      setError(body.error || "Unable to delete listing.");
      return;
    }
    router.push("/dashboard/listings");
    router.refresh();
  }

  return (
    <form className="mx-auto grid max-w-7xl gap-6 px-4 py-10 lg:grid-cols-[1fr_360px]" onSubmit={(event) => { event.preventDefault(); submitListing(false); }}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>{listing ? "Edit listing" : "Create a listing"}</CardTitle>
                <p className="mt-2 text-sm text-muted-foreground">Create manually or upload photos and let AI draft the listing fields.</p>
              </div>
              <Badge>{listing?.status ?? "draft"}</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5">
            {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
            {success && <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm text-primary">{success}</div>}
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="e.g. Mirrorless camera kit with two lenses" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="Describe included items, flaws, dimensions, proof of authenticity, and pickup/shipping details." required />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <select id="category" className="h-11 rounded-lg border border-input bg-background px-3 text-sm" value={form.category} onChange={(event) => update("category", event.target.value as FormState["category"])}>
                  {LISTING_CATEGORIES.map((category) => <option key={category} value={category}>{category.replace(/-/g, " ")}</option>)}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="condition">Condition</Label>
                <select id="condition" className="h-11 rounded-lg border border-input bg-background px-3 text-sm" value={form.condition} onChange={(event) => update("condition", event.target.value as FormState["condition"])}>
                  {LISTING_CONDITIONS.map((condition) => <option key={condition} value={condition}>{condition.replace(/-/g, " ")}</option>)}
                </select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="price">Price</Label>
                <Input id="price" type="number" min="0" step="0.01" value={form.priceAmount} onChange={(event) => update("priceAmount", event.target.value)} required />
                {priceSuggestion && <p className="text-xs text-muted-foreground">AI range: {priceSuggestion}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="currency">Currency</Label>
                <Input id="currency" value={form.currency} onChange={(event) => update("currency", event.target.value.toUpperCase())} maxLength={3} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input id="quantity" type="number" min="1" value={form.quantity} onChange={(event) => update("quantity", event.target.value)} required />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Photos and AI generation</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Label htmlFor="photos" className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border p-8 text-center">
              <UploadCloud className="mb-3 h-8 w-8 text-primary" />
              <span className="font-semibold">Upload listing photos to Supabase Storage</span>
              <span className="mt-1 text-sm text-muted-foreground">JPEG, PNG, WebP, HEIC, or HEIF. Up to 12 photos.</span>
              <Input id="photos" type="file" accept="image/*" multiple className="mt-4" onChange={uploadPhotos} />
            </Label>
            {form.images.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-3">
                {form.images.map((image, index) => (
                  <div key={`${image.storagePath}-${index}`} className="relative overflow-hidden rounded-xl border border-border bg-secondary">
                    {image.publicUrl ? <img src={image.publicUrl} alt={image.altText || "Listing upload"} className="h-32 w-full object-cover" /> : <div className="h-32" />}
                    <button type="button" className="absolute right-2 top-2 rounded-full bg-background p-1 shadow" onClick={() => setForm((current) => ({ ...current, images: current.images.filter((_, itemIndex) => itemIndex !== index) }))} aria-label="Remove image">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="sellerNotes">Optional AI notes</Label>
              <Textarea id="sellerNotes" value={sellerNotes} onChange={(event) => setSellerNotes(event.target.value)} placeholder="Add visible details the AI should consider, such as known brand, model, flaws, or included accessories." />
            </div>
            <Button type="button" variant="secondary" onClick={generateWithAi} disabled={!!busy}>
              <Sparkles className="h-4 w-4" /> Generate title, description, category, condition, price range, SEO tags, and fraud risk
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Location and fulfillment</CardTitle></CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2"><Label htmlFor="city">City</Label><Input id="city" value={form.locationCity} onChange={(event) => update("locationCity", event.target.value)} required /></div>
              <div className="grid gap-2"><Label htmlFor="region">State / region</Label><Input id="region" value={form.locationRegion} onChange={(event) => update("locationRegion", event.target.value)} required /></div>
              <div className="grid gap-2"><Label htmlFor="country">Country</Label><Input id="country" value={form.locationCountry} onChange={(event) => update("locationCountry", event.target.value.toUpperCase())} required maxLength={2} /></div>
            </div>
            <div className="grid gap-3">
              <Label>Shipping / pickup options</Label>
              <div className="grid gap-3 sm:grid-cols-3">
                {["shipping", "pickup", "local_delivery"].map((option) => (
                  <label key={option} className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm font-medium">
                    <input type="checkbox" checked={form.fulfillmentOptions.includes(option)} onChange={() => toggleFulfillment(option)} /> {option.replace(/_/g, " ")}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="shipsTo">Ships to</Label>
              <Input id="shipsTo" value={form.shipsTo} onChange={(event) => update("shipsTo", event.target.value)} placeholder="US, CA" />
            </div>
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-6 lg:sticky lg:top-24 lg:h-fit">
        <Card>
          <CardHeader><CardTitle>Moderation and SEO</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="seoTags">SEO tags</Label>
              <Input id="seoTags" value={form.seoTags} onChange={(event) => update("seoTags", event.target.value)} placeholder="camera, creator kit, mirrorless" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="moderationStatus">Moderation status</Label>
              <select id="moderationStatus" className="h-11 rounded-lg border border-input bg-background px-3 text-sm" value={form.moderationStatus} onChange={(event) => update("moderationStatus", event.target.value as FormState["moderationStatus"])}>
                <option value="pending">pending</option>
                <option value="approved">approved</option>
                <option value="needs_review">needs review</option>
                <option value="rejected">rejected</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="moderationNotes">Moderation notes</Label>
              <Textarea id="moderationNotes" value={form.moderationNotes} onChange={(event) => update("moderationNotes", event.target.value)} />
            </div>
            {form.ai.generated && (
              <div className="rounded-2xl bg-secondary p-4 text-sm">
                <p className="font-semibold">AI analysis</p>
                <p className="mt-2 text-muted-foreground">Fraud risk score: {form.ai.fraudRiskScore ?? "n/a"}/100</p>
                {form.ai.rationale && <p className="mt-2 text-muted-foreground">{form.ai.rationale}</p>}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 p-5">
            {busy && <p className="text-sm text-muted-foreground">{busy}...</p>}
            <Button type="submit" variant="secondary" className="w-full" disabled={!!busy}>Save draft</Button>
            <Button type="button" className="w-full" disabled={!!busy} onClick={() => submitListing(true)}>Publish listing</Button>
            {listing && <Button type="button" variant="destructive" className="w-full" disabled={!!busy} onClick={deleteListing}>Delete listing</Button>}
          </CardContent>
        </Card>
      </aside>
    </form>
  );
}
