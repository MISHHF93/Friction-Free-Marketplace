import { NextResponse } from "next/server";
import { marketplaceAgents } from "@/lib/ai/agent-definitions";

export async function GET() {
  return NextResponse.json({
    architecture: {
      runtime: "Next.js App Router API routes call the OpenAI API through a shared agent runner.",
      orchestration: "Each agent uses a scoped system prompt, proposed tool plan, safety checks, and audit event recording before and after model execution.",
      auditTrail: "Agent runs are written to ai_tasks, ai_agent_audit_events, and audit_logs when Supabase service credentials are configured.",
      confirmationBoundary: "Write, payment, moderation, account, offer, and publication operations are drafted only until a user or admin confirms."
    },
    agents: marketplaceAgents
  });
}
