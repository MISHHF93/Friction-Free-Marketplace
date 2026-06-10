"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { evaluateMessageFraud, evaluateMessageReportRate } from "@/lib/fraud/detection";
import { getConversationSummaryById } from "@/lib/messaging/queries";
import { assertCanUseConversation, getOtherParticipantId } from "@/lib/messaging/permissions";
import { enqueueTemplateNotification } from "@/lib/notifications/service";
import { recipientForOfferAction } from "@/lib/offers/state-machine";

const uuidSchema = z.string().uuid();
const MESSAGE_ATTACHMENT_BUCKET = "message-attachments";
const MAX_ATTACHMENT_FILES = 5;
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf", "text/plain", "video/mp4"]);

async function requireUser() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Sign in to use marketplace messaging.");
  return { supabase, user };
}


export async function getConversationSummaryAction(input: unknown) {
  const payload = z.object({ conversationId: uuidSchema }).parse(input);
  const { supabase } = await requireUser();
  return getConversationSummaryById(supabase, payload.conversationId);
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
    const { data: openingMessage, error: openingMessageError } = await (supabase as any).from("messages").insert({
      conversation_id: conversation.id,
      sender_id: user.id,
      body: payload.openingMessage,
      kind: "text"
    }).select("id").single();
    if (openingMessageError) throw openingMessageError;
    if (openingMessage?.id) await evaluateMessageFraud(openingMessage.id);
    await enqueueTemplateNotification({
      userId: listing.seller_id,
      template: "message_received",
      input: {
        actorName: user.email,
        listingTitle: listing.title,
        messagePreview: payload.openingMessage,
        actionUrl: `/dashboard/messages?conversation=${conversation.id}`
      },
      payload: { conversation_id: conversation.id, listing_id: listing.id, message_id: openingMessage?.id ?? null }
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
  const conversation = await assertCanUseConversation(supabase as any, payload.conversationId, user.id, { requireOpen: true });
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
  await evaluateMessageFraud(message.id);
  await enqueueTemplateNotification({
    userId: user.id === conversation.buyer_id ? conversation.seller_id : conversation.buyer_id,
    template: "message_received",
    input: {
      actorName: user.email,
      listingTitle: "a marketplace conversation",
      messagePreview: payload.body || "Attachment",
      actionUrl: `/dashboard/messages?conversation=${conversation.id}`
    },
    payload: { conversation_id: conversation.id, listing_id: conversation.listing_id, message_id: message.id }
  });

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

export async function uploadMessageAttachmentsAction(formData: FormData) {
  const conversationId = String(formData.get("conversationId") ?? "");
  const parsedConversationId = uuidSchema.parse(conversationId);
  const { supabase, user } = await requireUser();
  await assertCanUseConversation(supabase as any, parsedConversationId, user.id, { requireOpen: true });

  const files = formData.getAll("files").filter((value): value is File => value instanceof File);
  if (!files.length) throw new Error("Choose at least one attachment.");
  if (files.length > MAX_ATTACHMENT_FILES) throw new Error(`Attach up to ${MAX_ATTACHMENT_FILES} files per message.`);

  const admin = createAdminClient();
  const uploaded = [];

  for (const file of files) {
    if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
      throw new Error(`${file.name} must be a JPEG, PNG, WebP, PDF, text file, or MP4.`);
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      throw new Error(`${file.name} is larger than 25MB.`);
    }

    const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
    const storagePath = `${user.id}/${parsedConversationId}/${crypto.randomUUID()}.${extension}`;
    const bytes = await file.arrayBuffer();
    const { error } = await admin.storage.from(MESSAGE_ATTACHMENT_BUCKET).upload(storagePath, bytes, {
      contentType: file.type,
      upsert: false
    });
    if (error) throw error;

    const { data: signed } = await admin.storage.from(MESSAGE_ATTACHMENT_BUCKET).createSignedUrl(storagePath, 60 * 60);
    uploaded.push({
      storagePath,
      publicUrl: signed?.signedUrl ?? "",
      fileName: file.name,
      contentType: file.type,
      byteSize: file.size
    });
  }

  return uploaded;
}

export async function setTypingAction(input: unknown) {
  const payload = z.object({ conversationId: uuidSchema, isTyping: z.boolean() }).parse(input);
  const { supabase, user } = await requireUser();
  await assertCanUseConversation(supabase as any, payload.conversationId, user.id, { requireOpen: true });
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
  await assertCanUseConversation(supabase as any, payload.conversationId, user.id);
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
  await assertCanUseConversation(supabase as any, payload.conversationId, user.id, { requireOpen: true });
  const { data, error } = await (supabase as any).rpc("create_negotiation_offer", {
    p_conversation_id: payload.conversationId,
    p_amount: payload.amount,
    p_message: payload.message || null,
    p_parent_offer_id: payload.parentOfferId || null,
    p_reservation_deposit_amount: payload.depositAmount,
    p_expires_at: payload.expiresAt || null
  });
  if (error) throw error;
  const recipientId = recipientForOfferAction({
    buyerId: data.buyer_id,
    sellerId: data.seller_id,
    actorId: data.created_by_id ?? user.id,
  });
  await enqueueTemplateNotification({
    userId: recipientId ?? data.seller_id,
    template: data.parent_offer_id ? "offer_countered" : "offer_received",
    input: {
      amount: data.amount,
      currency: data.currency,
      actionUrl: `/dashboard/messages?conversation=${data.conversation_id ?? ""}`
    },
    payload: { offer_id: data.id, conversation_id: data.conversation_id, listing_id: data.listing_id },
    channels: ["email"]
  });

  revalidatePath("/dashboard/messages");
  revalidatePath("/dashboard/offers");
  return data;
}

export async function respondToOfferAction(input: unknown) {
  const payload = z.object({ offerId: uuidSchema, status: z.enum(["accepted", "declined", "withdrawn", "expired"]), message: z.string().max(1000).optional() }).parse(input);
  const { supabase } = await requireUser();
  const { data, error } = await (supabase as any).rpc("respond_to_negotiation_offer", {
    p_offer_id: payload.offerId,
    p_status: payload.status,
    p_message: payload.message || null
  });
  if (error) throw error;
  const recipientId = data.responded_by_id === data.buyer_id ? data.seller_id : data.buyer_id;
  await enqueueTemplateNotification({
    userId: recipientId,
    template: data.status === "accepted" ? "offer_accepted" : data.status === "declined" ? "offer_declined" : data.status === "expired" ? "offer_expired" : "offer_withdrawn",
    input: {
      amount: data.amount,
      currency: data.currency,
      actionUrl: `/dashboard/messages?conversation=${data.conversation_id ?? ""}`
    },
    payload: { offer_id: data.id, conversation_id: data.conversation_id, listing_id: data.listing_id },
    channels: ["email"]
  });
  revalidatePath("/dashboard/messages");
  revalidatePath("/dashboard/offers");
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
  const conversation = await assertCanUseConversation(supabase as any, payload.conversationId, user.id, { requireOpen: true });
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
  const conversation = await assertCanUseConversation(supabase as any, payload.conversationId, user.id, { requireOpen: true });
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
  await assertCanUseConversation(supabase as any, payload.conversationId, user.id);
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
  if (message?.sender_id) await evaluateMessageReportRate(message.sender_id);
  revalidatePath("/dashboard/messages");
}


export async function reportUserAction(input: unknown) {
  const payload = z.object({ conversationId: uuidSchema, reportedUserId: uuidSchema, reason: z.string().min(3).max(1000) }).parse(input);
  const { supabase, user } = await requireUser();
  const conversation = await assertCanUseConversation(supabase as any, payload.conversationId, user.id);
  if (![conversation.buyer_id, conversation.seller_id].includes(payload.reportedUserId) || payload.reportedUserId === user.id) {
    throw new Error("Reported user must be the other conversation participant.");
  }
  const { error } = await (supabase as any).from("reports").insert({
    reporter_id: user.id,
    reported_user_id: payload.reportedUserId,
    reason: "user",
    description: payload.reason,
    conversation_id: payload.conversationId,
    metadata: { source: "dashboard_messages", target: "conversation_participant" }
  });
  if (error) throw error;
  revalidatePath("/dashboard/messages");
}

export async function blockUserAction(input: unknown) {
  const payload = z.object({ conversationId: uuidSchema, blockedId: uuidSchema, reason: z.string().max(500).optional() }).parse(input);
  const { supabase, user } = await requireUser();
  const conversation = await assertCanUseConversation(supabase as any, payload.conversationId, user.id);
  const otherParticipantId = getOtherParticipantId(conversation, user.id);
  if (payload.blockedId !== otherParticipantId) throw new Error("You can only block the other participant in this conversation.");
  const { error } = await (supabase as any).from("user_blocks").upsert({ blocker_id: user.id, blocked_id: payload.blockedId, conversation_id: payload.conversationId, reason: payload.reason });
  if (error) throw error;
  await (supabase as any)
    .from("conversations")
    .update({
      status: "blocked",
      metadata: {
        blocked_by: user.id,
        blocked_user_id: payload.blockedId,
        blocked_at: new Date().toISOString()
      }
    })
    .eq("id", payload.conversationId);
  revalidatePath("/dashboard/messages");
}
