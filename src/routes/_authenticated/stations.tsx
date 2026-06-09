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
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Plus, MapPin } from "lucide-react";

export const Route = createFileRoute("/_authenticated/stations")({
  head: () => ({ meta: [{ title: "Stations — RailAssist AI" }] }),
  component: StationsPage,
});

interface Zone { id: string; name: string; code: string }
interface Station {
  id: string; zone_id: string; name: string; code: string;
  division: string | null; latitude: number | null; longitude: number | null; created_at: string;
}

const schema = z.object({
  name: z.string().trim().min(2, "Enter station name").max(120),
  code: z.string().trim().min(2, "Enter station code").max(10).toUpperCase(),
  zone_id: z.string().uuid("Select a zone"),
  division: z.string().trim().max(80).optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
});

function StationsPage() {
  const { isSuperAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [zones, setZones] = useState<Zone[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [zoneFilter, setZoneFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!isSuperAdmin) navigate({ to: "/dashboard" });
  }, [loading, isSuperAdmin, navigate]);

  const load = async () => {
    const [{ data: zs }, { data: ss }] = await Promise.all([
      supabase.from("zones").select("id, name, code").order("name"),
      supabase.from("stations").select("*").order("name"),
    ]);
    setZones((zs as Zone[]) ?? []);
    setStations((ss as Station[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => stations.filter((s) => {
    if (zoneFilter !== "all" && s.zone_id !== zoneFilter) return false;
    if (!q) return true;
    const t = q.toLowerCase();
    return s.name.toLowerCase().includes(t) || s.code.toLowerCase().includes(t);
  }), [stations, zoneFilter, q]);

  const zoneName = (id: string) => zones.find((z) => z.id === id)?.name ?? "—";

  return (
    <AppShell kind="admin">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Stations</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create and manage stations across all railway zones.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1.5" />New station</Button></DialogTrigger>
          <NewStationDialog zones={zones} onCreated={() => { setOpen(false); load(); }} />
        </Dialog>
      </div>

      <div className="mt-6 grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Total stations</div><div className="font-display text-2xl font-bold mt-1">{stations.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Zones covered</div><div className="font-display text-2xl font-bold mt-1">{new Set(stations.map((s) => s.zone_id)).size}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">With GPS</div><div className="font-display text-2xl font-bold mt-1">{stations.filter((s) => s.latitude != null).length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Available zones</div><div className="font-display text-2xl font-bold mt-1">{zones.length}</div></CardContent></Card>
      </div>

      <Card className="mt-6">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <Input placeholder="Search station name or code…" value={q} onChange={(e) => setQ(e.target.value)} className="sm:max-w-xs" />
            <Select value={zoneFilter} onValueChange={setZoneFilter}>
              <SelectTrigger className="sm:w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All zones</SelectItem>
                {zones.map((z) => <SelectItem key={z.id} value={z.id}>{z.code} — {z.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Station</TableHead><TableHead>Code</TableHead><TableHead>Zone</TableHead>
                <TableHead>Division</TableHead><TableHead>GPS</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">No stations yet. Add the first one.</TableCell></TableRow>
                )}
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell><Badge variant="outline">{s.code}</Badge></TableCell>
                    <TableCell className="text-sm">{zoneName(s.zone_id)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.division ?? "—"}</TableCell>
                    <TableCell className="text-sm">{s.latitude != null ? <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{s.latitude.toFixed(3)}, {s.longitude?.toFixed(3)}</span> : "—"}</TableCell>
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

function NewStationDialog({ zones, onCreated }: { zones: Zone[]; onCreated: () => void }) {
  const [form, setForm] = useState({ name: "", code: "", zone_id: "", division: "", latitude: "", longitude: "" });
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setBusy(true);
    const { error } = await supabase.from("stations").insert({
      name: parsed.data.name,
      code: parsed.data.code,
      zone_id: parsed.data.zone_id,
      division: parsed.data.division || null,
      latitude: parsed.data.latitude ? Number(parsed.data.latitude) : null,
      longitude: parsed.data.longitude ? Number(parsed.data.longitude) : null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Station created");
    onCreated();
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>New station</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div><Label>Name</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., New Delhi" /></div>
        <div><Label>Station code</Label><Input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g., NDLS" /></div>
        <div>
          <Label>Zone</Label>
          <Select value={form.zone_id} onValueChange={(v) => setForm({ ...form, zone_id: v })}>
            <SelectTrigger><SelectValue placeholder="Select zone" /></SelectTrigger>
            <SelectContent>{zones.map((z) => <SelectItem key={z.id} value={z.id}>{z.code} — {z.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Division (optional)</Label><Input value={form.division} onChange={(e) => setForm({ ...form, division: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Latitude</Label><Input type="number" step="0.000001" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} /></div>
          <div><Label>Longitude</Label><Input type="number" step="0.000001" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create station"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
