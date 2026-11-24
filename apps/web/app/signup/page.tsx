import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/forms/auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDevBypassSession } from "@/lib/auth/dev-bypass-session";
import { getSafeRedirectPath } from "@/lib/auth/protected-routes";
import { createClient } from "@/lib/supabase/server";

function getSafeNext(next?: string | string[]) {
  const value = Array.isArray(next) ? next[0] : next;
  return getSafeRedirectPath(value, "/dashboard");
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

  return (
    <section className="mx-auto grid min-h-[70vh] max-w-6xl place-items-center px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md shadow-soft">
        <CardHeader>
          <CardTitle className="text-2xl">Create account</CardTitle>
          <CardDescription>Start buying, selling, and managing protected marketplace workflows.</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm mode="signup" next={next} showDevBypass={devBypass.enabled} />
          <p className="mt-5 text-center text-sm text-muted-foreground">
            Already have an account? <Link className="font-semibold text-primary" href={`/login?next=${encodeURIComponent(next)}`}>Log in</Link>
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
