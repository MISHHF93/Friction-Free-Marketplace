"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Bell, CalendarClock, CircleDollarSign, Flag, Paperclip, Send, ShieldAlert, UserX } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ConversationMessage, ConversationOffer, ConversationSummary, MessageAttachment } from "@/lib/messaging/types";
import {
  blockUserAction,
  createReservationDepositAction,
  makeOfferAction,
  markConversationReadAction,
  reportMessageAction,
  respondToOfferAction,
  schedulePickupAction,
  sendMessageAction,
  setTypingAction
} from "@/app/dashboard/messages/actions";

function money(amount: number | string, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(amount));
}

function mergeById<T extends { id: string }>(items: T[], item: T) {
  const exists = items.some((candidate) => candidate.id === item.id);
  return exists ? items.map((candidate) => (candidate.id === item.id ? { ...candidate, ...item } : candidate)) : [...items, item];
}

export function CommunicationHub({ userId, initialConversations }: { userId: string; initialConversations: ConversationSummary[] }) {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState(initialConversations[0]?.id ?? "");
  const [body, setBody] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [offerAmount, setOfferAmount] = useState("");
  const [offerMessage, setOfferMessage] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [pickupStartsAt, setPickupStartsAt] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeId) ?? conversations[0],
    [activeId, conversations]
  );
  const otherParticipant = activeConversation?.buyer_id === userId ? activeConversation?.seller : activeConversation?.buyer;
  const otherParticipantId = activeConversation?.buyer_id === userId ? activeConversation?.seller_id : activeConversation?.buyer_id;

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`marketplace-communications:${userId}`, { config: { presence: { key: userId } } })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const message = payload.new as ConversationMessage;
        setConversations((current) => current.map((conversation) => conversation.id === message.conversation_id ? { ...conversation, messages: mergeById(conversation.messages, message), last_message_at: message.created_at } : conversation));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "message_attachments" }, (payload) => {
        const attachment = payload.new as MessageAttachment;
        setConversations((current) => current.map((conversation) => conversation.id === attachment.conversation_id ? {
          ...conversation,
          messages: conversation.messages.map((message) => message.id === attachment.message_id ? { ...message, message_attachments: mergeById(message.message_attachments ?? [], attachment) } : message)
        } : conversation));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "offers" }, (payload) => {
        const offer = payload.new as ConversationOffer;
        if (!offer.conversation_id) return;
        setConversations((current) => current.map((conversation) => conversation.id === offer.conversation_id ? { ...conversation, offers: mergeById(conversation.offers, offer) } : conversation));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "pickup_schedules" }, (payload) => {
        const schedule = payload.new as ConversationSummary["pickup_schedules"][number];
        setConversations((current) => current.map((conversation) => conversation.id === schedule.conversation_id ? { ...conversation, pickup_schedules: mergeById(conversation.pickup_schedules, schedule) } : conversation));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "reservation_deposits" }, (payload) => {
        const deposit = payload.new as ConversationSummary["reservation_deposits"][number];
        setConversations((current) => current.map((conversation) => conversation.id === deposit.conversation_id ? { ...conversation, reservation_deposits: mergeById(conversation.reservation_deposits, deposit) } : conversation));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "conversation_typing_indicators" }, (payload) => {
        const typing = payload.new as { conversation_id: string; user_id: string; is_typing: boolean; expires_at: string };
        setTypingUsers((current) => {
          const existing = current[typing.conversation_id] ?? [];
          const next = typing.is_typing && typing.user_id !== userId && new Date(typing.expires_at).getTime() > Date.now()
            ? Array.from(new Set([...existing, typing.user_id]))
            : existing.filter((id) => id !== typing.user_id);
          return { ...current, [typing.conversation_id]: next };
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    if (!activeConversation) return;
    const unread = activeConversation.messages.filter((message) => message.sender_id !== userId && !message.read_at).map((message) => message.id);
    if (unread.length > 0) markConversationReadAction({ conversationId: activeConversation.id, messageIds: unread }).catch(() => null);
  }, [activeConversation, userId]);

  function runAction(action: () => Promise<unknown>, reset?: () => void) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        reset?.();
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Communication action failed.");
      }
    });
  }

  function onMessageInput(value: string) {
    setBody(value);
    if (!activeConversation) return;
    setTypingAction({ conversationId: activeConversation.id, isTyping: true }).catch(() => null);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setTypingAction({ conversationId: activeConversation.id, isTyping: false }).catch(() => null), 1200);
  }

  if (!activeConversation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Messages</CardTitle>
          <CardDescription>Start from a listing to open a buyer/seller conversation with offers, scheduling, deposits, and safety controls.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const pendingOffer = activeConversation.offers.find((offer) => offer.status === "pending" || offer.status === "countered");
  const latestDeposit = activeConversation.reservation_deposits[0];
  const latestPickup = activeConversation.pickup_schedules[0];

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Conversations</CardTitle>
          <CardDescription>Supabase Realtime keeps every thread, receipt, and negotiation update live.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 p-3">
          {conversations.map((conversation) => {
            const participant = conversation.buyer_id === userId ? conversation.seller : conversation.buyer;
            const latestMessage = conversation.messages[conversation.messages.length - 1];
            return (
              <button key={conversation.id} onClick={() => setActiveId(conversation.id)} className={cn("rounded-xl border p-3 text-left transition hover:bg-secondary", conversation.id === activeConversation.id && "border-primary bg-secondary")}>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{participant?.display_name ?? "Marketplace user"}</p>
                  <Badge className={conversation.status === "blocked" ? "border-destructive/30 bg-destructive text-destructive-foreground" : undefined}>{conversation.status}</Badge>
                </div>
                <p className="mt-1 truncate text-sm text-muted-foreground">{conversation.listing?.title ?? "General marketplace conversation"}</p>
                <p className="mt-2 truncate text-xs text-muted-foreground">{latestMessage?.body ?? "No messages yet."}</p>
              </button>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-4">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>{activeConversation.listing?.title ?? "Conversation"}</CardTitle>
              <CardDescription>With {otherParticipant?.display_name ?? "marketplace user"} · {activeConversation.listing ? money(activeConversation.listing.price_amount, activeConversation.listing.currency) : "No listing attached"}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => runAction(() => reportMessageAction({ conversationId: activeConversation.id, messageId: activeConversation.messages.at(-1)?.id, reason: reportReason || "Unsafe or inappropriate message" }))} disabled={!activeConversation.messages.length || isPending}><Flag className="mr-2 h-4 w-4" />Report</Button>
              <Button variant="destructive" size="sm" onClick={() => otherParticipantId && runAction(() => blockUserAction({ conversationId: activeConversation.id, blockedId: otherParticipantId, reason: "Blocked from chat UI" }))} disabled={!otherParticipantId || isPending}><UserX className="mr-2 h-4 w-4" />Block</Button>
            </div>
          </CardHeader>
          <CardContent>
            {error && <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
            <div className="h-[430px] space-y-3 overflow-y-auto rounded-2xl border bg-background p-4">
              {activeConversation.messages.map((message) => {
                const own = message.sender_id === userId;
                return (
                  <div key={message.id} className={cn("flex", own ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[78%] rounded-2xl px-4 py-3 text-sm", own ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground")}>
                      <div className="mb-1 flex items-center gap-2 text-xs opacity-80">
                        <Badge className="bg-background/70">{message.kind}</Badge>
                        <span>{new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <p className="whitespace-pre-wrap">{message.body}</p>
                      {(message.message_attachments ?? []).map((attachment) => (
                        <a key={attachment.id} href={attachment.public_url ?? "#"} className="mt-2 flex items-center gap-2 underline" target="_blank" rel="noreferrer"><Paperclip className="h-4 w-4" />{attachment.file_name}</a>
                      ))}
                      {own && <p className="mt-1 text-right text-[11px] opacity-70">{message.read_at ? "Read" : "Sent"}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 h-5 text-xs text-muted-foreground">{(typingUsers[activeConversation.id] ?? []).length > 0 ? `${otherParticipant?.display_name ?? "They"} is typing…` : " "}</div>
            <form className="mt-3 grid gap-3" onSubmit={(event) => { event.preventDefault(); runAction(() => sendMessageAction({ conversationId: activeConversation.id, body, clientToken: crypto.randomUUID(), attachments: attachmentUrl ? [{ storagePath: `external/${crypto.randomUUID()}`, publicUrl: attachmentUrl, fileName: attachmentUrl.split('/').pop() || 'attachment', contentType: 'application/octet-stream', byteSize: 1024 }] : [] }), () => { setBody(""); setAttachmentUrl(""); }); }}>
              <Textarea value={body} onChange={(event) => onMessageInput(event.target.value)} placeholder="Write a real-time message…" />
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <Input value={attachmentUrl} onChange={(event) => setAttachmentUrl(event.target.value)} placeholder="Optional attachment URL (uploaded path can be stored here)" />
                <Button disabled={isPending || (!body && !attachmentUrl)}><Send className="mr-2 h-4 w-4" />Send</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-3">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><CircleDollarSign className="h-5 w-5" />Offer desk</CardTitle><CardDescription>Make, counter, accept, and reject offers.</CardDescription></CardHeader>
            <CardContent className="grid gap-3">
              {pendingOffer && <div className="rounded-xl bg-secondary p-3 text-sm">Latest: {money(pendingOffer.amount, pendingOffer.currency)} · {pendingOffer.status}</div>}
              <Label htmlFor="offerAmount">Offer amount</Label>
              <Input id="offerAmount" value={offerAmount} onChange={(event) => setOfferAmount(event.target.value)} type="number" min="1" step="0.01" />
              <Textarea value={offerMessage} onChange={(event) => setOfferMessage(event.target.value)} placeholder="Terms, timing, or counter-offer note" />
              <Button disabled={!offerAmount || isPending} onClick={() => runAction(() => makeOfferAction({ conversationId: activeConversation.id, amount: offerAmount, message: offerMessage, parentOfferId: pendingOffer?.id, depositAmount: depositAmount ? Number(depositAmount) : 0 }), () => { setOfferAmount(""); setOfferMessage(""); })}>Make / counter offer</Button>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" disabled={!pendingOffer || isPending} onClick={() => pendingOffer && runAction(() => respondToOfferAction({ offerId: pendingOffer.id, status: "accepted", message: "Accepted from chat." }))}>Accept</Button>
                <Button variant="outline" disabled={!pendingOffer || isPending} onClick={() => pendingOffer && runAction(() => respondToOfferAction({ offerId: pendingOffer.id, status: "declined", message: "Rejected from chat." }))}>Reject</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><CalendarClock className="h-5 w-5" />Pickup</CardTitle><CardDescription>Schedule a safe handoff and track no-shows.</CardDescription></CardHeader>
            <CardContent className="grid gap-3">
              {latestPickup && <div className="rounded-xl bg-secondary p-3 text-sm">{new Date(latestPickup.starts_at).toLocaleString()} · {latestPickup.status}</div>}
              <Input value={pickupStartsAt} onChange={(event) => setPickupStartsAt(event.target.value)} type="datetime-local" />
              <Input value={pickupLocation} onChange={(event) => setPickupLocation(event.target.value)} placeholder="Public meetup location" />
              <Button disabled={!pickupStartsAt || !pickupLocation || isPending} onClick={() => runAction(() => schedulePickupAction({ conversationId: activeConversation.id, offerId: pendingOffer?.id, startsAt: new Date(pickupStartsAt).toISOString(), locationLabel: pickupLocation, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }), () => { setPickupStartsAt(""); setPickupLocation(""); })}>Propose pickup</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5" />Trust controls</CardTitle><CardDescription>Deposits, anti-ghosting, reports, and blocking.</CardDescription></CardHeader>
            <CardContent className="grid gap-3">
              {latestDeposit && <div className="rounded-xl bg-secondary p-3 text-sm">Deposit: {money(latestDeposit.amount, latestDeposit.currency)} · {latestDeposit.status}</div>}
              <Input value={depositAmount} onChange={(event) => setDepositAmount(event.target.value)} type="number" min="1" step="0.01" placeholder="Reservation deposit" />
              <Button disabled={!depositAmount || isPending} onClick={() => runAction(() => createReservationDepositAction({ conversationId: activeConversation.id, offerId: pendingOffer?.id, amount: depositAmount }), () => setDepositAmount(""))}><Bell className="mr-2 h-4 w-4" />Request deposit</Button>
              <Textarea value={reportReason} onChange={(event) => setReportReason(event.target.value)} placeholder="Report details for the latest message" />
              <p className="text-xs text-muted-foreground">Anti-ghosting penalties are created when pickup no-shows or forfeited deposits are reviewed by trust & safety.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
