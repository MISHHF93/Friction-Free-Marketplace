import { Bot, Database, ShieldCheck } from "lucide-react";
import { AssistantConsole } from "@/components/ai/assistant-console";
import { Badge } from "@/components/ui/badge";

export default function AssistantPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 max-w-3xl">
        <Badge className="mb-4 w-fit"><Bot className="h-3.5 w-3.5" /> AI agent layer</Badge>
        <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Marketplace assistants with explicit trust boundaries.</h1>
        <p className="mt-4 text-lg leading-8 text-muted-foreground">
          Run buyer, seller, listing creation, pricing, fraud detection, negotiation, support, and recommendation agents through a shared OpenAI API layer.
        </p>
        <div className="mt-5 flex flex-wrap gap-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1"><ShieldCheck className="h-4 w-4 text-primary" /> confirmation required for risky actions</span>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1"><Database className="h-4 w-4 text-primary" /> ai_tasks + audit trail ready</span>
        </div>
      </div>
      <AssistantConsole />
    </section>
  );
}
