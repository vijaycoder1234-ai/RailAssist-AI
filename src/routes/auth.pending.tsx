import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, XCircle, ShieldAlert, Train } from "lucide-react";

export const Route = createFileRoute("/auth/pending")({
  head: () => ({ meta: [{ title: "Application status — RailAssist AI" }] }),
  component: PendingPage,
});

function PendingPage() {
  const { loading, user, inspector, isSuperAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth" });
    else if (isSuperAdmin) navigate({ to: "/admin" });
    else if (inspector?.status === "approved") navigate({ to: "/dashboard" });
  }, [loading, user, isSuperAdmin, inspector, navigate]);

  const status = inspector?.status ?? "pending";

  const meta = {
    pending: { icon: Clock, color: "text-warning", title: "Application under review", desc: "Your registration has been submitted. An administrator will review your details shortly." },
    approved: { icon: CheckCircle2, color: "text-success", title: "Approved", desc: "You're approved. Redirecting to your dashboard…" },
    rejected: { icon: XCircle, color: "text-destructive", title: "Application rejected", desc: inspector?.rejection_reason ?? "Please contact your administrator for more details." },
    suspended: { icon: ShieldAlert, color: "text-destructive", title: "Account suspended", desc: "Your account has been suspended. Please contact your administrator." },
  }[status];

  const Icon = meta.icon;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="absolute inset-0 grid-bg opacity-30" />
      <Card className="relative w-full max-w-md glass shadow-xl">
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl gradient-rail text-primary-foreground">
            <Train className="h-6 w-6" />
          </div>
          <Badge variant="outline" className="mb-3 capitalize">{status}</Badge>
          <Icon className={`mx-auto mb-3 h-10 w-10 ${meta.color}`} />
          <h1 className="font-display text-2xl font-bold">{meta.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{meta.desc}</p>
          <div className="mt-6 flex flex-col gap-2">
            <Button onClick={() => signOut().then(() => navigate({ to: "/" }))}>Sign out</Button>
            <Button asChild variant="ghost"><Link to="/">Back to home</Link></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
