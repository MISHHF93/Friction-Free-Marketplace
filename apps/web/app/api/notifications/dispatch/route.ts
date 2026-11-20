export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env.server";
import { dispatchQueuedEmailNotifications } from "@/lib/notifications/service";
import { authorizeJobRequest } from "@/lib/security/secrets";

const dispatchSchema = z.object({
  limit: z.number().int().min(1).max(100).default(25)
});

async function dispatch(request: Request, body: unknown) {
  const authorization = authorizeJobRequest(request, env.SCHEDULED_JOB_SECRET, "Unauthorized notification dispatcher.");
  if (!authorization.ok) return NextResponse.json({ error: authorization.error }, { status: authorization.status });

  const parsed = dispatchSchema.safeParse(body ?? {});
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const result = await dispatchQueuedEmailNotifications(parsed.data.limit);
  return NextResponse.json({ ok: true, ...result });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  return dispatch(request, body);
}

export function GET(request: Request) {
  return dispatch(request, {});
}
