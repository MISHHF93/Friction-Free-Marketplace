"use client";

import { useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

export const destructiveAdminActions = new Set(["suspend", "ban", "reject", "confirm"]);

export function adminActionRequest(action: string, targetId: string, reason: string) {
  return { action, target_id: targetId, reason };
}

export function adminActionControls(actions: string[]) {
  return actions.map((action) => ({
    action,
    label: action.replaceAll("_", " "),
    destructive: destructiveAdminActions.has(action)
  }));
}

export function AdminRowActionMenu({ slug, targetId, subject, actions }: { slug: string; targetId?: string; subject: string; primaryAction?: string; actions: string[] }) {
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const ready = reason.trim().length >= 3 && Boolean(targetId) && actions.length > 0;
  const controls = adminActionControls(actions);

  async function send(action: string) {
    if (!targetId || !ready) return;
    if (destructiveAdminActions.has(action) && pending !== action) {
      setPending(action);
      return;
    }
    const response = await fetch(`/api/admin/${slug}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(adminActionRequest(action, targetId, reason.trim()))
    });
    const body = await response.json().catch(() => ({}));
    setPending(null);
    setStatus(response.ok ? `${action} saved.` : String(body.error ?? "The action was not saved."));
  }

  return (
    <details className="relative" onToggle={(event) => { if (event.currentTarget.open) reasonRef.current?.focus(); }}>
      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-bold [&::-webkit-details-marker]:hidden" aria-label={`Open actions for ${subject}`}>
        <MoreHorizontal className="h-4 w-4" />
        Actions
      </summary>
      <div role="dialog" aria-label={`Actions for ${subject}`} className="fixed inset-x-0 bottom-0 z-[80] mx-auto grid w-full max-w-[480px] gap-3 rounded-t-3xl border border-border bg-card p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-soft">
        <p className="font-bold">{subject}</p>
        <label className="grid gap-1 text-sm font-semibold" htmlFor={`reason-${targetId ?? subject}`}>
          Reason
          <textarea ref={reasonRef} id={`reason-${targetId ?? subject}`} required minLength={3} value={reason} onChange={(event) => setReason(event.target.value)} className="min-h-24 rounded-xl border border-border px-3 py-2" placeholder="Why is this action needed?" />
        </label>
        {controls.map((control) => (
          <Button key={control.action} type="button" className="min-h-11" disabled={!ready} title={!ready ? "Enter a reason of at least 3 characters." : undefined} onClick={() => void send(control.action)}>
            {pending === control.action ? `Confirm ${control.label}` : control.label}
          </Button>
        ))}
        {status ? <p className="text-xs" role="status">{status}</p> : null}
        <p className="text-xs text-muted-foreground">{actions.length ? "Each button sends that action. Destructive actions ask you to confirm." : "This queue does not change marketplace records."}</p>
      </div>
    </details>
  );
}
