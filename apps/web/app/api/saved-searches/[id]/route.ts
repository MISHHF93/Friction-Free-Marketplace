export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const patchSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  query: z.string().max(200).nullable().optional(),
  filters: z.record(z.unknown()).optional(),
  alertEnabled: z.boolean().optional(),
  alertFrequency: z.enum(["instant", "daily", "weekly", "never"]).optional()
});

async function requireUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, response: NextResponse.json({ error: "Sign in to manage saved searches." }, { status: 401 }) };
  return { supabase, user, response: null };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) return NextResponse.json({ error: "Invalid saved search id." }, { status: 400 });
  const { supabase, user, response } = await requireUser();
  if (response || !user) return response;

  const input = patchSchema.parse(await request.json());
  const update: Record<string, unknown> = {};
  if (input.name !== undefined) update.name = input.name;
  if (input.query !== undefined) update.query = input.query;
  if (input.filters !== undefined) update.filters = input.filters;
  if (input.alertEnabled !== undefined) update.alert_enabled = input.alertEnabled;
  if (input.alertFrequency !== undefined) update.alert_frequency = input.alertFrequency;

  const { data, error } = await (supabase as any)
    .from("saved_searches")
    .update(update)
    .eq("id", parsedId.data)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ savedSearch: data });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) return NextResponse.json({ error: "Invalid saved search id." }, { status: 400 });
  const { supabase, user, response } = await requireUser();
  if (response || !user) return response;

  const { error } = await (supabase as any).from("saved_searches").delete().eq("id", parsedId.data).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ deleted: true });
}
