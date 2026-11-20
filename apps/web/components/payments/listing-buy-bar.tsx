"use client";

import { useCallback, useSyncExternalStore, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/i18n/format";

export const OPEN_CHECKOUT_EVENT = "ffm:open-checkout";

let checkoutForcedOpen = false;
const checkoutListeners = new Set<() => void>();

function emitCheckoutChange() {
  checkoutListeners.forEach((listener) => listener());
}

function checkoutUrlWantsOpen() {
  if (typeof window === "undefined") return false;
  const url = new URL(window.location.href);
  return url.hash === "#protected-checkout" || url.searchParams.has("offer");
}

function subscribeToCheckoutOpen(listener: () => void) {
  checkoutListeners.add(listener);
  window.addEventListener(OPEN_CHECKOUT_EVENT, listener);
  window.addEventListener("hashchange", listener);
  window.addEventListener("popstate", listener);
  return () => {
    checkoutListeners.delete(listener);
    window.removeEventListener(OPEN_CHECKOUT_EVENT, listener);
    window.removeEventListener("hashchange", listener);
    window.removeEventListener("popstate", listener);
  };
}

function getCheckoutOpenSnapshot() {
  return checkoutForcedOpen || checkoutUrlWantsOpen();
}

export function openCheckoutSheet() {
  checkoutForcedOpen = true;
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OPEN_CHECKOUT_EVENT));
  emitCheckoutChange();
}

export function closeCheckoutSheet() {
  checkoutForcedOpen = false;
  if (typeof window !== "undefined") {
    const url = new URL(window.location.href);
    if (url.hash === "#protected-checkout") {
      url.hash = "";
      window.history.replaceState(null, "", `${url.pathname}${url.search}`);
    }
  }
  emitCheckoutChange();
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
  offerAction,
  ownerEditHref,
  isOwner = false,
  children
}: {
  amount: number;
  currency: string;
  label: string;
  /** The Offer button, rendered beside Buy. */
  offerAction?: ReactNode;
  ownerEditHref?: string;
  isOwner?: boolean;
  children: ReactNode;
}) {
  const open = useSyncExternalStore(subscribeToCheckoutOpen, getCheckoutOpenSnapshot, () => false);
  const close = useCallback(() => closeCheckoutSheet(), []);

  return (
    <>
      <div className="fixed inset-x-0 z-30 mx-auto flex w-full max-w-[480px] items-center justify-between gap-3 border-t border-border bg-background px-4 py-2" style={{ bottom: "calc(4.25rem + env(safe-area-inset-bottom))" }}>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{isOwner ? "Your listing" : label}</p>
          <p className="text-lg font-black">{formatMoney(amount, currency)}</p>
          {isOwner ? null : <a href="#message-seller" className="text-xs font-semibold text-primary underline underline-offset-2">Message seller</a>}
        </div>
        {isOwner ? (
          <div className="flex items-center gap-2">
            <p className="hidden text-sm text-muted-foreground min-[360px]:block">This is your listing</p>
            {ownerEditHref ? <Button asChild variant="outline" className="min-h-11"><a href={ownerEditHref}>Edit listing</a></Button> : null}
          </div>
        ) : (
          <div className="flex gap-2">
            {label === "Accepted offer" ? null : offerAction}
            <Button type="button" className="min-h-11" onClick={() => openCheckoutSheet()}>{label === "Accepted offer" ? "Pay offer" : "Buy"}</Button>
          </div>
        )}
      </div>
      {open && !isOwner ? (
        <div className="fixed inset-0 z-40 bg-black/40">
          <div id="protected-checkout" role="dialog" aria-modal="true" aria-label="Protected checkout" className="absolute inset-x-0 bottom-0 mx-auto max-h-[85vh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl bg-background p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <Button type="button" variant="outline" className="mb-3 min-h-11" onClick={close}>Close checkout</Button>
            {children}
          </div>
        </div>
      ) : null}
    </>
  );
}
