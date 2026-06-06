export function dollarsToCents(amount: number) {
  return Math.round(amount * 100);
}

export function centsToDollars(amount: number | null | undefined) {
  return Number(((amount ?? 0) / 100).toFixed(2));
}

export function calculatePlatformFeeCents(amountCents: number) {
  const percentageFee = Math.round(amountCents * 0.05);
  return Math.max(99, percentageFee);
}

export function normalizeCurrency(currency: string) {
  return currency.trim().toLowerCase();
}
