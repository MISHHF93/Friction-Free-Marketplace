import { claimEscrowPayment } from "@/lib/payments/escrow";

export async function prepareEscrowAction(supabase: any, payment: Record<string, any>, from: string, intermediate: string) {
  if (payment.status === intermediate) return { payment, resumed: true as const };
  if (payment.status !== from) return { payment: null, resumed: false as const };
  const claimed = await claimEscrowPayment(supabase, String(payment.id), from, intermediate);
  if (claimed) return { payment: claimed as Record<string, unknown>, resumed: false as const };
  const { data } = await supabase.from("escrow_payments").select("*").eq("id", String(payment.id)).maybeSingle();
  if (data?.status === intermediate) return { payment: data, resumed: true as const };
  return { payment: data, resumed: false as const };
}
