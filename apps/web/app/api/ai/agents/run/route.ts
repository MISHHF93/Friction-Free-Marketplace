import { NextResponse } from "next/server";
import { agentRunInputSchema } from "@/lib/ai/agent-definitions";
import { createAgentTask, completeAgentTask, recordAgentAuditEvent } from "@/lib/ai/audit";
import { runMarketplaceAgent } from "@/lib/ai/runner";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function getActorId() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  const supabase = createClient();
  const result = await supabase.auth.getUser();
  return result.data.user?.id ?? null;
}

function summarizeInput(message: string) {
  return { messagePreview: message.slice(0, 160), messageLength: message.length };
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const payload = agentRunInputSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const actorId = await getActorId();
  const inputSummary = { ...summarizeInput(payload.data.message), context: payload.data.context ?? {} };
  const taskId = await createAgentTask({ agent: payload.data.agent, actorId, input: inputSummary });

  await recordAgentAuditEvent({
    agent: payload.data.agent,
    actorId,
    taskId,
    action: "ai.agent.run.started",
    status: "running",
    inputSummary
  });

  try {
    const result = await runMarketplaceAgent(payload.data);
    const latencyMs = Date.now() - startedAt;
    const outputSummary = {
      answerPreview: result.answer.slice(0, 240),
      recommendedActionCount: result.recommendedActions.length,
      toolPlan: result.toolPlan.map((tool) => tool.tool),
      fallback: result.fallback,
      model: result.model
    };

    await completeAgentTask({ taskId, output: outputSummary });
    await recordAgentAuditEvent({
      agent: payload.data.agent,
      actorId,
      taskId,
      action: "ai.agent.run.completed",
      status: "succeeded",
      latencyMs,
      inputSummary,
      outputSummary,
      safetyFlags: result.safetyFlags,
      tokenUsage: result.tokenUsage
    });

    return NextResponse.json({ ok: true, taskId, result, latencyMs });
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    const errorMessage = error instanceof Error ? error.message : "Agent run failed.";
    await completeAgentTask({ taskId, errorMessage });
    await recordAgentAuditEvent({
      agent: payload.data.agent,
      actorId,
      taskId,
      action: "ai.agent.run.failed",
      status: "failed",
      latencyMs,
      inputSummary,
      errorMessage
    });
    return NextResponse.json({ error: errorMessage, taskId }, { status: 500 });
  }
}
