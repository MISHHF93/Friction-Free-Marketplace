"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createTrustSafetyReport, submitVerificationCheck } from "@/lib/trust-safety/service";

async function requireUser() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Authentication required.");
  return { supabase, user };
}

export async function submitVerificationAction(formData: FormData) {
  const payload = z.object({
    checkType: z.enum(["identity", "email", "phone", "id_document", "payment", "payout", "category_proof"]),
    note: z.string().max(1000).optional(),
  }).parse({
    checkType: formData.get("checkType"),
    note: String(formData.get("note") ?? ""),
  });
  const { supabase, user } = await requireUser();
  await submitVerificationCheck(supabase as any, user.id, {
    checkType: payload.checkType,
    note: payload.note,
  });
  revalidatePath("/dashboard/verification");
  revalidatePath("/dashboard/trust-score");
  revalidatePath("/dashboard/trust-safety");
}

export async function createTrustSafetyReportAction(formData: FormData) {
  const payload = z.object({
    reason: z.string().trim().min(3).max(120),
    description: z.string().trim().max(4000).optional(),
    reportedUserId: z.string().uuid().optional().or(z.literal("")),
    listingId: z.string().uuid().optional().or(z.literal("")),
    messageId: z.string().uuid().optional().or(z.literal("")),
  }).parse({
    reason: formData.get("reason"),
    description: String(formData.get("description") ?? ""),
    reportedUserId: String(formData.get("reportedUserId") ?? ""),
    listingId: String(formData.get("listingId") ?? ""),
    messageId: String(formData.get("messageId") ?? ""),
  });

  const { supabase, user } = await requireUser();
  await createTrustSafetyReport(supabase as any, user.id, {
    reason: payload.reason,
    description: payload.description,
    reportedUserId: payload.reportedUserId || undefined,
    listingId: payload.listingId || undefined,
    messageId: payload.messageId || undefined,
  });
  revalidatePath("/dashboard/trust-safety");
}
