export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env.server";
import { dispatchQueuedEmailNotifications } from "@/lib/notifications/service";
import { hasValidBearerSecret } from "@/lib/security/secrets";

const dispatchSchema = z.object({
  limit: z.number().int().min(1).max(100).default(25)
});

function isAuthorized(request: Request) {
  if (!env.SCHEDULED_JOB_SECRET) return process.env.NODE_ENV !== "production";
  return hasValidBearerSecret(request, env.SCHEDULED_JOB_SECRET);
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production" && !env.SCHEDULED_JOB_SECRET) {
    return NextResponse.json({ error: "Scheduled job secret is not configured." }, { status: 503 });
  }
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized notification dispatcher." }, { status: 401 });

  const parsed = dispatchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const result = await dispatchQueuedEmailNotifications(parsed.data.limit);
  return NextResponse.json({ ok: true, ...result });
}
