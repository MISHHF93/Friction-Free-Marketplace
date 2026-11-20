import { openCheckoutStatuses } from "@/lib/payments/open-checkout";

/** Orders that still hold or may hold money. Deleting either party would strand them. */
export async function countOpenOrders(supabase: any, userId: string): Promise<number | null> {
  const { count, error } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .in("status", [...openCheckoutStatuses]);
  if (error) return null;
  return count ?? 0;
}

export function openOrdersDeletionMessage(count: number) {
  const orders = count === 1 ? "1 open order" : `${count} open orders`;
  return `You have ${orders}. Finish, cancel or settle ${count === 1 ? "it" : "them"} before deleting your account. Unpaid checkouts clear on their own within an hour.`;
}
