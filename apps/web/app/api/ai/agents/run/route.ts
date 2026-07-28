import { NextResponse } from "next/server";
import { agentRunInputSchema } from "@/lib/ai/agent-definitions";
import { createAgentTask, completeAgentTask, recordAgentAuditEvent } from "@/lib/ai/audit";
import { runMarketplaceAgent } from "@/lib/ai/runner";
import { sanitizeAgentInput } from "@/lib/ai/request-context";
import { executeMarketplaceReadTool } from "@/lib/ai/read-tools";
import { consumeRateLimit, rateLimitHeaders, RateLimitUnavailableError } from "@/lib/security/rate-limit";
import { isTrustedMutationOrigin } from "@/lib/security/request-origin";
import { createClient } from "@/lib/supabase/server";
import { captureReliabilityEvent, getRequestId } from "@/lib/observability/reliability";

export const dynamic = "force-dynamic";

async function getActorId() {
  const supabase = createClient();
  const result = await supabase.auth.getUser();
  return result.data.user?.id ?? null;
}

function summarizeInput(message: string) {
  return { messagePreview: message.slice(0, 160), messageLength: message.length };
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const requestId = getRequestId(request);
  if (!isTrustedMutationOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const payload = agentRunInputSchema.safeParse(await request.json().catch(() => null));

  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const actorId = await getActorId();
  if (!actorId) {
    return NextResponse.json({ error: "Sign in to run marketplace AI agents." }, { status: 401 });
  }
  let rateLimit;
  try {
    rateLimit = await consumeRateLimit(`ai-agent:${actorId}`, { policy: "ai-agent", limit: 10, windowMs: 60_000 });
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return NextResponse.json({ error: "The assistant is temporarily unavailable." }, { status: 503 });
    }
    throw error;
  }
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "You are sending requests too quickly. Try again shortly." },
      { status: 429, headers: rateLimitHeaders(rateLimit) },
    );
  }

  const safeInput = sanitizeAgentInput(payload.data);
  const inputSummary = { ...summarizeInput(safeInput.message), context: safeInput.context ?? {} };
  const taskId = await createAgentTask({ agent: safeInput.agent, actorId, input: inputSummary });

  await recordAgentAuditEvent({
    agent: safeInput.agent,
    actorId,
    taskId,
    action: "ai.agent.run.started",
    status: "running",
    inputSummary
  });

  try {
    const result = await runMarketplaceAgent(safeInput, executeMarketplaceReadTool);
    const latencyMs = Date.now() - startedAt;
    await captureReliabilityEvent({
      event: result.fallback ? "ai.fallback" : "ai.completed",
      route: "/api/ai/agents/run",
      status: result.fallback ? "degraded" : "ok",
      durationMs: latencyMs,
      provider: result.model,
      requestId,
    });
    const outputSummary = {
      answerPreview: result.answer.slice(0, 240),
      recommendedActionCount: result.recommendedActions.length,
      toolPlan: result.toolPlan.map((tool) => tool.tool),
      executedTools: result.executedTools.map((tool) => ({ tool: tool.tool, ok: tool.ok })),
      fallback: result.fallback,
      model: result.model
      ,
      contractVersion: result.contractVersion,
      promptVersion: result.promptVersion,
    };

    await completeAgentTask({ taskId, output: outputSummary });
    await recordAgentAuditEvent({
      agent: safeInput.agent,
      actorId,
      taskId,
      action: "ai.agent.run.completed",
      status: "succeeded",
      latencyMs,
      inputSummary,
      outputSummary,
      safetyFlags: result.safetyFlags,
      toolCalls: result.executedTools.map((tool) => ({
        tool: tool.tool,
        arguments: tool.arguments,
        ok: tool.ok
      })),
      tokenUsage: result.tokenUsage
    });

    return NextResponse.json(
      { ok: true, taskId, result, latencyMs },
      { headers: rateLimitHeaders(rateLimit) },
    );
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    await captureReliabilityEvent({
      event: "ai.failed",
      route: "/api/ai/agents/run",
      status: "error",
      durationMs: latencyMs,
      provider: "openai",
      errorCode: "AI_RUN_FAILED",
      requestId,
    });
    const errorMessage = error instanceof Error ? error.message : "Agent run failed.";
    await completeAgentTask({ taskId, errorMessage });
    await recordAgentAuditEvent({
      agent: safeInput.agent,
      actorId,
      taskId,
      action: "ai.agent.run.failed",
      status: "failed",
      latencyMs,
      inputSummary,
      errorMessage
    });
    return NextResponse.json(
      { error: "The marketplace assistant could not complete this request.", taskId },
      { status: 500, headers: rateLimitHeaders(rateLimit) },
    );
  }
}
