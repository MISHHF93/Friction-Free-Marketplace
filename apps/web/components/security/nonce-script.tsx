import { headers } from "next/headers";

export async function requestNonce() {
  return (await headers()).get("x-nonce");
}

export async function NoncedJsonLd({ data }: { data: unknown }) {
  const nonce = await requestNonce();
  return <script nonce={nonce ?? undefined} suppressHydrationWarning type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

export async function StripeJsScript() {
  const nonce = await requestNonce();
  return <script nonce={nonce ?? undefined} suppressHydrationWarning src="https://js.stripe.com/v3/" async />;
}
