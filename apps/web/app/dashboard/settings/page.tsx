import { Bell, Lock, Mail, Settings, UserRound } from "lucide-react";
import { DashboardActionCard, DashboardShell, DashboardStatCard } from "@/components/dashboard-shell";
import { NotificationPreferencesForm } from "@/components/notifications/notification-preferences-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getNotificationPreferences, getUnreadNotificationCount } from "@/lib/notifications/service";

const sections = [
  { label: "Profile", detail: "Display name, bio, location, and public marketplace profile.", icon: UserRound },
  { label: "Notifications", detail: "Messages, offers, saved searches, sales, and security alerts.", icon: Bell },
  { label: "Privacy", detail: "Saved activity, recommendation signals, blocked users, and visibility.", icon: Lock },
  { label: "Email preferences", detail: "Digests, receipts, product updates, and trust & safety notices.", icon: Mail }
];

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const [preferences, unreadCount] = user
    ? await Promise.all([getNotificationPreferences(user.id), getUnreadNotificationCount(user.id)])
    : [null, 0] as const;

  return (
    <DashboardShell title="Settings" description="Control profile details, notification cadence, privacy settings, security preferences, and marketplace communications.">
      <div className="grid gap-5 sm:grid-cols-3">
        <DashboardStatCard icon={Settings} label="Account status" value="Active" detail="Your account can buy, sell, message, and make offers." />
        <DashboardStatCard icon={Bell} label="Unread notifications" value={String(unreadCount)} detail="Configurable channels across email and in-app alerts." />
        <DashboardStatCard icon={Lock} label="Privacy checks" value="On" detail="Recommendations and blocked-user controls are enabled." />
      </div>
      {preferences ? <NotificationPreferencesForm preferences={preferences} /> : null}
      <Card>
        <CardHeader><CardTitle>Settings sections</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <div key={section.label} className="rounded-2xl border border-border p-4">
                <Icon className="h-5 w-5 text-primary" />
                <div className="mt-3 flex items-center gap-2"><p className="font-semibold">{section.label}</p><Badge>Editable</Badge></div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{section.detail}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>
      <DashboardActionCard icon={UserRound} title="Need full account settings?" description="The detailed account settings form remains available for profile fields connected to Supabase profile records.">
        <Button asChild><a href="/account/settings">Open account settings</a></Button>
      </DashboardActionCard>
    </DashboardShell>
  );
}
