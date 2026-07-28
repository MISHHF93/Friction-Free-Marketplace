"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEV_AUTH_BYPASS_COOKIE, isDevAuthBypassEnabled } from "@/lib/auth/dev-bypass";
import { publicEnv } from "@/lib/env";
import { authSchema, profileSettingsSchema, signupSchema } from "@/lib/validations/auth";

export type AuthActionState = {
  status: "idle" | "error" | "success";
  message: string | null;
};

const defaultRedirectPath = "/dashboard";
const oauthProviderSchema = z.enum(["google", "apple"]);

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
  const next = getSafeRedirectPath(formData.get("next"));
  const redirectTo = new URL(`/auth/callback?next=${encodeURIComponent(next)}`, publicEnv.NEXT_PUBLIC_APP_URL).toString();
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
    redirect(next);
  }

  return {
    status: "success",
    message: "Check your email to confirm your account, then log in to continue."
  };
}

export async function oauthSignInAction(formData: FormData) {
  const provider = oauthProviderSchema.safeParse(getFormString(formData, "provider"));
  const next = getSafeRedirectPath(formData.get("next"));

  if (!provider.success) {
    redirect(`/login?next=${encodeURIComponent(next)}&authError=${encodeURIComponent("Unsupported sign-on provider.")}`);
  }

  const supabase = createClient();
  const redirectTo = new URL(`/auth/callback?next=${encodeURIComponent(next)}`, publicEnv.NEXT_PUBLIC_APP_URL).toString();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider.data,
    options: { redirectTo }
  });

  if (error || !data.url) {
    redirect(`/login?next=${encodeURIComponent(next)}&authError=${encodeURIComponent(error?.message ?? "Unable to start sign-on.")}`);
  }

  redirect(data.url);
}

export async function devBypassAction(formData: FormData) {
  const next = getSafeRedirectPath(formData.get("next"));

  if (!isDevAuthBypassEnabled()) {
    redirect(`/login?next=${encodeURIComponent(next)}&authError=${encodeURIComponent("Developer bypass is not available in this environment.")}`);
  }

  const cookieStore = await cookies();
  cookieStore.set(DEV_AUTH_BYPASS_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 8
  });

  revalidatePath("/", "layout");
  redirect(next);
}

export async function logoutAction() {
  const supabase = createClient();
  await supabase.auth.signOut();
  const cookieStore = await cookies();
  cookieStore.delete(DEV_AUTH_BYPASS_COOKIE);
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

export async function deleteAccountAction(formData: FormData) {
  if (getFormString(formData, "confirmation") !== "DELETE") {
    redirect("/account/settings?deleteError=Type%20DELETE%20to%20confirm");
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account/settings");

  const admin = createAdminClient();
  const { error: anonymizeError } = await (admin as any).rpc("anonymize_marketplace_account", {
    target_user_id: user.id
  });
  if (anonymizeError) {
    redirect(`/account/settings?deleteError=${encodeURIComponent("Unable to anonymize the account. Please contact support.")}`);
  }

  const { error } = await admin.auth.admin.deleteUser(user.id, true);
  const cookieStore = await cookies();
  await supabase.auth.signOut();
  cookieStore.delete(DEV_AUTH_BYPASS_COOKIE);
  if (error) redirect("/login?accountDeletionPending=1");
  redirect("/?accountDeleted=1");
}
