"use client";

import { useFormState, useFormStatus } from "react-dom";
import { loginAction, signupAction, type AuthActionState } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthActionState = { status: "idle", message: null };

function SubmitButton({ mode }: { mode: "login" | "signup" }) {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit">
      {pending ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
    </Button>
  );
}

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next?: string }) {
  const action = mode === "login" ? loginAction : signupAction;
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form className="grid gap-5" action={formAction}>
      {mode === "signup" ? (
        <div className="grid gap-2">
          <Label htmlFor="displayName">Display name</Label>
          <Input id="displayName" name="displayName" placeholder="Alex Marketplace" required minLength={2} maxLength={80} />
        </div>
      ) : null}
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="At least 8 characters"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          minLength={8}
        />
      </div>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {state.message ? (
        <p
          className={
            state.status === "error"
              ? "rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
              : "rounded-lg border border-primary/20 bg-primary/10 p-3 text-sm text-foreground"
          }
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      ) : null}
      <SubmitButton mode={mode} />
    </form>
  );
}
