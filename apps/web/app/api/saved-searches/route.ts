export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const savedSearchSchema = z.object({
  name: z.string().min(2).max(120),
  query: z.string().optional(),
  filters: z.record(z.unknown()).default({}),
  alertEnabled: z.boolean().default(true),
  alertFrequency: z.enum(["instant", "daily", "weekly", "never"]).default("instant")
});

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to view saved searches." }, { status: 401 });

  const { data, error } = await (supabase as any).from("saved_searches").select("*").eq("user_id", user.id).order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ savedSearches: data ?? [] });
}

export async function POST(request: Request) {
  const input = savedSearchSchema.parse(await request.json());
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to save this search." }, { status: 401 });

  const { data, error } = await (supabase as any)
    .from("saved_searches")
    .insert({
      user_id: user.id,
      name: input.name,
      query: input.query ?? null,
      filters: input.filters,
      alert_enabled: input.alertEnabled,
      alert_frequency: input.alertFrequency
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ savedSearch: data }, { status: 201 });
}
