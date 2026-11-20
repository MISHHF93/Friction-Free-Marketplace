"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type EscrowActionsProps = {
  transactionId: string;
  role: "buyer" | "seller";
  status: string;
};

async function postAction(path: string, body?: Record<string, unknown>) {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof payload.error === "string" ? payload.error : "The payment action did not complete.";
    throw new Error(message);
  }
  return payload;
}

export function EscrowActions({ transactionId, role, status }: EscrowActionsProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const base = `/api/stripe/transactions/${transactionId}`;

  async function run(label: string, path: string, body?: Record<string, unknown>) {
    if (label === "Refund" && !window.confirm("Refund the remaining amount to the buyer? This cannot be undone from this screen.")) return;
    setPending(label);
    setMessage(null);
    try {
      await postAction(path, body);
      setMessage(`${label} submitted.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The payment action did not complete.");
    } finally {
      setPending(null);
    }
  }

  const canCapture = role === "seller" && status === "paid";
  const canRelease = role === "buyer" && status === "escrowed";
  const canRefund = role === "seller" && ["paid", "escrowed", "disputed"].includes(status);
  const canDispute = role === "buyer" && ["paid", "escrowed"].includes(status);

  if (!canCapture && !canRelease && !canRefund && !canDispute) return null;

  return (
    <div className="grid gap-2">
      {canCapture ? (
        <Button type="button" size="sm" disabled={pending !== null} onClick={() => run("Capture", `${base}/capture`)}>
          {pending === "Capture" ? "Capturing…" : "Capture payment"}
        </Button>
      ) : null}
      {canRelease ? (
        <Button type="button" size="sm" disabled={pending !== null} onClick={() => run("Release", `${base}/release`)}>
          {pending === "Release" ? "Releasing…" : "Confirm receipt and release"}
        </Button>
      ) : null}
      {canRefund ? (
        <Button type="button" size="sm" variant="outline" disabled={pending !== null} onClick={() => run("Refund", `${base}/refund`, { reason: "requested_by_customer" })}>
          {pending === "Refund" ? "Refunding…" : "Refund buyer"}
        </Button>
      ) : null}
      {canDispute ? (
        <form
          className="grid gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const reason = String(new FormData(event.currentTarget).get("reason") ?? "");
            void run("Dispute", `${base}/dispute`, { reason });
          }}
        >
          <label className="grid gap-1 text-xs font-medium" htmlFor={`dispute-${transactionId}`}>
            Dispute reason
            <textarea id={`dispute-${transactionId}`} name="reason" required minLength={10} rows={2} className="rounded-xl border border-border bg-background px-3 py-2 text-sm" placeholder="Describe what went wrong with this order." />
          </label>
          <Button type="submit" size="sm" variant="outline" disabled={pending !== null}>
            {pending === "Dispute" ? "Opening dispute…" : "Open dispute"}
          </Button>
        </form>
      ) : null}
      {message ? <p className="text-xs text-muted-foreground" role="status">{message}</p> : null}
    </div>
  );
}
