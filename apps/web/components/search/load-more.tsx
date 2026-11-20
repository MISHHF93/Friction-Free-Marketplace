"use client";

import { useEffect, useRef } from "react";

export function LoadMoreWhenVisible({ href }: { href: string | null }) {
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!href || !node) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) window.location.assign(href);
    }, { rootMargin: "240px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [href]);
  if (!href) return null;
  return <a ref={ref} href={href} className="sr-only">Load the next page of listings</a>;
}
