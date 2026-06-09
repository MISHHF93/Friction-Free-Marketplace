"use server";

export async function startCheckoutAction(_listingId: string) {
  throw new Error("Legacy Stripe Checkout is disabled. Use the protected PaymentIntent checkout flow so pricing, escrow, ledger, and audit records are created from trusted database state.");
}
