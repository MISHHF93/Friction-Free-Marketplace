"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { createConversationAction, makeOfferAction } from "@/app/dashboard/messages/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function MakeOfferSheet({
  listingId,
  conversationId,
  currency = "CAD",
  parentOfferId,
  triggerLabel = "Make offer",
  signedOut = false,
  isOwner = false,
  disabled = false,
  className
}: {
  listingId: string;
  conversationId?: string;
  currency?: string;
  parentOfferId?: string;
  triggerLabel?: string;
  signedOut?: boolean;
  isOwner?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (isOwner) return null;

  if (signedOut) {
    return (
      <Button asChild size="lg" className={className}>
        <Link href={`/login?next=${encodeURIComponent(`/listings/${listingId}`)}`}>Make offer</Link>
      </Button>
    );
  }

  function close() {
    setOpen(false);
    setError(null);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const thread = conversationId
          ? { id: conversationId }
          : await createConversationAction({ listingId });
        await makeOfferAction({
          conversationId: thread.id,
          amount,
          message: note.trim() || undefined,
          parentOfferId,
          expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
        });
        close();
        setAmount("");
        setNote("");
        if (conversationId) {
          router.refresh();
        } else {
          router.push(`/dashboard/messages?conversation=${thread.id}`);
        }
      } catch (offerError) {
        setError(offerError instanceof Error ? offerError.message : "Unable to send this offer.");
      }
    });
  }

  return (
    <>
      <Button type="button" size="lg" className={className} disabled={disabled || isPending} onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="presentation">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close offer form" onClick={close} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 w-full max-w-md rounded-t-3xl border border-border bg-background p-5 shadow-lg sm:rounded-3xl"
          >
            <h2 id={titleId} className="text-lg font-black">Make an offer</h2>
            <p className="mt-1 text-sm text-muted-foreground">Enter an amount and an optional note. Offers expire in 48 hours.</p>
            <div className="mt-4 grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor={`${titleId}-amount`}>Amount ({currency})</Label>
                <Input
                  id={`${titleId}-amount`}
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  type="number"
                  min="1"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="Offer amount"
                  autoFocus
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`${titleId}-note`}>Note</Label>
                <Textarea
                  id={`${titleId}-note`}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Optional note for the seller"
                  className="min-h-24"
                />
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" onClick={close} disabled={isPending}>Cancel</Button>
                <Button type="button" disabled={!amount || isPending} onClick={submit}>
                  {isPending ? "Sending…" : triggerLabel}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
