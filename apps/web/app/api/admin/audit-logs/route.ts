import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin/permissions";
import { getAdminDirectoryRows, getAdminOverview, recordAdminAction } from "@/lib/admin/queries";
import { getAdminPageConfig } from "@/lib/admin/platform";

export const dynamic = "force-dynamic";

const endpoint: string = "audit-logs";
const permission = endpoint === "overview" || endpoint === "moderation-workflows" ? "admin.access" : getAdminPageConfig(endpoint)?.permission ?? "admin.access";

export async function GET(request: Request) {
  const auth = await requireAdminPermission(permission as any);
  if ("error" in auth) return auth.error;

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "50");

  if (endpoint === "overview") {
    const data = await getAdminOverview();
    return NextResponse.json({ ok: true, data });
  }

  if (endpoint === "moderation-workflows") {
    return NextResponse.json({ ok: true, data: { workflows: [
      { key: "listing_moderation", stages: ["intake", "ai_screen", "human_review", "decision", "appeal"], sla_hours: 24 },
      { key: "report_review", stages: ["triage", "assign", "investigate", "resolve", "notify"], sla_hours: 12 },
      { key: "fraud_alert", stages: ["score", "contain", "graph_review", "disposition", "rule_feedback"], sla_hours: 4 },
      { key: "dispute_handling", stages: ["open", "evidence", "review", "settlement", "close"], sla_hours: 72 }
    ] } });
  }

  const result = await getAdminDirectoryRows(endpoint, Number.isFinite(limit) ? limit : 50);
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data: result.data ?? [] });
}

export async function POST(request: Request) {
  const actionPermission = endpoint === "users" ? "users.write" : endpoint === "trust-overrides" ? "trust.override" : endpoint === "listings" ? "listings.moderate" : endpoint === "moderation-workflows" ? "workflows.manage" : permission;
  const auth = await requireAdminPermission(actionPermission as any);
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => ({}));
  const result = await recordAdminAction({
    adminId: auth.adminUser.id,
    actionType: typeof body.action === "string" ? body.action : `${endpoint}.note`,
    targetType: String(body.target_type ?? endpoint),
    targetId: typeof body.target_id === "string" ? body.target_id : null,
    reason: typeof body.reason === "string" ? body.reason : null,
    beforeState: (body.before_state && typeof body.before_state === "object") ? body.before_state : null,
    afterState: (body.after_state && typeof body.after_state === "object") ? body.after_state : null,
    metadata: { endpoint, role: auth.role, payload: body.metadata ?? {} }
  });

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json({ ok: true, action: result.data });
}
