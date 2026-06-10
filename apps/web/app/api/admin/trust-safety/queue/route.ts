import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminPermission } from "@/lib/admin/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminTrustSafetyDashboard, updateAdminReviewItem } from "@/lib/trust-safety/service";

export const dynamic = "force-dynamic";

const actionSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["queued", "assigned", "investigating", "waiting_on_user", "actioned", "dismissed", "closed"]),
  decision: z.string().max(200).optional(),
  decisionReason: z.string().max(2000).optional(),
});

export async function GET(request: Request) {
  const auth = await requireAdminPermission("fraud.review");
  if ("error" in auth) return auth.error;

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "50");
  const data = await getAdminTrustSafetyDashboard(createAdminClient() as any, Number.isFinite(limit) ? limit : 50);
  return NextResponse.json({ ok: true, data });
}

export async function POST(request: Request) {
  const auth = await requireAdminPermission("fraud.review");
  if ("error" in auth) return auth.error;

  const payload = actionSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });

  const item = await updateAdminReviewItem(createAdminClient() as any, {
    id: payload.data.id,
    adminId: auth.adminUser.id,
    status: payload.data.status,
    decision: payload.data.decision,
    decisionReason: payload.data.decisionReason,
  });

  return NextResponse.json({ ok: true, item });
}
