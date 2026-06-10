import { z } from "zod";
import { BaseEntitySchema, EntityIdSchema, IsoDateTimeSchema, JsonValueSchema, UrlSchema } from "./common";

export const ConversationStatusSchema = z.enum(["open", "archived", "blocked", "under_review"]);
export type ConversationStatus = z.infer<typeof ConversationStatusSchema>;

export const MessageTypeSchema = z.enum(["text", "system", "offer_event", "transaction_event", "attachment"]);
export type MessageType = z.infer<typeof MessageTypeSchema>;

export const MessageStatusSchema = z.enum(["sent", "delivered", "read", "hidden", "flagged"]);
export type MessageStatus = z.infer<typeof MessageStatusSchema>;

export const MessageAttachmentSchema = z.object({
  id: EntityIdSchema,
  fileName: z.string().trim().min(1).max(180),
  mimeType: z.string().trim().min(1).max(120),
  url: UrlSchema,
  sizeBytes: z.number().int().positive(),
});
export interface MessageAttachment extends z.infer<typeof MessageAttachmentSchema> {}

export const ConversationSchema = BaseEntitySchema.extend({
  listingId: EntityIdSchema.nullable(),
  offerId: EntityIdSchema.nullable(),
  transactionId: EntityIdSchema.nullable(),
  participantIds: z.array(EntityIdSchema).min(2),
  status: ConversationStatusSchema,
  lastMessageAt: IsoDateTimeSchema.nullable(),
});
export interface Conversation extends z.infer<typeof ConversationSchema> {}

export const MessageSchema = BaseEntitySchema.extend({
  conversationId: EntityIdSchema,
  senderId: EntityIdSchema.nullable(),
  type: MessageTypeSchema,
  status: MessageStatusSchema,
  body: z.string().trim().max(5_000).nullable(),
  attachments: z.array(MessageAttachmentSchema).max(10),
  metadata: z.record(JsonValueSchema).default({}),
  readAt: IsoDateTimeSchema.nullable(),
});
export interface Message extends z.infer<typeof MessageSchema> {}

export const StartConversationDtoSchema = z.object({
  listingId: EntityIdSchema.nullable().optional(),
  participantIds: z.array(EntityIdSchema).min(2),
  initialMessage: z.string().trim().min(1).max(5_000),
});
export interface StartConversationDto extends z.infer<typeof StartConversationDtoSchema> {}

export const SendMessageDtoSchema = z.object({
  conversationId: EntityIdSchema,
  body: z.string().trim().min(1).max(5_000).optional(),
  attachments: z.array(MessageAttachmentSchema).max(10).default([]),
  metadata: z.record(JsonValueSchema).optional(),
});
export interface SendMessageDto extends z.infer<typeof SendMessageDtoSchema> {}

export const MessageDtoSchema = MessageSchema;
export interface MessageDto extends z.infer<typeof MessageDtoSchema> {}

export const ConversationDtoSchema = ConversationSchema.extend({
  latestMessage: MessageDtoSchema.nullable(),
  unreadCount: z.number().int().nonnegative(),
});
export interface ConversationDto extends z.infer<typeof ConversationDtoSchema> {}
