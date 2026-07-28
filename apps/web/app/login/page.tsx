import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/forms/auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isDevAuthBypassEnabled } from "@/lib/auth/dev-bypass";
import { createClient } from "@/lib/supabase/server";

function getSafeNext(next?: string | string[]) {
  const value = Array.isArray(next) ? next[0] : next;
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export default async function LoginPage({ searchParams }: { searchParams?: Promise<{ next?: string | string[]; loggedOut?: string; authError?: string; accountDeletionPending?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const next = getSafeNext(resolvedSearchParams?.next);

  if (user) {
    redirect(next);
  }

  return (
    <section className="mx-auto grid min-h-[70vh] max-w-6xl place-items-center px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md shadow-soft">
        <CardHeader>
          <CardTitle className="text-2xl">Log in</CardTitle>
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
          <AuthForm mode="login" next={next} showDevBypass={isDevAuthBypassEnabled()} />
          <p className="mt-5 text-center text-sm text-muted-foreground">
            New here? <Link className="font-semibold text-primary" href={`/signup?next=${encodeURIComponent(next)}`}>Create an account</Link>
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
