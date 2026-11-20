"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function MenuDisclosure({
  label,
  className,
  summaryClassName,
  summary,
  children
}: {
  label: string;
  className?: string;
  summaryClassName: string;
  summary: ReactNode;
  children: ReactNode;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const details = detailsRef.current;
    if (!details) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || !details?.open) return;
      details.open = false;
      details.querySelector("summary")?.focus();
    }

    details.addEventListener("keydown", onKeyDown);
    return () => details.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <details ref={detailsRef} className={className}>
      <summary className={summaryClassName} aria-label={label}>
        {summary}
      </summary>
      {children}
    </details>
  );
}
