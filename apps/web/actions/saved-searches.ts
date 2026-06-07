"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { captureServerEvent } from "@/lib/analytics/posthog";

export type SavedSearchActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const alertFrequencySchema = z.enum(["instant", "daily", "weekly", "never"]);
const savedSearchSchema = z.object({
  name: z.string().trim().min(2, "Name this saved search.").max(120),
  query: z.string().trim().max(200).optional().nullable(),
  filters: z.record(z.unknown()).default({}),
  alertEnabled: z.boolean().default(true),
  alertFrequency: alertFrequencySchema.default("instant")
});

const savedSearchUpdateSchema = savedSearchSchema.partial().extend({ id: z.string().uuid() });

async function requireAuthUser() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Sign in to manage saved searches.");
  return { supabase, user: data.user };
}

function actionError(error: unknown, fallback = "Unable to manage saved search.") {
  return { ok: false, error: error instanceof Error ? error.message : fallback } as const;
}

function revalidateSavedSearchViews() {
  revalidatePath("/dashboard/saved-searches");
  revalidatePath("/search");
  revalidatePath("/browse");
}

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function filtersFromFormData(formData: FormData) {
  const filters: Record<string, string | number | boolean> = {};
  for (const key of ["category", "location", "condition"] as const) {
    const value = formValue(formData, key);
    if (value) filters[key] = value;
  }
  for (const key of ["radiusMiles", "minPrice", "maxPrice", "minSellerTrust"] as const) {
    const raw = formValue(formData, key);
    const value = raw ? Number(raw) : undefined;
    if (Number.isFinite(value)) filters[key] = value as number;
  }
  const sort = formValue(formData, "sort");
  if (sort) filters.sort = sort;
  return filters;
}

export async function createSavedSearchAction(input: unknown): Promise<SavedSearchActionResult<{ id: string }>> {
  try {
    const parsed = savedSearchSchema.parse(input);
    const { supabase, user } = await requireAuthUser();

    const { data, error } = await (supabase as any)
      .from("saved_searches")
      .insert({
        user_id: user.id,
        name: parsed.name,
        query: parsed.query || null,
        filters: parsed.filters,
        alert_enabled: parsed.alertEnabled,
        alert_frequency: parsed.alertFrequency
      })
      .select("id")
      .single();
    if (error) throw error;

    await captureServerEvent({ distinctId: user.id, event: "saved_search_created", properties: { saved_search_id: data.id, alert_frequency: parsed.alertFrequency } });
    revalidateSavedSearchViews();
    return { ok: true, data: { id: data.id } };
  } catch (error) {
    return actionError(error, "Unable to save search.");
  }
}

export async function updateSavedSearchAction(input: unknown): Promise<SavedSearchActionResult<{ id: string }>> {
  try {
    const parsed = savedSearchUpdateSchema.parse(input);
    const { supabase, user } = await requireAuthUser();
    const update: Record<string, unknown> = {};
    if (parsed.name !== undefined) update.name = parsed.name;
    if (parsed.query !== undefined) update.query = parsed.query || null;
    if (parsed.filters !== undefined) update.filters = parsed.filters;
    if (parsed.alertEnabled !== undefined) update.alert_enabled = parsed.alertEnabled;
    if (parsed.alertFrequency !== undefined) update.alert_frequency = parsed.alertFrequency;

    const { error } = await (supabase as any).from("saved_searches").update(update).eq("id", parsed.id).eq("user_id", user.id);
    if (error) throw error;

    await captureServerEvent({ distinctId: user.id, event: "saved_search_updated", properties: { saved_search_id: parsed.id } });
    revalidateSavedSearchViews();
    return { ok: true, data: { id: parsed.id } };
  } catch (error) {
    return actionError(error, "Unable to update saved search.");
  }
}

export async function deleteSavedSearchAction(idInput: unknown): Promise<SavedSearchActionResult<{ id: string }>> {
  try {
    const id = z.string().uuid().parse(idInput);
    const { supabase, user } = await requireAuthUser();
    const { error } = await (supabase as any).from("saved_searches").delete().eq("id", id).eq("user_id", user.id);
    if (error) throw error;

    await captureServerEvent({ distinctId: user.id, event: "saved_search_deleted", properties: { saved_search_id: id } });
    revalidateSavedSearchViews();
    return { ok: true, data: { id } };
  } catch (error) {
    return actionError(error, "Unable to delete saved search.");
  }
}

export async function createSavedSearchFormAction(formData: FormData): Promise<void> {
  await createSavedSearchAction({
    name: formValue(formData, "name") ?? formValue(formData, "q") ?? "Saved marketplace search",
    query: formValue(formData, "q") ?? null,
    filters: filtersFromFormData(formData),
    alertEnabled: formData.get("alertEnabled") !== "false",
    alertFrequency: alertFrequencySchema.catch("instant").parse(formData.get("alertFrequency") ?? "instant")
  });
}

export async function updateSavedSearchFormAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  await updateSavedSearchAction({
    id,
    name: formValue(formData, "name"),
    alertEnabled: formData.get("alertEnabled") === "true",
    alertFrequency: alertFrequencySchema.catch("instant").parse(formData.get("alertFrequency") ?? "instant")
  });
}

export async function deleteSavedSearchFormAction(formData: FormData): Promise<void> {
  await deleteSavedSearchAction(String(formData.get("id") ?? ""));
}
