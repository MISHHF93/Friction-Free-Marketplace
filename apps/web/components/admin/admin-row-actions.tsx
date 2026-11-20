"use client";

import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdminRowActionMenu({ slug, targetId, subject, primaryAction, actions }: { slug: string; targetId?: string; subject: string; primaryAction: string; actions: string[] }) {
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const ready = reason.trim().length >= 3 && Boolean(targetId) && actions.length > 0;
  const action = actions[0];
  return (
    <details className="relative">
      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-bold [&::-webkit-details-marker]:hidden" aria-label={`Open actions for ${subject}`}>
        <MoreHorizontal className="h-4 w-4" />
        Actions
      </summary>
      <div className="fixed inset-x-0 bottom-0 z-50 mx-auto grid w-full max-w-[480px] gap-3 rounded-t-3xl border border-border bg-card p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-soft">
        <p className="font-bold">{subject}</p>
        <label className="grid gap-1 text-sm font-semibold" htmlFor={`reason-${subject}`}>
          Reason
          <textarea id={`reason-${subject}`} required minLength={3} value={reason} onChange={(event) => setReason(event.target.value)} className="min-h-24 rounded-xl border border-border px-3 py-2" placeholder="Why is this action needed?" />
        </label>
        <Button type="button" className="min-h-11" disabled={!ready} title={!ready ? "Enter a reason of at least 3 characters." : undefined} onClick={async () => {
          const response = await fetch(`/api/admin/${slug}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action, target_id: targetId, reason: reason.trim() })
          });
          const body = await response.json().catch(() => ({}));
          setStatus(response.ok ? `${primaryAction} saved.` : String(body.error ?? "The action was not saved."));
        }}>{primaryAction}</Button>
        {status ? <p className="text-xs" role="status">{status}</p> : null}
        <p className="text-xs text-muted-foreground">{actions.length ? "The action stays disabled until a reason is entered." : "This queue does not change marketplace records."}</p>
      </div>
    </details>
  );
}
