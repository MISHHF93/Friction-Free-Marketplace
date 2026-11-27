import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSafeRedirectPath } from "@/lib/auth/protected-routes";
import { publicEnv } from "@/lib/env";

function getSafeNext(value: string | null) {
  return getSafeRedirectPath(value, "/dashboard");
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = getSafeNext(requestUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, publicEnv.NEXT_PUBLIC_APP_URL));
    }
  }

  return NextResponse.redirect(new URL("/login?authError=Unable%20to%20confirm%20your%20session", publicEnv.NEXT_PUBLIC_APP_URL));
}
