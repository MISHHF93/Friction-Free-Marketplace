export const DEV_AUTH_BYPASS_COOKIE = "ffm-dev-auth-bypass";
export const DEV_AUTH_BYPASS_USER = {
  id: "dev-bypass-user",
  email: "dev@friction-free.local"
};

export function isDevAuthBypassEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.CI !== "true";
}

export function isDevAuthBypassCookieValue(value?: string) {
  return isDevAuthBypassEnabled() && value === "1";
}
