import { z } from "zod";
import { BaseEntitySchema, EntityIdSchema, IsoDateTimeSchema, JsonValueSchema } from "./common";

export const NotificationChannelSchema = z.enum(["in_app", "email", "sms", "push", "webhook"]);
export type NotificationChannel = z.infer<typeof NotificationChannelSchema>;

export const NotificationTypeSchema = z.enum([
  "offer_received",
  "offer_updated",
  "message_received",
  "transaction_paid",
  "transaction_shipped",
  "payout_paid",
  "dispute_opened",
  "trust_review_required",
  "admin_action_required",
]);
export type NotificationType = z.infer<typeof NotificationTypeSchema>;

export const NotificationStatusSchema = z.enum(["queued", "sent", "delivered", "read", "failed", "cancelled"]);
export type NotificationStatus = z.infer<typeof NotificationStatusSchema>;

export const NotificationSchema = BaseEntitySchema.extend({
  recipientId: EntityIdSchema,
  type: NotificationTypeSchema,
  channel: NotificationChannelSchema,
  status: NotificationStatusSchema,
  title: z.string().trim().min(1).max(140),
  body: z.string().trim().min(1).max(1_000),
  data: z.record(JsonValueSchema).default({}),
  readAt: IsoDateTimeSchema.nullable(),
  sentAt: IsoDateTimeSchema.nullable(),
});
export interface Notification extends z.infer<typeof NotificationSchema> {}

export const CreateNotificationDtoSchema = z.object({
  recipientId: EntityIdSchema,
  type: NotificationTypeSchema,
  channel: NotificationChannelSchema,
  title: NotificationSchema.shape.title,
  body: NotificationSchema.shape.body,
  data: z.record(JsonValueSchema).optional(),
});
export interface CreateNotificationDto extends z.infer<typeof CreateNotificationDtoSchema> {}

export const MarkNotificationReadDtoSchema = z.object({
  notificationId: EntityIdSchema,
  readAt: IsoDateTimeSchema.optional(),
});
export interface MarkNotificationReadDto extends z.infer<typeof MarkNotificationReadDtoSchema> {}

export const NotificationDtoSchema = NotificationSchema;
export interface NotificationDto extends z.infer<typeof NotificationDtoSchema> {}
