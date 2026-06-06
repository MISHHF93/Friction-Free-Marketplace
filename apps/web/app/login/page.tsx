import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/forms/auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

function getSafeNext(next?: string | string[]) {
  const value = Array.isArray(next) ? next[0] : next;
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export default async function LoginPage({ searchParams }: { searchParams?: { next?: string | string[]; loggedOut?: string; authError?: string } }) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const next = getSafeNext(searchParams?.next);

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
          {searchParams?.loggedOut ? (
            <p className="mb-5 rounded-lg border border-primary/20 bg-primary/10 p-3 text-sm" role="status">
              You have been logged out securely.
            </p>
          ) : null}
          {searchParams?.authError ? (
            <p className="mb-5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
              {searchParams.authError}
            </p>
          ) : null}
          <AuthForm mode="login" next={next} />
          <p className="mt-5 text-center text-sm text-muted-foreground">
            New here? <Link className="font-semibold text-primary" href="/signup">Create an account</Link>
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
