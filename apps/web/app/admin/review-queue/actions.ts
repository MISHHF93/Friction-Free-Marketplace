"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminPagePermission } from "@/lib/admin/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateAdminReviewItem } from "@/lib/trust-safety/service";

export async function updateReviewQueueItemAction(formData: FormData) {
  const auth = await requireAdminPagePermission("fraud.review", { loginNext: "/admin/review-queue", deniedPath: "/admin" });
  const payload = z.object({
    id: z.string().uuid(),
    status: z.enum(["queued", "assigned", "investigating", "waiting_on_user", "actioned", "dismissed", "closed"]),
    decision: z.string().max(200).optional(),
    decisionReason: z.string().max(2000).optional(),
  }).parse({
    id: formData.get("id"),
    status: formData.get("status"),
    decision: String(formData.get("decision") ?? ""),
    decisionReason: String(formData.get("decisionReason") ?? ""),
  });

  await updateAdminReviewItem(createAdminClient() as any, {
    id: payload.id,
    adminId: auth.adminUser.id,
    status: payload.status,
    decision: payload.decision || null,
    decisionReason: payload.decisionReason || null,
  });
  revalidatePath("/admin/review-queue");
}
