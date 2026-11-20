import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin/permissions";
import { applyAdminMutation } from "@/lib/admin/mutations";
import { getAdminDirectoryRows, getAdminOverview } from "@/lib/admin/queries";
import { getAdminPageConfig } from "@/lib/admin/platform";

export const dynamic = "force-dynamic";

const endpoint: string = "users";
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
  const result = await applyAdminMutation({
    endpoint,
    adminId: auth.adminUser.id,
    body
  });
  if ("response" in result && result.response) return result.response;
  return NextResponse.json({ ok: true, action: result.action, record: result.record });
}
