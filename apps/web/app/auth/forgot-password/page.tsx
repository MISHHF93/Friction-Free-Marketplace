"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordResetAction, type AuthActionState } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthActionState = { status: "idle", message: null };

export default function ForgotPasswordPage() {
  const [state, formAction] = useActionState(requestPasswordResetAction, initialState);

  return (
    <section className="mx-auto grid min-h-[70vh] max-w-6xl place-items-center px-4 py-12">
      <Card className="w-full max-w-md shadow-soft">
        <CardHeader>
          <CardTitle className="text-2xl">Forgot password</CardTitle>
          <CardDescription>Enter your email and we will send a reset link if an account exists.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-5" action={formAction}>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            {state.message ? (
              <FormMessage tone={state.status === "error" ? "error" : "success"}>{state.message}</FormMessage>
            ) : null}
            <Button type="submit">Send reset link</Button>
          </form>
          <p className="mt-5 text-center text-sm text-muted-foreground">
            <Link className="font-semibold text-primary" href="/login">Back to log in</Link>
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
