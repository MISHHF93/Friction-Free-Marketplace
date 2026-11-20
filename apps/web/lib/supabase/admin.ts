import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import { validateServerEnv } from "@/lib/env.server";

function preferRuntime(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();
  if (trimmed && !/placeholder/i.test(trimmed)) return trimmed;
  return fallback;
}

export function createAdminClient() {
  const env = validateServerEnv();
  const url = preferRuntime(process.env.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL);
  const key = preferRuntime(process.env.SUPABASE_SERVICE_ROLE_KEY, env.SUPABASE_SERVICE_ROLE_KEY);
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}
