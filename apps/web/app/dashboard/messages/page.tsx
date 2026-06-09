import { MessageSquare, ShieldCheck, Zap } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { CommunicationHub } from "@/components/messaging/communication-hub";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getConversationSummaries } from "@/lib/messaging/queries";
import type { ConversationSummary } from "@/lib/messaging/types";

export default async function MessagesPage({ searchParams }: { searchParams?: Promise<{ conversation?: string }> }) {
  const resolvedSearchParams = await searchParams;
  let userId = "";
  let conversations: ConversationSummary[] = [];
  let setupError: string | null = null;

  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      userId = user.id;
      conversations = await getConversationSummaries(supabase, user.id);
    }
  } catch (error) {
    setupError = error instanceof Error ? error.message : "Messages could not be loaded right now.";
  }

  return (
    <DashboardShell title="Messages" description="Buyer and seller conversations with offers, pickup details, deposits, and safety tools in one place.">
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Zap className="h-4 w-4 text-primary" />Live messages</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">See messages, attachments, offer updates, typing indicators, and read receipts as they arrive.</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><MessageSquare className="h-4 w-4 text-primary" />Offers and pickup</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">Make offers, counter, accept, reject, request reservation deposits, and schedule pickup without leaving chat.</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4 text-primary" />Safety controls</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">Report messages, block users, and keep safety concerns available for review.</CardContent>
        </Card>
      </div>

      {setupError && (
        <Card className="mb-6 border-destructive/40 bg-destructive/10">
          <CardHeader>
            <CardTitle>Messages need attention</CardTitle>
            <CardDescription>{setupError}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {userId ? (
        <CommunicationHub userId={userId} initialConversations={conversations} initialConversationId={resolvedSearchParams?.conversation} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Sign in to open conversations</CardTitle>
            <CardDescription>Only authenticated conversation participants can read each thread.</CardDescription>
          </CardHeader>
        </Card>
      )}
    </DashboardShell>
  );
}
