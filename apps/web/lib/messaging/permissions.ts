import type { SupabaseClient } from "@supabase/supabase-js";

type Db = SupabaseClient<any>;

export type ConversationPermissionRecord = {
  id: string;
  listing_id: string | null;
  buyer_id: string;
  seller_id: string;
  status: string;
};

export class MessagingPermissionError extends Error {
  readonly status: 401 | 403 | 404 | 409;

  constructor(message: string, status: MessagingPermissionError["status"] = 403) {
    super(message);
    this.name = "MessagingPermissionError";
    this.status = status;
  }
}

export function getOtherParticipantId(conversation: ConversationPermissionRecord, userId: string) {
  if (conversation.buyer_id === userId) return conversation.seller_id;
  if (conversation.seller_id === userId) return conversation.buyer_id;
  return null;
}

export function assertConversationParticipant(conversation: ConversationPermissionRecord | null, userId: string): asserts conversation is ConversationPermissionRecord {
  if (!conversation) throw new MessagingPermissionError("Conversation not found.", 404);
  if (![conversation.buyer_id, conversation.seller_id].includes(userId)) {
    throw new MessagingPermissionError("You do not have permission to access this conversation.", 403);
  }
}

export function assertConversationOpen(conversation: ConversationPermissionRecord) {
  if (conversation.status === "blocked") {
    throw new MessagingPermissionError("This conversation is blocked.", 409);
  }
  if (conversation.status === "closed") {
    throw new MessagingPermissionError("This conversation is closed.", 409);
  }
}

export async function getConversationForPermission(supabase: Db, conversationId: string) {
  const { data, error } = await (supabase as any)
    .from("conversations")
    .select("id, listing_id, buyer_id, seller_id, status")
    .eq("id", conversationId)
    .maybeSingle();

  if (error) throw error;
  return data as ConversationPermissionRecord | null;
}

export async function assertCanUseConversation(supabase: Db, conversationId: string, userId: string, options: { requireOpen?: boolean } = {}) {
  const conversation = await getConversationForPermission(supabase, conversationId);
  assertConversationParticipant(conversation, userId);
  if (options.requireOpen) assertConversationOpen(conversation);
  return conversation;
}
