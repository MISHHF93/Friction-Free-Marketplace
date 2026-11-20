export function isDemoMarketplaceDataEnabled(
  input: {
    NODE_ENV?: string;
    MARKETPLACE_DEMO_MODE?: string;
    SUPABASE_SERVICE_ROLE_KEY?: string;
    NEXT_PUBLIC_SUPABASE_URL?: string;
  } = process.env,
) {
  if (input.NODE_ENV === "production") return input.MARKETPLACE_DEMO_MODE === "true";
  if (input.MARKETPLACE_DEMO_MODE === "false") return false;
  if (input.MARKETPLACE_DEMO_MODE === "true") return true;
  const key = input.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const url = input.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!key || !url) return true;
  return key.includes("placeholder") || url.includes("placeholder");
}
