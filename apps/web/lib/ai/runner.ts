import { getOpenAI, isOpenAIConfigured } from "@/lib/openai/client";
import { marketplaceAgentsById, toOpenAITools, type AgentRunInput } from "@/lib/ai/agent-definitions";

export type AgentRunResult = {
  answer: string;
  recommendedActions: string[];
  toolPlan: Array<{ tool: string; reason: string; arguments?: Record<string, unknown> }>;
  safetyFlags: string[];
  memoryUpdates: string[];
  auditSummary: string;
  model: string;
  fallback: boolean;
  executedTools: AgentToolExecution[];
  raw?: unknown;
  tokenUsage?: Record<string, unknown> | null;
};

export type AgentToolExecution = {
  tool: string;
  arguments: Record<string, unknown>;
  ok: boolean;
  result: unknown;
};

type ToolExecutor = (tool: string, args: Record<string, unknown>) => Promise<AgentToolExecution>;

export function fallbackRun(input: AgentRunInput): AgentRunResult {
  const agent = marketplaceAgentsById[input.agent];
  const toolPlan = agent.tools.slice(0, 3).map((tool) => ({
    tool: tool.name,
    reason: tool.description,
    arguments: input.context?.listingId ? { listingId: input.context.listingId } : undefined
  }));

  return {
    answer: `${agent.name} is configured. Add OPENAI_API_KEY to generate live model responses. Based on your request, I would first clarify missing marketplace facts, then use the proposed tool plan under the agent's permissions before recommending a confirmed next step.`,
    recommendedActions: ["Review the proposed tool plan", "Confirm any write or escalation action before execution", "Provide listing, conversation, or transaction IDs if relevant"],
    toolPlan,
    safetyFlags: [],
    memoryUpdates: [],
    auditSummary: `Fallback response for ${agent.id}; no OpenAI request was sent.`,
    model: "fallback-local",
    fallback: true,
    executedTools: []
  };
}

function normalizeArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean);
}

function normalizeToolPlan(value: unknown): AgentRunResult["toolPlan"] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (typeof item === "string") return { tool: item, reason: "Model-proposed tool." };
    if (item && typeof item === "object") {
      const record = item as Record<string, unknown>;
      return {
        tool: String(record.tool ?? record.name ?? "unknown_tool"),
        reason: String(record.reason ?? record.description ?? "Model-proposed tool."),
        arguments: record.arguments && typeof record.arguments === "object" ? (record.arguments as Record<string, unknown>) : undefined
      };
    }
    return { tool: "unknown_tool", reason: "Model-proposed tool." };
  });
}

function parseToolArguments(value: string) {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

export async function runMarketplaceAgent(input: AgentRunInput, executeTool?: ToolExecutor): Promise<AgentRunResult> {
  if (!isOpenAIConfigured()) return fallbackRun(input);

  const agent = marketplaceAgentsById[input.agent];
  const model = "gpt-4o-mini";
  const messages = [
    { role: "system" as const, content: agent.systemPrompt },
    {
      role: "user" as const,
      content: JSON.stringify({
        message: input.message,
        context: input.context ?? {},
        availableTools: agent.tools.map((tool) => ({ name: tool.name, permission: tool.permission, databaseAccess: tool.databaseAccess }))
      })
    }
  ];
  const openai = getOpenAI();
  let completion = await openai.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    tools: toOpenAITools(agent),
    tool_choice: "auto",
    messages
  });
  const executedTools: AgentToolExecution[] = [];
  const toolCalls = completion.choices[0]?.message.tool_calls?.slice(0, 3) ?? [];

  if (toolCalls.length) {
    const toolMessages = [];
    for (const call of toolCalls) {
      const args = parseToolArguments(call.function.arguments);
      const execution = executeTool
        ? await executeTool(call.function.name, args)
        : {
            tool: call.function.name,
            arguments: args,
            ok: false,
            result: { error: "Tool execution is unavailable." },
          };
      executedTools.push(execution);
      toolMessages.push({
        role: "tool" as const,
        tool_call_id: call.id,
        content: JSON.stringify(execution.result),
      });
    }

    completion = await openai.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      tools: toOpenAITools(agent),
      tool_choice: "none",
      messages: [...messages, completion.choices[0].message, ...toolMessages],
    });
  }

  const content = completion.choices[0]?.message.content ?? "{}";
  const parsed = JSON.parse(content) as Record<string, unknown>;

  return {
    answer: String(parsed.answer ?? "I could not generate a response."),
    recommendedActions: normalizeArray(parsed.recommendedActions),
    toolPlan: normalizeToolPlan(parsed.toolPlan),
    safetyFlags: normalizeArray(parsed.safetyFlags),
    memoryUpdates: normalizeArray(parsed.memoryUpdates),
    auditSummary: String(parsed.auditSummary ?? `OpenAI response generated by ${agent.id}.`),
    model,
    fallback: false,
    executedTools,
    raw: parsed,
    tokenUsage: completion.usage ? { ...completion.usage } : null
  };
}
