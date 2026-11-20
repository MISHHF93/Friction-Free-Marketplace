"use client";

import { useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildSettlementPlan, type SettlementOutcome } from "@/lib/payments/settlement-plan";
import { centsToDollars } from "@/lib/payments/money";
import { formatMoney } from "@/lib/i18n/format";

export const destructiveAdminActions = new Set(["suspend", "ban", "reject", "confirm", "close", "hold"]);

export function adminActionRequest(action: string, targetId: string, reason: string, outcome?: string) {
  return outcome ? { action, target_id: targetId, reason, outcome } : { action, target_id: targetId, reason };
}

export function adminActionControls(actions: string[]) {
  return actions.map((action) => ({
    action,
    label: action.replaceAll("_", " "),
    destructive: destructiveAdminActions.has(action)
  }));
}

export function AdminRowActionMenu({ slug, targetId, subject, actions, heldCents = 0, sellerNetCents = 0, currency = "USD", priorRefundedCents = 0 }: { slug: string; targetId?: string; subject: string; primaryAction?: string; actions: string[]; heldCents?: number; sellerNetCents?: number; currency?: string; priorRefundedCents?: number }) {
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<SettlementOutcome | "">("");
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const ready = reason.trim().length >= 3 && Boolean(targetId) && actions.length > 0;
  const controls = adminActionControls(actions);

  async function send(action: string) {
    if (!targetId || !ready) return;
    if (action === "close" && !outcome) {
      setStatus("Choose a settlement outcome before closing the dispute.");
      return;
    }
    if (destructiveAdminActions.has(action) && pending !== action) {
      setPending(action);
      return;
    }
    const response = await fetch(`/api/admin/${slug}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(adminActionRequest(action, targetId, reason.trim(), slug === "disputes" && action === "close" ? outcome : undefined))
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
        {slug === "disputes" ? (
          <label className="grid gap-1 text-sm font-semibold">
            Close outcome
            <select className="min-h-11 rounded-xl border border-border px-3" value={outcome} onChange={(event) => setOutcome(event.target.value as SettlementOutcome | "")} required>
              <option value="">Choose an outcome</option>
              <option value="refund_buyer">Refund buyer</option>
              <option value="release_seller">Release to seller</option>
              <option value="split">Split the held funds</option>
            </select>
          </label>
        ) : null}
        {slug === "disputes" && outcome && heldCents > 0 ? <SettlementPreview outcome={outcome} disputeId={targetId ?? "preview"} heldCents={heldCents} sellerNetCents={sellerNetCents || heldCents} currency={currency} priorRefundedCents={priorRefundedCents} /> : null}
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

function SettlementPreview({ outcome, disputeId, heldCents, sellerNetCents, currency, priorRefundedCents }: { outcome: SettlementOutcome; disputeId: string; heldCents: number; sellerNetCents: number; currency: string; priorRefundedCents: number }) {
  const plan = buildSettlementPlan({ disputeId, outcome, originalAmountCents: heldCents, originalSellerNetCents: sellerNetCents, priorRefundedCents });
  return <p className="text-sm">Refund {formatMoney(centsToDollars(plan.refundCents), currency)} and release {formatMoney(centsToDollars(plan.releaseCents), currency)}.</p>;
}
