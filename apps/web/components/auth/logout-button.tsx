"use client";

import { logoutAction } from "@/app/auth/actions";

export function LogoutButton({ label, className }: { label: string; className?: string }) {
  return (
    <button
      className={className}
      type="button"
      onClick={async () => {
        if (typeof caches !== "undefined") {
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key)));
        }
        await logoutAction();
      }}
    >
      {label}
    </button>
  );
}
