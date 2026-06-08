import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return { error: NextResponse.json({ error: "Authentication required." }, { status: 401 }) } as const;
  }

  const { data: marketplaceUser } = await supabase
    .from("users")
    .select("id,status,role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (marketplaceUser?.status && marketplaceUser.status !== "active") {
    return { error: NextResponse.json({ error: "Account is not eligible for payments." }, { status: 403 }) } as const;
  }

  return { user: data.user, marketplaceUser } as const;
}
