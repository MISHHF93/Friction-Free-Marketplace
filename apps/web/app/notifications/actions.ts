"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { markAllNotificationsRead, markNotificationRead, updateNotificationPreferences } from "@/lib/notifications/service";

const digestFrequencySchema = z.enum(["instant", "daily", "weekly", "never"]);

async function requireUserId() {
  const supabase = createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();
  if (error || !user) redirect("/login?next=/dashboard");
  return user.id;
}

function isChecked(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function revalidateNotificationSurfaces() {
  revalidatePath("/", "layout");
  revalidatePath("/dashboard/settings");
  revalidatePath("/account/settings");
}

export async function markNotificationReadAction(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const userId = await requireUserId();
  await markNotificationRead(userId, id);
  revalidateNotificationSurfaces();
}

export async function markAllNotificationsReadAction() {
  const userId = await requireUserId();
  await markAllNotificationsRead(userId);
  revalidateNotificationSurfaces();
}

export async function updateNotificationPreferencesAction(formData: FormData) {
  const userId = await requireUserId();
  await updateNotificationPreferences(userId, {
    in_app_enabled: isChecked(formData, "in_app_enabled"),
    email_enabled: isChecked(formData, "email_enabled"),
    messages_enabled: isChecked(formData, "messages_enabled"),
    offers_enabled: isChecked(formData, "offers_enabled"),
    payments_enabled: isChecked(formData, "payments_enabled"),
    disputes_enabled: isChecked(formData, "disputes_enabled"),
    saved_searches_enabled: isChecked(formData, "saved_searches_enabled"),
    marketing_enabled: isChecked(formData, "marketing_enabled"),
    digest_frequency: digestFrequencySchema.catch("instant").parse(formData.get("digest_frequency") ?? "instant")
  });
  revalidateNotificationSurfaces();
}
