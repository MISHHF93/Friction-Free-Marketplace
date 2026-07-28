export default function PrivacyPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl font-bold tracking-tight">Privacy policy</h1>
      <p className="mt-4 text-muted-foreground">Last updated: July 27, 2026</p>
      <div className="mt-8 grid gap-6 leading-7 text-muted-foreground">
        <p>We process account, profile, listing, message, transaction, device, and safety information to operate and protect the marketplace.</p>
        <p>Supabase provides authentication and data storage; Stripe processes payments; service providers may support search, email, analytics, and AI-assisted features. Payment card details are handled by Stripe and are not stored by this application.</p>
        <p>We use information to provide requested services, prevent fraud, comply with law, improve reliability, and communicate essential account or transaction updates. We do not sell personal information.</p>
        <p>You can request access, correction, or deletion through Account settings. Some transaction, dispute, fraud-prevention, and audit records may be retained where legally required.</p>
        <p>Questions and privacy requests can be submitted through the Contact page. Replace this starter policy with counsel-approved company details before public release.</p>
      </div>
    </section>
  );
}
