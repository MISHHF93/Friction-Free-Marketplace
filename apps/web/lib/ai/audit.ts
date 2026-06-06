import { createAdminClient } from "@/lib/supabase/admin";
import type { AgentId } from "@/lib/ai/agent-definitions";

type AgentAuditEvent = {
  agent: AgentId;
  action: string;
  actorId?: string | null;
  taskId?: string | null;
  latencyMs?: number;
  status: "queued" | "running" | "succeeded" | "failed";
  inputSummary?: Record<string, unknown>;
  outputSummary?: Record<string, unknown>;
  safetyFlags?: string[];
  tokenUsage?: Record<string, unknown> | null;
  errorMessage?: string | null;
};

function getAdminClientIfConfigured() {
  return createAdminClient();
}

export async function recordAgentAuditEvent(event: AgentAuditEvent) {
  const supabase = getAdminClientIfConfigured() as any;

  await Promise.allSettled([
    supabase.from("audit_logs").insert({
      actor_id: event.actorId ?? null,
      actor_type: "ai_agent",
      action: event.action,
      table_name: event.taskId ? "ai_tasks" : "ai_agent_audit_events",
      record_id: event.taskId ?? null,
      new_values: event.outputSummary ?? null,
      metadata: {
        agent: event.agent,
        status: event.status,
        latency_ms: event.latencyMs,
        input_summary: event.inputSummary,
        safety_flags: event.safetyFlags ?? [],
        token_usage: event.tokenUsage ?? null,
        error_message: event.errorMessage ?? null
      }
    }),
    supabase.from("ai_agent_audit_events").insert({
      actor_id: event.actorId ?? null,
      agent_type: event.agent,
      task_id: event.taskId ?? null,
      action: event.action,
      status: event.status,
      input_summary: event.inputSummary ?? {},
      output_summary: event.outputSummary ?? {},
      safety_flags: event.safetyFlags ?? [],
      token_usage: event.tokenUsage ?? {},
      latency_ms: event.latencyMs ?? null,
      error_message: event.errorMessage ?? null
    })
  ]);
}

export async function createAgentTask(event: {
  agent: AgentId;
  actorId?: string | null;
  input: Record<string, unknown>;
}) {
  const supabase = getAdminClientIfConfigured() as any;
  if (!supabase) return null;

  const agentResult = await supabase
    .from("ai_agents")
    .upsert(
      {
        owner_user_id: event.actorId ?? null,
        name: `${event.agent.replace(/_/g, " ")} agent`,
        agent_type: event.agent,
        status: "active",
        configuration: { source: "api" }
      },
      { onConflict: "owner_user_id,agent_type" }
    )
    .select("id")
    .maybeSingle();

  if (agentResult.error || !agentResult.data?.id) return null;

  const taskResult = await supabase
    .from("ai_tasks")
    .insert({
      agent_id: agentResult.data.id,
      requested_by: event.actorId ?? null,
      task_type: event.agent,
      status: "running",
      input: event.input,
      started_at: new Date().toISOString()
    })
    .select("id")
    .maybeSingle();

  return taskResult.data?.id ?? null;
}

export async function completeAgentTask(event: {
  taskId?: string | null;
  output?: Record<string, unknown> | null;
  errorMessage?: string | null;
}) {
  if (!event.taskId) return;
  const supabase = getAdminClientIfConfigured() as any;
  if (!supabase) return;

  await supabase
    .from("ai_tasks")
    .update({
      status: event.errorMessage ? "failed" : "succeeded",
      output: event.output ?? null,
      error_message: event.errorMessage ?? null,
      completed_at: new Date().toISOString()
    })
    .eq("id", event.taskId);
}
