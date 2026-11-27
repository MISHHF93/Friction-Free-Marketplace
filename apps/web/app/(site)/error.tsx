"use client";

import { useEffect } from "react";
import { PublicPageError } from "@/components/public-page-states";
import { reportError } from "@/lib/observability/error-reporter";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError(error, { boundary: "app" });
  }, [error]);
  return <PublicPageError title="Marketplace page could not load" error={error} reset={reset} />;
}
