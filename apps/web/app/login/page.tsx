import Link from "next/link";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/forms/auth-form";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { getDevBypassSession } from "@/lib/auth/dev-bypass-session";
import { e2eUserFromCookie } from "@/lib/auth/e2e-session";
import { getSafeRedirectPath } from "@/lib/auth/protected-routes";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";

function getOAuthProviders(): ("google" | "apple")[] {
  return (publicEnv.NEXT_PUBLIC_OAUTH_PROVIDERS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is "google" | "apple" => value === "google" || value === "apple");
}

function getSafeNext(next?: string | string[]) {
  const value = Array.isArray(next) ? next[0] : next;
  return getSafeRedirectPath(value, "/dashboard");
}

export default async function LoginPage({ searchParams }: { searchParams?: Promise<{ next?: string | string[]; loggedOut?: string; authError?: string; accountDeletionPending?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const next = getSafeNext(resolvedSearchParams?.next);
  const devBypass = await getDevBypassSession();

  if (devBypass.user) {
    redirect(next.startsWith("/admin") ? "/dashboard?adminDenied=1" : next);
  }

  const e2eUser = e2eUserFromCookie((await cookies()).get("ffm-e2e-user")?.value, (await headers()).get("host"));
  if (e2eUser) {
    redirect(next.startsWith("/admin") ? "/dashboard?adminDenied=1" : next);
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    if (next === "/admin" || next.startsWith("/admin/")) {
      const { data: account } = await supabase.from("users").select("role,status").eq("id", user.id).maybeSingle();
      const isAdmin = account?.status === "active" && (account.role === "admin" || account.role === "super_admin");
      redirect(isAdmin ? next : "/dashboard?adminDenied=1");
    }
    redirect(next);
  }

  return (
    <section className="mx-auto grid min-h-[70vh] max-w-6xl place-items-center px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md shadow-soft">
        <CardHeader>
          <h1 className="card-title text-2xl">Log in to your account</h1>
          <CardDescription>Access your buyer, seller, or admin workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          {resolvedSearchParams?.loggedOut ? (
            <p className="mb-5 rounded-lg border border-primary/20 bg-primary/10 p-3 text-sm" role="status">
              You have been logged out securely.
            </p>
          ) : null}
          {resolvedSearchParams?.authError ? (
            <p className="mb-5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
              {resolvedSearchParams.authError}
            </p>
          ) : null}
          {resolvedSearchParams?.accountDeletionPending ? (
            <p className="mb-5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950" role="status">
              Your marketplace data was anonymized and this session was closed. Contact support to finish removing the authentication record.
            </p>
          ) : null}
          <AuthForm mode="login" next={next} showDevBypass={devBypass.enabled} oauthProviders={getOAuthProviders()} />
          <p className="mt-5 text-center text-sm text-muted-foreground">
            New here? <Link className="font-semibold text-primary" href={`/signup?next=${encodeURIComponent(next)}`}>Create an account</Link>
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
