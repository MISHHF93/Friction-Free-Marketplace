"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/i18n/format";

type EscrowActionsProps = {
  transactionId: string;
  role: "buyer" | "seller";
  status: string;
  amount?: number;
  currency?: string;
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

export function EscrowActions({ transactionId, role, status, amount, currency = "USD" }: EscrowActionsProps) {
  const router = useRouter();
  const refundDialog = useRef<HTMLDialogElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const base = `/api/stripe/transactions/${transactionId}`;
  const refundLabel = typeof amount === "number" ? formatMoney(amount, currency) : "the remaining amount";

  async function run(label: string, path: string, body?: Record<string, unknown>) {
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
        <>
          <Button type="button" size="sm" variant="outline" disabled={pending !== null} onClick={() => refundDialog.current?.showModal()}>
            {pending === "Refund" ? "Refunding…" : "Refund buyer"}
          </Button>
          <dialog ref={refundDialog} className="w-[min(100%,28rem)] rounded-2xl border border-border bg-background p-5 text-foreground">
            <h2 className="text-lg font-bold">Refund {refundLabel}?</h2>
            <p className="mt-2 text-sm">This returns {refundLabel} to the buyer. It cannot be undone from this screen.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" size="sm" disabled={pending !== null} onClick={() => { refundDialog.current?.close(); void run("Refund", `${base}/refund`, { reason: "requested_by_customer" }); }}>Confirm refund</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => refundDialog.current?.close()}>Cancel</Button>
            </div>
          </dialog>
        </>
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
