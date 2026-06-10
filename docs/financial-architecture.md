# Financial Architecture

This document defines the production financial architecture for Friction-Free Marketplace using Stripe Connect Express, manual-capture buyer payments, platform fee accounting, seller payouts, refunds, disputes, revenue tracking, and reconciliation.

## Architecture Principles

- Stripe is the payment processor and source of truth for card authorization, capture, refunds, chargebacks, transfers, connected account status, and balance movements.
- Supabase Postgres is the marketplace operational ledger and source of truth for marketplace intent, participant permissions, transaction state, receipts, admin review, and reconciliation results.
- The platform does not market itself as an escrow provider. The product language should use "authorized", "captured", "held", "released", and "protected payment" rather than regulated escrow claims.
- Every money movement must be idempotent, evented, auditable, and reconcilable back to a Stripe object id.
- Money is calculated in integer minor units at API boundaries and persisted in decimal columns only after normalization. Any new shared package should keep fee math in cents.
- Buyers and sellers can read their own financial records. Only service-role, webhook, and authorized admin workflows can mutate payment, payout, refund, dispute, and reconciliation state.

## Core Components

The existing implementation already has these core records:

- `seller_payment_accounts`: Stripe Connect Express account mirror, onboarding requirements, charges/payout capability, and account status.
- `transactions`: marketplace order-level state for listing, offer, buyer, seller, amounts, taxes, platform fees, and fulfillment status.
- `escrow_payments`: Stripe PaymentIntent/Charge mirror for authorization, capture, hold, release, refund, and provider ids.
- `payouts`: seller transfer/payout mirror tied to a transaction.
- `disputes`: internal and Stripe dispute mirror.
- `transaction_events`: append-only transaction event stream for payment audit and lifecycle reconstruction.
- `transaction_receipts`: buyer/seller receipt snapshot.
- `stripe_webhook_events`: Stripe event idempotency and processing status.
- `audit_logs`: admin/system audit stream for privileged financial actions.

The production architecture should add these ledger and reconciliation records:

- `financial_ledger_entries`: immutable double-entry journal for each business event.
- `financial_accounts`: chart of accounts for platform cash, Stripe balance, seller payable, platform revenue, fees receivable, refunds, disputes, and chargeback losses.
- `platform_fee_rules`: versioned fee policy with effective dates, seller segment overrides, category overrides, and minimum/maximum fee caps.
- `refund_records`: normalized refund object mirror, including amount, reason, status, Stripe refund id, and reversal strategy.
- `payout_batches`: scheduled payout grouping for sellers when transfers are batched or delayed.
- `reconciliation_runs`: Stripe balance/report reconciliation execution metadata.
- `reconciliation_items`: per-object reconciliation comparison and exception status.

## State Model

### Transaction States

`pending_payment` is created before Stripe confirmation. Webhooks move it to `paid` when authorization succeeds. Seller capture moves it to `escrowed`. Buyer release or admin settlement moves it to `completed`. Refunds move it to `refunded` when fully refunded. Disputes move it to `disputed` until resolved.

Allowed production transitions:

- `pending_payment -> paid` when `payment_intent.amount_capturable_updated` confirms authorization.
- `pending_payment -> cancelled` when PaymentIntent fails, expires, or is canceled.
- `paid -> escrowed` when the manual capture succeeds.
- `paid -> refunded` when an uncaptured authorization is canceled or refunded.
- `escrowed -> completed` when seller transfer succeeds and receipt is issued.
- `escrowed -> refunded` when buyer refund succeeds before seller release.
- `escrowed -> disputed` when buyer or Stripe opens a dispute.
- `disputed -> completed` when seller wins and funds are released or retained.
- `disputed -> refunded` when buyer wins or admin issues a buyer settlement.

### Payment States

`escrow_payments.status` mirrors processor movement:

- `requires_action`: PaymentIntent requires buyer confirmation or authentication.
- `authorized`: PaymentIntent is authorized and capturable.
- `held`: PaymentIntent is captured to the platform Stripe balance.
- `released`: seller transfer has been created and transaction is completed.
- `refunded`: fully refunded.
- `failed` or `cancelled`: authorization failed or was canceled.

### Payout States

`payouts.status` should represent seller settlement, not just Stripe payout status:

- `pending`: release is approved but not yet submitted.
- `scheduled`: transfer or payout is queued for execution.
- `paid`: Stripe Transfer succeeded to the connected account.
- `failed`: transfer failed or connected account became restricted.
- `cancelled`: release was canceled before transfer.

## Buyer Payments

Buyer checkout uses Stripe PaymentIntents with `capture_method=manual`.

Flow:

1. Buyer starts checkout from an active listing or accepted offer.
2. Server validates listing availability, buyer/seller separation, seller Connect readiness, price snapshot, and fraud/trust restrictions.
3. Server calculates item amount, shipping, tax, and platform fee using the active `platform_fee_rules` version.
4. Server creates `transactions` and `escrow_payments` with provider ids and idempotency keys.
5. Server creates a Stripe PaymentIntent with `transfer_group=transaction_<transaction_id>` and transaction metadata.
6. Buyer confirms payment with Stripe Elements client-side.
7. Stripe webhook authorizes the payment, updates `escrow_payments`, updates `transactions`, and writes `transaction_events`.

Production requirements:

- Use idempotency keys for transaction creation, PaymentIntent creation, capture, refund, transfer, and dispute mutation.
- Capture authorization before `capture_before`; expired authorizations must cancel the transaction and release the listing.
- Price snapshots must be immutable once checkout begins.
- Seller Connect account must be `active`, `charges_enabled`, and not restricted.
- Fraud and trust checks can block checkout or require admin review before capture.

## Platform Fees

The current fee rule is `max($0.99, 5%)`. In production, this must be versioned and auditable.

Fee calculation inputs:

- item amount
- shipping amount
- tax amount
- listing category
- seller segment
- buyer location and tax jurisdiction
- promotion or coupon adjustments
- trust/safety risk surcharge, if enabled by policy

Fee outputs:

- `marketplace_fee_amount`
- `platform_fee_rule_id`
- `fee_basis_amount`
- fee metadata containing the exact percentage, minimum, maximum, category override, and effective version

Accounting treatment:

- Buyer pays total amount.
- Platform fee becomes platform revenue only when the transaction is completed or when policy says captured fees are non-refundable.
- Before completion, platform fee is deferred revenue or fee liability.
- Refunds reverse platform revenue proportionally unless policy explicitly absorbs the fee.

## Seller Payouts

The architecture uses separate charges and transfers:

- Buyer PaymentIntent is captured on the platform account.
- Seller payout is a Stripe Transfer to the seller connected account.
- `transfer_group` ties PaymentIntent, Charge, Transfer, transaction, and ledger entries together.

Release flow:

1. Transaction reaches `escrowed`.
2. Buyer confirms completion, delivery window expires, or admin resolves in seller favor.
3. Server verifies no open dispute, refund hold, account restriction, or fraud hold.
4. Server creates Stripe Transfer to the seller connected account for seller net amount.
5. Server records `payouts`, updates `escrow_payments` to `released`, updates `transactions` to `completed`, issues receipt, and writes `transaction_events`.

Payout controls:

- Do not release funds while transaction is `disputed`.
- Do not release when seller Connect account has `payouts_enabled=false` or account is restricted.
- Support payout holds by risk score, new seller tenure, category, high-value item, or admin action.
- Support retryable payout failures and idempotent transfer retries.
- Track transfer reversals separately when refunds or disputes occur after release.

## Refunds

Refunds can occur before capture, after capture but before release, or after release.

Before capture:

- Cancel PaymentIntent or refund authorization when needed.
- Mark payment `cancelled` or `refunded`.
- Mark transaction `cancelled` or `refunded`.
- Return listing to `active` if it was reserved.

After capture before release:

- Create Stripe Refund against the PaymentIntent/Charge.
- Reduce `escrow_payments.refunded_amount`.
- Fully refunded transactions become `refunded`.
- Partial refunds remain in their current state with adjusted ledger entries.

After release:

- Create Stripe Refund if possible.
- Create Transfer Reversal against the seller transfer when seller funds must be recovered.
- If transfer reversal fails, record seller negative balance or platform loss depending on policy.

Refund records must include:

- Stripe refund id
- transaction id
- payment id
- actor id
- reason
- requested amount
- succeeded amount
- fee refund policy
- transfer reversal id
- status
- provider error

## Disputes

There are two dispute types:

- Internal marketplace disputes opened by buyer or seller in the product.
- Stripe charge disputes opened by the cardholder through the issuing bank.

Internal dispute flow:

1. Participant opens a dispute for an eligible transaction.
2. Transaction moves to `disputed`.
3. Payout release is blocked.
4. Evidence window opens with buyer/seller artifacts.
5. Admin/support resolves buyer-favor, seller-favor, split settlement, or cancellation.
6. Resolution creates refund, transfer, or reversal entries as needed.

Stripe dispute flow:

1. `charge.dispute.created` webhook verifies and stores provider dispute.
2. Transaction moves to `disputed`.
3. Seller payout is held or reversal strategy is evaluated.
4. Evidence is assembled from listing, messages, receipts, delivery, identity, and support artifacts.
5. `charge.dispute.updated` and `charge.dispute.closed` webhooks update dispute status.
6. Ledger records win/loss, fees, reversals, and platform losses.

Dispute controls:

- Never release seller funds while Stripe dispute is open.
- Maintain evidence snapshots that cannot be overwritten.
- Require admin permission for final internal settlement.
- Emit notifications to both parties on open, evidence due, review, and close.

## Revenue Tracking

Revenue reporting must separate gross merchandise value, buyer-paid total, seller net, platform fee, tax, shipping, refunds, chargeback losses, and net revenue.

Core metrics:

- GMV: sum of completed transaction item amounts.
- Buyer gross paid: item + shipping + tax + platform fee.
- Platform gross revenue: platform fees earned.
- Net revenue: platform gross revenue minus refunded fees, dispute losses, Stripe fees, credits, and adjustments.
- Seller payable: captured funds owed to sellers but not yet transferred.
- Seller paid: seller transfers completed.
- Held balance: captured funds not yet released, refunded, or disputed.
- Refund rate: refunded amount divided by captured amount.
- Dispute rate: disputed count and disputed amount divided by completed count and GMV.
- Reconciliation exceptions: unmatched or amount-mismatched Stripe objects.

Revenue recognition:

- Recognize platform fee revenue when transaction is `completed`, not at authorization.
- Defer fees while transaction is `pending_payment`, `paid`, `escrowed`, or `disputed`.
- Reverse recognized revenue on post-completion refund if policy refunds platform fees.
- Record chargeback fees and unrecovered seller reversals as losses.

## Ledger Design

Every financial event must write balanced ledger entries. Each entry has:

- `journal_id`
- `transaction_id`
- `source_type`
- `source_id`
- `account`
- `direction`
- `amount`
- `currency`
- `occurred_at`
- `provider`
- `provider_object_id`
- `metadata`

Suggested chart of accounts:

- `stripe_cash`
- `buyer_receivable`
- `seller_payable`
- `platform_fee_deferred`
- `platform_fee_revenue`
- `tax_liability`
- `shipping_liability`
- `refunds_payable`
- `dispute_hold`
- `chargeback_loss`
- `stripe_processing_fees`
- `seller_transfer_reversal_receivable`

Example journals:

- Authorization: record buyer commitment and capturable authorization metadata; do not recognize cash.
- Capture: debit Stripe cash, credit seller payable, credit deferred platform fee, credit tax/shipping liability.
- Completion: debit deferred platform fee, credit platform fee revenue; debit seller payable, credit Stripe cash for transfer.
- Refund before release: debit seller payable/deferred fee/tax/shipping liability, credit Stripe cash.
- Dispute loss: debit chargeback loss/deferred fee, credit Stripe cash.

## Reconciliation

Reconciliation runs compare Supabase operational records with Stripe reports and balance transactions.

Inputs:

- Stripe Balance Transactions
- PaymentIntents
- Charges
- Refunds
- Transfers
- Transfer Reversals
- Disputes
- Connected account status
- Supabase `transactions`, `escrow_payments`, `payouts`, `refund_records`, `disputes`, `transaction_events`, and ledger entries

Daily reconciliation:

1. Pull Stripe balance transactions for the prior UTC day plus a rolling three-day correction window.
2. Match by `transaction_id`, `transfer_group`, PaymentIntent id, Charge id, Refund id, Transfer id, or Dispute id.
3. Compare amount, currency, status, and timestamp tolerance.
4. Mark matched items `matched`.
5. Mark missing Stripe objects, missing internal records, amount mismatches, currency mismatches, stale holds, and stale payouts as exceptions.
6. Create admin tasks for exceptions that exceed tolerance.
7. Produce reconciliation summary metrics for finance/admin.

Reconciliation tolerances:

- Amount tolerance should be zero for principal amounts.
- Timestamp tolerance can be configurable because Stripe availability can lag.
- Currency mismatches are always critical.
- Missing internal records for Stripe money movements are critical.
- Missing Stripe records for completed internal payouts are critical.

## API and Job Boundaries

Buyer-facing:

- `POST /api/stripe/payment-intents`: create transaction and PaymentIntent.
- `POST /api/stripe/transactions/:id/capture`: seller captures authorization into held funds.
- `POST /api/stripe/transactions/:id/release`: buyer releases held funds to seller.
- `POST /api/stripe/transactions/:id/refund`: seller/admin refund path.
- `POST /api/stripe/transactions/:id/dispute`: internal dispute path.

Seller-facing:

- `POST /api/stripe/connect/onboard`: create/reuse Express account and Account Link.
- `GET /api/stripe/connect/status`: refresh account status.
- `POST /api/stripe/connect/login-link`: access Stripe Express dashboard.

System:

- `POST /api/stripe/webhooks`: Stripe-signed webhook ingestion.
- `financial.reconcile.daily`: scheduled reconciliation job.
- `financial.capture-expiring-authorizations`: scheduled authorization expiration monitor.
- `financial.release-eligible-payouts`: scheduled release job for transactions that pass policy checks.
- `financial.retry-failed-payouts`: scheduled transfer retry job.
- `financial.refresh-connect-accounts`: scheduled Connect account requirement refresh.

Admin:

- Revenue dashboard
- Transactions directory
- Payments directory
- Payouts directory
- Refunds directory
- Disputes queue
- Reconciliation exceptions queue
- Ledger journal explorer

## Security and Compliance

- Card data must only pass through Stripe.js and Stripe-hosted surfaces.
- Webhooks must verify `Stripe-Signature`, livemode, payload size, and event idempotency.
- All provider object ids must be unique where Stripe guarantees uniqueness.
- All mutating financial API routes must use service-role Supabase only after application-layer authorization.
- RLS must restrict participant reads and block participant writes to payment records.
- Admin financial actions must require explicit permissions and write `audit_logs`.
- PII and payment metadata should be minimized in logs.
- Evidence and receipt snapshots must be immutable after issuance or dispute submission.

## Observability

Operational events:

- payment intent creation failures
- webhook processing failures
- authorization nearing capture deadline
- capture failures
- transfer failures
- refund failures
- dispute opened/closed
- reconciliation exception created/resolved
- Connect account restricted

Dashboards:

- gross payment volume
- held funds
- seller payable aging
- payout failures
- refund rate
- dispute rate
- net revenue
- reconciliation exceptions by severity
- webhook lag and failure rate

Alerts:

- webhook processing error rate above threshold
- authorizations expiring within 24 hours
- seller payable older than policy
- failed transfer retry exhausted
- Stripe balance mismatch
- high-value dispute opened
- Connect account restricted after active sales

## Implementation Roadmap

1. Add ledger and reconciliation schema.
2. Replace inline fee calculation with versioned fee policy.
3. Add idempotency keys to every Stripe mutation.
4. Add normalized refund records and transfer reversal support.
5. Add payout holds and payout eligibility policy.
6. Build reconciliation jobs against Stripe balance transactions.
7. Add finance admin surfaces for revenue, ledger, payout, refund, and reconciliation exceptions.
8. Add alerting for stale holds, failed transfers, webhook failures, and reconciliation mismatches.
