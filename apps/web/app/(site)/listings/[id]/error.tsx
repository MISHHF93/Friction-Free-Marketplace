"use client";

import { PublicPageError } from "@/components/public-page-states";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <PublicPageError title="Public marketplace page could not load" error={error} reset={reset} />;
}
