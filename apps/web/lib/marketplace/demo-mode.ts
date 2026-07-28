export function isDemoMarketplaceDataEnabled(
  input: {
    NODE_ENV?: string;
    MARKETPLACE_DEMO_MODE?: string;
    SUPABASE_SERVICE_ROLE_KEY?: string;
    NEXT_PUBLIC_SUPABASE_URL?: string;
  } = process.env,
) {
  if (input.MARKETPLACE_DEMO_MODE === "true") return true;
  if (input.NODE_ENV === "production") return false;
  return input.SUPABASE_SERVICE_ROLE_KEY === "local-dev-placeholder"
    || Boolean(input.NEXT_PUBLIC_SUPABASE_URL?.includes("local-dev-placeholder"));
}
