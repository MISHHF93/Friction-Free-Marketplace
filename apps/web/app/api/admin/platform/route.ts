import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminPermission } from "@/lib/admin/permissions";
import { getPlatformAdministrationData, runPlatformAdminAction } from "@/lib/admin/platform-administration";

export const dynamic = "force-dynamic";

const platformActionSchema = z.object({
  area: z.enum(["users", "listings", "transactions", "finance", "fraud", "ai", "reports"]),
  action: z.string().trim().min(3).max(120),
  targetType: z.string().trim().max(80).optional(),
  targetId: z.string().uuid().optional(),
  reason: z.string().trim().min(5).max(2000),
  metadata: z.record(z.unknown()).default({}),
});

export async function GET() {
  const auth = await requireAdminPermission("admin.access");
  if ("error" in auth) return auth.error;

  const data = await getPlatformAdministrationData(auth.role);
  return NextResponse.json({ ok: true, data });
}

export async function POST(request: Request) {
  const auth = await requireAdminPermission("admin.access");
  if ("error" in auth) return auth.error;

  const payload = platformActionSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });

  try {
    const result = await runPlatformAdminAction({
      adminId: auth.adminUser.id,
      role: auth.role,
      area: payload.data.area,
      action: payload.data.action,
      targetType: payload.data.targetType,
      targetId: payload.data.targetId,
      reason: payload.data.reason,
      metadata: payload.data.metadata,
    });

    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
    return NextResponse.json({ ok: true, action: result.data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Admin action failed." }, { status: 400 });
  }
}
