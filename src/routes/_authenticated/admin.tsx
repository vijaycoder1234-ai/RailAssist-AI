import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, MapPin, ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin Console — RailAssist AI" }] }),
  component: AdminPage,
});

interface Inspector {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  employee_id: string | null;
  phone: string | null;
  designation: string | null;
  status: "pending" | "approved" | "rejected" | "suspended";
  zone_id: string | null;
  rejection_reason: string | null;
  created_at: string;
}
interface Zone { id: string; name: string; code: string; region: string | null; headquarters: string | null }

function AdminPage() {
  const { isSuperAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!isSuperAdmin) navigate({ to: "/dashboard" });
  }, [loading, isSuperAdmin, navigate]);

  if (loading || !isSuperAdmin) {
    return (
      <AppShell kind="admin">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </AppShell>
    );
  }

  return (
    <AppShell kind="admin">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Operations Console</h1>
          <p className="mt-1 text-sm text-muted-foreground">Inspector approvals, zone management and platform overview.</p>
        </div>
        <Badge variant="secondary"><ShieldCheck className="mr-1 h-3 w-3" /> Super Admin</Badge>
      </div>

      <Tabs defaultValue="inspectors" className="mt-6">
        <TabsList>
          <TabsTrigger value="inspectors"><Users className="h-4 w-4 mr-1.5" />Inspector Approval</TabsTrigger>
          <TabsTrigger value="zones"><MapPin className="h-4 w-4 mr-1.5" />Zones & Stations</TabsTrigger>
        </TabsList>
        <TabsContent value="inspectors" className="mt-5">
          <InspectorApproval />
        </TabsContent>
        <TabsContent value="zones" className="mt-5">
          <ZoneManagement />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function InspectorApproval() {
  const [items, setItems] = useState<Inspector[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected" | "suspended">("pending");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: insps }, { data: zs }] = await Promise.all([
      supabase.from("inspectors").select("*").order("created_at", { ascending: false }),
      supabase.from("zones").select("id, name, code, region, headquarters").order("name"),
    ]);
    setItems((insps as Inspector[]) ?? []);
    setZones((zs as Zone[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = items.filter((i) => {
    if (filter !== "all" && i.status !== filter) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      i.full_name.toLowerCase().includes(s) ||
      i.email.toLowerCase().includes(s) ||
      (i.employee_id ?? "").toLowerCase().includes(s)
    );
  });

  const counts = {
    pending: items.filter(i => i.status === "pending").length,
    approved: items.filter(i => i.status === "approved").length,
    rejected: items.filter(i => i.status === "rejected").length,
    suspended: items.filter(i => i.status === "suspended").length,
  };

  const updateStatus = async (i: Inspector, status: Inspector["status"], reason?: string) => {
    const patch: Partial<Inspector> & { approved_at?: string; approved_by?: string } = { status };
    if (status === "rejected") patch.rejection_reason = reason ?? null;
    if (status === "approved") {
      patch.approved_at = new Date().toISOString();
      const { data } = await supabase.auth.getUser();
      if (data.user) patch.approved_by = data.user.id;
    }
    const { error } = await supabase.from("inspectors").update(patch).eq("id", i.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Inspector ${status}`);
    load();
  };

  const assignZone = async (i: Inspector, zone_id: string) => {
    const { error } = await supabase.from("inspectors").update({ zone_id }).eq("id", i.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Zone assigned");
    load();
  };

  const tone = {
    pending: "text-warning", approved: "text-success", rejected: "text-destructive", suspended: "text-destructive",
  } as const;
  const Icon = (s: Inspector["status"]) => ({ pending: Clock, approved: CheckCircle2, rejected: XCircle, suspended: AlertTriangle }[s]);

  return (
    <>
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-5">
        {(["pending", "approved", "rejected", "suspended"] as const).map((k) => {
          const I = Icon(k);
          return (
            <Card key={k} className="cursor-pointer" onClick={() => setFilter(k)}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase text-muted-foreground tracking-wide">{k}</div>
                  <div className="font-display text-2xl font-bold mt-1">{counts[k]}</div>
                </div>
                <I className={`h-5 w-5 ${tone[k]}`} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <Input placeholder="Search by name, email, employee ID…" value={q} onChange={(e) => setQ(e.target.value)} className="sm:max-w-xs" />
            <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Inspector</TableHead>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Loading…</TableCell></TableRow>
                )}
                {!loading && filtered.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">No inspectors found.</TableCell></TableRow>
                )}
                {filtered.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>
                      <div className="font-medium">{i.full_name}</div>
                      <div className="text-xs text-muted-foreground">{i.email} · {i.phone ?? "—"}</div>
                    </TableCell>
                    <TableCell className="text-sm">{i.employee_id ?? "—"}</TableCell>
                    <TableCell className="text-sm">{i.designation ?? "—"}</TableCell>
                    <TableCell className="text-sm">
                      <Select value={i.zone_id ?? ""} onValueChange={(v) => assignZone(i, v)}>
                        <SelectTrigger className="w-48"><SelectValue placeholder="Assign zone" /></SelectTrigger>
                        <SelectContent>
                          {zones.map((z) => <SelectItem key={z.id} value={z.id}>{z.code} — {z.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{i.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {i.status !== "approved" && (
                        <Button size="sm" onClick={() => updateStatus(i, "approved")}>Approve</Button>
                      )}
                      {i.status !== "rejected" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button size="sm" variant="outline">Reject</Button></AlertDialogTrigger>
                          <RejectDialog onConfirm={(reason) => updateStatus(i, "rejected", reason)} />
                        </AlertDialog>
                      )}
                      {i.status === "approved" && (
                        <Button size="sm" variant="ghost" onClick={() => updateStatus(i, "suspended")}>Suspend</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function RejectDialog({ onConfirm }: { onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Reject application?</AlertDialogTitle>
        <AlertDialogDescription>Provide a short reason. The applicant will see it in their status page.</AlertDialogDescription>
      </AlertDialogHeader>
      <Input placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction onClick={() => onConfirm(reason)}>Reject</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}

function ZoneManagement() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [stationsByZone, setStationsByZone] = useState<Record<string, number>>({});

  const load = async () => {
    const { data } = await supabase.from("zones").select("*").order("name");
    setZones((data as Zone[]) ?? []);
    const { data: ss } = await supabase.from("stations").select("zone_id");
    const counts: Record<string, number> = {};
    (ss ?? []).forEach((s: { zone_id: string }) => { counts[s.zone_id] = (counts[s.zone_id] ?? 0) + 1; });
    setStationsByZone(counts);
  };
  useEffect(() => { load(); }, []);

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="mb-4">
          <h2 className="font-display text-lg font-semibold">Indian Railway Zones</h2>
          <p className="text-sm text-muted-foreground">{zones.length} zones seeded. Stations and divisions become editable in the next phase.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {zones.map((z) => (
            <Card key={z.id} className="border-border/60">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-display font-semibold">{z.name}</div>
                    <div className="text-xs text-muted-foreground">{z.headquarters ?? "—"}</div>
                  </div>
                  <Badge variant="outline">{z.code}</Badge>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{z.region ?? "—"}</span>
                  <span>{stationsByZone[z.id] ?? 0} stations</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
