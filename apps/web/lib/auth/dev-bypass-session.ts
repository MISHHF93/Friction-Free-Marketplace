import { cookies, headers } from "next/headers";
import { DEV_AUTH_BYPASS_COOKIE, getLocalAuthUser, isDevAuthBypassEnabled } from "@/lib/auth/dev-bypass";

export async function getRequestHost() {
  const headerStore = await headers();
  return headerStore.get("host");
}

export async function getDevBypassSession() {
  const headerStore = await headers();
  const host = headerStore.get("host");
  const remoteAddress = headerStore.get("x-real-ip") || headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const cookieStore = await cookies();
  const cookie = cookieStore.get(DEV_AUTH_BYPASS_COOKIE)?.value;
  return {
    host,
    enabled: isDevAuthBypassEnabled(host, remoteAddress),
    user: getLocalAuthUser(cookie, host, remoteAddress)
  };
}
