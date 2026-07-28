import { beforeEach, describe, expect, it, vi } from "vitest";

const createCompletion = vi.fn();
const configured = vi.fn();

vi.mock("@/lib/openai/client", () => ({
  getOpenAI: () => ({
    chat: { completions: { create: createCompletion } }
  }),
  isOpenAIConfigured: configured
}));

import { fallbackRun, runMarketplaceAgent } from "@/lib/ai/runner";

describe("marketplace AI agent runner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    configured.mockReturnValue(true);
  });

  it("returns an interactive structured response and stays fast with a mocked model", async () => {
    createCompletion.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            answer: "Compare the condition and seller trust signals before purchasing.",
            recommendedActions: ["Review both listings"],
            toolPlan: [{ tool: "compare_listings", reason: "Compare value and trust." }],
            safetyFlags: [],
            memoryUpdates: [],
            auditSummary: "Read-only buyer comparison proposed."
          })
        }
      }],
      usage: { prompt_tokens: 100, completion_tokens: 40, total_tokens: 140 }
    });

    const startedAt = performance.now();
    const result = await runMarketplaceAgent({
      agent: "buyer",
      message: "Help me compare two marketplace listings."
    });
    const elapsedMs = performance.now() - startedAt;

    expect(result.answer).toContain("seller trust");
    expect(result.toolPlan).toEqual([
      { tool: "compare_listings", reason: "Compare value and trust.", arguments: undefined }
    ]);
    expect(result.fallback).toBe(false);
    expect(result.tokenUsage).toMatchObject({ total_tokens: 140 });
    expect(elapsedMs).toBeLessThan(250);
    expect(createCompletion).toHaveBeenCalledOnce();
  });

  it("uses the local interactive fallback without making a network request", async () => {
    configured.mockReturnValue(false);

    const result = await runMarketplaceAgent({
      agent: "support",
      message: "Help me understand what evidence I need."
    });

    expect(result.fallback).toBe(true);
    expect(result.model).toBe("fallback-local");
    expect(result.answer).toContain("Support agent is configured");
    expect(result.toolPlan.length).toBeGreaterThan(0);
    expect(createCompletion).not.toHaveBeenCalled();
  });

  it("executes a model-requested read tool and grounds the final answer", async () => {
    createCompletion
      .mockResolvedValueOnce({
        choices: [{
          message: {
            content: null,
            tool_calls: [{
              id: "call_search",
              type: "function",
              function: { name: "search_listings", arguments: JSON.stringify({ query: "camera", limit: 3 }) }
            }]
          }
        }]
      })
      .mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              answer: "I found three current camera listings.",
              recommendedActions: ["Compare seller trust"],
              toolPlan: [],
              safetyFlags: [],
              memoryUpdates: [],
              auditSummary: "Answer grounded in a read-only marketplace search."
            })
          }
        }],
        usage: { total_tokens: 180 }
      });
    const executeTool = vi.fn().mockResolvedValue({
      tool: "search_listings",
      arguments: { query: "camera", limit: 3 },
      ok: true,
      result: { total: 3, listings: [{ id: "camera-1" }] }
    });

    const result = await runMarketplaceAgent(
      { agent: "buyer", message: "Find current camera listings." },
      executeTool
    );

    expect(executeTool).toHaveBeenCalledWith("search_listings", { query: "camera", limit: 3 });
    expect(result.answer).toContain("three current camera listings");
    expect(result.executedTools).toHaveLength(1);
    expect(result.executedTools[0]).toMatchObject({ tool: "search_listings", ok: true });
    expect(createCompletion).toHaveBeenCalledTimes(2);
  });

  it("never claims that fallback tool proposals were executed", () => {
    const result = fallbackRun({
      agent: "seller",
      message: "Improve my listing."
    });

    expect(result.auditSummary).toContain("no OpenAI request was sent");
    expect(result.answer).toContain("proposed tool plan");
    expect(result.fallback).toBe(true);
  });
});
