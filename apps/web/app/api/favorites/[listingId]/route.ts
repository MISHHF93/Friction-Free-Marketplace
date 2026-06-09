export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, response: NextResponse.json({ error: "Sign in to manage favorites." }, { status: 401 }) };
  return { supabase, user, response: null };
}

export async function PUT(_request: Request, { params }: { params: Promise<{ listingId: string }> }) {
  const { listingId: listingIdParam } = await params;
  const listingId = z.string().uuid().safeParse(listingIdParam);
  if (!listingId.success) return NextResponse.json({ error: "Invalid listing id." }, { status: 400 });
  const { supabase, user, response } = await requireUser();
  if (response || !user) return response;

  const { error } = await (supabase as any).from("favorites").upsert(
    { user_id: user.id, listing_id: listingId.data },
    { onConflict: "user_id,listing_id", ignoreDuplicates: true }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ favorited: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ listingId: string }> }) {
  const { listingId: listingIdParam } = await params;
  const listingId = z.string().uuid().safeParse(listingIdParam);
  if (!listingId.success) return NextResponse.json({ error: "Invalid listing id." }, { status: 400 });
  const { supabase, user, response } = await requireUser();
  if (response || !user) return response;

  const { error } = await (supabase as any).from("favorites").delete().eq("user_id", user.id).eq("listing_id", listingId.data);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ favorited: false });
}
