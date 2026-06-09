"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ModalProps = Omit<React.DialogHTMLAttributes<HTMLDialogElement>, "title" | "open" | "onClose"> & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeLabel?: string;
  size?: "sm" | "md" | "lg" | "xl";
};

const modalSizeClassName: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  closeLabel = "Close dialog",
  size = "md",
  className,
  ...props
}: ModalProps) {
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  const titleId = React.useId();
  const descriptionId = React.useId();

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={cn(
        "m-auto w-[calc(100vw-2rem)] rounded-panel border border-border bg-card p-0 text-foreground shadow-panel backdrop:bg-brand-ink/55 backdrop:backdrop-blur-sm",
        modalSizeClassName[size],
        className,
      )}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={() => onOpenChange(false)}
      onClose={() => onOpenChange(false)}
      onClick={(event) => {
        if (event.target === dialogRef.current) onOpenChange(false);
      }}
      {...props}
    >
      <div className="flex max-h-[min(44rem,calc(100vh-2rem))] flex-col overflow-hidden">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id={titleId} className="text-xl font-black tracking-tight">{title}</h2>
            {description ? <p id={descriptionId} className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p> : null}
          </div>
          <button type="button" className="brand-focus rounded-xl p-2 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label={closeLabel} onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">{children}</div>
        {footer ? <div className="border-t border-border px-5 py-4 sm:px-6">{footer}</div> : null}
      </div>
    </dialog>
  );
}

export type DrawerProps = Omit<ModalProps, "size"> & {
  side?: "left" | "right" | "bottom";
  size?: "sm" | "md" | "lg";
};

const drawerSideClassName: Record<NonNullable<DrawerProps["side"]>, string> = {
  left: "mr-auto h-dvh max-h-dvh rounded-none rounded-r-panel",
  right: "ml-auto h-dvh max-h-dvh rounded-none rounded-l-panel",
  bottom: "mb-0 mt-auto max-w-none rounded-none rounded-t-panel",
};

const drawerSizeClassName: Record<NonNullable<DrawerProps["size"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-xl",
};

export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  closeLabel = "Close drawer",
  side = "right",
  size = "md",
  className,
  ...props
}: DrawerProps) {
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  const titleId = React.useId();
  const descriptionId = React.useId();

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={cn(
        "w-full border border-border bg-card p-0 text-foreground shadow-panel backdrop:bg-brand-ink/55 backdrop:backdrop-blur-sm",
        drawerSideClassName[side],
        side === "bottom" ? "max-h-[85dvh]" : drawerSizeClassName[size],
        className,
      )}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={() => onOpenChange(false)}
      onClose={() => onOpenChange(false)}
      onClick={(event) => {
        if (event.target === dialogRef.current) onOpenChange(false);
      }}
      {...props}
    >
      <div className="flex h-full max-h-[inherit] flex-col overflow-hidden">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-xl font-black tracking-tight">{title}</h2>
            {description ? <p id={descriptionId} className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p> : null}
          </div>
          <button type="button" className="brand-focus rounded-xl p-2 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label={closeLabel} onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <div className="border-t border-border px-5 py-4">{footer}</div> : null}
      </div>
    </dialog>
  );
}

export type ToastTone = "success" | "error" | "info" | "warning";

export type ToastPayload = {
  id?: string;
  title?: string;
  message: string;
  tone?: ToastTone;
  durationMs?: number;
};

export type ToastProps = React.HTMLAttributes<HTMLDivElement> & ToastPayload & {
  onDismiss?: () => void;
};

const toastToneClassName: Record<ToastTone, string> = {
  success: "border-trust-border",
  error: "border-destructive/30",
  info: "border-ai-border",
  warning: "border-amber-200",
};

const toastIconClassName: Record<ToastTone, string> = {
  success: "text-trust",
  error: "text-destructive",
  info: "text-ai",
  warning: "text-amber-700",
};

export function Toast({ id: _id, title, message, tone = "info", durationMs: _durationMs, onDismiss, className, ...props }: ToastProps) {
  const Icon = tone === "success" ? CheckCircle2 : tone === "error" ? AlertCircle : Info;

  return (
    <div className={cn("toast-enter rounded-2xl border bg-card p-4 shadow-soft backdrop-blur", toastToneClassName[tone], className)} role={tone === "error" ? "alert" : "status"} {...props}>
      <div className="flex gap-3">
        <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", toastIconClassName[tone])} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          {title ? <p className="font-black">{title}</p> : null}
          <p className="text-sm leading-6 text-muted-foreground">{message}</p>
        </div>
        {onDismiss ? (
          <button type="button" className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground" onClick={onDismiss} aria-label="Dismiss notification">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function ToastViewport({ className }: { className?: string }) {
  const [toasts, setToasts] = React.useState<Array<Required<Pick<ToastPayload, "id">> & ToastPayload>>([]);

  React.useEffect(() => {
    function onToast(event: Event) {
      const customEvent = event as CustomEvent<ToastPayload>;
      if (!customEvent.detail?.message) return;

      const id = customEvent.detail.id ?? crypto.randomUUID();
      const toast = { ...customEvent.detail, id };
      setToasts((current) => [...current, toast]);

      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== id));
      }, customEvent.detail.durationMs ?? 4500);
    }

    window.addEventListener("ffm:toast", onToast);
    return () => window.removeEventListener("ffm:toast", onToast);
  }, []);

  if (!toasts.length) return null;

  return (
    <div className={cn("fixed right-4 top-24 z-[80] grid w-[min(24rem,calc(100vw-2rem))] gap-3", className)} aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onDismiss={() => setToasts((current) => current.filter((item) => item.id !== toast.id))} />
      ))}
    </div>
  );
}

export function dispatchToast(toast: ToastPayload) {
  window.dispatchEvent(new CustomEvent<ToastPayload>("ffm:toast", { detail: toast }));
}

export function ModalFooter({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props}>
      {children}
    </div>
  );
}

export function ModalCloseButton({ onClose, children = "Cancel" }: { onClose: () => void; children?: React.ReactNode }) {
  return (
    <Button type="button" variant="outline" onClick={onClose}>
      {children}
    </Button>
  );
}
