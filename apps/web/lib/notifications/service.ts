import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env.server";
import type { Database, Json } from "@/types/database";
import { renderNotificationTemplate, type NotificationChannel, type NotificationTemplateInput, type NotificationTemplateKey, type NotificationTopic } from "@/lib/notifications/templates";

type Db = SupabaseClient<any>;
export type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];
export type NotificationPreferences = Database["public"]["Tables"]["notification_preferences"]["Row"];
export type NotificationPreferencePatch = Partial<Omit<NotificationPreferences, "user_id" | "created_at" | "updated_at" | "metadata">> & { metadata?: Json };

const defaultPreferences: Omit<NotificationPreferences, "user_id" | "created_at" | "updated_at"> = {
  in_app_enabled: true,
  email_enabled: true,
  messages_enabled: true,
  offers_enabled: true,
  payments_enabled: true,
  disputes_enabled: true,
  saved_searches_enabled: true,
  marketing_enabled: false,
  digest_frequency: "instant",
  quiet_hours_start: null,
  quiet_hours_end: null,
  metadata: {}
};

function adminDb() {
  return createAdminClient() as unknown as Db;
}

function topicPreferenceKey(topic: NotificationTopic) {
  return `${topic}_enabled` as keyof Pick<NotificationPreferences, "messages_enabled" | "offers_enabled" | "payments_enabled" | "disputes_enabled" | "saved_searches_enabled" | "marketing_enabled">;
}

function channelEnabled(preferences: NotificationPreferences, channel: NotificationChannel) {
  return channel === "in_app" ? preferences.in_app_enabled : preferences.email_enabled;
}

function topicEnabled(preferences: NotificationPreferences, topic: NotificationTopic) {
  return Boolean(preferences[topicPreferenceKey(topic)]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getDefaultNotificationPreferences(userId: string): NotificationPreferences {
  return {
    user_id: userId,
    ...defaultPreferences,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

export async function getNotificationPreferences(userId: string, supabase: Db = adminDb()): Promise<NotificationPreferences> {
  const { data, error } = await (supabase as any)
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!error && data) return data as NotificationPreferences;

  const defaults = getDefaultNotificationPreferences(userId);
  await (supabase as any).from("notification_preferences").upsert(defaults, { onConflict: "user_id" });
  return defaults;
}

export async function updateNotificationPreferences(userId: string, patch: NotificationPreferencePatch, supabase: Db = adminDb()) {
  const update = {
    ...patch,
    user_id: userId,
    updated_at: new Date().toISOString()
  };
  const { data, error } = await (supabase as any)
    .from("notification_preferences")
    .upsert(update, { onConflict: "user_id" })
    .select("*")
    .single();
  if (error) throw error;
  return data as NotificationPreferences;
}

export async function getUnreadNotificationCount(userId: string, supabase: Db = adminDb()) {
  const { count, error } = await (supabase as any)
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("channel", "in_app")
    .is("read_at", null)
    .neq("status", "archived");
  if (error) return 0;
  return count ?? 0;
}

export async function listInAppNotifications(userId: string, limit = 8, supabase: Db = adminDb()) {
  const { data, error } = await (supabase as any)
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .eq("channel", "in_app")
    .neq("status", "archived")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as NotificationRow[];
}

export async function markNotificationRead(userId: string, notificationId: string, supabase: Db = adminDb()) {
  const now = new Date().toISOString();
  const { error } = await (supabase as any)
    .from("notifications")
    .update({ read_at: now, status: "read", updated_at: now })
    .eq("id", notificationId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string, supabase: Db = adminDb()) {
  const now = new Date().toISOString();
  const { error } = await (supabase as any)
    .from("notifications")
    .update({ read_at: now, status: "read", updated_at: now })
    .eq("user_id", userId)
    .eq("channel", "in_app")
    .is("read_at", null);
  if (error) throw error;
}

export async function createNotification({
  userId,
  topic,
  type,
  title,
  body,
  actionUrl,
  payload = {},
  channels = ["in_app"],
  supabase = adminDb()
}: {
  userId: string;
  topic: NotificationTopic;
  type: string;
  title: string;
  body?: string | null;
  actionUrl?: string | null;
  payload?: Record<string, unknown>;
  channels?: NotificationChannel[];
  supabase?: Db;
}) {
  const preferences = await getNotificationPreferences(userId, supabase);
  const rows = channels
    .filter((channel) => channelEnabled(preferences, channel) && topicEnabled(preferences, topic))
    .map((channel) => ({
      user_id: userId,
      type,
      title,
      body: body ?? null,
      channel,
      status: channel === "in_app" ? "sent" : "queued",
      action_url: actionUrl ?? null,
      payload: { ...payload, topic } satisfies Json,
      sent_at: channel === "in_app" ? new Date().toISOString() : null
    }));

  if (!rows.length) return [];

  const { data, error } = await (supabase as any).from("notifications").insert(rows).select("*");
  if (error) throw error;
  return (data ?? []) as NotificationRow[];
}

export async function enqueueTemplateNotification({
  userId,
  template,
  input,
  payload = {},
  channels = ["in_app", "email"],
  supabase = adminDb()
}: {
  userId: string;
  template: NotificationTemplateKey;
  input?: NotificationTemplateInput;
  payload?: Record<string, unknown>;
  channels?: NotificationChannel[];
  supabase?: Db;
}) {
  const rendered = renderNotificationTemplate(template, input);
  return createNotification({
    userId,
    topic: rendered.topic,
    type: rendered.type,
    title: rendered.title,
    body: rendered.body,
    actionUrl: rendered.actionUrl,
    payload: {
      ...payload,
      email_subject: rendered.emailSubject,
      email_text: rendered.emailText,
      email_html: rendered.emailHtml
    },
    channels,
    supabase
  });
}

async function getRecipientEmail(supabase: Db, userId: string) {
  const { data } = await (supabase as any).from("users").select("email").eq("id", userId).maybeSingle();
  return typeof data?.email === "string" && data.email.includes("@") ? data.email : null;
}

export async function dispatchQueuedEmailNotifications(limit = 25, supabase: Db = adminDb()) {
  const { data, error } = await (supabase as any)
    .from("notifications")
    .select("*")
    .eq("channel", "email")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;

  const resend = new Resend(env.RESEND_API_KEY);
  const results: Array<{ id: string; ok: boolean; error?: string }> = [];

  for (const notification of (data ?? []) as NotificationRow[]) {
    const recipient = await getRecipientEmail(supabase, notification.user_id);
    if (!recipient) {
      await (supabase as any).from("notifications").update({ status: "failed", payload: { ...(isRecord(notification.payload) ? notification.payload : {}), error: "missing_recipient_email" } }).eq("id", notification.id);
      results.push({ id: notification.id, ok: false, error: "missing_recipient_email" });
      continue;
    }

    const payload = isRecord(notification.payload) ? notification.payload : {};
    try {
      await resend.emails.send({
        from: env.RESEND_FROM_EMAIL,
        to: recipient,
        subject: typeof payload.email_subject === "string" ? payload.email_subject : notification.title,
        text: typeof payload.email_text === "string" ? payload.email_text : `${notification.title}\n\n${notification.body ?? ""}`,
        html: typeof payload.email_html === "string" ? payload.email_html : undefined
      });

      await (supabase as any)
        .from("notifications")
        .update({ status: "sent", sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", notification.id);
      results.push({ id: notification.id, ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "email_send_failed";
      await (supabase as any)
        .from("notifications")
        .update({ status: "failed", payload: { ...payload, error: message }, updated_at: new Date().toISOString() })
        .eq("id", notification.id);
      results.push({ id: notification.id, ok: false, error: message });
    }
  }

  return { processed: results.length, sent: results.filter((result) => result.ok).length, failed: results.filter((result) => !result.ok).length, results };
}
