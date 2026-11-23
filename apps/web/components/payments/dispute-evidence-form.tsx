"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function DisputeEvidenceForm({ disputeId }: { disputeId: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/disputes/${disputeId}/evidence`, { method: "POST", body: data });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof payload.error === "string" ? payload.error : "The evidence could not be saved.");
      }
      setMessage("Evidence submitted.");
      form.reset();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The evidence could not be saved.");
    } finally {
      setPending(false);
    }
  }

  return (
    <details className="rounded-xl border border-border p-3" open>
      <summary className="cursor-pointer text-sm font-semibold">Add dispute evidence</summary>
      <form className="mt-3 grid gap-2" onSubmit={onSubmit}>
        <label className="grid gap-1 text-xs font-medium" htmlFor={`evidence-note-${disputeId}`}>
          What happened
          <textarea id={`evidence-note-${disputeId}`} name="note" rows={3} className="rounded-xl border border-border bg-background px-3 py-2 text-sm" placeholder="Describe the issue and what you want reviewed." />
        </label>
        <label className="grid gap-1 text-xs font-medium" htmlFor={`evidence-photos-${disputeId}`}>
          Photos
          <input id={`evidence-photos-${disputeId}`} name="photos" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple className="text-sm" />
        </label>
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? "Uploading evidence…" : "Submit evidence"}
        </Button>
        {message ? <p className="text-xs text-muted-foreground" role="status">{message}</p> : null}
      </form>
    </details>
  );
}
