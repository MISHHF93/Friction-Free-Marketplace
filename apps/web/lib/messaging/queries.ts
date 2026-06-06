import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConversationSummary, MessagingUser } from "./types";

type EmbeddedUser = {
  id: string;
  profiles?: Array<{ user_id: string; display_name: string; avatar_url: string | null }> | { user_id: string; display_name: string; avatar_url: string | null } | null;
} | null;

function normalizeProfile(user: EmbeddedUser): MessagingUser | null {
  if (!user) return null;
  const profile = Array.isArray(user.profiles) ? user.profiles[0] : user.profiles;
  return {
    user_id: user.id,
    display_name: profile?.display_name ?? "Marketplace user",
    avatar_url: profile?.avatar_url ?? null
  };
}

export async function getConversationSummaries(supabase: SupabaseClient<any>, userId: string) {
  const { data, error } = await (supabase as any)
    .from("conversations")
    .select(`
      id, listing_id, buyer_id, seller_id, status, last_message_at, created_at, updated_at,
      listing:listings(id,title,price_amount,currency,status),
      buyer:users!conversations_buyer_id_fkey(id,profiles(user_id,display_name,avatar_url)),
      seller:users!conversations_seller_id_fkey(id,profiles(user_id,display_name,avatar_url)),
      messages(id,conversation_id,sender_id,body,kind,attachments,moderation_status,read_at,created_at,updated_at,metadata,message_attachments(*)),
      offers(id,conversation_id,listing_id,buyer_id,seller_id,created_by_id,amount,currency,message,status,parent_offer_id,reservation_deposit_amount,expires_at,accepted_at,rejected_at,created_at,updated_at),
      pickup_schedules(id,conversation_id,listing_id,offer_id,buyer_id,seller_id,proposed_by_id,status,starts_at,ends_at,timezone,location_label,location_details,safety_notes,created_at),
      reservation_deposits(id,conversation_id,listing_id,offer_id,buyer_id,seller_id,status,amount,currency,due_at,created_at)
    `)
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order("updated_at", { ascending: false })
    .order("created_at", { referencedTable: "messages", ascending: true })
    .limit(50);

  if (error) throw error;
  return ((data ?? []) as Array<ConversationSummary & { buyer: EmbeddedUser; seller: EmbeddedUser }>).map((conversation) => ({
    ...conversation,
    buyer: normalizeProfile(conversation.buyer),
    seller: normalizeProfile(conversation.seller),
    messages: conversation.messages ?? [],
    offers: conversation.offers ?? [],
    pickup_schedules: conversation.pickup_schedules ?? [],
    reservation_deposits: conversation.reservation_deposits ?? []
  })) as ConversationSummary[];
}
