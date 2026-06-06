import { AlertTriangle, BadgeCheck, LineChart, Users } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const links = [
  { href: "/admin", label: "Admin overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/listings", label: "Listings" },
  { href: "/admin/transactions", label: "Transactions" },
  { href: "/admin/disputes", label: "Disputes" },
  { href: "/admin/fraud-alerts", label: "Fraud alerts" }
];

const queues = [
  { icon: Users, title: "Identity review", value: "18", text: "Profiles awaiting verification or appeal review." },
  { icon: AlertTriangle, title: "Risk queue", value: "6", text: "Listings and payments flagged by rules or AI moderation." },
  { icon: BadgeCheck, title: "Trust actions", value: "42", text: "Resolved reports, dispute outcomes, and seller quality checks." },
  { icon: LineChart, title: "Marketplace GMV", value: "$128k", text: "Weekly protected commerce moving through the platform." }
];

export default function AdminDashboardPage() {
  return (
    <DashboardShell title="Admin console" description="A protected operations shell for marketplace health, trust and safety, disputes, transactions, and analytics." links={links}>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {queues.map((queue) => (
          <Card key={queue.title}>
            <CardHeader><queue.icon className="h-6 w-6 text-primary" /><CardTitle>{queue.title}</CardTitle><p className="text-3xl font-black">{queue.value}</p></CardHeader>
            <CardContent className="text-sm leading-6 text-muted-foreground">{queue.text}</CardContent>
          </Card>
        ))}
      </div>
      <Card className="mt-6">
        <CardHeader><CardTitle>Operational priorities</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {["Review high-risk seller onboarding", "Audit pending escrow releases", "Tune AI moderation thresholds"].map((item) => (
            <div key={item} className="rounded-xl bg-secondary px-4 py-3 text-sm font-medium">{item}</div>
          ))}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
