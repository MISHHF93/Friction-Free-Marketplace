# Store privacy and data-safety worksheet

Confirm this worksheet against the deployed production configuration before answering Apple or Google forms.

| Data category | Typical purpose | Linked to user | Tracking |
| --- | --- | --- | --- |
| Email, user ID, profile name | Authentication and account operation | Yes | No |
| Listing and message photos | User-created listings and conversations | Yes | No |
| Messages and support content | Buyer/seller communication and safety | Yes | No |
| Purchase and payout history | Transactions, refunds, disputes, compliance | Yes | No |
| Approximate/user-entered location | Local discovery and listing context | Usually | No |
| Usage and diagnostics | Reliability, analytics, fraud prevention | Depends on provider settings | No by default |
| AI prompts and listing content | Requested AI-assisted marketplace features | Usually | No |

Card data is collected directly by Stripe and must be disclosed according to the exact Stripe integration. Supabase, Stripe, PostHog, OpenAI, Resend, and Meilisearch configurations must be reviewed for retention, region, optional analytics capture, and account-linking behavior.

The application requests camera/photo access only for user-initiated uploads. It does not request contacts, microphone, precise location, health, or advertising identifier access in the current native configuration.
