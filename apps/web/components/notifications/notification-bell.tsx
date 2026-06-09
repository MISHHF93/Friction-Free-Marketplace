import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/app/notifications/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getUnreadNotificationCount, listInAppNotifications } from "@/lib/notifications/service";

function formatAge(createdAt: string) {
  const diffMinutes = Math.max(0, Math.round((Date.now() - new Date(createdAt).getTime()) / 60000));
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.round(diffHours / 24)}d ago`;
}

export async function NotificationBell() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [unreadCount, notifications] = await Promise.all([
    getUnreadNotificationCount(user.id),
    listInAppNotifications(user.id, 6)
  ]);

  return (
    <details className="group relative">
      <summary className="relative flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition hover:bg-accent hover:text-foreground [&::-webkit-details-marker]:hidden" aria-label={`Open notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}>
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-black text-primary-foreground" aria-hidden="true">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </summary>
      <div className="absolute right-0 z-50 mt-3 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-3 shadow-soft motion-dropdown">
        <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <p className="font-bold">Notifications</p>
            <p className="text-xs text-muted-foreground">{unreadCount} unread</p>
          </div>
          <form action={markAllNotificationsReadAction}>
            <Button size="sm" variant="ghost" type="submit">
              <CheckCheck className="h-3.5 w-3.5" />
              Read all
            </Button>
          </form>
        </div>
        <div className="mt-3 grid max-h-[26rem] gap-2 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="rounded-xl bg-secondary p-4 text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            notifications.map((notification) => (
              <div className="rounded-xl border border-border bg-background p-3" key={notification.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold">{notification.title}</p>
                      {!notification.read_at ? <Badge>New</Badge> : null}
                    </div>
                    {notification.body ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{notification.body}</p> : null}
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{formatAge(notification.created_at)}</p>
                  </div>
                  {!notification.read_at ? (
                    <form action={markNotificationReadAction}>
                      <input type="hidden" name="id" value={notification.id} />
                      <Button size="sm" variant="ghost" type="submit" aria-label={`Mark ${notification.title} as read`}>Read</Button>
                    </form>
                  ) : null}
                </div>
                {notification.action_url ? (
                  <Button asChild size="sm" variant="outline" className="mt-3 w-full">
                    <Link href={notification.action_url} aria-label={`Open notification: ${notification.title}`}>Open</Link>
                  </Button>
                ) : null}
              </div>
            ))
          )}
        </div>
        <Button asChild variant="ghost" size="sm" className="mt-3 w-full">
          <Link href="/dashboard/settings">Notification settings</Link>
        </Button>
      </div>
    </details>
  );
}
