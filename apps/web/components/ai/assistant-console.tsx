"use client";

import { useMemo, useState } from "react";
import { Bot, CheckCircle2, Database, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { marketplaceAgents, type AgentId } from "@/lib/ai/agent-definitions";
import { cn } from "@/lib/utils";

type AssistantResult = {
  answer: string;
  recommendedActions: string[];
  toolPlan: Array<{ tool: string; reason: string }>;
  safetyFlags: string[];
  memoryUpdates: string[];
  auditSummary: string;
  model: string;
  fallback: boolean;
  executedTools?: Array<{ tool: string; ok: boolean }>;
};

type AssistantResponse = {
  result: AssistantResult;
  latencyMs?: number;
};

const examples: Record<AgentId, string> = {
  buyer: "Find me a trustworthy used standing desk under $300 and list questions I should ask the seller.",
  seller: "Help me improve my listing conversion for a used espresso machine and draft a buyer reply.",
  listing_creation: "Draft a listing for a lightly used commuter bike with new tires. I have photos and want local pickup.",
  pricing: "What price range should I use for a like-new Nintendo Switch OLED with two games?",
  fraud_detection: "Score risk for a seller asking for payment outside the platform and using stock photos.",
  negotiation: "Draft a friendly counteroffer from $420 to $470 while staying open to pickup this weekend.",
  support: "A buyer says the item was not as described. Help collect evidence and route the case.",
  recommendation: "Recommend safe local listings for home office upgrades under $500."
};

export function AssistantConsole() {
  const [selectedAgent, setSelectedAgent] = useState<AgentId>("buyer");
  const [message, setMessage] = useState(examples.buyer);
  const [result, setResult] = useState<AssistantResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const agent = useMemo(() => marketplaceAgents.find((item) => item.id === selectedAgent) ?? marketplaceAgents[0], [selectedAgent]);

  async function runAgent() {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setLatencyMs(null);

    try {
      const response = await fetch("/api/ai/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent: selectedAgent, message, context: { userRole: "guest", locale: "en-US" } })
      });
      const data = await response.json() as AssistantResponse & { error?: string };
      if (!response.ok) {
        setError(data.error ?? "The assistant could not run.");
        return;
      }
      setResult(data.result);
      setLatencyMs(data.latencyMs ?? null);
    } catch {
      setError("The assistant is temporarily unreachable. Check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border bg-muted/40">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <CardTitle>Agent architecture</CardTitle>
          </div>
          <CardDescription>Eight scoped OpenAI-powered agents with explicit tools, permissions, memory, safety, and database rules.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <div className="grid gap-2 sm:grid-cols-2">
            {marketplaceAgents.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSelectedAgent(item.id);
                  setMessage(examples[item.id]);
                  setResult(null);
                  setError(null);
                }}
                className={cn(
                  "rounded-xl border p-3 text-left transition hover:border-primary/60 hover:bg-primary/5",
                  item.id === selectedAgent ? "border-primary bg-primary/10" : "border-border bg-background"
                )}
              >
                <div className="font-semibold">{item.name}</div>
                <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.purpose}</div>
              </button>
            ))}
          </div>
          <div className="grid gap-3 rounded-2xl border border-border bg-background p-4 text-sm">
            <div className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4 text-primary" /> Safety boundary</div>
            <p className="text-muted-foreground">Write, payment, moderation, offer, and publication actions are returned as proposals until a user or admin confirms them.</p>
            <div className="flex items-center gap-2 font-semibold"><Database className="h-4 w-4 text-primary" /> Audit trail</div>
            <p className="text-muted-foreground">Runs are designed to log ai_tasks, agent audit events, token usage, safety flags, and immutable audit rows when Supabase is configured.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>{agent.name}</CardTitle>
              <CardDescription>{agent.purpose}</CardDescription>
            </div>
            <Badge>{agent.tools.length} tools</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-2">
            <label className="text-sm font-semibold" htmlFor="assistant-message">Request</label>
            <Textarea id="assistant-message" value={message} onChange={(event) => setMessage(event.target.value)} className="min-h-36" />
          </div>
          <Button
            onClick={runAgent}
            disabled={message.trim().length < 2}
            isLoading={isLoading}
            loadingText="Thinking securely..."
          >
            Run assistant <Sparkles className="h-4 w-4" aria-hidden="true" />
          </Button>

          <div className="grid gap-3 md:grid-cols-2">
            <InfoList title="Inputs" items={agent.inputs} />
            <InfoList title="Outputs" items={agent.outputs} />
            <InfoList title="Permissions" items={agent.permissions} />
            <InfoList title="Database rules" items={agent.databaseAccessRules} />
          </div>

          <div aria-live="polite" aria-atomic="true">
            {isLoading ? <p className="sr-only">The marketplace assistant is preparing a response.</p> : null}
            {error ? <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div> : null}
          </div>

          {result ? (
            <div className="space-y-4 rounded-2xl border border-border bg-muted/30 p-4 motion-result-enter" aria-live="polite">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary" /> Model: {result.model} {result.fallback ? "(local fallback)" : ""}
                {latencyMs !== null ? <span>Response: {latencyMs} ms</span> : null}
              </div>
              <div>
                <h3 className="font-semibold">Answer</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{result.answer}</p>
              </div>
              <InfoList title="Recommended actions" items={result.recommendedActions} />
              <InfoList title="Tool plan" items={result.toolPlan.map((tool) => `${tool.tool}: ${tool.reason}`)} />
              {result.executedTools?.length ? (
                <InfoList
                  title="Live marketplace data used"
                  items={result.executedTools.map((tool) => `${tool.tool}: ${tool.ok ? "completed" : "not executed"}`)}
                />
              ) : null}
              <InfoList title="Safety flags" items={result.safetyFlags.length ? result.safetyFlags : ["None returned"]} />
              <div className="rounded-xl bg-background p-3 text-xs text-muted-foreground">Audit: {result.auditSummary}</div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-2 space-y-1 text-xs leading-5 text-muted-foreground">
        {items.map((item) => <li key={item}>• {item}</li>)}
      </ul>
    </div>
  );
}
