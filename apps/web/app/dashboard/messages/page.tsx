import { MessageSquare, ShieldCheck, Zap } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { CommunicationHub } from "@/components/messaging/communication-hub";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getConversationSummaries } from "@/lib/messaging/queries";
import type { ConversationSummary } from "@/lib/messaging/types";

const links = [
  { href: "/dashboard/messages", label: "Messages" },
  { href: "/dashboard/offers", label: "Offers" },
  { href: "/dashboard/purchases", label: "Purchases" },
  { href: "/dashboard/sales", label: "Sales" }
];

export default async function MessagesPage() {
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
    setupError = error instanceof Error ? error.message : "Unable to load messaging.";
  }

  return (
    <DashboardShell title="Communication hub" description="Real-time buyer/seller conversations with negotiation, pickup, deposits, and trust tooling." links={links}>
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Zap className="h-4 w-4 text-primary" />Realtime messages</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">Supabase Realtime streams message inserts, attachments, offer updates, typing indicators, and read receipts.</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><MessageSquare className="h-4 w-4 text-primary" />Negotiation workflow</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">Make offers, counter, accept, reject, request reservation deposits, and schedule pickup without leaving chat.</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4 text-primary" />Safety controls</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">Report messages, block users, and feed anti-ghosting penalty workflows for trust & safety review.</CardContent>
        </Card>
      </div>

      {setupError && (
        <Card className="mb-6 border-destructive/40 bg-destructive/10">
          <CardHeader>
            <CardTitle>Messaging setup needed</CardTitle>
            <CardDescription>{setupError}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {userId ? (
        <CommunicationHub userId={userId} initialConversations={conversations} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Sign in to open conversations</CardTitle>
            <CardDescription>The communication hub uses authenticated Supabase RLS policies so only buyers, sellers, and admins can read each thread.</CardDescription>
          </CardHeader>
        </Card>
      )}
    </DashboardShell>
  );
}
