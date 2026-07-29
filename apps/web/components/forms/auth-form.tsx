"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { devBypassAction, loginAction, oauthSignInAction, signupAction, type AuthActionState } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthActionState = { status: "idle", message: null };

function SubmitButton({ mode }: { mode: "login" | "signup" }) {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} isLoading={pending} loadingText={mode === "login" ? "Logging in..." : "Creating account..."} type="submit">
      {mode === "login" ? "Log in" : "Create account"}
    </Button>
  );
}

export function AuthForm({ mode, next, showDevBypass = false }: { mode: "login" | "signup"; next?: string; showDevBypass?: boolean }) {
  const action = mode === "login" ? loginAction : signupAction;
  const [state, formAction] = useActionState(action, initialState);

  return (
    <div className="grid gap-5">
      {showDevBypass ? (
        <form className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-4" action={devBypassAction}>
          {next ? <input type="hidden" name="next" value={next} /> : null}
          <p className="mb-3 text-sm font-semibold text-amber-950">Open local sign-in</p>
          <p className="mb-4 text-xs leading-5 text-amber-900">
            Authentication is temporarily open for local development. Continue without Supabase credentials.
          </p>
          <Button className="w-full justify-center" type="submit" variant="trust">
            Continue to marketplace
          </Button>
        </form>
      ) : null}
      <div className="grid gap-3">
        {(["google", "apple"] as const).map((provider) => (
          <form key={provider} action={oauthSignInAction}>
            <input type="hidden" name="provider" value={provider} />
            {next ? <input type="hidden" name="next" value={next} /> : null}
            <Button className="w-full justify-center" type="submit" variant="outline">
              Continue with {provider === "google" ? "Google" : "Apple"}
            </Button>
          </form>
        ))}
      </div>
      <div className="flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        Email
        <span className="h-px flex-1 bg-border" />
      </div>
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
          <p className="text-xs text-muted-foreground">Use the email tied to your marketplace account.</p>
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
          <p className="text-xs text-muted-foreground">Password must be at least 8 characters.</p>
        </div>
        {next ? <input type="hidden" name="next" value={next} /> : null}
        {state.message ? (
          <FormMessage tone={state.status === "error" ? "error" : "success"}>
            {state.message}
          </FormMessage>
        ) : null}
        <SubmitButton mode={mode} />
      </form>
    </div>
  );
}
