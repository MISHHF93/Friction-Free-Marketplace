import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { calculateCompositeRisk } from "@/lib/trust-safety/engine";
import { getUserTrustSafetySummary } from "@/lib/trust-safety/service";

export const dynamic = "force-dynamic";

const riskScoreSchema = z.object({
  userId: z.string().uuid().optional(),
  highValueExposure: z.coerce.number().min(0).optional(),
});

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const payload = riskScoreSchema.safeParse(await request.json().catch(() => ({})));
  if (!payload.success) return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });

  const targetUserId = payload.data.userId ?? user.id;
  if (targetUserId !== user.id) return NextResponse.json({ error: "Risk score access is limited to the signed-in user." }, { status: 403 });

  const summary = await getUserTrustSafetySummary(supabase as any, targetUserId);
  const risk = calculateCompositeRisk({
    trustScore: summary.trustScore.score,
    sellerScore: summary.trustScore.sellerScore,
    buyerScore: summary.trustScore.buyerScore,
    verificationChecks: summary.verification.map((check) => ({
      checkType: check.checkType,
      status: check.status,
      confidenceScore: check.confidenceScore,
      expiresAt: check.expiresAt,
    })),
    ...summary.counts,
    highValueExposure: payload.data.highValueExposure,
  });

  return NextResponse.json({ ok: true, risk });
}
