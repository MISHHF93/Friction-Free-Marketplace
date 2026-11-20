export function escrowActionKey(action: "release" | "capture" | "refund" | "cancel", transactionId: string, paymentId: string, detail = "") {
  return [action, transactionId, paymentId, detail].filter(Boolean).join(":");
}

const escrowTransitions: Record<string, readonly string[]> = {
  requires_action: ["authorized", "cancelled", "failed"],
  authorized: ["capturing", "refunding", "cancelled"],
  capturing: ["held", "authorized"],
  held: ["releasing", "refunding"],
  releasing: ["released", "held"],
  refunding: ["refunded", "held", "cancelled", "authorized"]
};

export function isEscrowTransition(from: string, to: string) {
  return escrowTransitions[from]?.includes(to) ?? false;
}

type WriteError = { message?: string; code?: string } | null;

type ClaimClient = {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: WriteError }>;
  from: (table: string) => {
    update: (values: Record<string, unknown>) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => {
          select: (columns?: string) => Promise<{ data: unknown; error: WriteError }>;
        };
      };
    };
  };
};

function firstRow(data: unknown) {
  if (Array.isArray(data)) return data[0] ?? null;
  return data ?? null;
}

export async function claimEscrowPayment(supabase: ClaimClient, paymentId: string, from: string, to: string) {
  if (!isEscrowTransition(from, to)) return null;
  const rpc = await supabase.rpc("claim_escrow_payment", {
    p_payment_id: paymentId,
    p_from: from,
    p_to: to
  });
  if (!rpc.error) return firstRow(rpc.data);
  if (!/claim_escrow_payment|PGRST202|schema cache/i.test(rpc.error.message ?? "")) {
    throw new Error(rpc.error.message || "Could not claim the escrow payment.");
  }

  const fallback = await supabase
    .from("escrow_payments")
    .update({ status: to, updated_at: new Date().toISOString() })
    .eq("id", paymentId)
    .eq("status", from)
    .select("*");
  if (fallback.error) throw new Error(fallback.error.message || "Could not claim the escrow payment.");
  return firstRow(fallback.data);
}

export async function claimTransactionStatus(
  supabase: ClaimClient,
  transactionId: string,
  from: string,
  to: string,
  extra: Record<string, unknown> = {}
) {
  const updated = await supabase
    .from("transactions")
    .update({ status: to, ...extra })
    .eq("id", transactionId)
    .eq("status", from)
    .select("id");
  if (updated.error) throw new Error(updated.error.message || "Could not update the transaction.");
  return firstRow(updated.data);
}
