import { getOpenAI, isOpenAIConfigured } from "@/lib/openai/client";
import { marketplaceAgentsById, toOpenAITools, type AgentRunInput } from "@/lib/ai/agent-definitions";
import {
  AI_PROMPT_VERSION,
  AI_RESPONSE_CONTRACT_VERSION,
  parseModelResponse,
  type AssistantBlock,
} from "@/lib/ai/response-contract";

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
  blocks: AssistantBlock[];
  contractVersion: string;
  promptVersion: string;
};

export type AgentToolExecution = {
  tool: string;
  arguments: Record<string, unknown>;
  ok: boolean;
  result: unknown;
};

type ToolExecutor = (tool: string, args: Record<string, unknown>) => Promise<AgentToolExecution>;

const evidenceBlockTypes = new Set(["listing_collection", "listing_comparison", "price_estimate"]);

export function groundedBlocksFromTools(executions: AgentToolExecution[]): AssistantBlock[] {
  const blocks: AssistantBlock[] = [];

  for (const execution of executions) {
    if (!execution.ok) continue;

    if (execution.tool === "search_listings" || execution.tool === "recommend_listings") {
      const result = execution.result as { listings?: unknown[] };
      const block = {
        type: "listing_collection" as const,
        title: execution.tool === "recommend_listings" ? "Recommended marketplace matches" : "Live marketplace matches",
        listings: result.listings ?? [],
      };
      const parsed = parseModelResponse({
        answer: "Grounded marketplace results.",
        blocks: [block],
      });
      if (!parsed.safetyFlags.includes("invalid_model_response") && parsed.blocks?.[0]) blocks.push(parsed.blocks[0]);
    }

    if (execution.tool === "compare_listings") {
      const block = {
        type: "listing_comparison" as const,
        title: "Side-by-side marketplace comparison",
        listings: Array.isArray(execution.result) ? execution.result : [],
      };
      const parsed = parseModelResponse({ answer: "Grounded listing comparison.", blocks: [block] });
      if (!parsed.safetyFlags.includes("invalid_model_response") && parsed.blocks?.[0]) blocks.push(parsed.blocks[0]);
    }

    if (execution.tool === "get_listing_context") {
      const block = {
        type: "listing_collection" as const,
        title: "Listing being reviewed",
        listings: execution.result ? [execution.result] : [],
      };
      const parsed = parseModelResponse({ answer: "Grounded listing context.", blocks: [block] });
      if (!parsed.safetyFlags.includes("invalid_model_response") && parsed.blocks?.[0]) blocks.push(parsed.blocks[0]);
    }

    if (execution.tool === "estimate_price") {
      const result = execution.result as Record<string, unknown>;
      const priceBlock = {
        type: "price_estimate" as const,
        currency: result.currency,
        minimum: result.observedMin,
        maximum: result.observedMax,
        comparableCount: result.comparableCount,
        caveat: result.caveat,
      };
      const comparableBlock = {
        type: "listing_collection" as const,
        title: "Listings behind this estimate",
        listings: Array.isArray(result.comparables) ? result.comparables : [],
      };
      const parsed = parseModelResponse({
        answer: "Grounded marketplace price evidence.",
        blocks: [priceBlock, comparableBlock],
      });
      if (!parsed.safetyFlags.includes("invalid_model_response")) blocks.push(...(parsed.blocks ?? []));
    }
  }

  return blocks;
}

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
    executedTools: [],
    blocks: [{ type: "text", text: `${agent.name} is ready to help once live AI is configured.` }],
    contractVersion: AI_RESPONSE_CONTRACT_VERSION,
    promptVersion: AI_PROMPT_VERSION,
  };
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
    ...(input.history ?? []).map((item) => ({
      role: item.role,
      content: item.content,
    })),
    {
      role: "user" as const,
      content: JSON.stringify({
        message: input.message,
        context: input.context ?? {},
        availableTools: agent.tools.map((tool) => ({ name: tool.name, permission: tool.permission, databaseAccess: tool.databaseAccess })),
        responseContract: AI_RESPONSE_CONTRACT_VERSION,
        promptVersion: AI_PROMPT_VERSION,
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
  let decoded: unknown = {};
  try {
    decoded = JSON.parse(content);
  } catch {
    decoded = {};
  }
  const parsed = parseModelResponse(decoded);
  const explanatoryBlocks = (parsed.blocks ?? [])
    .filter((block) => !evidenceBlockTypes.has(block.type));
  const groundedBlocks = groundedBlocksFromTools(executedTools);
  const blocks = [
    ...(explanatoryBlocks.length ? explanatoryBlocks : [{ type: "text" as const, text: parsed.answer }]),
    ...groundedBlocks,
  ];

  return {
    answer: parsed.answer,
    recommendedActions: parsed.recommendedActions,
    toolPlan: parsed.toolPlan,
    safetyFlags: parsed.safetyFlags,
    memoryUpdates: parsed.memoryUpdates,
    auditSummary: parsed.auditSummary,
    model,
    fallback: false,
    executedTools,
    raw: parsed,
    tokenUsage: completion.usage ? { ...completion.usage } : null,
    blocks,
    contractVersion: AI_RESPONSE_CONTRACT_VERSION,
    promptVersion: AI_PROMPT_VERSION,
  };
}
