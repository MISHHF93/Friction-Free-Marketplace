import { redirect } from "next/navigation";
import { deleteAccountAction, logoutAction } from "@/app/auth/actions";
import { AccountSettingsForm } from "@/components/forms/account-settings-form";
import { NotificationPreferencesForm } from "@/components/notifications/notification-preferences-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getNotificationPreferences } from "@/lib/notifications/service";
import { createClient } from "@/lib/supabase/server";

export default async function AccountSettingsPage({ searchParams }: { searchParams?: Promise<{ deleteError?: string }> }) {
  const query = await searchParams;
  const supabase = createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login?next=/account/settings");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name,username,bio,location_label,website_url")
    .eq("user_id", user.id)
    .maybeSingle();
  const notificationPreferences = await getNotificationPreferences(user.id);

  return (
    <section className="mx-auto grid max-w-4xl gap-6 px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Account</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Account settings</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Manage your marketplace identity and public profile. Your session is verified on the server before this page loads.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile details</CardTitle>
              <CardDescription>These details power your buyer, seller, and messaging experiences.</CardDescription>
            </CardHeader>
            <CardContent>
              <AccountSettingsForm email={user.email ?? ""} profile={profile ?? null} />
            </CardContent>
          </Card>
          <NotificationPreferencesForm preferences={notificationPreferences} />
        </div>
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Session</CardTitle>
            <CardDescription>End your active Supabase session on this device.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={logoutAction}>
              <Button className="w-full" variant="outline" type="submit">
                Log out
              </Button>
            </form>
            <div className="mt-6 border-t border-border pt-6">
              <p className="font-semibold text-destructive">Delete account</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Permanently removes your login and personal account data. Legally required transaction records may be retained.
              </p>
              {query?.deleteError ? <p className="mt-3 text-xs text-destructive" role="alert">{query.deleteError}</p> : null}
              <form className="mt-4 grid gap-3" action={deleteAccountAction}>
                <label className="text-xs font-medium" htmlFor="confirmation">Type DELETE to confirm</label>
                <input className="h-10 rounded-xl border border-border bg-background px-3 text-sm" id="confirmation" name="confirmation" required />
                <Button className="w-full" variant="destructive" type="submit">Delete my account</Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
