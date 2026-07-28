"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { submitContactAction, type ContactActionState } from "@/app/contact/actions";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: ContactActionState = { status: "idle", message: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button disabled={pending} type="submit" size="lg" className="w-full sm:w-fit">{pending ? "Sending..." : "Send message"}</Button>;
}

export function ContactForm() {
  const [state, action] = useActionState(submitContactAction, initialState);

  return (
    <form className="grid gap-4" aria-label="Contact Friction-Free Marketplace" action={action}>
      <input className="hidden" tabIndex={-1} autoComplete="off" name="website" aria-hidden="true" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="form-field">
          <Label htmlFor="contact-name">Name</Label>
          <Input id="contact-name" name="name" autoComplete="name" required minLength={2} maxLength={100} placeholder="Your name" />
        </div>
        <div className="form-field">
          <Label htmlFor="contact-email">Email</Label>
          <Input id="contact-email" name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" />
        </div>
      </div>
      <div className="form-field">
        <Label htmlFor="contact-topic">Topic</Label>
        <select id="contact-topic" name="topic" className="form-control" defaultValue="buyer-support">
          <option value="buyer-support">Buyer support</option>
          <option value="seller-onboarding">Seller onboarding</option>
          <option value="safety-report">Safety report</option>
          <option value="partnership">Partnership</option>
          <option value="platform">Platform question</option>
        </select>
      </div>
      <div className="form-field">
        <Label htmlFor="contact-message">Message</Label>
        <Textarea id="contact-message" name="message" required minLength={10} maxLength={5000} placeholder="Share the listing, order, account, or partnership context we should know." />
        <p className="form-helper">Do not include passwords or payment card details.</p>
      </div>
      {state.message ? <FormMessage tone={state.status === "success" ? "success" : "error"}>{state.message}</FormMessage> : null}
      <SubmitButton />
    </form>
  );
}
