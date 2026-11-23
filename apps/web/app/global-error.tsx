"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/observability/error-reporter";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError(error, { boundary: "global" });
  }, [error]);
  return (
    <html lang="en">
      <body>
        <main style={{ display: "grid", minHeight: "100vh", placeItems: "center", fontFamily: "sans-serif", padding: "2rem" }}>
          <div>
            <h1>Something went wrong</h1>
            <p>{error.message || "Refresh the page or try again in a moment."}</p>
            <button type="button" onClick={reset}>Try again</button>
          </div>
        </main>
      </body>
    </html>
  );
}
