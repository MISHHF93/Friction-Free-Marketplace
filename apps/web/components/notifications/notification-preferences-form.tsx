import { Bell, Mail } from "lucide-react";
import { updateNotificationPreferencesAction } from "@/app/notifications/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { NotificationPreferences } from "@/lib/notifications/service";

const topicFields = [
  { key: "messages_enabled", label: "Messages", detail: "New marketplace messages and conversation activity." },
  { key: "offers_enabled", label: "Offers", detail: "New offers, counter offers, accepted and declined offers." },
  { key: "payments_enabled", label: "Payments", detail: "Escrow authorization, capture, release, refunds, and payout events." },
  { key: "disputes_enabled", label: "Disputes", detail: "Dispute openings, evidence requests, and case updates." },
  { key: "saved_searches_enabled", label: "Saved searches", detail: "New listings matching saved searches and digests." },
  { key: "marketing_enabled", label: "Product updates", detail: "Optional marketplace announcements and education." }
] as const;

export function NotificationPreferencesForm({ preferences }: { preferences: NotificationPreferences }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Notification preferences</CardTitle>
            <CardDescription>Choose delivery channels and topics for marketplace communications.</CardDescription>
          </div>
          <Bell className="h-6 w-6 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <form action={updateNotificationPreferencesAction} className="grid gap-5">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-start gap-3 rounded-2xl border border-border p-4">
              <input className="mt-1" name="in_app_enabled" type="checkbox" defaultChecked={preferences.in_app_enabled} />
              <span>
                <span className="flex items-center gap-2 font-semibold"><Bell className="h-4 w-4 text-primary" /> In-app notifications</span>
                <span className="mt-1 block text-sm text-muted-foreground">Show alerts in the notification bell.</span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-2xl border border-border p-4">
              <input className="mt-1" name="email_enabled" type="checkbox" defaultChecked={preferences.email_enabled} />
              <span>
                <span className="flex items-center gap-2 font-semibold"><Mail className="h-4 w-4 text-primary" /> Email notifications</span>
                <span className="mt-1 block text-sm text-muted-foreground">Queue email delivery through Resend.</span>
              </span>
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {topicFields.map((field) => (
              <label className="flex items-start gap-3 rounded-2xl border border-border bg-background p-4" key={field.key}>
                <input className="mt-1" name={field.key} type="checkbox" defaultChecked={Boolean(preferences[field.key])} />
                <span>
                  <span className="font-semibold">{field.label}</span>
                  <span className="mt-1 block text-sm leading-6 text-muted-foreground">{field.detail}</span>
                </span>
              </label>
            ))}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="digest_frequency">Digest frequency</Label>
            <select id="digest_frequency" name="digest_frequency" defaultValue={preferences.digest_frequency} className="h-11 rounded-lg border border-input bg-background px-3 text-sm">
              <option value="instant">Instant</option>
              <option value="daily">Daily digest</option>
              <option value="weekly">Weekly digest</option>
              <option value="never">Never send digests</option>
            </select>
          </div>

          <Button type="submit">Save notification preferences</Button>
        </form>
      </CardContent>
    </Card>
  );
}
