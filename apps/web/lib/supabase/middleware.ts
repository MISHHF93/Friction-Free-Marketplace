import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";

const protectedPrefixes = ["/dashboard", "/seller", "/admin", "/account"];
const authRoutes = new Set(["/login", "/signup"]);

function getSafeRedirectPath(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      }
    }
  });

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (isProtected && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && authRoutes.has(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = getSafeRedirectPath(request.nextUrl.searchParams.get("next"));
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (user && pathname.startsWith("/admin")) {
    const { data: appUser } = await supabase
      .from("users")
      .select("role,status")
      .eq("id", user.id)
      .maybeSingle();

    if (!appUser || appUser.status !== "active" || !["admin", "super_admin"].includes(appUser.role)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/dashboard";
      redirectUrl.searchParams.set("adminDenied", "1");
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}
