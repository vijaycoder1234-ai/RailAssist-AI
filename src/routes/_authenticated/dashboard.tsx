import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { db, type IncidentRow, type IncidentSeverity } from "@/lib/db";
import { useRealtimeInvalidate } from "@/hooks/use-realtime-invalidate";
import { aiDailyBriefing } from "@/lib/ai-incident";
import { AlertTriangle, CheckCircle2, Clock, Activity, Plus, Sparkles, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Inspector Dashboard — RailAssist AI" }] }),
  component: Dashboard,
});

const severityTone: Record<IncidentSeverity, string> = {
  low: "bg-success/15 text-success border-success/30",
  medium: "bg-warning/15 text-warning border-warning/30",
  high: "bg-safety/15 text-safety border-safety/30",
  critical: "bg-destructive/15 text-destructive border-destructive/30",
};

function Dashboard() {
  const { isSuperAdmin, isInspector, inspector, user, loading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<IncidentRow[]>([]);
  const [briefing, setBriefing] = useState<{ headline: string; summary: string; risks: string[]; recommendations: string[] } | null>(null);
  const [briefingBusy, setBriefingBusy] = useState(false);

  const generateBriefing = async () => {
    setBriefingBusy(true);
    try {
      const out = await aiDailyBriefing({
        data: {
          incidents: items.slice(0, 30).map((i) => ({
            title: i.title,
            severity: i.severity,
            status: i.status,
            category: i.category ?? null,
          })),
        },
      });
      setBriefing(out);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI briefing failed");
    } finally {
      setBriefingBusy(false);
    }
  };


  useEffect(() => {
    if (loading) return;
    if (isSuperAdmin) navigate({ to: "/admin" });
    else if (isInspector && inspector?.status !== "approved") navigate({ to: "/auth/pending" });
  }, [loading, isSuperAdmin, isInspector, inspector, navigate]);

  const loadIncidents = () => {
    if (!user) return;
    db.from("incidents").select("*").eq("reporter_id", user.id).order("created_at", { ascending: false }).limit(10)
      .then(({ data }: { data: IncidentRow[] | null }) => setItems(data ?? []));
  };

  useEffect(() => {
    loadIncidents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Live refresh when any incident row changes
  useRealtimeInvalidate(["incidents"], () => loadIncidents());

  const kpis = useMemo(() => [
    { label: "My Incidents", value: items.length, icon: AlertTriangle, tone: "text-primary" },
    { label: "Open", value: items.filter((i) => i.status === "open").length, icon: Activity, tone: "text-safety" },
    { label: "In Progress", value: items.filter((i) => i.status === "in_progress").length, icon: Clock, tone: "text-warning" },
    { label: "Resolved", value: items.filter((i) => i.status === "resolved" || i.status === "closed").length, icon: CheckCircle2, tone: "text-success" },
  ], [items]);

  return (
    <AppShell kind="inspector">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">My Workspace</h1>
          <p className="mt-1 text-sm text-muted-foreground">Report incidents and track your assigned cases.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="capitalize">Status: {inspector?.status ?? "—"}</Badge>
          <Link to="/incidents"><Button size="sm"><Plus className="h-4 w-4 mr-1.5" />Report</Button></Link>
        </div>
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

      <Card className="mt-6 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-3 min-w-0">
              <div className="rounded-md bg-primary/15 p-2 text-primary"><Sparkles className="h-4 w-4" /></div>
              <div className="min-w-0">
                <h2 className="font-display text-lg font-semibold">AI Daily Briefing</h2>
                <p className="text-sm text-muted-foreground">Executive summary of your current incidents, generated on demand.</p>
              </div>
            </div>
            <Button size="sm" onClick={generateBriefing} disabled={briefingBusy || items.length === 0}>
              {briefingBusy ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Generating…</> : <><Sparkles className="h-4 w-4 mr-1.5" />Generate</>}
            </Button>
          </div>
          {briefing && (
            <div className="mt-4 space-y-3 text-sm">
              <div className="font-display text-base font-semibold">{briefing.headline}</div>
              <p className="text-muted-foreground">{briefing.summary}</p>
              {briefing.risks.length > 0 && (
                <div>
                  <div className="font-medium mb-1">Top risks</div>
                  <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">
                    {briefing.risks.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
              {briefing.recommendations.length > 0 && (
                <div>
                  <div className="font-medium mb-1">Recommended actions</div>
                  <ol className="list-decimal pl-5 space-y-0.5 text-muted-foreground">
                    {briefing.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                  </ol>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>


      <Card className="mt-6">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-semibold">Recent incidents</h2>
            <Link to="/incidents" className="text-sm text-primary hover:underline">View all →</Link>
          </div>
          {items.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              No incidents reported yet. <Link to="/incidents" className="text-primary hover:underline">Report your first one</Link> and get AI-powered analysis.
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {items.map((i) => (
                <li key={i.id} className="flex items-center justify-between py-3 gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{i.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{i.description}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className={`capitalize ${severityTone[i.severity]}`}>{i.severity}</Badge>
                    <Badge variant="outline" className="capitalize">{i.status.replace("_", " ")}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
