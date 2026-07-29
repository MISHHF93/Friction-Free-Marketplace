export const DEV_AUTH_BYPASS_COOKIE = "ffm-dev-auth-bypass";
export const DEV_AUTH_BYPASS_USER = {
  id: "dev-bypass-user",
  email: "dev@friction-free.local"
};

/**
 * Temporary open local auth.
 * When enabled, the app treats visitors as signed in without Supabase credentials.
 * Disabled in production and CI.
 */
export function isDevAuthBypassEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.CI !== "true";
}

/** Alias for open local sign-in mode. */
export function isOpenLocalAuthEnabled() {
  return isDevAuthBypassEnabled();
}

export function isDevAuthBypassCookieValue(value?: string) {
  return isDevAuthBypassEnabled() && value === "1";
}

/**
 * Resolve a local development user when open auth is on.
 * Cookie is optional — open mode is enough for now.
 */
export function getLocalAuthUser(cookieValue?: string) {
  if (!isDevAuthBypassEnabled()) return null;
  if (cookieValue === undefined || isDevAuthBypassCookieValue(cookieValue) || cookieValue === "1") {
    return DEV_AUTH_BYPASS_USER;
  }
  return DEV_AUTH_BYPASS_USER;
}

export function hasLocalAuthAccess(cookieValue?: string) {
  return Boolean(getLocalAuthUser(cookieValue));
}
