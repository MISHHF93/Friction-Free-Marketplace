import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type FormMessageTone = "error" | "success" | "info";

export function FormMessage({ tone = "info", children, className }: { tone?: FormMessageTone; children: ReactNode; className?: string }) {
  const Icon = tone === "error" ? AlertCircle : tone === "success" ? CheckCircle2 : Info;

  return (
    <p
      className={cn(
        "flex items-start gap-2 rounded-2xl border p-3 text-sm leading-6",
        tone === "error" && "border-destructive/30 bg-destructive/10 text-destructive",
        tone === "success" && "border-trust-border bg-trust-soft text-trust",
        tone === "info" && "border-ai-border bg-ai-soft text-ai",
        className
      )}
      role={tone === "error" ? "alert" : "status"}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
