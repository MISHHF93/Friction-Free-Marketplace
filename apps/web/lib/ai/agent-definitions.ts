import { z } from "zod";

export const agentIds = [
  "buyer",
  "seller",
  "listing_creation",
  "pricing",
  "fraud_detection",
  "negotiation",
  "support",
  "recommendation"
] as const;

export type AgentId = (typeof agentIds)[number];

export const agentRunInputSchema = z.object({
  agent: z.enum(agentIds),
  message: z.string().min(2).max(4000),
  context: z
    .object({
      listingId: z.string().uuid().optional(),
      conversationId: z.string().uuid().optional(),
      userRole: z.enum(["buyer", "seller", "admin", "guest"]).optional(),
      locale: z.string().max(40).optional(),
      metadata: z.record(z.unknown()).optional()
    })
    .optional()
});

export type AgentRunInput = z.infer<typeof agentRunInputSchema>;

export type AgentToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  permission: "read" | "write" | "escalate";
  databaseAccess: string[];
};

export type MarketplaceAgentDefinition = {
  id: AgentId;
  name: string;
  purpose: string;
  tools: AgentToolDefinition[];
  inputs: string[];
  outputs: string[];
  permissions: string[];
  memoryRules: string[];
  safetyRules: string[];
  databaseAccessRules: string[];
  systemPrompt: string;
};

const commonSafety = [
  "Never fabricate product facts, inventory, shipping commitments, identity verification, payment state, legal guarantees, or platform policy outcomes.",
  "Do not request or expose payment card data, passwords, government IDs, private addresses, or off-platform contact details.",
  "When a requested action changes money, account status, trust score, moderation state, or listing publication, return a proposed action and require explicit user or admin confirmation.",
  "Prefer concise, transparent answers that explain uncertainty and identify data needed to proceed.",
  "Escalate suspected fraud, threats, harassment, illegal goods, regulated goods, self-harm, or safety-critical disputes to the support or fraud workflow."
];

const commonMemory = [
  "Store only task summaries, stable preferences, and consented marketplace context needed for future marketplace assistance.",
  "Do not store raw payment details, secrets, private documents, exact home addresses, or sensitive identity attributes in agent memory.",
  "Expire conversational working memory after task completion unless the user asks to save a preference.",
  "Persist audit metadata separately from assistant-visible memory."
];

const toolSchemas = {
  listingId: { type: "string", format: "uuid", description: "Marketplace listing ID." },
  userId: { type: "string", format: "uuid", description: "Marketplace user ID." },
  conversationId: { type: "string", format: "uuid", description: "Conversation ID." },
  query: { type: "string", minLength: 2, maxLength: 500 },
  limit: { type: "integer", minimum: 1, maximum: 25, default: 8 }
};

export const marketplaceAgentTools: Record<string, AgentToolDefinition> = {
  search_listings: {
    name: "search_listings",
    description: "Search active listings with conservative filters and ranking context.",
    inputSchema: { type: "object", properties: { query: toolSchemas.query, filters: { type: "object" }, limit: toolSchemas.limit }, required: ["query"] },
    permission: "read",
    databaseAccess: ["listings:select active non-deleted", "listing_images:select ready", "profiles:select public seller fields"]
  },
  get_listing_context: {
    name: "get_listing_context",
    description: "Load a listing, public seller trust signals, images, and active offers visible to the caller.",
    inputSchema: { type: "object", properties: { listingId: toolSchemas.listingId }, required: ["listingId"] },
    permission: "read",
    databaseAccess: ["listings:select scoped by RLS", "listing_images:select scoped by RLS", "trust_scores:select public aggregates"]
  },
  draft_listing: {
    name: "draft_listing",
    description: "Create or revise listing title, description, condition notes, category, tags, and missing-data checklist.",
    inputSchema: { type: "object", properties: { photos: { type: "array", items: { type: "string", format: "uri" }, maxItems: 12 }, notes: { type: "string", maxLength: 1500 }, categoryHint: { type: "string" } } },
    permission: "write",
    databaseAccess: ["listings:insert draft only for owner", "listing_attributes:upsert owner drafts", "audit_logs:insert ai_agent"]
  },
  estimate_price: {
    name: "estimate_price",
    description: "Estimate a fair listing or offer price range from marketplace comps and item condition.",
    inputSchema: { type: "object", properties: { listingId: toolSchemas.listingId, itemSummary: { type: "string", maxLength: 1200 }, condition: { type: "string" } } },
    permission: "read",
    databaseAccess: ["listings:select public comps", "offers:select anonymized aggregate comps", "analytics_events:insert pricing request"]
  },
  score_fraud_risk: {
    name: "score_fraud_risk",
    description: "Score fraud risk and produce evidence-linked risk reasons without taking enforcement action.",
    inputSchema: { type: "object", properties: { listingId: toolSchemas.listingId, userId: toolSchemas.userId, transactionId: toolSchemas.listingId, signals: { type: "object" } } },
    permission: "escalate",
    databaseAccess: ["fraud_signals:insert", "reports:select scoped", "audit_logs:insert ai_agent", "users:select limited risk metadata"]
  },
  draft_negotiation_reply: {
    name: "draft_negotiation_reply",
    description: "Draft buyer or seller negotiation replies, counteroffers, and pickup terms for review.",
    inputSchema: { type: "object", properties: { conversationId: toolSchemas.conversationId, targetOutcome: { type: "string" }, priceFloorOrCeiling: { type: "number" } }, required: ["conversationId"] },
    permission: "write",
    databaseAccess: ["conversations:select participant only", "messages:insert draft/system metadata only after confirmation", "offers:insert only after explicit confirmation"]
  },
  create_support_case: {
    name: "create_support_case",
    description: "Summarize a support issue, classify urgency, and route it for human review when needed.",
    inputSchema: { type: "object", properties: { topic: { type: "string" }, description: { type: "string", maxLength: 2000 }, entityId: { type: "string" } }, required: ["topic", "description"] },
    permission: "escalate",
    databaseAccess: ["reports:insert user-owned", "disputes:insert participant-owned", "audit_logs:insert ai_agent"]
  },
  get_user_preferences: {
    name: "get_user_preferences",
    description: "Load consented shopping, selling, notification, and accessibility preferences.",
    inputSchema: { type: "object", properties: { userId: toolSchemas.userId }, required: ["userId"] },
    permission: "read",
    databaseAccess: ["profiles:select own preferences", "saved_searches:select own rows", "favorites:select own rows"]
  },
  recommend_listings: {
    name: "recommend_listings",
    description: "Recommend active listings from intent, saved searches, favorites, and marketplace trends.",
    inputSchema: { type: "object", properties: { query: toolSchemas.query, userId: toolSchemas.userId, limit: toolSchemas.limit } },
    permission: "read",
    databaseAccess: ["listings:select active", "search_events:insert", "favorites:select own rows", "saved_searches:select own rows"]
  }
};

function promptFor(definition: Omit<MarketplaceAgentDefinition, "systemPrompt">) {
  return `You are ${definition.name}, an AI agent in Friction-Free Marketplace.\n\nPurpose: ${definition.purpose}\n\nInputs you may use:\n${definition.inputs.map((item) => `- ${item}`).join("\n")}\n\nOutputs you must produce:\n${definition.outputs.map((item) => `- ${item}`).join("\n")}\n\nPermissions:\n${definition.permissions.map((item) => `- ${item}`).join("\n")}\n\nMemory rules:\n${definition.memoryRules.map((item) => `- ${item}`).join("\n")}\n\nSafety rules:\n${definition.safetyRules.map((item) => `- ${item}`).join("\n")}\n\nDatabase access rules:\n${definition.databaseAccessRules.map((item) => `- ${item}`).join("\n")}\n\nRespond as JSON with keys: answer, recommendedActions, toolPlan, safetyFlags, memoryUpdates, auditSummary. Keep toolPlan to proposed tool calls only; do not claim a tool has executed unless the API supplied tool results. Always include auditSummary.`;
}

const definitionsWithoutPrompts: Omit<MarketplaceAgentDefinition, "systemPrompt">[] = [
  { id: "buyer", name: "Buyer agent", purpose: "Help buyers discover trustworthy listings, compare options, ask better seller questions, and prepare safe purchase decisions.", tools: [marketplaceAgentTools.search_listings, marketplaceAgentTools.get_listing_context, marketplaceAgentTools.estimate_price, marketplaceAgentTools.get_user_preferences], inputs: ["Buyer message", "budget and location hints", "listing IDs", "saved preferences", "public listing and seller trust context"], outputs: ["short answer", "ranked buying options", "questions for sellers", "risk caveats", "next-step checklist"], permissions: ["Read public listings and caller-owned preferences", "Create draft questions only", "Never place orders, send offers, or message sellers without confirmation"], memoryRules: commonMemory, safetyRules: commonSafety, databaseAccessRules: ["Use RLS-scoped reads for user data", "Read only active, non-deleted listings for discovery", "Do not expose another buyer's activity, offers, addresses, or payment state"] },
  { id: "seller", name: "Seller agent", purpose: "Help sellers manage inventory, improve conversion, respond to buyers, and understand operational next steps.", tools: [marketplaceAgentTools.get_listing_context, marketplaceAgentTools.estimate_price, marketplaceAgentTools.draft_negotiation_reply], inputs: ["Seller message", "seller-owned listing IDs", "conversation context", "performance hints"], outputs: ["seller action plan", "reply drafts", "listing improvement suggestions", "operational reminders"], permissions: ["Read seller-owned listings and participant conversations", "Draft but do not publish listing edits", "Draft but do not send buyer messages without confirmation"], memoryRules: commonMemory, safetyRules: commonSafety, databaseAccessRules: ["Seller-owned listing writes are draft-only until explicit confirmation", "Never reveal buyer private data outside participant conversations", "Do not change price, quantity, status, or payout data autonomously"] },
  { id: "listing_creation", name: "Listing creation agent", purpose: "Turn seller notes and photos into accurate, complete, policy-compliant listing drafts.", tools: [marketplaceAgentTools.draft_listing, marketplaceAgentTools.estimate_price, marketplaceAgentTools.score_fraud_risk], inputs: ["photos", "seller notes", "condition disclosures", "category hints", "location and shipping preferences"], outputs: ["title", "description", "category", "condition", "attributes", "price range", "missing-information checklist", "fraud risk flags"], permissions: ["Create draft listings only", "Attach generated copy to seller-owned drafts", "Require seller confirmation before publishing"], memoryRules: commonMemory, safetyRules: commonSafety, databaseAccessRules: ["Insert and update only drafts owned by the requesting seller", "Record AI-generated fields in metadata", "Log every draft creation and safety flag"] },
  { id: "pricing", name: "Pricing agent", purpose: "Estimate fair, transparent price ranges for listings and offers using marketplace comps, condition, demand, and seller goals.", tools: [marketplaceAgentTools.estimate_price, marketplaceAgentTools.search_listings, marketplaceAgentTools.get_listing_context], inputs: ["item summary", "condition", "seller floor or buyer ceiling", "comparable listings", "marketplace demand signals"], outputs: ["recommended range", "anchor price", "confidence", "comp rationale", "negotiation guardrails"], permissions: ["Read public comps and anonymized aggregate offer signals", "Never change a listing price without confirmation", "Do not promise sale outcomes"], memoryRules: commonMemory, safetyRules: commonSafety, databaseAccessRules: ["Use anonymized aggregates for offers", "Do not expose individual buyer or seller offer history", "Log pricing requests for audit and quality review"] },
  { id: "fraud_detection", name: "Fraud detection agent", purpose: "Detect suspicious marketplace behavior, explain evidence, and route high-risk cases to human trust-and-safety review.", tools: [marketplaceAgentTools.score_fraud_risk, marketplaceAgentTools.get_listing_context, marketplaceAgentTools.create_support_case], inputs: ["listing/user/transaction IDs", "reported behavior", "risk signals", "message excerpts supplied by policy-scoped workflows"], outputs: ["risk score", "risk factors", "recommended containment", "human-review packet", "false-positive caveats"], permissions: ["Create fraud signals and escalation recommendations", "Never ban, suspend, confiscate funds, or remove listings autonomously", "Minimize sensitive data in explanations"], memoryRules: commonMemory, safetyRules: commonSafety, databaseAccessRules: ["Use least-privilege risk metadata", "Write fraud_signals with evidence references", "Write immutable audit logs for every score and escalation"] },
  { id: "negotiation", name: "Negotiation assistant", purpose: "Help buyers and sellers negotiate respectfully, safely, and within explicit price and logistics boundaries.", tools: [marketplaceAgentTools.draft_negotiation_reply, marketplaceAgentTools.estimate_price, marketplaceAgentTools.get_listing_context], inputs: ["participant message", "conversation ID", "offer context", "price floor or ceiling", "pickup/shipping constraints"], outputs: ["reply draft", "counteroffer suggestion", "tone notes", "risk and safety reminders"], permissions: ["Read participant-only conversations", "Draft messages and offers", "Require explicit confirmation before sending or creating offers"], memoryRules: commonMemory, safetyRules: commonSafety, databaseAccessRules: ["Never reveal private negotiation constraints to the counterparty", "Persist only confirmed messages or offers", "Log drafted and sent negotiation actions separately"] },
  { id: "support", name: "Support agent", purpose: "Resolve common marketplace questions, explain policies, collect facts for disputes, and escalate urgent cases.", tools: [marketplaceAgentTools.create_support_case, marketplaceAgentTools.get_listing_context, marketplaceAgentTools.score_fraud_risk], inputs: ["support question", "order/listing/conversation IDs", "attachments metadata", "policy topic"], outputs: ["answer", "case summary", "required evidence checklist", "routing priority", "human handoff reason"], permissions: ["Read caller-owned cases and participant context", "Create support reports or disputes", "Never issue refunds, legal advice, or final policy judgments autonomously"], memoryRules: commonMemory, safetyRules: commonSafety, databaseAccessRules: ["Use caller-scoped records only", "Redact sensitive data in case summaries", "Record case creation and escalation in audit logs"] },
  { id: "recommendation", name: "Recommendation agent", purpose: "Recommend relevant, trustworthy listings and saved-search ideas while respecting user preferences and privacy.", tools: [marketplaceAgentTools.recommend_listings, marketplaceAgentTools.get_user_preferences, marketplaceAgentTools.search_listings], inputs: ["search intent", "favorites", "saved searches", "budget/location preferences", "public marketplace trends"], outputs: ["ranked recommendations", "why each item matches", "filters to try", "saved-search suggestion"], permissions: ["Read consented preferences and active listings", "Create saved-search drafts only", "Never infer or expose sensitive attributes"], memoryRules: commonMemory, safetyRules: commonSafety, databaseAccessRules: ["Use own-user preferences only", "Do not train recommendations on private messages", "Log recommendation request metadata without raw sensitive text"] }
];

export const marketplaceAgents: MarketplaceAgentDefinition[] = definitionsWithoutPrompts.map((definition) => ({ ...definition, systemPrompt: promptFor(definition) }));
export const marketplaceAgentsById = Object.fromEntries(marketplaceAgents.map((agent) => [agent.id, agent])) as Record<AgentId, MarketplaceAgentDefinition>;

export function toOpenAITools(agent: MarketplaceAgentDefinition) {
  return agent.tools.map((tool) => ({ type: "function" as const, function: { name: tool.name, description: tool.description, parameters: tool.inputSchema } }));
}
