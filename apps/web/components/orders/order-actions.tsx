"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function OrderFollowUpForms() {
  const [reviewStatus, setReviewStatus] = useState("Reviews are saved for this account after a completed order.");
  const [disputeStatus, setDisputeStatus] = useState("Disputes stay on the order and do not charge a card.");

  async function submit(path: string, payload: Record<string, string>, setStatus: (value: string) => void) {
    setStatus("Saving...");
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = await response.json().catch(() => ({}));
    setStatus(response.ok ? String(body.message ?? "Saved.") : String(body.error ?? "Could not save that request."));
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <form className="grid gap-3 rounded-2xl border border-border p-4" onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        void submit("/api/reviews", {
          transactionId: String(data.get("transactionId") ?? ""),
          rating: String(data.get("rating") ?? ""),
          body: String(data.get("body") ?? "")
        }, setReviewStatus);
      }}>
        <h3 className="text-lg font-bold">Write a review</h3>
        <Label htmlFor="review-order">Completed order</Label>
        <Input id="review-order" name="transactionId" required placeholder="Order id" />
        <Label htmlFor="review-rating">Rating from 1 to 5</Label>
        <Input id="review-rating" name="rating" type="number" min="1" max="5" required defaultValue="5" />
        <Label htmlFor="review-body">Review</Label>
        <Textarea id="review-body" name="body" required minLength={10} placeholder="What went well or what should the next buyer know?" />
        <Button type="submit">Submit review</Button>
        <p className="text-sm text-muted-foreground" role="status">{reviewStatus}</p>
      </form>
      <form className="grid gap-3 rounded-2xl border border-border p-4" onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        void submit("/api/disputes", {
          transactionId: String(data.get("transactionId") ?? ""),
          reason: String(data.get("reason") ?? "")
        }, setDisputeStatus);
      }}>
        <h3 className="text-lg font-bold">Open a dispute</h3>
        <Label htmlFor="dispute-order">Dispute order</Label>
        <Input id="dispute-order" name="transactionId" required placeholder="Order id" />
        <Label htmlFor="dispute-reason">What happened</Label>
        <Textarea id="dispute-reason" name="reason" required minLength={10} placeholder="Describe the order problem." />
        <Button type="submit" variant="outline">Submit dispute</Button>
        <p className="text-sm text-muted-foreground" role="status">{disputeStatus}</p>
      </form>
    </div>
  );
}
