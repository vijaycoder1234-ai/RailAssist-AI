import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";
import { db, type AssetRow, type AssetStatus, type AssetType } from "@/lib/db";
import { Wrench, Plus, AlertTriangle, CheckCircle2, Activity } from "lucide-react";

export const Route = createFileRoute("/_authenticated/assets")({
  head: () => ({ meta: [{ title: "Asset & Maintenance — RailAssist AI" }] }),
  component: AssetsPage,
});

const TYPES: AssetType[] = ["track", "signal", "bridge", "platform", "rolling_stock", "electrical", "crossing", "other"];
const STATUSES: AssetStatus[] = ["operational", "needs_attention", "critical", "under_maintenance", "decommissioned"];

const statusTone: Record<AssetStatus, string> = {
  operational: "bg-success/15 text-success border-success/30",
  needs_attention: "bg-warning/15 text-warning border-warning/30",
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  under_maintenance: "bg-safety/15 text-safety border-safety/30",
  decommissioned: "bg-muted text-muted-foreground border-border",
};

interface Zone { id: string; name: string; code: string }

function AssetsPage() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filterType, setFilterType] = useState<"all" | AssetType>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | AssetStatus>("all");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isSuperAdmin) navigate({ to: "/dashboard" });
  }, [authLoading, isSuperAdmin, navigate]);

  const load = async () => {
    setLoading(true);
    const [a, z] = await Promise.all([
      db.from("assets").select("*").order("created_at", { ascending: false }),
      db.from("zones").select("id, name, code").order("name"),
    ]);
    setAssets((a.data as AssetRow[]) ?? []);
    setZones((z.data as Zone[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { if (isSuperAdmin) load(); }, [isSuperAdmin]);

  const filtered = useMemo(() => assets.filter((a) => {
    if (filterType !== "all" && a.type !== filterType) return false;
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return a.name.toLowerCase().includes(s) || (a.code ?? "").toLowerCase().includes(s);
  }), [assets, q, filterType, filterStatus]);

  const counts = useMemo(() => ({
    total: assets.length,
    operational: assets.filter((a) => a.status === "operational").length,
    needs: assets.filter((a) => a.status === "needs_attention").length,
    critical: assets.filter((a) => a.status === "critical").length,
    avgHealth: assets.length ? Math.round(assets.reduce((s, a) => s + a.health_score, 0) / assets.length) : 0,
  }), [assets]);

  if (!isSuperAdmin) return null;

  return (
    <AppShell kind="admin">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Predictive Maintenance</h1>
          <p className="mt-1 text-sm text-muted-foreground">Track every asset's health, status and inspection cadence.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1.5" />New Asset</Button></DialogTrigger>
          <NewAssetDialog zones={zones} onCreated={() => { setOpen(false); load(); }} />
        </Dialog>
      </div>

      <div className="mt-6 grid gap-3 grid-cols-2 lg:grid-cols-5">
        <Kpi label="Assets" value={counts.total} icon={Wrench} tone="text-primary" />
        <Kpi label="Operational" value={counts.operational} icon={CheckCircle2} tone="text-success" />
        <Kpi label="Needs Attention" value={counts.needs} icon={Activity} tone="text-warning" />
        <Kpi label="Critical" value={counts.critical} icon={AlertTriangle} tone="text-destructive" />
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase text-muted-foreground tracking-wide">Avg Health</div>
            <div className="mt-2 font-display text-2xl font-bold">{counts.avgHealth}%</div>
            <Progress value={counts.avgHealth} className="mt-2 h-1.5" />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <Input placeholder="Search assets…" value={q} onChange={(e) => setQ(e.target.value)} className="sm:max-w-xs" />
            <Select value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)}>
              <SelectTrigger className="sm:w-44"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t.replace("_", " ")}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
              <SelectTrigger className="sm:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last inspection</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Loading…</TableCell></TableRow>}
                {!loading && filtered.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                    No assets yet. Add tracks, signals, bridges or rolling stock to start tracking health.
                  </TableCell></TableRow>
                )}
                {filtered.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="font-medium">{a.name}</div>
                      <div className="text-xs text-muted-foreground">{a.code ?? "—"}</div>
                    </TableCell>
                    <TableCell className="capitalize text-sm">{a.type.replace("_", " ")}</TableCell>
                    <TableCell className="w-40">
                      <div className="flex items-center gap-2">
                        <Progress value={a.health_score} className="h-1.5" />
                        <span className="text-xs tabular-nums w-9 text-right">{a.health_score}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`capitalize ${statusTone[a.status]}`}>{a.status.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.last_inspection_date ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <UpdateHealth asset={a} onSaved={load} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}

function Kpi({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof Wrench; tone: string }) {
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

const assetSchema = z.object({
  name: z.string().trim().min(2).max(160),
  code: z.string().trim().max(60).optional(),
  type: z.enum(["track", "signal", "bridge", "platform", "rolling_stock", "electrical", "crossing", "other"]),
  zone_id: z.string().uuid().optional().or(z.literal("")),
  health_score: z.number().min(0).max(100),
  status: z.enum(["operational", "needs_attention", "critical", "under_maintenance", "decommissioned"]),
});

function NewAssetDialog({ zones, onCreated }: { zones: Zone[]; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: "", code: "", type: "track" as AssetType, zone_id: "", health_score: 100, status: "operational" as AssetStatus,
  });
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = assetSchema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setBusy(true);
    const { error } = await db.from("assets").insert({
      name: parsed.data.name,
      code: parsed.data.code || null,
      type: parsed.data.type,
      zone_id: parsed.data.zone_id || null,
      health_score: parsed.data.health_score,
      status: parsed.data.status,
      last_inspection_date: new Date().toISOString().slice(0, 10),
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Asset added");
    onCreated();
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>Add new asset</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>Name</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Optional" /></div>
          <div>
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as AssetType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t.replace("_", " ")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Zone</Label>
            <Select value={form.zone_id} onValueChange={(v) => setForm({ ...form, zone_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select zone" /></SelectTrigger>
              <SelectContent>{zones.map((z) => <SelectItem key={z.id} value={z.id}>{z.code} — {z.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Health (0-100)</Label><Input type="number" min={0} max={100} value={form.health_score} onChange={(e) => setForm({ ...form, health_score: Number(e.target.value) })} /></div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as AssetStatus })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Add asset"}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}

function UpdateHealth({ asset, onSaved }: { asset: AssetRow; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [score, setScore] = useState(asset.health_score);
  const [status, setStatus] = useState<AssetStatus>(asset.status);
  const [action, setAction] = useState("Inspection");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await db.from("assets").update({
      health_score: score, status, last_inspection_date: today,
    }).eq("id", asset.id);
    if (!error) {
      await db.from("maintenance_logs").insert({ asset_id: asset.id, action, notes: `Health updated to ${score}%, status ${status}` });
    }
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Asset updated");
    setOpen(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline">Inspect</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Log inspection — {asset.name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Health score: {score}%</Label>
            <input type="range" min={0} max={100} value={score} onChange={(e) => setScore(Number(e.target.value))} className="w-full" />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as AssetStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Action</Label><Input value={action} onChange={(e) => setAction(e.target.value)} /></div>
        </div>
        <DialogFooter><Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
