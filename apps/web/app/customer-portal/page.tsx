import Link from "next/link";
import {
  Boxes,
  Building2,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  FileText,
  Headphones,
  KeyRound,
  Layers3,
  LockKeyhole,
  PackageCheck,
  PlugZap,
  Rocket,
  ShieldCheck,
  Users,
  Workflow
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const organization = {
  name: "CareDroid Health Systems",
  tenantId: "tenant_caredroid_01",
  slug: "caredroid-health",
  plan: "Enterprise deployment",
  role: "Organization admin",
  region: "US-East HIPAA boundary",
  renewalDate: "March 1, 2027",
  status: "Healthy",
  subscription: {
    seatsUsed: 42,
    seatsTotal: 50,
    environments: 3,
    uptime: "99.98%",
    monthlySpend: "$18,400"
  }
};

const portalStats = [
  { label: "Subscription", value: organization.plan, detail: `${organization.subscription.seatsUsed}/${organization.subscription.seatsTotal} seats active`, icon: CreditCard },
  { label: "Products", value: "6 enabled", detail: "Clinical concierge, routing, analytics, and automation modules", icon: PackageCheck },
  { label: "Workspaces", value: `${organization.subscription.environments} live`, detail: "Production, staging, and sandbox are tenant isolated", icon: Workflow },
  { label: "Support", value: "2 open", detail: "One deployment request and one integration follow-up", icon: Headphones }
];

const products = [
  { name: "CareDroid Command Center", state: "Enabled", role: "Admin", detail: "Deployment health, org controls, and rollout readiness." },
  { name: "Patient Concierge Agent", state: "Enabled", role: "Operator", detail: "Guided patient intake, handoff notes, and escalation tracking." },
  { name: "Care Pathway Automation", state: "Enabled", role: "Admin", detail: "Workspace-scoped workflow orchestration for approved clinics." },
  { name: "Analytics Studio", state: "Enabled", role: "Analyst", detail: "Tenant-filtered reporting across utilization and outcomes." },
  { name: "Secure Message Relay", state: "Enabled", role: "Member", detail: "Audited patient and staff communication routing." },
  { name: "Release Preview Ring", state: "Limited", role: "Owner", detail: "Opt-in release notes and staged feature previews." }
];

const assetPacks = [
  "HIPAA intake templates",
  "Clinical escalation scripts",
  "Care plan prompt library",
  "Brand voice and tone pack",
  "FHIR mapping examples",
  "Support macro starter kit"
];

const workspaces = [
  { name: "Production", region: "US-East", users: 34, status: "Live", policy: "Admins approve integrations" },
  { name: "Staging", region: "US-East", users: 6, status: "Testing", policy: "Owner approval required" },
  { name: "Sandbox", region: "US-East", users: 2, status: "Experiment", policy: "No patient data" }
];

const users = [
  { name: "Maya Chen", email: "maya.chen@caredroid.example", role: "Owner", access: "All workspaces" },
  { name: "Andre Patel", email: "andre.patel@caredroid.example", role: "Admin", access: "Production, Staging" },
  { name: "Lina Morales", email: "lina.morales@caredroid.example", role: "Analyst", access: "Analytics Studio" },
  { name: "Jordan Lee", email: "jordan.lee@caredroid.example", role: "Support", access: "Support requests" }
];

const integrations = [
  { name: "FHIR Gateway", status: "Connected", detail: "Workspace-scoped sync using CareDroid tenant credentials." },
  { name: "Slack incident channel", status: "Connected", detail: "Support and release alerts for approved admins." },
  { name: "Stripe billing", status: "Placeholder", detail: "Invoice history will appear here when billing APIs are connected." },
  { name: "Data warehouse export", status: "Review", detail: "Awaiting owner approval before production data export." }
];

const supportRequests = [
  { id: "SUP-1042", title: "Add sandbox users for cardiology pilot", priority: "Medium", status: "In progress" },
  { id: "SUP-1037", title: "Review FHIR gateway error budget", priority: "High", status: "Waiting on CareDroid" },
  { id: "SUP-1029", title: "Enable release preview ring", priority: "Low", status: "Resolved" }
];

const releaseNotes = [
  { version: "2026.06", title: "Tenant audit timeline", detail: "Organization admins can review workspace, integration, and user-access changes from one portal." },
  { version: "2026.05", title: "Asset pack approvals", detail: "Owners can approve asset packs before they appear in production workspaces." },
  { version: "2026.04", title: "Support routing", detail: "Support requests now preserve tenant, workspace, role, and severity context." }
];

function SectionHeader({ icon: Icon, eyebrow, title, description }: { icon: typeof Building2; eyebrow: string; title: string; description: string }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          <Icon className="h-4 w-4" /> {eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-tight">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function StatusBadge({ children }: { children: string }) {
  return <Badge className="bg-primary/10 text-primary">{children}</Badge>;
}

export default function CustomerPortalPage() {
  return (
    <section className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-sm">
        <div className="grid gap-6 bg-[radial-gradient(circle_at_top_right,_rgba(20,184,166,0.22),_transparent_28rem)] p-6 lg:grid-cols-[1.3fr_0.7fr] lg:p-8">
          <div>
            <Badge className="bg-background/80">Tenant scoped · Organization aware · Role aware</Badge>
            <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">CareDroid customer portal</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
              Manage the {organization.name} deployment from one tenant-isolated command center for subscription, products, workspaces, users, integrations, support, invoices, and release notes.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild><Link href="#support-requests">Open support requests</Link></Button>
              <Button asChild variant="outline"><Link href="#organization-profile">Review organization profile</Link></Button>
            </div>
          </div>
          <Card className="bg-background/85">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Active portal context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="rounded-2xl bg-secondary p-4">
                <p className="font-semibold">{organization.name}</p>
                <p className="mt-1 text-muted-foreground">Tenant ID: {organization.tenantId}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div><p className="text-muted-foreground">Role</p><p className="font-bold">{organization.role}</p></div>
                <div><p className="text-muted-foreground">Boundary</p><p className="font-bold">{organization.region}</p></div>
                <div><p className="text-muted-foreground">Status</p><p className="font-bold text-primary">{organization.status}</p></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {portalStats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-sm text-muted-foreground">{stat.label}</CardTitle>
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
              <p className="text-2xl font-black">{stat.value}</p>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-muted-foreground">{stat.detail}</CardContent>
          </Card>
        ))}
      </div>

      <Card id="organization-profile">
        <CardHeader>
          <SectionHeader icon={Building2} eyebrow="Organization profile" title="Deployment identity" description="Organization details make the portal explicitly aware of the active CareDroid customer and its compliance boundary." />
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            ["Organization", organization.name],
            ["Slug", organization.slug],
            ["Renewal", organization.renewalDate],
            ["Monthly spend", organization.subscription.monthlySpend]
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-secondary p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
              <p className="mt-2 font-bold">{value}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <SectionHeader icon={PackageCheck} eyebrow="Enabled products" title="CareDroid products" description="Product access is presented with the minimum role needed to administer or use each module." />
          </CardHeader>
          <CardContent className="grid gap-3">
            {products.map((product) => (
              <div key={product.name} className="rounded-2xl border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-bold">{product.name}</h3>
                  <div className="flex gap-2"><StatusBadge>{product.state}</StatusBadge><Badge>{product.role}</Badge></div>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{product.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionHeader icon={Boxes} eyebrow="Enabled asset packs" title="Approved deployment assets" description="Asset packs are tenant-local resources available only to authorized CareDroid workspaces." />
          </CardHeader>
          <CardContent className="grid gap-3">
            {assetPacks.map((pack) => (
              <div key={pack} className="flex items-center gap-3 rounded-2xl bg-secondary p-4 text-sm font-semibold">
                <CheckCircle2 className="h-5 w-5 text-primary" /> {pack}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <SectionHeader icon={Workflow} eyebrow="Workspaces" title="Tenant-isolated environments" description="Each workspace is displayed as part of the active organization only, with policy hints for safe administration." />
          </CardHeader>
          <CardContent className="space-y-3">
            {workspaces.map((workspace) => (
              <div key={workspace.name} className="rounded-2xl border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">{workspace.name}</h3><StatusBadge>{workspace.status}</StatusBadge></div>
                <p className="mt-2 text-sm text-muted-foreground">{workspace.region} · {workspace.users} users · {workspace.policy}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionHeader icon={Users} eyebrow="Users" title="Role-aware access" description="Portal users show their organization role and workspace access without exposing any other tenant." />
          </CardHeader>
          <CardContent className="space-y-3">
            {users.map((user) => (
              <div key={user.email} className="rounded-2xl border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">{user.name}</h3><Badge>{user.role}</Badge></div>
                <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
                <p className="mt-2 text-sm font-semibold">{user.access}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <SectionHeader icon={PlugZap} eyebrow="Integrations" title="Connected systems" description="Integration rows reinforce credential ownership, approval status, and tenant-scoped data flow." />
          </CardHeader>
          <CardContent className="space-y-3">
            {integrations.map((integration) => (
              <div key={integration.name} className="rounded-2xl border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">{integration.name}</h3><StatusBadge>{integration.status}</StatusBadge></div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{integration.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionHeader icon={FileText} eyebrow="Invoices placeholder" title="Billing history coming soon" description="The portal reserves a billing area for invoice history while making the current subscription state visible today." />
          </CardHeader>
          <CardContent>
            <div className="rounded-3xl border border-dashed border-border p-6 text-center">
              <CreditCard className="mx-auto h-10 w-10 text-primary" />
              <h3 className="mt-4 text-lg font-bold">Invoices will appear here</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Stripe invoice synchronization is not yet connected. Organization admins can still review plan, renewal, seats, and monthly spend in the subscription overview.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card id="support-requests">
          <CardHeader>
            <SectionHeader icon={Headphones} eyebrow="Support requests" title="CareDroid support queue" description="Support requests retain organization, workspace, priority, and status context for faster deployment operations." />
          </CardHeader>
          <CardContent className="space-y-3">
            {supportRequests.map((request) => (
              <div key={request.id} className="rounded-2xl border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">{request.id}</h3><Badge>{request.priority}</Badge></div>
                <p className="mt-2 text-sm font-semibold">{request.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{request.status}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionHeader icon={Rocket} eyebrow="Release notes" title="Deployment updates" description="Release notes help organization admins understand recent portal, asset, and support changes." />
          </CardHeader>
          <CardContent className="space-y-3">
            {releaseNotes.map((note) => (
              <div key={note.version} className="rounded-2xl border border-border p-4">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary"><CalendarClock className="h-4 w-4" /> {note.version}</p>
                <h3 className="mt-2 font-bold">{note.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{note.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="grid gap-4 p-6 md:grid-cols-3">
          <div className="flex gap-3"><LockKeyhole className="h-6 w-6 text-primary" /><div><h3 className="font-bold">Tenant scoped</h3><p className="mt-1 text-sm text-muted-foreground">All portal sections are bound to {organization.tenantId}.</p></div></div>
          <div className="flex gap-3"><Layers3 className="h-6 w-6 text-primary" /><div><h3 className="font-bold">Organization aware</h3><p className="mt-1 text-sm text-muted-foreground">Organization profile, workspaces, and products stay in one active context.</p></div></div>
          <div className="flex gap-3"><KeyRound className="h-6 w-6 text-primary" /><div><h3 className="font-bold">Role aware</h3><p className="mt-1 text-sm text-muted-foreground">Actions and modules surface required roles before customers administer CareDroid.</p></div></div>
        </CardContent>
      </Card>
    </section>
  );
}
