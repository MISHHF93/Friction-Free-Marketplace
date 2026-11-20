import { isExactLocalRuntime, isLocalDevelopmentHost, isLoopbackAddress } from "@/lib/auth/dev-bypass";

export const E2E_USER_COOKIE = "ffm-e2e-user";

const e2eUsers = {
  alice: {
    id: "11111111-1111-4111-8111-111111111111",
    email: "alice@example.com",
    displayName: "Alice Buyer",
    locale: "en"
  },
  bob: {
    id: "22222222-2222-4222-8222-222222222222",
    email: "bob@example.com",
    displayName: "Bob Seller",
    locale: "en"
  }
} as const;

export type E2EUserKey = keyof typeof e2eUsers;

export function isE2EAuthEnabled(host: string | null | undefined, remoteAddress?: string | null) {
  if (process.env.FFM_E2E_AUTH !== "true") return false;
  if (!isExactLocalRuntime()) return false;
  if (process.env.VERCEL === "1") return false;
  if (!isLocalDevelopmentHost(host)) return false;
  if (remoteAddress && !isLoopbackAddress(remoteAddress)) return false;
  return true;
}

export function e2eUserFromCookie(value: string | undefined, host: string | null | undefined, remoteAddress?: string | null) {
  if (!isE2EAuthEnabled(host, remoteAddress) || !value || !(value in e2eUsers)) return null;
  return e2eUsers[value as E2EUserKey];
}

export function isolatedPreviewCounts(userId: string) {
  const seed = userId.split("").reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return {
    listings: seed % 5,
    offers: seed % 4,
    messages: seed % 3,
    orders: seed % 2
  };
}
