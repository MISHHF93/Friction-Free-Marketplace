import { NextResponse, type NextRequest } from "next/server";

type SupabaseUser = { id: string };
type AppUserAccess = { role: string | null; status: string | null };
type PublicMiddlewareEnv = {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
};

const BASE64_PREFIX = "base64-";
const protectedRoutePrefixes = ["/dashboard", "/seller", "/admin", "/account"] as const;
const authRoutePaths = ["/login", "/signup"] as const;

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

export function isProtectedRoute(pathname: string) {
  return protectedRoutePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function isAuthRoute(pathname: string) {
  return authRoutePaths.some((route) => pathname === route);
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

function getAccessTokenFromCookie(request: NextRequest, env: PublicMiddlewareEnv) {
  const cookieValue = getChunkedCookieValue(request, `sb-${getSupabaseProjectRef(env)}-auth-token`);
  if (!cookieValue) return null;

  try {
    const session = JSON.parse(decodeSessionCookie(cookieValue)) as {
      access_token?: unknown;
      currentSession?: { access_token?: unknown };
      session?: { access_token?: unknown };
    } | unknown[];

    if (Array.isArray(session)) {
      return typeof session[0] === "string" ? session[0] : null;
    }

    const token = session.access_token ?? session.currentSession?.access_token ?? session.session?.access_token;
    return typeof token === "string" && token ? token : null;
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
    console.error("Middleware Supabase auth lookup failed", error);
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
    console.error("Middleware app user lookup failed", error);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const needsAuthState = isProtectedRoute(pathname) || isAuthRoute(pathname);

  if (!needsAuthState) {
    return NextResponse.next({ request });
  }

  const env = getPublicMiddlewareEnv();

  if (!env) {
    return isProtectedRoute(pathname) ? NextResponse.redirect(getLoginRedirectUrl(request)) : NextResponse.next({ request });
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

  return NextResponse.next({ request });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]
};
