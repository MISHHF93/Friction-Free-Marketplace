"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";
import { Button } from "@/components/ui/button";

export function ShareListingButton({ title, path, className }: { title: string; path: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function shareListing() {
    const url = new URL(path, window.location.origin).toString();

    if (Capacitor.isNativePlatform()) {
      await Share.share({ title, text: title, url, dialogTitle: "Share listing" });
      return;
    }

    if (navigator.share) {
      await navigator.share({ title, url });
      return;
    }

    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <Button type="button" variant="outline" className={className} onClick={shareListing}>
      {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Share2 className="h-4 w-4" aria-hidden="true" />}
      {copied ? "Link copied" : "Share"}
    </Button>
  );
}
