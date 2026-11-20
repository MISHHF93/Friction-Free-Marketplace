import { calculatePlatformFeeCents, centsToDollars, dollarsToCents } from "@/lib/payments/money";

type QuoteInput = {
  priceAmount: number;
  metadata?: unknown;
};

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function finiteCents(value: unknown) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 25_000_00) return null;
  return value;
}

function finiteDollars(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 25_000) return null;
  return value;
}

/**
 * Shipping comes only from seller-authored listing metadata.
 * Tax stays zero until a server-side tax provider exists. Client-supplied
 * shipping or tax is never used as the charge.
 */
export function quoteCheckoutAmounts(input: QuoteInput) {
  const metadata = record(input.metadata);
  const shippingCents = finiteCents(metadata?.shipping_cents)
    ?? dollarsToCents(finiteDollars(metadata?.shipping_amount) ?? 0);
  const taxCents = 0;
  const itemCents = dollarsToCents(Number(input.priceAmount));
  const platformFeeCents = calculatePlatformFeeCents(itemCents + shippingCents + taxCents);
  return {
    itemCents,
    shippingCents,
    taxCents,
    platformFeeCents,
    totalCents: itemCents + shippingCents + taxCents + platformFeeCents,
    itemAmount: centsToDollars(itemCents),
    shippingAmount: centsToDollars(shippingCents),
    taxAmount: centsToDollars(taxCents),
    platformFeeAmount: centsToDollars(platformFeeCents)
  };
}

export function clientChargesMatchQuote(
  quote: { shippingCents: number; taxCents: number },
  client: { shippingCents?: number; taxCents?: number }
) {
  if (client.shippingCents !== undefined && client.shippingCents !== quote.shippingCents) return false;
  if (client.taxCents !== undefined && client.taxCents !== quote.taxCents) return false;
  return true;
}
