import { cache } from "react";
import { cookies, headers } from "next/headers";
import { getDevBypassSession } from "@/lib/auth/dev-bypass-session";
import { e2eUserFromCookie } from "@/lib/auth/e2e-session";
import { isLiveDatabaseConfigured } from "@/lib/marketplace/demo-mode";
import { createClient } from "@/lib/supabase/server";

export type MarketplaceSession = {
  id: string;
  email: string;
  displayName: string;
  locale: string;
  source: "supabase" | "development" | "e2e";
};

export const getMarketplaceSession = cache(async function getMarketplaceSession(): Promise<MarketplaceSession | null> {
  const headerStore = await headers();
  const cookieStore = await cookies();
  const host = headerStore.get("host");
  const e2eUser = e2eUserFromCookie(cookieStore.get("ffm-e2e-user")?.value, host);
  if (e2eUser) return { ...e2eUser, source: "e2e" };

  if (!isLiveDatabaseConfigured()) {
    const bypass = await getDevBypassSession();
    if (!bypass.user) return null;
    return {
      id: bypass.user.id,
      email: bypass.user.email,
      displayName: "Local developer",
      locale: "en",
      source: "development"
    };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const bypass = await getDevBypassSession();
    if (!bypass.user) return null;
    return {
      id: bypass.user.id,
      email: bypass.user.email,
      displayName: "Local developer",
      locale: "en",
      source: "development"
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name,locale")
    .eq("user_id", user.id)
    .maybeSingle();
  const metadataName = typeof user.user_metadata?.display_name === "string" ? user.user_metadata.display_name : "";
  const emailName = user.email?.split("@")[0] ?? "";
  const displayName = profile?.display_name || metadataName || emailName || "Marketplace member";

  return {
    id: user.id,
    email: user.email ?? "",
    displayName,
    locale: profile?.locale || "en",
    source: "supabase"
  };
});
