import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { AlertTriangle, CheckCircle2, Clock, Activity } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Inspector Dashboard — RailAssist AI" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { isSuperAdmin, isInspector, inspector, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (isSuperAdmin) navigate({ to: "/admin" });
    else if (isInspector && inspector?.status !== "approved") navigate({ to: "/auth/pending" });
  }, [loading, isSuperAdmin, isInspector, inspector, navigate]);

  const kpis = [
    { label: "My Incidents", value: "0", icon: AlertTriangle, tone: "text-primary" },
    { label: "Active", value: "0", icon: Activity, tone: "text-safety" },
    { label: "Pending Review", value: "0", icon: Clock, tone: "text-warning" },
    { label: "Resolved", value: "0", icon: CheckCircle2, tone: "text-success" },
  ];

  return (
    <AppShell kind="inspector">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">My Workspace</h1>
          <p className="mt-1 text-sm text-muted-foreground">Report incidents and track your assigned cases.</p>
        </div>
        <Badge variant="secondary" className="capitalize">Status: {inspector?.status ?? "—"}</Badge>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{k.label}</span>
                <k.icon className={`h-4 w-4 ${k.tone}`} />
              </div>
              <div className="mt-3 font-display text-3xl font-bold">{k.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardContent className="p-8 text-center">
          <h2 className="font-display text-lg font-semibold">Incident management coming online</h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-xl mx-auto">
            The full incident report form, AI risk analysis and live map will appear here in the next platform phase.
            Your account is provisioned and ready.
          </p>
        </CardContent>
      </Card>
    </AppShell>
  );
}
