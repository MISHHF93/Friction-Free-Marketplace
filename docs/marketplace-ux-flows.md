# Marketplace UX Flows and Wireframe System

## Design North Star

Create a marketplace that feels less like software and more like being guided by an expert concierge: calm, fast, transparent, and trustworthy. The experience should make buyers feel certain, sellers feel in control, and both parties feel protected by the platform before, during, and after every transaction.

The product language combines five design principles:

1. **Apple-like clarity:** fewer visible decisions, stronger hierarchy, refined motion, and progressive disclosure.
2. **Airbnb-like trust:** human context, social proof, transparent expectations, and warm guidance.
3. **Stripe-like precision:** explicit state, reliable transaction details, and confidence around money movement.
4. **Uber-like immediacy:** real-time status, clear next actions, and low-friction commitment.
5. **Notion-like flexibility:** modular dashboards, saved workflows, and AI-assisted organization.

## Experience Architecture

### Core user mental model

The marketplace is organized around four simple concepts:

- **Find:** discover opportunities, listings, services, or products.
- **Decide:** compare, message, negotiate, and verify fit.
- **Transact:** pay, ship, deliver, escrow, complete, and resolve.
- **Grow:** build reputation, repeat workflows, save preferences, and automate with AI.

### Global interface shell

Every authenticated screen uses the same shell:

- **Top command bar:** global search, AI assistant entry, notifications, and account switcher.
- **Left rail:** Marketplace, Messages, Transactions, Dashboard, Reputation, Saved, Settings.
- **Context panel:** right-side adaptive panel for AI help, trust details, checklist, or transaction status.
- **Bottom action bar on mobile:** Home, Search, Messages, Activity, Me.

### Universal interaction patterns

- **One primary action per screen.** Secondary actions are grouped under quiet menus.
- **Every object has a status.** Listings, offers, messages, transactions, payouts, disputes, and reviews are never ambiguous.
- **AI is assistive, not intrusive.** AI appears as a collaborator that drafts, summarizes, checks risk, and suggests next steps.
- **Trust is visible at decision points.** Verification, refund rules, delivery commitments, and seller history appear before commitment.
- **Negotiation is structured.** The product converts vague chat into clear offers with terms, expiration, and next actions.

## 1. Homepage

### Goal

Help visitors understand what the marketplace offers, find a relevant path within seconds, and trust the platform enough to begin.

### Primary jobs

- Discover marketplace categories or listings.
- Understand platform guarantees.
- Start as buyer or seller.
- Search naturally.
- See proof that the marketplace is active and trustworthy.

### Homepage flow

1. Visitor lands on homepage.
2. Hero asks a natural-language question: “What are you looking for?”
3. Visitor can search, browse curated categories, or choose “Sell something.”
4. AI interprets intent and suggests categories, filters, and examples.
5. Visitor sees high-confidence matches or a seller onboarding path.
6. Trust layer explains payment protection, verified users, dispute support, and reputation.
7. Visitor creates account only when needed to save, message, offer, or list.

### Wireframe description

```text
┌────────────────────────────────────────────────────────────────────┐
│ Logo        Explore  How it works  Sell  Trust      Sign in  Start │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  The easiest way to buy and sell with confidence.                  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Ask: “Find me a verified seller for...”                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  [Search marketplace] [Start selling]                              │
│                                                                    │
│  Popular now: [Category] [Category] [Category] [Category]           │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│ Featured verified listings                                         │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐        │
│ │ Image      │ │ Image      │ │ Image      │ │ Image      │        │
│ │ Title      │ │ Title      │ │ Title      │ │ Title      │        │
│ │ Price      │ │ Price      │ │ Price      │ │ Price      │        │
│ │ Trust tags │ │ Trust tags │ │ Trust tags │ │ Trust tags │        │
│ └────────────┘ └────────────┘ └────────────┘ └────────────┘        │
├────────────────────────────────────────────────────────────────────┤
│ How it works: Find → Decide → Pay protected → Complete → Review     │
├────────────────────────────────────────────────────────────────────┤
│ Trust modules: Verified identity | Escrow | Dispute support | AI    │
├────────────────────────────────────────────────────────────────────┤
│ Seller CTA: Turn inventory, services, or expertise into revenue.    │
└────────────────────────────────────────────────────────────────────┘
```

### Key interaction details

- Hero search accepts plain language, images, links, and pasted requirements.
- Category chips change based on location, seasonality, and browsing behavior.
- Listing cards show only the highest-signal metadata: price, availability, seller rating, verification, and delivery method.
- Trust badges are descriptive, not decorative: “Identity verified,” “Funds protected,” “Usually replies in 12 min.”

### Empty and edge states

- If search has no matches, AI offers to create a saved request and notify sellers.
- If user intent is unclear, AI asks one clarifying question instead of showing a long filter panel.
- If location matters, the homepage asks for approximate region without forcing full address.

## 2. Onboarding

### Goal

Personalize the marketplace while collecting only the minimum information required for a user’s immediate intent.

### Onboarding principles

- Split onboarding by role but allow easy switching.
- Delay compliance steps until they unlock a concrete benefit.
- Make trust-building feel rewarding instead of bureaucratic.
- Use AI to prefill preferences and seller setup from natural language.

### Buyer onboarding flow

1. Choose goal: browse, buy now, source something specific, or manage purchases.
2. Enter location and preferred transaction types.
3. Select interest categories or describe needs in natural language.
4. Create account with email, phone, or federated login.
5. Verify contact method.
6. Optional: add payment method to unlock instant offers.
7. Land on personalized buyer dashboard.

### Seller onboarding flow

1. Choose what to sell: product, service, rental, digital good, or custom work.
2. Describe inventory or offering in one sentence.
3. AI proposes listing templates, category, pricing model, and required fields.
4. Seller verifies contact and identity level required for their category.
5. Seller adds payout method.
6. Seller creates first listing or imports listings.
7. Land on seller dashboard with launch checklist.

### Wireframe description

```text
┌─────────────────────────────────────────────┐
│ Welcome. What would you like to do first?   │
│                                             │
│ ┌──────────────┐ ┌──────────────┐           │
│ │ Buy          │ │ Sell         │           │
│ │ Find trusted │ │ Start earning│           │
│ └──────────────┘ └──────────────┘           │
│                                             │
│ Or tell us in your own words:               │
│ ┌─────────────────────────────────────────┐ │
│ │ “I need...”                             │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Progress: ●○○○                              │
│ [Continue]                                  │
└─────────────────────────────────────────────┘
```

### Onboarding states

- **Minimal account:** can browse and save.
- **Verified contact:** can message and receive notifications.
- **Payment-ready buyer:** can make offers and transact.
- **Payout-ready seller:** can accept payment.
- **Fully verified seller:** can access higher limits and premium trust placement.

## 3. Buyer Dashboard

### Goal

Give buyers a single calm command center for active searches, saved listings, offers, messages, purchases, and recommendations.

### Buyer dashboard flow

1. Buyer lands on dashboard after sign-in.
2. Top module shows urgent next actions: unread seller replies, expiring offers, delivery updates, or review requests.
3. Saved searches and AI-sourced matches appear next.
4. Active transactions show status and next required action.
5. Recommendations improve from buyer behavior and explicit feedback.

### Wireframe description

```text
┌────────────────────────────────────────────────────────────────────┐
│ Buyer Dashboard                                  Ask AI  Alerts  Me │
├──────────────┬─────────────────────────────────────┬───────────────┤
│ Nav          │ Good morning. 3 things need review. │ AI context    │
│ Marketplace  │                                     │ panel         │
│ Messages     │ ┌─────────────────────────────────┐ │ ┌───────────┐ │
│ Offers       │ │ Priority actions                │ │ │ Summary   │ │
│ Purchases    │ │ • Seller replied                │ │ │ Risks     │ │
│ Saved        │ │ • Offer expires in 2h           │ │ │ Next step │ │
│ Reputation   │ │ • Delivery arriving today       │ │ └───────────┘ │
│              │ └─────────────────────────────────┘ │               │
│              │ ┌───────────────┐ ┌───────────────┐ │               │
│              │ │ Saved search  │ │ Recommended   │ │               │
│              │ └───────────────┘ └───────────────┘ │               │
│              │ ┌─────────────────────────────────┐ │               │
│              │ │ Active purchases timeline       │ │               │
│              │ └─────────────────────────────────┘ │               │
└──────────────┴─────────────────────────────────────┴───────────────┘
```

### Dashboard modules

- **Priority actions:** system-ranked tasks requiring buyer input.
- **Active offers:** current offers, counteroffers, expirations, and terms.
- **Purchase timeline:** escrow, shipment, delivery, acceptance, review.
- **Saved intelligence:** saved searches, price drops, similar listings, seller replies.
- **AI sourcing:** “Find better matches,” “Compare these,” “Draft a question,” “Watch this category.”

### Empty states

- No saved searches: show three starter cards and a natural-language search box.
- No active transactions: show recommended listings and education about protected checkout.
- No messages: show prompts to ask sellers about availability, condition, timing, or fit.

## 4. Seller Dashboard

### Goal

Help sellers operate like professionals with minimal overhead: list, price, respond, negotiate, fulfill, get paid, and improve reputation.

### Seller dashboard flow

1. Seller lands on dashboard.
2. Launch checklist appears until seller reaches a healthy operating state.
3. Dashboard highlights revenue, pending actions, response obligations, fulfillment deadlines, and listing health.
4. AI suggests pricing changes, listing improvements, and buyer response drafts.
5. Seller can batch-manage inventory, offers, conversations, and transactions.

### Wireframe description

```text
┌────────────────────────────────────────────────────────────────────┐
│ Seller Dashboard                                 Ask AI  Alerts  Me │
├──────────────┬─────────────────────────────────────┬───────────────┤
│ Nav          │ Today                               │ AI operator   │
│ Overview     │ ┌────────┐ ┌────────┐ ┌────────┐   │ ┌───────────┐ │
│ Listings     │ │Revenue │ │Orders  │ │Rating  │   │ │ Improve   │ │
│ Inbox        │ └────────┘ └────────┘ └────────┘   │ │ listings  │ │
│ Offers       │                                     │ │ Reply     │ │
│ Orders       │ ┌─────────────────────────────────┐ │ │ drafts    │ │
│ Payouts      │ │ Action queue                    │ │ └───────────┘ │
│ Reputation   │ │ • 4 unread buyer questions      │ │               │
│              │ │ • 2 offers to review            │ │               │
│              │ │ • 1 shipment due today          │ │               │
│              │ └─────────────────────────────────┘ │               │
│              │ ┌─────────────────────────────────┐ │               │
│              │ │ Listing health                  │ │               │
│              │ └─────────────────────────────────┘ │               │
└──────────────┴─────────────────────────────────────┴───────────────┘
```

### Dashboard modules

- **Action queue:** ordered by urgency and revenue impact.
- **Listing health:** visibility, conversion, photo quality, pricing competitiveness, message response rate.
- **Offer center:** accept, counter, decline, bundle, or ask a question.
- **Fulfillment tracker:** ship, deliver, handoff, provide service, upload proof.
- **Payout center:** pending balance, scheduled payout, holds, fees, tax documents.
- **Reputation coach:** review themes, response time, issue resolution, benchmark versus peers.

### Seller dashboard shortcuts

- “Create listing from photos.”
- “Reply to all buyer questions.”
- “Lower price on stale listings.”
- “Bundle similar offers.”
- “Generate weekly performance summary.”

## 5. Messaging

### Goal

Make buyer-seller communication fast, safe, structured, and transaction-aware without removing human warmth.

### Messaging flow

1. Buyer opens listing and starts a thread with a suggested question.
2. Thread includes listing context, seller identity, trust signals, and availability.
3. AI summarizes prior messages, flags missing details, and proposes replies.
4. If price, timing, quantity, or delivery changes are discussed, the system suggests converting the conversation into a formal offer.
5. Transaction milestones appear directly in the thread.

### Wireframe description

```text
┌────────────────────────────────────────────────────────────────────┐
│ Messages                                                           │
├──────────────┬─────────────────────────────────────┬───────────────┤
│ Thread list  │ Seller: Jordan                      │ Listing card  │
│ ┌──────────┐ │ Verified seller · replies in 9 min  │ ┌───────────┐ │
│ │ Listing  │ ├─────────────────────────────────────┤ │ Image     │ │
│ │ Preview  │ │ Today                               │ │ Price     │ │
│ └──────────┘ │ Buyer: Is this available Friday?    │ │ Trust     │ │
│              │ Seller: Yes, after 3pm.             │ └───────────┘ │
│              │                                     │ AI actions    │
│              │ ┌─────────────────────────────────┐ │ • Summarize   │
│              │ │ Suggested: Make offer for...    │ │ • Draft reply │
│              │ └─────────────────────────────────┘ │ • Risk check  │
│              │                                     │               │
│              │ [Message composer] [Make offer]     │               │
└──────────────┴─────────────────────────────────────┴───────────────┘
```

### Messaging features

- **Smart composer:** tone controls, quick replies, translation, and attachment support.
- **Deal detection:** turns informal terms into structured offers.
- **Safety layer:** detects off-platform payment requests, harassment, fraud patterns, and risky terms.
- **Shared facts:** listing details, price, quantity, condition, delivery, and availability stay pinned.
- **Conversation summary:** always available for long threads.

### Message states

- Sent, delivered, read.
- Awaiting buyer reply.
- Awaiting seller reply.
- Offer proposed.
- Transaction active.
- Closed, completed, or archived.

## 6. Negotiation Experience

### Goal

Make negotiation feel simple, fair, and low-pressure by replacing ambiguous back-and-forth with clear terms and guided decision-making.

### Negotiation flow

1. Buyer taps “Make offer” from listing or message thread.
2. Offer sheet opens with price, quantity, delivery/pickup, timing, payment method, contingencies, and expiration.
3. AI checks whether the offer is likely to be accepted and explains why.
4. Seller receives offer with clear delta from listing terms.
5. Seller can accept, counter, decline with reason, or ask a clarifying question.
6. Counteroffers are versioned, comparable, and time-boxed.
7. Accepted offer converts directly to protected checkout.

### Wireframe description

```text
┌──────────────────────────────────────────────┐
│ Make an offer                                │
├──────────────────────────────────────────────┤
│ Listing price: $1,000                        │
│ Your offer                                   │
│ ┌──────────────┐ ┌──────────────┐            │
│ │ Price $950   │ │ Quantity 1   │            │
│ └──────────────┘ └──────────────┘            │
│ Delivery: [Pickup] [Shipping] [Local courier]│
│ Timing: Friday after 3pm                     │
│ Expiration: 24 hours                         │
│                                              │
│ AI acceptance estimate: High                 │
│ “Similar sellers accepted offers within 5%.” │
│                                              │
│ [Send offer] [Save draft]                    │
└──────────────────────────────────────────────┘
```

### Negotiation design rules

- Use **side-by-side comparison** for counters: original listing, buyer offer, seller counter.
- Show **total cost**, not just headline price.
- Include **terms lock** once accepted so no one is surprised.
- Keep negotiation in-product; off-platform payment warnings are clear and firm.
- Provide graceful decline reasons: “Too low,” “Unavailable,” “Need different timing,” “Already sold.”

### Negotiation states

- Draft offer.
- Sent offer.
- Viewed by recipient.
- Countered.
- Accepted.
- Expired.
- Withdrawn.
- Declined.
- Converted to transaction.

## 7. Listing Creation

### Goal

Enable sellers to create accurate, beautiful, trustworthy listings in minutes, with AI handling structure and polish while sellers retain control.

### Listing creation flow

1. Seller starts from photos, text, import, inventory file, or blank template.
2. AI identifies category, title, attributes, condition, price range, and required fields.
3. Seller reviews and edits essentials.
4. Trust and compliance checks run inline.
5. Seller chooses availability, delivery, return/cancellation policy, and negotiation rules.
6. Preview shows buyer-facing card and detail page.
7. Seller publishes or schedules.
8. Post-publish coach suggests improvements.

### Wireframe description

```text
┌────────────────────────────────────────────────────────────────────┐
│ Create listing                                                     │
├────────────────────────────────────────────────────────────────────┤
│ Step 1: Add what you know                                          │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ Drop photos, paste a description, import inventory, or type... │ │
│ └────────────────────────────────────────────────────────────────┘ │
│                                                                    │
│ AI draft                                                           │
│ ┌──────────────────────────────┬─────────────────────────────────┐ │
│ │ Photos                       │ Title                           │ │
│ │ [image] [image] [add]        │ Category                        │ │
│ │                              │ Condition                       │ │
│ │                              │ Price recommendation            │ │
│ └──────────────────────────────┴─────────────────────────────────┘ │
│                                                                    │
│ Completeness: 82%  Trust score: Strong                             │
│ [Preview] [Publish]                                                │
└────────────────────────────────────────────────────────────────────┘
```

### Listing creation modules

- **AI title and description:** concise, searchable, and honest.
- **Photo coach:** flags blur, poor lighting, missing angles, or inconsistent images.
- **Pricing intelligence:** compares similar listings, demand, condition, seasonality, and seller goals.
- **Policy builder:** returns, cancellations, delivery, pickup, service scope, warranty, and deposits.
- **Negotiation settings:** allow offers, minimum offer, auto-accept, auto-decline, bundle discounts.
- **Compliance guardrails:** prohibited items, regulated categories, location restrictions, required disclosures.

### Listing states

- Draft.
- Needs required details.
- Ready to publish.
- Published.
- Paused.
- Under review.
- Sold, completed, archived.

## 8. Transaction Experience

### Goal

Make money movement and fulfillment feel secure, understandable, and predictable for both parties.

### Transaction flow

1. Accepted offer or buy-now action opens checkout.
2. Buyer sees full cost breakdown, delivery terms, cancellation rules, buyer protection, and estimated timeline.
3. Buyer pays into protected payment flow or escrow when applicable.
4. Seller receives confirmed order and fulfillment instructions.
5. Transaction timeline tracks each step.
6. Buyer confirms receipt or completion.
7. Funds are released according to marketplace policy.
8. Both parties review each other.

### Wireframe description

```text
┌────────────────────────────────────────────────────────────────────┐
│ Checkout                                                           │
├────────────────────────────────────┬───────────────────────────────┤
│ Order details                      │ Trust and payment             │
│ Item/service                       │ Protected payment             │
│ Terms                              │ Funds released after delivery │
│ Delivery or pickup                 │ Dispute window: 48 hours      │
│ Timeline                           │                               │
│                                    │ Cost breakdown                │
│ Payment method                     │ Price                         │
│ [Card ending 4242]                 │ Shipping                      │
│                                    │ Fees                          │
│ [Pay protected]                    │ Taxes                         │
└────────────────────────────────────┴───────────────────────────────┘
```

### Transaction timeline

```text
Offer accepted → Buyer paid → Seller preparing → In transit / scheduled → Delivered / completed → Buyer confirms → Funds released → Reviews complete
```

### Transaction modules

- **Cost clarity:** item price, delivery, platform fees, taxes, discounts, deposits, refund rules.
- **Protected payment:** explicit explanation of what is held, released, refundable, or disputed.
- **Fulfillment checklist:** seller-specific tasks with deadlines and proof upload.
- **Buyer confirmation:** clear acceptance, issue reporting, and dispute window.
- **Receipt and records:** invoice, tax documents, warranty, service agreement, or delivery proof.

### Exception flows

- Payment failed: preserve offer and provide quick payment retry.
- Seller misses fulfillment deadline: notify buyer, offer cancellation or extension.
- Buyer reports issue: start guided evidence collection and resolution path.
- Partial fulfillment: support partial release, refund, or revised completion.
- Local pickup no-show: reschedule, cancel, or apply no-show policy.

## 9. Reputation Experience

### Goal

Make reputation a living, useful trust system rather than a static star rating.

### Reputation flow

1. After transaction completion, both parties receive a lightweight review prompt.
2. Review captures reliability, communication, accuracy, fulfillment, and issue resolution.
3. AI summarizes recurring themes across reviews.
4. Reputation profile displays verified signals and contextual strengths.
5. Users get private coaching on how to improve.
6. Disputed or abusive reviews enter moderation workflow.

### Wireframe description

```text
┌────────────────────────────────────────────────────────────────────┐
│ Reputation                                                         │
├────────────────────────────────────┬───────────────────────────────┤
│ Public profile                     │ Private improvement coach      │
│ 4.9 overall                        │ “Buyers mention fast replies.” │
│ 128 completed transactions         │ “Improve photo detail to lift  │
│ 98% on-time fulfillment            │ confidence.”                   │
│ Verified identity                  │                               │
│                                    │ Suggested actions              │
│ Strengths                          │ • Add more condition details   │
│ • Fast response                    │ • Reply within 1 hour          │
│ • Accurate descriptions            │ • Clarify cancellation terms    │
│ • Smooth handoff                   │                               │
└────────────────────────────────────┴───────────────────────────────┘
```

### Reputation dimensions

- Identity verification.
- Completed transaction count.
- Response time.
- On-time fulfillment.
- Cancellation rate.
- Dispute rate and resolution quality.
- Accuracy of listing descriptions.
- Repeat buyer or seller rate.
- Category-specific expertise.
- Review themes summarized in plain language.

### Review UX

- Two-step review: quick rating first, optional detail second.
- Attribute chips instead of long blank text fields.
- Private feedback separated from public review.
- Review reciprocity protection to reduce retaliation.
- Contextual prompts based on transaction type.

## 10. AI Assistant Experience

### Goal

Make AI the marketplace’s invisible operating system: helping users search, compare, decide, negotiate, list, fulfill, and resolve issues without taking control away from them.

### AI assistant modes

1. **Guide:** answers questions and explains marketplace policies.
2. **Scout:** finds listings, sellers, price drops, and saved-search matches.
3. **Analyst:** compares options, checks risk, and summarizes reputation.
4. **Negotiator:** drafts offers, counters, and polite replies.
5. **Operator:** helps sellers create listings, respond to buyers, and manage orders.
6. **Resolver:** guides evidence collection and dispute resolution.

### AI assistant flow

1. User opens AI from command bar, page context, or inline suggestion.
2. AI starts with page-aware context and asks permission before taking consequential actions.
3. AI proposes a next step with editable output.
4. User confirms, edits, or rejects.
5. AI tracks follow-up tasks and reminders.
6. For high-stakes actions, AI shows sources, assumptions, and user-controlled final confirmation.

### Wireframe description

```text
┌────────────────────────────────────────────────────────────────────┐
│ Ask AI                                                             │
├────────────────────────────────────────────────────────────────────┤
│ Context: You are viewing 3 saved listings in “Office chairs.”       │
│                                                                    │
│ AI: I can compare price, condition, seller reliability, and pickup. │
│                                                                    │
│ Suggested actions                                                  │
│ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐          │
│ │ Compare these  │ │ Draft question │ │ Watch prices   │          │
│ └────────────────┘ └────────────────┘ └────────────────┘          │
│                                                                    │
│ Conversation                                                       │
│ User: Which is the safest buy?                                     │
│ AI: Listing B has the strongest seller history and clearest terms. │
│                                                                    │
│ [Ask anything...]                                      [Run action] │
└────────────────────────────────────────────────────────────────────┘
```

### AI permission model

- **Can do automatically:** summarize, compare, draft, classify, suggest, remind.
- **Requires confirmation:** send message, publish listing, make offer, accept offer, pay, cancel, dispute, release funds.
- **Requires elevated verification:** identity-sensitive, payment-sensitive, legal/compliance-sensitive, or moderation actions.

### AI transparency rules

- Show when AI used marketplace data, seller history, listing content, or user preferences.
- Distinguish fact from recommendation.
- Provide editable drafts for all outbound communication.
- Never hide fees, risks, or policy constraints to make a conversion easier.
- Offer “Why?” on every recommendation.

## End-to-End UX Flow: Buyer Purchase

```text
Homepage search
→ Search results
→ Listing detail
→ Message seller or buy now
→ Structured negotiation
→ Accepted offer
→ Protected checkout
→ Transaction timeline
→ Delivery or completion confirmation
→ Review
→ Reputation update
→ AI suggests related saved search or repeat purchase
```

### Buyer purchase wireframe sequence

1. **Search results:** filters hidden behind “Refine,” AI explanation of best matches, verified listings highlighted.
2. **Listing detail:** immersive media, concise facts, seller trust card, cost and timeline preview, sticky “Message” and “Buy protected.”
3. **Messaging:** question templates and deal detection.
4. **Negotiation:** structured offer sheet with acceptance likelihood.
5. **Checkout:** total cost and protection details.
6. **Transaction:** timeline with next action.
7. **Review:** lightweight reputation capture.

## End-to-End UX Flow: Seller Listing to Payout

```text
Seller onboarding
→ Create listing from photos or text
→ AI draft and seller review
→ Publish
→ Receive buyer questions
→ Convert chat to offer
→ Accept or counter
→ Fulfill order
→ Upload proof
→ Funds release
→ Review buyer
→ Listing and reputation insights
```

### Seller operation wireframe sequence

1. **Seller dashboard:** launch checklist and action queue.
2. **Listing creator:** AI-generated draft with trust score.
3. **Inbox:** buyer thread with listing context and suggested replies.
4. **Offer center:** structured offer comparison.
5. **Order page:** fulfillment checklist, deadline, and proof.
6. **Payout page:** pending, available, scheduled, and held funds.
7. **Reputation page:** public trust metrics and private coaching.

## Screen-Level Information Hierarchy

### Listing detail page

1. Title, price, availability, and primary CTA.
2. Media gallery.
3. Seller trust summary.
4. Key facts and condition.
5. Delivery, pickup, or service terms.
6. Buyer protection and refund policy.
7. Reviews and reputation themes.
8. Similar listings.

### Search results page

1. Search query and AI interpretation.
2. Result count and sort logic.
3. High-signal filters.
4. Listing cards.
5. Saved search CTA.
6. AI scout suggestions.

### Transaction detail page

1. Current status and next action.
2. Timeline.
3. Terms and cost summary.
4. Messages and documents.
5. Help, cancellation, issue reporting, and dispute path.

## Component System

### Core components

- **Trust card:** identity, transaction count, rating, response time, dispute rate, verification level.
- **Status pill:** consistent state label across listings, offers, transactions, payouts, and disputes.
- **Action queue card:** task, deadline, impact, primary action, secondary action.
- **Offer comparison table:** price, fees, delivery, timing, contingencies, expiration.
- **Protected payment module:** funds status, release rules, dispute window, refund eligibility.
- **AI suggestion chip:** concise recommendation with “Why?” affordance.
- **Timeline rail:** milestones, completed states, current state, blocker, next action.
- **Reputation summary:** score, verified signals, strengths, review themes.

### Visual style

- Warm neutral background with crisp white surfaces.
- High-contrast typography and generous spacing.
- Rounded cards only where grouping matters.
- Motion used to explain transitions, not decorate.
- Green reserved for confirmed success and safe status.
- Amber reserved for pending or attention-needed states.
- Red reserved for risk, dispute, irreversible loss, or policy violation.

## Mobile Experience

### Mobile priorities

- Search, message, transact, and check status should be thumb-first.
- Dashboards become stacked priority feeds.
- AI assistant appears as a bottom sheet.
- Offer creation uses stepper-style progressive disclosure.
- Transaction timeline remains sticky at top of detail pages.

### Mobile homepage wireframe

```text
┌──────────────────────┐
│ Logo          Sign in │
│ What do you need?     │
│ ┌──────────────────┐ │
│ │ Ask or search    │ │
│ └──────────────────┘ │
│ [Buy] [Sell]         │
│ Popular categories   │
│ ┌──────────────────┐ │
│ │ Listing card      │ │
│ └──────────────────┘ │
│ ┌──────────────────┐ │
│ │ Trust module      │ │
│ └──────────────────┘ │
│ Home Search Msgs Me  │
└──────────────────────┘
```

## Success Metrics

### Buyer metrics

- Time from search to first relevant listing.
- Search-to-message conversion.
- Message-to-offer conversion.
- Offer acceptance rate.
- Checkout completion rate.
- Buyer dispute rate.
- Repeat purchase rate.

### Seller metrics

- Time to first listing.
- Listing completeness score.
- Message response time.
- Offer response time.
- Listing conversion rate.
- Fulfillment on-time rate.
- Payout satisfaction.
- Seller retention.

### Trust metrics

- Off-platform payment attempt rate.
- Fraud report rate.
- Dispute resolution time.
- Review completion rate.
- Identity verification completion.
- User confidence survey score after checkout.

## Prototype Priority

Build the prototype in this order:

1. Homepage with AI search and trust modules.
2. Listing detail with seller trust card.
3. Messaging with structured offer conversion.
4. Negotiation offer sheet.
5. Protected checkout and transaction timeline.
6. Buyer and seller dashboards.
7. Listing creation with AI draft.
8. Reputation profile and review flow.
9. AI assistant panel across all screens.

## Design QA Checklist

Before shipping any screen, confirm:

- The user can identify the primary action in under three seconds.
- The screen makes current status and next step explicit.
- Money, fees, timing, and risk are visible before commitment.
- AI suggestions are editable and explainable.
- Empty states help users move forward.
- Error states preserve user work.
- Trust signals are contextual and specific.
- Mobile flow works without relying on hover, dense tables, or tiny secondary links.
