import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin/permissions";
import { getLedgerReport } from "@/lib/financial/reports";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdminPermission("analytics.revenue");
  if ("error" in auth) return auth.error;

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "50");
  const report = await getLedgerReport(createAdminClient() as any, Number.isFinite(limit) ? limit : 50);

  return NextResponse.json({ ok: true, data: report });
}
