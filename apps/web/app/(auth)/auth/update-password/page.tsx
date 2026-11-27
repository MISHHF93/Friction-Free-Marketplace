"use client";

import { useActionState } from "react";
import Link from "next/link";
import { updatePasswordAction, type AuthActionState } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthActionState = { status: "idle", message: null };

export default function UpdatePasswordPage() {
  const [state, formAction] = useActionState(updatePasswordAction, initialState);

  return (
    <section className="mx-auto grid min-h-[70vh] max-w-6xl place-items-center px-4 py-12">
      <Card className="w-full max-w-md shadow-soft">
        <CardHeader>
          <CardTitle className="text-2xl">Set a new password</CardTitle>
          <CardDescription>Choose a new password for this account, then log in.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-5" action={formAction}>
            <div className="grid gap-2">
              <Label htmlFor="password">New password</Label>
              <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} />
            </div>
            {state.message ? (
              <FormMessage tone={state.status === "error" ? "error" : "success"}>{state.message}</FormMessage>
            ) : null}
            <Button type="submit">Update password</Button>
          </form>
          <p className="mt-5 text-center text-sm text-muted-foreground">
            <Link className="font-semibold text-primary" href="/login">Back to log in</Link>
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
