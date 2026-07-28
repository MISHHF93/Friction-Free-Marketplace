# Global market readiness

The repository can be deployed globally from one codebase, but worldwide technical availability is not the same as commercial or legal availability in every country.

## Implemented foundation

- UTF-8 source and encoding verification
- Locale-aware currency, number, and date helpers
- ISO 4217 currency normalization
- Right-to-left direction utilities and layout foundations
- Unicode isolation for monetary values
- Responsive web, Android, and iOS targets from one repository
- Hosted HTTPS backend with native Capacitor shells

## Required before claiming support for a country

- Translate customer UI, transactional email, store copy, policies, and support content with professional review.
- Validate RTL screenshots and interaction flows for Arabic.
- Confirm Stripe and Stripe Connect availability, supported settlement currencies, payout timing, and seller onboarding requirements.
- Implement country-aware tax, invoicing, consumer cancellation, refund, warranty, privacy, retention, and marketplace reporting obligations.
- Replace fixed address assumptions with country, administrative area, locality, postal code, and international phone structures.
- Define prohibited and regulated-goods rules by jurisdiction.
- Configure regional data residency and subprocessors where legally required.
- Localize App Store and Google Play listings, screenshots, privacy declarations, and age/content ratings.
- Test low-bandwidth, high-latency, older-device, screen-reader, large-text, RTL, and non-Latin input behavior.

## Rollout model

1. Keep a country allowlist for commerce and seller onboarding.
2. Permit browsing only where transactions are not yet supported.
3. Enable currencies and payout countries only after provider and legal verification.
4. Release translations behind locale-level quality gates.
5. Monitor conversion, payment failures, support demand, fraud, and accessibility by region.

The platform should display truthful regional availability instead of silently allowing unsupported checkout or seller onboarding.
