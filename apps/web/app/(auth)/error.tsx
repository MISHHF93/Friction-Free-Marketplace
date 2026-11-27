"use client";

import { useEffect } from "react";
import { PublicPageError } from "@/components/public-page-states";
import { reportError } from "@/lib/observability/error-reporter";

export default function AuthError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError(error, { boundary: "auth" });
  }, [error]);

  return <PublicPageError title="Sign-in page could not load" error={error} reset={reset} />;
}
