import { enqueueTemplateNotification } from "@/lib/notifications/service";
import type { NotificationTemplateInput, NotificationTemplateKey } from "@/lib/notifications/templates";

type Party = "buyer" | "seller";

export type TransactionNotice = {
  transactionId: string;
  template: NotificationTemplateKey;
  to: Party[];
  input?: NotificationTemplateInput;
};

/**
 * Best-effort lifecycle notices for an order. A notification failure never
 * changes the order outcome, so errors are swallowed and reported as false.
 */
export async function notifyTransactionParties(supabase: any, notice: TransactionNotice): Promise<boolean> {
  try {
    const { data: transaction } = await supabase
      .from("transactions")
      .select("id,buyer_id,seller_id,listing_id,total_amount,currency")
      .eq("id", notice.transactionId)
      .maybeSingle();
    if (!transaction) return false;
    let listingTitle: string | null = null;
    if (transaction.listing_id) {
      const { data: listing } = await supabase.from("listings").select("title").eq("id", transaction.listing_id).maybeSingle();
      listingTitle = typeof listing?.title === "string" ? listing.title : null;
    }
    const recipients = notice.to
      .map((party) => ({ party, userId: party === "buyer" ? transaction.buyer_id : transaction.seller_id }))
      .filter((entry): entry is { party: Party; userId: string } => typeof entry.userId === "string");
    await Promise.all(recipients.map(({ party, userId }) => enqueueTemplateNotification({
      userId,
      template: notice.template,
      input: {
        listingTitle,
        amount: transaction.total_amount ?? null,
        currency: typeof transaction.currency === "string" ? transaction.currency.toUpperCase() : null,
        actionUrl: party === "buyer" ? "/dashboard/purchases" : "/dashboard/sales",
        ...notice.input
      },
      payload: { transaction_id: transaction.id, listing_id: transaction.listing_id ?? null },
      supabase
    })));
    return true;
  } catch {
    return false;
  }
}
