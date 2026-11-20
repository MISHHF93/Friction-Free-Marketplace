export function nextRefundedAmount(existingDollars: number, refundId: string, knownIds: string[], amountDollars: number) {
  if (knownIds.includes(refundId)) return { amount: existingDollars, ids: knownIds, duplicate: true };
  return { amount: Number((existingDollars + amountDollars).toFixed(2)), ids: [...knownIds, refundId], duplicate: false };
}
