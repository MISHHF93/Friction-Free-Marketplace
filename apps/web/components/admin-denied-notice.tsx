"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function AdminDeniedNoticeInner() {
  const searchParams = useSearchParams();
  if (searchParams.get("adminDenied") !== "1") return null;

  return (
    <p className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-950" role="status">
      This account is not authorized for the admin console.
    </p>
  );
}

export function AdminDeniedNotice() {
  return (
    <Suspense fallback={null}>
      <AdminDeniedNoticeInner />
    </Suspense>
  );
}
