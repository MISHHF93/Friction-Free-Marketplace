import { createClient } from "@supabase/supabase-js";
import { validateServerEnv } from "@/lib/env.server";

export function createAdminClient() {
  const env = validateServerEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}
