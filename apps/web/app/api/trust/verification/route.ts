import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { submitVerificationCheck } from "@/lib/trust-safety/service";

export const dynamic = "force-dynamic";

const verificationSchema = z.object({
  checkType: z.enum(["identity", "email", "phone", "id_document", "payment", "payout", "category_proof"]),
  note: z.string().trim().max(500).optional(),
});

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const payload = verificationSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });

  try {
    const check = await submitVerificationCheck(supabase as any, user.id, {
      checkType: payload.data.checkType,
      note: payload.data.note,
    });
    return NextResponse.json({ ok: true, check });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Verification could not be submitted." }, { status: 400 });
  }
}
