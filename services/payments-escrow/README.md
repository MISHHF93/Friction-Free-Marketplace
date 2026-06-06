# Payments & Escrow-Style Holding Service

This service uses Stripe Connect Express plus manual-capture PaymentIntents to provide marketplace payments without representing the platform as a regulated escrow provider.

## Stripe account flow

1. Seller opens `/dashboard/payments` and starts onboarding.
2. `POST /api/stripe/connect/onboard` creates or reuses a Stripe Express account with `card_payments` and `transfers` capabilities.
3. The seller completes Stripe-hosted onboarding through an Account Link.
4. `GET /api/stripe/connect/status` and the `account.updated` webhook mirror Connect status into `seller_payment_accounts`.
5. Listings can be checked out only when the seller account is `active` with charges and payouts enabled.

## PaymentIntent flow

1. Buyer starts checkout from a listing page using the Stripe Elements card UI.
2. `POST /api/stripe/payment-intents` creates a marketplace transaction and a Stripe PaymentIntent with `capture_method=manual`.
3. The buyer confirms the card payment client-side; Stripe moves the PaymentIntent to `requires_capture` when authorized.
4. Webhooks record `paid` / `authorized` status and the capture deadline.
5. `POST /api/stripe/transactions/:id/capture` manually captures the authorization and marks funds `escrowed` / `held` on the platform balance.
6. `POST /api/stripe/transactions/:id/release` creates a Stripe Transfer to the seller connected account, records a payout, and completes the transaction.

## Reservation deposits

Checkout can pass `reservationDepositCents`; the PaymentIntent authorizes only that deposit plus platform fee. The database marks the transaction metadata as `reservation_deposit`, allowing the marketplace to reserve the listing while keeping the full-purchase flow available later.

## Transaction state machine

```text
pending_payment
  ├─ payment_intent_created → pending_payment
  ├─ payment_authorized → paid
  ├─ payment_failed/cancelled → cancelled
paid
  ├─ manual_capture → escrowed
  └─ refund/cancel_before_capture → refunded | cancelled
escrowed
  ├─ seller_release_transfer → completed
  ├─ refund → refunded
  └─ dispute_opened → disputed
disputed
  ├─ dispute_closed_buyer → refunded
  └─ dispute_closed_seller → completed
completed
  └─ receipt_issued + payout_paid
```

Every transition writes a `transaction_events` audit record. Stripe webhook ids are stored in `stripe_webhook_events` for idempotency.

## Platform fees and receipts

The platform fee is currently `max($0.99, 5%)` of the protected amount. `transaction_receipts` stores buyer/seller ids, item amount, shipping, tax, platform fee, seller net, Stripe payment/charge ids, and refund metadata.

## Refunds and disputes

- `POST /api/stripe/transactions/:id/refund` creates full or partial Stripe refunds and updates payment and transaction status.
- `POST /api/stripe/transactions/:id/dispute` opens an internal marketplace dispute.
- Stripe `charge.dispute.*` webhooks upsert provider disputes and mark the transaction disputed.

## Security rules

- Server routes require an authenticated Supabase user.
- Stripe secret key and service-role Supabase access stay server-side only.
- RLS allows buyers and sellers to read their own transactions, receipts, events, and seller payout state.
- Payment writes, webhook processing, payout writes, and receipt writes are restricted to admin/service-role flows.
- Stripe webhook signatures are verified with `STRIPE_WEBHOOK_SECRET` before any state mutation.
- Card data is collected only by Stripe.js Elements and never touches the application server.
