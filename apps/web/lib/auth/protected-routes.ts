import type { NextRequest } from "next/server";

export const protectedRoutePrefixes = ["/dashboard", "/seller", "/assistant", "/admin", "/account"] as const;
export const authRoutePaths = ["/login", "/signup", "/auth/forgot-password", "/auth/update-password"] as const;

export function isProtectedRoute(pathname: string) {
  if (pathname === "/sellers" || pathname.startsWith("/sellers/")) return false;
  return protectedRoutePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function isAuthRoute(pathname: string) {
  return authRoutePaths.some((route) => pathname === route);
}

/**
 * True only for a same-origin path such as "/dashboard?tab=1".
 * Rejects "//host" and "/\host" (URL parsers treat "\" as "/", so both are
 * protocol-relative and would redirect off-site), any backslash, and control characters.
 */
export function isSafeRelativePath(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > 2048) return false;
  if (!value.startsWith("/") || value.startsWith("//")) return false;
  if (value.includes("\\") || /[\u0000-\u001f\u007f]/.test(value)) return false;
  try {
    const base = "https://same-origin.invalid";
    return new URL(value, base).origin === base;
  } catch {
    return false;
  }
}

export function getSafeRedirectPath(value: string | null | undefined, fallback = "/dashboard") {
  return isSafeRelativePath(value) ? value : fallback;
}

export function getLoginRedirectUrl(request: NextRequest) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/login";
  redirectUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return redirectUrl;
}

export function getAuthenticatedRedirectUrl(request: NextRequest) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = getSafeRedirectPath(request.nextUrl.searchParams.get("next"));
  redirectUrl.search = "";
  return redirectUrl;
}
