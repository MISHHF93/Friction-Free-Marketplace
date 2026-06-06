import type { SupabaseClient } from "@supabase/supabase-js";

export async function recordTransactionEvent(
  supabase: SupabaseClient<any>,
  event: {
    transaction_id?: string | null;
    actor_id?: string | null;
    type: string;
    from_status?: string | null;
    to_status?: string | null;
    provider?: string | null;
    provider_object_id?: string | null;
    amount?: number | null;
    currency?: string | null;
    message?: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  await supabase.from("transaction_events").insert({
    transaction_id: event.transaction_id ?? null,
    actor_id: event.actor_id ?? null,
    type: event.type,
    from_status: event.from_status ?? null,
    to_status: event.to_status ?? null,
    provider: event.provider ?? "stripe",
    provider_object_id: event.provider_object_id ?? null,
    amount: event.amount ?? null,
    currency: event.currency?.toUpperCase() ?? null,
    message: event.message ?? null,
    metadata: event.metadata ?? {}
  });
}
