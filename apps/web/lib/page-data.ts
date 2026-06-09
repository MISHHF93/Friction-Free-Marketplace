export type ExperiencePage = {
  key: string;
  title: string;
  eyebrow: string;
  route: string;
  persona: string;
  promise: string;
  layout: string[];
  components: string[];
  actions: string[];
  states: string[];
  api: string[];
};

const sharedPublicApi = ["Viewer session and location", "Listing search index", "Trust/risk summaries", "Category taxonomy"];
const sharedDashboardApi = ["Authenticated user profile", "Role permissions", "Notification counts", "Audit/event tracking"];
const sharedAdminApi = ["Admin RBAC policy", "Operational queues", "Risk models", "Marketplace analytics warehouse"];

export const pages: ExperiencePage[] = [
  {
    key: "home",
    title: "Homepage",
    eyebrow: "Public · /",
    route: "/",
    persona: "Guests, returning buyers, and casual sellers",
    promise: "A trust-first landing experience that makes search, AI-assisted sourcing, and selling feel instant.",
    layout: ["Sticky mobile search header with location chip, category shortcut rail, and login CTA", "Hero with natural-language marketplace command bar", "Trust proof strip, featured categories, nearby deals, seller starter panel, and safe transaction explainer", "Desktop expands to a two-column hero with AI assistant preview and personalized inventory modules"],
    components: ["GlobalNav", "MarketplaceCommandBar", "CategoryPills", "ListingCardGrid", "TrustBadgeStrip", "SellerLaunchCard", "HowItWorksStepper"],
    actions: ["Search by keyword or natural language", "Set location and delivery radius", "Browse a category", "Start selling", "Sign in or create account", "Ask AI to find an item"],
    states: ["Guest default", "Personalized returning user", "No location selected", "Loading recommendations", "Service outage fallback with static category links"],
    api: ["GET /api/homefeed", "POST /api/search/intent", "GET /api/categories", "GET /api/trust/platform-stats"]
  },
  {
    key: "browse",
    title: "Browse listings",
    eyebrow: "Public · /browse",
    route: "/browse",
    persona: "Buyers exploring local and shippable inventory",
    promise: "Fast scannable browsing with mobile filters, map/list switching, and safety-aware ranking.",
    layout: ["Mobile filter drawer above masonry/list results", "Search summary with sort, radius, fulfillment, price, condition, and verification filters", "Sticky save-search bar after scroll", "Desktop uses left filter rail, center listing grid, optional right insight panel"],
    components: ["FilterDrawer", "SortMenu", "ListingCard", "MapPreview", "SaveSearchBanner", "TrustSignalTooltip"],
    actions: ["Apply filters", "Toggle map/list", "Favorite listing", "Compare listings", "Save search", "Open listing detail"],
    states: ["Loading skeleton cards", "Empty filtered results", "High-risk listing hidden", "Offline cached recent results", "Infinite scroll loading"],
    api: ["GET /api/listings", "POST /api/saved-searches", "POST /api/favorites", ...sharedPublicApi]
  },
  {
    key: "category",
    title: "Category pages",
    eyebrow: "Public · /categories/[slug]",
    route: "/categories/electronics",
    persona: "Buyers entering a structured vertical",
    promise: "Category-specific discovery with required attributes, price intelligence, and trust rules.",
    layout: ["Category hero with icon, local inventory count, and subcategory chips", "Mobile-first result cards tailored by category attributes", "Market price histogram and condition guide", "Desktop includes buyer education and fraud-risk sidebar"],
    components: ["CategoryHero", "SubcategoryTabs", "AttributeFilters", "PriceInsightCard", "ListingCardGrid", "PolicyCallout"],
    actions: ["Choose subcategory", "Filter by category-specific attributes", "View price bands", "Create alert", "Report suspicious pattern"],
    states: ["Category loading", "Sparse category with nearby expansion", "Restricted category verification prompt", "No listings yet"],
    api: ["GET /api/categories/{slug}", "GET /api/categories/{slug}/facets", "GET /api/market-intelligence/category/{slug}", ...sharedPublicApi]
  },
  {
    key: "search",
    title: "Search results",
    eyebrow: "Public · /search",
    route: "/search?q=road+bike",
    persona: "Intent-driven buyers and AI-assisted shoppers",
    promise: "Semantic search results that explain matches, risks, and better alternatives.",
    layout: ["Query header with editable command prompt and AI interpretation chips", "Result tabs for Best matches, Nearby, Shippable, New, and Safer choices", "Inline query refinements and typo/category correction", "Desktop assistant panel summarizes tradeoffs and negotiation ideas"],
    components: ["SearchCommandBar", "IntentChips", "ResultTabs", "ListingCard", "AIInsightPanel", "EmptySearchCoach"],
    actions: ["Refine query", "Accept suggested filters", "Save search", "Ask AI to compare", "Message seller", "Favorite"],
    states: ["Semantic search running", "No results with broaden controls", "Ambiguous intent", "Unsafe results suppressed", "Personalization disabled"],
    api: ["POST /api/search", "POST /api/search/refine", "GET /api/search/suggestions", "POST /api/ai/compare-listings"]
  },
  {
    key: "listing-detail",
    title: "Listing detail page",
    eyebrow: "Public · /listings/[id]",
    route: "/listings/demo-road-bike",
    persona: "Buyers evaluating one transaction",
    promise: "A confident purchase decision page with media, verified facts, seller trust, offers, and protected payment paths.",
    layout: ["Mobile photo carousel, sticky price/action bar, and collapsible sections", "Facts card, description, AI listing quality summary, seller card, pickup/shipping options", "Desktop image gallery left and purchase/action rail right", "Related listings and safety checklist below"],
    components: ["ImageGallery", "StickyActionBar", "PriceAndOfferCard", "SellerTrustCard", "EscrowOptionCard", "QuestionComposer", "SafetyChecklist"],
    actions: ["Make offer", "Buy now", "Message seller", "Ask AI a question", "Favorite", "Share", "Report listing"],
    states: ["Available", "Pending offer", "Sold", "Seller away", "Verification required", "Risk hold", "Media loading"],
    api: ["GET /api/listings/{id}", "GET /api/sellers/{id}/trust", "POST /api/offers", "POST /api/messages", "POST /api/reports"]
  },
  {
    key: "seller-profile",
    title: "Seller public profile",
    eyebrow: "Public · /sellers/[id]",
    route: "/sellers/river-city-bikes",
    persona: "Buyers researching seller credibility",
    promise: "Transparent seller reputation, active inventory, policies, and verified commerce history.",
    layout: ["Profile header with avatar, verification tier, response time, and trust score", "Tabs for Listings, Reviews, About, Policies, and Safety", "Mobile contact/seller-follow bar", "Desktop includes trust explanation sidebar"],
    components: ["SellerProfileHeader", "TrustScoreBreakdown", "ReviewList", "ListingCardGrid", "PolicySummary", "FollowSellerButton"],
    actions: ["Follow seller", "Message seller", "Filter seller listings", "Read reviews", "Report seller", "Share profile"],
    states: ["Public seller", "Business seller", "Suspended/limited seller", "No active listings", "Review dispute pending"],
    api: ["GET /api/sellers/{id}", "GET /api/sellers/{id}/listings", "GET /api/sellers/{id}/reviews", "POST /api/seller-follows"]
  },
  {
    key: "how-it-works",
    title: "How it works",
    eyebrow: "Public · /how-it-works",
    route: "/how-it-works",
    persona: "New buyers and sellers learning the platform",
    promise: "Plain-language walkthrough of discovery, listing, offers, escrow, fulfillment, and reviews.",
    layout: ["Hero with buyer/seller toggle", "Step cards with mobile timeline", "Trust and escrow explainer", "FAQ and CTA blocks"],
    components: ["AudienceToggle", "ProcessTimeline", "EscrowExplainer", "FAQAccordion", "CTASection"],
    actions: ["Switch buyer/seller flow", "Start search", "Create listing", "Open pricing", "Read trust page"],
    states: ["Buyer view", "Seller view", "FAQ expanded", "Localized policy variant"],
    api: ["GET /api/content/how-it-works", "GET /api/content/faqs", "GET /api/pricing/summary"]
  },
  {
    key: "trust-safety",
    title: "Trust and safety page",
    eyebrow: "Public · /safety",
    route: "/safety",
    persona: "Users validating marketplace safety before transacting",
    promise: "Shows how identity, escrow, AI moderation, reporting, and disputes protect commerce.",
    layout: ["Trust mission hero", "Protection pillars grid", "Risk lifecycle diagram", "Reporting CTA and policy links"],
    components: ["ProtectionPillarCard", "RiskLifecycle", "PolicyLinkGrid", "ReportIssueCTA", "TrustStats"],
    actions: ["Start verification", "Report issue", "Read policies", "Open dispute guidance", "Contact support"],
    states: ["General policy", "Category-specific policy", "Incident banner", "Authenticated next-step prompts"],
    api: ["GET /api/trust/policies", "GET /api/trust/platform-stats", "POST /api/reports/intake"]
  },
  {
    key: "pricing",
    title: "Pricing page",
    eyebrow: "Public · /pricing",
    route: "/pricing",
    persona: "Sellers comparing fees and premium tools",
    promise: "Clear fee model for free listings, protected transactions, boosts, subscriptions, and business selling.",
    layout: ["Pricing hero with fee calculator", "Plan cards stacked on mobile", "Transaction fee examples", "Premium AI and boost add-ons", "FAQ"],
    components: ["FeeCalculator", "PricingCard", "ComparisonTable", "AddonCard", "FAQAccordion"],
    actions: ["Estimate fees", "Choose plan", "Compare features", "Contact sales", "Start selling"],
    states: ["Individual seller", "Business seller", "Category fee override", "Promo applied"],
    api: ["GET /api/pricing/plans", "POST /api/pricing/estimate", "GET /api/pricing/promotions"]
  },
  {
    key: "login-signup",
    title: "Login/signup",
    eyebrow: "Public · /login",
    route: "/login",
    persona: "Guests becoming verified marketplace users",
    promise: "Low-friction authentication that routes users into buyer or seller onboarding with verification clarity.",
    layout: ["Centered auth card with social, email, phone, and passkey options", "Intent selector for Buy, Sell, or Admin", "Progressive verification panel", "Mobile trust reassurance below form"],
    components: ["AuthCard", "RoleIntentSelector", "PasskeyButton", "VerificationPreview", "AuthLegalLinks"],
    actions: ["Sign in", "Create account", "Continue with provider", "Use passkey", "Recover account", "Choose role intent"],
    states: ["Login", "Signup", "MFA challenge", "Email/phone verification", "Account locked", "Admin SSO"],
    api: ["POST /api/auth/login", "POST /api/auth/signup", "POST /api/auth/mfa", "GET /api/auth/session"]
  },
  {
    key: "buyer-dashboard",
    title: "Buyer dashboard",
    eyebrow: "User · /dashboard/buyer",
    route: "/dashboard/buyer",
    persona: "Authenticated buyers",
    promise: "A calm command center for active searches, offers, messages, purchases, and AI-sourced opportunities.",
    layout: ["Mobile priority-action feed with bottom navigation", "Cards for unread replies, expiring offers, delivery updates, and review requests", "Saved search match carousel and active purchase timeline", "Desktop adds left nav and right AI context panel"],
    components: ["DashboardShell", "PriorityActionCard", "SavedSearchMatches", "PurchaseTimeline", "AIContextPanel"],
    actions: ["Reply to messages", "Review offers", "Track purchases", "Ask AI to source", "Manage saved searches"],
    states: ["New buyer empty state", "Action required", "All caught up", "Verification needed", "Loading personalized feed"],
    api: ["GET /api/dashboard/buyer", "GET /api/notifications", "GET /api/purchases/active", ...sharedDashboardApi]
  },
  {
    key: "seller-dashboard",
    title: "Seller dashboard",
    eyebrow: "User · /dashboard/seller",
    route: "/dashboard/seller",
    persona: "Individual and business sellers",
    promise: "Operational home for listing health, offer response, sales progress, payout readiness, and AI optimization.",
    layout: ["Mobile action list for inquiries, offers, shipping, verification, and payout tasks", "Sales KPI cards, listing quality queue, demand insights, and payout status", "Desktop uses dashboard grid with AI seller coach"],
    components: ["SellerKpiCards", "ListingHealthQueue", "OfferQueue", "PayoutStatusCard", "DemandInsightPanel"],
    actions: ["Respond to offers", "Improve listings", "Create listing", "Ship/confirm pickup", "View payout"],
    states: ["First listing checklist", "Healthy seller", "At-risk account", "Payout blocked", "High-demand alert"],
    api: ["GET /api/dashboard/seller", "GET /api/listings/health", "GET /api/payouts/status", ...sharedDashboardApi]
  },
  {
    key: "my-listings",
    title: "My listings",
    eyebrow: "User · /dashboard/listings",
    route: "/dashboard/listings",
    persona: "Sellers managing inventory",
    promise: "Inventory management with status, quality, moderation, price guidance, and bulk actions.",
    layout: ["Segmented tabs for Active, Drafts, Pending, Sold, Needs attention", "Search/filter toolbar and compact listing rows on mobile", "Bulk selection and performance columns on desktop"],
    components: ["ListingStatusTabs", "SellerListingRow", "BulkActionBar", "QualityScoreBadge", "PriceSuggestionChip"],
    actions: ["Edit listing", "Pause/reactivate", "Boost", "Duplicate", "Bulk update", "View analytics"],
    states: ["Empty inventory", "Draft", "Pending moderation", "Active", "Sold", "Policy violation"],
    api: ["GET /api/me/listings", "PATCH /api/listings/{id}", "POST /api/listings/bulk", "GET /api/listings/{id}/analytics"]
  },
  {
    key: "create-listing",
    title: "Create listing",
    eyebrow: "User · /dashboard/listings/create",
    route: "/dashboard/listings/create",
    persona: "Sellers manually creating structured listings",
    promise: "Guided listing creation that captures category-specific data, trust evidence, fulfillment, and pricing.",
    layout: ["Mobile stepper for Basics, Photos, Details, Price, Fulfillment, Trust, Preview", "Autosave form cards with inline validation", "Desktop preview panel stays visible"],
    components: ["ListingStepper", "PhotoUploader", "CategorySelector", "DynamicAttributeForm", "PriceGuidanceCard", "PreviewPanel"],
    actions: ["Upload photos", "Select category", "Set price", "Add proof", "Save draft", "Publish"],
    states: ["Draft autosaving", "Validation errors", "Moderation precheck", "Publishing", "Published", "Upload failure"],
    api: ["POST /api/listings/drafts", "POST /api/media/uploads", "GET /api/categories/schema", "POST /api/listings/{id}/publish"]
  },
  {
    key: "ai-listing-creator",
    title: "AI listing creator",
    eyebrow: "User · /dashboard/ai-listing-creator",
    route: "/dashboard/ai-listing-creator",
    persona: "Sellers who want the fastest listing flow",
    promise: "Turns photos and a short prompt into a compliant, priced, optimized listing with seller approval.",
    layout: ["Conversational intake with photo dropzone", "AI-generated draft cards for title, category, description, attributes, price, and risks", "Approval checklist before publish", "Desktop side-by-side chat and preview"],
    components: ["AICreatorChat", "ImageDropzone", "GeneratedFieldCard", "RiskPrecheckPanel", "ApprovalChecklist"],
    actions: ["Upload photos", "Describe item", "Accept/regenerate fields", "Compare price", "Approve publish", "Request human review"],
    states: ["Generating", "Needs seller confirmation", "Low confidence", "Policy blocked", "Ready to publish", "AI unavailable fallback"],
    api: ["POST /api/ai/listing-draft", "POST /api/ai/image-analysis", "POST /api/moderation/precheck", "POST /api/listings/{id}/publish"]
  },
  {
    key: "messages",
    title: "Messages",
    eyebrow: "User · /dashboard/messages",
    route: "/dashboard/messages",
    persona: "Buyers and sellers negotiating safely",
    promise: "Structured transaction chat with AI assistance, scam detection, offer creation, and evidence preservation.",
    layout: ["Mobile inbox list transitions to thread", "Thread header with listing, trust, transaction status, and safety warning area", "Composer with quick replies, offer button, attachment, and AI draft", "Desktop split inbox/thread/context layout"],
    components: ["InboxList", "ConversationThread", "MessageComposer", "SafetyNudge", "TransactionContextPanel"],
    actions: ["Send message", "Draft with AI", "Make offer", "Block/report", "Share availability", "Attach evidence"],
    states: ["Unread", "Typing", "Suspicious content warning", "Archived", "Blocked user", "Attachment upload"],
    api: ["GET /api/messages", "GET /api/messages/{threadId}", "POST /api/messages", "POST /api/messages/{threadId}/report"]
  },
  {
    key: "offers",
    title: "Offers",
    eyebrow: "User · /dashboard/offers",
    route: "/dashboard/offers",
    persona: "Buyers and sellers managing negotiations",
    promise: "Offer lifecycle management with counteroffers, expirations, escrow readiness, and audit trail.",
    layout: ["Tabs for Sent, Received, Accepted, Expired", "Offer cards with terms, timer, listing snapshot, and next best action", "Desktop comparison table for high-volume sellers"],
    components: ["OfferTabs", "OfferCard", "CounterOfferSheet", "EscrowReadinessBadge", "OfferAuditTimeline"],
    actions: ["Accept", "Decline", "Counter", "Message", "Pay deposit", "Cancel offer"],
    states: ["Pending", "Countered", "Accepted", "Expired", "Payment required", "Risk review"],
    api: ["GET /api/offers", "POST /api/offers/{id}/accept", "POST /api/offers/{id}/counter", "POST /api/offers/{id}/decline"]
  },
  {
    key: "purchases",
    title: "Purchases",
    eyebrow: "User · /dashboard/purchases",
    route: "/dashboard/purchases",
    persona: "Buyers tracking orders and completed transactions",
    promise: "End-to-end buyer transaction tracking from escrow through fulfillment, inspection, dispute, and review.",
    layout: ["Status tabs for Active, Needs action, Completed, Disputed", "Purchase timeline cards with escrow and fulfillment milestones", "Mobile action buttons stay sticky at bottom"],
    components: ["PurchaseStatusTabs", "PurchaseTimelineCard", "EscrowStatusBadge", "InspectionChecklist", "ReviewPrompt"],
    actions: ["Track shipment", "Confirm pickup", "Release escrow", "Open dispute", "Leave review", "Download receipt"],
    states: ["Awaiting payment", "In escrow", "In transit", "Inspection window", "Completed", "Disputed"],
    api: ["GET /api/purchases", "GET /api/transactions/{id}", "POST /api/transactions/{id}/confirm", "POST /api/disputes"]
  },
  {
    key: "sales",
    title: "Sales",
    eyebrow: "User · /dashboard/sales",
    route: "/dashboard/sales",
    persona: "Sellers fulfilling orders and managing payouts",
    promise: "Sales operations that keep sellers moving from accepted offer to handoff, escrow release, payout, and review.",
    layout: ["Sales pipeline tabs", "Sale cards with buyer trust, fulfillment deadline, escrow state, and payout estimate", "Desktop fulfillment queue and payout panel"],
    components: ["SalesPipelineTabs", "SaleCard", "FulfillmentChecklist", "PayoutEstimate", "BuyerTrustSummary"],
    actions: ["Confirm availability", "Schedule pickup", "Upload tracking", "Mark handed off", "Respond to dispute", "View payout"],
    states: ["New sale", "Awaiting handoff", "In transit", "Escrow hold", "Payout scheduled", "Disputed"],
    api: ["GET /api/sales", "PATCH /api/sales/{id}", "POST /api/fulfillment/{id}/tracking", "GET /api/payouts"]
  },
  {
    key: "saved-searches",
    title: "Saved searches",
    eyebrow: "User · /dashboard/saved-searches",
    route: "/dashboard/saved-searches",
    persona: "Buyers monitoring recurring intents",
    promise: "Search missions that send alert-worthy matches, price drops, and AI-curated alternatives.",
    layout: ["Saved search cards with match count, alert settings, and latest best matches", "Create/edit sheet with filters and notification cadence", "Desktop analytics view for match quality"],
    components: ["SavedSearchCard", "AlertCadenceSelector", "MatchPreviewCarousel", "SearchMissionEditor"],
    actions: ["Create search", "Edit filters", "Pause alerts", "Open matches", "Ask AI to refine", "Delete"],
    states: ["No saved searches", "New matches", "Paused", "Low match quality", "Alert muted"],
    api: ["GET /api/saved-searches", "POST /api/saved-searches", "PATCH /api/saved-searches/{id}", "DELETE /api/saved-searches/{id}"]
  },
  {
    key: "favorites",
    title: "Favorites",
    eyebrow: "User · /dashboard/favorites",
    route: "/dashboard/favorites",
    persona: "Buyers comparing saved listings",
    promise: "A shortlist workspace with price changes, availability, seller trust, and comparison tools.",
    layout: ["Grid/list toggle with saved listing cards", "Comparison tray for up to four items", "Mobile groups favorites by category or saved date"],
    components: ["FavoriteListingCard", "ComparisonTray", "PriceDropBadge", "AvailabilityStatus", "CollectionFilter"],
    actions: ["Unfavorite", "Compare", "Message seller", "Make offer", "Move to collection", "Share shortlist"],
    states: ["Empty favorites", "Price dropped", "Listing sold", "Seller paused", "Comparison active"],
    api: ["GET /api/favorites", "DELETE /api/favorites/{listingId}", "POST /api/ai/compare-listings"]
  },
  {
    key: "trust-score",
    title: "Trust score",
    eyebrow: "User · /dashboard/trust-score",
    route: "/dashboard/trust-score",
    persona: "Users improving marketplace reputation",
    promise: "Explains transaction-specific trust, shows improvement actions, and avoids opaque single-score behavior.",
    layout: ["Trust overview card with contextual tiers", "Breakdown by identity, behavior, transactions, disputes, and community signals", "Action plan cards and history timeline"],
    components: ["TrustScoreOverview", "TrustFactorBreakdown", "ImprovementActionCard", "TrustHistoryTimeline", "ContextualScoreExplainer"],
    actions: ["Complete verification", "Resolve issue", "Review history", "Appeal signal", "Learn scoring"],
    states: ["New user", "Improving", "Limited", "High trust", "Under review", "Appeal pending"],
    api: ["GET /api/trust/me", "GET /api/trust/me/history", "POST /api/trust/appeals"]
  },
  {
    key: "verification",
    title: "Verification center",
    eyebrow: "User · /dashboard/verification",
    route: "/dashboard/verification",
    persona: "Users unlocking higher trust and transaction limits",
    promise: "Risk-based verification with clear benefits, document status, payout readiness, and privacy reassurance.",
    layout: ["Verification checklist grouped by Contact, Identity, Payment, Payout, Category proof", "Progress meter and unlock benefits", "Document upload flow and status history"],
    components: ["VerificationChecklist", "UnlockBenefitsCard", "DocumentUploadCard", "PrivacyNotice", "StatusTimeline"],
    actions: ["Verify email/phone", "Upload ID", "Add payment", "Add payout", "Submit ownership proof", "Retry failed check"],
    states: ["Not started", "In progress", "Pending review", "Verified", "Rejected", "Expired"],
    api: ["GET /api/verification/me", "POST /api/verification/contact", "POST /api/verification/documents", "POST /api/payments/methods"]
  },
  {
    key: "settings",
    title: "Settings",
    eyebrow: "User · /dashboard/settings",
    route: "/dashboard/settings",
    persona: "Users managing account preferences and safety controls",
    promise: "Account, profile, notification, privacy, security, payments, and AI permission controls in one place.",
    layout: ["Mobile settings list with nested forms", "Sections for Profile, Notifications, Privacy, Security, Payments, Payouts, AI permissions", "Desktop two-column nav and detail panel"],
    components: ["SettingsNav", "ProfileForm", "NotificationPreferences", "PrivacyControls", "SecurityPanel", "AIPermissionMatrix"],
    actions: ["Update profile", "Change notification rules", "Manage payment methods", "Rotate passkey", "Configure AI permissions", "Export/delete data"],
    states: ["Unsaved changes", "Saving", "MFA required", "Payment method failed", "Data export requested"],
    api: ["GET /api/settings", "PATCH /api/settings/profile", "PATCH /api/settings/preferences", "POST /api/account/export", "DELETE /api/account"]
  },
  {
    key: "admin-overview",
    title: "Admin overview",
    eyebrow: "Admin · /admin",
    route: "/admin",
    persona: "Marketplace operators and trust leads",
    promise: "Executive command center for marketplace health, risk queues, revenue, disputes, and SLA performance.",
    layout: ["Admin shell with left navigation and persistent queue counts", "KPI cards, health charts, top queues, incident banner, and recent audit activity", "Desktop dense data layout; mobile preserves urgent queues first"],
    components: ["AdminShell", "HealthKpiGrid", "QueueSummaryCard", "IncidentBanner", "AuditActivityFeed"],
    actions: ["Open queue", "Acknowledge incident", "Drill into metric", "Export report", "Assign case"],
    states: ["Healthy", "Incident active", "SLA breach", "Data lag", "Read-only role"],
    api: ["GET /api/admin/overview", "GET /api/admin/queues", "GET /api/admin/audit-log", ...sharedAdminApi]
  },
  {
    key: "admin-users",
    title: "Users",
    eyebrow: "Admin · /admin/users",
    route: "/admin/users",
    persona: "Support, compliance, and trust operators",
    promise: "User search and investigation workspace with identity, trust, transactions, messages, and enforcement actions.",
    layout: ["Search/filter toolbar", "User table/cards with risk and verification signals", "Detail drawer with timeline and action panel"],
    components: ["AdminUserSearch", "UserRiskTable", "UserDetailDrawer", "EnforcementActionMenu", "AuditTimeline"],
    actions: ["Search user", "Impersonation-safe view", "Suspend/limit", "Request verification", "Add note", "Export evidence"],
    states: ["No results", "High-risk user", "Suspended", "VIP/business account", "Action requires approval"],
    api: ["GET /api/admin/users", "GET /api/admin/users/{id}", "POST /api/admin/users/{id}/actions", ...sharedAdminApi]
  },
  {
    key: "admin-listings",
    title: "Listings",
    eyebrow: "Admin · /admin/listings",
    route: "/admin/listings",
    persona: "Moderators and marketplace quality teams",
    promise: "Listing moderation and quality control with AI findings, policy context, and seller history.",
    layout: ["Moderation queue tabs", "Listing review cards with media, extracted attributes, risk reasons, and policy links", "Decision panel with bulk actions"],
    components: ["ListingModerationQueue", "MediaReviewGrid", "PolicyReasonPanel", "SellerHistoryCard", "ModerationDecisionBar"],
    actions: ["Approve", "Reject", "Request changes", "Escalate", "Bulk moderate", "Contact seller"],
    states: ["Pending", "AI flagged", "Needs human review", "Approved", "Rejected", "Appealed"],
    api: ["GET /api/admin/listings", "POST /api/admin/listings/{id}/decision", "GET /api/admin/policies", ...sharedAdminApi]
  },
  {
    key: "admin-reports",
    title: "Reports",
    eyebrow: "Admin · /admin/reports",
    route: "/admin/reports",
    persona: "Support and trust teams triaging user reports",
    promise: "Centralized intake for listing, user, message, transaction, and safety reports with SLA ownership.",
    layout: ["Queue tabs by severity and type", "Report cards with evidence bundle, reporter context, and linked entities", "Assignment and resolution workflow"],
    components: ["ReportQueueTabs", "ReportEvidenceCard", "EntityGraphPanel", "AssignmentControl", "ResolutionForm"],
    actions: ["Assign", "Merge duplicate", "Investigate", "Resolve", "Escalate", "Message user"],
    states: ["New", "Assigned", "Awaiting user", "Escalated", "Resolved", "Duplicate"],
    api: ["GET /api/admin/reports", "GET /api/admin/reports/{id}", "POST /api/admin/reports/{id}/resolve", ...sharedAdminApi]
  },
  {
    key: "admin-transactions",
    title: "Transactions",
    eyebrow: "Admin · /admin/transactions",
    route: "/admin/transactions",
    persona: "Finance, support, and risk operations",
    promise: "Transaction observability for payments, escrow, fulfillment, fees, refunds, payouts, and risk holds.",
    layout: ["Transaction search and reconciliation filters", "Table with payment, escrow, fulfillment, and payout status", "Detail drawer with ledger and event timeline"],
    components: ["TransactionSearch", "TransactionLedgerTable", "EscrowStatusPanel", "RefundActionSheet", "EventTimeline"],
    actions: ["Search transaction", "Place/release hold", "Issue refund", "Export ledger", "Open dispute", "Add finance note"],
    states: ["Paid", "Escrowed", "Released", "Refunded", "Chargeback", "Reconciliation mismatch"],
    api: ["GET /api/admin/transactions", "GET /api/admin/transactions/{id}/ledger", "POST /api/admin/transactions/{id}/actions", ...sharedAdminApi]
  },
  {
    key: "admin-disputes",
    title: "Disputes",
    eyebrow: "Admin · /admin/disputes",
    route: "/admin/disputes",
    persona: "Dispute specialists and support managers",
    promise: "Evidence-based dispute resolution with timelines, policy guidance, communication, and settlement actions.",
    layout: ["Dispute queue by SLA, value, category, and severity", "Case workspace with buyer/seller statements, evidence, fulfillment data, and policy checklist", "Decision composer and refund/release controls"],
    components: ["DisputeQueue", "CaseEvidenceTimeline", "PartyStatementPanel", "PolicyChecklist", "SettlementDecisionComposer"],
    actions: ["Request evidence", "Message parties", "Decide refund/release", "Escalate legal", "Close case", "Audit decision"],
    states: ["Open", "Awaiting evidence", "Under review", "Decision drafted", "Resolved", "Appealed"],
    api: ["GET /api/admin/disputes", "GET /api/admin/disputes/{id}", "POST /api/admin/disputes/{id}/decision", ...sharedAdminApi]
  },
  {
    key: "admin-fraud-alerts",
    title: "Fraud alerts",
    eyebrow: "Admin · /admin/fraud-alerts",
    route: "/admin/fraud-alerts",
    persona: "Fraud analysts and trust engineering",
    promise: "High-signal alert investigation across users, listings, devices, payments, and graph patterns.",
    layout: ["Severity-ranked alert queue", "Graph investigation panel and linked entity timeline", "Model explanation, recommended actions, and analyst disposition"],
    components: ["FraudAlertQueue", "EntityGraph", "ModelExplanationCard", "RiskSignalTimeline", "DispositionForm"],
    actions: ["Triage alert", "Open graph", "Freeze account", "Suppress false positive", "Create rule", "Escalate cluster"],
    states: ["New alert", "Investigating", "Confirmed fraud", "False positive", "Auto-contained", "Model drift warning"],
    api: ["GET /api/admin/fraud-alerts", "GET /api/admin/fraud-alerts/{id}/graph", "POST /api/admin/fraud-alerts/{id}/disposition", ...sharedAdminApi]
  },
  {
    key: "admin-analytics",
    title: "Analytics",
    eyebrow: "Admin · /admin/analytics",
    route: "/admin/analytics",
    persona: "Marketplace leadership, growth, trust, and category managers",
    promise: "Marketplace intelligence for GMV, liquidity, conversion, fraud, category demand, and user behavior.",
    layout: ["Metric explorer with date/category/location filters", "Dashboard cards for acquisition, liquidity, transaction funnel, trust, and revenue", "Chart grid with export and annotation controls"],
    components: ["MetricFilterBar", "AnalyticsKpiGrid", "FunnelChart", "CategoryHeatmap", "ExportMenu", "AnnotationLayer"],
    actions: ["Filter metrics", "Compare periods", "Export CSV", "Annotate event", "Open segment", "Schedule report"],
    states: ["Loading warehouse data", "Data delayed", "Insufficient sample", "Experiment active", "Export ready"],
    api: ["GET /api/admin/analytics/metrics", "GET /api/admin/analytics/funnels", "POST /api/admin/analytics/exports", ...sharedAdminApi]
  }
];

export const pageByKey = Object.fromEntries(pages.map((page) => [page.key, page])) as Record<string, ExperiencePage>;

export const publicPages = pages.filter((page) => page.eyebrow.startsWith("Public"));
export const dashboardPages = pages.filter((page) => page.eyebrow.startsWith("User"));
export const adminPages = pages.filter((page) => page.eyebrow.startsWith("Admin"));
