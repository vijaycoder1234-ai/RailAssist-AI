import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { db, type IncidentRow, type AssetRow } from "@/lib/db";
import { aiTrendAnalyzer } from "@/lib/ai-incident";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
  LineChart, Line, CartesianGrid,
} from "recharts";
import { Activity, AlertTriangle, ShieldCheck, TrendingUp, Wrench, Sparkles, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Safety Analytics — RailAssist AI" }] }),
  component: AnalyticsPage,
});

const COLORS = ["var(--primary)", "var(--safety)", "var(--warning)", "var(--destructive)", "var(--success)", "var(--muted-foreground)"];

interface Zone { id: string; name: string; code: string }

function AnalyticsPage() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!isSuperAdmin) navigate({ to: "/dashboard" });
  }, [authLoading, isSuperAdmin, navigate]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    Promise.all([
      db.from("incidents").select("*").order("created_at", { ascending: false }).limit(1000),
      db.from("assets").select("*"),
      db.from("zones").select("id, name, code"),
    ]).then(([i, a, z]) => {
      setIncidents((i.data as IncidentRow[]) ?? []);
      setAssets((a.data as AssetRow[]) ?? []);
      setZones((z.data as Zone[]) ?? []);
    });
  }, [isSuperAdmin]);

  const kpis = useMemo(() => {
    const open = incidents.filter((i) => i.status !== "resolved" && i.status !== "closed").length;
    const critical = incidents.filter((i) => i.severity === "critical").length;
    const resolved = incidents.filter((i) => i.status === "resolved" || i.status === "closed").length;
    const avgHealth = assets.length ? Math.round(assets.reduce((s, a) => s + a.health_score, 0) / assets.length) : 0;
    const resolutionRate = incidents.length ? Math.round((resolved / incidents.length) * 100) : 0;
    return { open, critical, resolved, avgHealth, resolutionRate };
  }, [incidents, assets]);

  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    incidents.forEach((i) => m.set(i.category, (m.get(i.category) ?? 0) + 1));
    return Array.from(m, ([name, value]) => ({ name: name.replace("_", " "), value }));
  }, [incidents]);

  const bySeverity = useMemo(() => {
    const order = ["low", "medium", "high", "critical"];
    return order.map((s) => ({ name: s, value: incidents.filter((i) => i.severity === s).length }));
  }, [incidents]);

  const byZone = useMemo(() => {
    const m = new Map<string, number>();
    incidents.forEach((i) => { if (i.zone_id) m.set(i.zone_id, (m.get(i.zone_id) ?? 0) + 1); });
    return Array.from(m, ([zid, count]) => ({
      name: zones.find((z) => z.id === zid)?.code ?? "—", count,
    })).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [incidents, zones]);

  const trend = useMemo(() => {
    const days: { date: string; count: number }[] = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ date: key.slice(5), count: 0 });
    }
    incidents.forEach((i) => {
      const k = i.created_at.slice(5, 10);
      const row = days.find((d) => d.date === k);
      if (row) row.count++;
    });
    return days;
  }, [incidents]);

  const [analysis, setAnalysis] = useState<{ verdict: string; score: number; headline: string; summary: string; hotspots: string[]; predictions: string[]; actions: string[] } | null>(null);
  const [analysisBusy, setAnalysisBusy] = useState(false);

  const runAnalysis = async () => {
    setAnalysisBusy(true);
    try {
      const out = await aiTrendAnalyzer({
        data: {
          totals: {
            open: kpis.open,
            critical: kpis.critical,
            resolved: kpis.resolved,
            resolutionRate: kpis.resolutionRate,
            avgAssetHealth: kpis.avgHealth,
          },
          byCategory,
          bySeverity,
          byZone,
          trend30d: trend,
        },
      });
      setAnalysis(out);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI analysis failed");
    } finally {
      setAnalysisBusy(false);
    }
  };

  if (!isSuperAdmin) return null;

  return (
    <AppShell kind="admin">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Safety Monitoring</h1>
          <p className="mt-1 text-sm text-muted-foreground">Live KPIs, severity mix, zone hotspots and 30-day incident trend.</p>
        </div>
        <Button size="sm" onClick={runAnalysis} disabled={analysisBusy || incidents.length === 0}>
          {analysisBusy ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Analysing…</> : <><Sparkles className="h-4 w-4 mr-1.5" />AI Trend Analyser</>}
        </Button>
      </div>

      {analysis && (
        <Card className="mt-4 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="outline" className="capitalize">{analysis.verdict}</Badge>
              <span className="font-display text-lg font-semibold">{analysis.headline}</span>
              <span className="ml-auto text-sm text-muted-foreground">Safety score: <span className="font-bold text-foreground">{analysis.score}/100</span></span>
            </div>
            <p className="text-sm text-muted-foreground">{analysis.summary}</p>
            <div className="grid gap-3 md:grid-cols-3 text-sm">
              {analysis.hotspots.length > 0 && (
                <div><div className="font-medium mb-1">Hotspots</div><ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">{analysis.hotspots.map((h, i) => <li key={i}>{h}</li>)}</ul></div>
              )}
              {analysis.predictions.length > 0 && (
                <div><div className="font-medium mb-1">Predicted risks</div><ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">{analysis.predictions.map((h, i) => <li key={i}>{h}</li>)}</ul></div>
              )}
              {analysis.actions.length > 0 && (
                <div><div className="font-medium mb-1">Recommended actions</div><ol className="list-decimal pl-5 space-y-0.5 text-muted-foreground">{analysis.actions.map((h, i) => <li key={i}>{h}</li>)}</ol></div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 grid gap-3 grid-cols-2 lg:grid-cols-5">
        <Kpi label="Open" value={kpis.open} icon={Activity} tone="text-warning" />
        <Kpi label="Critical" value={kpis.critical} icon={AlertTriangle} tone="text-destructive" />
        <Kpi label="Resolved" value={kpis.resolved} icon={ShieldCheck} tone="text-success" />
        <Kpi label="Asset Health" value={`${kpis.avgHealth}%`} icon={Wrench} tone="text-primary" />
        <Kpi label="Resolution Rate" value={`${kpis.resolutionRate}%`} icon={TrendingUp} tone="text-safety" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card><CardContent className="p-5">
          <h3 className="font-display font-semibold mb-3">Incidents — last 30 days</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Line type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent></Card>

        <Card><CardContent className="p-5">
          <h3 className="font-display font-semibold mb-3">Severity Mix</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={bySeverity} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {bySeverity.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent></Card>

        <Card><CardContent className="p-5">
          <h3 className="font-display font-semibold mb-3">By Category</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCategory}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar dataKey="value" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent></Card>

        <Card><CardContent className="p-5">
          <h3 className="font-display font-semibold mb-3">Top Zones by Incidents</h3>
          {byZone.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">No data yet.</div>
          ) : (
            <div className="space-y-2">
              {byZone.map((z) => (
                <div key={z.name} className="flex items-center gap-3">
                  <Badge variant="outline" className="w-14 justify-center">{z.name}</Badge>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${(z.count / Math.max(...byZone.map(b => b.count))) * 100}%` }} />
                  </div>
                  <span className="text-sm tabular-nums w-8 text-right">{z.count}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent></Card>
      </div>
    </AppShell>
  );
}

function Kpi({ label, value, icon: Icon, tone }: { label: string; value: number | string; icon: typeof Activity; tone: string }) {
  return (
    <Card><CardContent className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase text-muted-foreground tracking-wide">{label}</span>
        <Icon className={`h-4 w-4 ${tone}`} />
      </div>
      <div className="mt-2 font-display text-2xl font-bold">{value}</div>
    </CardContent></Card>
  );
}
