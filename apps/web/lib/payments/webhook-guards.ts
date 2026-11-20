const intentSources: Record<string, readonly string[]> = {
  requires_action: ["requires_action"],
  requires_capture: ["requires_action", "authorized"],
  succeeded: ["authorized", "capturing"],
  canceled: ["requires_action", "authorized"],
  requires_payment_method: ["requires_action", "authorized"]
};

export function paymentSourcesForIntent(status: string) {
  return intentSources[status] ? [...intentSources[status]] : null;
}

export function refundMayOverwriteStatus(status: string) {
  return !["releasing", "released"].includes(status);
}

export const refundStatusSources = ["requires_action", "authorized", "capturing", "held", "refunding"] as const;

export function isGenuinePostCompletionRefund(transactionStatus: string | null | undefined, fullyRefunded: boolean) {
  return transactionStatus === "completed" && fullyRefunded;
}

export function reconcileStuckPayment(input: {
  status: "capturing" | "releasing" | "refunding";
  intentStatus: string;
  hasTransfer: boolean;
  refundedCents: number;
  amountCents: number;
}) {
  if (input.status === "capturing") {
    if (input.intentStatus === "succeeded") return "held" as const;
    if (input.intentStatus === "requires_capture") return "authorized" as const;
    if (input.intentStatus === "canceled") return "cancelled" as const;
    return null;
  }
  if (input.status === "releasing") return input.hasTransfer ? "released" as const : "held" as const;
  if (input.intentStatus === "canceled" && input.refundedCents <= 0) return "cancelled" as const;
  if (input.amountCents > 0 && input.refundedCents >= input.amountCents) return "refunded" as const;
  return "held" as const;
}
