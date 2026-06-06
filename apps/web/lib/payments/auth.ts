import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return { error: NextResponse.json({ error: "Authentication required." }, { status: 401 }) } as const;
  }

  return { user: data.user } as const;
}
