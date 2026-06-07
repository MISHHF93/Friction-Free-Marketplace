import type { NextRequest } from "next/server";

export const protectedRoutePrefixes = ["/dashboard", "/seller", "/admin", "/account"] as const;
export const authRoutePaths = ["/login", "/signup"] as const;

export function isProtectedRoute(pathname: string) {
  return protectedRoutePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function isAuthRoute(pathname: string) {
  return authRoutePaths.some((route) => pathname === route);
}

export function getSafeRedirectPath(value: string | null, fallback = "/dashboard") {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : fallback;
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
