import { NextResponse } from "next/server";
import { z } from "zod";
import { recordAdminAction } from "@/lib/admin/queries";
import { createAdminClient } from "@/lib/supabase/admin";

const uuidSchema = z.string().uuid();

export const adminMutationActions = {
  users: ["suspend", "ban", "reinstate"],
  listings: ["approve", "reject", "hold"],
  reports: ["investigate", "resolve"],
  disputes: ["review", "close"],
  "fraud-alerts": ["confirm", "dismiss"]
} as const;

export type AdminMutationEndpoint = keyof typeof adminMutationActions;

export function adminMutationsFor(endpoint: string) {
  return endpoint in adminMutationActions ? adminMutationActions[endpoint as AdminMutationEndpoint] : [];
}

export async function applyAdminMutation(input: {
  endpoint: string;
  adminId: string;
  body: unknown;
}) {
  const actions = adminMutationsFor(input.endpoint);
  if (!actions.length) {
    return {
      response: NextResponse.json({
        error: "This admin queue does not change marketplace records.",
        supported: false
      }, { status: 422 })
    };
  }

  const parsed = z.object({
    action: z.string(),
    target_id: uuidSchema,
    reason: z.string().trim().min(3).max(2000).optional()
  }).safeParse(input.body);
  if (!parsed.success || !actions.includes(parsed.data.action as never)) {
    return {
      response: NextResponse.json({
        error: "Unsupported admin action.",
        supported: true,
        actions
      }, { status: 400 })
    };
  }

  const supabase = createAdminClient() as any;
  const { action, target_id: targetId, reason } = parsed.data;
  let update;

  switch (input.endpoint) {
    case "users":
      update = await supabase.from("users").update({
        status: action === "reinstate" ? "active" : action === "ban" ? "banned" : "suspended",
        banned_reason: action === "ban" ? reason ?? "Banned by an administrator." : null
      }).eq("id", targetId).select("id,status").maybeSingle();
      break;
    case "listings":
      update = await supabase.from("listings").update({
        status: action === "approve" ? "active" : action === "reject" ? "removed" : "paused"
      }).eq("id", targetId).select("id,status").maybeSingle();
      break;
    case "reports":
      update = await supabase.from("reports").update({
        status: action === "investigate" ? "investigating" : "closed",
        resolution: reason ?? null,
        resolved_at: action === "resolve" ? new Date().toISOString() : null,
        assigned_admin_id: input.adminId
      }).eq("id", targetId).select("id,status").maybeSingle();
      break;
    case "disputes":
      update = await supabase.from("disputes").update({
        status: action === "review" ? "under_review" : "closed",
        resolution: reason ?? null,
        assigned_admin_id: input.adminId,
        resolved_at: action === "close" ? new Date().toISOString() : null
      }).eq("id", targetId).select("id,status").maybeSingle();
      break;
    case "fraud-alerts":
      update = await supabase.from("fraud_signals").update({
        reviewed_by: input.adminId,
        reviewed_at: new Date().toISOString()
      }).eq("id", targetId).select("id,reviewed_at").maybeSingle();
      break;
    default:
      return { response: NextResponse.json({ error: "This admin queue does not change marketplace records.", supported: false }, { status: 422 }) };
  }

  if (update.error) return { response: NextResponse.json({ error: update.error.message }, { status: 500 }) };
  if (!update.data) return { response: NextResponse.json({ error: "Record not found." }, { status: 404 }) };

  const audit = await recordAdminAction({
    adminId: input.adminId,
    actionType: `${input.endpoint}.${action}`,
    targetType: input.endpoint,
    targetId,
    reason: reason ?? null,
    afterState: update.data,
    metadata: { endpoint: input.endpoint }
  });
  if (audit.error) return { response: NextResponse.json({ error: audit.error.message }, { status: 500 }) };

  return { action: audit.data, record: update.data };
}
