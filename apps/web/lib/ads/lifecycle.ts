type Db = { rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message?: string } | null }> };

/** Approved -> active at start, approved/active -> expired at end, stale checkouts back to draft. */
export async function advanceAdLifecycle(supabase: Db) {
  const { data, error } = await supabase.rpc("advance_ad_campaign_lifecycle");
  if (error) throw new Error(error.message ?? "Ad lifecycle sweep failed.");
  const row = Array.isArray(data) ? (data[0] as Record<string, unknown> | undefined) : undefined;
  return {
    activated: Number(row?.activated ?? 0),
    expired: Number(row?.expired ?? 0),
    reopened: Number(row?.reopened ?? 0)
  };
}
