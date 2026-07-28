"use client";

import Image from "next/image";
import {
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
} from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Archive, ArrowDown, ArrowUp, Sparkles, UploadCloud, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import {
  changeListingStatusAction,
  createListingAction,
  generateAiListingAction,
  deleteListingAction,
  updateListingAction,
} from "@/actions/listings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  LISTING_CATEGORIES,
  LISTING_CONDITIONS,
  LISTING_STATUSES,
  type AiListingResponse,
} from "@/lib/listings/validation";
import { createClient as createBrowserClient } from "@/lib/supabase/browser";

const MAX_IMAGES = 12;
const FULFILLMENT_OPTIONS = ["shipping", "pickup", "local_delivery"] as const;

type UploadedImage = {
  storagePath: string;
  publicUrl?: string;
  altText?: string;
  sortOrder: number;
};
type ListingStatus = (typeof LISTING_STATUSES)[number];
export type ListingCategoryOption = {
  slug: (typeof LISTING_CATEGORIES)[number];
  name: string;
};

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
  listing_images?: Array<{
    storage_path: string;
    public_url: string | null;
    alt_text: string | null;
    sort_order: number;
  }>;
};

const listingClientFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters.")
    .max(160),
  description: z
    .string()
    .trim()
    .min(20, "Description must be at least 20 characters.")
    .max(5000),
  category: z.enum(LISTING_CATEGORIES),
  condition: z.enum(LISTING_CONDITIONS),
  priceAmount: z
    .string()
    .trim()
    .min(1, "Enter a price.")
    .refine(
      (value) => Number.isFinite(Number(value)) && Number(value) > 0,
      "Price must be greater than 0.",
    )
    .refine(
      (value) => Number(value) <= 999999.99,
      "Price must be less than 1,000,000.",
    )
    .refine(
      (value) => /^\d+(\.\d{1,2})?$/.test(value),
      "Use dollars and cents only.",
    ),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Use a 3-letter currency code."),
  quantity: z
    .string()
    .trim()
    .refine(
      (value) =>
        Number.isInteger(Number(value)) &&
        Number(value) >= 1 &&
        Number(value) <= 999,
      "Quantity must be between 1 and 999.",
    ),
  locationCity: z.string().trim().min(2, "City is required.").max(80),
  locationRegion: z
    .string()
    .trim()
    .min(2, "State or region is required.")
    .max(80),
  locationCountry: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "Use a 2-letter country code."),
  shipsTo: z.string().max(400),
  fulfillmentOptions: z
    .array(z.enum(FULFILLMENT_OPTIONS))
    .min(1, "Choose at least one fulfillment option."),
  seoTags: z.string().max(500),
  ai: z.object({
    generated: z.boolean(),
    priceMin: z.number().min(0).optional(),
    priceMax: z.number().min(0).optional(),
    fraudRiskScore: z.number().min(0).max(100).optional(),
    scamRiskWarning: z.string().max(700).optional(),
    riskFactors: z.array(z.string()).optional(),
    conditionConfidence: z.number().min(0).max(1).optional(),
    conditionEvidence: z.array(z.string()).optional(),
    categoryRationale: z.string().max(500).optional(),
    priceRationale: z.string().max(700).optional(),
    missingInformationQuestions: z.array(z.string()).optional(),
    fraudIndicators: z
      .object({
        riskScore: z.number().min(0).max(100),
        riskLevel: z.enum(["low", "medium", "high", "critical"]),
        reviewRequired: z.boolean(),
        indicators: z.array(
          z.object({
            type: z.string(),
            severity: z.string(),
            evidence: z.string(),
            recommendation: z.string(),
          }),
        ),
        buyerWarning: z.string(),
      })
      .optional(),
    rationale: z.string().max(1200).optional(),
  }),
  images: z
    .array(
      z.object({
        storagePath: z.string(),
        publicUrl: z.string().optional(),
        altText: z.string().optional(),
        sortOrder: z.number(),
      }),
    )
    .max(MAX_IMAGES),
});

type FormState = z.infer<typeof listingClientFormSchema>;

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
  ai: { generated: false },
  images: [],
};

function getMetadataArray(
  metadata: Record<string, unknown> | null,
  key: string,
) {
  const value = metadata?.[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function listingToState(listing?: ListingRecord): FormState {
  if (!listing) return defaultState;
  const metadata = listing.metadata ?? {};
  const aiListing =
    typeof metadata.ai_listing === "object" && metadata.ai_listing !== null
      ? (metadata.ai_listing as FormState["ai"])
      : { generated: false };
  const priceSuggestion =
    typeof metadata.price_suggestion === "object" &&
    metadata.price_suggestion !== null
      ? (metadata.price_suggestion as { min?: number; max?: number })
      : {};

  return {
    title: listing.title,
    description: listing.description,
    category: (typeof metadata.category_slug === "string" &&
    LISTING_CATEGORIES.includes(
      metadata.category_slug as (typeof LISTING_CATEGORIES)[number],
    )
      ? metadata.category_slug
      : "other") as FormState["category"],
    condition: (listing.condition &&
    LISTING_CONDITIONS.includes(
      listing.condition as (typeof LISTING_CONDITIONS)[number],
    )
      ? listing.condition
      : "good") as FormState["condition"],
    priceAmount: String(listing.price_amount),
    currency: listing.currency,
    quantity: String(listing.quantity),
    locationCity: listing.location_city ?? "",
    locationRegion: listing.location_region ?? "",
    locationCountry: listing.location_country ?? "US",
    shipsTo: listing.ships_to?.join(", ") || "US",
    fulfillmentOptions: (getMetadataArray(metadata, "fulfillment_options")
      .length
      ? getMetadataArray(metadata, "fulfillment_options")
      : [
          listing.pickup_available ? "pickup" : "shipping",
        ]) as FormState["fulfillmentOptions"],
    seoTags: getMetadataArray(metadata, "seo_tags").join(", "),
    ai: {
      ...aiListing,
      priceMin: aiListing.priceMin ?? priceSuggestion.min,
      priceMax: aiListing.priceMax ?? priceSuggestion.max,
    },
    images: (listing.listing_images ?? [])
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((image, index) => ({
        storagePath: image.storage_path,
        publicUrl: image.public_url ?? undefined,
        altText: image.alt_text ?? undefined,
        sortOrder: image.sort_order ?? index,
      })),
  };
}

function csv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function helperText(message?: string) {
  return message ? <p className="text-xs text-destructive">{message}</p> : null;
}

function getReadinessItems(values: FormState) {
  return [
    { label: "Clear title", complete: values.title.trim().length >= 3 },
    { label: "Buyer-ready description", complete: values.description.trim().length >= 20 },
    { label: "Price and quantity", complete: Number(values.priceAmount) > 0 && Number(values.quantity) >= 1 },
    { label: "Location", complete: Boolean(values.locationCity.trim() && values.locationRegion.trim() && values.locationCountry.trim()) },
    { label: "Fulfillment option", complete: values.fulfillmentOptions.length > 0 },
    { label: "At least one photo", complete: values.images.length > 0 }
  ];
}

function statusConfirmation(status: ListingStatus) {
  if (status === "active") return "Publish this listing? Buyers will be able to find it, save it, and start conversations.";
  if (status === "sold") return "Mark this listing as sold? Buyers will no longer treat it as available.";
  if (status === "archived") return "Archive this listing? It will be removed from active marketplace discovery.";
  if (status === "paused") return "Pause this listing? It will temporarily stop appearing as active inventory.";
  return null;
}

export function ListingForm({
  listing,
  categories,
}: {
  listing?: ListingRecord;
  categories?: ListingCategoryOption[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [sellerNotes, setSellerNotes] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [generationTrace, setGenerationTrace] = useState<{
    taskId: string | null;
    latencyMs: number;
    totalTokens?: number;
    model?: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormState>({
    resolver: zodResolver(listingClientFormSchema),
    defaultValues: listingToState(listing),
    mode: "onBlur",
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = form;
  const watched = useWatch({ control: form.control }) as FormState;
  const images = watched.images ?? [];
  const currentStatus = (listing?.status ?? "draft") as ListingStatus;
  const canMoveToDraft = listing ? ["active", "paused", "archived", "expired"].includes(currentStatus) : false;
  const canPublish = listing ? ["draft", "paused", "archived", "expired"].includes(currentStatus) : false;
  const canPause = listing ? currentStatus === "active" : false;
  const canMarkSold = listing ? ["active", "reserved"].includes(currentStatus) : false;
  const canArchive = listing ? ["draft", "active", "reserved", "paused", "expired", "sold"].includes(currentStatus) : false;
  const categoryOptions = categories?.length
    ? categories
    : LISTING_CATEGORIES.map((slug) => ({
        slug,
        name: slug
          .split("-")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" "),
      }));

  const priceSuggestion = watched.ai?.priceMin === undefined || watched.ai?.priceMax === undefined
    ? null
    : `$${watched.ai.priceMin.toLocaleString()} - $${watched.ai.priceMax.toLocaleString()}`;
  const readinessItems = getReadinessItems(watched);
  const completedReadinessItems = readinessItems.filter((item) => item.complete).length;
  const isReadyToPublish = completedReadinessItems === readinessItems.length;

  function updateImages(nextImages: UploadedImage[]) {
    setValue(
      "images",
      nextImages.map((image, index) => ({ ...image, sortOrder: index })),
      { shouldDirty: true, shouldValidate: true },
    );
  }

  function toggleFulfillment(option: (typeof FULFILLMENT_OPTIONS)[number]) {
    const next = watched.fulfillmentOptions.includes(option)
      ? watched.fulfillmentOptions.filter((item) => item !== option)
      : [...watched.fulfillmentOptions, option];
    setValue("fulfillmentOptions", next, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  async function uploadPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    setBusy("Uploading photos");
    setError(null);
    const authorization = await fetch("/api/uploads/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        purpose: "listing",
        existingCount: images.length,
        files: files.map((file) => ({ name: file.name, type: file.type, size: file.size }))
      })
    });
    const payload = await authorization.json();
    if (!authorization.ok) {
      setBusy(null);
      setError(typeof payload.error === "string" ? payload.error : "Unable to authorize photo uploads.");
      return;
    }
    const storage = createBrowserClient().storage.from(payload.bucket);
    const uploaded: UploadedImage[] = [];
    for (const [index, upload] of payload.uploads.entries()) {
      const { error: uploadError } = await storage.uploadToSignedUrl(upload.path, upload.token, files[index], { contentType: files[index].type });
      if (uploadError) {
        setBusy(null);
        setError(uploadError.message);
        return;
      }
      uploaded.push({ storagePath: upload.path, publicUrl: upload.publicUrl, altText: files[index].name.replace(/\.[^.]+$/, ""), sortOrder: upload.sortOrder });
    }
    setBusy(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    updateImages([...images, ...uploaded].slice(0, MAX_IMAGES));
    setSuccess(
      "Photos uploaded. Drag-free reorder controls are available below each image.",
    );
  }

  async function generateWithAi() {
    if (images.length === 0) {
      setError("Upload at least one photo before using AI generation.");
      return;
    }
    const imageUrls = images
      .map((image) => image.publicUrl)
      .filter((url): url is string => Boolean(url));
    if (imageUrls.length === 0) {
      setError(
        "Uploaded photos must have public URLs before AI generation can inspect them.",
      );
      return;
    }
    setBusy("Generating AI listing");
    setError(null);
    const result = await generateAiListingAction({
      imageUrls,
      title: watched.title,
      notes: sellerNotes,
      location: `${watched.locationCity}, ${watched.locationRegion}`,
    });
    setBusy(null);
    if (!result.ok) {
      setError(result.error || "The assistant could not create a draft. Please try again.");
      return;
    }

    const suggestion = result.data.suggestion as AiListingResponse;
    const usage = result.data.usage as {
      total_tokens?: number;
      totalTokens?: number;
      model?: string;
    };
    setGenerationTrace({
      taskId: result.data.taskId,
      latencyMs: result.data.latencyMs,
      totalTokens: usage.total_tokens ?? usage.totalTokens,
      model: usage.model,
    });
    setValue("title", suggestion.title, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("description", suggestion.description, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("category", suggestion.category, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("condition", suggestion.condition, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue(
      "priceAmount",
      String(
        Math.round((suggestion.priceRange.min + suggestion.priceRange.max) / 2),
      ),
      { shouldDirty: true, shouldValidate: true },
    );
    setValue("currency", suggestion.priceRange.currency || "USD", {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("seoTags", suggestion.seoTags.join(", "), { shouldDirty: true });
    const fraudRiskScore =
      suggestion.fraudIndicators?.riskScore ??
      suggestion.scamRiskWarning?.riskScore ??
      suggestion.fraudRiskScore ??
      0;
    setValue(
      "ai",
      {
        generated: true,
        priceMin: suggestion.priceRange.min,
        priceMax: suggestion.priceRange.max,
        fraudRiskScore,
        scamRiskWarning: suggestion.scamRiskWarning?.warning,
        riskFactors:
          suggestion.scamRiskWarning?.riskFactors ??
          suggestion.fraudIndicators?.indicators?.map((indicator) => indicator.evidence) ??
          [],
        fraudIndicators: suggestion.fraudIndicators,
        conditionConfidence: suggestion.conditionConfidence,
        conditionEvidence: suggestion.conditionEvidence ?? [],
        categoryRationale: suggestion.categoryRationale,
        priceRationale: suggestion.priceRange.rationale,
        missingInformationQuestions:
          suggestion.missingInformationQuestions ?? [],
        rationale: suggestion.rationale,
      },
      { shouldDirty: true },
    );
    setSuccess(
      "AI generated a draft. Review every field, answer missing-information questions, and verify accuracy before publishing.",
    );
  }

  function payload(values: FormState, publish: boolean) {
    const elevatedRisk = (values.ai.fraudRiskScore ?? 0) >= 70 || values.ai.fraudIndicators?.reviewRequired === true;
    return {
      title: values.title,
      description: values.description,
      category: values.category,
      condition: values.condition,
      priceAmount: Number(values.priceAmount),
      currency: values.currency,
      quantity: Number(values.quantity),
      locationCity: values.locationCity,
      locationRegion: values.locationRegion,
      locationCountry: values.locationCountry,
      shipsTo: csv(values.shipsTo),
      fulfillmentOptions: values.fulfillmentOptions,
      seoTags: csv(values.seoTags),
      moderationStatus: elevatedRisk ? "needs_review" : "pending",
      moderationNotes: elevatedRisk
        ? "AI flagged this draft for elevated risk. Review proof, payment, and fulfillment details before publishing."
        : undefined,
      ai: values.ai,
      images: values.images.map((image, index) => ({
        ...image,
        sortOrder: index,
      })),
      publish,
    };
  }

  function submitListing(publish: boolean) {
    return handleSubmit((values) => {
      setBusy(publish ? "Publishing listing" : "Saving draft");
      setError(null);
      setSuccess(null);
      startTransition(async () => {
        const result = listing
          ? await updateListingAction(listing.id, payload(values, publish))
          : await createListingAction(payload(values, publish));
        setBusy(null);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setSuccess(publish ? "Listing published." : "Draft saved.");
        router.push("/dashboard/listings");
        router.refresh();
      });
    })();
  }

  function changeStatus(status: ListingStatus) {
    if (!listing) return;
    const confirmation = statusConfirmation(status);
    if (confirmation && !window.confirm(confirmation)) return;
    setBusy(`Setting listing ${status}`);
    setError(null);
    startTransition(async () => {
      const result = await changeListingStatusAction(listing.id, status);
      setBusy(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(`Listing marked ${status}.`);
      router.refresh();
    });
  }

  function removeListing() {
    if (
      !listing ||
      !window.confirm(
        "Delete this listing? Buyers will no longer be able to view it.",
      )
    )
      return;
    setBusy("Deleting listing");
    setError(null);
    startTransition(async () => {
      const result = await deleteListingAction(listing.id);
      setBusy(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/dashboard/listings");
      router.refresh();
    });
  }

  const disabled = !!busy || isPending;

  return (
    <form
      className="app-container-wide grid gap-5 py-6 sm:py-8 xl:grid-cols-[minmax(0,1fr)_22rem]"
      onSubmit={(event) => {
        event.preventDefault();
        submitListing(false);
      }}
    >
      <div className="space-y-6">
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
              <div>
                <CardTitle>
                  {listing ? "Edit listing" : "Create a listing"}
                </CardTitle>
                <p className="mt-2 text-sm text-muted-foreground">
                  Create, draft, publish, mark sold, and manage every listing
                  field with validated server actions.
                </p>
              </div>
              <Badge>{currentStatus}</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5 p-4 pt-0 sm:p-6 sm:pt-0">
            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm text-primary">
                {success}
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g. Mirrorless camera kit with two lenses"
                {...register("title")}
              />
              {helperText(errors.title?.message)}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe included items, flaws, dimensions, proof of authenticity, and pickup/shipping details."
                {...register("description")}
              />
              {helperText(errors.description?.message)}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  className="h-11 rounded-lg border border-input bg-background px-3 text-sm"
                  {...register("category")}
                >
                  {categoryOptions.map((category) => (
                    <option key={category.slug} value={category.slug}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {helperText(errors.category?.message)}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="condition">Condition</Label>
                <select
                  id="condition"
                  className="h-11 rounded-lg border border-input bg-background px-3 text-sm"
                  {...register("condition")}
                >
                  {LISTING_CONDITIONS.map((condition) => (
                    <option key={condition} value={condition}>
                      {condition.replace(/-/g, " ")}
                    </option>
                  ))}
                </select>
                {helperText(errors.condition?.message)}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="priceAmount">Price</Label>
                <Input
                  id="priceAmount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  {...register("priceAmount")}
                />
                {priceSuggestion && (
                  <p className="text-xs text-muted-foreground">
                    AI range: {priceSuggestion}
                  </p>
                )}
                {helperText(errors.priceAmount?.message)}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  maxLength={3}
                  {...register("currency", {
                    onChange: (event) =>
                      setValue("currency", event.target.value.toUpperCase(), {
                        shouldValidate: true,
                      }),
                  })}
                />
                {helperText(errors.currency?.message)}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  {...register("quantity")}
                />
                {helperText(errors.quantity?.message)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Photos and AI generation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
            <Label
              htmlFor="photos"
              className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border p-5 text-center sm:p-8"
            >
              <UploadCloud className="mb-3 h-8 w-8 text-primary" />
              <span className="font-semibold">
                Upload multiple listing photos to Supabase Storage
              </span>
              <span className="mt-1 text-sm text-muted-foreground">
                JPEG, PNG, WebP, HEIC, or HEIF. Up to {MAX_IMAGES} photos.
              </span>
              <Input
                id="photos"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="mt-4"
                onChange={uploadPhotos}
              />
            </Label>
            {images.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                {images.map((image, index) => (
                  <div
                    key={`${image.storagePath}-${index}`}
                    className="overflow-hidden rounded-xl border border-border bg-secondary"
                  >
                    <div className="relative">
                      {image.publicUrl ? (
                        <Image
                          src={image.publicUrl}
                          alt={image.altText || "Listing upload"}
                          width={320}
                          height={128}
                          unoptimized
                          className="h-32 w-full object-cover"
                        />
                      ) : (
                        <div className="h-32" />
                      )}
                      <button
                        type="button"
                        className="absolute right-2 top-2 rounded-full bg-background p-1 shadow"
                        onClick={() =>
                          updateImages(
                            images.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                          )
                        }
                        aria-label="Remove image"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-2 p-2 text-xs">
                      <span>
                        {index === 0 ? "Primary photo" : `Image ${index + 1}`}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={index === 0 || disabled}
                          onClick={() => {
                            const next = [...images];
                            [next[index - 1], next[index]] = [
                              next[index],
                              next[index - 1],
                            ];
                            updateImages(next);
                          }}
                          aria-label="Move image up"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={index === images.length - 1 || disabled}
                          onClick={() => {
                            const next = [...images];
                            [next[index], next[index + 1]] = [
                              next[index + 1],
                              next[index],
                            ];
                            updateImages(next);
                          }}
                          aria-label="Move image down"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="px-2 pb-2">
                      <Label htmlFor={`image-alt-${index}`} className="sr-only">
                        Image alt text
                      </Label>
                      <Input
                        id={`image-alt-${index}`}
                        value={image.altText ?? ""}
                        onChange={(event) =>
                          updateImages(
                            images.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, altText: event.target.value }
                                : item,
                            ),
                          )
                        }
                        placeholder="Describe this photo"
                        className="h-9 bg-background text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {helperText(errors.images?.message)}
            <div className="grid gap-2">
              <Label htmlFor="sellerNotes">Optional AI notes</Label>
              <Textarea
                id="sellerNotes"
                value={sellerNotes}
                onChange={(event) => setSellerNotes(event.target.value)}
                placeholder="Add visible details the AI should consider, such as known brand, model, flaws, or included accessories."
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={generateWithAi}
              disabled={disabled}
              isLoading={busy === "Generating AI listing"}
              loadingText="Generating AI listing..."
            >
              <Sparkles className="h-4 w-4" /> Generate title, description,
              category, condition, price range, SEO tags, and fraud risk
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Location and fulfillment</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="locationCity">City</Label>
                <Input id="locationCity" {...register("locationCity")} />
                {helperText(errors.locationCity?.message)}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="locationRegion">State / region</Label>
                <Input id="locationRegion" {...register("locationRegion")} />
                {helperText(errors.locationRegion?.message)}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="locationCountry">Country</Label>
                <Input
                  id="locationCountry"
                  maxLength={2}
                  {...register("locationCountry", {
                    onChange: (event) =>
                      setValue(
                        "locationCountry",
                        event.target.value.toUpperCase(),
                        { shouldValidate: true },
                      ),
                  })}
                />
                {helperText(errors.locationCountry?.message)}
              </div>
            </div>
            <div className="grid gap-3">
              <Label>Shipping / pickup options</Label>
              <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                {FULFILLMENT_OPTIONS.map((option) => (
                  <label
                    key={option}
                    className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm font-medium"
                  >
                    <input
                      type="checkbox"
                      checked={watched.fulfillmentOptions.includes(option)}
                      onChange={() => toggleFulfillment(option)}
                    />{" "}
                    {option.replace(/_/g, " ")}
                  </label>
                ))}
              </div>
              {helperText(errors.fulfillmentOptions?.message)}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="shipsTo">Ships to</Label>
              <Input
                id="shipsTo"
                placeholder="US, CA"
                {...register("shipsTo")}
              />
              {helperText(errors.shipsTo?.message)}
            </div>
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-5 xl:sticky xl:top-24 xl:h-fit">
        <Card className={isReadyToPublish ? "border-primary/30 bg-primary/5" : undefined}>
          <CardHeader>
            <CardTitle>Publish readiness</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-secondary/70 p-3 text-sm">
              <span className="font-semibold">{completedReadinessItems}/{readinessItems.length} fundamentals complete</span>
              <Badge variant={isReadyToPublish ? "trust" : "default"}>{isReadyToPublish ? "Ready" : "Needs work"}</Badge>
            </div>
            <div className="grid gap-2 text-sm">
              {readinessItems.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2">
                  <span>{item.label}</span>
                  <span className={item.complete ? "font-bold text-primary" : "text-muted-foreground"}>{item.complete ? "Done" : "Missing"}</span>
                </div>
              ))}
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              Admin-only moderation stays out of the seller form. AI risk signals are submitted for review automatically when needed.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Listing status management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="flex flex-wrap gap-2">
              <Badge>{currentStatus}</Badge>
              <Badge>
                {images.length}/{MAX_IMAGES} photos
              </Badge>
            </div>
            {listing && (
              <div className="grid gap-2">
                {canMoveToDraft ? (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={disabled}
                    onClick={() => changeStatus("draft")}
                    isLoading={busy?.startsWith("Setting listing")}
                    loadingText="Saving status..."
                  >
                    Save as draft
                  </Button>
                ) : null}
                {canPublish ? (
                  <Button
                    type="button"
                    disabled={disabled}
                    onClick={() => changeStatus("active")}
                    isLoading={busy?.startsWith("Setting listing")}
                    loadingText="Publishing..."
                  >
                    Publish listing
                  </Button>
                ) : null}
                {canPause ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    onClick={() => changeStatus("paused")}
                    isLoading={busy?.startsWith("Setting listing")}
                    loadingText="Pausing..."
                  >
                    Pause listing
                  </Button>
                ) : null}
                {canMarkSold ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    onClick={() => changeStatus("sold")}
                    isLoading={busy?.startsWith("Setting listing")}
                    loadingText="Updating..."
                  >
                    Mark as sold
                  </Button>
                ) : null}
                {canArchive ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    onClick={() => changeStatus("archived")}
                    isLoading={busy?.startsWith("Setting listing")}
                    loadingText="Archiving..."
                  >
                    <Archive className="h-4 w-4" aria-hidden="true" />
                    Archive listing
                  </Button>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Publishing guidance and SEO</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="grid gap-2">
              <Label htmlFor="seoTags">SEO tags</Label>
              <Input
                id="seoTags"
                placeholder="camera, creator kit, mirrorless"
                {...register("seoTags")}
              />
              {helperText(errors.seoTags?.message)}
            </div>
            {watched.ai?.generated && (
              <div className="space-y-3 rounded-2xl bg-secondary p-4 text-sm">
                <p className="font-semibold">AI analysis</p>
                <p className="text-muted-foreground">
                  Scam risk score: {watched.ai.fraudRiskScore ?? "n/a"}/100
                </p>
                {watched.ai.scamRiskWarning && (
                  <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-destructive">
                    {watched.ai.scamRiskWarning}
                  </p>
                )}
                {watched.ai.conditionConfidence !== undefined && (
                  <p className="text-muted-foreground">
                    Condition confidence:{" "}
                    {Math.round(watched.ai.conditionConfidence * 100)}%
                  </p>
                )}
                {generationTrace && (
                  <div className="rounded-xl border border-border bg-background p-3 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">Usage logging</p>
                    <p>Task: {generationTrace.taskId ?? "audit event only"}</p>
                    <p>Latency: {generationTrace.latencyMs.toLocaleString()}ms</p>
                    {generationTrace.totalTokens !== undefined && (
                      <p>Tokens: {generationTrace.totalTokens.toLocaleString()}</p>
                    )}
                    {generationTrace.model && <p>Model: {generationTrace.model}</p>}
                  </div>
                )}
                {watched.ai.categoryRationale && (
                  <p className="text-muted-foreground">
                    Category rationale: {watched.ai.categoryRationale}
                  </p>
                )}
                {watched.ai.priceRationale && (
                  <p className="text-muted-foreground">
                    Price rationale: {watched.ai.priceRationale}
                  </p>
                )}
                {watched.ai.conditionEvidence &&
                  watched.ai.conditionEvidence.length > 0 && (
                    <div>
                      <p className="font-medium">Condition evidence</p>
                      <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
                        {watched.ai.conditionEvidence.map((evidence) => (
                          <li key={evidence}>{evidence}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                {watched.ai.riskFactors &&
                  watched.ai.riskFactors.length > 0 && (
                    <div>
                      <p className="font-medium">Risk factors</p>
                      <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
                        {watched.ai.riskFactors.map((factor) => (
                          <li key={factor}>{factor}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                {watched.ai.fraudIndicators?.indicators?.length ? (
                  <div>
                    <p className="font-medium">
                      Fraud indicators: {watched.ai.fraudIndicators.riskLevel} risk
                      {watched.ai.fraudIndicators.reviewRequired ? " · review required" : ""}
                    </p>
                    <ul className="mt-1 space-y-2 text-muted-foreground">
                      {watched.ai.fraudIndicators.indicators.map((indicator) => (
                        <li key={`${indicator.type}-${indicator.evidence}`} className="rounded-xl border border-border bg-background p-3">
                          <span className="font-medium text-foreground">
                            {indicator.severity} {indicator.type}
                          </span>
                          <span className="block">{indicator.evidence}</span>
                          <span className="block text-xs">{indicator.recommendation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {watched.ai.missingInformationQuestions &&
                  watched.ai.missingInformationQuestions.length > 0 && (
                    <div>
                      <p className="font-medium">
                        Missing information to answer
                      </p>
                      <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
                        {watched.ai.missingInformationQuestions.map(
                          (question) => (
                            <li key={question}>{question}</li>
                          ),
                        )}
                      </ul>
                    </div>
                  )}
                {watched.ai.rationale && (
                  <p className="text-muted-foreground">
                    {watched.ai.rationale}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 p-4 sm:p-5">
            {busy && <p className="text-sm text-muted-foreground">{busy}...</p>}
            <Button
              type="submit"
              variant="secondary"
              className="w-full"
              disabled={disabled}
              isLoading={busy === "Saving draft"}
              loadingText="Saving draft..."
            >
              Save draft
            </Button>
            <Button
              type="button"
              className="w-full"
              disabled={disabled}
              onClick={() => submitListing(true)}
              isLoading={busy === "Publishing listing"}
              loadingText="Publishing listing..."
            >
              Publish listing
            </Button>
            {listing && (
              <Button
                type="button"
                variant="destructive"
                className="w-full"
                disabled={disabled}
                onClick={removeListing}
                isLoading={busy === "Deleting listing"}
                loadingText="Deleting listing..."
              >
                Delete listing
              </Button>
            )}
          </CardContent>
        </Card>
      </aside>
    </form>
  );
}
