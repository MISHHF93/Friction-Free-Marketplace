"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";
type ToastPayload = { title?: string; message: string; tone?: ToastTone };

const urlToastMessages: Record<string, ToastPayload> = {
  saved: { tone: "success", title: "Saved", message: "Your changes were saved successfully." },
  success: { tone: "success", title: "Done", message: "Your request was completed." },
  error: { tone: "error", title: "Action needed", message: "The request did not go through. Please try again." }
};

function ToastCenterInner() {
  const searchParams = useSearchParams();
  const [toast, setToast] = useState<ToastPayload | null>(null);

  useEffect(() => {
    const urlToast = searchParams.get("toast");
    if (urlToast && urlToastMessages[urlToast]) {
      Promise.resolve().then(() => setToast(urlToastMessages[urlToast]));
    }
  }, [searchParams]);

  useEffect(() => {
    function onToast(event: Event) {
      const customEvent = event as CustomEvent<ToastPayload>;
      if (customEvent.detail?.message) setToast(customEvent.detail);
    }

    window.addEventListener("ffm:toast", onToast);
    return () => window.removeEventListener("ffm:toast", onToast);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  if (!toast) return null;

  const tone = toast.tone ?? "info";
  const Icon = tone === "success" ? CheckCircle2 : tone === "error" ? AlertCircle : Info;

  return (
    <div className="fixed right-4 top-24 z-[80] w-[min(24rem,calc(100vw-2rem))]" aria-live="polite" aria-atomic="true">
      <div
        className={cn(
          "toast-enter rounded-2xl border bg-card p-4 shadow-soft backdrop-blur",
          tone === "success" && "border-trust-border",
          tone === "error" && "border-destructive/30",
          tone === "info" && "border-ai-border"
        )}
      >
        <div className="flex gap-3">
          <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", tone === "success" && "text-trust", tone === "error" && "text-destructive", tone === "info" && "text-ai")} aria-hidden="true" />
          <div className="min-w-0 flex-1">
            {toast.title ? <p className="font-black">{toast.title}</p> : null}
            <p className="text-sm leading-6 text-muted-foreground">{toast.message}</p>
          </div>
          <button type="button" className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground" onClick={() => setToast(null)} aria-label="Dismiss notification">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function ToastCenter() {
  return (
    <Suspense fallback={null}>
      <ToastCenterInner />
    </Suspense>
  );
}
