import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/forms/auth-form";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { getDevBypassSession } from "@/lib/auth/dev-bypass-session";
import { getSafeRedirectPath } from "@/lib/auth/protected-routes";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { isLiveDatabaseConfigured } from "@/lib/marketplace/demo-mode";

function getSafeNext(next?: string | string[]) {
  const value = Array.isArray(next) ? next[0] : next;
  return getSafeRedirectPath(value, "/dashboard");
}

function getOAuthProviders(): ("google" | "apple")[] {
  const configured = (publicEnv.NEXT_PUBLIC_OAUTH_PROVIDERS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is "google" | "apple" => value === "google" || value === "apple");
  return configured.length ? configured : isLiveDatabaseConfigured() ? ["google"] : [];
}

export default async function SignupPage({ searchParams }: { searchParams?: Promise<{ next?: string | string[] }> }) {
  const resolvedSearchParams = await searchParams;
  const next = getSafeNext(resolvedSearchParams?.next);
  const devBypass = await getDevBypassSession();

  if (devBypass.user) redirect(next);

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) redirect(next);

  const oauthProviders = getOAuthProviders();

  return (
    <section className="mx-auto grid min-h-[70vh] max-w-6xl place-items-center px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md shadow-soft">
        <CardHeader>
          <h1 className="card-title text-2xl">Create account</h1>
          <CardDescription>Start buying, selling, and managing protected marketplace workflows.</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm mode="signup" next={next} showDevBypass={devBypass.enabled} oauthProviders={getOAuthProviders()} />
          {isLiveDatabaseConfigured() && oauthProviders.includes("google") && (
            <div className="mt-4">
              <Link href={`/api/auth/signin/google?next=${encodeURIComponent(next)}`} className="inline-flex w-full justify-center rounded-md border border-transparent bg-google-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-google-600 focus:outline-none focus:ring-2 focus:ring-google-500 focus:ring-offset-2">
                Sign up with Google
              </Link>
            </div>
          )}
          {oauthProviders.includes("apple") && (
            <div className="mt-4">
              <Link href={`/api/auth/signin/apple?next=${encodeURIComponent(next)}`} className="inline-flex w-full justify-center rounded-md border border-transparent bg-apple-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-apple-600 focus:outline-none focus:ring-2 focus:ring-apple-500 focus:ring-offset-2">
                Sign up with Apple
              </Link>
            </div>
          )}
          <p className="mt-5 text-center text-sm text-muted-foreground">
            Already have an account? <Link className="font-semibold text-primary" href={`/login?next=${encodeURIComponent(next)}`}>Log in</Link>
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
