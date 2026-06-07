"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Send } from "lucide-react";
import { createConversationAction } from "@/app/dashboard/messages/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function StartConversationCard({ listingId, disabled = false }: { listingId: string; disabled?: boolean }) {
  const router = useRouter();
  const [openingMessage, setOpeningMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function startConversation() {
    setError(null);
    startTransition(async () => {
      try {
        const conversation = await createConversationAction({
          listingId,
          openingMessage: openingMessage.trim() || "Hi, is this still available?"
        });
        router.push(`/dashboard/messages?conversation=${conversation.id}`);
      } catch (conversationError) {
        setError(conversationError instanceof Error ? conversationError.message : "Unable to start this conversation.");
      }
    });
  }

  return (
    <div className="grid gap-2 rounded-2xl border border-border bg-background p-3">
      <Textarea
        value={openingMessage}
        onChange={(event) => setOpeningMessage(event.target.value)}
        placeholder="Ask the seller a question or suggest a pickup time…"
        className="min-h-24"
        disabled={disabled || isPending}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="button" variant="outline" size="lg" onClick={startConversation} disabled={disabled || isPending}>
        {isPending ? <Send className="h-4 w-4 animate-pulse" /> : <MessageSquare className="h-4 w-4" />}
        Message seller
      </Button>
      {disabled && <p className="text-xs text-muted-foreground">Sign in as a buyer to message this seller.</p>}
    </div>
  );
}
