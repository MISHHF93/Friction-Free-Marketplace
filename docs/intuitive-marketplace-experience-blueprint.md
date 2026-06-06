# Intuitive Marketplace Experience Blueprint

## Executive intent

This blueprint translates the product judgment of iconic design-led companies into one marketplace system: calm like Apple, human and trust-rich like Airbnb, financially precise like Stripe, real-time like Uber, and modular like Notion. The goal is not to copy those companies, but to apply their strongest experience principles to a marketplace where buyers, sellers, and AI agents can move from intent to successful completion with almost no friction.

The product promise is: **tell the marketplace what outcome you want, understand every risk before you commit, and complete the transaction with guided confidence.**

## Design principles

1. **Intent before interface:** users should begin with goals, photos, voice, or pasted links before choosing categories, filters, or forms.
2. **One obvious next step:** every screen has one dominant action, one safe fallback, and contextual help only when needed.
3. **Trust at the moment of doubt:** protection, verification, condition, pricing, fulfillment, and dispute policies appear exactly where users hesitate.
4. **Structured conversation:** chat is useful, but commitments become explicit offer cards with terms, expiration, and state.
5. **Progressive depth:** beginners get guidance; experts get speed, templates, shortcuts, and automation.
6. **System memory:** the marketplace remembers preferences, sizes, locations, deal breakers, seller policies, saved searches, and recurring listing workflows.
7. **Human control over AI:** AI drafts, compares, summarizes, negotiates within limits, and warns about risk, but users approve irreversible actions.
8. **Completion over engagement:** the experience optimizes for successful transactions, low regret, and durable reputation, not time spent browsing.

## Experience architecture

### Global shell

- **Top command bar:** natural-language marketplace search, AI assistant entry, notifications, and account switcher.
- **Left rail on desktop:** Home, Discover, Messages, Deals, Transactions, Sell, Reputation, Insights, Settings.
- **Mobile tab bar:** Home, Search, Inbox, Activity, Me.
- **Right context panel:** adaptive assistant, trust brief, transaction timeline, checklist, or negotiation summary.
- **Universal status language:** draft, active, interested, offer sent, negotiating, accepted, paid, preparing, in transit, delivered, confirming, completed, disputed, archived.

### Primary object model

- **Listing:** the public marketplace object with price, media, condition, availability, location, seller policy, and trust evidence.
- **Conversation:** the relationship space between buyer and seller.
- **Offer:** the structured commitment object containing price, quantity, fulfillment, timing, contingencies, expiration, and protections.
- **Transaction:** the execution object containing payment, escrow, shipping, pickup, proof, confirmation, refunds, and reviews.
- **Reputation record:** verified behavioral history across roles, categories, locations, and transaction types.

## 1. Homepage

### Experience goal

Make visitors feel oriented in under five seconds: what this marketplace does, why it is safe, how to search, and how to sell.

### Flow

1. Visitor lands on a sparse homepage with a strong promise and one intelligent input.
2. Visitor types, speaks, uploads a photo, pastes a product URL, or chooses a category.
3. AI converts the intent into suggested searches, filters, price ranges, fulfillment options, and trust requirements.
4. Visitor sees a preview of matches, local liquidity, and protection rules before signing up.
5. If buying, the user continues into results; if selling, the user enters listing creation with the original intent prefilled.
6. Account creation appears only when the visitor saves, messages, offers, or publishes.

### Wireframe description

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Logo      Explore   How it works   Trust   Sell                 Sign in   │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Buy and sell with confidence, from first question to final payment.        │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Ask, upload, or paste: “Find a verified used road bike under $800...” │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│  [Search]  [Upload photo]  [Start selling]                                  │
│                                                                            │
│  Popular intents: [Move-out deals] [Verified electronics] [Local services]  │
│                                                                            │
├────────────────────────────────────────────────────────────────────────────┤
│  Live marketplace pulse                                                     │
│  12,840 protected transactions this month · 94% on-time fulfillment         │
│                                                                            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │ Listing card │ │ Listing card │ │ Listing card │ │ Listing card │       │
│  │ Photo        │ │ Photo        │ │ Photo        │ │ Photo        │       │
│  │ Price        │ │ Price        │ │ Price        │ │ Price        │       │
│  │ Trust tags   │ │ Trust tags   │ │ Trust tags   │ │ Trust tags   │       │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘       │
├────────────────────────────────────────────────────────────────────────────┤
│  Why people trust it: protected payments · verified profiles · guided deals │
└────────────────────────────────────────────────────────────────────────────┘
```

### Key states

- Empty intent input with examples.
- Search interpretation preview.
- Local marketplace pulse unavailable.
- Signed-out save/message/offer gate.
- Low-liquidity category with request-to-source option.

## 2. Onboarding

### Experience goal

Create a trustworthy account without making onboarding feel like paperwork.

### Flow

1. User chooses primary intent: buy, sell, both, browse, or manage business inventory.
2. User enters lightweight profile details and preferred location radius.
3. AI asks only relevant preference questions based on intent.
4. Trust setup is staged: basic account first, stronger verification when the user wants to message, offer, list high-risk goods, receive payouts, or transact above thresholds.
5. User lands in a personalized dashboard with a checklist and one recommended first action.

### Wireframe description

```text
┌────────────────────────────────────────────────────────────────────┐
│ Welcome                                                            │
├────────────────────────────────────────────────────────────────────┤
│ What are you here to do first?                                     │
│                                                                    │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │
│ │ Buy         │ │ Sell        │ │ Buy + sell  │ │ Business    │    │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘    │
│                                                                    │
│ Step 1 of 4                                                        │
│ [Continue]                                                         │
└────────────────────────────────────────────────────────────────────┘
```

### Onboarding modules

- **Intent capture:** immediate personalization by role and category interest.
- **Preference setup:** budget, radius, delivery tolerance, category interests, brand preferences, and risk sensitivity.
- **Trust setup:** phone, email, government ID, business credentials, payout method, payment method, and optional social proof.
- **Safety education:** three concise cards explaining protected payments, off-platform risks, and dispute support.
- **First action checklist:** save a search, verify profile, create a listing, or follow a category.

## 3. Buyer dashboard

### Experience goal

Give buyers a mission control center for discovery, decisions, active deals, and post-purchase tasks.

### Flow

1. Buyer opens dashboard and sees active intents, saved searches, watched listings, negotiations, and transactions.
2. AI highlights what changed: new matches, price drops, seller replies, expiring offers, and required confirmations.
3. Buyer can compare listings, ask AI to shortlist, message sellers, or make a protected offer.
4. Once a transaction starts, the dashboard shifts from discovery to timeline management.
5. Completed transactions feed into records, warranties, reviews, and recommendations.

### Wireframe description

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Buyer dashboard                                           Ask AI ▣         │
├───────────────┬───────────────────────────────────────┬────────────────────┤
│ Navigation    │ Today                                 │ Context panel      │
│ Home          │ ┌───────────────────────────────────┐ │ AI brief           │
│ Saved         │ │ 3 new matches for “standing desk” │ │ “Two sellers reply │
│ Offers        │ │ [Review matches]                  │ │ fastest; one has   │
│ Transactions  │ └───────────────────────────────────┘ │ stronger history.” │
│ Reputation    │                                       │                    │
│               │ Active decisions                     │ Trust filters      │
│               │ ┌────────────┐ ┌────────────┐        │ [Verified only]    │
│               │ │ Compare A  │ │ Offer B    │        │ [Protected pay]    │
│               │ └────────────┘ └────────────┘        │                    │
│               │ Transaction timeline                  │                    │
└───────────────┴───────────────────────────────────────┴────────────────────┘
```

### Core modules

- **Intent cards:** saved goals that continuously collect matches.
- **Decision board:** compare, message, negotiate, inspect, and buy.
- **Active deal rail:** expiring offers, unread messages, payment tasks, delivery changes, and confirmation deadlines.
- **Purchase vault:** receipts, warranties, inspection photos, service records, and resale suggestions.
- **Buyer coaching:** reminders to avoid off-platform payment, unclear terms, or risky pickup situations.

## 4. Seller dashboard

### Experience goal

Help sellers understand what to do now to sell faster, earn safely, and improve reliability.

### Flow

1. Seller opens dashboard and sees revenue, active listings, offers, response tasks, inventory health, and payout status.
2. AI ranks the most valuable actions: respond to buyer, lower price, add photo, accept bundle, schedule pickup, or relist.
3. Seller manages listings in board, table, or calendar views.
4. Accepted offers become fulfillment checklists with deadlines and proof requirements.
5. Completed sales generate payout records, tax exports, reputation feedback, and relisting suggestions.

### Wireframe description

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Seller dashboard                                      Create listing +     │
├───────────────┬────────────────────────────────────────┬───────────────────┤
│ Navigation    │ Revenue + tasks                        │ Seller coach      │
│ Overview      │ This week: $2,840 pending · $1,120 paid │ “Your response    │
│ Listings      │                                        │ time is top 8%.”  │
│ Offers        │ Priority tasks                         │                   │
│ Orders        │ [Reply to Maya] [Ship camera] [Fix ad] │ Pricing insights  │
│ Payouts       │                                        │ Demand: high      │
│ Insights      │ Inventory                              │ Suggested price   │
│               │ ┌────────────┐ ┌────────────┐         │ range: $420-460   │
│               │ │ Active     │ │ Needs work │         │                   │
│               │ └────────────┘ └────────────┘         │                   │
└───────────────┴────────────────────────────────────────┴───────────────────┘
```

### Core modules

- **Action queue:** highest-impact tasks ranked by urgency and expected revenue impact.
- **Inventory health:** stale, underpriced, overpriced, missing proof, low-quality photos, or policy gaps.
- **Offer inbox:** structured offers with buyer reputation, risk indicators, and one-tap counter actions.
- **Fulfillment center:** packing, scheduling, pickup, delivery, proof upload, and deadline management.
- **Payout center:** pending, available, paid, held, disputed, tax exports, and fee breakdowns.

## 5. Messaging

### Experience goal

Keep human connection while preventing chat from becoming ambiguous, unsafe, or inefficient.

### Flow

1. Buyer starts from listing, seller profile, offer, or transaction.
2. Message thread opens with listing context pinned at top.
3. AI summarizes prior context, suggests safe questions, and detects missing terms.
4. When either party discusses price, timing, delivery, bundle, or condition, the system suggests converting it into an offer card.
5. Risky content triggers quiet warnings, stronger confirmation, or trust-and-safety intervention.
6. Transaction-critical decisions are stored as structured objects, not buried in chat.

### Wireframe description

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Messages                                                                  │
├───────────────┬────────────────────────────────────────┬───────────────────┤
│ Thread list   │ Conversation                           │ Deal context      │
│ Maya · Desk   │ ┌ Listing: Walnut desk · $240 ───────┐ │ Seller verified   │
│ Omar · Bike   │ │ Offer status: Draft terms detected │ │ 4.9 reliability   │
│ Lina · Camera │ └────────────────────────────────────┘ │ Protected payment │
│               │ Buyer: Can you deliver Sunday?         │ recommended       │
│               │ Seller: Yes, for $25.                  │                   │
│               │                                        │ Missing terms     │
│               │ [Create offer: $240 + $25 delivery]    │ Delivery window   │
│               │ ┌────────────────────────────────────┐ │ Inspection rule   │
│               │ │ Type a message...                  │ │                   │
│               │ └────────────────────────────────────┘ │                   │
└───────────────┴────────────────────────────────────────┴───────────────────┘
```

### Core modules

- **Pinned context:** listing, participants, trust status, active offer, and transaction state.
- **Smart composer:** message, offer, counteroffer, schedule, attach proof, request verification, or escalate.
- **AI recap:** concise history, open questions, and recommended next step.
- **Safety guardrails:** phone/payment sharing warnings, harassment detection, prohibited-item detection, and suspicious urgency alerts.
- **Evidence mode:** preserves claims, photos, condition confirmations, and agreements for dispute resolution.

## 6. Negotiation experience

### Experience goal

Make negotiation feel fair, fast, and explicit, without removing the human ability to compromise.

### Flow

1. Buyer taps **Make offer** or AI suggests an offer from conversation.
2. Offer builder asks for price, fulfillment, timing, contingencies, expiration, and optional note.
3. System shows fair-market guidance, seller preferences, buyer protection, and likelihood of acceptance.
4. Seller receives a structured offer card with accept, counter, decline, ask question, or bundle options.
5. Counters preserve version history and highlight changed terms.
6. When accepted, the offer locks into checkout; if it expires, either party can revive with updated terms.

### Wireframe description

```text
┌────────────────────────────────────────────────────────────────────┐
│ Make an offer                                                      │
├────────────────────────────────────┬───────────────────────────────┤
│ Terms                              │ Guidance                      │
│ Price:           [$220]            │ Similar sold: $210-$255       │
│ Delivery:        [Seller delivers] │ Seller minimum likely: $225   │
│ Delivery fee:    [$25]             │ Acceptance chance: High       │
│ Pickup window:   [Sun 2-5 PM]      │ Protection: payment held      │
│ Inspection:      [10 minutes]      │                               │
│ Expires:         [24 hours]        │ Changed from last counter:    │
│ Note:            [Optional]        │ + delivery, - $15 price       │
│                                    │                               │
│ [Send protected offer]             │                               │
└────────────────────────────────────┴───────────────────────────────┘
```

### Core modules

- **Fairness meter:** compares offer with market, seller settings, demand, and condition.
- **Term chips:** price, quantity, bundle, delivery, pickup, deposit, service scope, inspection, return window, and expiration.
- **Counter history:** versioned timeline showing exactly what changed.
- **Auto-rules:** sellers can auto-accept, auto-decline, or auto-counter within boundaries.
- **AI negotiation copilot:** proposes language and terms but requires user approval before sending.

## 7. Listing creation

### Experience goal

Turn almost anything into a trustworthy, high-quality listing in minutes.

### Flow

1. Seller uploads photos, scans a barcode, imports inventory, pastes a product URL, or describes the item/service.
2. AI identifies category, title, condition, attributes, comparable prices, shipping options, and required disclosures.
3. Seller confirms or edits the generated listing.
4. Photo coach requests missing proof: serial number, dimensions, defects, scale, receipt, certificate, or service scope.
5. Seller chooses price strategy, negotiation rules, fulfillment options, and protection policy.
6. System checks compliance and trust completeness.
7. Seller previews the listing as buyers will see it, then publishes.

### Wireframe description

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Create listing                                                Preview ▣    │
├───────────────────────────────────┬────────────────────────────────────────┤
│ Media                             │ AI draft                               │
│ ┌──────────┐ ┌──────────┐         │ Title: Herman Miller Aeron Chair       │
│ │ Photo 1  │ │ Add      │         │ Category: Office furniture             │
│ └──────────┘ └──────────┘         │ Condition: Very good                   │
│ Photo coach: add close-up of wear │ Price: $520 suggested                  │
│                                   │ Description: [editable draft]          │
│                                   │                                        │
│                                   │ Trust completeness: 86%                │
│                                   │ [Add receipt] [Set delivery] [Publish] │
└───────────────────────────────────┴────────────────────────────────────────┘
```

### Core modules

- **Creation inputs:** photos, video, barcode, URL, receipt, inventory file, voice note, or template.
- **Condition wizard:** objective defects, usage, dimensions, included parts, authenticity, and known limitations.
- **Pricing strategy:** sell fast, balanced, maximize price, auction, bundle, rental, or service quote.
- **Negotiation settings:** allow offers, minimum price, auto-accept, auto-counter, bundle rules, and hold deposit.
- **Compliance:** prohibited goods, regulated categories, age-gated items, licenses, recalls, counterfeit risk, and required disclosures.

## 8. Transaction experience

### Experience goal

Make payment, fulfillment, confirmation, payout, refunds, and disputes feel understandable and controlled.

### Flow

1. Accepted offer or buy-now action opens checkout.
2. Buyer reviews final terms, total cost, protection, timeline, cancellation rules, and refund conditions.
3. Buyer pays through protected payment or escrow where appropriate.
4. Seller receives a fulfillment checklist with deadline, address rules, proof expectations, and payout timing.
5. Timeline updates both parties in real time.
6. Buyer confirms receipt/completion or reports an issue within the dispute window.
7. Funds release automatically based on confirmation, delivery evidence, or policy.
8. Both parties complete reputation prompts and receive records.

### Wireframe description

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Checkout                                                                   │
├──────────────────────────────────────┬─────────────────────────────────────┤
│ Review your transaction              │ Payment + protection                │
│ Item: Walnut desk                    │ Item price                 $240     │
│ Fulfillment: Seller delivery         │ Delivery                    $25     │
│ Window: Sunday 2-5 PM                │ Platform protection          $8     │
│ Inspection: 10 minutes               │ Tax                         $18     │
│ Cancellation: until seller departs   │ Total                      $291     │
│                                      │ Funds held until delivery confirmed │
│ Timeline                             │                                     │
│ Offer accepted → Pay → Deliver →     │ [Pay protected]                     │
│ Confirm → Funds released             │                                     │
└──────────────────────────────────────┴─────────────────────────────────────┘
```

### Core modules

- **Cost breakdown:** item/service, delivery, platform fee, taxes, discounts, deposits, refundability, and payout timing.
- **Timeline:** accepted, paid, preparing, shipped/scheduled, delivered, inspecting, confirmed, released, reviewed.
- **Proof capture:** tracking, pickup code, geotagged handoff, inspection photos, service completion, or signed acceptance.
- **Issue resolution:** missing item, damaged item, not as described, late fulfillment, no-show, partial work, or payment hold.
- **Records vault:** receipt, invoice, warranty, serial number, service agreement, delivery proof, tax export, and resale starter.

## 9. Reputation experience

### Experience goal

Replace vague star ratings with context-specific, verified trust that helps people decide and improve.

### Flow

1. After completion, both sides receive a brief review prompt tailored to the transaction type.
2. Review captures objective behaviors: accuracy, communication, punctuality, packaging, issue resolution, cleanliness, professionalism, or payment reliability.
3. Written feedback is optional; AI suggests concise, non-abusive summaries.
4. System turns verified behavior into reputation facets by role, category, geography, and fulfillment method.
5. Public profile shows strengths, transaction volume, recent reliability, verification, and policy compliance.
6. Private dashboard shows improvement coaching and how actions affect ranking, fees, and trust badges.

### Wireframe description

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Reputation profile                                                         │
├──────────────────────────────────────┬─────────────────────────────────────┤
│ Maya Chen                            │ Verified strengths                  │
│ 4.9 overall · 128 completed deals    │ ✓ Ships on time: 97%                │
│ ID verified · Protected pay enabled  │ ✓ Accurate condition: 96%           │
│                                      │ ✓ Fast response: median 12 min      │
│ Category expertise                   │                                     │
│ Furniture: Expert                    │ Recent review themes                │
│ Electronics: Strong                  │ “Clear photos, flexible pickup,     │
│ Local delivery: Excellent            │ carefully packed items.”            │
│                                      │                                     │
│ [View transaction history]           │ [Report review issue]               │
└──────────────────────────────────────┴─────────────────────────────────────┘
```

### Core modules

- **Reputation facets:** accuracy, responsiveness, punctuality, fulfillment, condition honesty, payment reliability, dispute behavior, and repeat rate.
- **Contextual badges:** verified seller, expert in category, safe pickup host, fast shipper, reliable buyer, business verified, identity verified.
- **Review quality controls:** double-blind reviews, abuse detection, evidence links, moderation, appeal, and outdated-review decay.
- **Private coaching:** concrete suggestions such as add proof photos, respond within one hour, set clearer policies, or avoid cancellations.
- **Trust portability:** exportable business profile, references, and transaction summaries where legally and policy appropriate.

## 10. AI assistant experience

### Experience goal

Make AI feel like a calm marketplace concierge that understands intent, reduces work, and protects users from mistakes.

### Flow

1. User opens AI from command bar, dashboard, listing, message, offer, or transaction.
2. Assistant understands current object context and asks at most one clarifying question.
3. Assistant offers action cards: search, compare, draft, summarize, price, negotiate, schedule, inspect risk, resolve issue, or create listing.
4. For reversible actions, AI can execute after confirmation; for irreversible actions, AI presents a review screen before sending, paying, accepting, publishing, or escalating.
5. Assistant learns from user corrections and updates preferences, templates, and automation rules.
6. Assistant keeps an audit trail for actions taken, drafts generated, and decisions approved by the user.

### Wireframe description

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ AI marketplace assistant                                                   │
├──────────────────────────────────────┬─────────────────────────────────────┤
│ Conversation                         │ Suggested actions                   │
│ User: Find me a desk under $300      │ ┌─────────────────────────────────┐ │
│ AI: I found 12. Three match your     │ │ Compare top 3 by total cost      │ │
│ delivery window and trust filters.   │ └─────────────────────────────────┘ │
│                                      │ ┌─────────────────────────────────┐ │
│ User: Make a fair offer on the best. │ │ Draft protected offer            │ │
│ AI: Recommended offer: $250 total,   │ └─────────────────────────────────┘ │
│ Sunday delivery, 10-min inspection.  │ ┌─────────────────────────────────┐ │
│                                      │ │ Check seller risk                │ │
│ [Review offer before sending]        │ └─────────────────────────────────┘ │
└──────────────────────────────────────┴─────────────────────────────────────┘
```

### Assistant modes

- **Search concierge:** converts messy intent into ranked, explainable matches.
- **Listing copilot:** creates, improves, prices, and validates listings.
- **Negotiation copilot:** drafts offers and counters inside user-defined limits.
- **Trust analyst:** explains risk, verification, pricing anomalies, policy gaps, and suspicious behavior.
- **Transaction operator:** tracks deadlines, schedules fulfillment, reminds parties, and prepares issue reports.
- **Business analyst:** summarizes seller performance, inventory health, conversion, margin, and payout trends.

### Guardrails

- AI never sends payment, accepts a deal, publishes a listing, shares private data, or escalates a dispute without explicit user confirmation.
- AI must show source context for pricing, risk, and policy recommendations.
- AI must distinguish facts, inferences, and suggestions.
- AI must preserve user-defined negotiation limits and privacy settings.

## End-to-end example journeys

### Buyer journey: intent to completion

1. Buyer says, “I need a reliable apartment sofa under $600 delivered this weekend.”
2. AI creates an intent card with budget, dimensions, delivery window, and verified-seller preference.
3. Buyer compares three options by total cost, condition, seller reliability, and delivery feasibility.
4. Buyer messages seller; chat converts delivery agreement into a structured offer.
5. Buyer sends protected offer with price, delivery fee, inspection window, and expiration.
6. Seller accepts; buyer pays into protected payment.
7. Seller delivers, buyer confirms after inspection, funds release, both review.
8. Receipt, photos, and resale estimate are saved in the purchase vault.

### Seller journey: photo to payout

1. Seller uploads six photos of a camera lens.
2. AI identifies the lens, drafts condition details, recommends price, and requests serial number proof.
3. Seller sets auto-counter rules and protected shipping.
4. Buyer sends a bundle offer; seller counters with shipping included.
5. Buyer accepts and pays; seller receives packing and shipping checklist.
6. Tracking confirms delivery; buyer approves condition; payout releases.
7. Seller dashboard suggests listing related accessories and shows reputation improvement.

## Measurement framework

- **Time to first relevant result:** median seconds from homepage intent to qualified match.
- **Listing creation time:** median minutes from first input to publishable listing.
- **Message-to-offer conversion:** percentage of serious conversations converted into structured offers.
- **Offer clarity rate:** percentage of offers with complete price, timing, fulfillment, and protection terms.
- **Successful completion rate:** completed transactions divided by accepted offers.
- **Dispute preventability:** share of disputes tied to missing terms, unclear condition, or avoidable fulfillment gaps.
- **Trust comprehension:** users can correctly explain payment protection and refund rules before paying.
- **Seller action completion:** percentage of AI-prioritized seller tasks completed within recommended window.
- **Repeat confidence:** percentage of users willing to transact again after first purchase or sale.

## Product quality bar

The experience is ready when a first-time user can arrive with an unstructured goal, reach a trustworthy match, negotiate explicit terms, pay safely, complete fulfillment, and build reputation without ever needing to understand marketplace mechanics. The interface should feel like the shortest safe path from intent to outcome.
