# Release evidence

Use one copy of this document for each staged release. Record evidence links or artifact names, not only pass/fail claims.

## Release identity

- Commit:
- Web deployment:
- Release/store version:
- Build number:
- Supabase project/environment:
- Stripe mode and account:
- Test date:
- Testers:

## Automated evidence

- [ ] CI matrix passed from a clean checkout:
- [ ] Fresh `supabase db reset` artifact:
- [ ] Production proof workflow artifact:
- [ ] Dependency audit reviewed:
- [ ] Browser/client secret scan:
- [ ] Android AAB artifact:
- [ ] iOS IPA/TestFlight build:

## Buyer and seller transaction

- [ ] Seller account created and required verification state confirmed.
- [ ] Stripe Connect onboarding completed in the intended Stripe environment.
- [ ] Seller created a draft with camera/photo upload.
- [ ] AI-generated listing content was reviewed rather than automatically published.
- [ ] Listing was published and appeared in search.
- [ ] Buyer saved the listing and started a conversation.
- [ ] Buyer and seller exchanged messages and an offer/counteroffer.
- [ ] Buyer authorized a test payment.
- [ ] Stripe webhook updated the transaction and protected-payment records.
- [ ] Seller fulfilled the test order.
- [ ] Payment capture/release completed.
- [ ] Buyer and seller dashboards reflected the final state.
- [ ] Refund path tested:
- [ ] Dispute path tested:

Record listing, conversation, offer, transaction, PaymentIntent, webhook event, and audit-event identifiers here:

## Trust, safety, and account lifecycle

- [ ] A listing or message report reached the admin review queue.
- [ ] Trust/risk explanations were visible without exposing private evidence.
- [ ] Verification UI accurately distinguished self-attested/pending checks from provider-verified checks.
- [ ] Account deletion anonymized personal data and signed the user out.
- [ ] Required transaction and ledger references remained intact.

## Platform coverage

| Journey | Desktop web | Mobile web | Android device | iOS device |
| --- | --- | --- | --- | --- |
| Signup/login callback |  |  |  |  |
| Search and listing detail |  |  |  |  |
| Camera/photo listing |  |  |  |  |
| Messaging and offer |  |  |  |  |
| Protected checkout |  |  |  |  |
| Deep link |  |  |  |  |
| Offline recovery |  |  |  |  |
| Sharing |  |  |  |  |
| Account deletion |  |  |  |  |

## Release decision

- [ ] Every required row above passed or has an approved, linked risk acceptance.
- [ ] Legal/privacy/store declarations match the deployed providers and behavior.
- [ ] Monitoring and rollback owner confirmed.
- Decision: approve / reject
- Approver:
- Evidence or risk-acceptance links:
