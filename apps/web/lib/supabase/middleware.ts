import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";
import { getAuthenticatedRedirectUrl, getLoginRedirectUrl, isAuthRoute, isProtectedRoute } from "@/lib/auth/protected-routes";

type SupabaseUser = { id: string };
type AppUserAccess = { role: string | null; status: string | null };

const BASE64_PREFIX = "base64-";

function getSupabaseProjectRef() {
  try {
    return new URL(publicEnv.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
  } catch {
    return null;
  }
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

function getAccessTokenFromCookie(request: NextRequest) {
  const projectRef = getSupabaseProjectRef();
  if (!projectRef) return null;

  const cookieValue = getChunkedCookieValue(request, `sb-${projectRef}-auth-token`);
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

async function getAuthenticatedUser(request: NextRequest): Promise<{ user: SupabaseUser | null; accessToken: string | null }> {
  const accessToken = getAccessTokenFromCookie(request);
  if (!accessToken) return { user: null, accessToken: null };

  const response = await fetch(`${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`
    },
    cache: "no-store"
  });

  if (!response.ok) return { user: null, accessToken: null };

  const user = (await response.json()) as SupabaseUser;
  return user?.id ? { user, accessToken } : { user: null, accessToken: null };
}

async function getAppUserAccess(userId: string, accessToken: string): Promise<AppUserAccess | null> {
  const query = new URL(`${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users`);
  query.searchParams.set("select", "role,status");
  query.searchParams.set("id", `eq.${userId}`);
  query.searchParams.set("limit", "1");

  const response = await fetch(query, {
    headers: {
      apikey: publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json"
    },
    cache: "no-store"
  });

  if (!response.ok) return null;

  const users = (await response.json()) as AppUserAccess[];
  return users[0] ?? null;
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const { user, accessToken } = await getAuthenticatedUser(request);

  if (isProtectedRoute(pathname) && !user) {
    return NextResponse.redirect(getLoginRedirectUrl(request));
  }

  if (user && isAuthRoute(pathname)) {
    return NextResponse.redirect(getAuthenticatedRedirectUrl(request));
  }

  if (user && accessToken && pathname.startsWith("/admin")) {
    const appUser = await getAppUserAccess(user.id, accessToken);

    if (!appUser || appUser.status !== "active" || !["admin", "super_admin"].includes(appUser.role ?? "")) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/dashboard";
      redirectUrl.searchParams.set("adminDenied", "1");
      return NextResponse.redirect(redirectUrl);
    }
  }

  return NextResponse.next({ request });
}
