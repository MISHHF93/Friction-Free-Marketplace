"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminPagePermission } from "@/lib/admin/permissions";
import { runPlatformAdminAction } from "@/lib/admin/platform-administration";

const platformAdminActionSchema = z.object({
  area: z.enum(["users", "listings", "transactions", "finance", "fraud", "ai", "reports"]),
  action: z.string().trim().min(3).max(120),
  targetType: z.string().trim().max(80).optional(),
  targetId: z.string().uuid().optional().or(z.literal("")),
  reason: z.string().trim().min(5).max(2000),
});

export async function recordPlatformAdminAction(formData: FormData) {
  const auth = await requireAdminPagePermission("admin.access", { loginNext: "/admin", deniedPath: "/admin" });
  const payload = platformAdminActionSchema.parse({
    area: formData.get("area"),
    action: formData.get("action"),
    targetType: String(formData.get("targetType") ?? ""),
    targetId: String(formData.get("targetId") ?? ""),
    reason: formData.get("reason"),
  });

  await runPlatformAdminAction({
    adminId: auth.adminUser.id,
    role: auth.role,
    area: payload.area,
    action: payload.action,
    targetType: payload.targetType || payload.area,
    targetId: payload.targetId || null,
    reason: payload.reason,
    metadata: { source: "admin_platform_console" },
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/${payload.area}`);
}
