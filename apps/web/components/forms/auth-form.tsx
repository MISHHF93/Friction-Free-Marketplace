"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { devBypassAction, loginAction, oauthSignInAction, signupAction, type AuthActionState } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthActionState = { status: "idle", message: null };

const oauthProviders = (process.env.NEXT_PUBLIC_OAUTH_PROVIDERS ?? "")
  .split(",")
  .map((value) => value.trim().toLowerCase())
  .filter((value): value is "google" | "apple" => value === "google" || value === "apple");


function SubmitButton({ mode }: { mode: "login" | "signup" }) {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} isLoading={pending} loadingText={mode === "login" ? "Logging in..." : "Creating account..."} type="submit">
      {mode === "login" ? "Log in" : "Create account"}
    </Button>
  );
}

/** Google's standard multicolor "G", per Google's sign-in branding guidelines. */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" focusable="false" className="shrink-0">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
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
      {oauthProviders.length ? (
        <>
          <div className="grid gap-3">
            {oauthProviders.map((provider) => (
              <form key={provider} action={oauthSignInAction}>
                <input type="hidden" name="provider" value={provider} />
                {next ? <input type="hidden" name="next" value={next} /> : null}
                <Button className="w-full justify-center gap-3" type="submit" variant="outline">
                  {provider === "google" ? <GoogleMark /> : null}
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
        </>
      ) : null}
      <form className="grid gap-5" action={formAction}>
        {mode === "signup" ? (
          <div className="grid gap-2">
            <Label htmlFor="displayName">Display name</Label>
            <Input id="displayName" name="displayName" placeholder="Alex Marketplace" minLength={2} maxLength={80} />
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
        {mode === "login" ? (
          <p className="text-center text-sm">
            <a className="font-semibold text-primary" href="/auth/forgot-password">Forgot password</a>
          </p>
        ) : null}
      </form>
    </div>
  );
}
