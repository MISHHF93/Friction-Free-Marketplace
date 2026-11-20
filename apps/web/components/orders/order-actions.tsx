"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/i18n/format";

export type OrderActionTarget = {
  id: string;
  title: string;
  status: string;
  amount: number;
  currency: string;
};

async function postJson(path: string, payload: Record<string, string>) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const body = await response.json().catch(() => ({}));
  return response.ok ? String(body.message ?? "Saved.") : String(body.error ?? "Could not save that request.");
}

export function OrderFollowUpForms({ orders = [] }: { orders?: OrderActionTarget[] }) {
  return (
    <div className="grid gap-4">
      {orders.length === 0 ? <p className="text-sm text-muted-foreground">Orders appear here with review and dispute actions after checkout.</p> : null}
      {orders.map((order) => <OrderActions key={order.id} order={order} />)}
    </div>
  );
}

function OrderActions({ order }: { order: OrderActionTarget }) {
  const [reviewStatus, setReviewStatus] = useState("Reviews are saved for this account after a completed order.");
  const canReview = order.status === "completed";
  if (!canReview) return null;

  return (
    <article className="grid gap-3 rounded-2xl border border-border p-4">
      <h3 className="text-lg font-bold">{order.title}</h3>
      <p className="text-sm text-muted-foreground">{formatMoney(order.amount, order.currency)} · {order.status}</p>
      {canReview ? (
        <form className="grid gap-3" onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          setReviewStatus("Saving...");
          void postJson("/api/reviews", {
            transactionId: order.id,
            rating: String(data.get("rating") ?? ""),
            body: String(data.get("body") ?? "")
          }).then(setReviewStatus);
        }}>
          <h4 className="font-semibold">Write a review</h4>
          <Label htmlFor={`review-rating-${order.id}`}>Rating from 1 to 5</Label>
          <Input id={`review-rating-${order.id}`} name="rating" type="number" min="1" max="5" required defaultValue="5" />
          <Label htmlFor={`review-body-${order.id}`}>Review</Label>
          <Textarea id={`review-body-${order.id}`} name="body" required minLength={10} placeholder="What went well or what should the next buyer know?" />
          <Button type="submit">Submit review</Button>
          <p className="text-sm text-muted-foreground" role="status">{reviewStatus}</p>
        </form>
      ) : null}
    </article>
  );
}
