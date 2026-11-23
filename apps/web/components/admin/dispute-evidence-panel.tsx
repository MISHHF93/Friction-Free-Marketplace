"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type EvidenceItem = {
  id: string;
  actor_id: string;
  note: string | null;
  storage_path: string | null;
  mime_type: string | null;
  created_at: string;
  signedUrl: string | null;
};

export function AdminDisputeEvidenceActions({ disputeId, status }: { disputeId: string; status: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  async function requestEvidence(party: "buyer" | "seller") {
    setPending(party);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/disputes/${disputeId}/request-evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ party, reason: `Please add evidence as the ${party}.` })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "The request could not be sent.");
      setMessage(`Evidence requested from the ${party}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The request could not be sent.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" disabled={pending !== null} onClick={() => void requestEvidence("buyer")}>
          {pending === "buyer" ? "Requesting…" : "Request buyer evidence"}
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={pending !== null} onClick={() => void requestEvidence("seller")}>
          {pending === "seller" ? "Requesting…" : "Request seller evidence"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Current status: {status}</p>
      {message ? <p className="text-xs text-muted-foreground" role="status">{message}</p> : null}
    </div>
  );
}

export function AdminEvidenceGallery({ items }: { items: EvidenceItem[] }) {
  if (!items.length) {
    return <p className="text-sm text-muted-foreground">No evidence has been submitted yet.</p>;
  }
  return (
    <ul className="grid gap-4">
      {items.map((item) => (
        <li key={item.id} className="rounded-2xl border border-border p-4">
          <p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()} · {item.actor_id}</p>
          {item.note ? <p className="mt-2 text-sm">{item.note}</p> : null}
          {item.signedUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.signedUrl} alt="Dispute evidence photo" className="mt-3 max-h-80 rounded-xl border border-border object-contain" />
          ) : item.storage_path ? (
            <p className="mt-2 text-sm text-muted-foreground">A photo was uploaded, but a signed URL could not be created.</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
