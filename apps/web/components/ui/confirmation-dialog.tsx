import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ConfirmationDialog({
  trigger,
  title,
  description,
  confirmLabel = "Confirm",
  tone = "warning",
  children
}: {
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  tone?: "warning" | "danger";
  children?: ReactNode;
}) {
  return (
    <details className="group relative">
      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">{trigger}</summary>
      <div className="absolute right-0 z-40 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-3 shadow-soft motion-dropdown" role="alertdialog" aria-label={title}>
        <div className={cn("rounded-2xl border p-3", tone === "danger" ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-amber-200 bg-amber-50 text-amber-950")}>
          <div className="flex gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-black">{title}</p>
              <p className="mt-1 text-xs leading-5 opacity-85">{description}</p>
            </div>
          </div>
        </div>
        {children ? <div className="mt-3">{children}</div> : null}
        <Button type="button" size="sm" variant={tone === "danger" ? "destructive" : "premium"} className="mt-3 w-full">
          {confirmLabel}
        </Button>
      </div>
    </details>
  );
}
