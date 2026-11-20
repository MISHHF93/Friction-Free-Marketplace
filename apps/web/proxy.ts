import { NextResponse, type NextRequest } from "next/server";
import { DEV_AUTH_BYPASS_COOKIE, isDevAuthBypassCookieValue, isDevBypassBlockedPath } from "@/lib/auth/dev-bypass";
import { E2E_USER_COOKIE, e2eUserFromCookie } from "@/lib/auth/e2e-session";
import { isAuthRoute, isProtectedRoute } from "@/lib/auth/protected-routes";
import { contentSecurityPolicy } from "@/lib/security/csp";
import { isTrustedMutationOrigin } from "@/lib/security/request-origin";

type SupabaseUser = { id: string };
type AppUserAccess = { role: string | null; status: string | null };
type PublicMiddlewareEnv = {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
};

const BASE64_PREFIX = "base64-";
const serverMutationPrefixes = [
  "/api/stripe/webhooks",
  "/api/stripe/connect/webhook",
  "/api/search/sync",
  "/api/admin/trust-safety/workers",
  "/api/notifications/dispatch",
  "/api/offers/expire",
  "/api/payments/reconcile",
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
  if (!development) requestHeaders.set("Content-Security-Policy", policy);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export function getSafeRedirectPath(value: string | null, fallback = "/dashboard") {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : fallback;
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

function getSupabaseProjectRef(env: PublicMiddlewareEnv) {
  return new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
}

function getChunkedCookieValue(request: NextRequest, cookieName: string) {
  const directValue = request.cookies.get(cookieName)?.value;
  if (directValue) return directValue;

  const chunks: string[] = [];
  for (let index = 0; ; index += 1) {
    const chunkValue = request.cookies.get(`${cookieName}.${index}`)?.value;
    if (!chunkValue) break;
    chunks.push(chunkValue);
  }

  return chunks.length ? chunks.join("") : null;
}

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function decodeSessionCookie(value: string) {
  if (!value.startsWith(BASE64_PREFIX)) return value;
  return decodeBase64Url(value.slice(BASE64_PREFIX.length));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getNestedAccessToken(value: unknown) {
  if (!isRecord(value)) return null;

  const accessToken = value.access_token;
  return typeof accessToken === "string" && accessToken ? accessToken : null;
}

function getAccessTokenFromCookie(request: NextRequest, env: PublicMiddlewareEnv) {
  const cookieValue = getChunkedCookieValue(request, `sb-${getSupabaseProjectRef(env)}-auth-token`);
  if (!cookieValue) return null;

  try {
    const session = JSON.parse(decodeSessionCookie(cookieValue)) as unknown;

    if (Array.isArray(session)) {
      return typeof session[0] === "string" && session[0] ? session[0] : null;
    }

    if (!isRecord(session)) return null;

    return getNestedAccessToken(session) ?? getNestedAccessToken(session.currentSession) ?? getNestedAccessToken(session.session);
  } catch {
    return null;
  }
}

async function getAuthenticatedUser(
  request: NextRequest,
  env: PublicMiddlewareEnv
): Promise<{ user: SupabaseUser | null; accessToken: string | null }> {
  const accessToken = getAccessTokenFromCookie(request, env);
  if (!accessToken) return { user: null, accessToken: null };

  try {
    const response = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`
      },
      cache: "no-store"
    });

    if (!response.ok) return { user: null, accessToken: null };

    const user = (await response.json()) as SupabaseUser;
    return user?.id ? { user, accessToken } : { user: null, accessToken: null };
  } catch (error) {
    console.error("Proxy Supabase auth lookup failed", error);
    return { user: null, accessToken: null };
  }
}

async function getAppUserAccess(userId: string, accessToken: string, env: PublicMiddlewareEnv): Promise<AppUserAccess | null> {
  const query = new URL(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users`);
  query.searchParams.set("select", "role,status");
  query.searchParams.set("id", `eq.${userId}`);
  query.searchParams.set("limit", "1");

  try {
    const response = await fetch(query, {
      headers: {
        apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json"
      },
      cache: "no-store"
    });

    if (!response.ok) return null;

    const users = (await response.json()) as AppUserAccess[];
    return users[0] ?? null;
  } catch (error) {
    console.error("Proxy app user lookup failed", error);
    return null;
  }
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
  if (e2eUser && !pathname.startsWith("/admin")) {
    if (isAuthRoute(pathname)) {
      return NextResponse.redirect(getAuthenticatedRedirectUrl(request));
    }
    if (isProtectedRoute(pathname)) return continueRequest(request);
  }
  const bypassCookie = request.cookies.get(DEV_AUTH_BYPASS_COOKIE)?.value;
  if (isDevAuthBypassCookieValue(bypassCookie, host) && !isDevBypassBlockedPath(pathname)) {
    if (isAuthRoute(pathname)) {
      return NextResponse.redirect(getAuthenticatedRedirectUrl(request));
    }
    return continueRequest(request);
  }

  const env = getPublicMiddlewareEnv();

  if (!env) {
    return isProtectedRoute(pathname) ? NextResponse.redirect(getLoginRedirectUrl(request)) : continueRequest(request);
  }

  const { user, accessToken } = await getAuthenticatedUser(request, env);

  if (isProtectedRoute(pathname) && !user) {
    return NextResponse.redirect(getLoginRedirectUrl(request));
  }

  if (user && isAuthRoute(pathname)) {
    return NextResponse.redirect(getAuthenticatedRedirectUrl(request));
  }

  if (user && accessToken && pathname.startsWith("/admin")) {
    const appUser = await getAppUserAccess(user.id, accessToken, env);

    if (!appUser || appUser.status !== "active" || !["admin", "super_admin"].includes(appUser.role ?? "")) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/dashboard";
      redirectUrl.searchParams.set("adminDenied", "1");
      return NextResponse.redirect(redirectUrl);
    }
  }

  return continueRequest(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]
};
