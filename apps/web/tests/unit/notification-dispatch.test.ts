import { beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.fn();
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: (...args: unknown[]) => send(...args) };
  }
}));

vi.mock("@/lib/env.server", () => ({
  env: {
    RESEND_API_KEY: "re_test",
    RESEND_FROM_EMAIL: "Friction-Free Marketplace <hello@ffm-local.test>"
  }
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));

import { createNotification, dispatchOneEmailNotification, dispatchQueuedEmailNotifications } from "@/lib/notifications/service";

function supabaseMock(options: {
  preferences?: Record<string, unknown>;
  email?: string | null;
  inserted?: Array<Record<string, unknown>>;
}) {
  const updates: Array<Record<string, unknown>> = [];
  const queued = [
    { id: "n-queued", user_id: "user-1", channel: "email", status: "queued", title: "Queued", body: "Later", payload: { email_subject: "Sub", email_text: "Body" } }
  ];
  const rows = options.inserted ?? queued;
  return {
    updates,
    from(table: string) {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        in: () => chain,
        order: () => chain,
        limit: () => chain,
        upsert: () => chain,
        insert: () => chain,
        update: (values: Record<string, unknown>) => {
          updates.push({ table, ...values });
          return chain;
        },
        maybeSingle: async () => {
          if (table === "notification_preferences") return { data: options.preferences ?? {
            user_id: "user-1", in_app_enabled: true, email_enabled: true, messages_enabled: true, offers_enabled: true, payments_enabled: true, disputes_enabled: true, saved_searches_enabled: true, marketing_enabled: false, digest_frequency: "instant", quiet_hours_start: null, quiet_hours_end: null, metadata: {}
          }, error: null };
          if (table === "users") return { data: options.email === undefined ? { email: "ada.seller@ffm-local.test" } : options.email ? { email: options.email } : null, error: null };
          return { data: null, error: null };
        },
        then(resolve: (value: unknown) => void, reject?: (reason: unknown) => void) {
          return Promise.resolve({ data: table === "notifications" ? rows : [], error: null }).then(resolve, reject);
        }
      };
      return chain;
    }
  };
}

describe("email notification dispatch", () => {
  beforeEach(() => {
    send.mockReset();
    send.mockResolvedValue({ id: "email-1" });
  });

  it("sends a queued email immediately when a notification is created", async () => {
    const inserted = [{
      id: "n1",
      user_id: "user-1",
      channel: "email",
      status: "queued",
      title: "New marketplace message",
      body: "Hi",
      payload: { email_subject: "Message", email_text: "Hi there", email_html: "<p>Hi</p>", topic: "messages" }
    }];
    const db = supabaseMock({ inserted });
    await createNotification({
      userId: "user-1",
      topic: "messages",
      type: "message_received",
      title: "New marketplace message",
      body: "Hi",
      channels: ["email"],
      supabase: db as any
    });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toMatchObject({
      to: "ada.seller@ffm-local.test",
      subject: "Message",
      text: "Hi there"
    });
    expect(db.updates.some((update) => update.status === "sent")).toBe(true);
  });

  it("leaves a transport failure queued so the hourly dispatcher can retry", async () => {
    send.mockRejectedValueOnce(new Error("resend down"));
    const db = supabaseMock({});
    const result = await dispatchOneEmailNotification({
      id: "n-queued",
      user_id: "user-1",
      channel: "email",
      status: "queued",
      title: "Queued",
      body: "Later",
      payload: { email_subject: "Sub", email_text: "Body" }
    } as any, db as any);
    expect(result.ok).toBe(false);
    expect(db.updates.at(-1)).toMatchObject({ status: "queued", table: "notifications" });
    expect((db.updates.at(-1) as { payload?: { last_error?: string } }).payload?.last_error).toBe("resend down");
  });

  it("retries only queued email rows", async () => {
    const db = supabaseMock({});
    const result = await dispatchQueuedEmailNotifications(25, db as any);
    expect(result.processed).toBe(1);
    expect(result.sent).toBe(1);
    expect(send).toHaveBeenCalledTimes(1);
  });
});
