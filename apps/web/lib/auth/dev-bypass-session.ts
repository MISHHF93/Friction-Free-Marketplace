import { cookies, headers } from "next/headers";
import { DEV_AUTH_BYPASS_COOKIE, getLocalAuthUser, isDevAuthBypassEnabled } from "@/lib/auth/dev-bypass";

export async function getRequestHost() {
  const headerStore = await headers();
  return headerStore.get("host");
}

export async function getDevBypassSession() {
  const host = await getRequestHost();
  const cookieStore = await cookies();
  const cookie = cookieStore.get(DEV_AUTH_BYPASS_COOKIE)?.value;
  return {
    host,
    enabled: isDevAuthBypassEnabled(host),
    user: getLocalAuthUser(cookie, host)
  };
}
