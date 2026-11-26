import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEV_AUTH_BYPASS_COOKIE, isDevAuthBypassCookieValue, isDevBypassBlockedPath } from "@/lib/auth/dev-bypass";
import { E2E_USER_COOKIE, e2eUserFromCookie } from "@/lib/auth/e2e-session";
import { isAuthRoute, isProtectedRoute, isSafeRelativePath } from "@/lib/auth/protected-routes";
import { contentSecurityPolicy } from "@/lib/security/csp";
import { isTrustedMutationOrigin } from "@/lib/security/request-origin";

type SupabaseUser = { id: string };
type AppUserAccess = { role: string | null; status: string | null };
type PublicMiddlewareEnv = {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
};

const serverMutationPrefixes = [
  "/api/stripe/webhooks",
  "/api/stripe/connect/webhook",
  "/api/search/sync",
  "/api/admin/trust-safety/workers",
  "/api/notifications/dispatch",
  "/api/offers/expire",
  "/api/payments/reconcile",
  "/api/payments/auto-release",
  "/api/payments/expire-checkouts",
  "/api/mcp",
] as const;
const mutationMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function getPublicMiddlewareEnv(): PublicMiddlewareEnv | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !supabaseAnonKey) return null;

  try {
    new URL(supabaseUrl);
  } catch {
    return null;
  }

  return {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey
  };
}

export { isAuthRoute, isProtectedRoute };

function continueRequest(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const development = process.env.NODE_ENV !== "production";
  const policy = contentSecurityPolicy({ development, nonce: development ? undefined : nonce });
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  if (!development) requestHeaders.set("Content-Security-Policy", policy);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export function getSafeRedirectPath(value: string | null, fallback = "/dashboard") {
  return isSafeRelativePath(value) ? value : fallback;
}

function getLoginRedirectUrl(request: NextRequest) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/login";
  redirectUrl.search = "";
  redirectUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return redirectUrl;
}

function getAuthenticatedRedirectUrl(request: NextRequest) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = getSafeRedirectPath(request.nextUrl.searchParams.get("next"));
  redirectUrl.search = "";
  return redirectUrl;
}

function isAdminNext(request: NextRequest) {
  const next = getSafeRedirectPath(request.nextUrl.searchParams.get("next"), "");
  return next === "/admin" || next.startsWith("/admin/");
}

function adminDeniedUrl(request: NextRequest) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/dashboard";
  redirectUrl.search = "";
  redirectUrl.searchParams.set("adminDenied", "1");
  return redirectUrl;
}

function copyResponseCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie);
  });
  return target;
}

async function refreshSupabaseUser(request: NextRequest, response: NextResponse, env: PublicMiddlewareEnv) {
  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: Parameters<NextResponse["cookies"]["set"]>[2] }>) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      }
    }
  });

  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      const missingSession = error.name === "AuthSessionMissingError"
        || ("code" in error && error.code === "AuthSessionMissingError")
        || /auth session missing/i.test(error.message ?? "");
      if (!missingSession) {
        console.error("Proxy Supabase auth lookup failed", error);
      }
      return { user: null as SupabaseUser | null, supabase };
    }
    return { user: data.user?.id ? { id: data.user.id } : null, supabase };
  } catch (error) {
    console.error("Proxy Supabase auth lookup failed", error);
    return { user: null as SupabaseUser | null, supabase };
  }
}

async function readAppUserAccess(supabase: { from: (table: string) => any }, userId: string): Promise<AppUserAccess | null> {
  const { data, error } = await supabase.from("users").select("role,status").eq("id", userId).maybeSingle();
  if (error) return null;
  return data ?? null;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith("/api/")) {
    const serverMutation = serverMutationPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
    if (mutationMethods.has(request.method) && !serverMutation && !isTrustedMutationOrigin(request)) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    }
    return continueRequest(request);
  }
  const needsAuthState = isProtectedRoute(pathname) || isAuthRoute(pathname);

  if (!needsAuthState) {
    return continueRequest(request);
  }

  const host = request.headers.get("host") ?? request.nextUrl.host;
  const e2eUser = e2eUserFromCookie(request.cookies.get(E2E_USER_COOKIE)?.value, host);
  if (e2eUser) {
    if (pathname.startsWith("/admin") || (isAuthRoute(pathname) && isAdminNext(request))) {
      return NextResponse.redirect(adminDeniedUrl(request));
    }
    if (isAuthRoute(pathname)) {
      return NextResponse.redirect(getAuthenticatedRedirectUrl(request));
    }
    if (isProtectedRoute(pathname)) return continueRequest(request);
  }
  const bypassCookie = request.cookies.get(DEV_AUTH_BYPASS_COOKIE)?.value;
  if (isDevAuthBypassCookieValue(bypassCookie, host) && !isDevBypassBlockedPath(pathname)) {
    if (isAuthRoute(pathname)) {
      const next = getSafeRedirectPath(request.nextUrl.searchParams.get("next"));
      if (next.startsWith("/admin")) return NextResponse.redirect(adminDeniedUrl(request));
      if (isDevBypassBlockedPath(next)) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/dashboard";
        redirectUrl.search = "";
        return NextResponse.redirect(redirectUrl);
      }
      return NextResponse.redirect(getAuthenticatedRedirectUrl(request));
    }
    return continueRequest(request);
  }

  const env = getPublicMiddlewareEnv();
  if (!env) {
    const sessionResponse = continueRequest(request);
    return isProtectedRoute(pathname) ? copyResponseCookies(sessionResponse, NextResponse.redirect(getLoginRedirectUrl(request))) : sessionResponse;
  }

  const refreshResponse = NextResponse.next();
  const { user, supabase } = await refreshSupabaseUser(request, refreshResponse, env);
  const sessionResponse = continueRequest(request);
  copyResponseCookies(refreshResponse, sessionResponse);

  if (isProtectedRoute(pathname) && !user) {
    return copyResponseCookies(sessionResponse, NextResponse.redirect(getLoginRedirectUrl(request)));
  }

  if (user && (pathname.startsWith("/admin") || (isAuthRoute(pathname) && isAdminNext(request)))) {
    const appUser = await readAppUserAccess(supabase, user.id);
    const isAdmin = appUser?.status === "active" && ["admin", "super_admin"].includes(appUser.role ?? "");
    if (!isAdmin) {
      return copyResponseCookies(sessionResponse, NextResponse.redirect(adminDeniedUrl(request)));
    }
    if (isAuthRoute(pathname)) {
      return copyResponseCookies(sessionResponse, NextResponse.redirect(getAuthenticatedRedirectUrl(request)));
    }
  }

  if (user && isAuthRoute(pathname)) {
    return copyResponseCookies(sessionResponse, NextResponse.redirect(getAuthenticatedRedirectUrl(request)));
  }

  return sessionResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]
};
