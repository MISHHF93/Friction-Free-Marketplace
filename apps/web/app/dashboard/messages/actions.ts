"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const uuidSchema = z.string().uuid();

async function requireUser() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Sign in to use marketplace messaging.");
  return { supabase, user };
}

async function getConversation(supabase: ReturnType<typeof createClient>, conversationId: string) {
  const { data, error } = await (supabase as any)
    .from("conversations")
    .select("id, listing_id, buyer_id, seller_id, status")
    .eq("id", conversationId)
    .single();
  if (error || !data) throw new Error("Conversation not found.");
  return data as { id: string; listing_id: string | null; buyer_id: string; seller_id: string; status: string };
}


export async function createConversationAction(input: unknown) {
  const payload = z.object({ listingId: uuidSchema, openingMessage: z.string().trim().max(10000).optional() }).parse(input);
  const { supabase, user } = await requireUser();
  const { data: listing, error: listingError } = await (supabase as any)
    .from("listings")
    .select("id,seller_id,title,price_amount,currency")
    .eq("id", payload.listingId)
    .single();
  if (listingError || !listing) throw new Error("Listing not found.");
  if (listing.seller_id === user.id) throw new Error("Sellers cannot open buyer conversations with themselves.");

  const { data: block } = await (supabase as any)
    .from("user_blocks")
    .select("id")
    .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${listing.seller_id}),and(blocker_id.eq.${listing.seller_id},blocked_id.eq.${user.id})`)
    .maybeSingle();
  if (block) throw new Error("This seller is not available for chat.");

  const { data: existing } = await (supabase as any)
    .from("conversations")
    .select("*")
    .eq("listing_id", listing.id)
    .eq("buyer_id", user.id)
    .eq("seller_id", listing.seller_id)
    .eq("status", "open")
    .maybeSingle();

  let conversation = existing;
  if (!conversation) {
    const { data: created, error } = await (supabase as any)
      .from("conversations")
      .insert({
        listing_id: listing.id,
        buyer_id: user.id,
        seller_id: listing.seller_id,
        metadata: {
          listing_context: {
            title: listing.title,
            price_amount: listing.price_amount,
            currency: listing.currency
          }
        }
      })
      .select("*")
      .single();
    if (error) throw error;
    conversation = created;
  }
  if (!conversation) throw new Error("Unable to open conversation.");

  if (payload.openingMessage) {
    await (supabase as any).from("messages").insert({
      conversation_id: conversation.id,
      sender_id: user.id,
      body: payload.openingMessage,
      kind: "text"
    });
  }

  revalidatePath("/dashboard/messages");
  return conversation;
}

export async function sendMessageAction(input: unknown) {
  const payload = z.object({
    conversationId: uuidSchema,
    body: z.string().trim().max(10000).default(""),
    clientToken: z.string().max(100).optional(),
    attachments: z.array(z.object({
      storagePath: z.string().min(1),
      publicUrl: z.string().url().optional().or(z.literal("")),
      fileName: z.string().min(1),
      contentType: z.string().min(1),
      byteSize: z.number().int().positive().max(26214400)
    })).max(5).default([])
  }).parse(input);

  if (!payload.body && payload.attachments.length === 0) throw new Error("Write a message or attach a file.");

  const { supabase, user } = await requireUser();
  const { data: message, error } = await (supabase as any)
    .from("messages")
    .insert({
      conversation_id: payload.conversationId,
      sender_id: user.id,
      body: payload.body || "Attachment",
      kind: payload.attachments.length > 0 ? "attachment" : "text",
      client_token: payload.clientToken,
      attachments: payload.attachments
    })
    .select("*")
    .single();
  if (error) throw error;

  if (payload.attachments.length > 0) {
    const { error: attachmentError } = await (supabase as any).from("message_attachments").insert(
      payload.attachments.map((attachment) => ({
        message_id: message.id,
        conversation_id: payload.conversationId,
        uploader_id: user.id,
        storage_path: attachment.storagePath,
        public_url: attachment.publicUrl || null,
        file_name: attachment.fileName,
        content_type: attachment.contentType,
        byte_size: attachment.byteSize,
        status: "ready"
      }))
    );
    if (attachmentError) throw attachmentError;
  }

  revalidatePath("/dashboard/messages");
  return message;
}

export async function setTypingAction(input: unknown) {
  const payload = z.object({ conversationId: uuidSchema, isTyping: z.boolean() }).parse(input);
  const { supabase, user } = await requireUser();
  const { error } = await (supabase as any).from("conversation_typing_indicators").upsert({
    conversation_id: payload.conversationId,
    user_id: user.id,
    is_typing: payload.isTyping,
    typed_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 10_000).toISOString()
  });
  if (error) throw error;
}

export async function markConversationReadAction(input: unknown) {
  const payload = z.object({ conversationId: uuidSchema, messageIds: z.array(uuidSchema).max(100) }).parse(input);
  const { supabase, user } = await requireUser();
  if (payload.messageIds.length === 0) return;
  const { error } = await (supabase as any).from("message_read_receipts").upsert(
    payload.messageIds.map((messageId) => ({ message_id: messageId, conversation_id: payload.conversationId, user_id: user.id }))
  );
  if (error) throw error;
}

export async function makeOfferAction(input: unknown) {
  const payload = z.object({
    conversationId: uuidSchema,
    amount: z.coerce.number().positive(),
    message: z.string().max(1000).optional(),
    parentOfferId: uuidSchema.optional(),
    depositAmount: z.coerce.number().min(0).default(0),
    expiresAt: z.string().datetime().optional().or(z.literal(""))
  }).parse(input);

  const { supabase, user } = await requireUser();
  const conversation = await getConversation(supabase, payload.conversationId);
  const status = payload.parentOfferId ? "countered" : "pending";
  const { data: listing } = await (supabase as any).from("listings").select("currency").eq("id", conversation.listing_id).maybeSingle();

  const { data, error } = await (supabase as any)
    .from("offers")
    .insert({
      conversation_id: conversation.id,
      listing_id: conversation.listing_id,
      buyer_id: conversation.buyer_id,
      seller_id: conversation.seller_id,
      created_by_id: user.id,
      amount: payload.amount,
      currency: listing?.currency ?? "USD",
      message: payload.message,
      status,
      parent_offer_id: payload.parentOfferId,
      reservation_deposit_amount: payload.depositAmount,
      expires_at: payload.expiresAt || null
    })
    .select("*")
    .single();
  if (error) throw error;

  await (supabase as any).from("messages").insert({
    conversation_id: conversation.id,
    sender_id: user.id,
    body: payload.parentOfferId ? `Counter offer: ${data.currency} ${data.amount}` : `Offer: ${data.currency} ${data.amount}`,
    kind: "offer",
    metadata: { offer_id: data.id, status: data.status }
  });

  revalidatePath("/dashboard/messages");
  return data;
}

export async function respondToOfferAction(input: unknown) {
  const payload = z.object({ offerId: uuidSchema, status: z.enum(["accepted", "declined", "withdrawn"]), message: z.string().max(1000).optional() }).parse(input);
  const { supabase, user } = await requireUser();
  const patch: Record<string, unknown> = { status: payload.status, responded_by_id: user.id, response_message: payload.message };
  if (payload.status === "accepted") patch.accepted_at = new Date().toISOString();
  if (payload.status === "declined") patch.rejected_at = new Date().toISOString();
  if (payload.status === "withdrawn") patch.withdrawn_at = new Date().toISOString();

  const { data, error } = await (supabase as any).from("offers").update(patch).eq("id", payload.offerId).select("*").single();
  if (error) throw error;
  await (supabase as any).from("messages").insert({
    conversation_id: data.conversation_id,
    sender_id: user.id,
    body: `Offer ${payload.status}${payload.message ? `: ${payload.message}` : "."}`,
    kind: "offer",
    metadata: { offer_id: data.id, status: data.status }
  });
  revalidatePath("/dashboard/messages");
  return data;
}

export async function schedulePickupAction(input: unknown) {
  const payload = z.object({
    conversationId: uuidSchema,
    offerId: uuidSchema.optional(),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime().optional().or(z.literal("")),
    timezone: z.string().min(1).default("UTC"),
    locationLabel: z.string().min(2).max(200),
    locationDetails: z.string().max(1000).optional(),
    safetyNotes: z.string().max(1000).optional()
  }).parse(input);

  const { supabase, user } = await requireUser();
  const conversation = await getConversation(supabase, payload.conversationId);
  const { data, error } = await (supabase as any).from("pickup_schedules").insert({
    conversation_id: conversation.id,
    listing_id: conversation.listing_id,
    offer_id: payload.offerId,
    buyer_id: conversation.buyer_id,
    seller_id: conversation.seller_id,
    proposed_by_id: user.id,
    starts_at: payload.startsAt,
    ends_at: payload.endsAt || null,
    timezone: payload.timezone,
    location_label: payload.locationLabel,
    location_details: payload.locationDetails,
    safety_notes: payload.safetyNotes
  }).select("*").single();
  if (error) throw error;
  await (supabase as any).from("messages").insert({ conversation_id: conversation.id, sender_id: user.id, body: `Pickup proposed for ${new Date(payload.startsAt).toLocaleString()}.`, kind: "pickup_schedule", metadata: { pickup_schedule_id: data.id } });
  revalidatePath("/dashboard/messages");
  return data;
}

export async function createReservationDepositAction(input: unknown) {
  const payload = z.object({ conversationId: uuidSchema, offerId: uuidSchema.optional(), amount: z.coerce.number().positive(), currency: z.string().length(3).default("USD"), dueAt: z.string().datetime().optional().or(z.literal("")) }).parse(input);
  const { supabase, user } = await requireUser();
  const conversation = await getConversation(supabase, payload.conversationId);
  const { data, error } = await (supabase as any).from("reservation_deposits").insert({
    conversation_id: conversation.id,
    listing_id: conversation.listing_id,
    offer_id: payload.offerId,
    buyer_id: conversation.buyer_id,
    seller_id: conversation.seller_id,
    amount: payload.amount,
    currency: payload.currency.toUpperCase(),
    due_at: payload.dueAt || null,
    metadata: { requested_by_id: user.id }
  }).select("*").single();
  if (error) throw error;
  await (supabase as any).from("messages").insert({ conversation_id: conversation.id, sender_id: user.id, body: `Reservation deposit requested: ${data.currency} ${data.amount}.`, kind: "deposit", metadata: { deposit_id: data.id } });
  revalidatePath("/dashboard/messages");
  return data;
}

export async function reportMessageAction(input: unknown) {
  const payload = z.object({ conversationId: uuidSchema, messageId: uuidSchema, reason: z.string().min(3).max(1000) }).parse(input);
  const { supabase, user } = await requireUser();
  const { data: message } = await (supabase as any).from("messages").select("sender_id").eq("id", payload.messageId).single();
  const { error } = await (supabase as any).from("reports").insert({
    reporter_id: user.id,
    reported_user_id: message?.sender_id,
    reason: "message",
    description: payload.reason,
    conversation_id: payload.conversationId,
    message_id: payload.messageId,
    metadata: { source: "dashboard_messages" }
  });
  if (error) throw error;
  await (supabase as any).from("messages").update({ reported_at: new Date().toISOString() }).eq("id", payload.messageId);
  revalidatePath("/dashboard/messages");
}

export async function blockUserAction(input: unknown) {
  const payload = z.object({ conversationId: uuidSchema, blockedId: uuidSchema, reason: z.string().max(500).optional() }).parse(input);
  const { supabase, user } = await requireUser();
  const { error } = await (supabase as any).from("user_blocks").insert({ blocker_id: user.id, blocked_id: payload.blockedId, conversation_id: payload.conversationId, reason: payload.reason });
  if (error) throw error;
  revalidatePath("/dashboard/messages");
}
