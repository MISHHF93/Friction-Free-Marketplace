import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <section className="mx-auto grid min-h-[65vh] max-w-xl place-items-center px-6 text-center">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Offline</p>
        <h1 className="mt-3 text-3xl font-bold">Reconnect to continue</h1>
        <p className="mt-4 text-muted-foreground">
          Marketplace accounts, messages, listings, and payments require a secure internet connection.
        </p>
        <Button className="mt-6" asChild><Link href="/">Try again</Link></Button>
      </div>
    </section>
  );
}
