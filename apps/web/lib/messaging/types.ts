import type { Json } from "@/types/database";
import type { OfferStatus } from "@/lib/offers/state-machine";
export type { OfferStatus } from "@/lib/offers/state-machine";

export type ConversationStatus = "open" | "archived" | "blocked" | "closed";
export type MessageKind = "text" | "attachment" | "offer" | "system" | "pickup_schedule" | "deposit";
export type PickupScheduleStatus = "proposed" | "confirmed" | "reschedule_requested" | "completed" | "cancelled" | "no_show";
export type ReservationDepositStatus = "pending" | "authorized" | "held" | "released" | "forfeited" | "refunded" | "failed" | "cancelled";

export type MessagingUser = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
};

export type MessagingListing = {
  id: string;
  title: string;
  price_amount: number;
  currency: string;
  status: string;
};

export type MessageAttachment = {
  id: string;
  message_id: string;
  conversation_id: string;
  uploader_id: string;
  storage_bucket: string;
  storage_path: string;
  public_url: string | null;
  file_name: string;
  content_type: string;
  byte_size: number;
  status: string;
  created_at: string;
};

export type ConversationMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  kind: MessageKind;
  attachments: Json;
  moderation_status: string;
  read_at: string | null;
  created_at: string;
  updated_at: string;
  metadata: Json;
  message_attachments?: MessageAttachment[];
};

export type MessageReadReceipt = {
  message_id: string;
  conversation_id: string;
  user_id: string;
  read_at: string;
};

export type OfferStatusHistory = {
  id: string;
  offer_id: string;
  conversation_id: string | null;
  actor_id: string | null;
  from_status: OfferStatus | null;
  to_status: OfferStatus;
  reason: string | null;
  message: string | null;
  metadata: Json;
  created_at: string;
};

export type ConversationOffer = {
  id: string;
  conversation_id: string | null;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  created_by_id: string | null;
  responded_by_id: string | null;
  amount: number;
  currency: string;
  message: string | null;
  status: OfferStatus;
  parent_offer_id: string | null;
  response_message: string | null;
  reservation_deposit_amount: number;
  expires_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  withdrawn_at: string | null;
  offer_status_history?: OfferStatusHistory[];
  created_at: string;
  updated_at: string;
};

export type PickupSchedule = {
  id: string;
  conversation_id: string;
  listing_id: string | null;
  offer_id: string | null;
  buyer_id: string;
  seller_id: string;
  proposed_by_id: string;
  status: PickupScheduleStatus;
  starts_at: string;
  ends_at: string | null;
  timezone: string;
  location_label: string;
  location_details: string | null;
  safety_notes: string | null;
  created_at: string;
};

export type ReservationDeposit = {
  id: string;
  conversation_id: string;
  listing_id: string | null;
  offer_id: string | null;
  buyer_id: string;
  seller_id: string;
  status: ReservationDepositStatus;
  amount: number;
  currency: string;
  due_at: string | null;
  created_at: string;
};

export type ConversationSummary = {
  id: string;
  listing_id: string | null;
  buyer_id: string;
  seller_id: string;
  status: ConversationStatus;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
  metadata: Json;
  listing: MessagingListing | null;
  buyer: MessagingUser | null;
  seller: MessagingUser | null;
  messages: ConversationMessage[];
  offers: ConversationOffer[];
  pickup_schedules: PickupSchedule[];
  reservation_deposits: ReservationDeposit[];
};
