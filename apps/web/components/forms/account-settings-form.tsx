"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateAccountAction, type AuthActionState } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type AccountSettingsFormProps = {
  email: string;
  profile: {
    display_name: string;
    username: string | null;
    bio: string | null;
    location_label: string | null;
    website_url: string | null;
  } | null;
};

const initialState: AuthActionState = { status: "idle", message: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button disabled={pending} type="submit">
      {pending ? "Saving..." : "Save settings"}
    </Button>
  );
}

export function AccountSettingsForm({ email, profile }: AccountSettingsFormProps) {
  const [state, formAction] = useFormState(updateAccountAction, initialState);

  return (
    <form className="grid gap-5" action={formAction}>
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={email} disabled />
        <p className="text-xs text-muted-foreground">Email changes should go through Supabase Auth verification before they are applied.</p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="displayName">Display name</Label>
        <Input id="displayName" name="displayName" defaultValue={profile?.display_name ?? "Marketplace member"} required minLength={2} maxLength={80} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="username">Username</Label>
        <Input id="username" name="username" defaultValue={profile?.username ?? ""} placeholder="marketplace_pro" pattern="[a-zA-Z0-9_][a-zA-Z0-9_.-]{2,29}" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="locationLabel">Location</Label>
        <Input id="locationLabel" name="locationLabel" defaultValue={profile?.location_label ?? ""} placeholder="Austin, TX" maxLength={120} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="websiteUrl">Website</Label>
        <Input id="websiteUrl" name="websiteUrl" type="url" defaultValue={profile?.website_url ?? ""} placeholder="https://example.com" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea id="bio" name="bio" defaultValue={profile?.bio ?? ""} placeholder="Share what you buy, sell, or collect." maxLength={1000} />
      </div>
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
      <SubmitButton />
    </form>
  );
}
