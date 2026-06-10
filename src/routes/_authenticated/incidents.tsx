import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { db, type IncidentRow, type IncidentSeverity, type IncidentStatus, type IncidentCategory } from "@/lib/db";
import { analyzeIncident } from "@/lib/ai-incident.functions";
import { downloadIncidentPdf } from "@/lib/incident-pdf";
import { ensureNotificationPermission, showBrowserNotification, notifyUser } from "@/lib/notifications";
import { IncidentMap } from "@/components/incident-map";
import {
  AlertTriangle, Plus, MapPin, Sparkles, ImagePlus, Loader2, CheckCircle2, Clock, Activity, Download, Map as MapIcon,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/incidents")({
  head: () => ({ meta: [{ title: "Incidents — RailAssist AI" }] }),
  component: IncidentsPage,
});

const CATEGORIES: IncidentCategory[] = ["signal", "track", "rolling_stock", "safety", "infrastructure", "passenger", "electrical", "other"];
const SEVERITIES: IncidentSeverity[] = ["low", "medium", "high", "critical"];
const STATUSES: IncidentStatus[] = ["open", "triaged", "in_progress", "resolved", "closed"];

const severityTone: Record<IncidentSeverity, string> = {
  low: "bg-success/15 text-success border-success/30",
  medium: "bg-warning/15 text-warning border-warning/30",
  high: "bg-safety/15 text-safety border-safety/30",
  critical: "bg-destructive/15 text-destructive border-destructive/30",
};

function IncidentsPage() {
  const { isSuperAdmin, isInspector, inspector, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<IncidentRow[]>([]);
  const [zones, setZones] = useState<{ id: string; name: string; code: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | IncidentStatus>("all");
  const [q, setQ] = useState("");
  const [severityFilter, setSeverityFilter] = useState<"all" | IncidentSeverity>("all");
  const [zoneFilter, setZoneFilter] = useState<string>("all");
  const [showMap, setShowMap] = useState(true);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<IncidentRow | null>(null);

  useEffect(() => { ensureNotificationPermission(); }, []);

  useEffect(() => {
    if (authLoading) return;
    if (isInspector && inspector?.status !== "approved" && !isSuperAdmin) {
      navigate({ to: "/auth/pending" });
    }
  }, [authLoading, isInspector, inspector, isSuperAdmin, navigate]);

  useEffect(() => {
    db.from("zones").select("id, name, code").order("name").then(({ data }: { data: { id: string; name: string; code: string }[] | null }) => setZones(data ?? []));
  }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await db.from("incidents").select("*").order("created_at", { ascending: false }).limit(200);
    if (error) toast.error(error.message);
    setItems((data as IncidentRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => items.filter((i) => {
    if (tab !== "all" && i.status !== tab) return false;
    if (severityFilter !== "all" && i.severity !== severityFilter) return false;
    if (zoneFilter !== "all" && i.zone_id !== zoneFilter) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return i.title.toLowerCase().includes(s) || i.description.toLowerCase().includes(s);
  }), [items, tab, q, severityFilter, zoneFilter]);

  const counts = useMemo(() => ({
    total: items.length,
    open: items.filter((i) => i.status === "open").length,
    in_progress: items.filter((i) => i.status === "in_progress").length,
    critical: items.filter((i) => i.severity === "critical").length,
    resolved: items.filter((i) => i.status === "resolved" || i.status === "closed").length,
  }), [items]);

  return (
    <AppShell kind={isSuperAdmin ? "admin" : "inspector"}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
            {isSuperAdmin ? "Incident Operations" : "My Incidents"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSuperAdmin ? "Triage and manage all reported incidents." : "Report and track railway safety incidents."}
          </p>
        </div>
        {(isInspector || isSuperAdmin) && user && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1.5" /> Report Incident</Button>
            </DialogTrigger>
            <NewIncidentDialog
              reporterId={user.id}
              zoneId={inspector?.zone_id ?? null}
              onCreated={() => { setOpen(false); load(); }}
            />
          </Dialog>
        )}
      </div>

      <div className="mt-6 grid gap-3 grid-cols-2 lg:grid-cols-5">
        <KpiCard label="Total" value={counts.total} icon={AlertTriangle} tone="text-primary" />
        <KpiCard label="Open" value={counts.open} icon={Clock} tone="text-warning" />
        <KpiCard label="In Progress" value={counts.in_progress} icon={Activity} tone="text-safety" />
        <KpiCard label="Critical" value={counts.critical} icon={AlertTriangle} tone="text-destructive" />
        <KpiCard label="Resolved" value={counts.resolved} icon={CheckCircle2} tone="text-success" />
      </div>

      {showMap && filtered.some((i) => i.location_lat != null) && (
        <Card className="mt-6"><CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2"><MapIcon className="h-4 w-4" /> Incident Map</h2>
            <Button size="sm" variant="ghost" onClick={() => setShowMap(false)}>Hide</Button>
          </div>
          <IncidentMap incidents={filtered} onSelect={setSelected} />
        </CardContent></Card>
      )}

      <Card className="mt-6">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-3 mb-4 flex-wrap">
            <Input placeholder="Search incidents…" value={q} onChange={(e) => setQ(e.target.value)} className="sm:max-w-xs" />
            <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as typeof severityFilter)}>
              <SelectTrigger className="sm:w-40"><SelectValue placeholder="Severity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severities</SelectItem>
                {SEVERITIES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={zoneFilter} onValueChange={setZoneFilter}>
              <SelectTrigger className="sm:w-56"><SelectValue placeholder="Zone" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All zones</SelectItem>
                {zones.map((z) => <SelectItem key={z.id} value={z.id}>{z.code} — {z.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {!showMap && <Button size="sm" variant="outline" onClick={() => setShowMap(true)}><MapIcon className="h-4 w-4 mr-1.5" />Show map</Button>}
            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                {STATUSES.map((s) => <TabsTrigger key={s} value={s} className="capitalize">{s.replace("_", " ")}</TabsTrigger>)}
              </TabsList>
            </Tabs>
          </div>


          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reported</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Loading…</TableCell></TableRow>}
                {!loading && filtered.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                    No incidents yet. Report your first one to get AI-powered analysis.
                  </TableCell></TableRow>
                )}
                {filtered.map((i) => (
                  <TableRow key={i.id} className="cursor-pointer" onClick={() => setSelected(i)}>
                    <TableCell>
                      <div className="font-medium">{i.title}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">{i.description}</div>
                    </TableCell>
                    <TableCell className="capitalize text-sm">{i.category.replace("_", " ")}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`capitalize ${severityTone[i.severity]}`}>{i.severity}</Badge>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{i.status.replace("_", " ")}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(i.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost">View →</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        {selected && (
          <IncidentDetailDialog
            incident={selected}
            canManage={isSuperAdmin || selected.reporter_id === user?.id}
            isSuperAdmin={isSuperAdmin}
            onChanged={() => { load(); }}
            onClose={() => setSelected(null)}
          />
        )}
      </Dialog>
    </AppShell>
  );
}

function KpiCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof AlertTriangle; tone: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase text-muted-foreground tracking-wide">{label}</span>
          <Icon className={`h-4 w-4 ${tone}`} />
        </div>
        <div className="mt-2 font-display text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

const incidentSchema = z.object({
  title: z.string().trim().min(3, "Add a short title").max(160),
  description: z.string().trim().min(10, "Describe what happened").max(4000),
  category: z.enum(["signal", "track", "rolling_stock", "safety", "infrastructure", "passenger", "electrical", "other"]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  location_text: z.string().trim().max(200).optional(),
});

function NewIncidentDialog({ reporterId, zoneId, onCreated }: { reporterId: string; zoneId: string | null; onCreated: () => void }) {
  const [form, setForm] = useState({
    title: "", description: "", category: "safety" as IncidentCategory, severity: "medium" as IncidentSeverity, location_text: "",
  });
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const captureLocation = () => {
    if (!("geolocation" in navigator)) { toast.error("Geolocation unavailable"); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => { setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }); toast.success("Location captured"); },
      () => toast.error("Could not get location"),
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = incidentSchema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setSubmitting(true);
    try {
      const { data: created, error } = await db.from("incidents").insert({
        reporter_id: reporterId,
        zone_id: zoneId,
        title: parsed.data.title,
        description: parsed.data.description,
        category: parsed.data.category,
        severity: parsed.data.severity,
        location_text: parsed.data.location_text || null,
        location_lat: coords?.lat ?? null,
        location_lng: coords?.lng ?? null,
      }).select().single();
      if (error || !created) throw error ?? new Error("Insert failed");

      for (const f of files) {
        const path = `${reporterId}/${created.id}/${Date.now()}-${f.name}`;
        const { error: upErr } = await db.storage.from("incident-media").upload(path, f, { upsert: false });
        if (upErr) { toast.error(`Upload failed: ${upErr.message}`); continue; }
        await db.from("incident_media").insert({
          incident_id: created.id, file_path: path, mime_type: f.type,
          kind: f.type.startsWith("video") ? "video" : f.type.startsWith("audio") ? "audio" : "image",
          uploaded_by: reporterId,
        });
      }
      toast.success("Incident reported");
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to report incident");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DialogContent className="max-w-xl">
      <DialogHeader>
        <DialogTitle>Report a railway incident</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <Label>Title</Label>
          <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g., Cracked rail near platform 2" />
        </div>
        <div>
          <Label>Description</Label>
          <Textarea required rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What did you observe? Include exact location, time and any contributing factors." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as IncidentCategory })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c.replace("_", " ")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Severity</Label>
            <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v as IncidentSeverity })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SEVERITIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>Location description</Label>
          <Input value={form.location_text} onChange={(e) => setForm({ ...form, location_text: e.target.value })} placeholder="Station / kilometre post / line" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button type="button" variant="outline" size="sm" onClick={captureLocation}>
            <MapPin className="h-4 w-4 mr-1.5" /> {coords ? `Lat ${coords.lat.toFixed(3)}, Lng ${coords.lng.toFixed(3)}` : "Capture GPS"}
          </Button>
          <label className="inline-flex items-center gap-1.5 text-sm cursor-pointer rounded-md border px-3 py-1.5 hover:bg-accent">
            <ImagePlus className="h-4 w-4" /> Attach photos
            <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
          </label>
          {files.length > 0 && <span className="text-xs text-muted-foreground">{files.length} file(s) selected</span>}
        </div>
        <DialogFooter>
          <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
            {submitting ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Submitting…</> : "Submit incident"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function IncidentDetailDialog({ incident, canManage, isSuperAdmin, onChanged, onClose }: {
  incident: IncidentRow; canManage: boolean; isSuperAdmin: boolean; onChanged: () => void; onClose: () => void;
}) {
  const [status, setStatus] = useState<IncidentStatus>(incident.status);
  const [analyzing, setAnalyzing] = useState(false);
  const [current, setCurrent] = useState<IncidentRow>(incident);
  const [media, setMedia] = useState<{ id: string; file_path: string; mime_type: string | null; kind: string; url?: string }[]>([]);
  const analyze = useServerFn(analyzeIncident);

  useEffect(() => {
    db.from("incident_media").select("*").eq("incident_id", incident.id).then(async ({ data }: { data: { id: string; file_path: string; mime_type: string | null; kind: string }[] | null }) => {
      const list = data ?? [];
      const withUrls = await Promise.all(list.map(async (m) => {
        const { data: signed } = await db.storage.from("incident-media").createSignedUrl(m.file_path, 60 * 30);
        return { ...m, url: signed?.signedUrl };
      }));
      setMedia(withUrls);
    });
  }, [incident.id]);

  const saveStatus = async () => {
    const patch: Record<string, unknown> = { status };
    if (status === "resolved" || status === "closed") patch.resolved_at = new Date().toISOString();
    const { error } = await db.from("incidents").update(patch).eq("id", incident.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Status updated");
    onChanged();
  };

  const runAi = async () => {
    setAnalyzing(true);
    try {
      const out = await analyze({ data: {
        incident_id: incident.id, title: incident.title, description: incident.description, category: incident.category,
      }});
      const { data: refreshed } = await db.from("incidents").select("*").eq("id", incident.id).single();
      if (refreshed) setCurrent(refreshed as IncidentRow);
      toast.success(`AI analysis complete · risk ${out.risk_score}/100`);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 flex-wrap">
          <span>{current.title}</span>
          <Badge variant="outline" className={`capitalize ${severityTone[current.severity]}`}>{current.severity}</Badge>
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4 text-sm">
        <p className="whitespace-pre-wrap">{current.description}</p>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>Category: <span className="capitalize text-foreground">{current.category.replace("_", " ")}</span></span>
          {current.location_text && <span>Location: <span className="text-foreground">{current.location_text}</span></span>}
          {current.location_lat && <span>GPS: {current.location_lat.toFixed(4)}, {current.location_lng?.toFixed(4)}</span>}
          <span>Reported: {new Date(current.created_at).toLocaleString()}</span>
        </div>

        {media.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {media.map((m) => (
              <a key={m.id} href={m.url} target="_blank" rel="noreferrer" className="block rounded-md overflow-hidden border bg-muted aspect-video">
                {m.kind === "image" && m.url ? (
                  <img src={m.url} alt="evidence" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-muted-foreground">{m.kind}</div>
                )}
              </a>
            ))}
          </div>
        )}

        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4 text-primary" /> AI Risk Analysis</div>
              <Button size="sm" variant="outline" onClick={runAi} disabled={analyzing}>
                {analyzing ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Analysing…</> : current.ai_summary ? "Re-run" : "Run analysis"}
              </Button>
            </div>
            {current.ai_summary ? (
              <div className="space-y-2 text-sm">
                <p>{current.ai_summary}</p>
                {current.ai_severity && (
                  <div className="text-xs">
                    AI severity: <Badge variant="outline" className={`capitalize ${severityTone[current.ai_severity]}`}>{current.ai_severity}</Badge>
                  </div>
                )}
                {current.ai_suggested_actions && (
                  <div>
                    <div className="text-xs font-semibold mb-1">Suggested actions</div>
                    <p className="text-xs whitespace-pre-wrap">• {current.ai_suggested_actions}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No analysis yet. Run AI to auto-classify severity and get suggested actions.</p>
            )}
          </CardContent>
        </Card>

        {canManage && (
          <div className="flex items-center gap-2">
            <Select value={status} onValueChange={(v) => setStatus(v as IncidentStatus)}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={saveStatus} size="sm">Update status</Button>
            <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
          </div>
        )}
      </div>
    </DialogContent>
  );
}

// keep Link import used for tree-shaking awareness
void Link;
