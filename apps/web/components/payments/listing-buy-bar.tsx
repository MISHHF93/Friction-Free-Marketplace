"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/i18n/format";

export const OPEN_CHECKOUT_EVENT = "ffm:open-checkout";

export function openCheckoutSheet() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OPEN_CHECKOUT_EVENT));
}

function shouldOpenCheckout() {
  if (typeof window === "undefined") return false;
  const url = new URL(window.location.href);
  return url.hash === "#protected-checkout" || url.searchParams.has("offer");
}

export function OpenCheckoutButton({
  children,
  className,
  variant = "trust",
  size = "lg"
}: {
  children: ReactNode;
  className?: string;
  variant?: "trust" | "premium" | "outline";
  size?: "lg" | "sm" | "default";
}) {
  return (
    <Button type="button" size={size} variant={variant} className={className} onClick={() => openCheckoutSheet()}>
      {children}
    </Button>
  );
}

export function ListingBuyBar({
  amount,
  currency,
  label,
  children
}: {
  amount: number;
  currency: string;
  label: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const openIfNeeded = () => setOpen(true);
    if (shouldOpenCheckout()) setOpen(true);
    window.addEventListener(OPEN_CHECKOUT_EVENT, openIfNeeded);
    window.addEventListener("hashchange", () => {
      if (shouldOpenCheckout()) setOpen(true);
    });
    return () => {
      window.removeEventListener(OPEN_CHECKOUT_EVENT, openIfNeeded);
    };
  }, []);

  return (
    <>
      <div className="fixed inset-x-0 z-30 mx-auto flex w-full max-w-[480px] items-center justify-between gap-3 border-t border-border bg-background px-4 py-2" style={{ bottom: "calc(4.25rem + env(safe-area-inset-bottom))" }}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-lg font-black">{formatMoney(amount, currency)}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild type="button" variant="outline" className="min-h-11"><a href="#message-seller">Message</a></Button>
          <Button type="button" className="min-h-11" onClick={() => setOpen(true)}>{label === "Accepted offer" ? "Pay offer" : "Buy"}</Button>
        </div>
      </div>
      {open ? (
        <div className="fixed inset-0 z-40 bg-black/40">
          <div id="protected-checkout" role="dialog" aria-modal="true" aria-label="Protected checkout" className="absolute inset-x-0 bottom-0 mx-auto max-h-[85vh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl bg-background p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <Button type="button" variant="outline" className="mb-3 min-h-11" onClick={() => setOpen(false)}>Close checkout</Button>
            {children}
          </div>
        </div>
      ) : null}
    </>
  );
}
