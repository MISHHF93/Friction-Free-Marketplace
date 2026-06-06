"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { authSchema, profileSettingsSchema, signupSchema } from "@/lib/validations/auth";

export type AuthActionState = {
  status: "idle" | "error" | "success";
  message: string | null;
};

const defaultRedirectPath = "/dashboard";

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getSafeRedirectPath(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return defaultRedirectPath;
  }

  return value;
}

function formatValidationError(error: z.ZodError) {
  return error.issues[0]?.message ?? "Check the form and try again.";
}

export async function loginAction(_previousState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = authSchema.safeParse({
    email: getFormString(formData, "email"),
    password: getFormString(formData, "password")
  });

  if (!parsed.success) {
    return { status: "error", message: formatValidationError(parsed.error) };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/", "layout");
  redirect(getSafeRedirectPath(formData.get("next")));
}

export async function signupAction(_previousState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = signupSchema.safeParse({
    displayName: getFormString(formData, "displayName"),
    email: getFormString(formData, "email"),
    password: getFormString(formData, "password")
  });

  if (!parsed.success) {
    return { status: "error", message: formatValidationError(parsed.error) };
  }

  const supabase = createClient();
  const redirectTo = new URL("/auth/callback?next=/dashboard", publicEnv.NEXT_PUBLIC_APP_URL).toString();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: redirectTo,
      data: {
        display_name: parsed.data.displayName,
        full_name: parsed.data.displayName
      }
    }
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  if (data.user && data.session) {
    await supabase.from("users").upsert(
      {
        id: data.user.id,
        email: data.user.email ?? parsed.data.email,
        status: "active",
        metadata: { signup_source: "web" }
      },
      { ignoreDuplicates: true }
    );
    await supabase.from("profiles").upsert({
      user_id: data.user.id,
      display_name: parsed.data.displayName
    });

    revalidatePath("/", "layout");
    redirect(defaultRedirectPath);
  }

  return {
    status: "success",
    message: "Check your email to confirm your account, then log in to continue."
  };
}

export async function logoutAction() {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login?loggedOut=1");
}

export async function updateAccountAction(_previousState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = profileSettingsSchema.safeParse({
    displayName: getFormString(formData, "displayName"),
    username: getFormString(formData, "username"),
    bio: getFormString(formData, "bio"),
    locationLabel: getFormString(formData, "locationLabel"),
    websiteUrl: getFormString(formData, "websiteUrl")
  });

  if (!parsed.success) {
    return { status: "error", message: formatValidationError(parsed.error) };
  }

  const supabase = createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login?next=/account/settings");
  }

  await supabase.from("users").upsert(
    { id: user.id, email: user.email ?? null, status: "active", metadata: { signup_source: "web" } },
    { ignoreDuplicates: true }
  );

  const { error } = await supabase.from("profiles").upsert({
    user_id: user.id,
    display_name: parsed.data.displayName,
    username: parsed.data.username || null,
    bio: parsed.data.bio || null,
    location_label: parsed.data.locationLabel || null,
    website_url: parsed.data.websiteUrl || null
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/account/settings");
  revalidatePath("/", "layout");
  return { status: "success", message: "Account settings saved." };
}
