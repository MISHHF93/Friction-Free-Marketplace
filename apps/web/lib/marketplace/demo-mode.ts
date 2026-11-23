export function isDemoMarketplaceDataEnabled(
  input: {
    NODE_ENV?: string;
    MARKETPLACE_DEMO_MODE?: string;
    SUPABASE_SERVICE_ROLE_KEY?: string;
    NEXT_PUBLIC_SUPABASE_URL?: string;
  } = process.env,
) {
  if (input.NODE_ENV === "production") return false;
  if (input.NODE_ENV !== "development" && input.NODE_ENV !== "test") return false;
  return input.MARKETPLACE_DEMO_MODE === "true";
}

export function isLiveDatabaseConfigured(input: NodeJS.ProcessEnv = process.env) {
  const url = input.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const key = input.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  if (!url || !key) return false;
  return !/placeholder|example\.com|local-dev-inert/i.test(`${url} ${key}`);
}
