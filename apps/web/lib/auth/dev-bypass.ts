export const DEV_AUTH_BYPASS_COOKIE = "ffm-dev-auth-bypass";
export const DEV_AUTH_BYPASS_USER = {
  id: "dev-bypass-user",
  email: "dev@friction-free.local"
};

/**
 * Routes that must always use a real Supabase session.
 * The local bypass cookie never satisfies admin, account, or order pages.
 */
export const devBypassBlockedPrefixes = [
  "/admin",
  "/account",
  "/dashboard/purchases",
  "/dashboard/sales",
  "/dashboard/payments"
] as const;

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function isLoopbackAddress(value: string | null | undefined) {
  if (!value) return false;
  const address = value.trim().toLowerCase().replace(/^::ffff:/, "");
  return address === "127.0.0.1" || address === "::1" || address === "0:0:0:0:0:0:0:1";
}

export function isExactLocalRuntime() {
  return process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
}

export function isLocalDevelopmentHost(host: string | null | undefined) {
  if (!host) return false;
  const trimmed = host.trim().toLowerCase();
  const hostname = trimmed.startsWith("[")
    ? trimmed.slice(1, trimmed.indexOf("]"))
    : trimmed.split(":")[0];
  return LOCAL_HOSTS.has(hostname);
}

/**
 * Local UI bypass. Fail closed: every condition is required, and any production
 * signal (NODE_ENV, Vercel, CI) turns it off even if the flag is set.
 * The caller must also prove the request Host is loopback and present the cookie.
 */
export function isDevAuthBypassEnabled(host: string | null | undefined, remoteAddress?: string | null) {
  if (process.env.ALLOW_DEV_AUTH_BYPASS !== "true") return false;
  if (!isExactLocalRuntime()) return false;
  if (process.env.VERCEL === "1") return false;
  if (process.env.CI === "true") return false;
  if (!isLocalDevelopmentHost(host)) return false;
  if (remoteAddress && !isLoopbackAddress(remoteAddress)) return false;
  return true;
}

export function isDevBypassBlockedPath(pathname: string) {
  return devBypassBlockedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function isDevAuthBypassCookieValue(value: string | undefined, host: string | null | undefined, remoteAddress?: string | null) {
  return isDevAuthBypassEnabled(host, remoteAddress) && value === "1";
}

export function getLocalAuthUser(cookieValue?: string, host?: string | null, remoteAddress?: string | null) {
  if (!isDevAuthBypassCookieValue(cookieValue, host ?? null, remoteAddress)) return null;
  return DEV_AUTH_BYPASS_USER;
}

/** Secure unless the configured app URL is explicitly http (local dev). Unknown URLs stay secure. */
export function devBypassCookieSecure(appUrl: string | null | undefined) {
  if (!appUrl) return true;
  try {
    return new URL(appUrl).protocol === "https:";
  } catch {
    return true;
  }
}
