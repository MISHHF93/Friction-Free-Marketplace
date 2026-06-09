import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserTrustSafetySummary } from "@/lib/trust-safety/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const summary = await getUserTrustSafetySummary(supabase as any, user.id);
  return NextResponse.json({ ok: true, summary });
}
