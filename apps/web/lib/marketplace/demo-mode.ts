export function isDemoMarketplaceDataEnabled(
  input: {
    NODE_ENV?: string;
    MARKETPLACE_DEMO_MODE?: string;
    SUPABASE_SERVICE_ROLE_KEY?: string;
    NEXT_PUBLIC_SUPABASE_URL?: string;
  } = process.env,
) {
  return input.MARKETPLACE_DEMO_MODE === "true";
}

export function isLiveDatabaseConfigured(input: NodeJS.ProcessEnv = process.env) {
  const url = input.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const key = input.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  if (!url || !key) return false;
  return !/placeholder|example\.com/i.test(`${url} ${key}`);
}
