"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, CheckCircle2, ChevronDown, Loader2, LockKeyhole, MapPin, RotateCcw, Send, ShieldCheck, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { marketplaceAgents, type AgentId } from "@/lib/ai/agent-definitions";
import type { AssistantBlock } from "@/lib/ai/response-contract";

type AssistantResult = {
  answer: string;
  recommendedActions: string[];
  model: string;
  fallback: boolean;
  executedTools?: Array<{ tool: string; ok: boolean }>;
  blocks?: AssistantBlock[];
  contractVersion?: string;
};

type Turn = { role: "user" | "assistant"; content: string; result?: AssistantResult };

const starters = [
  "Find trustworthy listings near me",
  "Help me price an item",
  "Review a marketplace safety concern",
];

function agentForPath(pathname: string): AgentId {
  if (pathname.includes("/seller") || pathname.includes("/listings/create")) return "seller";
  if (pathname.includes("/messages") || pathname.includes("/offers")) return "negotiation";
  if (pathname.includes("/safety") || pathname.includes("/trust")) return "support";
  return "buyer";
}

export function GlobalAssistant() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [agent, setAgent] = useState<AgentId>(() => agentForPath(pathname));
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<AssistantResult | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const launcher = launcherRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    textareaRef.current?.focus();
    const closeOrTrap = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", closeOrTrap);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOrTrap);
      launcher?.focus();
    };
  }, [open]);

  async function submit(value = message) {
    const requestText = value.trim();
    if (requestText.length < 2 || loading) return;
    setMessage(requestText);
    setLoading(true);
    setResult(null);
    setError(null);
    setNeedsLogin(false);
    setLatency(null);

    try {
      const response = await fetch("/api/ai/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent,
          message: requestText,
          context: contextForPath(pathname, navigator.language),
          history: turns.slice(-8).map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = await response.json() as { error?: string; result?: AssistantResult; latencyMs?: number };
      if (!response.ok || !data.result) {
        setNeedsLogin(response.status === 401);
        throw new Error(data.error ?? "The assistant could not complete this request.");
      }
      const assistantResult = data.result;
      setResult(assistantResult);
      setTurns((current) => [
        ...current,
        { role: "user" as const, content: requestText },
        { role: "assistant" as const, content: assistantResult.answer, result: assistantResult },
      ].slice(-10));
      setMessage("");
      setLatency(data.latencyMs ?? null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The assistant is temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button ref={launcherRef} type="button" className="ai-launcher" onClick={() => setOpen(true)} aria-label="Open marketplace AI assistant" aria-expanded={open}>
        <span className="ai-launcher-glow" aria-hidden="true" />
        <Sparkles className="relative h-5 w-5" aria-hidden="true" />
        <span className="relative hidden sm:inline">Ask AI</span>
      </button>

      {open ? createPortal((
        <div className="ai-assistant-layer">
          <button className="ai-assistant-backdrop" onClick={() => setOpen(false)} aria-label="Close marketplace AI assistant" />
          <section ref={panelRef} className="ai-assistant-panel motion-mobile-panel" role="dialog" aria-modal="true" aria-labelledby="global-assistant-title" aria-describedby="global-assistant-description">
            <header className="border-b border-white/10 bg-premium-dark p-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-emerald-300 shadow-ai"><Bot className="h-5 w-5" /></span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Context-aware assistance</p>
                    <h2 id="global-assistant-title" className="mt-1 text-xl font-black text-white">Marketplace copilot</h2>
                  </div>
                </div>
                <button type="button" className="rounded-xl p-2 text-slate-300 transition hover:bg-white/10 hover:text-white" onClick={() => setOpen(false)} aria-label="Close assistant"><X className="h-5 w-5" /></button>
              </div>
              <label className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-300">
                Assistant
                <span className="relative flex-1">
                  <select value={agent} onChange={(event) => setAgent(event.target.value as AgentId)} className="h-10 w-full appearance-none rounded-xl border border-white/15 bg-white/10 px-3 pr-9 text-sm font-bold text-white outline-none focus:border-emerald-300">
                    {marketplaceAgents.map((item) => <option className="text-slate-950" key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                </span>
              </label>
            </header>

            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              <p id="global-assistant-description" className="sr-only">Ask marketplace questions and review evidence-backed suggestions. Actions that change data require confirmation.</p>
              {!turns.length && !result && !loading && !error ? (
                <div>
                  <p className="text-sm leading-6 text-muted-foreground">Ask for live listings, comparisons, pricing context, seller help, negotiation drafts, or safety guidance.</p>
                  <div className="mt-4 grid gap-2">
                    {starters.map((prompt) => <button key={prompt} type="button" className="rounded-2xl border border-border bg-card p-3 text-left text-sm font-bold transition hover:-translate-y-0.5 hover:border-ai/40 hover:bg-ai-soft" onClick={() => void submit(prompt)}>{prompt}</button>)}
                  </div>
                </div>
              ) : null}

              {loading ? <div className="flex items-center gap-3 rounded-2xl border border-ai-border bg-ai-soft p-4 text-sm font-semibold text-ai" aria-live="polite"><Loader2 className="h-5 w-5 animate-spin" /> Reading marketplace context securely…</div> : null}

              {turns.slice(0, -1).map((turn, index) => (
                <article key={`${turn.role}-${index}`} className={turn.role === "user" ? "ml-8 rounded-2xl bg-secondary p-4" : "rounded-2xl border border-border bg-card p-4"}>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{turn.role === "user" ? "You" : "Marketplace copilot"}</p>
                  <p className="whitespace-pre-wrap text-sm leading-7">{turn.content}</p>
                </article>
              ))}

              {error ? (
                <div role="alert" className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
                  <p className="text-sm font-semibold text-destructive">{error}</p>
                  {needsLogin ? <Button asChild size="sm" className="mt-3"><Link href={`/login?next=${encodeURIComponent(pathname)}`} onClick={() => setOpen(false)}><LockKeyhole className="h-4 w-4" /> Sign in to use AI</Link></Button> : null}
                </div>
              ) : null}

              {result ? (
                <article className="space-y-4 motion-result-enter" aria-live="polite">
                  <AssistantBlocks result={result} />
                  {result.executedTools?.length ? <div className="flex flex-wrap gap-2">{result.executedTools.map((tool, index) => <span key={`${tool.tool}-${index}`} className="inline-flex items-center gap-1 rounded-full border border-trust-border bg-trust-soft px-2.5 py-1 text-xs font-bold text-trust"><CheckCircle2 className="h-3.5 w-3.5" /> {tool.tool.replace(/_/g, " ")}</span>)}</div> : null}
                  {result.recommendedActions.length ? <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Suggested next steps</p><ul className="mt-2 space-y-2">{result.recommendedActions.slice(0, 4).map((action) => <li key={action} className="rounded-xl bg-secondary px-3 py-2 text-sm">{action}</li>)}</ul></div> : null}
                  <p className="text-xs text-muted-foreground">{result.model}{result.fallback ? " · local fallback" : ""}{latency !== null ? ` · ${latency} ms` : ""}</p>
                </article>
              ) : null}
              {turns.length ? <button type="button" className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground" onClick={() => { setTurns([]); setResult(null); setError(null); }}><RotateCcw className="h-3.5 w-3.5" /> New conversation</button> : null}
              <div className="sr-only" aria-live="polite" aria-atomic="true">{loading ? "The assistant is preparing a response." : result ? "Assistant response received." : error ?? ""}</div>
            </div>

            <footer className="border-t border-border bg-background/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
              <label htmlFor="global-assistant-message" className="sr-only">Ask the marketplace assistant</label>
              <div className="flex items-end gap-2">
                <Textarea ref={textareaRef} id="global-assistant-message" value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submit(); } }} placeholder="Ask about listings, pricing, trust, or next steps…" className="min-h-12 max-h-32 resize-none" maxLength={4000} />
                <Button size="icon" variant="ai" onClick={() => void submit()} disabled={message.trim().length < 2} isLoading={loading} aria-label="Send assistant request"><Send className="h-4 w-4" /></Button>
              </div>
              <p className="mt-2 text-[11px] leading-4 text-muted-foreground">AI can read public marketplace data. Binding actions always require confirmation.</p>
            </footer>
          </section>
        </div>
      ), document.body) : null}
    </>
  );
}

function contextForPath(pathname: string, locale: string) {
  const listingMatch = pathname.match(/^\/listings\/([0-9a-f-]{36})$/i);
  return {
    userRole: "guest" as const,
    locale,
    listingId: listingMatch?.[1],
    metadata: { pathname },
  };
}

function AssistantBlocks({ result }: { result: AssistantResult }) {
  const blocks = result.blocks?.length ? result.blocks : [{ type: "text" as const, text: result.answer }];

  return (
    <div className="space-y-3">
      {blocks.map((block, index) => {
        if (block.type === "text") {
          return <div key={index} className="rounded-3xl rounded-tl-lg border border-border bg-card p-4 shadow-card"><p className="whitespace-pre-wrap text-sm leading-7">{block.text}</p></div>;
        }
        if (block.type === "listing_collection" || block.type === "listing_comparison") {
          return (
            <div key={index} className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-center justify-between gap-3">
                <p className="font-bold">{block.title}</p>
                <span className="rounded-full bg-trust-soft px-2.5 py-1 text-[11px] font-bold text-trust">Live evidence</span>
              </div>
              <div className={block.type === "listing_comparison" ? "mt-3 grid gap-2 sm:grid-cols-2" : "mt-3 grid gap-2"}>
                {block.listings.map((listing) => (
                  <Link key={listing.id} href={`/listings/${listing.id}`} className="rounded-xl border border-border p-3 transition hover:border-primary/40 hover:bg-secondary">
                    <span className="flex items-start justify-between gap-3">
                      <span className="font-bold">{listing.title}</span>
                      <span className="shrink-0 font-black text-primary">{new Intl.NumberFormat(undefined, { style: "currency", currency: listing.currency }).format(listing.price)}</span>
                    </span>
                    <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {listing.condition ? <span>{listing.condition}</span> : null}
                      {listing.location ? <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{listing.location}</span> : null}
                      {listing.sellerTrustScore !== null && listing.sellerTrustScore !== undefined ? <span className="inline-flex items-center gap-1 text-trust"><ShieldCheck className="h-3 w-3" />Trust {Math.round(listing.sellerTrustScore)}</span> : null}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          );
        }
        if (block.type === "price_estimate") {
          return <div key={index} className="rounded-2xl border border-trust-border bg-trust-soft p-4"><p className="font-bold">Observed price range</p><p className="mt-1 text-xl font-black">{formatRange(block.minimum, block.maximum, block.currency)}</p><p className="mt-2 text-xs text-muted-foreground">{block.comparableCount} comparables · {block.caveat}</p></div>;
        }
        if (block.type === "safety_notice") {
          return <div key={index} className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4"><p className="font-bold">{block.title}</p><p className="mt-1 text-sm">{block.detail}</p></div>;
        }
        if (block.type === "navigation_action") {
          return <Button key={index} asChild size="sm" variant="outline"><Link href={block.href}>{block.label}</Link></Button>;
        }
        if (block.type === "human_escalation") {
          return <Button key={index} asChild size="sm" variant="destructive"><Link href={block.href}>{block.title}</Link></Button>;
        }
        return <div key={index} className="rounded-xl border border-border bg-secondary p-3 text-sm font-semibold">{block.label} · Confirmation required</div>;
      })}
    </div>
  );
}

function formatRange(minimum: number | null, maximum: number | null, currency: string) {
  const formatter = new Intl.NumberFormat(undefined, { style: "currency", currency });
  if (minimum === null && maximum === null) return "Not enough evidence";
  if (minimum === null) return `Up to ${formatter.format(maximum ?? 0)}`;
  if (maximum === null) return `From ${formatter.format(minimum)}`;
  return `${formatter.format(minimum)}–${formatter.format(maximum)}`;
}
