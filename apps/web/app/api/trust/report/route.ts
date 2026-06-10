import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createTrustSafetyReport } from "@/lib/trust-safety/service";

export const dynamic = "force-dynamic";

const reportSchema = z.object({
  reason: z.string().trim().min(3).max(120),
  description: z.string().trim().max(4000).optional(),
  reportedUserId: z.string().uuid().optional(),
  listingId: z.string().uuid().optional(),
  messageId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const payload = reportSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });

  try {
    const report = await createTrustSafetyReport(supabase as any, user.id, payload.data);
    return NextResponse.json({ ok: true, report }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Report could not be created." }, { status: 400 });
  }
}
