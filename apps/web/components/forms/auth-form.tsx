"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/browser";
import { authSchema, type AuthFormValues } from "@/lib/validations/auth";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [message, setMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<AuthFormValues>({ resolver: zodResolver(authSchema) });

  async function onSubmit(values: AuthFormValues) {
    setMessage(null);

    try {
      const supabase = createClient();
      const response =
        mode === "login"
          ? await supabase.auth.signInWithPassword(values)
          : await supabase.auth.signUp({
              ...values,
              options: { emailRedirectTo: `${window.location.origin}/dashboard` }
            });

      if (response.error) {
        setMessage(response.error.message);
        return;
      }

      setMessage(mode === "login" ? "Signed in. Redirecting..." : "Check your email to confirm your account.");
      if (mode === "login") {
        window.location.assign("/dashboard");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication is not configured yet.");
    }
  }

  return (
    <form className="grid gap-5" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="you@example.com" {...register("email")} />
        {errors.email ? <p className="text-sm text-destructive">{errors.email.message}</p> : null}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" placeholder="At least 8 characters" {...register("password")} />
        {errors.password ? <p className="text-sm text-destructive">{errors.password.message}</p> : null}
      </div>
      {message ? <p className="rounded-lg bg-secondary p-3 text-sm text-muted-foreground">{message}</p> : null}
      <Button disabled={isSubmitting} type="submit">
        {isSubmitting ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
      </Button>
    </form>
  );
}
