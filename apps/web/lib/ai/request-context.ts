import type { AgentRunInput } from "@/lib/ai/agent-definitions";

function safePathname(value: unknown) {
  if (typeof value !== "string") return undefined;
  const pathname = value.trim();
  return pathname.startsWith("/") && pathname.length <= 300 ? pathname : undefined;
}

export function sanitizeAgentInput(input: AgentRunInput): AgentRunInput {
  const context = input.context;
  if (!context) return { ...input, history: input.history?.slice(-8) };

  const pathname = safePathname(context.metadata?.pathname);

  return {
    ...input,
    context: {
      listingId: context.listingId,
      conversationId: context.conversationId,
      locale: context.locale,
      metadata: pathname ? { pathname } : undefined,
    },
    history: input.history?.slice(-8),
  };
}
