import { Bot, Database, ShieldCheck } from "lucide-react";
import { AssistantConsole } from "@/components/ai/assistant-console";
import { Badge } from "@/components/ui/badge";

export default function AssistantPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 max-w-3xl">
        <Badge className="mb-4 w-fit"><Bot className="h-3.5 w-3.5" /> Marketplace assistant</Badge>
        <h1 className="text-4xl font-black tracking-tight sm:text-5xl">AI help with clear limits.</h1>
        <p className="mt-4 text-lg leading-8 text-muted-foreground">
          Use assistant tools for search, listing drafts, pricing context, risk checks, negotiation support, and recommendations. High-impact actions still require confirmation.
        </p>
        <div className="mt-5 flex flex-wrap gap-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1"><ShieldCheck className="h-4 w-4 text-primary" /> confirmation required for risky actions</span>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1"><Database className="h-4 w-4 text-primary" /> activity is logged for review</span>
        </div>
      </div>
      <AssistantConsole />
    </section>
  );
}
