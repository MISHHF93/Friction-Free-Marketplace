import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand/brand-logo";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-backdrop min-h-screen">
      <div className="app-shell relative min-h-screen w-full bg-background pt-[env(safe-area-inset-top)]">
        <header className="flex items-center justify-center border-b border-border px-4 py-3">
          <BrandLogo href="/" size="sm" showTagline={false} />
        </header>
        <main id="main-content" className="mx-auto min-h-[calc(100dvh-4rem)] w-full max-w-6xl pb-[env(safe-area-inset-bottom)]" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
