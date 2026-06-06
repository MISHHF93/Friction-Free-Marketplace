import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/forms/auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function SignupPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <section className="mx-auto grid min-h-[70vh] max-w-6xl place-items-center px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md shadow-soft">
        <CardHeader>
          <CardTitle className="text-2xl">Create account</CardTitle>
          <CardDescription>Start buying, selling, and managing protected marketplace workflows.</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm mode="signup" />
          <p className="mt-5 text-center text-sm text-muted-foreground">
            Already have an account? <Link className="font-semibold text-primary" href="/login">Log in</Link>
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
