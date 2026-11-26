# Friction-Free Marketplace roadmap

Production: frictionfree.co through Railway, owned by `garfieldgarwood45-collab`. Account and service handover steps are in [HANDOVER.md](HANDOVER.md).
Audit IDs (P0-1 and so on) refer to `ffm-reviews/r10-lifecycle-audit.md` (r10, Nov 20, 2026).
Items tagged **$**, **RLS** or **MIG** touch money logic, row-level security or migrations. They need explicit sign-off before work starts.

## Where we stand against competitors

Competitor details below come from third-party guides and help pages read in November 2026. Their fees change often, so re-check each company's own fee page before quoting them publicly.

| | Friction-Free | Facebook Marketplace | OfferUp | Mercari (US) | eBay |
| --- | --- | --- | --- | --- | --- |
| Local pickup sale | Paid in app, **held until the buyer confirms pickup** | Free, cash or P2P, **no protection** | Free, **no protection** on local deals | Shipping-first | Pickup option; cash being phased out in several countries |
| Who pays | Buyer: 5% protection fee (min $0.99). Seller: nothing | Seller: fee on shipped checkout sales (reported 5–10%, min ~$0.80) | Local: none | Seller ~10% + buyer ~3.6% protection fee | Moving to buyer-paid protection fee and fee-free private sellers outside the US (UK, FR, IT, AU) |
| Shipping | Seller sets shipping price; no labels yet | Seller buys own label | Reported ended in 2025 | Prepaid labels | Labels and shipping programs |
| Identity | Verification page and trust score | Facebook profile | TruYou ID badge | Account and payment checks | Account checks |
| Disputes | Evidence (notes, photos) reviewed by admins | Checkout orders only | Shipped orders only | Yes | Money Back Guarantee |

**Our edge:** the only one of these that protects the money in a *local, in-person* sale, holding it until the buyer confirms the handoff. Sellers keep 100% of their price. Lead with this in every surface: home, listing page, pricing, and app-store copy.

**Industry direction:** buyer-paid protection fees, no cash on pickup, and fee-free casual selling. Our model already fits that direction. The gaps worth closing are shipping labels, ID verification, ratings, and safe meetup guidance.

## Now: make launch safe

| Item | Why | Tags |
| --- | --- | --- |
| Go-live prerequisites: production env vars, `supabase db push`, Stripe webhooks, Auth URLs, PITR backups | [LAUNCH.md](LAUNCH.md), [HANDOVER.md](HANDOVER.md) | ops |
| Turn on Google sign-in (`NEXT_PUBLIC_OAUTH_PROVIDERS=google`) | Every competitor offers one-tap sign-up | ops |
| Configure Railway scheduled services for hourly jobs and 30-minute checkout expiry (P0-2) | Reconcile payments, release eligible payouts, and expire checkouts | ops |
| Merge the duplicate release paths, partial-refund cap (P1-4) | Payout correctness | $ |
| Sales tax on shipped orders remains 0 pending legal advice and a tax provider | Owner decision: defer tax collection for now; revisit before expanding shipped sales | $ |
| Error monitoring and uptime alerts (P1-15) | Errors only go to server logs today | ops |
| Set real ad prices at `/admin/ads/pricing` | Defaults are placeholders | ops |

## Next: close the gaps competitors have already closed

| Item | Competitor reference | Tags |
| --- | --- | --- |
| Ratings and reviews after a completed order, shown on seller profiles and cards | Standard on eBay, Mercari, OfferUp | MIG |
| Safe meetup guidance: suggested public spots and a pickup checklist inside the handoff flow | OfferUp promotes community meetup spots | |
| ID verification badge (Stripe Identity) layered on the existing verification page | OfferUp TruYou | $ |
| Prepaid shipping labels and tracking (e.g. Shippo or EasyPost) | Mercari, eBay | $, MIG |
| PWA notifications for messages, offers, and order steps | All competitor apps | |
| Price-drop and new-match alerts from saved searches and favorites | Mercari likes, eBay watchlist | |
| Notifications for shipped, delivered, auto-released, refunded, dispute resolved, payout (P1-2, P1-13) | Order clarity | |
| Admin "request info" on disputes (P1-14) | Dispute completeness | $ |
| One shared status vocabulary (`lib/status.ts`) for UI and API (P1-8, P2-9) | Consistent order states | |

## Later

| Item | Tags |
| --- | --- |
| Unified moderation case queue with reporter notifications (P2-10) | MIG |
| Accurate payout tracking, transfer to bank payout (P2-6) | $ |
| Listing expiry and renewal (P2-1) | MIG |
| Bundles and "make an offer on multiple items" | $ |
| Drop unused tables and enum values (P2-2, P2-3, P2-5) | MIG |
| Build-time guard against dev and test flags in production (P2-11) | |
| Remove the archived `database/migrations` tree (P1-12) | |
| PWA install and offline experience on iOS Safari and Android Chrome | ops |

## Done

- Expire abandoned checkouts (P0-1), account deletion blocked while orders are open (P0-5), listing moderation guard (P0-3, P1-7, P1-11), suspended and banned enforcement (P0-4): r10.
- Payouts required before publishing (P1-6); offers close with the listing (P1-10): r10.
- Accept-by deadline, 24h reminder, 72h auto-cancel (P1-1); duplicate notification triggers removed (P1-3); local pickup handoff (P1-5); dispute evidence (P1-9): r11.
- Self-serve advertising: r12.
- Repo cleanup of empty apps and stub services (P2-7, P2-8): Nov 23, 2026.
- Phone-first UI on every device, honest pricing page matching checkout (5% buyer protection fee), post-login open-redirect fix: Nov 23, 2026.
- zod 3 → 4 and openai 4 → 7 (closes GHSA-mrhx-c7xc-m3w5; `npm audit --omit=dev` is clean), with plain-language fallback validation messages: Nov 24, 2026.

### Sources (competitor research, November 2026)

- Facebook Marketplace fees: [Spocket](https://www.spocket.co/blogs/facebook-marketplace-fees), [US Chamber](https://www.uschamber.com/co/grow/marketing/how-to-use-facebook-marketplace-for-your-business), [Vendoo](https://blog.vendoo.co/everything-you-need-to-know-about-facebook-marketplace-fees)
- OfferUp: [TruYou help](https://help.offerup.com/hc/en-us/articles/360031993072), [Money Crashers review](https://www.moneycrashers.com/offerup-review/), [Voolist 2026 guide](https://www.voolist.com/blog/offerup-selling-guide-2026)
- Mercari: [Fees on Mercari](https://www.mercari.com/us/help_center/article/169/), [Fee FAQ](https://www.mercari.com/us/help_center/article/2518), [Value Added Resource](https://valueaddedresource.net/mercari-buyer-fees-10-percent-cap)
- eBay: [UK buyer protection fee](https://ebay.co.uk/help/buying/paying-items/buyer-protection-fee?id=5594), [Australia fee-free selling](https://www.valueaddedresource.net/ebay-australia-fee-free-selling/), [France and Italy](https://www.valueaddedresource.net/ebay-fee-free-private-sellers-france-italy/)
