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
  const releaseDialog = useRef<HTMLDialogElement>(null);
  const shipDialog = useRef<HTMLDialogElement>(null);
  const deliverDialog = useRef<HTMLDialogElement>(null);
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
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
  const canShip = role === "seller" && status === "escrowed";
  const canDeliver = role === "buyer" && status === "shipped";
  const canRelease = role === "buyer" && ["escrowed", "shipped", "delivered"].includes(status);
  const canRefund = role === "seller" && ["paid", "escrowed", "shipped", "delivered", "disputed"].includes(status);
  const canDispute = role === "buyer" && ["paid", "escrowed", "shipped", "delivered"].includes(status);

  if (!canCapture && !canShip && !canDeliver && !canRelease && !canRefund && !canDispute) return null;

  return (
    <div className="grid gap-2">
      {canCapture ? (
        <Button type="button" size="sm" disabled={pending !== null} onClick={() => run("Capture", `${base}/capture`)}>
          {pending === "Capture" ? "Capturing…" : "Capture payment"}
        </Button>
      ) : null}
      {canShip ? (
        <>
          <Button type="button" size="sm" disabled={pending !== null} onClick={() => shipDialog.current?.showModal()}>Mark shipped</Button>
          <dialog ref={shipDialog} className="w-[min(100%,28rem)] rounded-2xl border border-border bg-background p-5 text-foreground">
            <h2 className="text-lg font-bold">Mark this order shipped?</h2>
            <label className="mt-3 grid gap-1 text-sm font-semibold">Carrier
              <input className="min-h-11 rounded-xl border border-border px-3" value={carrier} onChange={(event) => setCarrier(event.target.value)} />
            </label>
            <label className="mt-3 grid gap-1 text-sm font-semibold">Tracking number
              <input className="min-h-11 rounded-xl border border-border px-3" value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} />
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" size="sm" disabled={pending !== null || carrier.trim().length < 2 || trackingNumber.trim().length < 4} onClick={() => { shipDialog.current?.close(); void run("Ship", `${base}/ship`, { carrier: carrier.trim(), trackingNumber: trackingNumber.trim() }); }}>Confirm shipment</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => shipDialog.current?.close()}>Cancel</Button>
            </div>
          </dialog>
        </>
      ) : null}
      {canDeliver ? (
        <>
          <Button type="button" size="sm" disabled={pending !== null} onClick={() => deliverDialog.current?.showModal()}>Confirm delivery</Button>
          <dialog ref={deliverDialog} className="w-[min(100%,28rem)] rounded-2xl border border-border bg-background p-5 text-foreground">
            <h2 className="text-lg font-bold">Confirm delivery?</h2>
            <p className="mt-2 text-sm">This tells the seller the order arrived. You can release the held funds separately.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" size="sm" disabled={pending !== null} onClick={() => { deliverDialog.current?.close(); void run("Delivery", `${base}/delivered`); }}>Confirm delivery</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => deliverDialog.current?.close()}>Cancel</Button>
            </div>
          </dialog>
        </>
      ) : null}
      {canRelease ? (
        <>
          <Button type="button" size="sm" disabled={pending !== null} onClick={() => releaseDialog.current?.showModal()}>
            {pending === "Release" ? "Releasing…" : "Confirm delivery / Release"}
          </Button>
          <dialog ref={releaseDialog} className="w-[min(100%,28rem)] rounded-2xl border border-border bg-background p-5 text-foreground">
            <h2 className="text-lg font-bold">Release {refundLabel} to the seller?</h2>
            <p className="mt-2 text-sm">This pays the seller from the held funds. It cannot be undone from this screen.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" size="sm" disabled={pending !== null} onClick={() => { releaseDialog.current?.close(); void run("Release", `${base}/release`); }}>Confirm release</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => releaseDialog.current?.close()}>Cancel</Button>
            </div>
          </dialog>
        </>
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
