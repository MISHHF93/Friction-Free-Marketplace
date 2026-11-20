export const RESTRICTED_MEMBER_STATUSES = ["suspended", "banned", "deleted"] as const;
export const RESTRICTED_ACCOUNT_MESSAGE = "Your account is restricted, so you can't make changes right now. Contact support if you think this is a mistake.";

export class RestrictedMemberError extends Error {
  readonly status = 403 as const;
  constructor() {
    super(RESTRICTED_ACCOUNT_MESSAGE);
    this.name = "RestrictedMemberError";
  }
}

export function isRestrictedMemberStatus(status: string | null | undefined) {
  return (RESTRICTED_MEMBER_STATUSES as readonly string[]).includes(String(status ?? ""));
}

/**
 * App-level guard for writes by suspended or banned members. The database
 * triggers are the real enforcement, so a failed lookup does not block here.
 */
export async function assertMemberCanWrite(supabase: any, userId: string) {
  try {
    const { data, error } = await supabase.from("users").select("status").eq("id", userId).maybeSingle();
    if (error) return;
    if (isRestrictedMemberStatus(data?.status)) throw new RestrictedMemberError();
  } catch (error) {
    if (error instanceof RestrictedMemberError) throw error;
  }
}

const friendlyDatabaseErrors: Array<[string, string]> = [
  ["account_restricted", RESTRICTED_ACCOUNT_MESSAGE],
  ["listing_on_hold", "This listing is on hold for review, so it can't be published. Our team will follow up."],
  ["listing_has_open_order", "This listing has an open order. Finish or cancel the order first."],
  ["listing_removed", "This listing was removed and can't be changed."],
  ["listing_invalid_transition", "That change isn't allowed for this listing's current status."],
  ["account_has_open_orders", "Finish, cancel or settle your open orders first."]
];

/** Maps guard errors raised by the database to plain-language messages. */
export function friendlyGuardMessage(error: unknown): string | null {
  const message = error instanceof Error ? error.message : typeof error === "object" && error && "message" in error ? String((error as { message: unknown }).message) : "";
  for (const [code, friendly] of friendlyDatabaseErrors) {
    if (message.includes(code)) return friendly;
  }
  return null;
}
