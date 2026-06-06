"use client";

import { ErrorMessage } from "@/components/marketplace-design-system";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[55vh] max-w-3xl items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <ErrorMessage
        title="Marketplace page could not load"
        message={error.message || "Refresh the page or try again in a moment."}
        action={<Button onClick={reset}>Try again</Button>}
      />
    </div>
  );
}
